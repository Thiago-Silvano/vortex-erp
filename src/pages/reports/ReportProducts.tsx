import { useState, useEffect, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useCompany } from '@/contexts/CompanyContext';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import { generateReportPdf } from '@/lib/generateReportPdf';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--destructive))', '#f59e0b', '#8b5cf6', '#06b6d4', '#84cc16'];

const categorize = (desc: string): string => {
  const d = desc.toLowerCase();
  if (d.includes('aere') || d.includes('voo') || d.includes('passag')) return 'Passagens Aéreas';
  if (d.includes('hotel') || d.includes('hosped')) return 'Hotéis';
  if (d.includes('pacote')) return 'Pacotes';
  if (d.includes('seguro')) return 'Seguro Viagem';
  if (d.includes('cruzeiro')) return 'Cruzeiros';
  return 'Outros';
};

export default function ReportProducts() {
  const { activeCompany } = useCompany();
  const [saleItems, setSaleItems] = useState<any[]>([]);

  useEffect(() => {
    let qSales = supabase.from('sales').select('id');
    if (activeCompany?.id) qSales = qSales.eq('empresa_id', activeCompany.id);
    qSales.then(({ data: salesData }) => {
      if (salesData && salesData.length > 0) {
        const ids = salesData.map(s => s.id);
        supabase.from('sale_items').select('*').in('sale_id', ids).then(({ data }) => { if (data) setSaleItems(data); });
      } else {
        setSaleItems([]);
      }
    });
  }, [activeCompany?.id]);

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const productStats = useMemo(() => {
    const map = new Map<string, { count: number; faturamento: number; lucro: number }>();
    saleItems.forEach(item => {
      const cat = categorize(item.description || '');
      const cur = map.get(cat) || { count: 0, faturamento: 0, lucro: 0 };
      cur.count += 1;
      cur.faturamento += Number(item.total_value || 0);
      cur.lucro += Number(item.rav || 0);
      map.set(cat, cur);
    });
    return Array.from(map.entries()).map(([name, data]) => ({ name, ...data }));
  }, [saleItems]);

  const pieData = productStats.map(p => ({ name: p.name, value: p.faturamento }));

  const exportPdf = () => {
    generateReportPdf({
      title: 'Relatório de Serviços',
      headers: ['Serviço', 'Qtd Vendas', 'Faturamento', 'Lucro (RAV)'],
      rows: productStats.map(p => [p.name, String(p.count), fmt(p.faturamento), fmt(p.lucro)]),
    });
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h1 className="text-2xl font-bold text-foreground">Relatório de Serviços</h1>
          <Button variant="outline" onClick={exportPdf}><FileDown className="h-4 w-4 mr-2" />Exportar PDF</Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Faturamento por Serviço</CardTitle></CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => fmt(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Serviço</TableHead>
                    <TableHead>Qtd Vendas</TableHead>
                    <TableHead>Faturamento</TableHead>
                    <TableHead>Lucro (RAV)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productStats.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhum dado</TableCell></TableRow>
                  ) : productStats.map((p, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>{p.count}</TableCell>
                      <TableCell>{fmt(p.faturamento)}</TableCell>
                      <TableCell className="text-primary font-medium">{fmt(p.lucro)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
