import { useState, useEffect, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useCompany } from '@/contexts/CompanyContext';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import { generateReportPdf } from '@/lib/generateReportPdf';

export default function ReportSuppliers() {
  const { activeCompany } = useCompany();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [saleSups, setSaleSups] = useState<any[]>([]);

  useEffect(() => {
    let qSup = supabase.from('suppliers').select('*').order('name');
    let qSales = supabase.from('sales').select('*');
    let qSaleSups = supabase.from('sale_suppliers').select('*');
    if (activeCompany?.id) {
      qSup = qSup.eq('empresa_id', activeCompany.id);
      qSales = qSales.eq('empresa_id', activeCompany.id);
    }
    qSup.then(({ data }) => { if (data) setSuppliers(data); });
    qSales.then(({ data }) => { if (data) setSales(data); });
    qSaleSups.then(({ data }) => { if (data) setSaleSups(data); });
  }, [activeCompany?.id]);

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const supplierStats = useMemo(() => {
    return suppliers.map(sup => {
      const saleIds = saleSups.filter(ss => ss.supplier_id === sup.id).map(ss => ss.sale_id);
      const supSales = sales.filter(s => saleIds.includes(s.id));
      const totalGerado = supSales.reduce((s, v) => s + Number(v.total_sale || 0), 0);
      const totalCusto = supSales.reduce((s, v) => s + Number(v.total_supplier_cost || 0), 0);
      return { name: sup.name, numVendas: supSales.length, totalGerado, totalCusto, lucro: totalGerado - totalCusto };
    }).filter(s => s.numVendas > 0);
  }, [suppliers, sales, saleSups]);

  const chartData = supplierStats.map(s => ({ name: s.name.length > 15 ? s.name.slice(0, 15) + '...' : s.name, vendas: s.numVendas, valor: s.totalGerado }));

  const exportPdf = () => {
    generateReportPdf({
      title: 'Relatório de Fornecedores',
      headers: ['Fornecedor', 'Nº Vendas', 'Valor Total', 'Custo Total', 'Lucro'],
      rows: supplierStats.map(s => [s.name, String(s.numVendas), fmt(s.totalGerado), fmt(s.totalCusto), fmt(s.lucro)]),
    });
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h1 className="text-2xl font-bold text-foreground">Relatório de Fornecedores</h1>
          <Button variant="outline" onClick={exportPdf}><FileDown className="h-4 w-4 mr-2" />Exportar PDF</Button>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Vendas por Fornecedor</CardTitle></CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" width={120} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Bar dataKey="valor" name="Valor Total" fill="hsl(var(--primary))" />
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
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Nº Vendas</TableHead>
                  <TableHead>Valor Total</TableHead>
                  <TableHead>Custo Total</TableHead>
                  <TableHead>Lucro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {supplierStats.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum dado</TableCell></TableRow>
                ) : supplierStats.map((s, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{s.numVendas}</TableCell>
                    <TableCell>{fmt(s.totalGerado)}</TableCell>
                    <TableCell>{fmt(s.totalCusto)}</TableCell>
                    <TableCell className={s.lucro >= 0 ? 'text-primary font-medium' : 'text-destructive font-medium'}>{fmt(s.lucro)}</TableCell>
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
