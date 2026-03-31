import { useState, useEffect, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Layers, ArrowRight } from 'lucide-react';

interface PayableRow {
  id: string;
  description: string;
  amount: number;
  due_date: string | null;
  status: string;
  supplier_id: string | null;
  supplier_name?: string;
}

interface ReceivableRow {
  id: string;
  description: string;
  amount: number;
  due_date: string | null;
  status: string;
  client_name: string;
}

interface SupplierOpt { id: string; name: string; }

export default function GroupAccountsPage() {
  const { activeCompany } = useCompany();
  const [payables, setPayables] = useState<PayableRow[]>([]);
  const [receivables, setReceivables] = useState<ReceivableRow[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOpt[]>([]);
  const [filterPayable, setFilterPayable] = useState<'pending' | 'paid'>('pending');
  const [filterReceivable, setFilterReceivable] = useState<'pending' | 'paid'>('pending');
  const [selectedPayables, setSelectedPayables] = useState<Set<string>>(new Set());
  const [selectedReceivables, setSelectedReceivables] = useState<Set<string>>(new Set());
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [targetSupplierId, setTargetSupplierId] = useState('');
  const [processing, setProcessing] = useState(false);

  const load = async () => {
    if (!activeCompany) return;
    const eid = activeCompany.id;

    const [pRes, rRes, sRes] = await Promise.all([
      supabase.from('accounts_payable').select('id, description, amount, due_date, status, supplier_id').eq('empresa_id', eid),
      supabase.from('accounts_receivable').select('id, description, amount, due_date, status, client_name').eq('empresa_id', eid),
      supabase.from('suppliers').select('id, name').eq('empresa_id', eid),
    ]);

    const suppMap = new Map((sRes.data || []).map(s => [s.id, s.name]));
    setSuppliers(sRes.data || []);

    setPayables((pRes.data || []).map(p => ({
      ...p,
      amount: p.amount ?? 0,
      description: p.description ?? '',
      status: p.status ?? 'Em aberto',
      supplier_name: p.supplier_id ? suppMap.get(p.supplier_id) || '—' : '—',
    })));

    setReceivables((rRes.data || []).map(r => ({
      ...r,
      amount: r.amount ?? 0,
      description: r.description ?? '',
      client_name: r.client_name ?? '—',
      status: r.status ?? 'Em aberto',
    })));
  };

  useEffect(() => { load(); }, [activeCompany]);

  const filteredPayables = useMemo(() => {
    if (filterPayable === 'pending') return payables.filter(p => p.status !== 'Pago' && p.status !== 'agrupado');
    return payables.filter(p => p.status === 'Pago');
  }, [payables, filterPayable]);

  const filteredReceivables = useMemo(() => {
    if (filterReceivable === 'pending') return receivables.filter(r => r.status !== 'Pago' && r.status !== 'agrupado');
    return receivables.filter(r => r.status === 'Pago');
  }, [receivables, filterReceivable]);

  const totalPayable = useMemo(() => {
    return [...selectedPayables].reduce((sum, id) => {
      const item = payables.find(p => p.id === id);
      return sum + (item?.amount || 0);
    }, 0);
  }, [selectedPayables, payables]);

  const totalReceivable = useMemo(() => {
    return [...selectedReceivables].reduce((sum, id) => {
      const item = receivables.find(r => r.id === id);
      return sum + (item?.amount || 0);
    }, 0);
  }, [selectedReceivables, receivables]);

  const balance = totalReceivable - totalPayable;
  const hasSelection = selectedPayables.size > 0 || selectedReceivables.size > 0;

  const togglePayable = (id: string) => {
    setSelectedPayables(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleReceivable = (id: string) => {
    setSelectedReceivables(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const openConfirm = () => {
    if (!hasSelection) { toast.error('Selecione ao menos um lançamento'); return; }
    if (selectedPayables.size === 0 && selectedReceivables.size === 0) return;
    setTargetSupplierId('');
    setConfirmDialog(true);
  };

  const executeGroup = async () => {
    if (!activeCompany) return;
    if (!targetSupplierId) { toast.error('Selecione o fornecedor/pagador'); return; }
    setProcessing(true);

    try {
      const allPayableIds = [...selectedPayables];
      const allReceivableIds = [...selectedReceivables];
      const today = format(new Date(), 'yyyy-MM-dd');
      const supplierName = suppliers.find(s => s.id === targetSupplierId)?.name || '';

      // Mark all selected as "agrupado"
      const updates: Promise<any>[] = [];
      if (allPayableIds.length > 0) {
        updates.push(
          supabase.from('accounts_payable').update({ status: 'agrupado' }).in('id', allPayableIds)
        );
      }
      if (allReceivableIds.length > 0) {
        updates.push(
          supabase.from('accounts_receivable').update({ status: 'agrupado' }).in('id', allReceivableIds)
        );
      }
      await Promise.all(updates);

      const absBalance = Math.abs(balance);
      const groupNote = `Agrupamento: ${allPayableIds.length} pagar + ${allReceivableIds.length} receber. Saldo: R$${balance.toFixed(2)}`;

      if (balance >= 0) {
        // Positive or zero → create receivable
        await supabase.from('accounts_receivable').insert({
          empresa_id: activeCompany.id,
          client_name: supplierName,
          description: `Agrupamento de contas`,
          amount: absBalance,
          due_date: today,
          status: 'Em aberto',
          notes: groupNote,
          installment_number: 1,
          origin_type: 'agrupamento',
        });
      } else {
        // Negative → create payable
        await supabase.from('accounts_payable').insert({
          empresa_id: activeCompany.id,
          supplier_id: targetSupplierId,
          description: `Agrupamento de contas`,
          amount: absBalance,
          due_date: today,
          status: 'Em aberto',
          notes: groupNote,
          installment_number: 1,
          total_installments: 1,
          origin_type: 'agrupamento',
        });
      }

      toast.success('Contas agrupadas com sucesso!');
      setSelectedPayables(new Set());
      setSelectedReceivables(new Set());
      setConfirmDialog(false);
      await load();
    } catch (e) {
      toast.error('Erro ao agrupar contas');
    } finally {
      setProcessing(false);
    }
  };

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <AppLayout>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Layers className="h-5 w-5" /> Agrupar Contas
          </h1>
          <Button onClick={openConfirm} disabled={!hasSelection} size="sm">
            <ArrowRight className="h-4 w-4 mr-1" /> Agrupar Selecionados
          </Button>
        </div>

        {/* Balance indicator */}
        {hasSelection && (
          <Card>
            <CardContent className="py-3 flex items-center justify-center gap-6 text-sm">
              <div>
                <span className="text-muted-foreground mr-1">Débitos:</span>
                <span className="font-semibold text-destructive">{fmt(-totalPayable)}</span>
              </div>
              <div>
                <span className="text-muted-foreground mr-1">Créditos:</span>
                <span className="font-semibold text-emerald-600">{fmt(totalReceivable)}</span>
              </div>
              <div className="border-l pl-4">
                <span className="text-muted-foreground mr-1">Saldo:</span>
                <span className={`font-bold text-base ${balance >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                  {fmt(balance)}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* LEFT: Contas a Pagar */}
          <Card>
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-sm">Contas a Pagar</h2>
                <Select value={filterPayable} onValueChange={(v: any) => { setFilterPayable(v); setSelectedPayables(new Set()); }}>
                  <SelectTrigger className="w-32 h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Em aberto</SelectItem>
                    <SelectItem value="paid">Pagos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="max-h-[60vh] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Vencimento</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayables.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Nenhum lançamento</TableCell></TableRow>
                    )}
                    {filteredPayables.map(p => (
                      <TableRow key={p.id} className={selectedPayables.has(p.id) ? 'bg-destructive/10' : ''}>
                        <TableCell>
                          <Checkbox checked={selectedPayables.has(p.id)} onCheckedChange={() => togglePayable(p.id)} />
                        </TableCell>
                        <TableCell className="text-xs">{p.supplier_name}</TableCell>
                        <TableCell className="text-xs">{p.description}</TableCell>
                        <TableCell className="text-right text-xs font-medium text-destructive">{fmt(p.amount)}</TableCell>
                        <TableCell className="text-xs">{p.due_date ? format(new Date(p.due_date + 'T12:00:00'), 'dd/MM/yyyy') : '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {selectedPayables.size > 0 && (
                <div className="text-right text-xs font-semibold text-destructive">
                  Subtotal: {fmt(-totalPayable)} ({selectedPayables.size} selecionado{selectedPayables.size > 1 ? 's' : ''})
                </div>
              )}
            </CardContent>
          </Card>

          {/* RIGHT: Contas a Receber */}
          <Card>
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-sm">Contas a Receber</h2>
                <Select value={filterReceivable} onValueChange={(v: any) => { setFilterReceivable(v); setSelectedReceivables(new Set()); }}>
                  <SelectTrigger className="w-32 h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Em aberto</SelectItem>
                    <SelectItem value="paid">Pagos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="max-h-[60vh] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Vencimento</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReceivables.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Nenhum lançamento</TableCell></TableRow>
                    )}
                    {filteredReceivables.map(r => (
                      <TableRow key={r.id} className={selectedReceivables.has(r.id) ? 'bg-emerald-500/10' : ''}>
                        <TableCell>
                          <Checkbox checked={selectedReceivables.has(r.id)} onCheckedChange={() => toggleReceivable(r.id)} />
                        </TableCell>
                        <TableCell className="text-xs">{r.client_name}</TableCell>
                        <TableCell className="text-xs">{r.description}</TableCell>
                        <TableCell className="text-right text-xs font-medium text-emerald-600">{fmt(r.amount)}</TableCell>
                        <TableCell className="text-xs">{r.due_date ? format(new Date(r.due_date + 'T12:00:00'), 'dd/MM/yyyy') : '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {selectedReceivables.size > 0 && (
                <div className="text-right text-xs font-semibold text-emerald-600">
                  Subtotal: {fmt(totalReceivable)} ({selectedReceivables.size} selecionado{selectedReceivables.size > 1 ? 's' : ''})
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Confirm dialog */}
      <Dialog open={confirmDialog} onOpenChange={setConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Agrupamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-muted-foreground">Contas a Pagar:</span>
                <span className="ml-2 font-semibold text-destructive">{fmt(-totalPayable)}</span>
                <span className="ml-1 text-muted-foreground">({selectedPayables.size})</span>
              </div>
              <div>
                <span className="text-muted-foreground">Contas a Receber:</span>
                <span className="ml-2 font-semibold text-emerald-600">{fmt(totalReceivable)}</span>
                <span className="ml-1 text-muted-foreground">({selectedReceivables.size})</span>
              </div>
            </div>
            <div className="border-t pt-3">
              <span className="text-muted-foreground">Saldo final:</span>
              <span className={`ml-2 font-bold text-lg ${balance >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                {fmt(balance)}
              </span>
            </div>
            <div className="border-t pt-3">
              <p className="text-muted-foreground mb-1">
                {balance >= 0
                  ? 'Será criado um Contas a Receber. Quem é o pagador?'
                  : 'Será criado um Contas a Pagar. Para qual fornecedor?'}
              </p>
              <Label className="text-xs">Fornecedor / Pagador</Label>
              <Select value={targetSupplierId} onValueChange={setTargetSupplierId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {suppliers.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              Todos os lançamentos selecionados receberão o status <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300 text-xs ml-1">agrupado</Badge> e não influenciarão nos totais.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(false)}>Cancelar</Button>
            <Button onClick={executeGroup} disabled={processing || !targetSupplierId}>
              {processing ? 'Processando...' : 'Confirmar Agrupamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
