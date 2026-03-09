import { useState, useEffect, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ReportFilters from '@/components/ReportFilters';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { format, subDays, parseISO, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ShoppingCart, DollarSign, TrendingUp, Users, BookOpen, BarChart3 } from 'lucide-react';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--destructive))', '#f59e0b', '#8b5cf6', '#06b6d4', '#84cc16'];

export default function ReportDashboard() {
  const [sales, setSales] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [range, setRange] = useState({ start: format(subDays(new Date(), 30), 'yyyy-MM-dd'), end: format(new Date(), 'yyyy-MM-dd') });

  useEffect(() => {
    supabase.from('sales').select('*').gte('sale_date', range.start).lte('sale_date', range.end).then(({ data }) => { if (data) setSales(data); });
    supabase.from('reservations').select('*').then(({ data }) => { if (data) setReservations(data); });
  }, [range]);

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const totalVendas = sales.length;
  const totalFaturado = sales.reduce((s, v) => s + Number(v.total_sale || 0), 0);
  const lucroBruto = sales.reduce((s, v) => s + Number(v.gross_profit || 0), 0);
  const lucroLiquido = sales.reduce((s, v) => s + Number(v.net_profit || 0), 0);
  const clientesAtendidos = new Set(sales.map(s => s.client_name)).size;
  const totalReservas = reservations.length;

  // Sales by month chart
  const salesByMonth = useMemo(() => {
    const map = new Map<string, { faturamento: number; custos: number; lucro: number }>();
    sales.forEach(s => {
      const key = format(parseISO(s.sale_date), 'MMM/yy', { locale: ptBR });
      const cur = map.get(key) || { faturamento: 0, custos: 0, lucro: 0 };
      cur.faturamento += Number(s.total_sale || 0);
      cur.custos += Number(s.total_supplier_cost || 0);
      cur.lucro += Number(s.net_profit || 0);
      map.set(key, cur);
    });
    return Array.from(map.entries()).map(([name, data]) => ({ name, ...data }));
  }, [sales]);

  // Sales by service (from sale_items)
  const [saleItems, setSaleItems] = useState<any[]>([]);
  useEffect(() => {
    if (sales.length === 0) return;
    const ids = sales.map(s => s.id);
    supabase.from('sale_items').select('*').in('sale_id', ids).then(({ data }) => { if (data) setSaleItems(data); });
  }, [sales]);

  const productData = useMemo(() => {
    const categories: Record<string, number> = {};
    saleItems.forEach(item => {
      const desc = (item.description || '').toLowerCase();
      let cat = 'Outros';
      if (desc.includes('aere') || desc.includes('voo') || desc.includes('passag')) cat = 'Passagens Aéreas';
      else if (desc.includes('hotel') || desc.includes('hosped')) cat = 'Hotéis';
      else if (desc.includes('pacote')) cat = 'Pacotes';
      else if (desc.includes('seguro')) cat = 'Seguro Viagem';
      else if (desc.includes('cruzeiro')) cat = 'Cruzeiros';
      categories[cat] = (categories[cat] || 0) + Number(item.total_value || 0);
    });
    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  }, [saleItems]);

  const indicators = [
    { label: 'Total de Vendas', value: totalVendas, icon: ShoppingCart },
    { label: 'Total Faturado', value: fmt(totalFaturado), icon: DollarSign },
    { label: 'Lucro Bruto', value: fmt(lucroBruto), icon: TrendingUp },
    { label: 'Lucro Líquido', value: fmt(lucroLiquido), icon: BarChart3 },
    { label: 'Clientes Atendidos', value: clientesAtendidos, icon: Users },
    { label: 'Reservas', value: totalReservas, icon: BookOpen },
  ];

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h1 className="text-2xl font-bold text-foreground">Dashboard Geral</h1>
          <ReportFilters onChange={setRange} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {indicators.map(ind => (
            <Card key={ind.label}>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-2 mb-1">
                  <ind.icon className="h-4 w-4 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">{ind.label}</p>
                </div>
                <p className="text-lg font-bold">{ind.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Receita vs Custos vs Lucro</CardTitle></CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesByMonth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => fmt(v)} />
                    <Legend />
                    <Bar dataKey="faturamento" name="Receita" fill="hsl(var(--primary))" />
                    <Bar dataKey="custos" name="Custos" fill="hsl(var(--destructive))" />
                    <Bar dataKey="lucro" name="Lucro" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Vendas por Serviço</CardTitle></CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={productData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {productData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => fmt(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
