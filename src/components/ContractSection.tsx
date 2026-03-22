import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, Plus, Send, Eye, CheckCircle2, Clock, AlertCircle, Copy, ExternalLink, Loader2, MessageCircle, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface ContractSectionProps {
  saleId: string;
  empresaId: string;
  clientName: string;
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
  body_html: string;
}

interface TemplateRow {
  id: string;
  name: string;
  category: string;
  body_html: string;
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
  draft: { label: 'Rascunho', color: 'bg-muted text-muted-foreground', icon: FileText },
  sent: { label: 'Enviado', color: 'bg-blue-100 text-blue-700', icon: Send },
  viewed: { label: 'Visualizado', color: 'bg-amber-100 text-amber-700', icon: Eye },
  signed: { label: 'Assinado', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  expired: { label: 'Expirado', color: 'bg-red-100 text-red-700', icon: AlertCircle },
};

export default function ContractSection({ saleId, empresaId, clientName }: ContractSectionProps) {
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGenerate, setShowGenerate] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [generating, setGenerating] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  useEffect(() => {
    loadContracts();
    loadTemplates();
  }, [saleId, empresaId]);

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
    return html
      .replace(/\{\{nome_cliente\}\}/g, clientName)
      .replace(/\{\{email_cliente\}\}/g, clientEmail)
      .replace(/\{\{telefone_cliente\}\}/g, clientPhone)
      .replace(/\{\{data_atual\}\}/g, format(now, 'dd/MM/yyyy'))
      .replace(/\{\{data_venda\}\}/g, format(now, 'dd/MM/yyyy'))
      .replace(/\{\{numero_venda\}\}/g, saleId.slice(0, 8).toUpperCase());
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
      client_email: clientEmail,
      client_phone: clientPhone,
      status: 'draft',
      created_by: user?.user?.email || '',
    } as any).select().single();

    if (error) { toast.error('Erro ao gerar contrato'); setGenerating(false); return; }

    // Audit log
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

  const getSignLink = (token: string) => {
    return `${window.location.origin}/contrato/${token}`;
  };

  const handleCopyLink = (token: string) => {
    navigator.clipboard.writeText(getSignLink(token));
    toast.success('Link copiado!');
  };

  const handleSendEmail = async (contract: ContractRow) => {
    if (!contract.client_email) {
      toast.error('Email do cliente não informado no contrato');
      return;
    }

    await supabase.from('contracts').update({
      status: contract.status === 'draft' ? 'sent' : contract.status,
      sent_at: new Date().toISOString(),
      sent_via: 'email',
    } as any).eq('id', contract.id);

    // Audit
    await supabase.from('contract_audit_log').insert({
      contract_id: contract.id,
      action: 'sent_email',
      actor: 'user',
      actor_type: 'user',
      details: { email: contract.client_email },
    } as any);

    toast.success('Contrato marcado como enviado');
    loadContracts();
  };

  const handleSendWhatsApp = (contract: ContractRow) => {
    const link = getSignLink(contract.token);
    const text = encodeURIComponent(`Olá ${contract.client_name}! Segue o link do seu contrato para assinatura digital:\n\n${link}\n\nAcesse, leia os termos e assine digitalmente.`);
    window.open(`https://wa.me/?text=${text}`, '_blank');

    // Update status
    supabase.from('contracts').update({
      status: contract.status === 'draft' ? 'sent' : contract.status,
      sent_at: new Date().toISOString(),
      sent_via: 'whatsapp',
    } as any).eq('id', contract.id).then(() => loadContracts());
  };

  if (loading) return null;

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
              <Input value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="email@exemplo.com" />
            </div>
            <div>
              <Label>Telefone do Cliente</Label>
              <Input value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="(00) 00000-0000" />
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
