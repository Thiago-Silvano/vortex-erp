import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, SortableTableHead } from '@/components/ui/table';
import { useTableSort } from '@/hooks/useTableSort';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface ServiceCatalog {
  id: string;
  name: string;
  cost_center_id: string | null;
  category: string;
  description: string;
  status: string;
  created_at: string;
}

interface CostCenter {
  id: string;
  name: string;
  description: string | null;
}

export default function ServicesCatalogPage() {
  const { activeCompany } = useCompany();
  const [items, setItems] = useState<ServiceCatalog[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [costCenterId, setCostCenterId] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('active');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchItems = async () => {
    let query = (supabase.from('services_catalog') as any).select('*').order('name');
    if (activeCompany?.id) query = query.eq('empresa_id', activeCompany.id);
    const { data } = await query;
    if (data) setItems(data);
  };

  const fetchCostCenters = async () => {
    let query = supabase.from('cost_centers').select('id, name, description').eq('status', 'active').order('name');
    if (activeCompany?.id) query = query.eq('empresa_id', activeCompany.id);
    const { data } = await query;
    // Also fetch those without empresa_id
    const { data: globalData } = await supabase.from('cost_centers').select('id, name, description').eq('status', 'active').is('empresa_id', null).order('name');
    const all = [...(data || []), ...(globalData || [])];
    // deduplicate by id
    const unique = Array.from(new Map(all.map(c => [c.id, c])).values());
    setCostCenters(unique as CostCenter[]);
  };

  useEffect(() => { fetchItems(); fetchCostCenters(); }, [activeCompany?.id]);

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Nome é obrigatório'); return; }
    const payload: any = { name, cost_center_id: costCenterId || null, category, description, status };
    if (editingId) {
      await (supabase.from('services_catalog') as any).update(payload).eq('id', editingId);
      toast.success('Serviço atualizado!');
    } else {
      payload.empresa_id = activeCompany?.id || null;
      await (supabase.from('services_catalog') as any).insert(payload);
      toast.success('Serviço cadastrado!');
    }
    setDialogOpen(false);
    setEditingId(null);
    setName(''); setCostCenterId(''); setCategory(''); setDescription(''); setStatus('active');
    fetchItems();
  };

  const handleEdit = (s: ServiceCatalog) => {
    setEditingId(s.id);
    setName(s.name);
    setCostCenterId(s.cost_center_id || '');
    setCategory(s.category || '');
    setDescription(s.description || '');
    setStatus(s.status);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await (supabase.from('services_catalog') as any).delete().eq('id', deleteId);
    setDeleteId(null);
    toast.success('Serviço excluído');
    fetchItems();
  };

  const getCostCenterName = (id: string | null) => {
    if (!id) return '-';
    return costCenters.find(c => c.id === id)?.name || '-';
  };

  // Group cost centers by description (category)
  const groupedCostCenters = costCenters.reduce((acc, cc) => {
    const group = cc.description || 'Outros';
    if (!acc[group]) acc[group] = [];
    acc[group].push(cc);
    return acc;
  }, {} as Record<string, CostCenter[]>);

  const { sortedData: sortedItems, sortState, requestSort } = useTableSort(items, {
    name: (s) => s.name,
    category: (s) => s.category,
    cost_center: (s) => getCostCenterName(s.cost_center_id),
    status: (s) => s.status,
  }, { initialKey: 'name', initialDirection: 'asc' });

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Serviços</h1>
          <Button onClick={() => { setEditingId(null); setName(''); setCostCenterId(''); setCategory(''); setDescription(''); setStatus('active'); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />Novo Serviço
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead sortKey="name" sortState={sortState} onSort={requestSort}>Nome do Serviço</SortableTableHead>
                  <SortableTableHead sortKey="category" sortState={sortState} onSort={requestSort}>Categoria</SortableTableHead>
                  <SortableTableHead sortKey="cost_center" sortState={sortState} onSort={requestSort}>Centro de Custo</SortableTableHead>
                  <SortableTableHead sortKey="status" sortState={sortState} onSort={requestSort}>Status</SortableTableHead>
                  <TableHead className="w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedItems.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum serviço cadastrado</TableCell></TableRow>
                ) : sortedItems.map(s => (
                  <TableRow key={s.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleEdit(s)}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{s.category || '-'}</TableCell>
                    <TableCell>{getCostCenterName(s.cost_center_id)}</TableCell>
                    <TableCell><Badge variant={s.status === 'active' ? 'default' : 'secondary'}>{s.status === 'active' ? 'Ativo' : 'Inativo'}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                        <Button size="icon" variant="ghost" onClick={() => handleEdit(s)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => setDeleteId(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
            <DialogHeader><DialogTitle>{editingId ? 'Editar Serviço' : 'Novo Serviço'}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome do Serviço *</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Emissão de passagem aérea" />
               </div>
              <div>
                <Label>Categoria (opcional)</Label>
                <Input value={category} onChange={e => setCategory(e.target.value)} placeholder="Ex: Transporte, Hospedagem, Seguros..." />
              </div>
              <div>
                <Label>Descrição (opcional)</Label>
                <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Descrição do serviço..." />
              </div>
              <div>
                <Label>Centro de Custo</Label>
                <Select value={costCenterId} onValueChange={setCostCenterId}>
                  <SelectTrigger><SelectValue placeholder="Selecione um centro de custo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {Object.entries(groupedCostCenters).map(([group, centers]) => (
                      centers.map(cc => (
                        <SelectItem key={cc.id} value={cc.id}>
                          <span className="text-xs text-muted-foreground">[{group}]</span> {cc.name}
                        </SelectItem>
                      ))
                    ))}
                  </SelectContent>
                </Select>
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
              <AlertDialogTitle>Excluir serviço?</AlertDialogTitle>
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
