import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, FileText, PenTool, Shield, Loader2, AlertCircle, Send, Download } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

type Step = 'loading' | 'view' | 'verify' | 'sign' | 'done' | 'error' | 'expired' | 'already_signed';

interface ContractData {
  id: string;
  title: string;
  body_html: string;
  status: string;
  signed_at: string | null;
}

interface AgencyInfo {
  name: string;
  email: string;
  whatsapp: string;
}

interface BundleData {
  id: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  client_cpf: string;
  empresa_id: string;
  status: string;
  signed_at: string | null;
}

export default function BundleSignPage() {
  const { token } = useParams<{ token: string }>();
  const [step, setStep] = useState<Step>('loading');
  const [bundle, setBundle] = useState<BundleData | null>(null);
  const [contracts, setContracts] = useState<ContractData[]>([]);
  const [acceptedContracts, setAcceptedContracts] = useState<Set<string>>(new Set());
  const [signerName, setSignerName] = useState('');
  const [agencyInfo, setAgencyInfo] = useState<AgencyInfo>({ name: '', email: '', whatsapp: '' });
  const [generatingPdf, setGeneratingPdf] = useState(false);

  // OTP
  const [otpCode, setOtpCode] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [signatureIds, setSignatureIds] = useState<Record<string, string>>({});

  // Signature
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [sigType, setSigType] = useState<'draw' | 'typed'>('typed');
  const [signing, setSigning] = useState(false);

  // Scroll tracking per contract
  const [scrolledContracts, setScrolledContracts] = useState<Set<string>>(new Set());
  const sentinelRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadBundle(); }, [token]);

  const loadAgencyInfo = async (empresaId: string) => {
    const { data } = await supabase
      .from('agency_settings')
      .select('name, email, whatsapp')
      .eq('empresa_id', empresaId)
      .maybeSingle() as any;
    if (data) {
      setAgencyInfo({ name: data.name || '', email: data.email || '', whatsapp: data.whatsapp || '' });
    } else {
      const { data: comp } = await supabase.from('companies').select('name').eq('id', empresaId).maybeSingle();
      if (comp) setAgencyInfo({ name: (comp as any).name || '', email: '', whatsapp: '' });
    }
  };

  const loadBundle = async () => {
    if (!token) { setStep('error'); return; }

    const { data: bundleRow, error } = await (supabase
      .from('contract_bundles' as any)
      .select('*')
      .eq('token', token)
      .single() as any);

    if (error || !bundleRow) { setStep('error'); return; }
    const b = bundleRow as any;

    // Load agency info
    if (b.empresa_id) await loadAgencyInfo(b.empresa_id);

    if (b.status === 'signed') { setBundle(b); setStep('already_signed'); return; }

    // Fetch contracts in this bundle
    const { data: contractsData } = await (supabase as any)
      .from('contracts')
      .select('id, title, body_html, status, signed_at')
      .eq('bundle_id', b.id)
      .order('created_at', { ascending: true });

    const contractsList = (contractsData || []) as ContractData[];
    
    if (contractsList.every(c => c.status === 'signed')) {
      setBundle(b); setContracts(contractsList); setStep('already_signed'); return;
    }

    setBundle(b);
    setContracts(contractsList);
    setSignerName(b.client_name || '');

    // Mark as viewed
    if (b.status !== 'viewed') {
      await (supabase.from('contract_bundles' as any).update({ status: 'viewed', viewed_at: new Date().toISOString() } as any).eq('id', b.id) as any);
    }
    for (const c of contractsList) {
      if (c.status !== 'viewed' && c.status !== 'signed') {
        await supabase.from('contracts').update({ status: 'viewed', viewed_at: new Date().toISOString() } as any).eq('id', c.id);
      }
      await supabase.from('contract_audit_log').insert({
        contract_id: c.id, action: 'viewed', actor: b.client_name || 'Cliente', actor_type: 'client',
        ip_address: '', details: { user_agent: navigator.userAgent, bundle_id: b.id }
      } as any);
    }

    setStep('view');
  };

  // IntersectionObserver for each contract sentinel
  useEffect(() => {
    if (step !== 'view' || !scrollContainerRef.current) return;
    const observers: IntersectionObserver[] = [];

    contracts.forEach(c => {
      const sentinel = sentinelRefs.current[c.id];
      if (!sentinel) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setScrolledContracts(prev => new Set([...prev, c.id]));
          }
        },
        { root: scrollContainerRef.current, threshold: 0.1 }
      );
      observer.observe(sentinel);
      observers.push(observer);
    });

    return () => observers.forEach(o => o.disconnect());
  }, [step, contracts]);

  const allAccepted = contracts.length > 0 && acceptedContracts.size === contracts.length;
  const allScrolled = contracts.length > 0 && scrolledContracts.size === contracts.length;

  const handleProceedToVerify = () => setStep('verify');

  const handleSendOtp = async () => {
    if (!bundle) return;
    setOtpSending(true);

    // Create signature records for each contract
    const sigIds: Record<string, string> = {};
    const firstContract = contracts[0];
    
    const { data: sig, error: sigErr } = await supabase.from('contract_signatures').insert({
      contract_id: firstContract.id,
      signer_name: signerName || bundle.client_name,
      signer_email: bundle.client_email,
      signer_phone: bundle.client_phone,
      signer_cpf: bundle.client_cpf,
      verification_method: 'email_otp',
      status: 'pending',
      user_agent: navigator.userAgent,
    } as any).select().single();

    if (sigErr || !sig) { toast.error('Erro ao iniciar verificação'); setOtpSending(false); return; }
    sigIds[firstContract.id] = (sig as any).id;

    // Create signatures for remaining contracts (no separate OTP)
    for (const c of contracts.slice(1)) {
      const { data: s } = await supabase.from('contract_signatures').insert({
        contract_id: c.id,
        signer_name: signerName || bundle.client_name,
        signer_email: bundle.client_email,
        signer_phone: bundle.client_phone,
        signer_cpf: bundle.client_cpf,
        verification_method: 'email_otp',
        status: 'pending',
        user_agent: navigator.userAgent,
      } as any).select().single();
      if (s) sigIds[c.id] = (s as any).id;
    }
    setSignatureIds(sigIds);

    // Send OTP via first contract
    try {
      const { error: fnErr } = await supabase.functions.invoke('send-contract-otp', {
        body: { signature_id: (sig as any).id, contract_id: firstContract.id, email: bundle.client_email, name: signerName || bundle.client_name },
      });
      if (fnErr) throw fnErr;
      setOtpSent(true);
      toast.success('Código de verificação enviado para seu email');
    } catch {
      toast.error('Erro ao enviar código de verificação');
    }
    setOtpSending(false);
  };

  const handleVerifyOtp = async () => {
    const firstSigId = signatureIds[contracts[0]?.id];
    if (!firstSigId || !otpCode) return;
    setSigning(true);

    const { data, error } = await supabase.functions.invoke('send-contract-otp', {
      body: { action: 'verify', signature_id: firstSigId, code: otpCode },
    });
    if (error || !(data as any)?.verified) {
      toast.error('Código inválido ou expirado');
      setSigning(false);
      return;
    }

    // Confirm verification for all signatures
    for (const sigId of Object.values(signatureIds)) {
      if (sigId !== firstSigId) {
        await supabase.from('contract_signatures').update({
          verification_confirmed_at: new Date().toISOString(),
        } as any).eq('id', sigId);
      }
    }

    toast.success('Identidade verificada!');
    setStep('sign');
    setSigning(false);
  };

  // Canvas
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsDrawing(true); setHasDrawn(true);
    const ctx = canvas.getContext('2d')!;
    const rect = canvas.getBoundingClientRect();
    const pos = 'touches' in e ? { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top } : { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY };
    ctx.beginPath(); ctx.moveTo(pos.x, pos.y);
  };
  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d')!;
    const rect = canvasRef.current.getBoundingClientRect();
    const pos = 'touches' in e ? { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top } : { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY };
    ctx.lineTo(pos.x, pos.y); ctx.strokeStyle = '#1a1a2e'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.stroke();
  };
  const stopDrawing = () => setIsDrawing(false);
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const generateSignedPdf = (contractsToExport: ContractData[], clientName: string, companyName: string) => {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();

    contractsToExport.forEach((c, idx) => {
      if (idx > 0) pdf.addPage();
      let y = 20;

      // Header with company name
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text(companyName || 'Empresa', pageWidth / 2, y, { align: 'center' });
      y += 8;

      pdf.setFontSize(11);
      pdf.text(c.title, pageWidth / 2, y, { align: 'center' });
      y += 8;

      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Cliente: ${clientName} | Assinado em: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth / 2, y, { align: 'center' });
      y += 10;

      pdf.setDrawColor(200);
      pdf.line(15, y, pageWidth - 15, y);
      y += 8;

      // Strip HTML and render text
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = c.body_html;
      const text = tempDiv.textContent || tempDiv.innerText || '';
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      const lines = pdf.splitTextToSize(text, pageWidth - 30);
      for (const line of lines) {
        if (y > 275) { pdf.addPage(); y = 20; }
        pdf.text(line, 15, y);
        y += 5;
      }

      // Signature section
      if (y > 240) { pdf.addPage(); y = 20; }
      y += 10;
      pdf.setDrawColor(200);
      pdf.line(15, y, pageWidth - 15, y);
      y += 8;
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.text('ASSINATURA DIGITAL', 15, y);
      y += 6;
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Assinante: ${clientName}`, 15, y); y += 5;
      pdf.text(`Data: ${new Date().toLocaleString('pt-BR')}`, 15, y); y += 5;
      pdf.text('Verificação: Código OTP por Email', 15, y); y += 5;

      // Legal footer
      y += 5;
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'italic');
      const legal = 'Este contrato possui validade jurídica conforme aceite digital e registro eletrônico, nos termos da MP nº 2.200-2/2001 e do art. 10 da Lei nº 12.965/2014.';
      const legalLines = pdf.splitTextToSize(legal, pageWidth - 30);
      legalLines.forEach((l: string) => { pdf.text(l, 15, y); y += 4; });
    });

    return pdf;
  };

  const handleDownloadPdf = () => {
    setGeneratingPdf(true);
    try {
      const pdf = generateSignedPdf(contracts, bundle?.client_name || signerName, agencyInfo.name);
      pdf.save(`contratos_assinados_${bundle?.client_name?.replace(/\s+/g, '_') || 'cliente'}.pdf`);
      toast.success('PDF dos contratos baixado!');
    } catch {
      toast.error('Erro ao gerar PDF');
    }
    setGeneratingPdf(false);
  };

  const sendSignedContractsEmail = async () => {
    if (!bundle?.client_email || !bundle.empresa_id) return;
    try {
      const pdf = generateSignedPdf(contracts, bundle.client_name, agencyInfo.name);
      const pdfBase64 = pdf.output('datauristring').split(',')[1];

      const contractNames = contracts.map(c => c.title).join(', ');
      const emailHtml = `
        <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1a1a2e;">Contratos Assinados</h2>
          <p>Olá <strong>${bundle.client_name}</strong>,</p>
          <p>Seus contratos foram assinados com sucesso: <strong>${contractNames}</strong>.</p>
          <p>Segue em anexo uma cópia dos contratos assinados para sua referência.</p>
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px; margin: 16px 0;">
            <p style="margin: 0; color: #166534; font-size: 13px;">✅ Assinatura registrada em ${new Date().toLocaleString('pt-BR')}</p>
            <p style="margin: 4px 0 0; color: #166534; font-size: 13px;">🔒 Verificação por código OTP realizada</p>
          </div>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 11px;">${agencyInfo.name || 'Vortex'}</p>
          <p style="color: #999; font-size: 10px; font-style: italic;">
            Estes contratos possuem validade jurídica conforme aceite digital, nos termos da MP nº 2.200-2/2001.
          </p>
        </div>
      `;

      await supabase.functions.invoke('send-email', {
        body: {
          empresa_id: (bundle as any).empresa_id,
          to: bundle.client_email,
          subject: `Cópia dos Contratos Assinados - ${agencyInfo.name || 'Vortex'}`,
          html: emailHtml,
          attachments: [{
            filename: `contratos_assinados_${bundle.client_name.replace(/\s+/g, '_')}.pdf`,
            content: pdfBase64,
            encoding: 'base64',
          }],
        },
      });
    } catch (err) {
      console.error('Erro ao enviar cópia dos contratos:', err);
    }
  };

  const handleSign = async () => {
    if (!bundle) return;
    setSigning(true);

    let signatureData = sigType === 'draw' && canvasRef.current ? canvasRef.current.toDataURL('image/png') : signerName;

    for (const c of contracts) {
      const sigId = signatureIds[c.id];
      if (!sigId) continue;

      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(c.body_html));
      const docHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

      await supabase.from('contract_signatures').update({
        signature_type: sigType,
        signature_data: signatureData,
        document_hash: docHash,
        status: 'signed',
        signed_at: new Date().toISOString(),
        device_info: `${navigator.platform} | ${navigator.language}`,
      } as any).eq('id', sigId);

      await supabase.from('contracts').update({
        status: 'signed',
        signed_at: new Date().toISOString(),
      } as any).eq('id', c.id);

      await supabase.from('contract_audit_log').insert({
        contract_id: c.id, action: 'signed', actor: signerName || bundle.client_name, actor_type: 'client',
        details: { signature_type: sigType, document_hash: docHash, verification_method: 'email_otp', bundle_id: bundle.id }
      } as any);
    }

    // Update bundle status
    await (supabase.from('contract_bundles' as any).update({ status: 'signed', signed_at: new Date().toISOString() } as any).eq('id', bundle.id) as any);

    // Send signed contracts copy to client via email
    await sendSignedContractsEmail();

    setSigning(false);
    setStep('done');
  };

  // --- RENDER ---
  if (step === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="max-w-md w-full text-center p-8">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Contratos não encontrados</h2>
          <p className="text-muted-foreground">O link pode estar incorreto ou os contratos foram removidos.</p>
        </Card>
      </div>
    );
  }

  if (step === 'already_signed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="max-w-md w-full text-center p-8">
          <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Contratos já Assinados</h2>
          <p className="text-muted-foreground">Todos os contratos já foram assinados{bundle?.signed_at ? ` em ${new Date(bundle.signed_at).toLocaleDateString('pt-BR')}` : ''}.</p>
        </Card>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-emerald-100 p-4">
        <Card className="max-w-md w-full text-center p-8 border-emerald-200">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2 text-emerald-900">{contracts.length} Contrato(s) Assinado(s)!</h2>
          <p className="text-emerald-700 mb-4">Sua assinatura foi registrada com sucesso para todos os contratos.</p>
          {bundle?.client_email && (
            <p className="text-sm text-emerald-600 mb-3">📧 Uma cópia foi enviada para o seu email.</p>
          )}
          <div className="bg-emerald-50 rounded-lg p-3 text-xs text-emerald-600 space-y-1">
            <p>🔒 Assinatura verificada com código de segurança</p>
            <p>📋 Hash de cada documento registrado</p>
            <p>🕐 {new Date().toLocaleString('pt-BR')}</p>
          </div>
          <div className="mt-4 space-y-1">
            {contracts.map(c => (
              <div key={c.id} className="flex items-center gap-2 text-sm text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>{c.title}</span>
              </div>
            ))}
          </div>
          <Button
            onClick={handleDownloadPdf}
            disabled={generatingPdf}
            variant="outline"
            className="w-full mt-4 gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
          >
            {generatingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Baixar PDF dos Contratos
          </Button>
          <div className="mt-4 border-t border-emerald-200 pt-4">
            <p className="text-xs text-emerald-700 italic leading-relaxed">
              👉 Estes contratos possuem validade jurídica conforme aceite digital e registro eletrônico,
              nos termos da MP nº 2.200-2/2001 e do art. 10 da Lei nº 12.965/2014.
            </p>
          </div>
          {agencyInfo.name && (
            <p className="text-xs text-muted-foreground mt-3">{agencyInfo.name}</p>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <span className="font-semibold text-sm">{agencyInfo.name || 'Vortex'}</span>
          </div>
          <Badge variant="outline" className="text-xs">
            {step === 'view' && `📄 ${contracts.length} contrato(s)`}
            {step === 'verify' && '🔐 Verificação'}
            {step === 'sign' && '✍️ Assinatura'}
          </Badge>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-6">
          {['Ler Contratos', 'Verificar Identidade', 'Assinar Todos'].map((label, i) => {
            const stepMap = ['view', 'verify', 'sign'];
            const currentIdx = stepMap.indexOf(step);
            const isActive = i === currentIdx;
            const isDone = i < currentIdx;
            return (
              <React.Fragment key={i}>
                {i > 0 && <div className={`flex-1 h-0.5 ${isDone ? 'bg-emerald-400' : 'bg-border'}`} />}
                <div className={`flex items-center gap-1.5 text-xs font-medium ${isActive ? 'text-primary' : isDone ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${isDone ? 'bg-emerald-100 text-emerald-700' : isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    {isDone ? '✓' : i + 1}
                  </div>
                  <span className="hidden sm:inline">{label}</span>
                </div>
              </React.Fragment>
            );
          })}
        </div>

        {/* Step: View - All contracts in continuous scroll */}
        {step === 'view' && bundle && (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <h2 className="font-bold text-lg mb-1">Contratos para Assinatura</h2>
                <p className="text-sm text-muted-foreground">Para: {bundle.client_name} — {contracts.length} contrato(s)</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-0">
                <div ref={scrollContainerRef} className="max-h-[60vh] overflow-y-auto">
                  {contracts.map((c, idx) => (
                    <div key={c.id}>
                      {/* Contract header */}
                      <div className="sticky top-0 z-[5] bg-accent/90 backdrop-blur px-6 py-2 border-b flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{idx + 1}/{contracts.length}</Badge>
                          <span className="text-sm font-semibold">{c.title}</span>
                        </div>
                        {scrolledContracts.has(c.id) && (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        )}
                      </div>
                      {/* Contract body */}
                      <div className="p-6 prose prose-sm max-w-none border-b">
                        <div dangerouslySetInnerHTML={{ __html: c.body_html }} />
                        <div ref={el => { sentinelRefs.current[c.id] = el; }} className="h-1" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {!allScrolled && (
              <p className="text-xs text-amber-600 text-center animate-pulse">↓ Role até o final de todos os contratos para continuar</p>
            )}

            {/* Individual acceptance checkboxes */}
            <div className="space-y-2">
              {contracts.map(c => (
                <div key={c.id} className="flex items-start gap-2">
                  <Checkbox
                    id={`accept-${c.id}`}
                    checked={acceptedContracts.has(c.id)}
                    onCheckedChange={(v) => {
                      setAcceptedContracts(prev => {
                        const next = new Set(prev);
                        if (v) next.add(c.id); else next.delete(c.id);
                        return next;
                      });
                    }}
                    disabled={!scrolledContracts.has(c.id)}
                  />
                  <Label htmlFor={`accept-${c.id}`} className="text-sm leading-tight">
                    Li e concordo com os termos de: <span className="font-medium">{c.title}</span>
                  </Label>
                </div>
              ))}
            </div>

            <Button
              onClick={handleProceedToVerify}
              disabled={!allAccepted || !allScrolled}
              className="w-full gap-2"
              size="lg"
            >
              <Shield className="h-4 w-4" /> Continuar para Verificação
            </Button>
          </div>
        )}

        {/* Step: Verify */}
        {step === 'verify' && bundle && (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-6 text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Shield className="h-7 w-7 text-primary" />
                </div>
                <h2 className="text-lg font-bold">Verificação de Identidade</h2>
                <p className="text-sm text-muted-foreground">Para sua segurança, enviaremos um código de verificação para o email cadastrado.</p>

                <div className="bg-muted/50 rounded-lg p-3 text-sm">
                  <p className="text-muted-foreground">Email: <span className="font-medium text-foreground">{bundle.client_email?.replace(/(.{2}).+(@.+)/, '$1***$2') || 'Não informado'}</span></p>
                </div>

                {!otpSent ? (
                  <Button onClick={handleSendOtp} disabled={otpSending || !bundle.client_email} className="w-full gap-2" size="lg">
                    {otpSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Enviar Código de Verificação
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <Label>Digite o código recebido</Label>
                      <Input
                        value={otpCode}
                        onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        className="text-center text-2xl tracking-[0.5em] font-mono"
                        maxLength={6}
                      />
                    </div>
                    <Button onClick={handleVerifyOtp} disabled={otpCode.length < 6 || signing} className="w-full gap-2" size="lg">
                      {signing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                      Verificar e Continuar
                    </Button>
                    <button onClick={handleSendOtp} className="text-xs text-primary underline" disabled={otpSending}>
                      Reenviar código
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step: Sign */}
        {step === 'sign' && bundle && (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="text-center">
                  <PenTool className="h-8 w-8 text-primary mx-auto mb-2" />
                  <h2 className="text-lg font-bold">Assine os Contratos</h2>
                  <p className="text-sm text-muted-foreground">Sua identidade foi verificada. Uma assinatura para todos os {contracts.length} contrato(s).</p>
                </div>

                {/* List of contracts being signed */}
                <div className="bg-muted/30 rounded-lg p-3 space-y-1">
                  {contracts.map(c => (
                    <div key={c.id} className="flex items-center gap-2 text-sm">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{c.title}</span>
                    </div>
                  ))}
                </div>

                {/* Signature type toggle */}
                <div className="flex gap-2 justify-center">
                  <Button variant={sigType === 'typed' ? 'default' : 'outline'} size="sm" onClick={() => setSigType('typed')}>Digitar Nome</Button>
                  <Button variant={sigType === 'draw' ? 'default' : 'outline'} size="sm" onClick={() => setSigType('draw')}>Desenhar Assinatura</Button>
                </div>

                {sigType === 'typed' ? (
                  <div>
                    <Label>Nome Completo</Label>
                    <Input value={signerName} onChange={e => setSignerName(e.target.value)} placeholder="Seu nome completo" />
                    {signerName && (
                      <div className="mt-3 border-b-2 border-foreground/30 pb-1 text-center">
                        <span className="font-serif italic text-2xl text-foreground/80">{signerName}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <div className="border rounded-lg overflow-hidden bg-white touch-none">
                      <canvas
                        ref={canvasRef}
                        width={500}
                        height={150}
                        className="w-full cursor-crosshair"
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                      />
                    </div>
                    <Button variant="ghost" size="sm" onClick={clearCanvas} className="mt-1 text-xs">Limpar</Button>
                  </div>
                )}

                <Button
                  onClick={handleSign}
                  disabled={signing || (sigType === 'typed' ? !signerName.trim() : !hasDrawn)}
                  className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700"
                  size="lg"
                >
                  {signing ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenTool className="h-4 w-4" />}
                  Assinar {contracts.length} Contrato(s)
                </Button>

                <p className="text-xs text-muted-foreground text-center leading-relaxed">
                  Ao assinar, você confirma que leu e concorda com todos os termos de todos os contratos acima.
                </p>
                <p className="text-[11px] text-muted-foreground/80 text-center italic leading-relaxed mt-2">
                  👉 Estes contratos possuem validade jurídica conforme aceite digital e registro eletrônico,
                  nos termos da MP nº 2.200-2/2001 e do art. 10 da Lei nº 12.965/2014.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <footer className="py-6 text-center text-xs text-muted-foreground">
        <p>Documento seguro • {agencyInfo.name || 'Powered by Vortex ERP'}</p>
      </footer>
    </div>
  );
}
