import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Copy, ExternalLink, FileText, Loader2, Bell, Trash2, Link2, Briefcase, UserPlus, Bot, RefreshCw, Code2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { generateDS160Pdf } from '@/lib/generateDS160Pdf';
import { mapearDadosDS160 } from '@/lib/ds160-mapper';

const ROBOT_SERVER = 'http://localhost:3004';

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
  robot_status?: string | null;
  robot_application_id?: string | null;
  robot_filled_at?: string | null;
  robot_machine?: string | null;
}

interface Props {
  clientId: string;
  clientName: string;
  clientEmail: string;
  isMaster?: boolean;
  onClientDataFilled?: (updates: Record<string, any>) => void;
}

interface DutiesState {
  atualEnabled: boolean; atual: string;
  ant1Enabled: boolean; ant1: string;
  ant2Enabled: boolean; ant2: string;
}

const emptyDuties: DutiesState = {
  atualEnabled: false, atual: '',
  ant1Enabled: false, ant1: '',
  ant2Enabled: false, ant2: '',
};

interface DutiesAvail { atual: boolean; ant1: boolean; ant2: boolean; }

// Descobre quais ocupações o cliente realmente preencheu no formulário.
function computeAvailability(formData: Record<string, any>): DutiesAvail {
  const fd = formData || {};
  const has = (v: any) => typeof v === 'string' && v.trim().length > 0;
  const atual = has(fd.empresa_atual) || has(fd.cargo_atual) || has(fd.descricao_funcoes) ||
    (has(fd.status_profissional) && fd.status_profissional !== 'Desempregado');
  const emp = Array.isArray(fd.empregos_anteriores) ? fd.empregos_anteriores : [];
  const empHas = (e: any) => e && (has(e.empresa) || has(e.cargo) || has(e.endereco) || has(e.descricao_funcoes));
  return { atual, ant1: empHas(emp[0]), ant2: empHas(emp[1]) };
}

// Aplica os textos de "duties" sobre os campos preenchidos pelo cliente.
function applyDuties(formData: Record<string, any>, d: DutiesState): Record<string, any> {
  const fd: Record<string, any> = { ...formData };
  if (d.atualEnabled && d.atual.trim()) fd.descricao_funcoes = d.atual.trim();
  if (d.ant1Enabled || d.ant2Enabled) {
    const emp = Array.isArray(fd.empregos_anteriores)
      ? fd.empregos_anteriores.map((x: any) => ({ ...x }))
      : [];
    while (emp.length < 2) emp.push({});
    if (d.ant1Enabled && d.ant1.trim()) emp[0].descricao_funcoes = d.ant1.trim();
    if (d.ant2Enabled && d.ant2.trim()) emp[1].descricao_funcoes = d.ant2.trim();
    fd.empregos_anteriores = emp;
  }
  return fd;
}

// Mapeia campos do formulário DS-160 para colunas do cadastro do cliente.
function mapFormToClient(fd: Record<string, any>): Record<string, string> {
  const s = (v: any) => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v));
  const fullName = s(fd.nome_completo_passaporte) ||
    [s(fd.nome), s(fd.sobrenome)].filter(Boolean).join(' ').trim();
  return {
    full_name: fullName,
    birth_date: s(fd.data_nascimento),
    cpf: s(fd.cpf),
    passport_number: s(fd.passaporte_numero),
    passport_issue_date: s(fd.passaporte_data_emissao),
    passport_expiry_date: s(fd.passaporte_data_expiracao),
    email: s(fd.contato_email),
    phone: s(fd.contato_telefone),
    cep: s(fd.contato_cep),
    address: s(fd.contato_endereco),
    address_number: s(fd.contato_numero),
    neighborhood: s(fd.contato_bairro),
    city: s(fd.contato_cidade),
    state: s(fd.contato_estado),
  };
}

