import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Search, Loader2, Users, FileText, ExternalLink, Copy, Link2, Trash2, Bell } from 'lucide-react';
import { Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import DS160EditDialog from '@/components/ds160/DS160EditDialog';

interface Client {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  cpf: string;
}

interface GroupForm {
  id: string;
  token: string;
  status: string;
  sent_at: string | null;
  sent_by: string;
  sent_to_email: string;
  sent_to_name: string;
  created_at: string;
  updated_at: string;
  applicants: { client_id: string; client_name: string; status: string }[];
}

interface IndividualForm {
  id: string;
  token: string;
  status: string;
  sent_at: string | null;
  sent_by: string;
  created_at: string;
  client_name: string;
  form_data: Record<string, any>;
}

type LinkEntry =
  | ({ kind: 'group' } & GroupForm)
  | ({ kind: 'individual' } & IndividualForm);

export default function VistosDS160Page() {
  const { activeCompany } = useCompany();
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [groups, setGroups] = useState<GroupForm[]>([]);
  const [individuals, setIndividuals] = useState<IndividualForm[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendEmail, setSendEmail] = useState('');
  const [sendName, setSendName] = useState('');
  const [deleteGroupId, setDeleteGroupId] = useState<string | null>(null);
  const [deleteIndividualId, setDeleteIndividualId] = useState<string | null>(null);
  const [editIndividual, setEditIndividual] = useState<IndividualForm | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const baseUrl = window.location.origin;

  useEffect(() => {
    if (activeCompany) {
      fetchClients();
      fetchGroups();
    }
  }, [activeCompany]);

  const fetchClients = async () => {
    const { data } = await supabase
      .from('clients')
      .select('id, full_name, email, phone, cpf')
      .eq('empresa_id', activeCompany!.id)
      .order('full_name');
    if (data) setClients(data);
    setLoading(false);
  };

  const fetchGroups = async () => {
    setLoadingGroups(true);
    const [{ data: groupsData }, { data: indivData }] = await Promise.all([
      supabase
        .from('ds160_group_forms')
        .select('*')
        .eq('empresa_id', activeCompany!.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('ds160_forms')
        .select('id, token, status, sent_at, sent_by, created_at, form_data, clients(full_name)')
        .eq('empresa_id', activeCompany!.id)
        .is('group_id', null)
        .order('created_at', { ascending: false }),
    ]);

    if (groupsData) {
      const enriched: GroupForm[] = [];
      for (const g of groupsData as any[]) {
        const { data: forms } = await supabase
          .from('ds160_forms')
          .select('client_id, status, clients(full_name)')
          .eq('group_id', g.id);
        enriched.push({
          ...g,
          applicants: (forms || []).map((f: any) => ({
            client_id: f.client_id,
            client_name: f.clients?.full_name || '',
            status: f.status,
          })),
        });
      }
      setGroups(enriched);
    }

    if (indivData) {
      setIndividuals(
        (indivData as any[]).map((f) => ({
          id: f.id,
          token: f.token,
          status: f.status,
          sent_at: f.sent_at,
          sent_by: f.sent_by,
          created_at: f.created_at,
          client_name: f.clients?.full_name || 'Cliente',
          form_data: f.form_data || {},
        }))
      );
    }
    setLoadingGroups(false);
  };

  const toggleClient = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filteredClients.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredClients.map(c => c.id)));
    }
  };

  const openSendModal = () => {
    if (selected.size === 0) {
      toast.error('Selecione pelo menos um cliente');
      return;
    }
    const firstClient = clients.find(c => selected.has(c.id));
    setSendName(firstClient?.full_name || '');
    setShowSendModal(true);
  };

  const handleGenerateGroup = async () => {
    setSending(true);

    const { data: user } = await supabase.auth.getUser();

    const selectedClients = clients.filter(c => selected.has(c.id));

    // Individual link (single applicant) — no group
    if (selectedClients.length === 1) {
      const c = selectedClients[0];
      const { data: newForm, error } = await supabase.from('ds160_forms').insert({
        client_id: c.id,
        empresa_id: activeCompany!.id,
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
      toast.success('Link individual gerado e copiado!');
      setSending(false);
      setShowSendModal(false);
      setSelected(new Set());
      fetchGroups();
      return;
    }

    // Create group
    const { data: group, error: gErr } = await supabase
      .from('ds160_group_forms')
      .insert({
        empresa_id: activeCompany!.id,
        status: 'sent',
        sent_at: new Date().toISOString(),
        sent_by: user.user?.email || '',
        sent_to_name: sendName,
      } as any)
      .select()
      .single();

    if (gErr || !group) {
      toast.error('Erro ao criar grupo');
      setSending(false);
      return;
    }

    // Create individual ds160_forms for each selected client
    const formsToInsert = selectedClients.map(c => ({
      client_id: c.id,
      empresa_id: activeCompany!.id,
      status: 'sent',
      sent_at: new Date().toISOString(),
      sent_by: user.user?.email || '',
      group_id: (group as any).id,
    }));

    const { error: fErr } = await supabase.from('ds160_forms').insert(formsToInsert as any);
    if (fErr) {
      toast.error('Erro ao criar formulários individuais');
      setSending(false);
      return;
    }

    const formLink = `${baseUrl}/ds160/group/${(group as any).token}`;
    navigator.clipboard.writeText(formLink);
    toast.success('Link em grupo gerado e copiado!');

    setSending(false);
    setShowSendModal(false);
    setSelected(new Set());
    fetchGroups();
  };

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(`${baseUrl}/ds160/group/${token}`);
    toast.success('Link copiado!');
  };

  const handleDeleteGroup = async () => {
    if (!deleteGroupId) return;
    // Mark all forms in group as deleted
    await supabase.from('ds160_forms').update({ status: 'deleted' } as any).eq('group_id', deleteGroupId);
    await supabase.from('ds160_group_forms').update({ status: 'deleted' } as any).eq('id', deleteGroupId);
    toast.success('Grupo excluído');
    setDeleteGroupId(null);
    fetchGroups();
  };

  const handleDeleteIndividual = async () => {
    if (!deleteIndividualId) return;
    await supabase.from('ds160_forms').update({ status: 'deleted' } as any).eq('id', deleteIndividualId);
    toast.success('Link excluído');
    setDeleteIndividualId(null);
    fetchGroups();
  };

  const formatDate = (d: string | null) =>
    d ? format(new Date(d), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '—';

  const statusLabel = (s: string) => {
    switch (s) {
      case 'sent': return { label: 'Enviado', variant: 'outline' as const };
      case 'in_progress': return { label: 'Em preenchimento', variant: 'default' as const };
      case 'submitted': return { label: 'Concluído', variant: 'default' as const };
      case 'deleted': return { label: 'Excluído', variant: 'destructive' as const };
      default: return { label: s, variant: 'secondary' as const };
    }
  };

  const filteredClients = clients.filter(c =>
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    c.cpf.includes(search) ||
    (c.email || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <FileText className="h-6 w-6" />
              DS-160
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gere e administre links de preenchimento — selecione 1 cliente para um link individual ou vários para um link em grupo
            </p>
          </div>
        </div>

        {/* Client selection */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                Selecionar Clientes
              </CardTitle>
              <Button onClick={openSendModal} disabled={selected.size === 0} className="gap-1.5">
                <Link2 className="h-4 w-4" />
                Gerar Link ({selected.size})
              </Button>
            </div>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, CPF ou email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted/50 px-4 py-2 flex items-center gap-3 border-b">
                  <Checkbox
                    checked={filteredClients.length > 0 && selected.size === filteredClients.length}
                    onCheckedChange={toggleAll}
                  />
                  <span className="text-xs font-medium text-muted-foreground">
                    {selected.size > 0 ? `${selected.size} selecionado(s)` : 'Selecionar todos'}
                  </span>
                </div>
                <div className="max-h-[400px] overflow-y-auto divide-y">
                  {filteredClients.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                      Nenhum cliente encontrado
                    </div>
                  ) : (
                    filteredClients.map(client => (
                      <label
                        key={client.id}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 cursor-pointer transition-colors"
                      >
                        <Checkbox
                          checked={selected.has(client.id)}
                          onCheckedChange={() => toggleClient(client.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{client.full_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {client.email || 'Sem email'} • {client.cpf || 'Sem CPF'}
                          </p>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Existing groups */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Links Enviados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingGroups ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (() => {
              const visibleGroups = groups.filter(g => g.status !== 'deleted');
              const visibleIndividuals = individuals.filter(f => f.status !== 'deleted');
              if (visibleGroups.length === 0 && visibleIndividuals.length === 0) {
                return (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhum link enviado ainda.
                  </p>
                );
              }
              const entries: LinkEntry[] = [
                ...visibleGroups.map(g => ({ kind: 'group' as const, ...g })),
                ...visibleIndividuals.map(f => ({ kind: 'individual' as const, ...f })),
              ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
              return (
              <div className="space-y-4">
                {entries.map(entry => {
                  if (entry.kind === 'individual') {
                    const st = statusLabel(entry.status);
                    return (
                      <div key={`i-${entry.id}`} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">Individual</Badge>
                            <Badge
                              variant={entry.status === 'submitted' ? 'default' : st.variant}
                              className={entry.status === 'submitted' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : ''}
                            >
                              {st.label}
                            </Badge>
                            <span className="text-sm font-medium">{entry.client_name}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(entry.sent_at)}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => { navigator.clipboard.writeText(`${baseUrl}/ds160/${entry.token}`); toast.success('Link copiado!'); }}>
                            <Copy className="h-3 w-3" /> Copiar Link
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => window.open(`/ds160/${entry.token}`, '_blank')}>
                            <ExternalLink className="h-3 w-3" /> Abrir
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setEditIndividual(entry)}>
                            <Pencil className="h-3 w-3" /> Editar respostas
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1 text-destructive hover:bg-destructive/10 border-destructive/30"
                            onClick={() => setDeleteIndividualId(entry.id)}
                          >
                            <Trash2 className="h-3 w-3" /> Excluir
                          </Button>
                        </div>
                      </div>
                    );
                  }
                  const group = entry;
                  const st = statusLabel(group.status);
                  const allSubmitted = group.applicants.length > 0 && group.applicants.every(a => a.status === 'submitted');
                  return (
                    <div key={group.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <Badge variant="secondary" className="mr-2">Grupo</Badge>
                          <Badge
                            variant={allSubmitted ? 'default' : st.variant}
                            className={allSubmitted ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : ''}
                          >
                            {allSubmitted ? 'Todos preenchidos' : st.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground ml-2">
                            Responsável: {group.sent_to_name}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(group.sent_at)}
                        </span>
                      </div>

                      {/* Applicants status */}
                      <div className="flex flex-wrap gap-2">
                        {group.applicants.map((app, idx) => (
                          <Badge
                            key={idx}
                            variant="outline"
                            className={
                              app.status === 'submitted'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : app.status === 'in_progress'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : ''
                            }
                          >
                            {app.client_name}: {
                              app.status === 'submitted' ? '✓ Preenchido' :
                              app.status === 'in_progress' ? '⏳ Em andamento' :
                              '⬜ Pendente'
                            }
                          </Badge>
                        ))}
                      </div>

                      {/* Notification if all submitted */}
                      {allSubmitted && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center gap-2">
                          <Bell className="h-4 w-4 text-emerald-600" />
                          <span className="text-sm text-emerald-800 font-medium">
                            Todos os aplicantes preencheram! Os formulários foram salvos individualmente.
                          </span>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-1.5">
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => copyLink(group.token)}>
                          <Copy className="h-3 w-3" /> Copiar Link
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => window.open(`/ds160/group/${group.token}`, '_blank')}>
                          <ExternalLink className="h-3 w-3" /> Abrir
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1 text-destructive hover:bg-destructive/10 border-destructive/30"
                          onClick={() => setDeleteGroupId(group.id)}
                        >
                          <Trash2 className="h-3 w-3" /> Excluir
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
              );
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Send Modal */}
      <Dialog open={showSendModal} onOpenChange={setShowSendModal}>
      {editIndividual && (
        <DS160EditDialog
          formId={editIndividual.id}
          initialData={editIndividual.form_data || {}}
          open={!!editIndividual}
          onOpenChange={(o) => !o && setEditIndividual(null)}
          onSaved={(fd) => {
            setIndividuals(prev => prev.map(f => f.id === editIndividual.id ? { ...f, form_data: fd } : f));
            setEditIndividual(null);
          }}
        />
      )}
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selected.size === 1 ? 'Gerar Link DS-160 Individual' : 'Gerar Link DS-160 em Grupo'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {selected.size === 1
                ? 'Um link individual será gerado e copiado para você enviar ao cliente.'
                : `${selected.size} cliente(s) selecionado(s). Um link em grupo será gerado e copiado para você enviar ao responsável pelo preenchimento.`}
            </p>
            {selected.size > 1 && (
              <div>
                <Label>Nome do responsável</Label>
                <Input value={sendName} onChange={e => setSendName(e.target.value)} placeholder="Nome de quem vai preencher" />
              </div>
            )}
            <div className="border rounded-lg p-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">{selected.size === 1 ? 'Aplicante selecionado:' : 'Aplicantes selecionados:'}</p>
              <div className="flex flex-wrap gap-1.5">
                {clients.filter(c => selected.has(c.id)).map(c => (
                  <Badge key={c.id} variant="outline">{c.full_name}</Badge>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSendModal(false)}>Cancelar</Button>
            <Button onClick={handleGenerateGroup} disabled={sending} className="gap-1.5">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
              Gerar e Copiar Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteGroupId} onOpenChange={o => !o && setDeleteGroupId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir grupo DS-160?</AlertDialogTitle>
            <AlertDialogDescription>
              Todos os formulários deste grupo serão desativados. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteGroup} className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete individual confirmation */}
      <AlertDialog open={!!deleteIndividualId} onOpenChange={o => !o && setDeleteIndividualId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir link DS-160?</AlertDialogTitle>
            <AlertDialogDescription>
              Este formulário será desativado. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteIndividual} className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
