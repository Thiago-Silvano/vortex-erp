import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Download, FileText, Filter, Banknote, TrendingUp, TrendingDown, BarChart3, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface BankAccount { id: string; bank_name: string; account_number: string; account_digit: string; agency: string; color: string; initial_balance: number; }
interface Transaction {
  id: string; transaction_date: string; description: string; amount: number;
  transaction_type: string; reconciliation_status: string; reconciliation_note: string;
  reference_number: string; origin: string; cost_center_id: string | null;
  client_name: string; category: string;
  reconciled_with_type?: string | null; reconciled_with_id?: string | null;
  resolved_cost_center_id?: string | null;
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
  const [showUnclassified, setShowUnclassified] = useState(false);
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [editingCcId, setEditingCcId] = useState<string>('');
  const [savingTxId, setSavingTxId] = useState<string | null>(null);

  useEffect(() => {
    if (!activeCompany) return;
    supabase.from('bank_accounts').select('id, bank_name, account_number, account_digit, agency, color, initial_balance')
      .eq('empresa_id', activeCompany.id).order('bank_name')
      .then(({ data }) => setAccounts((data as any[]) || []));
    supabase.from('cost_centers').select('id, name').eq('status', 'active')
      .or(`empresa_id.eq.${activeCompany.id},empresa_id.is.null`)
      .order('name')
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

    const { data } = await query.limit(2000);
    const txs = ((data as any[]) || []) as Transaction[];

    const reconciledRecIds = [...new Set(txs
      .filter(t => !t.cost_center_id && t.reconciled_with_id && ['receivable', 'receber'].includes(t.reconciled_with_type || ''))
      .map(t => t.reconciled_with_id as string))];
    const reconciledPayIds = [...new Set(txs
      .filter(t => !t.cost_center_id && t.reconciled_with_id && ['payable', 'pagar'].includes(t.reconciled_with_type || ''))
      .map(t => t.reconciled_with_id as string))];

    const ccMap = new Map<string, string | null>();

    const [{ data: recs }, { data: pays }] = await Promise.all([
      reconciledRecIds.length > 0
        ? supabase.from('receivables').select('id, cost_center_id').in('id', reconciledRecIds)
        : Promise.resolve({ data: [] as any[] }),
      reconciledPayIds.length > 0
        ? supabase.from('accounts_payable').select('id, cost_center_id').in('id', reconciledPayIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    recs?.forEach(r => ccMap.set(r.id, r.cost_center_id));
    pays?.forEach(p => ccMap.set(p.id, p.cost_center_id));

    const enriched = txs.map(t => ({
      ...t,
      resolved_cost_center_id: t.cost_center_id ?? (t.reconciled_with_id ? (ccMap.get(t.reconciled_with_id) ?? null) : null),
    }));

    const filtered = filterCostCenter !== 'all'
      ? enriched.filter(t => t.resolved_cost_center_id === filterCostCenter)
      : enriched;

    setTransactions(filtered);
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
  const getResolvedCostCenterId = (t: Transaction) => t.resolved_cost_center_id ?? t.cost_center_id ?? null;

  const costCenterSummary = costCenters.map(cc => {
    const ccTxs = transactions.filter(t => getResolvedCostCenterId(t) === cc.id);
    const credits = ccTxs.filter(t => Number(t.amount) > 0).reduce((s, t) => s + Number(t.amount), 0);
    const debits = ccTxs.filter(t => Number(t.amount) < 0).reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
    return { name: cc.name, credits, debits, net: credits - debits, count: ccTxs.length };
  }).filter(cc => cc.count > 0);

  const unclassified = transactions.filter(t => !getResolvedCostCenterId(t));
  if (unclassified.length > 0) {
    const credits = unclassified.filter(t => Number(t.amount) > 0).reduce((s, t) => s + Number(t.amount), 0);
    const debits = unclassified.filter(t => Number(t.amount) < 0).reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
    costCenterSummary.push({ name: 'Sem classificação', credits, debits, net: credits - debits, count: unclassified.length });
  }

  // Save cost center for a transaction
  const handleSaveCostCenter = async (txId: string, costCenterId: string) => {
    setSavingTxId(txId);
    // If the transaction was ignored and now receives a cost center, mark as reconciled
    const tx = transactions.find(t => t.id === txId);
    const updatePayload: any = { cost_center_id: costCenterId };
    if (tx && tx.reconciliation_status === 'ignored' && costCenterId) {
      updatePayload.reconciliation_status = 'reconciled';
      updatePayload.reconciliation_note = tx.reconciliation_note ? `${tx.reconciliation_note} | Reclassificado via centro de custo` : 'Reclassificado via centro de custo';
    }
    const { error } = await supabase.from('bank_transactions').update(updatePayload).eq('id', txId);
    if (error) {
      toast.error('Erro ao salvar centro de custo');
    } else {
      toast.success('Centro de custo atualizado!');
      setTransactions(prev => prev.map(t => t.id === txId ? { 
        ...t, 
        cost_center_id: costCenterId, 
        resolved_cost_center_id: costCenterId,
        ...(t.reconciliation_status === 'ignored' && costCenterId ? { reconciliation_status: 'reconciled' } : {}),
      } : t));
      setEditingTxId(null);
      setEditingCcId('');
    }
    setSavingTxId(null);
  };

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

  // Export PDF
  const exportPDF = () => {
    const pdf = new jsPDF({ orientation: 'landscape' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    let y = 15;

    // Header
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Extrato de conta-corrente', pageWidth / 2, y, { align: 'center' });
    y += 7;

    if (account) {
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${account.bank_name} — Ag: ${account.agency} | Cc: ${account.account_number}${account.account_digit ? '-' + account.account_digit : ''}`, pageWidth / 2, y, { align: 'center' });
      y += 5;
    }

    const fmtDate = (d: string) => {
      const parts = d.split('-');
      return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : d;
    };

    pdf.setFontSize(8);
    pdf.text(`Período: ${fmtDate(dateFrom)} a ${fmtDate(dateTo)}  |  Gerado em: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`, pageWidth / 2, y, { align: 'center' });
    y += 6;

    // Summary KPIs
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Resumo Financeiro', 14, y);
    y += 5;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    const summaryLines = [
      `Total Entradas: ${fmt(totalCredits)}  |  Total Saídas: ${fmt(totalDebits)}  |  Saldo Período: ${fmt(periodBalance)}`,
      `Saldo Conciliado: ${fmt(reconciledBalance)}  |  Pendente Conciliação: ${fmt(pendingBalance)}`,
    ];
    summaryLines.forEach(line => { pdf.text(line, 14, y); y += 4.5; });
    y += 3;

    // Transactions table
    let bal = initialBal;
    const tableData = transactions.map(t => {
      bal += Number(t.amount);
      const credit = Number(t.amount) > 0 ? fmt(Number(t.amount)) : '';
      const debit = Number(t.amount) < 0 ? fmt(Math.abs(Number(t.amount))) : '';
      return [
        fmtDate(t.transaction_date),
        t.description.substring(0, 45),
        t.reference_number || '',
        credit,
        debit,
        fmt(bal),
        statusLabels[t.reconciliation_status] || t.reconciliation_status,
        originLabels[t.origin] || t.origin,
      ];
    });

    autoTable(pdf, {
      startY: y,
      head: [['Data', 'Descrição', 'Doc', 'Entrada', 'Saída', 'Saldo', 'Status', 'Origem']],
      body: tableData,
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [30, 30, 60], textColor: 255, fontSize: 7 },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 60 },
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' },
      },
      theme: 'grid',
    });

    // Cost Center Summary
    if (costCenterSummary.length > 0) {
      const finalY = (pdf as any).lastAutoTable?.finalY || y + 20;
      let ccY = finalY + 10;
      
      if (ccY > pdf.internal.pageSize.getHeight() - 40) {
        pdf.addPage();
        ccY = 15;
      }

      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Resumo por Centro de Custo', 14, ccY);
      ccY += 5;

      const ccTableData = costCenterSummary.map(cc => [
        cc.name,
        fmt(cc.credits),
        fmt(cc.debits),
        fmt(cc.net),
        cc.count.toString(),
      ]);

      // Totals
      ccTableData.push([
        'TOTAL',
        fmt(costCenterSummary.reduce((s, cc) => s + cc.credits, 0)),
        fmt(costCenterSummary.reduce((s, cc) => s + cc.debits, 0)),
        fmt(costCenterSummary.reduce((s, cc) => s + cc.net, 0)),
        costCenterSummary.reduce((s, cc) => s + cc.count, 0).toString(),
      ]);

      autoTable(pdf, {
        startY: ccY,
        head: [['Centro de Custo', 'Entradas', 'Saídas', 'Saldo', 'Lançamentos']],
        body: ccTableData,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [30, 30, 60], textColor: 255, fontSize: 8 },
        columnStyles: {
          1: { halign: 'right' },
          2: { halign: 'right' },
          3: { halign: 'right' },
          4: { halign: 'right' },
        },
        theme: 'grid',
        didParseCell: (data) => {
          // Bold the totals row
          if (data.row.index === ccTableData.length - 1) {
            data.cell.styles.fontStyle = 'bold';
          }
        },
      });
    }

    pdf.save(`extrato_${account?.bank_name || 'conta'}_${dateFrom}_${dateTo}.pdf`);
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">Extrato de conta-corrente</h1>
            <p className="text-sm text-muted-foreground">Movimentação detalhada e resumo por centro de custo</p>
          </div>
          {transactions.length > 0 && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportPDF} className="gap-2">
                <FileText className="h-4 w-4" />Exportar PDF
              </Button>
              <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
                <Download className="h-4 w-4" />Exportar CSV
              </Button>
            </div>
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
                              t.reconciliation_status === 'ignored' ? 'bg-muted text-muted-foreground border-border' :
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
                        <TableRow 
                          key={cc.name} 
                          className={cc.name === 'Sem classificação' ? 'cursor-pointer hover:bg-accent/50 transition-colors' : ''}
                          onClick={() => {
                            if (cc.name === 'Sem classificação') setShowUnclassified(true);
                          }}
                        >
                          <TableCell className="text-xs font-medium">
                            {cc.name === 'Sem classificação' ? (
                              <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                                <AlertCircle className="h-3.5 w-3.5" />
                                {cc.name}
                                <span className="text-[10px] text-muted-foreground">(clique para classificar)</span>
                              </span>
                            ) : cc.name}
                          </TableCell>
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

      {/* Unclassified transactions dialog */}
      <Dialog open={showUnclassified} onOpenChange={setShowUnclassified}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Transações Sem Classificação
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Clique em uma transação para atribuir um centro de custo.
          </p>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Data</TableHead>
                  <TableHead className="text-xs">Descrição</TableHead>
                  <TableHead className="text-xs text-right">Valor</TableHead>
                  <TableHead className="text-xs">Centro de Custo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.filter(t => !getResolvedCostCenterId(t)).map(t => (
                  <TableRow key={t.id} className="group">
                    <TableCell className="text-xs whitespace-nowrap">
                      {t.transaction_date ? new Date(t.transaction_date + 'T12:00:00').toLocaleDateString('pt-BR') : ''}
                    </TableCell>
                    <TableCell className="text-xs max-w-[250px]">{t.description}</TableCell>
                    <TableCell className={`text-xs text-right font-medium ${Number(t.amount) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {fmt(Math.abs(Number(t.amount)))}
                    </TableCell>
                    <TableCell className="text-xs">
                      {editingTxId === t.id ? (
                        <div className="flex items-center gap-1.5">
                          <Select value={editingCcId} onValueChange={setEditingCcId}>
                            <SelectTrigger className="h-7 text-xs w-[160px]"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                            <SelectContent>
                              {costCenters.map(cc => (
                                <SelectItem key={cc.id} value={cc.id} className="text-xs">{cc.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button 
                            size="sm" 
                            className="h-7 text-xs px-2" 
                            disabled={!editingCcId || savingTxId === t.id}
                            onClick={() => handleSaveCostCenter(t.id, editingCcId)}
                          >
                            Salvar
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => { setEditingTxId(null); setEditingCcId(''); }}>
                            ✕
                          </Button>
                        </div>
                      ) : (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-7 text-xs gap-1" 
                          onClick={() => { setEditingTxId(t.id); setEditingCcId(''); }}
                        >
                          Classificar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {transactions.filter(t => !getResolvedCostCenterId(t)).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-8">
                      Todas as transações já foram classificadas! 🎉
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
