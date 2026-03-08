import { useState, useEffect, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ReportFilters from '@/components/ReportFilters';
import { format, subDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

export default function ReportSales() {
  const [sales, setSales] = useState<any[]>([]);
  const [saleItems, setSaleItems] = useState<any[]>([]);
  const [range, setRange] = useState({ start: format(subDays(new Date(), 30), 'yyyy-MM-dd'), end: format(new Date(), 'yyyy-MM-dd') });
  const [filterClient, setFilterClient] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    supabase.from('sales').select('*').gte('sale_date', range.start).lte('sale_date', range.end).order('sale_date', { ascending: false })
      .then(({ data }) => {
        if (data) {
          setSales(data);
          const ids = data.map(s => s.id);
          if (ids.length > 0) {
            supabase.from('sale_items').select('*').in('sale_id', ids).then(({ data: items }) => { if (items) setSaleItems(items); });
          }
        }
      });
  }, [range]);

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const filtered = sales.filter(s => {
    if (filterClient && !s.client_name?.toLowerCase().includes(filterClient.toLowerCase())) return false;
    if (filterStatus !== 'all' && s.status !== filterStatus) return false;
    return true;
  });

  const totalVendas = filtered.length;
  const totalFaturamento = filtered.reduce((s, v) => s + Number(v.total_sale || 0), 0);
  const totalLucro = filtered.reduce((s, v) => s + Number(v.net_profit || 0), 0);

  const exportCSV = () => {
    const header = 'Codigo,Cliente,Data,Valor Venda,Custo Fornecedor,Lucro Bruto,Taxa Cartao,Lucro Liquido\n';
    const rows = filtered.map(s => `${s.id.slice(0,8)},${s.client_name},${s.sale_date},${s.total_sale},${s.total_supplier_cost},${s.gross_profit},${s.card_fee_value},${s.net_profit}`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'relatorio-vendas.csv'; a.click();
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h1 className="text-2xl font-bold text-foreground">Relatório de Vendas</h1>
          <Button variant="outline" onClick={exportCSV}><Download className="h-4 w-4 mr-2" />Exportar CSV</Button>
        </div>

        <ReportFilters onChange={setRange}>
          <Input className="w-48" placeholder="Filtrar cliente..." value={filterClient} onChange={e => setFilterClient(e.target.value)} />
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativo</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </ReportFilters>

        <div className="grid grid-cols-3 gap-4">
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Total Vendas</p><p className="text-xl font-bold">{totalVendas}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Faturamento</p><p className="text-xl font-bold text-primary">{fmt(totalFaturamento)}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Lucro Total</p><p className="text-xl font-bold text-primary">{fmt(totalLucro)}</p></CardContent></Card>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Valor Venda</TableHead>
                  <TableHead>Custo</TableHead>
                  <TableHead>Lucro Bruto</TableHead>
                  <TableHead>Taxa Cartão</TableHead>
                  <TableHead>Lucro Líquido</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhuma venda encontrada</TableCell></TableRow>
                ) : filtered.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs">{s.id.slice(0, 8)}</TableCell>
                    <TableCell className="font-medium">{s.client_name}</TableCell>
                    <TableCell>{format(new Date(s.sale_date + 'T12:00:00'), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>{fmt(Number(s.total_sale))}</TableCell>
                    <TableCell>{fmt(Number(s.total_supplier_cost))}</TableCell>
                    <TableCell>{fmt(Number(s.gross_profit))}</TableCell>
                    <TableCell>{fmt(Number(s.card_fee_value))}</TableCell>
                    <TableCell className={Number(s.net_profit) >= 0 ? 'text-primary font-medium' : 'text-destructive font-medium'}>{fmt(Number(s.net_profit))}</TableCell>
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
