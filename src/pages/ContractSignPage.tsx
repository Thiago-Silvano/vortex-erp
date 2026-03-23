import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, FileText, PenTool, Shield, Loader2, AlertCircle, Send, Camera } from 'lucide-react';
import { toast } from 'sonner';
import SelfieCapture from '@/components/SelfieCapture';
import { captureSigningContext, type SigningContext } from '@/lib/captureSigningContext';

type Step = 'loading' | 'view' | 'verify' | 'selfie' | 'sign' | 'done' | 'error' | 'expired' | 'already_signed';

interface ContractData {
  id: string;
  title: string;
  body_html: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  client_cpf: string;
  status: string;
  signed_at: string | null;
  expires_at: string | null;
  empresa_id: string;
}

interface AgencyInfo {
  name: string;
  logo_url: string;
}

export default function ContractSignPage() {
  const { token } = useParams<{ token: string }>();
  const [step, setStep] = useState<Step>('loading');
  const [contract, setContract] = useState<ContractData | null>(null);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [signerName, setSignerName] = useState('');
  const [agencyInfo, setAgencyInfo] = useState<AgencyInfo>({ name: '', logo_url: '' });

  // OTP verification
  const [otpCode, setOtpCode] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [signatureId, setSignatureId] = useState<string | null>(null);

  // Selfie
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null);

  // Signing context (IP, geo)
  const [signingContext, setSigningContext] = useState<SigningContext | null>(null);

  // Signature drawing
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [sigType, setSigType] = useState<'draw' | 'typed'>('typed');
  const [signing, setSigning] = useState(false);

  const contractRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadContract();
    // Capture signing context early
    captureSigningContext().then(setSigningContext);
  }, [token]);

  const loadAgencyInfo = async (empresaId: string) => {
    try {
      // First try agency_settings
      const { data, error } = await supabase
        .from('agency_settings')
        .select('name, logo_url')
        .eq('empresa_id', empresaId)
        .maybeSingle();
      
      if (data && !error) {
        setAgencyInfo({ name: (data as any).name || '', logo_url: (data as any).logo_url || '' });
        return;
      }
      
      // Fallback: try without empresa_id filter (for single-company setups)
      const { data: anySettings } = await supabase
        .from('agency_settings')
        .select('name, logo_url')
        .limit(1)
        .maybeSingle();
      
      if (anySettings) {
        setAgencyInfo({ name: (anySettings as any).name || '', logo_url: (anySettings as any).logo_url || '' });
        return;
      }

      // Last fallback: company name
      const { data: comp } = await supabase.from('companies').select('name').eq('id', empresaId).maybeSingle();
      if (comp) setAgencyInfo({ name: (comp as any).name || '', logo_url: '' });
    } catch (err) {
      console.error('Error loading agency info:', err);
    }
  };

  const loadContract = async () => {
    if (!token) { setStep('error'); return; }
    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .eq('token', token)
      .single();

    if (error || !data) { setStep('error'); return; }
    const c = data as any;

    if (c.empresa_id) await loadAgencyInfo(c.empresa_id);

    if (c.status === 'signed') { setContract(c); setStep('already_signed'); return; }
    if (c.expires_at && new Date(c.expires_at) < new Date()) { setStep('expired'); return; }

    setContract(c);
    setSignerName(c.client_name || '');

    // Log view
    if (c.status !== 'viewed') {
      await supabase.from('contracts').update({ status: 'viewed', viewed_at: new Date().toISOString() } as any).eq('id', c.id);
    }
    await supabase.from('contract_audit_log').insert({
      contract_id: c.id, action: 'viewed', actor: c.client_name || 'Cliente', actor_type: 'client',
      ip_address: signingContext?.ip_address || '', details: { user_agent: navigator.userAgent }
    } as any);

    setStep('view');
  };

  const handleScroll = () => {
    if (!contractRef.current || hasScrolledToBottom) return;
    const el = contractRef.current;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    if (atBottom) setHasScrolledToBottom(true);
  };

  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (hasScrolledToBottom || !sentinelRef.current || !contractRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setHasScrolledToBottom(true); },
      { root: contractRef.current, threshold: 0.1 }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasScrolledToBottom, step, contract]);

  const handleProceedToVerify = () => setStep('verify');

  const handleSendOtp = async () => {
    if (!contract) return;
    setOtpSending(true);

    const { data: sig, error: sigErr } = await supabase.from('contract_signatures').insert({
      contract_id: contract.id,
      signer_name: signerName || contract.client_name,
      signer_email: contract.client_email,
      signer_phone: contract.client_phone,
      signer_cpf: contract.client_cpf,
      verification_method: 'email_otp',
      status: 'pending',
      user_agent: signingContext?.user_agent || navigator.userAgent,
      ip_address: signingContext?.ip_address || '',
      geo_city: signingContext?.geo_city || '',
      geo_state: signingContext?.geo_state || '',
      geo_country: signingContext?.geo_country || '',
      geolocation: signingContext?.geolocation || {},
    } as any).select().single();

    if (sigErr || !sig) { toast.error('Erro ao iniciar verificação'); setOtpSending(false); return; }
    setSignatureId((sig as any).id);

    try {
      const { error } = await supabase.functions.invoke('send-contract-otp', {
        body: { signature_id: (sig as any).id, contract_id: contract.id, email: contract.client_email, name: signerName || contract.client_name },
      });
      if (error) throw error;
      setOtpSent(true);
      toast.success('Código de verificação enviado para seu email');
    } catch {
      toast.error('Erro ao enviar código de verificação');
    }
    setOtpSending(false);
  };

  const handleVerifyOtp = async () => {
    if (!signatureId || !otpCode) return;
    setSigning(true);

    const { data, error } = await supabase.functions.invoke('send-contract-otp', {
      body: { action: 'verify', signature_id: signatureId, code: otpCode },
    });
    if (error || !(data as any)?.verified) {
      toast.error('Código inválido ou expirado');
      setSigning(false);
      return;
    }
    toast.success('Identidade verificada!');
    setStep('selfie');
    setSigning(false);
  };

  const handleSelfieCapture = (url: string) => {
    setSelfieUrl(url);
    setStep('sign');
  };

  // Canvas drawing
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsDrawing(true);
    setHasDrawn(true);
    const ctx = canvas.getContext('2d')!;
    const rect = canvas.getBoundingClientRect();
    const pos = 'touches' in e ? { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top } : { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY };
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };
  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d')!;
    const rect = canvasRef.current.getBoundingClientRect();
    const pos = 'touches' in e ? { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top } : { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY };
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();
  };
  const stopDrawing = () => setIsDrawing(false);
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleSign = async () => {
    if (!contract || !signatureId) return;
    setSigning(true);

    let signatureData = '';
    if (sigType === 'draw' && canvasRef.current) {
      signatureData = canvasRef.current.toDataURL('image/png');
    } else {
      signatureData = signerName;
    }

    // Hash document
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(contract.body_html));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const docHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Update signature with all anti-fraud data
    await supabase.from('contract_signatures').update({
      signature_type: sigType,
      signature_data: signatureData,
      document_hash: docHash,
      status: 'signed',
      signed_at: new Date().toISOString(),
      device_info: signingContext?.device_info || `${navigator.platform} | ${navigator.language}`,
      ip_address: signingContext?.ip_address || '',
      selfie_url: selfieUrl || '',
      geo_city: signingContext?.geo_city || '',
      geo_state: signingContext?.geo_state || '',
      geo_country: signingContext?.geo_country || '',
      geolocation: signingContext?.geolocation || {},
    } as any).eq('id', signatureId);

    // Update contract
    await supabase.from('contracts').update({
      status: 'signed',
      signed_at: new Date().toISOString(),
    } as any).eq('id', contract.id);

    // Audit log with geo data
    await supabase.from('contract_audit_log').insert({
      contract_id: contract.id, action: 'signed', actor: signerName || contract.client_name, actor_type: 'client',
      ip_address: signingContext?.ip_address || '',
      details: {
        signature_type: sigType,
        document_hash: docHash,
        verification_method: 'email_otp',
        selfie_url: selfieUrl,
        geo_city: signingContext?.geo_city,
        geo_state: signingContext?.geo_state,
        geo_country: signingContext?.geo_country,
      }
    } as any);

    setSigning(false);
    setStep('done');
  };

  // --- RENDER ---
  const STEPS_LIST = ['Ler Contrato', 'Verificar', 'Selfie', 'Assinar'];
  const STEP_MAP = ['view', 'verify', 'selfie', 'sign'];

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
          <h2 className="text-xl font-bold mb-2">Contrato não encontrado</h2>
          <p className="text-muted-foreground">O link pode estar incorreto ou o contrato foi removido.</p>
        </Card>
      </div>
    );
  }

  if (step === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="max-w-md w-full text-center p-8">
          <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Contrato Expirado</h2>
          <p className="text-muted-foreground">O prazo para assinatura deste contrato já se encerrou. Entre em contato com a empresa.</p>
        </Card>
      </div>
    );
  }

  if (step === 'already_signed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="max-w-md w-full text-center p-8">
          <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Contrato já Assinado</h2>
          <p className="text-muted-foreground">Este contrato já foi assinado em {contract?.signed_at ? new Date(contract.signed_at).toLocaleDateString('pt-BR') : ''}.</p>
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
          <h2 className="text-2xl font-bold mb-2 text-emerald-900">Contrato Assinado!</h2>
          <p className="text-emerald-700 mb-4">Sua assinatura foi registrada com sucesso. Você receberá uma cópia por email.</p>
          <div className="bg-emerald-50 rounded-lg p-3 text-xs text-emerald-600 space-y-1">
            <p>🔒 Assinatura verificada com código de segurança</p>
            <p>📸 Selfie de identificação registrada</p>
            <p>📋 Hash SHA-256 do documento registrado</p>
            {signingContext?.geo_city && <p>📍 Localização: {signingContext.geo_city}, {signingContext.geo_state}</p>}
            <p>🕐 {new Date().toLocaleString('pt-BR')}</p>
          </div>
          <div className="mt-4 border-t border-emerald-200 pt-4">
            <p className="text-xs text-emerald-700 italic leading-relaxed">
              👉 Este contrato possui validade jurídica conforme aceite digital e registro eletrônico,
              nos termos da Medida Provisória nº 2.200-2/2001 e do artigo 10 da Lei nº 12.965/2014 (Marco Civil da Internet).
            </p>
          </div>
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
            {agencyInfo.logo_url ? (
              <img src={agencyInfo.logo_url} alt={agencyInfo.name} className="h-8 w-auto max-w-[120px] object-contain" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-4 w-4 text-primary" />
              </div>
            )}
            <span className="font-semibold text-sm">{agencyInfo.name || 'Vortex'}</span>
          </div>
          <Badge variant="outline" className="text-xs">
            {step === 'view' && '📄 Leitura'}
            {step === 'verify' && '🔐 Verificação'}
            {step === 'selfie' && '📸 Selfie'}
            {step === 'sign' && '✍️ Assinatura'}
          </Badge>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-6">
          {STEPS_LIST.map((label, i) => {
            const currentIdx = STEP_MAP.indexOf(step);
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

        {/* Step: View */}
        {step === 'view' && contract && (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <h2 className="font-bold text-lg mb-1">{contract.title}</h2>
                <p className="text-sm text-muted-foreground">Para: {contract.client_name}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-0">
                <div
                  ref={contractRef}
                  onScroll={handleScroll}
                  className="max-h-[60vh] overflow-y-auto p-6 prose prose-sm max-w-none"
                >
                  <div dangerouslySetInnerHTML={{ __html: contract.body_html }} />
                  <div ref={sentinelRef} className="h-1" />
                </div>
              </CardContent>
            </Card>

            {!hasScrolledToBottom && (
              <p className="text-xs text-amber-600 text-center animate-pulse">↓ Role até o final do contrato para continuar</p>
            )}

            <div className="flex items-start gap-2">
              <Checkbox
                id="accept"
                checked={acceptTerms}
                onCheckedChange={(v) => setAcceptTerms(!!v)}
                disabled={!hasScrolledToBottom}
              />
              <Label htmlFor="accept" className="text-sm leading-tight">
                Li e concordo com todos os termos e condições descritos neste contrato.
              </Label>
            </div>

            <Button
              onClick={handleProceedToVerify}
              disabled={!acceptTerms || !hasScrolledToBottom}
              className="w-full gap-2"
              size="lg"
            >
              <Shield className="h-4 w-4" /> Continuar para Verificação
            </Button>
          </div>
        )}

        {/* Step: Verify */}
        {step === 'verify' && contract && (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-6 text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Shield className="h-7 w-7 text-primary" />
                </div>
                <h2 className="text-lg font-bold">Verificação de Identidade</h2>
                <p className="text-sm text-muted-foreground">Para sua segurança, enviaremos um código de verificação para o email cadastrado.</p>

                <div className="bg-muted/50 rounded-lg p-3 text-sm">
                  <p className="text-muted-foreground">Email: <span className="font-medium text-foreground">{contract.client_email?.replace(/(.{2}).+(@.+)/, '$1***$2') || 'Não informado'}</span></p>
                </div>

                {!otpSent ? (
                  <Button onClick={handleSendOtp} disabled={otpSending || !contract.client_email} className="w-full gap-2" size="lg">
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

        {/* Step: Selfie */}
        {step === 'selfie' && contract && (
          <div className="space-y-4">
            <SelfieCapture
              onCapture={handleSelfieCapture}
              contractId={contract.id}
              clientName={contract.client_name}
            />
          </div>
        )}

        {/* Step: Sign */}
        {step === 'sign' && contract && (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="text-center">
                  <PenTool className="h-8 w-8 text-primary mx-auto mb-2" />
                  <h2 className="text-lg font-bold">Assine o Contrato</h2>
                  <p className="text-sm text-muted-foreground">Sua identidade foi verificada. Agora assine abaixo.</p>
                </div>

                {selfieUrl && (
                  <div className="flex items-center gap-3 bg-emerald-50 rounded-lg p-3">
                    <img src={selfieUrl} alt="Selfie" className="w-12 h-12 rounded-full object-cover border-2 border-emerald-300" />
                    <div className="text-sm text-emerald-700">
                      <p className="font-medium">Selfie registrada ✓</p>
                      <p className="text-xs">Vinculada ao contrato</p>
                    </div>
                  </div>
                )}

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
                  Assinar Contrato
                </Button>

                <p className="text-xs text-muted-foreground text-center leading-relaxed">
                  Ao assinar, você confirma que leu e concorda com todos os termos do contrato.
                </p>
                <p className="text-[11px] text-muted-foreground/80 text-center italic leading-relaxed mt-2">
                  👉 Este contrato possui validade jurídica conforme aceite digital e registro eletrônico,
                  nos termos da MP nº 2.200-2/2001 e do art. 10 da Lei nº 12.965/2014.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-muted-foreground">
        <p>Documento seguro • {agencyInfo.name || 'Powered by Vortex ERP'}</p>
      </footer>
    </div>
  );
}
