import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, Plus, Send, Eye, CheckCircle2, Clock, AlertCircle, Copy, ExternalLink, Loader2, MessageCircle, Mail, ShieldCheck, Download, Trash2, RefreshCw } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import jsPDF from 'jspdf';

interface ContractSectionProps {
  saleId: string;
  empresaId: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  clientCpf?: string;
  destination?: string;
  tripStartDate?: string;
  tripEndDate?: string;
  totalValue?: number;
  paymentMethod?: string;
  sellerName?: string;
  passengersCount?: number;
  saleWorkflowStatus?: string;
  onWorkflowStatusChange?: (newStatus: string) => void;
}

interface ContractRow {
  id: string;
  title: string;
  status: string;
  token: string;
  short_id: string;
  created_at: string;
  sent_at: string | null;
  viewed_at: string | null;
  signed_at: string | null;
  client_name: string;
  client_email: string;
  client_phone: string;
  body_html: string;
  bundle_id: string | null;
}

interface BundleRow {
  id: string;
  token: string;
  short_id: string;
  status: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  created_at: string;
  sent_at: string | null;
  signed_at: string | null;
  contracts: ContractRow[];
}

interface TemplateRow {
  id: string;
  name: string;
  category: string;
  body_html: string;
}

interface SignatureRow {
  id: string;
  signer_name: string;
  signature_type: string;
  signed_at: string | null;
  ip_address: string;
  user_agent: string;
  device_info: string;
  document_hash: string;
  verification_method: string;
  verification_confirmed_at: string | null;
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
  draft: { label: 'Rascunho', color: 'bg-muted text-muted-foreground', icon: FileText },
  sent: { label: 'Enviado', color: 'bg-blue-100 text-blue-700', icon: Send },
  viewed: { label: 'Visualizado', color: 'bg-amber-100 text-amber-700', icon: Eye },
  signed: { label: 'Assinado', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  expired: { label: 'Expirado', color: 'bg-red-100 text-red-700', icon: AlertCircle },
};

export default function ContractSection({
  saleId, empresaId, clientName, clientEmail = '', clientPhone = '', clientCpf = '',
  destination = '', tripStartDate = '', tripEndDate = '', totalValue = 0,
  paymentMethod = '', sellerName = '', passengersCount = 1,
  saleWorkflowStatus = '', onWorkflowStatusChange,
}: ContractSectionProps) {
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [bundles, setBundles] = useState<BundleRow[]>([]);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGenerate, setShowGenerate] = useState(false);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [formClientEmail, setFormClientEmail] = useState(clientEmail);
  const [formClientPhone, setFormClientPhone] = useState(clientPhone);
  const [generating, setGenerating] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [exportingProof, setExportingProof] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [companyInfo, setCompanyInfo] = useState<{ name: string; cnpj: string; endereco: string }>({ name: '', cnpj: '', endereco: '' });
  const [refreshing, setRefreshing] = useState(false);
  const [prevStatuses, setPrevStatuses] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    loadContracts();
    loadTemplates();
    loadCompanyInfo();

