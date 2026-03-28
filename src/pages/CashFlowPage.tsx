import { useState, useEffect, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { format, eachMonthOfInterval, eachWeekOfInterval, startOfWeek, endOfWeek, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CostCenter { id: string; name: string; }

export default function CashFlowPage() {
  const [receivables, setReceivables] = useState<any[]>([]);
  const [payables, setPayables] = useState<any[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [view, setView] = useState<'month' | 'week'>('month');
  const [filterCostCenter, setFilterCostCenter] = useState('all');

  useEffect(() => {
    supabase.from('receivables').select('*').then(({ data }) => { if (data) setReceivables(data); });
    supabase.from('accounts_payable').select('*').then(({ data }) => { if (data) setPayables(data); });
    supabase.from('cost_centers').select('id, name').eq('status', 'active').order('name').then(({ data }) => { if (data) setCostCenters(data); });
  }, []);

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const filteredReceivables = filterCostCenter === 'all' ? receivables : receivables.filter(r => r.cost_center_id === filterCostCenter);
  const filteredPayables = filterCostCenter === 'all' ? payables : payables.filter(r => r.cost_center_id === filterCostCenter);

  const chartData = useMemo(() => {
    const now = new Date();
    if (view === 'month') {
      const months = eachMonthOfInterval({ start: addMonths(now, -5), end: addMonths(now, 6) });
      return months.map(m => {
        const key = format(m, 'yyyy-MM');
        const entradas = filteredReceivables.filter(r => r.due_date?.startsWith(key)).reduce((s: number, r: any) => s + Number(r.amount), 0);
        const saidas = filteredPayables.filter(r => r.due_date?.startsWith(key)).reduce((s: number, r: any) => s + Number(r.amount), 0);
        return { name: format(m, 'MMM/yy', { locale: ptBR }), entradas, saidas, saldo: entradas - saidas };
      });
    } else {
      const weeks = eachWeekOfInterval({ start: addMonths(now, -1), end: addMonths(now, 2) }, { weekStartsOn: 1 });
      return weeks.map(w => {
        const start = startOfWeek(w, { weekStartsOn: 1 });
        const end = endOfWeek(w, { weekStartsOn: 1 });
        const entradas = filteredReceivables.filter(r => { if (!r.due_date) return false; const d = new Date(r.due_date + 'T12:00:00'); return d >= start && d <= end; }).reduce((s: number, r: any) => s + Number(r.amount), 0);
        const saidas = filteredPayables.filter(r => { if (!r.due_date) return false; const d = new Date(r.due_date + 'T12:00:00'); return d >= start && d <= end; }).reduce((s: number, r: any) => s + Number(r.amount), 0);
        return { name: format(start, 'dd/MM'), entradas, saidas, saldo: entradas - saidas };
      });
    }
  }, [view, filteredReceivables, filteredPayables]);

  const costCenterData = useMemo(() => {
    const map = new Map<string, { receitas: number; despesas: number }>();
    costCenters.forEach(c => map.set(c.id, { receitas: 0, despesas: 0 }));
    filteredReceivables.forEach(r => { if (r.cost_center_id && map.has(r.cost_center_id)) map.get(r.cost_center_id)!.receitas += Number(r.amount); });
    filteredPayables.forEach(r => { if (r.cost_center_id && map.has(r.cost_center_id)) map.get(r.cost_center_id)!.despesas += Number(r.amount); });
    return costCenters.filter(c => { const d = map.get(c.id); return d && (d.receitas > 0 || d.despesas > 0); }).map(c => {
      const d = map.get(c.id)!;
      return { name: c.name, receitas: d.receitas, despesas: d.despesas, saldo: d.receitas - d.despesas };
    });
  }, [costCenters, filteredReceivables, filteredPayables]);

  const pieData = useMemo(() => costCenterData.map(c => ({ name: c.name, value: c.despesas })).filter(c => c.value > 0), [costCenterData]);
  const COLORS = ['hsl(var(--primary))', 'hsl(var(--destructive))', 'hsl(var(--accent))', '#f59e0b', '#8b5cf6', '#06b6d4', '#84cc16', '#f43f5e'];

  const totalEntradas = chartData.reduce((s, d) => s + d.entradas, 0);
  const totalSaidas = chartData.reduce((s, d) => s + d.saidas, 0);

  return (
    <AppLayout>
      <div className="p-2 space-y-2">
        {/* Toolbar */}
        <div className="flex items-center gap-2 bg-card border p-1.5">
          <span className="text-xs font-bold">Fluxo de Caixa</span>
          <Select value={filterCostCenter} onValueChange={setFilterCostCenter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Centro de Custo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {costCenters.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={view} onValueChange={v => setView(v as any)}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Por Mês</SelectItem>
              <SelectItem value="week">Por Semana</SelectItem>
            </SelectContent>
          </Select>
          <div className="ml-auto flex gap-4 text-xs">
            <span>Entradas: <strong className="text-primary">{fmt(totalEntradas)}</strong></span>
            <span>Saídas: <strong className="text-destructive">{fmt(totalSaidas)}</strong></span>
            <span>Resultado: <strong className={totalEntradas - totalSaidas >= 0 ? 'text-primary' : 'text-destructive'}>{fmt(totalEntradas - totalSaidas)}</strong></span>
          </div>
        </div>

        {/* Chart */}
        <Card>
          <CardContent className="p-2">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="entradas" name="Entradas" fill="hsl(var(--primary))" />
                  <Bar dataKey="saidas" name="Saídas" fill="hsl(var(--destructive))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Cost Center Distribution */}
        {pieData.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            <Card>
              <CardHeader><CardTitle>Distribuição por Centro de Custo</CardTitle></CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => fmt(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Resumo por Centro de Custo</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Centro de Custo</TableHead>
                      <TableHead>Receitas</TableHead>
                      <TableHead>Despesas</TableHead>
                      <TableHead>Saldo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {costCenterData.map(c => (
                      <TableRow key={c.name}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell className="text-primary">{fmt(c.receitas)}</TableCell>
                        <TableCell className="text-destructive">{fmt(c.despesas)}</TableCell>
                        <TableCell className={c.saldo >= 0 ? 'text-primary' : 'text-destructive'}>{fmt(c.saldo)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
