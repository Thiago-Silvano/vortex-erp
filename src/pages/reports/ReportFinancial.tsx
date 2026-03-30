import { useState, useEffect, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import ReportFilters from '@/components/ReportFilters';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, subDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { useCompany } from '@/contexts/CompanyContext';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import { generateReportPdf } from '@/lib/generateReportPdf';

export default function ReportFinancial() {
  const { activeCompany } = useCompany();
  const [receivables, setReceivables] = useState<any[]>([]);
  const [payables, setPayables] = useState<any[]>([]);
  const [range, setRange] = useState({ start: format(subDays(new Date(), 30), 'yyyy-MM-dd'), end: format(new Date(), 'yyyy-MM-dd') });

  useEffect(() => {
    let qRec = supabase.from('receivables').select('*').gte('due_date', range.start).lte('due_date', range.end).order('due_date');
    let qPay = supabase.from('accounts_payable').select('*').gte('due_date', range.start).lte('due_date', range.end).order('due_date');
    if (activeCompany?.id) {
      qRec = qRec.eq('empresa_id', activeCompany.id);
      qPay = qPay.eq('empresa_id', activeCompany.id);
    }
    qRec.then(({ data }) => { if (data) setReceivables(data); });
    qPay.then(({ data }) => { if (data) setPayables(data); });
  }, [range, activeCompany?.id]);

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const totalReceber = receivables.reduce((s, r) => s + Number(r.amount || 0), 0);
  const totalRecebido = receivables.filter(r => r.status === 'received').reduce((s, r) => s + Number(r.amount || 0), 0);
  const totalPagar = payables.reduce((s, r) => s + Number(r.amount || 0), 0);
  const totalPago = payables.filter(r => r.status === 'paid').reduce((s, r) => s + Number(r.amount || 0), 0);
  const saldo = totalRecebido - totalPago;

  const chartData = useMemo(() => {
    const map = new Map<string, { receitas: number; despesas: number }>();
    receivables.forEach(r => {
      if (!r.due_date) return;
      const key = format(parseISO(r.due_date), 'MMM/yy', { locale: ptBR });
      const cur = map.get(key) || { receitas: 0, despesas: 0 };
      cur.receitas += Number(r.amount || 0);
      map.set(key, cur);
    });
    payables.forEach(r => {
      if (!r.due_date) return;
      const key = format(parseISO(r.due_date), 'MMM/yy', { locale: ptBR });
      const cur = map.get(key) || { receitas: 0, despesas: 0 };
      cur.despesas += Number(r.amount || 0);
      map.set(key, cur);
    });
    return Array.from(map.entries()).map(([name, data]) => ({ name, ...data }));
  }, [receivables, payables]);

  const allItems = [
    ...receivables.map(r => ({ ...r, tipo: 'Receita', entity: r.client_name || '-' })),
    ...payables.map(r => ({ ...r, tipo: 'Despesa', entity: '-' })),
  ].sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''));

  const exportPdf = () => {
    generateReportPdf({
      title: 'Relatório Financeiro',
      period: `${format(new Date(range.start + 'T12:00:00'), 'dd/MM/yyyy')} a ${format(new Date(range.end + 'T12:00:00'), 'dd/MM/yyyy')}`,
      headers: ['Data', 'Tipo', 'Cliente/Fornecedor', 'Descrição', 'Valor', 'Status'],
      rows: allItems.slice(0, 500).map(item => [
        item.due_date ? format(new Date(item.due_date + 'T12:00:00'), 'dd/MM/yyyy') : '-',
        item.tipo, item.entity, item.description || '-', fmt(Number(item.amount)), item.status || '-',
      ]),
      totals: [
        { label: 'Total a Receber', value: fmt(totalReceber) },
        { label: 'Total Recebido', value: fmt(totalRecebido) },
        { label: 'Total a Pagar', value: fmt(totalPagar) },
        { label: 'Total Pago', value: fmt(totalPago) },
        { label: 'Saldo', value: fmt(saldo) },
      ],
    });
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h1 className="text-2xl font-bold text-foreground">Relatório Financeiro</h1>
          <Button variant="outline" onClick={exportPdf}><FileDown className="h-4 w-4 mr-2" />Exportar PDF</Button>
        </div>
        <ReportFilters onChange={setRange} />

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Total a Receber</p><p className="text-lg font-bold">{fmt(totalReceber)}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Total Recebido</p><p className="text-lg font-bold text-primary">{fmt(totalRecebido)}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Total a Pagar</p><p className="text-lg font-bold">{fmt(totalPagar)}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Total Pago</p><p className="text-lg font-bold text-destructive">{fmt(totalPago)}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Saldo</p><p className={`text-lg font-bold ${saldo >= 0 ? 'text-primary' : 'text-destructive'}`}>{fmt(saldo)}</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Receitas vs Despesas por Mês</CardTitle></CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Legend />
                  <Bar dataKey="receitas" name="Receitas" fill="hsl(var(--primary))" />
                  <Bar dataKey="despesas" name="Despesas" fill="hsl(var(--destructive))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Cliente/Fornecedor</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allItems.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum registro</TableCell></TableRow>
                ) : allItems.slice(0, 100).map((item, i) => (
                  <TableRow key={i}>
                    <TableCell>{item.due_date ? format(new Date(item.due_date + 'T12:00:00'), 'dd/MM/yyyy') : '-'}</TableCell>
                    <TableCell><Badge variant={item.tipo === 'Receita' ? 'default' : 'destructive'}>{item.tipo}</Badge></TableCell>
                    <TableCell>{item.entity}</TableCell>
                    <TableCell>{item.description || '-'}</TableCell>
                    <TableCell className="font-medium">{fmt(Number(item.amount))}</TableCell>
                    <TableCell>{item.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