    // Realtime subscription to detect contract signature changes
    const channel = supabase
      .channel(`contract-updates-${saleId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'contracts',
        filter: `sale_id=eq.${saleId}`,
      }, (payload) => {
        const updated = payload.new as any;
        if (updated.status === 'signed') {
          toast.success(`Contrato "${updated.title}" foi assinado por ${updated.client_name}!`, {
            duration: 8000,
            icon: '🎉',
          });
          createSignedNotification(updated as ContractRow);
          loadContracts();
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [saleId, empresaId]);

  useEffect(() => {
    setFormClientEmail(clientEmail);
    setFormClientPhone(clientPhone);
  }, [clientEmail, clientPhone]);

  const loadCompanyInfo = async () => {
    const { data } = await supabase
      .from('agency_settings')
      .select('name')
      .eq('empresa_id', empresaId)
      .maybeSingle() as any;
    if (data) {
      setCompanyInfo({ name: data.name || '', cnpj: '', endereco: '' });
    } else {
      const { data: comp } = await supabase.from('companies').select('name').eq('id', empresaId).maybeSingle();
      if (comp) setCompanyInfo({ name: (comp as any).name || '', cnpj: '', endereco: '' });
    }
  };

  const loadContracts = async () => {
    const { data } = await supabase
      .from('contracts')
      .select('*')
      .eq('sale_id', saleId)
      .order('created_at', { ascending: false });
    const newContracts = ((data as any) || []) as ContractRow[];

    // Check if any contract changed to 'signed' (only after first load)
    if (prevStatuses !== null) {
      newContracts.forEach((c: ContractRow) => {
        if (c.status === 'signed' && prevStatuses[c.id] !== 'signed') {
          toast.success(`Contrato "${c.title}" foi assinado por ${c.client_name}!`, {
            duration: 8000,
            icon: '🎉',
          });
          createSignedNotification(c);
        }
      });
    }

    // Store current statuses for comparison
    const statusMap: Record<string, string> = {};
    newContracts.forEach((c: ContractRow) => { statusMap[c.id] = c.status; });
    setPrevStatuses(statusMap);

    setContracts(newContracts);

    // Group contracts by bundle
    const { data: bundlesData } = await (supabase
      .from('contract_bundles' as any)
      .select('*')
      .eq('sale_id', saleId)
      .order('created_at', { ascending: false }) as any);

    const bundlesList: BundleRow[] = ((bundlesData as any) || []).map((b: any) => ({
      ...b,
      contracts: newContracts.filter(c => c.bundle_id === b.id),
    }));
    setBundles(bundlesList);

    // Also get standalone contracts (no bundle)
    setLoading(false);
  };

  const createSignedNotification = async (contract: ContractRow) => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    await (supabase.from('notifications' as any).insert({
      empresa_id: empresaId,
      user_id: userData.user.id,
      type: 'contract_signed',
      title: 'Contrato assinado ✅',
      message: `${contract.client_name} assinou o contrato "${contract.title}"`,
      reference_id: contract.id,
      reference_type: 'contract',
      is_read: false,
      dismissed: false,
    }) as any);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadContracts();
    setRefreshing(false);
    toast.info('Status dos contratos atualizado');
  };

  const loadTemplates = async () => {
    const { data } = await supabase
      .from('contract_templates')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('is_active', true)
      .order('name');
    setTemplates((data as any) || []);
  };

  const replaceVariables = (html: string) => {
    const now = new Date();
    const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    return html
      .replace(/\{\{nome_cliente\}\}/g, clientName)
      .replace(/\{\{cpf_cliente\}\}/g, clientCpf)
      .replace(/\{\{email_cliente\}\}/g, formClientEmail || clientEmail)
      .replace(/\{\{telefone_cliente\}\}/g, formClientPhone || clientPhone)
      .replace(/\{\{nome_empresa\}\}/g, companyInfo.name)
      .replace(/\{\{cnpj_empresa\}\}/g, companyInfo.cnpj)
      .replace(/\{\{endereco_empresa\}\}/g, companyInfo.endereco)
      .replace(/\{\{data_atual\}\}/g, format(now, 'dd/MM/yyyy'))
      .replace(/\{\{data_venda\}\}/g, format(now, 'dd/MM/yyyy'))
      .replace(/\{\{numero_venda\}\}/g, saleId.slice(0, 8).toUpperCase())
      .replace(/\{\{valor_total\}\}/g, formatCurrency(totalValue))
      .replace(/\{\{forma_pagamento\}\}/g, paymentMethod || 'Não definida')
      .replace(/\{\{destino\}\}/g, destination || 'Não informado')
      .replace(/\{\{data_inicio\}\}/g, tripStartDate ? format(new Date(tripStartDate + 'T12:00:00'), 'dd/MM/yyyy') : '')
      .replace(/\{\{data_fim\}\}/g, tripEndDate ? format(new Date(tripEndDate + 'T12:00:00'), 'dd/MM/yyyy') : '')
      .replace(/\{\{data_viagem\}\}/g, tripStartDate ? format(new Date(tripStartDate + 'T12:00:00'), 'dd/MM/yyyy') : '')
      .replace(/\{\{nome_vendedor\}\}/g, sellerName || '')
      .replace(/\{\{parcelamento\}\}/g, paymentMethod || '');
  };

  const handleGenerate = async () => {
    if (selectedTemplateIds.length === 0) { toast.error('Selecione pelo menos um modelo'); return; }
    setGenerating(true);

    const { data: user } = await supabase.auth.getUser();

    // Create a bundle
    const { data: bundleData, error: bundleErr } = await (supabase.from('contract_bundles' as any).insert({
      empresa_id: empresaId,
      sale_id: saleId,
      client_name: clientName,
      client_email: formClientEmail,
      client_phone: formClientPhone,
      client_cpf: clientCpf,
      status: 'draft',
      created_by: user?.user?.email || '',
    }).select().single() as any);

    if (bundleErr || !bundleData) { toast.error('Erro ao criar pacote de contratos'); setGenerating(false); return; }

    // Create each contract linked to the bundle
    for (const templateId of selectedTemplateIds) {
      const template = templates.find(t => t.id === templateId);
      if (!template) continue;

      const bodyHtml = replaceVariables(template.body_html);

      const { data, error } = await supabase.from('contracts').insert({
        empresa_id: empresaId,
        sale_id: saleId,
        template_id: templateId,
        title: template.name,
        body_html: bodyHtml,
        client_name: clientName,
        client_email: formClientEmail,
        client_phone: formClientPhone,
        client_cpf: clientCpf,
        status: 'draft',
        created_by: user?.user?.email || '',
        bundle_id: bundleData.id,
      } as any).select().single();

      if (!error && data) {
        await supabase.from('contract_audit_log').insert({
          contract_id: (data as any).id,
          action: 'created',
          actor: user?.user?.email || '',
          actor_type: 'user',
          details: { template_id: templateId, template_name: template.name, bundle_id: bundleData.id },
        } as any);
      }
    }

    toast.success(`${selectedTemplateIds.length} contrato(s) gerado(s) com sucesso!`);
    setShowGenerate(false);
    setSelectedTemplateIds([]);
    setGenerating(false);
    loadContracts();
  };

  const getSignLink = (token: string) => `${window.location.origin}/contrato/${token}`;
  const getBundleLink = (bundleToken: string) => `${window.location.origin}/contratos/${bundleToken}`;

  const handleCopyLink = (token: string) => {
    navigator.clipboard.writeText(getSignLink(token));
    toast.success('Link copiado!');
  };

  const handleSendEmail = async (contract: ContractRow) => {
    if (!contract.client_email) {
      toast.error('Email do cliente não informado no contrato');
      return;
    }

    const link = getSignLink(contract.token);
    const emailHtml = `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1a1a2e;">Contrato para Assinatura</h2>
        <p>Olá <strong>${contract.client_name}</strong>,</p>
        <p>Seu contrato "<strong>${contract.title}</strong>" está pronto para assinatura.</p>
        <p>Clique no botão abaixo para ler e assinar digitalmente:</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${link}" style="background: #6c3ce9; color: #fff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">Assinar Contrato</a>
        </div>
        <p style="color: #666; font-size: 13px;">Ou copie e cole o link no navegador:<br/>${link}</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #999; font-size: 11px;">${companyInfo.name || 'Vortex'}</p>
      </div>
    `;

    try {
      const { error: fnError } = await supabase.functions.invoke('send-email', {
        body: {
          empresa_id: empresaId,
          to: contract.client_email,
          subject: `Contrato para Assinatura - ${contract.title}`,
          html: emailHtml,
        },
      });

      if (fnError) throw fnError;

      await supabase.from('contracts').update({
        status: contract.status === 'draft' ? 'sent' : contract.status,
        sent_at: new Date().toISOString(),
        sent_via: 'email',
      } as any).eq('id', contract.id);

      await supabase.from('contract_audit_log').insert({
        contract_id: contract.id, action: 'sent_email', actor: 'user', actor_type: 'user',
        details: { email: contract.client_email },
      } as any);

      toast.success('Contrato enviado por email com sucesso!');
      loadContracts();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao enviar email. Verifique as configurações SMTP.');
    }
  };

  const handleSendWhatsApp = (contract: ContractRow) => {
    const link = getSignLink(contract.token);
    let digits = (contract.client_phone || '').replace(/\D/g, '');
    if (digits && !digits.startsWith('55') && (digits.length === 10 || digits.length === 11)) {
      digits = `55${digits}`;
    }

    const mensagem = encodeURIComponent(
      `Olá ${contract.client_name}!\n\nPara finalizar sua reserva, revise e assine seu contrato no link abaixo:\n\n${link}\n\nAcesse, leia os termos e assine digitalmente.`
    );

    const waUrl = digits
      ? `https://wa.me/${digits}?text=${mensagem}`
      : `https://wa.me/?text=${mensagem}`;

    // Open in new tab using multiple fallback strategies
    const newWindow = window.open(waUrl, '_blank', 'noopener,noreferrer');
    if (!newWindow) {
      // Fallback: create a visible link for the user to click
      const a = document.createElement('a');
      a.href = waUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // If still blocked, copy link and show toast
      navigator.clipboard.writeText(waUrl).then(() => {
        toast.info('Link do WhatsApp copiado! Cole no navegador para enviar.', { duration: 8000 });
      }).catch(() => {
        toast.info('Abra manualmente: ' + waUrl, { duration: 12000 });
      });
    }

    supabase.from('contracts').update({
      status: contract.status === 'draft' ? 'sent' : contract.status,
      sent_at: new Date().toISOString(),
      sent_via: 'whatsapp',
    } as any).eq('id', contract.id).then(() => loadContracts());
  };

