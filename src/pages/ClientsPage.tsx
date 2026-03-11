import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import ClientPhotosSection from '@/components/ClientPhotosSection';
import DS160Section from '@/components/ds160/DS160Section';
import { useCompany } from '@/contexts/CompanyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Pencil, Trash2, MessageCircle } from 'lucide-react';

import { toast } from 'sonner';
import CepLookup from '@/components/CepLookup';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { maskCpf, maskPhone, validateEmail } from '@/lib/masks';

interface Client {
  id: string;
  full_name: string;
  birth_date: string | null;
  cpf: string;
  passport_number: string;
  passport_issue_date: string | null;
  passport_expiry_date: string | null;
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
}

const emptyClient = (): Omit<Client, 'id'> => ({
  full_name: '', birth_date: null, cpf: '', passport_number: '',
  passport_issue_date: null, passport_expiry_date: null, email: '', phone: '',
  cep: '', address: '', address_number: '', complement: '',
  neighborhood: '', city: '', state: '', country: 'Brasil',
});

export default function ClientsPage() {
  const { activeCompany, isMaster } = useCompany();
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Client, 'id'>>(emptyClient());
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [emailError, setEmailError] = useState('');

  const fetchClients = async () => {
    let query = supabase.from('clients').select('*').order('full_name');
    if (activeCompany?.id) query = query.eq('empresa_id', activeCompany.id);
    const { data } = await query;
    if (data) setClients(data as Client[]);
  };

  useEffect(() => { fetchClients(); }, [activeCompany?.id]);

  const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  const filtered = clients.filter(c =>
    normalize(c.full_name).includes(normalize(search)) ||
    c.cpf.includes(search) ||
    normalize(c.email).includes(normalize(search))
  );


  const handleEmailChange = (value: string) => {
    const lower = value.toLowerCase();
    setForm(p => ({ ...p, email: lower }));
    if (lower && !validateEmail(lower)) {
      setEmailError('Email inválido');
    } else {
      setEmailError('');
    }
  };

  const handleSave = async () => {
    if (!form.full_name.trim()) { toast.error('Nome é obrigatório'); return; }
    if (form.email && !validateEmail(form.email)) { toast.error('Email inválido'); return; }

    if (editingId) {
      const { error } = await supabase.from('clients').update(form).eq('id', editingId);
      if (error) { toast.error('Erro ao atualizar'); return; }
      toast.success('Cliente atualizado!');
    } else {
      const { error } = await supabase.from('clients').insert({ ...form, empresa_id: activeCompany?.id } as any);
      if (error) { toast.error('Erro ao cadastrar'); return; }
      toast.success('Cliente cadastrado!');
    }
    setDialogOpen(false);
    setEditingId(null);
    setForm(emptyClient());
    setEmailError('');
    fetchClients();
  };

  const handleEdit = (c: Client) => {
    setEditingId(c.id);
    const { id, ...rest } = c;
    setForm(rest);
    setEmailError('');
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from('clients').delete().eq('id', deleteId);
    setDeleteId(null);
    toast.success('Cliente excluído');
    fetchClients();
  };

  const openNew = () => {
    setEditingId(null);
    setForm(emptyClient());
    setEmailError('');
    setDialogOpen(true);
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Cadastrar Cliente</Button>
        </div>

        <div className="flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar por nome, CPF ou email..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Cidade</TableHead>
                  <TableHead className="w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum cliente encontrado</TableCell></TableRow>
                ) : filtered.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.full_name}</TableCell>
                    <TableCell>{c.cpf}</TableCell>
                    <TableCell>{c.email}</TableCell>
                    <TableCell>{c.phone}</TableCell>
                    <TableCell>{c.city}{c.state ? ` - ${c.state}` : ''}</TableCell>
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

        {/* Form Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Editar Cliente' : 'Cadastrar Cliente'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {editingId && <ClientPhotosSection clientId={editingId} />}
              {editingId && activeCompany?.slug === 'vortex-vistos' && (
                <DS160Section clientId={editingId} clientName={form.full_name} clientEmail={form.email} isMaster={isMaster} />
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>CPF</Label>
                  <Input
                    value={form.cpf}
                    onChange={e => setForm(p => ({ ...p, cpf: maskCpf(e.target.value) }))}
                    placeholder="000.000.000-00"
                  />
                </div>
                <div>
                  <Label>Data de nascimento</Label>
                  <Input type="date" value={form.birth_date || ''} onChange={e => setForm(p => ({ ...p, birth_date: e.target.value || null }))} />
                </div>
                <div className="md:col-span-2">
                  <Label>Nome completo *</Label>
                  <Input value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} />
                </div>
              </div>

              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">Passaporte</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Número do passaporte</Label>
                      <Input value={form.passport_number} onChange={e => setForm(p => ({ ...p, passport_number: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Data de emissão</Label>
                      <Input type="date" value={form.passport_issue_date || ''} onChange={e => setForm(p => ({ ...p, passport_issue_date: e.target.value || null }))} />
                    </div>
                    <div>
                      <Label>Data de vencimento</Label>
                      <Input type="date" value={form.passport_expiry_date || ''} onChange={e => setForm(p => ({ ...p, passport_expiry_date: e.target.value || null }))} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={e => handleEmailChange(e.target.value)}
                    placeholder="exemplo@email.com"
                    className={emailError ? 'border-destructive' : ''}
                  />
                  {emailError && <p className="text-xs text-destructive mt-1">{emailError}</p>}
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: maskPhone(e.target.value) }))} placeholder="(00) 00000-0000" />
                </div>
              </div>

              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">Endereço</CardTitle></CardHeader>
                <CardContent>
                  <CepLookup
                    data={{
                      cep: form.cep,
                      address: form.address,
                      addressNumber: form.address_number,
                      complement: form.complement,
                      neighborhood: form.neighborhood,
                      city: form.city,
                      state: form.state,
                      country: form.country,
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

              <div className="flex justify-end gap-3">
                {editingId && (
                  <Button
                    variant="outline"
                    className="gap-1.5 text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                    onClick={() => {
                      if (!form.phone?.trim()) {
                        toast.error('Cadastre um telefone para o cliente antes de chamar no WhatsApp');
                        return;
                      }
                      const cleanPhone = form.phone.replace(/\D/g, '');
                      setDialogOpen(false);
                      navigate('/whatsapp', { state: { openPhone: cleanPhone, openName: form.full_name } });
                    }}
                  >
                    <MessageCircle className="h-4 w-4" />Chamar no WhatsApp
                  </Button>
                )}
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleSave}>{editingId ? 'Atualizar' : 'Cadastrar'}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
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
