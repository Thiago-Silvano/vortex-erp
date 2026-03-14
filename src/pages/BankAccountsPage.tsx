import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from 'sonner';
import { Plus, Pencil, Building2, Star } from 'lucide-react';

interface BankAccount {
  id: string;
  bank_name: string;
  bank_code: string;
  agency: string;
  account_number: string;
  account_digit: string;
  account_type: string;
  holder_name: string;
  holder_document: string;
  initial_balance: number;
  initial_balance_date: string;
  status: string;
  color: string;
  is_default: boolean;
  notes: string;
}

const emptyAccount: Omit<BankAccount, 'id'> = {
  bank_name: '', bank_code: '', agency: '', account_number: '', account_digit: '',
  account_type: 'corrente', holder_name: '', holder_document: '', initial_balance: 0,
  initial_balance_date: new Date().toISOString().split('T')[0], status: 'active',
  color: '#3b82f6', is_default: false, notes: '',
};

export default function BankAccountsPage() {
  const { activeCompany } = useCompany();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyAccount);

  const load = async () => {
    if (!activeCompany) return;
    setLoading(true);
    const { data } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('empresa_id', activeCompany.id)
      .order('bank_name');
    setAccounts((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [activeCompany]);

  const openNew = () => { setEditId(null); setForm(emptyAccount); setShowModal(true); };
  const openEdit = (a: BankAccount) => {
    setEditId(a.id);
    setForm({ ...a });
    setShowModal(true);
  };

  const save = async () => {
    if (!activeCompany || !form.bank_name) { toast.error('Informe o banco'); return; }
    const payload = { ...form, empresa_id: activeCompany.id };
    
    if (form.is_default) {
      await supabase.from('bank_accounts').update({ is_default: false } as any).eq('empresa_id', activeCompany.id);
    }

    if (editId) {
      const { error } = await supabase.from('bank_accounts').update(payload as any).eq('id', editId);
      if (error) { toast.error(error.message); return; }
      toast.success('Conta atualizada');
    } else {
      const { error } = await supabase.from('bank_accounts').insert(payload as any);
      if (error) { toast.error(error.message); return; }
      toast.success('Conta criada');
    }
    setShowModal(false);
    load();
  };

  const typeLabels: Record<string, string> = {
    corrente: 'Corrente', poupanca: 'Poupança', investimento: 'Investimento', carteira: 'Carteira',
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Contas Correntes</h1>
            <p className="text-sm text-muted-foreground">Gerencie as contas bancárias da empresa</p>
          </div>
          <Button onClick={openNew} size="sm" className="gap-2"><Plus className="h-4 w-4" />Nova Conta</Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Banco</TableHead>
                  <TableHead>Agência / Conta</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Titular</TableHead>
                  <TableHead className="text-right">Saldo Inicial</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                ) : accounts.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma conta cadastrada</TableCell></TableRow>
                ) : accounts.map(a => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: a.color }} />
                        <div>
                          <p className="font-medium text-sm">{a.bank_name}</p>
                          {a.bank_code && <p className="text-xs text-muted-foreground">Cód: {a.bank_code}</p>}
                        </div>
                        {a.is_default && <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{a.agency} / {a.account_number}{a.account_digit ? `-${a.account_digit}` : ''}</TableCell>
                    <TableCell className="text-sm">{typeLabels[a.account_type] || a.account_type}</TableCell>
                    <TableCell className="text-sm">{a.holder_name}</TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      {Number(a.initial_balance).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={a.status === 'active' ? 'default' : 'secondary'}>
                        {a.status === 'active' ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(a)}><Pencil className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? 'Editar Conta' : 'Nova Conta Corrente'}</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Banco *</Label><Input value={form.bank_name} onChange={e => setForm({ ...form, bank_name: e.target.value })} /></div>
              <div><Label>Código do banco</Label><Input value={form.bank_code} onChange={e => setForm({ ...form, bank_code: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Agência</Label><Input value={form.agency} onChange={e => setForm({ ...form, agency: e.target.value })} /></div>
              <div><Label>Conta</Label><Input value={form.account_number} onChange={e => setForm({ ...form, account_number: e.target.value })} /></div>
              <div><Label>Dígito</Label><Input value={form.account_digit} onChange={e => setForm({ ...form, account_digit: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo de conta</Label>
                <Select value={form.account_type} onValueChange={v => setForm({ ...form, account_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="corrente">Corrente</SelectItem>
                    <SelectItem value="poupanca">Poupança</SelectItem>
                    <SelectItem value="investimento">Investimento</SelectItem>
                    <SelectItem value="carteira">Carteira</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativa</SelectItem>
                    <SelectItem value="inactive">Inativa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Titular</Label><Input value={form.holder_name} onChange={e => setForm({ ...form, holder_name: e.target.value })} /></div>
              <div><Label>CPF/CNPJ do titular</Label><Input value={form.holder_document} onChange={e => setForm({ ...form, holder_document: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Saldo inicial</Label><Input type="number" step="0.01" value={form.initial_balance} onChange={e => setForm({ ...form, initial_balance: parseFloat(e.target.value) || 0 })} /></div>
              <div><Label>Data do saldo</Label><Input type="date" value={form.initial_balance_date} onChange={e => setForm({ ...form, initial_balance_date: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Cor de identificação</Label>
                <Input type="color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} className="h-10 p-1" />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.is_default} onChange={e => setForm({ ...form, is_default: e.target.checked })} className="rounded" />
                  <span className="text-sm">Conta padrão</span>
                </label>
              </div>
            </div>
            <div><Label>Observações</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