  const handleDeleteContract = async (contractId: string) => {
    setDeletingId(contractId);
    try {
      await supabase.from('contract_signatures').delete().eq('contract_id', contractId);
      await supabase.from('contract_audit_log').delete().eq('contract_id', contractId);
      const { error } = await supabase.from('contracts').delete().eq('id', contractId);
      if (error) throw error;
      toast.success('Contrato excluído com sucesso');
      loadContracts();
    } catch (err: any) {
      toast.error('Erro ao excluir contrato');
    }
    setDeletingId(null);
  };

  const handleSendBundleWhatsApp = (bundle: BundleRow) => {
    const link = getBundleLink(bundle.token);
    let digits = (bundle.client_phone || '').replace(/\D/g, '');
    if (digits && !digits.startsWith('55') && (digits.length === 10 || digits.length === 11)) {
      digits = `55${digits}`;
    }
    const mensagem = encodeURIComponent(
      `Olá ${bundle.client_name}!\n\nPara finalizar sua reserva, revise e assine seus contratos no link abaixo:\n\n${link}\n\nAcesse, leia os termos e assine digitalmente.`
    );
    const waUrl = digits ? `https://wa.me/${digits}?text=${mensagem}` : `https://wa.me/?text=${mensagem}`;
    const newWindow = window.open(waUrl, '_blank', 'noopener,noreferrer');
    if (!newWindow) {
      const a = document.createElement('a'); a.href = waUrl; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.style.display = 'none';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      navigator.clipboard.writeText(waUrl).then(() => toast.info('Link do WhatsApp copiado!', { duration: 8000 })).catch(() => toast.info('Abra manualmente: ' + waUrl, { duration: 12000 }));
    }
    supabase.from('contract_bundles' as any).update({ status: bundle.status === 'draft' ? 'sent' : bundle.status, sent_at: new Date().toISOString() } as any).eq('id', bundle.id).then(() => {
      bundle.contracts.forEach(c => {
        if (c.status === 'draft') supabase.from('contracts').update({ status: 'sent', sent_at: new Date().toISOString(), sent_via: 'whatsapp' } as any).eq('id', c.id);
      });
      loadContracts();
    });
  };

