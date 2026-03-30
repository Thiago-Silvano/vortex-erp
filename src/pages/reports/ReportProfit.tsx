import { useState, useEffect, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import ReportFilters from '@/components/ReportFilters';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays } from 'date-fns';
import { useCompany } from '@/contexts/CompanyContext';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import { generateReportPdf } from '@/lib/generateReportPdf';

export default function ReportProfit() {
  const { activeCompany } = useCompany();
  const [sales, setSales] = useState<any[]>([]);
  const [range, setRange] = useState({ start: format(subDays(new Date(), 30), 'yyyy-MM-dd'), end: format(new Date(), 'yyyy-MM-dd') });

  useEffect(() => {
    let q = supabase.from('sales').select('*').eq('status', 'active').gte('sale_date', range.start).lte('sale_date', range.end).order('sale_date', { ascending: false });
    if (activeCompany?.id) q = q.eq('empresa_id', activeCompany.id);
    q.then(({ data }) => { if (data) setSales(data); });
  }, [range, activeCompany?.id]);

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const totalVenda = useMemo(() => sales.reduce((s, v) => s + Number(v.total_sale || 0), 0), [sales]);
  const totalLucro = useMemo(() => sales.reduce((s, v) => s + Number(v.net_profit || 0), 0), [sales]);

  const chartData = sales.map((s) => ({
    name: `${s.client_name?.slice(0, 12) || 'Venda'}`,
    lucro: Number(s.net_profit || 0),
  }));

  const exportPdf = () => {
    generateReportPdf({
      title: 'Relatório de Lucro por Venda',
      period: `${format(new Date(range.start + 'T12:00:00'), 'dd/MM/yyyy')} a ${format(new Date(range.end + 'T12:00:00'), 'dd/MM/yyyy')}`,
      headers: ['Código', 'Cliente', 'Valor Venda', 'Custo Fornecedor', 'Comissão', 'Taxa Cartão', 'Lucro Líquido'],
      rows: sales.map(s => [
        s.id.slice(0, 8),
        s.client_name || '-',
        fmt(Number(s.total_sale)),
        fmt(Number(s.total_supplier_cost)),
        fmt(Number(s.commission_value)),
        fmt(Number(s.card_fee_value)),
        fmt(Number(s.net_profit)),
      ]),
      totals: [
        { label: 'Total de Vendas', value: fmt(totalVenda) },
        { label: 'Lucro Líquido Total', value: fmt(totalLucro) },
      ],
    });
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h1 className="text-2xl font-bold text-foreground">Relatório de Lucro por Venda</h1>
          <Button variant="outline" onClick={exportPdf}><FileDown className="h-4 w-4 mr-2" />Exportar PDF</Button>
        </div>
        <ReportFilters onChange={setRange} />

        <div className="grid grid-cols-2 gap-4">
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Total de Vendas</p><p className="text-xl font-bold text-foreground">{fmt(totalVenda)}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Lucro Líquido Total</p><p className={`text-xl font-bold ${totalLucro >= 0 ? 'text-primary' : 'text-destructive'}`}>{fmt(totalLucro)}</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Lucro por Venda</CardTitle></CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Bar dataKey="lucro" name="Lucro Líquido" fill="hsl(var(--primary))" />
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
                  <TableHead>Código</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Valor Venda</TableHead>
                  <TableHead>Custo Fornecedor</TableHead>
                  <TableHead>Comissão</TableHead>
                  <TableHead>Taxa Cartão</TableHead>
                  <TableHead>Lucro Líquido</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhuma venda</TableCell></TableRow>
                ) : sales.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs">{s.id.slice(0, 8)}</TableCell>
                    <TableCell className="font-medium">{s.client_name}</TableCell>
                    <TableCell>{fmt(Number(s.total_sale))}</TableCell>
                    <TableCell>{fmt(Number(s.total_supplier_cost))}</TableCell>
                    <TableCell>{fmt(Number(s.commission_value))}</TableCell>
                    <TableCell>{fmt(Number(s.card_fee_value))}</TableCell>
                    <TableCell className={Number(s.net_profit) >= 0 ? 'text-primary font-bold' : 'text-destructive font-bold'}>{fmt(Number(s.net_profit))}</TableCell>
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
