import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
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
import { maskPhone, maskCnpj, unmask, validateEmail } from '@/lib/masks';

interface Supplier {
  id: string;
  name: string;
  razao_social: string;
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
  name: '', razao_social: '', cnpj: '', email: '', phone: '',
  cep: '', address: '', address_number: '', complement: '',
  neighborhood: '', city: '', state: '', country: 'Brasil',
  sales_rep_name: '', sales_rep_phone: '', executive_name: '', executive_phone: '',
});

export default function SuppliersPage() {
  const { activeCompany } = useCompany();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Supplier, 'id'>>(emptySupplier());
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [emailError, setEmailError] = useState('');

  const fetchSuppliers = async () => {
    let query = supabase.from('suppliers').select('*').order('name');
    if (activeCompany?.id) query = query.eq('empresa_id', activeCompany.id);
    const { data } = await query;
    if (data) setSuppliers(data as unknown as Supplier[]);
  };

  useEffect(() => { fetchSuppliers(); }, [activeCompany?.id]);

  const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const filtered = suppliers.filter(s =>
    normalize(s.name).includes(normalize(search)) ||
    s.cnpj.includes(search) ||
    normalize(s.email).includes(normalize(search))
  );

  const handleCnpjSearch = async () => {
    const digits = unmask(form.cnpj);
    if (digits.length !== 14) { toast.error('CNPJ deve ter 14 dígitos'); return; }
    setCnpjLoading(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`);
      const json = await res.json();
      if (res.ok) {
        setForm(p => ({
          ...p,
          name: json.nome_fantasia || json.razao_social || p.name,
          razao_social: json.razao_social || '',
          address: json.logradouro || '',
          address_number: json.numero || '',
          complement: json.complemento || '',
          neighborhood: json.bairro || '',
          city: json.municipio || '',
          state: json.uf || '',
          cep: json.cep ? json.cep.replace(/\D/g, '') : '',
          country: 'Brasil',
        }));
        toast.success('Dados do CNPJ preenchidos!');
      } else {
        toast.error('CNPJ não encontrado');
      }
    } catch {
      toast.error('Erro ao consultar CNPJ');
    } finally {
      setCnpjLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Nome é obrigatório'); return; }
    if (!unmask(form.cnpj)) { toast.error('CNPJ é obrigatório'); return; }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { toast.error('Email inválido'); return; }

    if (editingId) {
      const { error } = await supabase.from('suppliers').update(form as any).eq('id', editingId);
      if (error) { toast.error('Erro ao atualizar'); return; }
      toast.success('Fornecedor atualizado!');
    } else {
      const { error } = await supabase.from('suppliers').insert({ ...form, empresa_id: activeCompany?.id } as any);
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
              {/* CNPJ with lookup */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>CNPJ *</Label>
                  <div className="flex gap-2">
                    <Input
                      value={form.cnpj}
                      onChange={e => setForm(p => ({ ...p, cnpj: maskCnpj(e.target.value) }))}
                      placeholder="00.000.000/0000-00"
                    />
                    <Button variant="outline" size="icon" onClick={handleCnpjSearch} disabled={cnpjLoading}>
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <Label>Razão Social</Label>
                  <Input value={form.razao_social} onChange={e => setForm(p => ({ ...p, razao_social: e.target.value }))} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label>Nome fantasia *</Label>
                  <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={e => {
                      const lower = e.target.value.toLowerCase();
                      setForm(p => ({ ...p, email: lower }));
                      setEmailError(lower && !validateEmail(lower) ? 'Email inválido' : '');
                    }}
                    placeholder="exemplo@email.com"
                    className={emailError ? 'border-destructive' : ''}
                  />
                  {emailError && <p className="text-xs text-destructive mt-1">{emailError}</p>}
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Input
                    value={form.phone}
                    onChange={e => setForm(p => ({ ...p, phone: maskPhone(e.target.value) }))}
                    placeholder="(00) 00000-0000"
                  />
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
                      <Input
                        value={form.sales_rep_phone}
                        onChange={e => setForm(p => ({ ...p, sales_rep_phone: maskPhone(e.target.value) }))}
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                    <div>
                      <Label>Vendedor executivo</Label>
                      <Input value={form.executive_name} onChange={e => setForm(p => ({ ...p, executive_name: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Telefone do vendedor executivo</Label>
                      <Input
                        value={form.executive_phone}
                        onChange={e => setForm(p => ({ ...p, executive_phone: maskPhone(e.target.value) }))}
                        placeholder="(00) 00000-0000"
                      />
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