  const handleSendBundleEmail = async (bundle: BundleRow) => {
    if (!bundle.client_email) { toast.error('Email do cliente não informado'); return; }
    const link = getBundleLink(bundle.token);
    const contractNames = bundle.contracts.map(c => c.title).join(', ');
    const emailHtml = `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1a1a2e;">Contratos para Assinatura</h2>
        <p>Olá <strong>${bundle.client_name}</strong>,</p>
        <p>Seus contratos estão prontos para assinatura: <strong>${contractNames}</strong>.</p>
        <p>Clique no botão abaixo para ler e assinar todos digitalmente:</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${link}" style="background: #6c3ce9; color: #fff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">Assinar Contratos</a>
        </div>
        <p style="color: #666; font-size: 13px;">Ou copie e cole o link no navegador:<br/>${link}</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #999; font-size: 11px;">${companyInfo.name || 'Vortex'}</p>
      </div>
    `;
    try {
      const { error: fnError } = await supabase.functions.invoke('send-email', {
        body: { empresa_id: empresaId, to: bundle.client_email, subject: `Contratos para Assinatura - ${contractNames}`, html: emailHtml },
      });
      if (fnError) throw fnError;
      await (supabase.from('contract_bundles' as any).update({ status: bundle.status === 'draft' ? 'sent' : bundle.status, sent_at: new Date().toISOString() } as any).eq('id', bundle.id) as any);
      for (const c of bundle.contracts) {
        if (c.status === 'draft') await supabase.from('contracts').update({ status: 'sent', sent_at: new Date().toISOString(), sent_via: 'email' } as any).eq('id', c.id);
      }
      toast.success('Contratos enviados por email!');
      loadContracts();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao enviar email.');
    }
  };

