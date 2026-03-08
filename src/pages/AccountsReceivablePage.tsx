import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface Receivable {
  id: string;
  sale_id: string;
  client_name: string;
  description: string;
  installment_number: number;
  amount: number;
  due_date: string | null;
  status: string;
  payment_date: string | null;
  payment_method: string;
  notes: string;
  cost_center_id: string | null;
  origin_type: string;
}

interface ClientOpt { id: string; full_name: string; }
interface CostCenter { id: string; name: string; }
interface InstallmentRow { due_date: string; amount: number; }

export default function AccountsReceivablePage() {
  const [items, setItems] = useState<Receivable[]>([]);
  const [clients, setClients] = useState<ClientOpt[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [filterMonth, setFilterMonth] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterClient, setFilterClient] = useState('');
  const [filterCostCenter, setFilterCostCenter] = useState('all');

  // Mark as received dialog
  const [markDialog, setMarkDialog] = useState(false);
  const [markId, setMarkId] = useState('');
  const [markPaymentDate, setMarkPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [markPaymentMethod, setMarkPaymentMethod] = useState('');
  const [markNotes, setMarkNotes] = useState('');

  // Manual entry dialog
  const [manualDialog, setManualDialog] = useState(false);
  const [manualClientId, setManualClientId] = useState('');
  const [manualDescription, setManualDescription] = useState('');
  const [manualCostCenter, setManualCostCenter] = useState('');
  const [manualAmount, setManualAmount] = useState(0);
  const [manualDueDate, setManualDueDate] = useState('');
  const [manualInstallments, setManualInstallments] = useState(1);
  const [manualIsInstallment, setManualIsInstallment] = useState(false);
  const [installmentRows, setInstallmentRows] = useState<InstallmentRow[]>([]);

  const fetch_ = async () => {
    const { data } = await supabase.from('receivables').select('*').order('due_date');
    if (data) setItems(data as unknown as Receivable[]);
  };

  useEffect(() => {
    fetch_();
    supabase.from('clients').select('id, full_name').order('full_name')
      .then(({ data }) => { if (data) setClients(data); });
    supabase.from('cost_centers').select('id, name').eq('status', 'active').order('name')
      .then(({ data }) => { if (data) setCostCenters(data); });
  }, []);

  // Generate installment rows when count or total amount changes
  const generateInstallmentRows = (count: number, total: number, baseDate: string) => {
    const perInstallment = total / count;
    const rows: InstallmentRow[] = [];
    for (let i = 0; i < count; i++) {
      const dueDate = baseDate ? new Date(baseDate + 'T12:00:00') : new Date();
      if (i > 0) dueDate.setMonth(dueDate.getMonth() + i);
      rows.push({
        due_date: format(dueDate, 'yyyy-MM-dd'),
        amount: Math.round(perInstallment * 100) / 100,
      });
    }
    return rows;
  };

  useEffect(() => {
    if (manualIsInstallment && manualInstallments >= 2) {
      setInstallmentRows(generateInstallmentRows(manualInstallments, manualAmount, manualDueDate));
    }
  }, [manualIsInstallment, manualInstallments, manualAmount, manualDueDate]);

  const filtered = items.filter(r => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (filterClient && !r.client_name?.toLowerCase().includes(filterClient.toLowerCase())) return false;
    if (filterMonth && r.due_date && !r.due_date.startsWith(filterMonth)) return false;
    if (filterCostCenter !== 'all' && r.cost_center_id !== filterCostCenter) return false;
    return true;
  });

  const statusLabel: Record<string, string> = { pending: 'Em aberto', received: 'Recebido', overdue: 'Atrasado' };
  const statusVariant = (s: string) => s === 'received' ? 'default' as const : s === 'overdue' ? 'destructive' as const : 'secondary' as const;
  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const openMark = (id: string) => {
    setMarkId(id);
    setMarkPaymentDate(format(new Date(), 'yyyy-MM-dd'));
    setMarkPaymentMethod('');
    setMarkNotes('');
    setMarkDialog(true);
  };

  const handleMark = async () => {
    await supabase.from('receivables').update({
      status: 'received',
      payment_date: markPaymentDate || null,
      payment_method: markPaymentMethod,
      notes: markNotes,
    } as any).eq('id', markId);
    toast.success('Marcado como recebido!');
    setMarkDialog(false);
    fetch_();
  };

  const selectedClientName = clients.find(c => c.id === manualClientId)?.full_name || '';

  const handleManualSave = async () => {
    if (!manualClientId) { toast.error('Cliente é obrigatório'); return; }
    if (manualAmount <= 0) { toast.error('Valor deve ser maior que zero'); return; }

    const records = [];
    if (manualIsInstallment && installmentRows.length >= 2) {
      for (let i = 0; i < installmentRows.length; i++) {
        records.push({
          client_name: selectedClientName,
          description: manualDescription,
          cost_center_id: manualCostCenter || null,
          amount: installmentRows[i].amount,
          due_date: installmentRows[i].due_date,
          installment_number: i + 1,
          status: 'pending',
          origin_type: 'manual',
        });
      }
    } else {
      records.push({
        client_name: selectedClientName,
        description: manualDescription,
        cost_center_id: manualCostCenter || null,
        amount: manualAmount,
        due_date: manualDueDate || format(new Date(), 'yyyy-MM-dd'),
        installment_number: 1,
        status: 'pending',
        origin_type: 'manual',
      });
    }

    await supabase.from('receivables').insert(records as any);
    toast.success(`${records.length} parcela(s) criada(s)!`);
    setManualDialog(false);
    setManualClientId(''); setManualDescription(''); setManualAmount(0); setManualDueDate(''); setManualInstallments(1); setManualIsInstallment(false); setManualCostCenter(''); setInstallmentRows([]);
    fetch_();
  };

  const updateInstallmentRow = (index: number, field: keyof InstallmentRow, value: string | number) => {
    setInstallmentRows(prev => prev.map((row, i) => i === index ? { ...row, [field]: value } : row));
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Contas a Receber</h1>
          <Button onClick={() => setManualDialog(true)}><Plus className="h-4 w-4 mr-2" />Novo Lançamento</Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <Input className="w-48" placeholder="Filtrar cliente..." value={filterClient} onChange={e => setFilterClient(e.target.value)} />
          <Input type="month" className="w-48" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} />
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Em aberto</SelectItem>
              <SelectItem value="received">Recebido</SelectItem>
              <SelectItem value="overdue">Atrasado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterCostCenter} onValueChange={setFilterCostCenter}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Centro de Custo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {costCenters.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Parcela</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-16">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum registro encontrado</TableCell></TableRow>
                ) : filtered.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.client_name || '-'}</TableCell>
                    <TableCell>{r.description || (r.origin_type === 'sale' ? 'Venda' : '-')}</TableCell>
                    <TableCell>{r.installment_number}ª</TableCell>
                    <TableCell>{fmt(r.amount)}</TableCell>
                    <TableCell>{r.due_date ? format(new Date(r.due_date + 'T12:00:00'), 'dd/MM/yyyy') : '-'}</TableCell>
                    <TableCell><Badge variant={statusVariant(r.status)}>{statusLabel[r.status] || r.status}</Badge></TableCell>
                    <TableCell>
                      {r.status === 'pending' && (
                        <Button size="icon" variant="ghost" onClick={() => openMark(r.id)} title="Marcar como recebido">
                          <Check className="h-4 w-4 text-primary" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Mark as received dialog */}
        <Dialog open={markDialog} onOpenChange={setMarkDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Marcar como Recebido</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Data do Pagamento</Label>
                <Input type="date" value={markPaymentDate} onChange={e => setMarkPaymentDate(e.target.value)} />
              </div>
              <div>
                <Label>Forma de Pagamento</Label>
                <Input value={markPaymentMethod} onChange={e => setMarkPaymentMethod(e.target.value)} placeholder="Pix, Transferência, etc." />
              </div>
              <div>
                <Label>Observação</Label>
                <Textarea value={markNotes} onChange={e => setMarkNotes(e.target.value)} />
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setMarkDialog(false)}>Cancelar</Button>
                <Button onClick={handleMark}>Confirmar</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Manual entry dialog */}
        <Dialog open={manualDialog} onOpenChange={setManualDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Novo Lançamento Manual</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Cliente *</Label>
                <Select value={manualClientId} onValueChange={setManualClientId}>
                  <SelectTrigger><SelectValue placeholder="Selecionar cliente..." /></SelectTrigger>
                  <SelectContent>
                    {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Descrição</Label>
                <Input value={manualDescription} onChange={e => setManualDescription(e.target.value)} />
              </div>
              <div>
                <Label>Centro de Custo</Label>
                <Select value={manualCostCenter} onValueChange={setManualCostCenter}>
                  <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>
                    {costCenters.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valor Total *</Label>
                <Input type="number" step="0.01" value={manualAmount} onChange={e => setManualAmount(parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <Label>Data de Vencimento</Label>
                <Input type="date" value={manualDueDate} onChange={e => setManualDueDate(e.target.value)} />
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={manualIsInstallment} onChange={e => setManualIsInstallment(e.target.checked)} className="rounded" />
                  Parcelado
                </label>
                {manualIsInstallment && (
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">Parcelas:</Label>
                    <Input type="number" min={2} max={24} className="w-20" value={manualInstallments} onChange={e => setManualInstallments(parseInt(e.target.value) || 2)} />
                  </div>
                )}
              </div>

              {/* Installment table */}
              {manualIsInstallment && installmentRows.length >= 2 && (
                <Card>
                  <CardContent className="p-3">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16">Parcela</TableHead>
                          <TableHead>Vencimento</TableHead>
                          <TableHead>Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {installmentRows.map((row, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">{i + 1}ª</TableCell>
                            <TableCell>
                              <Input type="date" value={row.due_date} onChange={e => updateInstallmentRow(i, 'due_date', e.target.value)} className="w-40" />
                            </TableCell>
                            <TableCell>
                              <Input type="number" step="0.01" value={row.amount} onChange={e => updateInstallmentRow(i, 'amount', parseFloat(e.target.value) || 0)} className="w-32" />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setManualDialog(false)}>Cancelar</Button>
                <Button onClick={handleManualSave}>Salvar</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
