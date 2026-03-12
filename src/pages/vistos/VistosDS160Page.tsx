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
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

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

export default function VistosDS160Page() {
  const { activeCompany } = useCompany();
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [groups, setGroups] = useState<GroupForm[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendEmail, setSendEmail] = useState('');
  const [sendName, setSendName] = useState('');
  const [deleteGroupId, setDeleteGroupId] = useState<string | null>(null);

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
    const { data: groupsData } = await supabase
      .from('ds160_group_forms')
      .select('*')
      .eq('empresa_id', activeCompany!.id)
      .order('created_at', { ascending: false });

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
    const selectedClients = clients.filter(c => selected.has(c.id));
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
    toast.success('Link gerado e copiado para a área de transferência!');

    setSending(false);
    setShowSendModal(false);
    setSelected(new Set());
    fetchGroups();
  };

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(`${baseUrl}/ds160/group/${token}`);
    toast.success('Link copiado!');
  };

  const resendCopyLink = (group: GroupForm) => {
    const formLink = `${baseUrl}/ds160/group/${group.token}`;
    navigator.clipboard.writeText(formLink);
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
              DS-160 em Grupo
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Selecione clientes para enviar um link de preenchimento múltiplo
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
                Enviar Link ({selected.size})
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
            ) : groups.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum link de grupo enviado ainda.
              </p>
            ) : (
              <div className="space-y-4">
                {groups.filter(g => g.status !== 'deleted').map(group => {
                  const st = statusLabel(group.status);
                  const allSubmitted = group.applicants.length > 0 && group.applicants.every(a => a.status === 'submitted');
                  return (
                    <div key={group.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
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
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => resendCopyLink(group)}>
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
            )}
          </CardContent>
        </Card>
      </div>

      {/* Send Modal */}
      <Dialog open={showSendModal} onOpenChange={setShowSendModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerar Link DS-160 em Grupo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {selected.size} cliente(s) selecionado(s). Um link será gerado e copiado para você enviar ao responsável pelo preenchimento.
            </p>
            <div>
              <Label>Nome do responsável</Label>
              <Input value={sendName} onChange={e => setSendName(e.target.value)} placeholder="Nome de quem vai preencher" />
            </div>
            <div className="border rounded-lg p-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">Aplicantes selecionados:</p>
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
    </AppLayout>
  );
}
