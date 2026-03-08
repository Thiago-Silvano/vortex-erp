import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { format, subDays, startOfMonth, startOfYear } from 'date-fns';

const STATUS_LABELS: Record<string, string> = {
  falta_passaporte: 'Falta Passaporte',
  produzindo: 'Produzindo',
  agendado: 'Agendado',
  aguardando_renovacao: 'Aguard. Renovação',
  aprovado: 'Aprovado',
  negado: 'Negado',
};

const STATUS_COLORS: Record<string, string> = {
  falta_passaporte: '#f59e0b',
  produzindo: '#3b82f6',
  agendado: '#8b5cf6',
  aguardando_renovacao: '#f97316',
  aprovado: '#22c55e',
  negado: '#ef4444',
};

type Period = '7d' | '30d' | 'month' | 'year' | 'custom';

export default function VistosReportsPage() {
  const { activeCompany } = useCompany();
  const [period, setPeriod] = useState<Period>('30d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [sales, setSales] = useState<any[]>([]);
  const [processes, setProcesses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  const dateRange = useMemo(() => {
    const now = new Date();
    const to = format(now, 'yyyy-MM-dd');
    let from: string;
    switch (period) {
      case '7d': from = format(subDays(now, 7), 'yyyy-MM-dd'); break;
      case '30d': from = format(subDays(now, 30), 'yyyy-MM-dd'); break;
      case 'month': from = format(startOfMonth(now), 'yyyy-MM-dd'); break;
      case 'year': from = format(startOfYear(now), 'yyyy-MM-dd'); break;
      case 'custom': from = customFrom || format(subDays(now, 30), 'yyyy-MM-dd'); return { from, to: customTo || to };
      default: from = format(subDays(now, 30), 'yyyy-MM-dd');
    }
    return { from, to };
  }, [period, customFrom, customTo]);

  useEffect(() => {
    if (!activeCompany?.id) return;
    loadData();
  }, [activeCompany?.id, dateRange]);

  const loadData = async () => {
    const empresaId = activeCompany?.id;

    const [{ data: salesData }, { data: procsData }, { data: prodsData }] = await Promise.all([
      supabase.from('visa_sales').select('*, visa_products(name)').eq('empresa_id', empresaId)
        .gte('sale_date', dateRange.from).lte('sale_date', dateRange.to),
      supabase.from('visa_processes').select('*, visa_products(name)').eq('empresa_id', empresaId),
      supabase.from('visa_products').select('id, name').eq('empresa_id', empresaId),
    ]);

    setSales(salesData || []);
    setProcesses(procsData || []);
    setProducts(prodsData || []);
  };

  // Sales by product
  const salesByProduct = useMemo(() => {
    const map: Record<string, { name: string; count: number; value: number }> = {};
    sales.forEach(s => {
      const name = s.visa_products?.name || 'Outro';
      if (!map[name]) map[name] = { name, count: 0, value: 0 };
      map[name].count++;
      map[name].value += s.total_value || 0;
    });
    return Object.values(map);
  }, [sales]);

  // Processes by status
  const processByStatus = useMemo(() => {
    const map: Record<string, number> = {};
    processes.forEach(p => { map[p.status] = (map[p.status] || 0) + 1; });
    return Object.entries(map).map(([k, v]) => ({
      name: STATUS_LABELS[k] || k,
      value: v,
      color: STATUS_COLORS[k] || '#94a3b8',
    }));
  }, [processes]);

  // Approval rate
  const approved = processes.filter(p => p.status === 'aprovado').length;
  const denied = processes.filter(p => p.status === 'negado').length;
  const total = approved + denied;
  const approvalRate = total > 0 ? ((approved / total) * 100).toFixed(1) : '—';
  const denialRate = total > 0 ? ((denied / total) * 100).toFixed(1) : '—';

  const totalSalesValue = sales.reduce((sum, s) => sum + (s.total_value || 0), 0);

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-foreground">Relatórios — Vistos</h1>
          <div className="flex items-center gap-2">
            <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Últimos 7 dias</SelectItem>
                <SelectItem value="30d">Últimos 30 dias</SelectItem>
                <SelectItem value="month">Este mês</SelectItem>
                <SelectItem value="year">Este ano</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
            {period === 'custom' && (
              <div className="flex gap-2">
                <Input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="w-[150px]" />
                <Input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="w-[150px]" />
              </div>
            )}
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card><CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Vendas no Período</p>
            <p className="text-2xl font-bold text-foreground">{sales.length}</p>
          </CardContent></Card>
          <Card><CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Valor Total</p>
            <p className="text-2xl font-bold text-foreground">R$ {totalSalesValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </CardContent></Card>
          <Card><CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Taxa de Aprovação</p>
            <p className="text-2xl font-bold text-emerald-600">{approvalRate}%</p>
          </CardContent></Card>
          <Card><CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Taxa de Negativa</p>
            <p className="text-2xl font-bold text-red-500">{denialRate}%</p>
          </CardContent></Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Vendas por Produto</CardTitle></CardHeader>
            <CardContent>
              {salesByProduct.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={salesByProduct}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip formatter={(v: number) => `${v} vendas`} />
                    <Bar dataKey="count" name="Vendas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-8">Sem dados no período</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Processos por Status</CardTitle></CardHeader>
            <CardContent>
              {processByStatus.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={processByStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, value }) => `${name}: ${value}`}>
                      {processByStatus.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-8">Sem dados</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Approval vs Denial */}
        {total > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Aprovação vs Negativa</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={[{ name: 'Resultado', aprovado: approved, negado: denied }]} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="name" hide />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="aprovado" name="Aprovados" fill="#22c55e" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="negado" name="Negados" fill="#ef4444" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Sales table */}
        <Card>
          <CardHeader><CardTitle className="text-base">Vendas no Período</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Pagamento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhuma venda no período</TableCell></TableRow>
                ) : sales.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.client_name}</TableCell>
                    <TableCell>{s.visa_products?.name}</TableCell>
                    <TableCell>{format(new Date(s.sale_date + 'T12:00:00'), 'dd/MM/yyyy')}</TableCell>
                    <TableCell className="text-right">R$ {(s.total_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell><Badge variant="outline">{s.payment_method}</Badge></TableCell>
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
