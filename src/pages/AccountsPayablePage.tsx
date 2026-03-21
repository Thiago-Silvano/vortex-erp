import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
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
import { Textarea } from '@/components/ui/textarea';
import { Plus, Check, AlertTriangle, Clock, DollarSign, CheckCircle, ArrowUp, ArrowDown, ArrowUpDown, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

interface Payable {
  id: string;
  supplier_id: string | null;
  sale_id: string | null;
  cost_center_id: string | null;
  description: string;
  amount: number;
  due_date: string | null;
  payment_date: string | null;
  status: string;
  notes: string;
  installment_number: number;
  total_installments: number;
  origin_type: string;
}

interface SupplierOpt { id: string; name: string; }
interface CostCenter { id: string; name: string; }
interface InstallmentRow { due_date: string; amount: number; }

type PeriodFilter = 'day' | 'month' | 'year';

export default function AccountsPayablePage() {
  const { activeCompany } = useCompany();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [items, setItems] = useState<Payable[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOpt[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSupplier, setFilterSupplier] = useState('all');
  const [filterCostCenter, setFilterCostCenter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('month');
  const [sortKey, setSortKey] = useState<'supplier' | 'description' | 'installment_number' | 'amount' | 'due_date' | 'status'>('due_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir(key === 'amount' ? 'desc' : 'asc'); }
  };
  const SortIcon = ({ col }: { col: typeof sortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === 'asc' ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const [markDialog, setMarkDialog] = useState(false);
  const [markId, setMarkId] = useState('');
  const [markPaymentDate, setMarkPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [markPaymentMethod, setMarkPaymentMethod] = useState('pix');
  const [markNotes, setMarkNotes] = useState('');

  const [editDialog, setEditDialog] = useState(false);
  const [editItem, setEditItem] = useState<Payable | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editAmount, setEditAmount] = useState(0);
  const [editDueDate, setEditDueDate] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const openEdit = (item: Payable) => {
    setEditItem(item);
    setEditDescription(item.description || '');
    setEditAmount(item.amount || 0);
    setEditDueDate(item.due_date || '');
    setEditNotes(item.notes || '');
    setEditDialog(true);
  };

  const handleEditSave = async () => {
    if (!editItem) return;
    await supabase.from('accounts_payable').update({
      description: editDescription,
      amount: editAmount,
      due_date: editDueDate || null,
      notes: editNotes,
    }).eq('id', editItem.id);
    toast.success('Registro atualizado!');
    setEditDialog(false);
    fetch_();
  };

  const [manualDialog, setManualDialog] = useState(false);
  const [cameFromReconciliation, setCameFromReconciliation] = useState(false);

  // Auto-open dialog from URL param only after company is ready
  useEffect(() => {
    if (searchParams.get('new') === '1' && activeCompany?.id) {
      setManualDialog(true);
      if (searchParams.get('from') === 'reconciliation') setCameFromReconciliation(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, activeCompany?.id, setSearchParams]);
  const [manualSupplierId, setManualSupplierId] = useState('');
  const [manualDescription, setManualDescription] = useState('');
  const [manualCostCenter, setManualCostCenter] = useState('');
  const [manualAmount, setManualAmount] = useState(0);
  const [manualDueDate, setManualDueDate] = useState('');
  const [manualInstallments, setManualInstallments] = useState(1);
  const [manualIsInstallment, setManualIsInstallment] = useState(false);
  const [installmentRows, setInstallmentRows] = useState<InstallmentRow[]>([]);

  const fetch_ = async () => {
    // Fetch payables, then filter out any linked to draft sales
    let query = supabase.from('accounts_payable').select('*').order('due_date');
    if (activeCompany?.id) query = query.eq('empresa_id', activeCompany.id);
    const { data } = await query;
    if (!data) { setItems([]); return; }
    const saleIds = [...new Set((data as any[]).map(r => r.sale_id).filter(Boolean))];
    let draftIds: string[] = [];
    if (saleIds.length > 0) {
      const { data: drafts } = await supabase.from('sales').select('id').in('id', saleIds).eq('status', 'draft');
      draftIds = (drafts || []).map(d => d.id);
    }
    setItems((data as Payable[]).filter(r => !r.sale_id || !draftIds.includes(r.sale_id)));
  };

  useEffect(() => {
    fetch_();
    supabase.from('suppliers').select('id, name').order('name').then(({ data }) => { if (data) setSuppliers(data); });
    supabase.from('cost_centers').select('id, name').eq('status', 'active').order('name').then(({ data }) => { if (data) setCostCenters(data); });
  }, [activeCompany?.id]);

  const generateInstallmentRows = (count: number, total: number, baseDate: string) => {
    const perInstallment = total / count;
    const rows: InstallmentRow[] = [];
    for (let i = 0; i < count; i++) {
      const dueDate = baseDate ? new Date(baseDate + 'T12:00:00') : new Date();
      if (i > 0) dueDate.setMonth(dueDate.getMonth() + i);
      rows.push({ due_date: format(dueDate, 'yyyy-MM-dd'), amount: Math.round(perInstallment * 100) / 100 });
    }
    return rows;
  };

  useEffect(() => {
    if (manualIsInstallment && manualInstallments >= 2) {
      setInstallmentRows(generateInstallmentRows(manualInstallments, manualAmount, manualDueDate));
    }
  }, [manualIsInstallment, manualInstallments, manualAmount, manualDueDate]);

  const today = new Date();

  const getPeriodRange = () => {
    if (periodFilter === 'day') return { start: startOfDay(today), end: endOfDay(today) };
    if (periodFilter === 'month') return { start: startOfMonth(today), end: endOfMonth(today) };
    return { start: startOfYear(today), end: endOfYear(today) };
  };

  const periodRange = getPeriodRange();

  const periodItems = useMemo(() => {
    return items.filter(r => {
      if (!r.due_date) return false;
      const d = new Date(r.due_date + 'T12:00:00');
      return d >= periodRange.start && d <= periodRange.end;
    });
  }, [items, periodFilter]);

  const indicators = useMemo(() => {
    const todayStr = format(today, 'yyyy-MM-dd');
    let overdue = 0, dueToday = 0, pending = 0, paid = 0;
    periodItems.forEach(r => {
      if (r.status === 'paid') { paid += r.amount; return; }
      if (r.due_date && r.due_date < todayStr && r.status !== 'paid') { overdue += r.amount; return; }
      if (r.due_date && r.due_date === todayStr && r.status !== 'paid') { dueToday += r.amount; return; }
      if (r.status === 'open') { pending += r.amount; }
    });
    return { overdue, dueToday, pending, paid };
  }, [periodItems]);

  const filtered = useMemo(() => {
    return periodItems.filter(r => {
      if (filterStatus !== 'all' && r.status !== filterStatus) return false;
      if (filterSupplier !== 'all' && r.supplier_id !== filterSupplier) return false;
      if (filterCostCenter !== 'all' && r.cost_center_id !== filterCostCenter) return false;
      return true;
    }).sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'supplier') cmp = (supplierName(a.supplier_id)).localeCompare(supplierName(b.supplier_id));
      else if (sortKey === 'description') cmp = (a.description || '').localeCompare(b.description || '');
      else if (sortKey === 'installment_number') cmp = a.installment_number - b.installment_number;
      else if (sortKey === 'amount') cmp = a.amount - b.amount;
      else if (sortKey === 'due_date') cmp = (a.due_date || '').localeCompare(b.due_date || '');
      else if (sortKey === 'status') cmp = a.status.localeCompare(b.status);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [periodItems, filterStatus, filterSupplier, filterCostCenter, sortKey, sortDir, suppliers]);

  const statusLabel: Record<string, string> = { open: 'Em aberto', paid: 'Pago', overdue: 'Em atraso', partial: 'Baixa Parcial' };
  const statusClasses = (s: string) => s === 'paid' ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30' : s === 'overdue' ? 'bg-red-500/15 text-red-700 border-red-500/30' : s === 'partial' ? 'bg-blue-500/15 text-blue-700 border-blue-500/30' : 'bg-yellow-500/15 text-yellow-700 border-yellow-500/30';
  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const supplierName = (id: string | null) => suppliers.find(s => s.id === id)?.name || '-';

  const openMark = (id: string) => {
    setMarkId(id);
    setMarkPaymentDate(format(new Date(), 'yyyy-MM-dd'));
    setMarkPaymentMethod('pix');
    setMarkNotes('');
    setMarkDialog(true);
  };

  const handleMark = async () => {
    await supabase.from('accounts_payable').update({ status: 'paid', payment_date: markPaymentDate || null, notes: markPaymentMethod ? `${markPaymentMethod}${markNotes ? ' - ' + markNotes : ''}` : markNotes }).eq('id', markId);
    toast.success('Marcado como pago!');
    setMarkDialog(false);
    fetch_();
  };

  const handleManualSave = async () => {
    if (!activeCompany?.id) { toast.error('Aguarde a empresa carregar antes de salvar'); return; }
    if (!manualSupplierId) { toast.error('Fornecedor é obrigatório'); return; }
    if (!manualCostCenter) { toast.error('Centro de custo é obrigatório'); return; }
    if (manualAmount <= 0) { toast.error('Valor deve ser maior que zero'); return; }
    const records = [];
    if (manualIsInstallment && installmentRows.length >= 2) {
      for (let i = 0; i < installmentRows.length; i++) {
        records.push({
          supplier_id: manualSupplierId, description: manualDescription, cost_center_id: manualCostCenter,
          amount: installmentRows[i].amount, due_date: installmentRows[i].due_date, installment_number: i + 1,
          total_installments: installmentRows.length, status: 'open', origin_type: 'manual',
          ...(activeCompany?.id ? { empresa_id: activeCompany.id } : {}),
        });
      }
    } else {
      records.push({
        supplier_id: manualSupplierId, description: manualDescription, cost_center_id: manualCostCenter,
        amount: manualAmount, due_date: manualDueDate || format(new Date(), 'yyyy-MM-dd'), installment_number: 1,
        total_installments: 1, status: 'open', origin_type: 'manual',
        ...(activeCompany?.id ? { empresa_id: activeCompany.id } : {}),
      });
    }
    const { error } = await supabase.from('accounts_payable').insert(records);
    if (error) { toast.error('Erro ao salvar: ' + error.message); return; }
    toast.success(`${records.length} parcela(s) criada(s)!`);
    setManualDialog(false);
    setManualSupplierId(''); setManualDescription(''); setManualAmount(0); setManualDueDate(''); setManualInstallments(1); setManualIsInstallment(false); setManualCostCenter(''); setInstallmentRows([]);
    if (cameFromReconciliation) {
      const accountId = new URLSearchParams(window.location.search).get('account') || '';
      navigate(`/financial/reconciliation${accountId ? `?account=${accountId}` : ''}`);
    } else {
      fetch_();
    }
  };

  const updateInstallmentRow = (index: number, field: keyof InstallmentRow, value: string | number) => {
    setInstallmentRows(prev => prev.map((row, i) => i === index ? { ...row, [field]: value } : row));
  };

  const periodLabels: Record<PeriodFilter, string> = { day: 'Hoje', month: 'Este Mês', year: 'Este Ano' };

  const indicatorCards = [
    { label: 'Vencidos', value: indicators.overdue, icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10' },
    { label: 'Vencem Hoje', value: indicators.dueToday, icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-500/10' },
    { label: 'A Pagar', value: indicators.pending, icon: DollarSign, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Pagos', value: indicators.paid, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
  ];

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Contas a Pagar</h1>
          <Button onClick={() => setManualDialog(true)}><Plus className="h-4 w-4 mr-2" />Novo Lançamento</Button>
        </div>

        {/* Period selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground font-medium">Período:</span>
          {(['day', 'month', 'year'] as PeriodFilter[]).map(p => (
            <Button key={p} size="sm" variant={periodFilter === p ? 'default' : 'outline'} onClick={() => setPeriodFilter(p)}>
              {periodLabels[p]}
            </Button>
          ))}
        </div>

        {/* Indicator cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {indicatorCards.map(card => (
            <Card key={card.label} className="border">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`rounded-lg p-2.5 ${card.bg}`}>
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                  <p className={`text-lg font-bold ${card.color}`}>{fmt(card.value)}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="open">Em aberto</SelectItem>
              <SelectItem value="paid">Pago</SelectItem>
              <SelectItem value="overdue">Atrasado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterSupplier} onValueChange={setFilterSupplier}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Fornecedor" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
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
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('supplier')}><span className="inline-flex items-center">Fornecedor <SortIcon col="supplier" /></span></TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('description')}><span className="inline-flex items-center">Descrição <SortIcon col="description" /></span></TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('installment_number')}><span className="inline-flex items-center">Parcela <SortIcon col="installment_number" /></span></TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('amount')}><span className="inline-flex items-center">Valor <SortIcon col="amount" /></span></TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('due_date')}><span className="inline-flex items-center">Vencimento <SortIcon col="due_date" /></span></TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('status')}><span className="inline-flex items-center">Status <SortIcon col="status" /></span></TableHead>
                  <TableHead className="w-16">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum registro encontrado</TableCell></TableRow>
                ) : filtered.map(r => (
                  <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openEdit(r)}>
                    <TableCell className="font-medium">{supplierName(r.supplier_id)}</TableCell>
                    <TableCell>{r.description || '-'}</TableCell>
                    <TableCell>{r.installment_number}/{r.total_installments}</TableCell>
                    <TableCell>{fmt(r.amount)}</TableCell>
                    <TableCell>{r.due_date ? format(new Date(r.due_date + 'T12:00:00'), 'dd/MM/yyyy') : '-'}</TableCell>
                    <TableCell><Badge className={statusClasses(r.status)}>{statusLabel[r.status] || r.status}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={e => { e.stopPropagation(); openEdit(r); }} title="Editar">
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        {(r.status === 'open' || r.status === 'partial') && (
                          <Button size="icon" variant="ghost" onClick={e => { e.stopPropagation(); openMark(r.id); }} title="Marcar como pago">
                            <Check className="h-4 w-4 text-primary" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={markDialog} onOpenChange={setMarkDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Marcar como Pago</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Data do Pagamento</Label><Input type="date" value={markPaymentDate} onChange={e => setMarkPaymentDate(e.target.value)} /></div>
              <div>
                <Label>Forma de Pagamento</Label>
                <Select value={markPaymentMethod} onValueChange={setMarkPaymentMethod}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="transferencia">Transferência Bancária</SelectItem>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="credito">Cartão de Crédito</SelectItem>
                    <SelectItem value="debito">Cartão de Débito</SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="faturado">Faturado</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Observação</Label><Textarea value={markNotes} onChange={e => setMarkNotes(e.target.value)} /></div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setMarkDialog(false)}>Cancelar</Button>
                <Button onClick={handleMark}>Confirmar</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={manualDialog} onOpenChange={setManualDialog}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Novo Lançamento Manual</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Fornecedor *</Label>
                <Select value={manualSupplierId} onValueChange={setManualSupplierId}>
                  <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>{suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Descrição</Label><Input value={manualDescription} onChange={e => setManualDescription(e.target.value)} /></div>
              <div>
                <Label>Centro de Custo *</Label>
                <Select value={manualCostCenter} onValueChange={setManualCostCenter}>
                  <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>{costCenters.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Valor Total *</Label><Input value={manualAmount ? `R$ ${manualAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : ''} onChange={e => { const digits = e.target.value.replace(/[^\d]/g, ''); setManualAmount(parseInt(digits || '0', 10) / 100); }} placeholder="R$ 0,00" /></div>
              <div><Label>Data de Vencimento</Label><Input type="date" value={manualDueDate} onChange={e => setManualDueDate(e.target.value)} /></div>
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
              {manualIsInstallment && installmentRows.length >= 2 && (
                <Card>
                  <CardContent className="p-3">
                    <Table>
                      <TableHeader><TableRow><TableHead className="w-16">Parcela</TableHead><TableHead>Vencimento</TableHead><TableHead>Valor</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {installmentRows.map((row, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">{i + 1}ª</TableCell>
                            <TableCell><Input type="date" value={row.due_date} onChange={e => updateInstallmentRow(i, 'due_date', e.target.value)} className="w-40" /></TableCell>
                            <TableCell><Input value={row.amount ? `R$ ${row.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : ''} onChange={e => { const digits = e.target.value.replace(/[^\d]/g, ''); updateInstallmentRow(i, 'amount', parseInt(digits || '0', 10) / 100); }} placeholder="R$ 0,00" className="w-32" /></TableCell>
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

        {/* Edit dialog */}
        <Dialog open={editDialog} onOpenChange={setEditDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Editar Conta a Pagar</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Descrição</Label><Input value={editDescription} onChange={e => setEditDescription(e.target.value)} /></div>
              <div><Label>Valor</Label><Input type="number" step="0.01" value={editAmount} onChange={e => setEditAmount(Number(e.target.value))} /></div>
              <div><Label>Vencimento</Label><Input type="date" value={editDueDate} onChange={e => setEditDueDate(e.target.value)} /></div>
              <div><Label>Observação</Label><Textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} /></div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setEditDialog(false)}>Cancelar</Button>
                <Button onClick={handleEditSave}>Salvar</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}