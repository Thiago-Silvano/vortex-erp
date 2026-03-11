import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Send, Copy, ExternalLink, RefreshCw, FileText, Loader2, Bell, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { generateDS160Pdf } from '@/lib/generateDS160Pdf';

interface DS160Form {
  id: string;
  token: string;
  status: string;
  sent_at: string | null;
  last_saved_at: string | null;
  submitted_at: string | null;
  pdf_url: string | null;
  form_data: Record<string, any>;
  current_step: number;
  sent_by: string;
}

interface Props {
  clientId: string;
  clientName: string;
  clientEmail: string;
  isMaster?: boolean;
}

export default function DS160Section({ clientId, clientName, clientEmail, isMaster }: Props) {
  const { activeCompany } = useCompany();
  const [forms, setForms] = useState<DS160Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [deleteFormId, setDeleteFormId] = useState<string | null>(null);

  const fetchForms = async () => {
    const { data } = await supabase
      .from('ds160_forms')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });
    if (data) setForms(data as unknown as DS160Form[]);
    setLoading(false);
  };

  useEffect(() => { fetchForms(); }, [clientId]);

  const baseUrl = window.location.origin;

  const sendLink = async () => {
    if (!clientEmail) {
      toast.error('Cliente não possui email cadastrado');
      return;
    }
    setSending(true);
    // Create a new form entry
    const { data: user } = await supabase.auth.getUser();
    const { data: newForm, error } = await supabase.from('ds160_forms').insert({
      client_id: clientId,
      empresa_id: activeCompany?.id,
      status: 'sent',
      sent_at: new Date().toISOString(),
      sent_by: user.user?.email || '',
    } as any).select().single();

    if (error || !newForm) {
      toast.error('Erro ao criar formulário');
      setSending(false);
      return;
    }

    // Send email via edge function
    try {
      const formLink = `${baseUrl}/ds160/${(newForm as any).token}`;
      await supabase.functions.invoke('send-ds160-link', {
        body: {
          to: clientEmail,
          clientName,
          formLink,
        },
      });
      toast.success('Link do DS-160 enviado por email!');
    } catch {
      toast.warning('Formulário criado mas houve erro ao enviar email. Use o botão copiar link.');
    }

    setSending(false);
    fetchForms();
  };

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(`${baseUrl}/ds160/${token}`);
    toast.success('Link copiado!');
  };

  const resendLink = async (form: DS160Form) => {
    if (!clientEmail) {
      toast.error('Cliente não possui email cadastrado');
      return;
    }
    try {
      const formLink = `${baseUrl}/ds160/${form.token}`;
      await supabase.functions.invoke('send-ds160-link', {
        body: { to: clientEmail, clientName, formLink },
      });
      toast.success('Link reenviado!');
    } catch {
      toast.error('Erro ao reenviar email');
    }
  };

  const handleGeneratePdf = async (form: DS160Form) => {
    setGeneratingPdf(true);
    try {
      await generateDS160Pdf(form.form_data, clientName);
      toast.success('PDF gerado com sucesso!');
    } catch {
      toast.error('Erro ao gerar PDF');
    }
    setGeneratingPdf(false);
  };

  const statusLabel = (s: string) => {
    switch (s) {
      case 'not_sent': return { label: 'Não enviado', variant: 'secondary' as const };
      case 'sent': return { label: 'Link enviado', variant: 'outline' as const };
      case 'in_progress': return { label: 'Em preenchimento', variant: 'default' as const };
      case 'submitted': return { label: 'Concluído', variant: 'default' as const };
      case 'deleted': return { label: 'Excluído', variant: 'destructive' as const };
      default: return { label: s, variant: 'secondary' as const };
    }
  };

  const formatDate = (d: string | null) => d ? format(new Date(d), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '—';

  const handleDeleteForm = async () => {
    if (!deleteFormId) return;
    const { error } = await supabase.from('ds160_forms').update({
      status: 'deleted',
    } as any).eq('id', deleteFormId);
    if (error) {
      toast.error('Erro ao excluir formulário');
    } else {
      toast.success('Formulário excluído com sucesso');
      fetchForms();
    }
    setDeleteFormId(null);
  };

  // Check for newly submitted forms (notification)
  const submittedNotDismissed = forms.filter(f => f.status === 'submitted' && !dismissed.has(f.id));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Formulário DS-160
        </h3>
        <Button size="sm" onClick={sendLink} disabled={sending} className="gap-1.5">
          {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
          Enviar Link
        </Button>
      </div>

      {/* Floating notification for submitted forms */}
      {submittedNotDismissed.map(f => (
        <div key={f.id} className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center gap-3 animate-in fade-in">
          <Bell className="h-5 w-5 text-emerald-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-emerald-800">Formulário DS-160 preenchido!</p>
            <p className="text-xs text-emerald-600">Enviado em {formatDate(f.submitted_at)}</p>
          </div>
          <Button size="sm" variant="ghost" onClick={() => setDismissed(prev => new Set(prev).add(f.id))} className="text-emerald-600">
            Fechar
          </Button>
        </div>
      ))}

      {loading ? (
        <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : forms.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">Nenhum formulário DS-160 enviado ainda.</p>
      ) : (
        <div className="space-y-3">
          {forms.map(form => {
            const st = statusLabel(form.status);
            return (
              <div key={form.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant={st.variant} className={form.status === 'submitted' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : form.status === 'in_progress' ? 'bg-blue-100 text-blue-700 border-blue-200' : ''}>
                    {st.label}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Etapa {form.current_step + 1}/11
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>Enviado: {formatDate(form.sent_at)}</span>
                  <span>Último salvo: {formatDate(form.last_saved_at)}</span>
                  {form.submitted_at && <span className="col-span-2">Concluído: {formatDate(form.submitted_at)}</span>}
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => copyLink(form.token)}>
                    <Copy className="h-3 w-3" />Copiar Link
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => resendLink(form)}>
                    <RefreshCw className="h-3 w-3" />Reenviar
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => window.open(`/ds160/${form.token}`, '_blank')}>
                    <ExternalLink className="h-3 w-3" />Abrir
                  </Button>
                  {form.status === 'submitted' && (
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleGeneratePdf(form)} disabled={generatingPdf}>
                      {generatingPdf ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />}
                      Gerar PDF
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
