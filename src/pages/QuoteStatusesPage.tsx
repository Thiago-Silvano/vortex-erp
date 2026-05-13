import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TableLoadingRow } from '@/components/TableLoadingRow';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Pencil, Trash2, Plus, RotateCcw } from 'lucide-react';

interface KanbanColumn {
  id: string;
  empresa_id: string | null;
  name: string;
  status_key: string;
  color: string;
  sort_order: number;
  is_default: boolean;
}

const DEFAULT_STATUSES = [
  { name: 'Nova Cotação',     status_key: 'em_aberto',        color: '#eab308', sort_order: 0 },
  { name: 'Em Atendimento',   status_key: 'contatando',       color: '#3b82f6', sort_order: 1 },
  { name: 'Proposta Enviada', status_key: 'proposta_enviada', color: '#f97316', sort_order: 2 },
  { name: 'Negociação',       status_key: 'negociacao',       color: '#a855f7', sort_order: 3 },
  { name: 'Emitida',          status_key: 'emitido',          color: '#22c55e', sort_order: 4 },
  { name: 'Perdida',          status_key: 'perdido',          color: '#ef4444', sort_order: 5 },
];

const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

export default function QuoteStatusesPage() {
  const { toast } = useToast();
  const { activeCompany } = useCompany();
  const [rows, setRows] = useState<KanbanColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(true);
  const [editing, setEditing] = useState<KanbanColumn | null>(null);
  const [form, setForm] = useState({ name: '', status_key: '', color: '#3b82f6', sort_order: 0 });
  const [saving, setSaving] = useState(false);

  const fetchRows = async () => {
    setTableLoading(true);
    if (!activeCompany?.id) return;
    setTableLoading(true);
    const { data } = await supabase.from('kanban_columns').select('*').eq('empresa_id', activeCompany.id).order('sort_order') as any;
    const list = (data as KanbanColumn[]) || [];
    if (list.length === 0) {
      // Auto-seed defaults na primeira carga
      const toInsert = DEFAULT_STATUSES.map(d => ({ ...d, empresa_id: activeCompany.id, is_default: true }));
      const { data: inserted } = await supabase.from('kanban_columns').insert(toInsert as any).select() as any;
      setRows(((inserted as KanbanColumn[]) || []).sort((a, b) => a.sort_order - b.sort_order));
    } else {
      setRows(list);
    }
    setTableLoading(false);
  };

  useEffect(() => { fetchRows(); }, [activeCompany?.id]);

  const seedDefaults = async () => {
    if (!activeCompany?.id) return;
    const existingKeys = new Set(rows.map(r => r.status_key));
    const toInsert = DEFAULT_STATUSES
      .filter(d => !existingKeys.has(d.status_key))
      .map(d => ({ ...d, empresa_id: activeCompany.id, is_default: true }));
    if (toInsert.length === 0) { toast({ title: 'Todos os status padrão já estão cadastrados.' }); return; }
    const { error } = await supabase.from('kanban_columns').insert(toInsert as any);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    toast({ title: `${toInsert.length} status padrão adicionados!` });
    fetchRows();
  };

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', status_key: '', color: '#3b82f6', sort_order: rows.length });
  };
  const openEdit = (r: KanbanColumn) => {
    setEditing(r);
    setForm({ name: r.name, status_key: r.status_key, color: r.color, sort_order: r.sort_order });
  };

  const save = async () => {
    if (!activeCompany?.id) return;
    if (!form.name.trim()) { toast({ title: 'Informe o nome', variant: 'destructive' }); return; }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      status_key: (form.status_key || slug(form.name)).trim(),
      color: form.color,
      sort_order: Number(form.sort_order) || 0,
      empresa_id: activeCompany.id,
    };
    const { error } = editing
      ? await supabase.from('kanban_columns').update(payload as any).eq('id', editing.id)
      : await supabase.from('kanban_columns').insert(payload as any);
    setSaving(false);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    toast({ title: editing ? 'Status atualizado!' : 'Status criado!' });
    setEditing(null);
    setForm({ name: '', status_key: '', color: '#3b82f6', sort_order: 0 });
    setDialogOpen(false);
    fetchRows();
  };

  const remove = async (r: KanbanColumn) => {
    if (!confirm(`Excluir o status "${r.name}"?`)) return;
    const { error } = await supabase.from('kanban_columns').delete().eq('id', r.id);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Status excluído!' });
    fetchRows();
  };

  const [dialogOpen, setDialogOpen] = useState(false);
  useEffect(() => { if (editing || dialogOpen) setDialogOpen(true); }, [editing]);

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-2xl font-bold text-foreground">Status de Cotações</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={seedDefaults}>
              <RotateCcw className="h-4 w-4" /> Cadastrar status padrão
            </Button>
            <Button size="sm" onClick={() => { openNew(); setDialogOpen(true); }}>
              <Plus className="h-4 w-4" /> Novo status
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Status cadastrados ({rows.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {tableLoading ? (
              <p className="text-muted-foreground text-center py-8">Carregando...</p>
            ) : rows.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Nenhum status cadastrado. Clique em "Cadastrar status padrão" para começar.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ordem</TableHead>
                    <TableHead>Cor</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Chave</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(r => (
                    <TableRow key={r.id}>
                      <TableCell>{r.sort_order}</TableCell>
                      <TableCell>
                        <span className="inline-block w-5 h-5 rounded" style={{ background: r.color }} />
                      </TableCell>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.status_key}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => { openEdit(r); setDialogOpen(true); }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => remove(r)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditing(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Editar Status' : 'Novo Status'}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <Label>Nome</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value, status_key: f.status_key || slug(e.target.value) }))} placeholder="Ex.: Em Atendimento" />
            </div>
            <div>
              <Label>Chave (status_key)</Label>
              <Input value={form.status_key} onChange={e => setForm(f => ({ ...f, status_key: e.target.value }))} placeholder="ex.: contatando" />
              <p className="text-xs text-muted-foreground mt-1">Identificador único interno. Gerado automaticamente do nome.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Cor</Label>
                <Input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="h-10 p-1" />
              </div>
              <div>
                <Label>Ordem</Label>
                <Input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} />
              </div>
            </div>
            <Button onClick={save} disabled={saving} className="w-full">
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
