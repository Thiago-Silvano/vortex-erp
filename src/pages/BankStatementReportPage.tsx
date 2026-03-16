import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Download, FileText, Filter, Banknote, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';

interface BankAccount { id: string; bank_name: string; account_number: string; account_digit: string; agency: string; color: string; initial_balance: number; }
interface Transaction {
  id: string; transaction_date: string; description: string; amount: number;
  transaction_type: string; reconciliation_status: string; reconciliation_note: string;
  reference_number: string; origin: string; cost_center_id: string | null;
  client_name: string; category: string;
}
interface CostCenter { id: string; name: string; }

const statusLabels: Record<string, string> = {
  pending: 'Pendente', reconciled: 'Conciliado', partial: 'Parcial', ignored: 'Ignorado',
};
const originLabels: Record<string, string> = {
  ofx: 'OFX', manual: 'Manual', payable: 'Contas a Pagar', receivable: 'Contas a Receber',
  transfer: 'Transferência', adjustment: 'Ajuste',
};

export default function BankStatementReportPage() {
  const { activeCompany } = useCompany();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterOrigin, setFilterOrigin] = useState('all');
  const [filterCostCenter, setFilterCostCenter] = useState('all');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'full' | 'expenses' | 'revenue' | 'consolidated'>('full');

  useEffect(() => {
    if (!activeCompany) return;
    supabase.from('bank_accounts').select('id, bank_name, account_number, account_digit, agency, color, initial_balance')
      .eq('empresa_id', activeCompany.id).order('bank_name')
      .then(({ data }) => setAccounts((data as any[]) || []));
    supabase.from('cost_centers').select('id, name').eq('empresa_id', activeCompany.id).eq('status', 'active')
      .then(({ data }) => setCostCenters((data as any[]) || []));
  }, [activeCompany]);

  const loadReport = useCallback(async () => {
    if (!selectedAccount || !activeCompany) return;
    setLoading(true);
    let query = supabase.from('bank_transactions').select('*')
      .eq('bank_account_id', selectedAccount).eq('empresa_id', activeCompany.id)
      .gte('transaction_date', dateFrom).lte('transaction_date', dateTo)
      .order('transaction_date').order('created_at');

    if (filterStatus !== 'all') query = query.eq('reconciliation_status', filterStatus);
    if (filterOrigin !== 'all') query = query.eq('origin', filterOrigin);
    if (filterCostCenter !== 'all') query = query.eq('cost_center_id', filterCostCenter);

    const { data } = await query.limit(2000);
    const txs = (data as any[]) || [];

    // Enrich transactions with cost_center_id from reconciled receivables/payables
    const reconciledRecIds = txs.filter(t => !t.cost_center_id && t.reconciled_with_id && t.reconciled_with_type === 'receivable').map(t => t.reconciled_with_id);
    const reconciledPayIds = txs.filter(t => !t.cost_center_id && t.reconciled_with_id && t.reconciled_with_type === 'payable').map(t => t.reconciled_with_id);

    const ccMap = new Map<string, string | null>();

    if (reconciledRecIds.length > 0) {
      const { data: recs } = await supabase.from('receivables').select('id, cost_center_id').in('id', reconciledRecIds);
      recs?.forEach(r => ccMap.set(r.id, r.cost_center_id));
    }
    if (reconciledPayIds.length > 0) {
      const { data: pays } = await supabase.from('accounts_payable').select('id, cost_center_id').in('id', reconciledPayIds);
      pays?.forEach(p => ccMap.set(p.id, p.cost_center_id));
    }

    const enriched = txs.map(t => {
      if (!t.cost_center_id && t.reconciled_with_id && ccMap.has(t.reconciled_with_id)) {
        return { ...t, cost_center_id: ccMap.get(t.reconciled_with_id) };
      }
      return t;
    });

    setTransactions(enriched);
    setLoading(false);
  }, [selectedAccount, activeCompany, dateFrom, dateTo, filterStatus, filterOrigin, filterCostCenter]);

  useEffect(() => { loadReport(); }, [loadReport]);

  const fmt = (v: number) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const account = accounts.find(a => a.id === selectedAccount);

  const totalCredits = transactions.filter(t => Number(t.amount) > 0).reduce((s, t) => s + Number(t.amount), 0);
  const totalDebits = transactions.filter(t => Number(t.amount) < 0).reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
  const periodBalance = totalCredits - totalDebits;
  const reconciledBalance = transactions.filter(t => t.reconciliation_status === 'reconciled')
    .reduce((s, t) => s + Number(t.amount), 0);
  const pendingBalance = transactions.filter(t => t.reconciliation_status === 'pending')
    .reduce((s, t) => s + Number(t.amount), 0);

  // Running balance
  const initialBal = account ? Number(account.initial_balance) : 0;
  let runningBalance = initialBal;
  const txWithBalance = transactions.map(t => {
    runningBalance += Number(t.amount);
    return { ...t, runningBalance };
  });

  // Cost center summary
  const costCenterSummary = costCenters.map(cc => {
    const ccTxs = transactions.filter(t => t.cost_center_id === cc.id);
    const credits = ccTxs.filter(t => Number(t.amount) > 0).reduce((s, t) => s + Number(t.amount), 0);
    const debits = ccTxs.filter(t => Number(t.amount) < 0).reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
    return { name: cc.name, credits, debits, net: credits - debits, count: ccTxs.length };
  }).filter(cc => cc.count > 0);

  // Unclassified
  const unclassified = transactions.filter(t => !t.cost_center_id);
  if (unclassified.length > 0) {
    const credits = unclassified.filter(t => Number(t.amount) > 0).reduce((s, t) => s + Number(t.amount), 0);
    const debits = unclassified.filter(t => Number(t.amount) < 0).reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
    costCenterSummary.push({ name: 'Sem classificação', credits, debits, net: credits - debits, count: unclassified.length });
  }

  // Export CSV
  const exportCSV = () => {
    const header = 'Data,Descrição,Documento,Entrada,Saída,Saldo,Status,Origem\n';
    let bal = initialBal;
    const rows = transactions.map(t => {
      bal += Number(t.amount);
      const credit = Number(t.amount) > 0 ? Number(t.amount).toFixed(2) : '';
      const debit = Number(t.amount) < 0 ? Math.abs(Number(t.amount)).toFixed(2) : '';
      return `${t.transaction_date},"${t.description}",${t.reference_number},${credit},${debit},${bal.toFixed(2)},${statusLabels[t.reconciliation_status] || ''},${originLabels[t.origin] || t.origin}`;
    }).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `extrato_${account?.bank_name || 'conta'}_${dateFrom}_${dateTo}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">Relatório de Conta Corrente</h1>
            <p className="text-sm text-muted-foreground">Movimentação detalhada e resumo por centro de custo</p>
          </div>
          {transactions.length > 0 && (
            <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
              <Download className="h-4 w-4" />Exportar CSV
            </Button>
          )}
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="min-w-[180px]">
              <Label className="text-xs">Conta</Label>
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {accounts.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.bank_name} - {a.account_number}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">De</Label><Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-9 w-[140px]" /></div>
            <div><Label className="text-xs">Até</Label><Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-9 w-[140px]" /></div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-9 w-[120px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="reconciled">Conciliado</SelectItem>
                  <SelectItem value="ignored">Ignorado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Origem</Label>
              <Select value={filterOrigin} onValueChange={setFilterOrigin}>
                <SelectTrigger className="h-9 w-[120px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="ofx">OFX</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Centro de Custo</Label>
              <Select value={filterCostCenter} onValueChange={setFilterCostCenter}>
                <SelectTrigger className="h-9 w-[150px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {costCenters.map(cc => <SelectItem key={cc.id} value={cc.id}>{cc.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Totals */}
        {selectedAccount && transactions.length > 0 && (
          <>
            {/* Header */}
            {account && (
              <div className="bg-card border rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-4 w-4 rounded-full" style={{ backgroundColor: account.color }} />
                  <span className="font-semibold">{account.bank_name}</span>
                  <span className="text-sm text-muted-foreground">Ag: {account.agency} | Cc: {account.account_number}{account.account_digit ? `-${account.account_digit}` : ''}</span>
                </div>
                <p className="text-xs text-muted-foreground">Período: {new Date(dateFrom + 'T12:00:00').toLocaleDateString('pt-BR')} a {new Date(dateTo + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Card className="p-3"><p className="text-xs text-muted-foreground">Total Entradas</p><p className="text-lg font-bold text-emerald-600">{fmt(totalCredits)}</p></Card>
              <Card className="p-3"><p className="text-xs text-muted-foreground">Total Saídas</p><p className="text-lg font-bold text-red-600">{fmt(totalDebits)}</p></Card>
              <Card className="p-3"><p className="text-xs text-muted-foreground">Saldo Período</p><p className={`text-lg font-bold ${periodBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmt(periodBalance)}</p></Card>
              <Card className="p-3"><p className="text-xs text-muted-foreground">Saldo Conciliado</p><p className="text-lg font-bold">{fmt(reconciledBalance)}</p></Card>
              <Card className="p-3"><p className="text-xs text-muted-foreground">Pendente Conciliação</p><p className="text-lg font-bold text-amber-600">{fmt(pendingBalance)}</p></Card>
            </div>

            {/* Transactions table */}
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Data</TableHead>
                        <TableHead className="text-xs">Descrição</TableHead>
                        <TableHead className="text-xs">Documento</TableHead>
                        <TableHead className="text-xs text-right">Entrada</TableHead>
                        <TableHead className="text-xs text-right">Saída</TableHead>
                        <TableHead className="text-xs text-right">Saldo</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs">Origem</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {txWithBalance.map(t => (
                        <TableRow key={t.id}>
                          <TableCell className="text-xs whitespace-nowrap">
                            {t.transaction_date ? new Date(t.transaction_date + 'T12:00:00').toLocaleDateString('pt-BR') : ''}
                          </TableCell>
                          <TableCell className="text-xs max-w-[250px] truncate">{t.description}</TableCell>
                          <TableCell className="text-xs">{t.reference_number}</TableCell>
                          <TableCell className="text-xs text-right text-emerald-600 font-medium">
                            {Number(t.amount) > 0 ? fmt(Number(t.amount)) : ''}
                          </TableCell>
                          <TableCell className="text-xs text-right text-red-600 font-medium">
                            {Number(t.amount) < 0 ? fmt(Math.abs(Number(t.amount))) : ''}
                          </TableCell>
                          <TableCell className={`text-xs text-right font-medium ${t.runningBalance >= 0 ? 'text-foreground' : 'text-red-600'}`}>
                            {fmt(t.runningBalance)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] ${
                              t.reconciliation_status === 'reconciled' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              t.reconciliation_status === 'ignored' ? 'bg-gray-50 text-gray-600 border-gray-200' :
                              'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              {statusLabels[t.reconciliation_status] || t.reconciliation_status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{originLabels[t.origin] || t.origin}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Cost center summary */}
            {costCenterSummary.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />Resumo por Centro de Custo
                    </CardTitle>
                    <div className="flex gap-1">
                      {(['full', 'expenses', 'revenue', 'consolidated'] as const).map(mode => (
                        <Button key={mode} variant={viewMode === mode ? 'default' : 'ghost'} size="sm" className="text-xs h-7"
                          onClick={() => setViewMode(mode)}>
                          {mode === 'full' ? 'Completo' : mode === 'expenses' ? 'Despesas' : mode === 'revenue' ? 'Receitas' : 'Consolidado'}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Centro de Custo</TableHead>
                        {(viewMode === 'full' || viewMode === 'revenue' || viewMode === 'consolidated') && <TableHead className="text-xs text-right">Entradas</TableHead>}
                        {(viewMode === 'full' || viewMode === 'expenses' || viewMode === 'consolidated') && <TableHead className="text-xs text-right">Saídas</TableHead>}
                        {(viewMode === 'full' || viewMode === 'consolidated') && <TableHead className="text-xs text-right">Saldo</TableHead>}
                        <TableHead className="text-xs text-right">Lançamentos</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {costCenterSummary.map(cc => (
                        <TableRow key={cc.name}>
                          <TableCell className="text-xs font-medium">{cc.name}</TableCell>
                          {(viewMode === 'full' || viewMode === 'revenue' || viewMode === 'consolidated') && (
                            <TableCell className="text-xs text-right text-emerald-600">{fmt(cc.credits)}</TableCell>
                          )}
                          {(viewMode === 'full' || viewMode === 'expenses' || viewMode === 'consolidated') && (
                            <TableCell className="text-xs text-right text-red-600">{fmt(cc.debits)}</TableCell>
                          )}
                          {(viewMode === 'full' || viewMode === 'consolidated') && (
                            <TableCell className={`text-xs text-right font-medium ${cc.net >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                              {fmt(cc.net)}
                            </TableCell>
                          )}
                          <TableCell className="text-xs text-right">{cc.count}</TableCell>
                        </TableRow>
                      ))}
                      {/* Totals row */}
                      <TableRow className="border-t-2 font-semibold">
                        <TableCell className="text-xs">TOTAL</TableCell>
                        {(viewMode === 'full' || viewMode === 'revenue' || viewMode === 'consolidated') && (
                          <TableCell className="text-xs text-right text-emerald-600">{fmt(costCenterSummary.reduce((s, cc) => s + cc.credits, 0))}</TableCell>
                        )}
                        {(viewMode === 'full' || viewMode === 'expenses' || viewMode === 'consolidated') && (
                          <TableCell className="text-xs text-right text-red-600">{fmt(costCenterSummary.reduce((s, cc) => s + cc.debits, 0))}</TableCell>
                        )}
                        {(viewMode === 'full' || viewMode === 'consolidated') && (
                          <TableCell className="text-xs text-right">{fmt(costCenterSummary.reduce((s, cc) => s + cc.net, 0))}</TableCell>
                        )}
                        <TableCell className="text-xs text-right">{costCenterSummary.reduce((s, cc) => s + cc.count, 0)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {selectedAccount && transactions.length === 0 && !loading && (
          <Card className="p-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">Nenhuma movimentação encontrada no período</p>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
