import { useState, useEffect, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, subDays, addMonths, eachMonthOfInterval, eachWeekOfInterval, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';

export default function ReportCashFlow() {
  const [receivables, setReceivables] = useState<any[]>([]);
  const [payables, setPayables] = useState<any[]>([]);
  const [view, setView] = useState<'month' | 'week'>('month');

  useEffect(() => {
    supabase.from('receivables').select('*').then(({ data }) => { if (data) setReceivables(data); });
    supabase.from('accounts_payable').select('*').then(({ data }) => { if (data) setPayables(data); });
  }, []);

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const chartData = useMemo(() => {
    const now = new Date();
    if (view === 'month') {
      const months = eachMonthOfInterval({ start: addMonths(now, -5), end: addMonths(now, 6) });
      return months.map(m => {
        const key = format(m, 'yyyy-MM');
        const entradas = receivables.filter(r => r.due_date?.startsWith(key)).reduce((s: number, r: any) => s + Number(r.amount), 0);
        const saidas = payables.filter(r => r.due_date?.startsWith(key)).reduce((s: number, r: any) => s + Number(r.amount), 0);
        return { name: format(m, 'MMM/yy', { locale: ptBR }), entradas, saidas, saldo: entradas - saidas };
      });
    } else {
      const weeks = eachWeekOfInterval({ start: addMonths(now, -1), end: addMonths(now, 2) }, { weekStartsOn: 1 });
      return weeks.map(w => {
        const start = startOfWeek(w, { weekStartsOn: 1 });
        const end = endOfWeek(w, { weekStartsOn: 1 });
        const inRange = (d: string) => { const dt = new Date(d + 'T12:00:00'); return dt >= start && dt <= end; };
        const entradas = receivables.filter(r => r.due_date && inRange(r.due_date)).reduce((s: number, r: any) => s + Number(r.amount), 0);
        const saidas = payables.filter(r => r.due_date && inRange(r.due_date)).reduce((s: number, r: any) => s + Number(r.amount), 0);
        return { name: format(start, 'dd/MM'), entradas, saidas, saldo: entradas - saidas };
      });
    }
  }, [view, receivables, payables]);

  const totalEntradas = chartData.reduce((s, d) => s + d.entradas, 0);
  const totalSaidas = chartData.reduce((s, d) => s + d.saidas, 0);

  // Detail table
  const allItems = [
    ...receivables.map(r => ({ ...r, tipo: 'Entrada', desc: r.description || r.client_name || 'Recebível' })),
    ...payables.map(r => ({ ...r, tipo: 'Saída', desc: r.description || 'Pagamento' })),
  ].sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''));

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h1 className="text-2xl font-bold text-foreground">Fluxo de Caixa</h1>
          <Select value={view} onValueChange={v => setView(v as any)}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Por Mês</SelectItem>
              <SelectItem value="week">Por Semana</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Entradas Previstas</p><p className="text-xl font-bold text-primary">{fmt(totalEntradas)}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Saídas Previstas</p><p className="text-xl font-bold text-destructive">{fmt(totalSaidas)}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Saldo Previsto</p><p className={`text-xl font-bold ${totalEntradas - totalSaidas >= 0 ? 'text-primary' : 'text-destructive'}`}>{fmt(totalEntradas - totalSaidas)}</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Fluxo de Caixa {view === 'month' ? 'Mensal' : 'Semanal'}</CardTitle></CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Legend />
                  <Bar dataKey="entradas" name="Entradas" fill="hsl(var(--primary))" />
                  <Bar dataKey="saidas" name="Saídas" fill="hsl(var(--destructive))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Detalhamento</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allItems.slice(0, 100).map((item, i) => (
                  <TableRow key={i}>
                    <TableCell>{item.due_date ? format(new Date(item.due_date + 'T12:00:00'), 'dd/MM/yyyy') : '-'}</TableCell>
                    <TableCell><Badge variant={item.tipo === 'Entrada' ? 'default' : 'destructive'}>{item.tipo}</Badge></TableCell>
                    <TableCell>{item.desc}</TableCell>
                    <TableCell className="font-medium">{fmt(Number(item.amount))}</TableCell>
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