export default function DS160Section({ clientId, clientName, clientEmail, isMaster, onClientDataFilled }: Props) {
  const { activeCompany } = useCompany();
  const [forms, setForms] = useState<DS160Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [deleteFormId, setDeleteFormId] = useState<string | null>(null);
  const [dutiesFormId, setDutiesFormId] = useState<string | null>(null);
  const [duties, setDuties] = useState<DutiesState>(emptyDuties);
  const [dutiesAvail, setDutiesAvail] = useState<DutiesAvail>({ atual: false, ant1: false, ant2: false });
  const [dutiesPdfLoading, setDutiesPdfLoading] = useState(false);
  const [fillingClientId, setFillingClientId] = useState<string | null>(null);
  const [robotSending, setRobotSending] = useState<string | null>(null);
  const [jsonForm, setJsonForm] = useState<DS160Form | null>(null);

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

  // Realtime: atualiza a tela automaticamente quando o robô concluir o DS-160.
  useEffect(() => {
    const channel = supabase
      .channel(`ds160-client-${clientId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'ds160_forms',
        filter: `client_id=eq.${clientId}`,
      }, (payload) => {
        const updated = payload.new as any;
        setForms(prev => prev.map(f => f.id === updated.id ? { ...f, ...updated } : f));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [clientId]);

  const baseUrl = window.location.origin;

  const generateLink = async () => {
    setSending(true);
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

    const formLink = `${baseUrl}/ds160/${(newForm as any).token}`;
    navigator.clipboard.writeText(formLink);
    toast.success('Link gerado e copiado para a área de transferência!');
    setSending(false);
    fetchForms();
  };

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(`${baseUrl}/ds160/${token}`);
    toast.success('Link copiado!');
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

  const robotMeta = (s?: string | null) => {
    switch (s) {
      case 'em_andamento': return { label: 'Em andamento', dot: 'bg-blue-500', text: 'text-blue-700' };
      case 'concluido': return { label: 'Concluído', dot: 'bg-emerald-500', text: 'text-emerald-700' };
      case 'erro': return { label: 'Erro', dot: 'bg-red-500', text: 'text-red-700' };
      default: return { label: 'Pendente', dot: 'bg-gray-400', text: 'text-gray-600' };
    }
  };

  // Envia os dados do formulário para o robô local (porta 3004).
  const sendToRobot = async (form: DS160Form) => {
    setRobotSending(form.id);
    try {
      // Verifica se o servidor local está rodando.
      try {
        await fetch(`${ROBOT_SERVER}/ds160/health`, { method: 'GET' });
      } catch {
        toast.error('O servidor DS-160 não está rodando nesta máquina. Abra o DS-160 Server antes de continuar.');
        setRobotSending(null);
        return;
      }

      const dados = mapearDadosDS160(form.form_data || {}, clientName);
      const resp = await fetch(`${ROBOT_SERVER}/ds160/iniciar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome_cliente: clientName, form_id: form.id, dados }),
      });
      if (!resp.ok) throw new Error('falha');

      await supabase.from('ds160_forms').update({ robot_status: 'em_andamento' } as any).eq('id', form.id);
      setForms(prev => prev.map(f => f.id === form.id ? { ...f, robot_status: 'em_andamento' } : f));
      toast.success('Robô iniciado! Abra o app DS-160 na sua máquina.');
    } catch {
      toast.error('Erro ao iniciar o robô DS-160.');
    }
    setRobotSending(null);
  };

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

  const openDuties = (form: DS160Form) => {
    const saved = (form.form_data?.duties_override as DutiesState) || emptyDuties;
    const avail = computeAvailability(form.form_data || {});
    const merged = { ...emptyDuties, ...saved };
    // Garante que checkboxes de ocupações inexistentes fiquem desmarcados.
    if (!avail.atual) merged.atualEnabled = false;
    if (!avail.ant1) merged.ant1Enabled = false;
    if (!avail.ant2) merged.ant2Enabled = false;
    setDutiesAvail(avail);
    setDuties(merged);
    setDutiesFormId(form.id);
  };

  const persistDuties = async (next: DutiesState) => {
    const fid = dutiesFormId;
    if (!fid) return;
    const form = forms.find(f => f.id === fid);
    if (!form) return;
    const merged = { ...(form.form_data || {}), duties_override: next };
    const { error } = await supabase.from('ds160_forms')
      .update({ form_data: merged } as any).eq('id', fid);
    if (error) {
      toast.error('Erro ao salvar duties');
      return;
    }
    setForms(prev => prev.map(f => f.id === fid ? { ...f, form_data: merged } : f));
  };

  const handleDutiesToPdf = async () => {
    const form = forms.find(f => f.id === dutiesFormId);
    if (!form) return;
    setDutiesPdfLoading(true);
    try {
      await persistDuties(duties);
      const fd = applyDuties(form.form_data || {}, duties);
      await generateDS160Pdf(fd, clientName);
      toast.success('PDF gerado com as duties atualizadas!');
      setDutiesFormId(null);
    } catch {
      toast.error('Erro ao gerar PDF');
    }
    setDutiesPdfLoading(false);
  };

  // Preenche apenas os campos vazios do cadastro do cliente com os dados do formulário.
  const handleFillClient = async (form: DS160Form) => {
    setFillingClientId(form.id);
    try {
      const { data: client, error: fetchErr } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();
      if (fetchErr || !client) {
        toast.error('Erro ao carregar cadastro do cliente');
        setFillingClientId(null);
        return;
      }
      const mapped = mapFormToClient(form.form_data || {});
      const updates: Record<string, any> = {};
      for (const [key, value] of Object.entries(mapped)) {
        if (!value) continue;
        const current = (client as any)[key];
        const isEmpty = current == null || (typeof current === 'string' && current.trim() === '');
        if (isEmpty) updates[key] = value;
      }
      const count = Object.keys(updates).length;
      if (count === 0) {
        toast.info('Nenhum campo vazio para preencher — cadastro já está completo.');
        setFillingClientId(null);
        return;
      }
      const { error: updErr } = await supabase.from('clients').update(updates as any).eq('id', clientId);
      if (updErr) {
        toast.error('Erro ao atualizar cadastro');
      } else {
        onClientDataFilled?.(updates);
        toast.success(`${count} campo(s) preenchido(s) no cadastro do cliente.`);
      }
    } catch {
      toast.error('Erro ao preencher cadastro');
    }
    setFillingClientId(null);
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
        <Button size="sm" onClick={generateLink} disabled={sending} className="gap-1.5">
          {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Link2 className="h-3 w-3" />}
          Gerar Link
        </Button>
      </div>

      {/* Floating notification for submitted forms */}
      {submittedNotDismissed.map(f => (
        <div key={f.id} className="bg-red-50 border-2 border-red-300 rounded-xl p-4 flex items-center gap-4 animate-in fade-in shadow-sm">
          <Bell className="h-7 w-7 text-red-600 shrink-0" />
          <div className="flex-1">
            <p className="text-base font-bold text-red-800">Formulário DS-160 preenchido!</p>
            <p className="text-sm text-red-600">Enviado em {formatDate(f.submitted_at)}</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => openDuties(f)} className="gap-1.5 border-red-300 text-red-700 hover:bg-red-100">
            <Briefcase className="h-4 w-4" />
            Adicionar Duties
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleFillClient(f)} disabled={fillingClientId === f.id} className="gap-1.5 border-red-300 text-red-700 hover:bg-red-100">
            {fillingClientId === f.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Adicionar dados ao cadastro
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setDismissed(prev => new Set(prev).add(f.id))} className="text-red-600 font-medium">
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
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => window.open(`/ds160/${form.token}`, '_blank')}>
                    <ExternalLink className="h-3 w-3" />Abrir
                  </Button>
                  {form.status === 'submitted' && (
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleGeneratePdf(form)} disabled={generatingPdf}>
                      {generatingPdf ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />}
                      Gerar PDF
                    </Button>
                  )}
                  {isMaster && form.status !== 'deleted' && (
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-destructive hover:bg-destructive/10 border-destructive/30" onClick={() => setDeleteFormId(form.id)}>
                      <Trash2 className="h-3 w-3" />Excluir
                    </Button>
                  )}
                </div>

                {form.status === 'submitted' && (() => {
                  const rm = robotMeta(form.robot_status);
                  return (
                    <div className="mt-2 rounded-lg border bg-muted/30 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                          <Bot className="h-4 w-4" /> DS-160 Robô
                        </span>
                        <span className={`flex items-center gap-1.5 text-xs font-medium ${rm.text}`}>
                          <span className={`h-2 w-2 rounded-full ${rm.dot}`} /> {rm.label}
                        </span>
                      </div>
                      {form.robot_machine && (
                        <p className="text-xs text-muted-foreground">Máquina: {form.robot_machine}</p>
                      )}
                      {form.robot_status === 'concluido' && form.robot_application_id && (
                        <div className="rounded-md bg-emerald-50 border border-emerald-200 p-2">
                          <p className="text-xs text-emerald-700">Application ID</p>
                          <p className="font-mono font-bold text-emerald-900 text-base tracking-wider">{form.robot_application_id}</p>
                          {form.robot_filled_at && (
                            <p className="text-xs text-emerald-600 mt-0.5">Preenchido em {formatDate(form.robot_filled_at)}</p>
                          )}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-1.5">
                        {(!form.robot_status || form.robot_status === 'pendente' || form.robot_status === 'erro') && (
                          <Button size="sm" className="h-7 text-xs gap-1" onClick={() => sendToRobot(form)} disabled={robotSending === form.id}>
                            {robotSending === form.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Bot className="h-3 w-3" />}
                            Enviar para DS-160
                          </Button>
                        )}
                        {form.robot_status === 'em_andamento' && (
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => sendToRobot(form)} disabled={robotSending === form.id}>
                            {robotSending === form.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                            Reenviar
                          </Button>
                        )}
                        {form.robot_status === 'concluido' && (
                          <Button asChild size="sm" variant="outline" className="h-7 text-xs gap-1">
                            <a href="https://ceac.state.gov/CEACStatTracker/Status.aspx" target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3 w-3" /> Verificar no CEAC
                            </a>
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => setJsonForm(form)}>
                          <Code2 className="h-3 w-3" /> Ver JSON
                        </Button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      )}
      <AlertDialog open={!!deleteFormId} onOpenChange={(o) => !o && setDeleteFormId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir formulário DS-160?</AlertDialogTitle>
            <AlertDialogDescription>
              O link será desativado e o cliente verá uma mensagem de que o formulário foi excluído. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteForm} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!dutiesFormId} onOpenChange={(o) => !o && setDutiesFormId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" /> Adicionar Duties
            </DialogTitle>
            <DialogDescription>
              Substitua a descrição das funções enviada pelo cliente. Os textos são salvos automaticamente ao sair do campo (máx. 250 caracteres cada).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {([
              { key: 'atual', enabledKey: 'atualEnabled', label: 'Ocupação Atual' },
              { key: 'ant1', enabledKey: 'ant1Enabled', label: 'Anterior 1' },
              { key: 'ant2', enabledKey: 'ant2Enabled', label: 'Anterior 2' },
            ] as const).map(({ key, enabledKey, label }) => {
              const enabled = duties[enabledKey] as boolean;
              const text = duties[key] as string;
              const available = dutiesAvail[key as keyof DutiesAvail];
              return (
                <div key={key} className={`border rounded-lg p-3 space-y-2 ${!available ? 'opacity-50 bg-muted/40' : ''}`}>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`duty-${key}`}
                      checked={enabled}
                      disabled={!available}
                      onCheckedChange={(c) => {
                        if (!available) return;
                        const next = { ...duties, [enabledKey]: !!c };
                        setDuties(next);
                        persistDuties(next);
                      }}
                    />
                    <Label htmlFor={`duty-${key}`} className={`font-medium ${available ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                      {label}
                      {!available && <span className="ml-2 text-xs font-normal text-muted-foreground">(não preenchida)</span>}
                    </Label>
                  </div>
                  {enabled && (
                    <div>
                      <Textarea
                        rows={3}
                        maxLength={250}
                        value={text}
                        placeholder="Descreva as funções..."
                        onChange={(e) => setDuties({ ...duties, [key]: e.target.value })}
                        onBlur={() => persistDuties(duties)}
                      />
                      <p className="text-xs text-muted-foreground text-right mt-1">{text.length}/250</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDutiesFormId(null)}>Fechar</Button>
            <Button onClick={handleDutiesToPdf} disabled={dutiesPdfLoading} className="gap-1.5">
              {dutiesPdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              Adicionar no PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