  const handleDeleteBundle = async (bundle: BundleRow) => {
    try {
      for (const c of bundle.contracts) {
        await supabase.from('contract_signatures').delete().eq('contract_id', c.id);
        await supabase.from('contract_audit_log').delete().eq('contract_id', c.id);
        await supabase.from('contracts').delete().eq('id', c.id);
      }
      await (supabase.from('contract_bundles' as any).delete().eq('id', bundle.id) as any);
      toast.success('Pacote de contratos excluído');
      loadContracts();
    } catch {
      toast.error('Erro ao excluir pacote');
    }
  };

  const handleExportChargebackProof = async (contract: ContractRow) => {
    if (contract.status !== 'signed') {
      toast.error('O contrato precisa estar assinado para exportar prova');
      return;
    }
    setExportingProof(true);

    // Fetch signature evidence
    const { data: signatures } = await supabase
      .from('contract_signatures')
      .select('*')
      .eq('contract_id', contract.id)
      .eq('status', 'signed')
      .order('signed_at', { ascending: false })
      .limit(1);

    const sig = (signatures as any)?.[0] as SignatureRow | undefined;

    // Fetch audit log
    const { data: auditLog } = await supabase
      .from('contract_audit_log')
      .select('*')
      .eq('contract_id', contract.id)
      .order('created_at', { ascending: true });

    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    let y = 20;

    // Title
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('PROVA DE CONTESTAÇÃO - CONTRATO DIGITAL', pageWidth / 2, y, { align: 'center' });
    y += 10;

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Documento gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm:ss')}`, pageWidth / 2, y, { align: 'center' });
    y += 12;

    // Separator
    pdf.setDrawColor(200);
    pdf.line(15, y, pageWidth - 15, y);
    y += 8;

    // Section 1: Client Data
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('1. DADOS DO CLIENTE', 15, y);
    y += 7;
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    const clientData = [
      `Nome: ${contract.client_name}`,
      `Email: ${contract.client_email || 'Não informado'}`,
      `Telefone: ${(contract as any).client_phone || 'Não informado'}`,
    ];
    clientData.forEach(line => { pdf.text(line, 15, y); y += 5.5; });
    y += 5;

    // Section 2: Contract Info
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('2. DADOS DO CONTRATO', 15, y);
    y += 7;
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    const contractData = [
      `Título: ${contract.title}`,
      `ID: ${contract.short_id}`,
      `Criado em: ${format(new Date(contract.created_at), 'dd/MM/yyyy HH:mm')}`,
      `Enviado em: ${contract.sent_at ? format(new Date(contract.sent_at), 'dd/MM/yyyy HH:mm') : 'N/A'}`,
      `Visualizado em: ${contract.viewed_at ? format(new Date(contract.viewed_at), 'dd/MM/yyyy HH:mm') : 'N/A'}`,
      `Assinado em: ${contract.signed_at ? format(new Date(contract.signed_at), 'dd/MM/yyyy HH:mm') : 'N/A'}`,
    ];
    contractData.forEach(line => { pdf.text(line, 15, y); y += 5.5; });
    y += 5;

    // Section 3: Signature Evidence
    if (sig) {
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('3. EVIDÊNCIAS DA ASSINATURA DIGITAL', 15, y);
      y += 7;
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      const sigData = [
        `Assinante: ${sig.signer_name}`,
        `Tipo de assinatura: ${sig.signature_type === 'draw' ? 'Desenho' : 'Digitada'}`,
        `Método de verificação: ${sig.verification_method === 'email_otp' ? 'Código OTP por Email' : sig.verification_method}`,
        `Verificação confirmada em: ${sig.verification_confirmed_at ? format(new Date(sig.verification_confirmed_at), 'dd/MM/yyyy HH:mm:ss') : 'N/A'}`,
        `Data da assinatura: ${sig.signed_at ? format(new Date(sig.signed_at), 'dd/MM/yyyy HH:mm:ss') : 'N/A'}`,
        `IP do assinante: ${sig.ip_address || 'Registrado no servidor'}`,
        `Dispositivo: ${sig.device_info || 'N/A'}`,
        `User Agent: ${sig.user_agent || 'N/A'}`,
        `Hash SHA-256 do documento: ${sig.document_hash || 'N/A'}`,
      ];
      sigData.forEach(line => {
        const lines = pdf.splitTextToSize(line, pageWidth - 30);
        lines.forEach((l: string) => { pdf.text(l, 15, y); y += 5.5; });
      });
      y += 5;
    }

    // Section 4: Audit Trail
    if (auditLog && auditLog.length > 0) {
      if (y > 230) { pdf.addPage(); y = 20; }
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('4. TRILHA DE AUDITORIA', 15, y);
      y += 7;
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      (auditLog as any[]).forEach(log => {
        if (y > 270) { pdf.addPage(); y = 20; }
        const line = `${format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss')} | ${log.action} | ${log.actor || 'sistema'} (${log.actor_type})`;
        pdf.text(line, 15, y);
        y += 5;
      });
      y += 5;
    }

    // Legal footer
    if (y > 250) { pdf.addPage(); y = 20; }
    pdf.setDrawColor(200);
    pdf.line(15, y, pageWidth - 15, y);
    y += 6;
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'italic');
    const legalText = 'Este contrato possui validade jurídica conforme aceite digital e registro eletrônico, nos termos da Medida Provisória nº 2.200-2/2001 e do artigo 10 da Lei nº 12.965/2014 (Marco Civil da Internet).';
    const legalLines = pdf.splitTextToSize(legalText, pageWidth - 30);
    legalLines.forEach((l: string) => { pdf.text(l, 15, y); y += 4; });

