import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { format } from 'date-fns';

const suggestions = ['Passagens Aéreas', 'Hospedagens', 'Cruzeiros', 'Seguro Viagem', 'Marketing', 'Despesas Administrativas', 'Comissões', 'Taxas Operacionais'];

interface CostCenter {
  id: string;
  name: string;
  description: string;
  status: string;
  created_at: string;
}

export default function CostCentersPage() {
  const [items, setItems] = useState<CostCenter[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('active');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetch_ = async () => {
    const { data } = await supabase.from('cost_centers').select('*').order('name');
    if (data) setItems(data as CostCenter[]);
  };
  useEffect(() => { fetch_(); }, []);

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Nome é obrigatório'); return; }
    const payload = { name, description, status };
    if (editingId) {
      await supabase.from('cost_centers').update(payload).eq('id', editingId);
      toast.success('Centro de custo atualizado!');
    } else {
      await supabase.from('cost_centers').insert(payload);
      toast.success('Centro de custo cadastrado!');
    }
    setDialogOpen(false);
    setEditingId(null);
    setName(''); setDescription(''); setStatus('active');
    fetch_();
  };

  const handleEdit = (c: CostCenter) => {
    setEditingId(c.id);
    setName(c.name);
    setDescription(c.description);
    setStatus(c.status);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from('cost_centers').delete().eq('id', deleteId);
    setDeleteId(null);
    toast.success('Centro de custo excluído');
    fetch_();
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Centros de Custo</h1>
          <Button onClick={() => { setEditingId(null); setName(''); setDescription(''); setStatus('active'); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />Novo Centro de Custo
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data Criação</TableHead>
                  <TableHead className="w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum centro de custo cadastrado</TableCell></TableRow>
                ) : items.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.description || '-'}</TableCell>
                    <TableCell><Badge variant={c.status === 'active' ? 'default' : 'secondary'}>{c.status === 'active' ? 'Ativo' : 'Inativo'}</Badge></TableCell>
                    <TableCell>{format(new Date(c.created_at), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => handleEdit(c)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => setDeleteId(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{editingId ? 'Editar Centro de Custo' : 'Novo Centro de Custo'}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome *</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Passagens Aéreas" />
                {!editingId && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {suggestions.map(s => (
                      <Button key={s} size="sm" variant="outline" className="text-xs h-7" onClick={() => setName(s)}>{s}</Button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <Label>Descrição</Label>
                <Input value={description} onChange={e => setDescription(e.target.value)} />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleSave}>{editingId ? 'Atualizar' : 'Cadastrar'}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir centro de custo?</AlertDialogTitle>
              <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
