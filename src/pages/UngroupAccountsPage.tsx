import { useState, useEffect, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, SortableTableHead } from '@/components/ui/table';
import { useTableSort } from '@/hooks/useTableSort';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Undo2 } from 'lucide-react';

interface GroupOption {
  group_id: string;
  created_at: string;
  notes: string;
  amount: number;
  origin_table: 'payable' | 'receivable';
  generated_id: string;
}

interface PayableRow {
  id: string;
  description: string;
  amount: number;
  due_date: string | null;
  supplier_name?: string;
}

interface ReceivableRow {
  id: string;
  description: string;
  amount: number;
  due_date: string | null;
  client_name: string;
}

export default function UngroupAccountsPage() {
  const { activeCompany } = useCompany();
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [payables, setPayables] = useState<PayableRow[]>([]);
  const [receivables, setReceivables] = useState<ReceivableRow[]>([]);
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [processing, setProcessing] = useState(false);

  const loadGroups = async () => {
    if (!activeCompany) return;
    const eid = activeCompany.id;

    // Find generated items (origin_type = 'agrupamento') with a group_id
    const [pRes, rRes, sRes] = await Promise.all([
      supabase.from('accounts_payable').select('id, group_id, notes, amount, created_at, supplier_id').eq('empresa_id', eid).eq('origin_type', 'agrupamento').not('group_id', 'is', null),
      supabase.from('receivables').select('id, group_id, notes, amount, created_at').eq('empresa_id', eid).eq('origin_type', 'agrupamento').not('group_id', 'is', null),
      supabase.from('suppliers').select('id, name').eq('empresa_id', eid),
    ]);

    const suppMap = new Map((sRes.data || []).map((s: any) => [s.id, s.name]));
    const opts: GroupOption[] = [];

    (pRes.data || []).forEach((p: any) => {
      if (p.group_id) {
        opts.push({
          group_id: p.group_id,
          created_at: p.created_at,
          notes: p.notes || '',
          amount: p.amount || 0,
          origin_table: 'payable',
          generated_id: p.id,
        });
      }
    });

    (rRes.data || []).forEach((r: any) => {
      if (r.group_id) {
        opts.push({
          group_id: r.group_id,
          created_at: r.created_at,
          notes: r.notes || '',
          amount: r.amount || 0,
          origin_table: 'receivable',
          generated_id: r.id,
        });
      }
    });

    // Sort by date desc
    opts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setGroups(opts);
  };

  const loadGroupItems = async (groupId: string) => {
    if (!activeCompany) return;
    const eid = activeCompany.id;

    const [pRes, rRes, sRes] = await Promise.all([
      supabase.from('accounts_payable').select('id, description, amount, due_date, supplier_id').eq('empresa_id', eid).eq('group_id', groupId).neq('origin_type', 'agrupamento'),
      supabase.from('receivables').select('id, description, amount, due_date, client_name').eq('empresa_id', eid).eq('group_id', groupId).neq('origin_type', 'agrupamento'),
      supabase.from('suppliers').select('id, name').eq('empresa_id', eid),
    ]);

    const suppMap = new Map((sRes.data || []).map((s: any) => [s.id, s.name]));

    setPayables((pRes.data || []).map((p: any) => ({
      id: p.id,
      description: p.description ?? '',
      amount: p.amount ?? 0,
      due_date: p.due_date,
      supplier_name: p.supplier_id ? suppMap.get(p.supplier_id) || '—' : '—',
    })));

    setReceivables((rRes.data || []).map((r: any) => ({
      id: r.id,
      description: r.description ?? '',
      amount: r.amount ?? 0,
      due_date: r.due_date,
      client_name: r.client_name ?? '—',
    })));
  };

  useEffect(() => { loadGroups(); }, [activeCompany]);

  useEffect(() => {
    if (selectedGroup) {
      loadGroupItems(selectedGroup);
    } else {
      setPayables([]);
      setReceivables([]);
    }
  }, [selectedGroup]);

  const selectedGroupInfo = groups.find(g => g.group_id === selectedGroup);

  const totalPayable = payables.reduce((s, p) => s + p.amount, 0);
  const totalReceivable = receivables.reduce((s, r) => s + r.amount, 0);

  const executeUngroup = async () => {
    if (!selectedGroup || !selectedGroupInfo) return;
    setProcessing(true);

    try {
      const payableIds = payables.map(p => p.id);
      const receivableIds = receivables.map(r => r.id);

      // Revert all items to "Em aberto" and clear group_id
      if (payableIds.length > 0) {
        await supabase.from('accounts_payable').update({ status: 'Em aberto', group_id: null } as any).in('id', payableIds);
      }
      if (receivableIds.length > 0) {
        await supabase.from('receivables').update({ status: 'Em aberto', group_id: null } as any).in('id', receivableIds);
      }

      // Delete the generated item
      if (selectedGroupInfo.origin_table === 'payable') {
        await supabase.from('accounts_payable').delete().eq('id', selectedGroupInfo.generated_id);
      } else {
        await supabase.from('receivables').delete().eq('id', selectedGroupInfo.generated_id);
      }

      toast.success('Contas desagrupadas com sucesso!');
      setSelectedGroup('');
      setPayables([]);
      setReceivables([]);
      setConfirmDialog(false);
      await loadGroups();
    } catch (e) {
      toast.error('Erro ao desagrupar contas');
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
            <Undo2 className="h-5 w-5" /> Desagrupar Contas
          </h1>
          <Button
            onClick={() => setConfirmDialog(true)}
            disabled={!selectedGroup}
            size="sm"
            variant="destructive"
          >
            <Undo2 className="h-4 w-4 mr-1" /> Desagrupar
          </Button>
        </div>

        {/* Group selector */}
        <Card>
          <CardContent className="py-3 space-y-2">
            <label className="text-sm font-medium">Selecione o agrupamento:</label>
            <Select value={selectedGroup} onValueChange={setSelectedGroup}>
              <SelectTrigger><SelectValue placeholder="Selecione um agrupamento..." /></SelectTrigger>
              <SelectContent>
                {groups.length === 0 && (
                  <SelectItem value="__none" disabled>Nenhum agrupamento encontrado</SelectItem>
                )}
                {groups.map(g => (
                  <SelectItem key={g.group_id} value={g.group_id}>
                    {format(new Date(g.created_at), 'dd/MM/yyyy HH:mm')} — {fmt(g.amount)} ({g.origin_table === 'payable' ? 'A Pagar' : 'A Receber'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedGroupInfo && (
              <p className="text-xs text-muted-foreground">{selectedGroupInfo.notes}</p>
            )}
          </CardContent>
        </Card>

        {/* Summary */}
        {selectedGroup && (payables.length > 0 || receivables.length > 0) && (
          <Card>
            <CardContent className="py-3 flex items-center justify-center gap-6 text-sm">
              <div>
                <span className="text-muted-foreground mr-1">Débitos:</span>
                <span className="font-semibold text-destructive">{fmt(-totalPayable)}</span>
                <span className="ml-1 text-muted-foreground">({payables.length})</span>
              </div>
              <div>
                <span className="text-muted-foreground mr-1">Créditos:</span>
                <span className="font-semibold text-emerald-600">{fmt(totalReceivable)}</span>
                <span className="ml-1 text-muted-foreground">({receivables.length})</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Items */}
        {selectedGroup && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Payables */}
            <Card>
              <CardContent className="p-3 space-y-2">
                <h2 className="font-semibold text-sm">Contas a Pagar <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300 text-xs ml-1">agrupado</Badge></h2>
                <div className="max-h-[50vh] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fornecedor</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>Vencimento</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payables.length === 0 && (
                        <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Nenhum</TableCell></TableRow>
                      )}
                      {payables.map(p => (
                        <TableRow key={p.id}>
                          <TableCell className="text-xs">{p.supplier_name}</TableCell>
                          <TableCell className="text-xs">{p.description}</TableCell>
                          <TableCell className="text-right text-xs font-medium text-destructive">{fmt(p.amount)}</TableCell>
                          <TableCell className="text-xs">{p.due_date ? format(new Date(p.due_date + 'T12:00:00'), 'dd/MM/yyyy') : '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Receivables */}
            <Card>
              <CardContent className="p-3 space-y-2">
                <h2 className="font-semibold text-sm">Contas a Receber <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300 text-xs ml-1">agrupado</Badge></h2>
                <div className="max-h-[50vh] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>Vencimento</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {receivables.length === 0 && (
                        <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Nenhum</TableCell></TableRow>
                      )}
                      {receivables.map(r => (
                        <TableRow key={r.id}>
                          <TableCell className="text-xs">{r.client_name}</TableCell>
                          <TableCell className="text-xs">{r.description}</TableCell>
                          <TableCell className="text-right text-xs font-medium text-emerald-600">{fmt(r.amount)}</TableCell>
                          <TableCell className="text-xs">{r.due_date ? format(new Date(r.due_date + 'T12:00:00'), 'dd/MM/yyyy') : '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Confirm dialog */}
      <Dialog open={confirmDialog} onOpenChange={setConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Desagrupamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p>Tem certeza que deseja desagrupar estas contas?</p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>{payables.length} lançamento(s) de Contas a Pagar voltarão ao status <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-300 text-xs">Em aberto</Badge></li>
              <li>{receivables.length} lançamento(s) de Contas a Receber voltarão ao status <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-300 text-xs">Em aberto</Badge></li>
              <li>O lançamento gerado pelo agrupamento ({selectedGroupInfo?.origin_table === 'payable' ? 'Contas a Pagar' : 'Contas a Receber'} de {selectedGroupInfo ? fmt(selectedGroupInfo.amount) : ''}) será <strong>excluído</strong></li>
            </ul>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={executeUngroup} disabled={processing}>
              {processing ? 'Processando...' : 'Confirmar Desagrupamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
