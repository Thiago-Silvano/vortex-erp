import { useState, useEffect, useRef } from 'react';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Pencil, Trash2, Users, Loader2 } from 'lucide-react';
import ClientFilesSection, { type ClientFilesSectionRef } from '@/components/ClientFilesSection';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import CepLookup from '@/components/CepLookup';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { maskCpfCnpj, isCnpj, fetchCnpjData, maskPhone, validateEmail } from '@/lib/masks';

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
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [isDependent, setIsDependent] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [duplicateClient, setDuplicateClient] = useState<Client | null>(null);
  const filesRef = useRef<ClientFilesSectionRef>(null);

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
    if (lower && !validateEmail(lower)) setEmailError('Email inválido');
    else setEmailError('');
  };

  const handleSave = async () => {
    if (!form.full_name.trim()) { toast.error('Nome é obrigatório'); return; }
    if (form.email && !validateEmail(form.email)) { toast.error('Email inválido'); return; }

    const nameUpper = form.full_name.toUpperCase().trim();
    const formToSave = { ...form, full_name: nameUpper };

    // Duplicate check only when creating new client
    if (!editingId) {
      const normalizedName = normalize(nameUpper);
      const cleanCpf = formToSave.cpf.replace(/\D/g, '');
      const found = clients.find(c => {
        if (cleanCpf && c.cpf.replace(/\D/g, '') === cleanCpf && cleanCpf.length >= 11) return true;
        if (normalize(c.full_name) === normalizedName && normalizedName.length > 2) return true;
        return false;
      });
      if (found) {
        setDuplicateClient(found);
        return;
      }
    }

    if (editingId) {
      const { error } = await supabase.from('clients').update(formToSave).eq('id', editingId);
      if (error) { toast.error('Erro ao atualizar'); return; }
      toast.success('Cliente atualizado!');
    } else {
      const { error } = await supabase.from('clients').insert({ ...formToSave, empresa_id: activeCompany?.id } as any);
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
    setIsDependent(false);
    setSelectedParentId(null);
    setDialogOpen(true);
  };

  const handleParentSelect = (parentId: string) => {
    setSelectedParentId(parentId);
    const parent = clients.find(c => c.id === parentId);
    if (parent) {
      setForm(prev => ({
        ...prev,
        passport_number: parent.passport_number,
        passport_issue_date: parent.passport_issue_date,
        passport_expiry_date: parent.passport_expiry_date,
        email: parent.email,
        phone: parent.phone,
        cep: parent.cep,
        address: parent.address,
        address_number: parent.address_number,
        complement: parent.complement,
        neighborhood: parent.neighborhood,
        city: parent.city,
        state: parent.state,
        country: parent.country,
      }));
    }
  };

  return (
    <AppLayout>
      <div className="p-2 space-y-2">
        {/* Toolbar */}
        <div className="flex items-center gap-2 bg-card border p-1.5">
          <Button size="sm" onClick={openNew}><Plus className="h-3 w-3 mr-1" />Novo</Button>
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input className="pl-7 h-6 text-xs" placeholder="Pesquisar nome, CPF ou email..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <span className="text-xs text-muted-foreground ml-auto">{filtered.length} registros</span>
        </div>

        {/* Table */}
        <div className="border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>CPF/CNPJ</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Cidade</TableHead>
                <TableHead>UF</TableHead>
                <TableHead className="w-16">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-4 text-xs">Nenhum cliente encontrado</TableCell></TableRow>
              ) : filtered.map(c => (
                <TableRow key={c.id} className="cursor-pointer" onClick={() => handleEdit(c)}>
                  <TableCell className="font-medium">{c.full_name}</TableCell>
                  <TableCell>{c.cpf}</TableCell>
                  <TableCell>{c.email}</TableCell>
                  <TableCell>{c.phone}</TableCell>
                  <TableCell>{c.city}</TableCell>
                  <TableCell>{c.state}</TableCell>
                  <TableCell>
                    <div className="flex gap-0.5" onClick={e => e.stopPropagation()}>
                      <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => handleEdit(c)}><Pencil className="h-3 w-3" /></Button>
                      <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => setDeleteId(c.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Form Dialog - Compact multi-column layout */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Editar Cliente' : 'Cadastrar Cliente'}</DialogTitle>
            </DialogHeader>

            <div className="space-y-3">
              {editingId && <ClientPhotosSection clientId={editingId} />}
              {editingId && <ClientFilesSection clientId={editingId} />}
              {editingId && activeCompany?.slug === 'vortex-vistos' && (
                <DS160Section clientId={editingId} clientName={form.full_name} clientEmail={form.email} isMaster={isMaster} />
              )}

              {/* Row 1: CPF, Nascimento, Nome */}
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <Label>CPF / CNPJ</Label>
                  <div className="flex gap-0.5">
                    <Input
                      value={form.cpf}
                      onChange={e => setForm(p => ({ ...p, cpf: maskCpfCnpj(e.target.value) }))}
                      className="flex-1"
                    />
                    {isCnpj(form.cpf) && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={cnpjLoading}
                        className="h-7 w-7 p-0"
                        onClick={async () => {
                          setCnpjLoading(true);
                          const data = await fetchCnpjData(form.cpf);
                          setCnpjLoading(false);
                          if (!data) { toast.error('CNPJ não encontrado'); return; }
                          setForm(p => ({
                            ...p,
                            full_name: data.nome_fantasia || data.razao_social || p.full_name,
                            email: data.email || p.email,
                            phone: data.telefone || p.phone,
                            cep: data.cep || p.cep,
                            address: data.logradouro || p.address,
                            address_number: data.numero || p.address_number,
                            complement: data.complemento || p.complement,
                            neighborhood: data.bairro || p.neighborhood,
                            city: data.municipio || p.city,
                            state: data.uf || p.state,
                          }));
                          toast.success('Dados do CNPJ preenchidos!');
                        }}
                      >
                        {cnpjLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
                      </Button>
                    )}
                  </div>
                </div>
                <div>
                  <Label>Nascimento</Label>
                  <Input type="date" value={form.birth_date || ''} onChange={e => setForm(p => ({ ...p, birth_date: e.target.value || null }))} />
                </div>
                <div className="col-span-2">
                  <Label>Nome completo *</Label>
                  <Input value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value.toUpperCase() }))} style={{ textTransform: 'uppercase' }} />
                </div>
              </div>

              {/* Dependent checkbox */}
              {!editingId && (
                <div className="flex items-center gap-2">
                  <Checkbox id="is-dependent" checked={isDependent} onCheckedChange={(c) => { setIsDependent(!!c); if (!c) setSelectedParentId(null); }} />
                  <Label htmlFor="is-dependent" className="cursor-pointer text-xs">Dependente de outro cliente?</Label>
                  {isDependent && (
                    <Select value={selectedParentId || ''} onValueChange={handleParentSelect}>
                      <SelectTrigger className="w-60"><SelectValue placeholder="Titular..." /></SelectTrigger>
                      <SelectContent>
                        {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name}{c.cpf ? ` - ${c.cpf}` : ''}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}

              {/* Row 2: Contato */}
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={e => handleEmailChange(e.target.value)} className={emailError ? 'border-destructive' : ''} />
                  {emailError && <p className="text-[10px] text-destructive">{emailError}</p>}
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: maskPhone(e.target.value) }))} placeholder="(00) 00000-0000" />
                </div>
                <div>
                  <Label>Passaporte</Label>
                  <Input value={form.passport_number} onChange={e => setForm(p => ({ ...p, passport_number: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <div>
                    <Label>Emissão</Label>
                    <Input type="date" value={form.passport_issue_date || ''} onChange={e => setForm(p => ({ ...p, passport_issue_date: e.target.value || null }))} />
                  </div>
                  <div>
                    <Label>Validade</Label>
                    <Input type="date" value={form.passport_expiry_date || ''} onChange={e => setForm(p => ({ ...p, passport_expiry_date: e.target.value || null }))} />
                  </div>
                </div>
              </div>

              {/* Row 3: Endereço */}
              <div className="border-t pt-2">
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
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave}>{editingId ? 'Atualizar' : 'Cadastrar'}</Button>
            </DialogFooter>
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

        <AlertDialog open={!!duplicateClient} onOpenChange={(open) => { if (!open) setDuplicateClient(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cliente já cadastrado</AlertDialogTitle>
              <AlertDialogDescription>
                Foi encontrado um cliente com dados semelhantes: <strong>{duplicateClient?.full_name}</strong>
                {duplicateClient?.cpf ? ` — CPF: ${duplicateClient.cpf}` : ''}.
                Deseja abrir o cadastro deste cliente para atualizar os dados?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => {
                if (duplicateClient) {
                  handleEdit(duplicateClient);
                }
                setDuplicateClient(null);
              }}>Atualizar cliente existente</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