    pdf.save(`prova_contestacao_${contract.short_id}.pdf`);
    setExportingProof(false);
    toast.success('Prova de contestação exportada com sucesso!');
  };

  const handleDownloadContractPdf = (contract: ContractRow) => {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    let y = 20;

    // Header with company name
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text(companyInfo.name || 'Empresa', pageWidth / 2, y, { align: 'center' });
    y += 8;
    pdf.setFontSize(11);
    pdf.text(contract.title, pageWidth / 2, y, { align: 'center' });
    y += 8;
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Cliente: ${contract.client_name} | Assinado em: ${contract.signed_at ? format(new Date(contract.signed_at), 'dd/MM/yyyy HH:mm') : ''}`, pageWidth / 2, y, { align: 'center' });
    y += 10;
    pdf.setDrawColor(200);
    pdf.line(15, y, pageWidth - 15, y);
    y += 8;

    // Strip HTML and render text
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = contract.body_html;
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
    pdf.text(`Assinante: ${contract.client_name}`, 15, y); y += 5;
    pdf.text(`Data: ${contract.signed_at ? format(new Date(contract.signed_at), 'dd/MM/yyyy HH:mm:ss') : ''}`, 15, y); y += 5;
    pdf.text('Verificação: Código OTP por Email', 15, y); y += 5;

    // Legal
    y += 5;
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'italic');
    const legal = 'Este contrato possui validade jurídica conforme aceite digital, nos termos da MP nº 2.200-2/2001.';
    const legalLines = pdf.splitTextToSize(legal, pageWidth - 30);
    legalLines.forEach((l: string) => { pdf.text(l, 15, y); y += 4; });

    pdf.save(`contrato_${contract.short_id}_${contract.client_name.replace(/\s+/g, '_')}.pdf`);
    toast.success('PDF do contrato baixado!');
  };


  const hasSignedContract = contracts.some(c => c.status === 'signed');
  const allBundlesSigned = bundles.length > 0 && bundles.every(b => b.contracts.every(c => c.status === 'signed'));
  const isAwaitingPayment = saleWorkflowStatus === 'aguardando_pagamento' || saleWorkflowStatus === 'sem_contrato';
  const isConcluded = saleWorkflowStatus === 'processo_concluido';
  const canConfirmPayment = (allBundlesSigned || isAwaitingPayment) && !isConcluded;
  const canSkipContract = bundles.length === 0 && !isAwaitingPayment && !isConcluded && saleWorkflowStatus !== 'sem_contrato';

  const handleSkipContract = async () => {
    await supabase.from('sales').update({ sale_workflow_status: 'aguardando_pagamento' } as any).eq('id', saleId);
    onWorkflowStatusChange?.('aguardando_pagamento');
    toast.success('Venda marcada como não necessita de contrato. Aguardando pagamento.');
  };

  const handleConfirmPayment = async () => {
    await supabase.from('sales').update({ sale_workflow_status: 'processo_concluido' } as any).eq('id', saleId);
    onWorkflowStatusChange?.('processo_concluido');
    toast.success('Pagamento confirmado! Processo concluído.');
  };

  // Auto-set workflow when contracts are signed
  useEffect(() => {
    if (bundles.length === 0) return;
    if (allBundlesSigned && (saleWorkflowStatus === 'aguardando_assinatura' || saleWorkflowStatus === 'em_aberto')) {
      supabase.from('sales').update({ sale_workflow_status: 'aguardando_pagamento' } as any).eq('id', saleId).then(() => {
        onWorkflowStatusChange?.('aguardando_pagamento');
      });
    }
  }, [allBundlesSigned, saleWorkflowStatus]);

  if (loading) return null;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> Contratos</CardTitle>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={handleRefresh} disabled={refreshing} className="gap-1.5">
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Atualizar
              </Button>
              <Button size="sm" onClick={() => setShowGenerate(true)} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Gerar Contrato
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {bundles.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum contrato gerado para esta venda</p>
          ) : (
            <div className="space-y-4">
              {bundles.map(bundle => {
                const allSigned = bundle.contracts.every(c => c.status === 'signed');
                const anySigned = bundle.contracts.some(c => c.status === 'signed');
                const bundleStatus = allSigned ? 'signed' : bundle.status;
                const s = STATUS_MAP[bundleStatus] || STATUS_MAP.draft;
                const bundleLink = getBundleLink(bundle.token);

                return (
                  <div key={bundle.id} className="border rounded-lg overflow-hidden">
                    {/* Bundle header */}
                    <div className="flex items-center justify-between p-3 bg-accent/20">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${s.color}`}>
                          <s.icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm">
                            {bundle.contracts.length} contrato(s) — Link único
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{format(new Date(bundle.created_at), 'dd/MM/yyyy HH:mm')}</span>
                            {allSigned && <span className="text-emerald-600">• Todos assinados</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Badge className={`${s.color} text-xs`}>{allSigned ? 'Assinado' : s.label}</Badge>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { navigator.clipboard.writeText(bundleLink); toast.success('Link copiado!'); }} title="Copiar link">
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleSendBundleWhatsApp(bundle)} title="WhatsApp">
                          <MessageCircle className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleSendBundleEmail(bundle)} title="Email">
                          <Mail className="h-3.5 w-3.5" />
                        </Button>
                        <a href={bundleLink} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Abrir link">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        </a>
                        {!anySigned && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" title="Excluir pacote">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir pacote de contratos?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação excluirá {bundle.contracts.length} contrato(s) permanentemente.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteBundle(bundle)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>

                    {/* Individual contracts */}
                    <div className="divide-y">
                      {bundle.contracts.map(c => {
                        const cs = STATUS_MAP[c.status] || STATUS_MAP.draft;
                        return (
                          <div key={c.id} className="flex items-center justify-between px-4 py-2 bg-card">
                            <div className="flex items-center gap-2 min-w-0">
                              <cs.icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="text-sm truncate">{c.title}</span>
                              <Badge variant="outline" className="text-[10px] shrink-0">{cs.label}</Badge>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setPreviewHtml(c.body_html)} title="Visualizar">
                                <Eye className="h-3 w-3" />
                              </Button>
                              {c.status === 'signed' && (
                                <>
                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleExportChargebackProof(c)} disabled={exportingProof} title="Exportar prova">
                                    {exportingProof ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldCheck className="h-3 w-3 text-emerald-600" />}
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDownloadContractPdf(c)} title="Baixar PDF">
                                    <Download className="h-3 w-3 text-primary" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Chargeback export info */}
          {hasSignedContract && (
            <div className="mt-4 p-3 border border-emerald-200 dark:border-emerald-800 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/30">
              <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                <span className="font-medium">Proteção anti-chargeback ativa</span>
              </div>
              <p className="text-xs text-emerald-600/80 dark:text-emerald-500/80 mt-1 ml-6">
                Clique no ícone <ShieldCheck className="h-3 w-3 inline" /> no contrato assinado para exportar a prova de contestação em PDF.
              </p>
            </div>
          )}

          {/* Workflow action buttons */}
          <div className="mt-4 flex flex-wrap gap-2">
            {bundles.length === 0 && !isAwaitingPayment && !isConcluded && saleWorkflowStatus !== 'sem_contrato' && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-1.5">
                    <FileText className="h-3.5 w-3.5" /> Venda não necessita de contrato
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta venda será marcada como "não necessita de contrato" e passará direto para aguardando pagamento.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleSkipContract}>Confirmar</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {canConfirmPayment && isAwaitingPayment && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Pagamento Realizado
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar recebimento?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Ao confirmar, o status da venda será alterado para "Processo Concluído".
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirmPayment} className="bg-emerald-600 hover:bg-emerald-700">Confirmar Pagamento</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {isConcluded && (
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" /> Processo Concluído
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Generate Dialog */}
      <Dialog open={showGenerate} onOpenChange={setShowGenerate}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Gerar Contratos</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Selecione os Modelos de Contrato</Label>
              {templates.length === 0 ? (
                <p className="text-xs text-amber-600 mt-1">Nenhum modelo cadastrado. Crie um em Contratos → Modelos.</p>
              ) : (
                <div className="space-y-2 mt-2 max-h-48 overflow-y-auto">
                  {templates.map(t => (
                    <label key={t.id} className="flex items-center gap-2 p-2 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors">
                      <Checkbox
                        checked={selectedTemplateIds.includes(t.id)}
                        onCheckedChange={(checked) => {
                          setSelectedTemplateIds(prev =>
                            checked ? [...prev, t.id] : prev.filter(id => id !== t.id)
                          );
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{t.name}</p>
                        <p className="text-xs text-muted-foreground">{t.category}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
              {selectedTemplateIds.length > 0 && (
                <p className="text-xs text-muted-foreground mt-2">{selectedTemplateIds.length} modelo(s) selecionado(s) — será gerado um link único para todos</p>
              )}
            </div>
            <div>
              <Label>Email do Cliente (para verificação)</Label>
              <Input value={formClientEmail} onChange={e => setFormClientEmail(e.target.value)} placeholder="email@exemplo.com" />
            </div>
            <div>
              <Label>Telefone do Cliente</Label>
              <Input value={formClientPhone} onChange={e => setFormClientPhone(e.target.value)} placeholder="(00) 00000-0000" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowGenerate(false)}>Cancelar</Button>
              <Button onClick={handleGenerate} disabled={generating || selectedTemplateIds.length === 0} className="gap-2">
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                Gerar {selectedTemplateIds.length > 1 ? `${selectedTemplateIds.length} Contratos` : 'Contrato'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview */}
      <Dialog open={!!previewHtml} onOpenChange={() => setPreviewHtml(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Contrato</DialogTitle></DialogHeader>
          <div className="border rounded-lg p-6 bg-white">
            <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: previewHtml || '' }} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
