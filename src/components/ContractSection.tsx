import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, Plus, Send, Eye, CheckCircle2, Clock, AlertCircle, Copy, ExternalLink, Loader2, MessageCircle, Mail, ShieldCheck, Download } from 'lucide-react';
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
}: ContractSectionProps) {
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGenerate, setShowGenerate] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [formClientEmail, setFormClientEmail] = useState(clientEmail);
  const [formClientPhone, setFormClientPhone] = useState(clientPhone);
  const [generating, setGenerating] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [exportingProof, setExportingProof] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<{ name: string; cnpj: string; endereco: string }>({ name: '', cnpj: '', endereco: '' });

  useEffect(() => {
    loadContracts();
    loadTemplates();
    loadCompanyInfo();
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
    setContracts((data as any) || []);
    setLoading(false);
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
    if (!selectedTemplateId) { toast.error('Selecione um modelo'); return; }
    setGenerating(true);

    const template = templates.find(t => t.id === selectedTemplateId);
    if (!template) { setGenerating(false); return; }

    const bodyHtml = replaceVariables(template.body_html);
    const { data: user } = await supabase.auth.getUser();

    const { data, error } = await supabase.from('contracts').insert({
      empresa_id: empresaId,
      sale_id: saleId,
      template_id: selectedTemplateId,
      title: template.name,
      body_html: bodyHtml,
      client_name: clientName,
      client_email: formClientEmail,
      client_phone: formClientPhone,
      client_cpf: clientCpf,
      status: 'draft',
      created_by: user?.user?.email || '',
    } as any).select().single();

    if (error) { toast.error('Erro ao gerar contrato'); setGenerating(false); return; }

    await supabase.from('contract_audit_log').insert({
      contract_id: (data as any).id,
      action: 'created',
      actor: user?.user?.email || '',
      actor_type: 'user',
      details: { template_id: selectedTemplateId, template_name: template.name },
    } as any);

    toast.success('Contrato gerado com sucesso!');
    setShowGenerate(false);
    setGenerating(false);
    loadContracts();
  };

  const getSignLink = (token: string) => `${window.location.origin}/contrato/${token}`;

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
    const phone = (contract.client_phone || '').replace(/\D/g, '');
    const phoneParam = phone ? phone : '';
    const text = encodeURIComponent(
      `Olá ${contract.client_name}! Para finalizar sua reserva, revise e assine seu contrato no link abaixo:\n\n${link}\n\nAcesse, leia os termos e assine digitalmente.`
    );
    const waUrl = phoneParam
      ? `https://wa.me/${phoneParam}?text=${text}`
      : `https://wa.me/?text=${text}`;

    // Use anchor element to avoid popup blockers
    const a = document.createElement('a');
    a.href = waUrl;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    supabase.from('contracts').update({
      status: contract.status === 'draft' ? 'sent' : contract.status,
      sent_at: new Date().toISOString(),
      sent_via: 'whatsapp',
    } as any).eq('id', contract.id).then(() => loadContracts());
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

  if (loading) return null;

  const hasSignedContract = contracts.some(c => c.status === 'signed');

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> Contratos</CardTitle>
            <Button size="sm" onClick={() => setShowGenerate(true)} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Gerar Contrato
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {contracts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum contrato gerado para esta venda</p>
          ) : (
            <div className="space-y-3">
              {contracts.map(c => {
                const s = STATUS_MAP[c.status] || STATUS_MAP.draft;
                return (
                  <div key={c.id} className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-accent/30 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${s.color}`}>
                        <s.icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{c.title}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{format(new Date(c.created_at), 'dd/MM/yyyy HH:mm')}</span>
                          {c.signed_at && <span className="text-emerald-600">• Assinado {format(new Date(c.signed_at), 'dd/MM HH:mm')}</span>}
                          {c.viewed_at && !c.signed_at && <span className="text-amber-600">• Visualizado</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Badge className={`${s.color} text-xs`}>{s.label}</Badge>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPreviewHtml(c.body_html)} title="Visualizar">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleCopyLink(c.token)} title="Copiar link">
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleSendWhatsApp(c)} title="WhatsApp">
                        <MessageCircle className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleSendEmail(c)} title="Email">
                        <Mail className="h-3.5 w-3.5" />
                      </Button>
                      {c.status === 'signed' && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleExportChargebackProof(c)} title="Exportar prova de contestação" disabled={exportingProof}>
                          {exportingProof ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />}
                        </Button>
                      )}
                      <a href={getSignLink(c.token)} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Abrir link">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Chargeback export info */}
          {hasSignedContract && (
            <div className="mt-4 p-3 border border-emerald-200 rounded-lg bg-emerald-50/50">
              <div className="flex items-center gap-2 text-sm text-emerald-700">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                <span className="font-medium">Proteção anti-chargeback ativa</span>
              </div>
              <p className="text-xs text-emerald-600/80 mt-1 ml-6">
                Clique no ícone <ShieldCheck className="h-3 w-3 inline" /> no contrato assinado para exportar a prova de contestação em PDF.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generate Dialog */}
      <Dialog open={showGenerate} onOpenChange={setShowGenerate}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Gerar Contrato</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Modelo de Contrato</Label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger><SelectValue placeholder="Selecione o modelo..." /></SelectTrigger>
                <SelectContent>
                  {templates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {templates.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">Nenhum modelo cadastrado. Crie um em Contratos → Modelos.</p>
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
              <Button onClick={handleGenerate} disabled={generating || !selectedTemplateId} className="gap-2">
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                Gerar Contrato
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
