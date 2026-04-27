import AppLayout from '@/components/AppLayout';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, SortableTableHead } from '@/components/ui/table';
import { useTableSort } from '@/hooks/useTableSort';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, Plus, Pencil, Trash2, UserRound } from 'lucide-react';
import { toast } from 'sonner';

interface Contact {
  id: string;
  name: string;
  phone: string;
  email: string;
  client_id: string | null;
  notes: string;
}

export default function WhatsAppContactsPage() {
  const { activeCompany } = useCompany();
  const empresaId = activeCompany?.id || '';
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '', notes: '' });

  useEffect(() => {
    if (empresaId) loadContacts();
  }, [empresaId]);

  const loadContacts = async () => {
    const { data } = await (supabase.from('whatsapp_contacts').select('*').eq('empresa_id', empresaId).order('name') as any);
    if (data) setContacts(data);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error('Nome e telefone são obrigatórios');
      return;
    }
    if (editing) {
      await (supabase.from('whatsapp_contacts').update(form).eq('id', editing.id) as any);
      toast.success('Contato atualizado');
    } else {
      await (supabase.from('whatsapp_contacts').insert({ ...form, empresa_id: empresaId }) as any);
      toast.success('Contato criado');
    }
    setShowModal(false);
    setEditing(null);
    loadContacts();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este contato?')) return;
    await (supabase.from('whatsapp_contacts').delete().eq('id', id) as any);
    toast.success('Contato excluído');
    loadContacts();
  };

  const openEdit = (c: Contact) => {
    setEditing(c);
    setForm({ name: c.name, phone: c.phone, email: c.email, notes: c.notes });
    setShowModal(true);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', phone: '', email: '', notes: '' });
    setShowModal(true);
  };

  const filtered = contacts.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)
  );

  const { sortedData: sortedContacts, sortState, requestSort } = useTableSort(filtered, {
    name: (c) => c.name,
    phone: (c) => c.phone,
    email: (c) => c.email,
  }, { initialKey: 'name', initialDirection: 'asc' });

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserRound className="h-6 w-6" />
            Contatos WhatsApp
          </h1>
          <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Novo Contato</Button>
        </div>

        <div className="relative mb-4 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar contato..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHead sortKey="name" sortState={sortState} onSort={requestSort}>Nome</SortableTableHead>
                <SortableTableHead sortKey="phone" sortState={sortState} onSort={requestSort}>Telefone</SortableTableHead>
                <SortableTableHead sortKey="email" sortState={sortState} onSort={requestSort}>Email</SortableTableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedContacts.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.phone}</TableCell>
                  <TableCell>{c.email || '-'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {sortedContacts.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhum contato encontrado</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Editar Contato' : 'Novo Contato'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div><Label>Telefone</Label><Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></div>
            <div><Label>Email</Label><Input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
            <div><Label>Notas</Label><Input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
            <Button onClick={handleSave} className="w-full">Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
