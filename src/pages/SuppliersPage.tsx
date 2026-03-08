import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import CepLookup from '@/components/CepLookup';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface Supplier {
  id: string;
  name: string;
  cnpj: string;
  email: string;
  phone: string;
  cep: string;
  address: string;
  address_number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  country: string;
  sales_rep_name: string;
  sales_rep_phone: string;
  executive_name: string;
  executive_phone: string;
}

const emptySupplier = (): Omit<Supplier, 'id'> => ({
  name: '', cnpj: '', email: '', phone: '',
  cep: '', address: '', address_number: '', complement: '',
  neighborhood: '', city: '', state: '', country: 'Brasil',
  sales_rep_name: '', sales_rep_phone: '', executive_name: '', executive_phone: '',
});

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Supplier, 'id'>>(emptySupplier());
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchSuppliers = async () => {
    const { data } = await supabase.from('suppliers').select('*').order('name');
    if (data) setSuppliers(data as Supplier[]);
  };

  useEffect(() => { fetchSuppliers(); }, []);

  const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const filtered = suppliers.filter(s =>
    normalize(s.name).includes(normalize(search)) ||
    s.cnpj.includes(search) ||
    normalize(s.email).includes(normalize(search))
  );

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Nome é obrigatório'); return; }

    if (editingId) {
      const { error } = await supabase.from('suppliers').update(form).eq('id', editingId);
      if (error) { toast.error('Erro ao atualizar'); return; }
      toast.success('Fornecedor atualizado!');
    } else {
      const { error } = await supabase.from('suppliers').insert(form);
      if (error) { toast.error('Erro ao cadastrar'); return; }
      toast.success('Fornecedor cadastrado!');
    }
    setDialogOpen(false);
    setEditingId(null);
    setForm(emptySupplier());
    fetchSuppliers();
  };

  const handleEdit = (s: Supplier) => {
    setEditingId(s.id);
    const { id, ...rest } = s;
    setForm(rest);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from('suppliers').delete().eq('id', deleteId);
    setDeleteId(null);
    toast.success('Fornecedor excluído');
    fetchSuppliers();
  };

  const openNew = () => {
    setEditingId(null);
    setForm(emptySupplier());
    setDialogOpen(true);
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Fornecedores</h1>
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Cadastrar Fornecedor</Button>
        </div>

        <div className="flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar por nome, CNPJ ou email..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Cidade</TableHead>
                  <TableHead className="w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum fornecedor encontrado</TableCell></TableRow>
                ) : filtered.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{s.cnpj}</TableCell>
                    <TableCell>{s.email}</TableCell>
                    <TableCell>{s.phone}</TableCell>
                    <TableCell>{s.city}{s.state ? ` - ${s.state}` : ''}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
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
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Editar Fornecedor' : 'Cadastrar Fornecedor'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label>Nome do fornecedor *</Label>
                  <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div>
                  <Label>CNPJ</Label>
                  <Input value={form.cnpj} onChange={e => setForm(p => ({ ...p, cnpj: e.target.value }))} placeholder="00.000.000/0000-00" />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
                </div>
              </div>

              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">Endereço</CardTitle></CardHeader>
                <CardContent>
                  <CepLookup
                    data={{
                      cep: form.cep, address: form.address, addressNumber: form.address_number,
                      complement: form.complement, neighborhood: form.neighborhood,
                      city: form.city, state: form.state, country: form.country,
                    }}
                    onChange={d => setForm(p => ({
                      ...p,
                      ...(d.cep !== undefined && { cep: d.cep }),
                      ...(d.address !== undefined && { address: d.address }),
                      ...(d.addressNumber !== undefined && { address_number: d.addressNumber }),
                      ...(d.complement !== undefined && { complement: d.complement }),
                      ...(d.neighborhood !== undefined && { neighborhood: d.neighborhood }),
                      ...(d.city !== undefined && { city: d.city }),
                      ...(d.state !== undefined && { state: d.state }),
                      ...(d.country !== undefined && { country: d.country }),
                    }))}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">Contatos Comerciais</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Representante comercial</Label>
                      <Input value={form.sales_rep_name} onChange={e => setForm(p => ({ ...p, sales_rep_name: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Telefone do representante</Label>
                      <Input value={form.sales_rep_phone} onChange={e => setForm(p => ({ ...p, sales_rep_phone: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Vendedor executivo</Label>
                      <Input value={form.executive_name} onChange={e => setForm(p => ({ ...p, executive_name: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Telefone do vendedor executivo</Label>
                      <Input value={form.executive_phone} onChange={e => setForm(p => ({ ...p, executive_phone: e.target.value }))} />
                    </div>
                  </div>
                </CardContent>
              </Card>

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
              <AlertDialogTitle>Excluir fornecedor?</AlertDialogTitle>
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
