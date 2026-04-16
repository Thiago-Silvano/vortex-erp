import { useEffect, useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfDay, endOfDay, subMonths, eachDayOfInterval, eachMonthOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, ShoppingCart, Users, Target, TrendingUp, TrendingDown, AlertTriangle, FileWarning } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import AppLayout from '@/components/AppLayout';
import { useCompany } from '@/contexts/CompanyContext';
import { useNavigate } from 'react-router-dom';

type Period = 'day' | 'week' | 'month';

interface ExecStats {
  faturamento: number;
  faturamentoAnterior: number;
  ticketMedio: number;
  ticketMedioAnterior: number;
  clientes: number;
  clientesAnterior: number;
  lucro: number;
  lucroAnterior: number;
}

interface CategoryData { name: string; value: number; color: string; }
interface SeriesPoint { label: string; receita: number; despesa: number; }
interface ProductRow { name: string; qtd: number; receita: number; }
interface AlertItem { type: 'danger' | 'warning'; message: string; route?: string; }

const COLORS = ['hsl(var(--primary))', '#22c55e', '#f59e0b', '#a855f7', '#ef4444', '#06b6d4', '#ec4899', '#8b5cf6'];

function getRanges(period: Period) {
  const now = new Date();
  if (period === 'day') {
    return {
      current: { start: startOfDay(now), end: endOfDay(now), label: 'Hoje' },
      previous: { start: startOfDay(new Date(now.getTime() - 86400000)), end: endOfDay(new Date(now.getTime() - 86400000)), label: 'Ontem' },
    };
  }
  if (period === 'week') {
    const ws = startOfWeek(now, { weekStartsOn: 1 });
    const we = endOfWeek(now, { weekStartsOn: 1 });
    const lastWeekStart = new Date(ws.getTime() - 7 * 86400000);
    const lastWeekEnd = new Date(we.getTime() - 7 * 86400000);
    return {
      current: { start: ws, end: we, label: 'Semana atual' },
      previous: { start: lastWeekStart, end: lastWeekEnd, label: 'Semana passada' },
    };
  }
  const ms = startOfMonth(now);
  const me = endOfMonth(now);
  const lm = subMonths(now, 1);
  return {
    current: { start: ms, end: me, label: 'Mês atual' },
    previous: { start: startOfMonth(lm), end: endOfMonth(lm), label: 'Mês passado' },
  };
}

function pct(curr: number, prev: number): { value: number; up: boolean } {
  if (prev === 0) return { value: curr > 0 ? 100 : 0, up: curr >= 0 };
  const v = ((curr - prev) / prev) * 100;
  return { value: Math.abs(Math.round(v)), up: v >= 0 };
}

const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const fmtFull = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

export default function Dashboard() {
  const navigate = useNavigate();
  const { activeCompany } = useCompany();
  const [period, setPeriod] = useState<Period>('month');
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');

  const [stats, setStats] = useState<ExecStats>({
    faturamento: 0, faturamentoAnterior: 0,
    ticketMedio: 0, ticketMedioAnterior: 0,
    clientes: 0, clientesAnterior: 0,
    lucro: 0, lucroAnterior: 0,
  });
  const [series, setSeries] = useState<SeriesPoint[]>([]);
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [evolution, setEvolution] = useState<{ label: string; valor: number }[]>([]);
  const [topProducts, setTopProducts] = useState<ProductRow[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  const isVistos = activeCompany?.slug === 'vortex-vistos';
  const empresaName = activeCompany?.name || 'Vortex';

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        const raw = data.user.email?.split('@')[0] || 'Usuário';
        setUserName(raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase());
      }
    });
  }, []);

  useEffect(() => {
    if (!activeCompany?.id) return;
    loadAll();
  }, [activeCompany?.id, period]);

  async function loadAll() {
    setLoading(true);
    try {
      const ranges = getRanges(period);
      const empresaId = activeCompany!.id;

      if (isVistos) {
        await loadVistos(empresaId, ranges);
      } else {
        await loadViagens(empresaId, ranges);
      }
      await loadAlerts(empresaId);
    } catch (e) {
      console.error('Dashboard load error:', e);
    } finally {
      setLoading(false);
    }
  }

  async function loadViagens(empresaId: string, ranges: ReturnType<typeof getRanges>) {
    const startStr = format(ranges.current.start, 'yyyy-MM-dd');
    const endStr = format(ranges.current.end, 'yyyy-MM-dd');
    const prevStartStr = format(ranges.previous.start, 'yyyy-MM-dd');
    const prevEndStr = format(ranges.previous.end, 'yyyy-MM-dd');

    // Current and previous sales
    const [currRes, prevRes] = await Promise.all([
      supabase.from('sales')
        .select('id, total_sale, net_profit, passengers_count, sale_date, status')
        .eq('empresa_id', empresaId)
        .eq('status', 'active')
        .gte('sale_date', startStr).lte('sale_date', endStr),
      supabase.from('sales')
        .select('id, total_sale, net_profit, passengers_count, status')
        .eq('empresa_id', empresaId)
        .eq('status', 'active')
        .gte('sale_date', prevStartStr).lte('sale_date', prevEndStr),
    ]);

    const curr = currRes.data || [];
    const prev = prevRes.data || [];

    const sumCurrFat = curr.reduce((s, v) => s + Number(v.total_sale || 0), 0);
    const sumPrevFat = prev.reduce((s, v) => s + Number(v.total_sale || 0), 0);
    const sumCurrLucro = curr.reduce((s, v) => s + Number(v.net_profit || 0), 0);
    const sumPrevLucro = prev.reduce((s, v) => s + Number(v.net_profit || 0), 0);
    const cliCurr = curr.reduce((s, v) => s + Number(v.passengers_count || 0), 0);
    const cliPrev = prev.reduce((s, v) => s + Number(v.passengers_count || 0), 0);
    const ticketCurr = curr.length > 0 ? sumCurrFat / curr.length : 0;
    const ticketPrev = prev.length > 0 ? sumPrevFat / prev.length : 0;

    setStats({
      faturamento: sumCurrFat, faturamentoAnterior: sumPrevFat,
      ticketMedio: ticketCurr, ticketMedioAnterior: ticketPrev,
      clientes: cliCurr, clientesAnterior: cliPrev,
      lucro: sumCurrLucro, lucroAnterior: sumPrevLucro,
    });

    // Receita vs Despesa series
    const days = period === 'day'
      ? [ranges.current.start]
      : period === 'week'
        ? eachDayOfInterval({ start: ranges.current.start, end: ranges.current.end })
        : eachDayOfInterval({ start: ranges.current.start, end: ranges.current.end });

    const recByDay: Record<string, number> = {};
    const desByDay: Record<string, number> = {};
    curr.forEach((s) => {
      const k = String(s.sale_date);
      recByDay[k] = (recByDay[k] || 0) + Number(s.total_sale || 0);
      desByDay[k] = (desByDay[k] || 0) + (Number(s.total_sale || 0) - Number(s.net_profit || 0));
    });
    const labelFmt = period === 'month' ? 'dd' : 'EEE';
    setSeries(days.map(d => {
      const k = format(d, 'yyyy-MM-dd');
      return {
        label: format(d, labelFmt, { locale: ptBR }),
        receita: Math.round(recByDay[k] || 0),
        despesa: Math.round(desByDay[k] || 0),
      };
    }));

    // Categories: serviços (vinculados via quote_id = sale.id)
    const saleIds = curr.map(s => s.id);
    if (saleIds.length > 0) {
      const { data: services } = await (supabase as any)
        .from('services')
        .select('type, title, value, quantity')
        .in('quote_id', saleIds);
      const byCat: Record<string, number> = {};
      (services || []).forEach((s: any) => {
        const cat = s.type || 'Outros';
        const total = Number(s.value || 0) * Number(s.quantity || 1);
        byCat[cat] = (byCat[cat] || 0) + total;
      });
      const totalCat = Object.values(byCat).reduce((a, b) => a + b, 0) || 1;
      setCategories(Object.entries(byCat).map(([name, value], i) => ({
        name: `${name} ${Math.round((value / totalCat) * 100)}%`,
        value, color: COLORS[i % COLORS.length],
      })));

      // Top products (reuse services query)
      const byProd: Record<string, { qtd: number; receita: number }> = {};
      (services || []).forEach((s: any) => {
        const name = (s.title || s.type || 'Sem nome').slice(0, 40);
        if (!byProd[name]) byProd[name] = { qtd: 0, receita: 0 };
        byProd[name].qtd += Number(s.quantity || 1);
        byProd[name].receita += Number(s.value || 0) * Number(s.quantity || 1);
      });
      setTopProducts(
        Object.entries(byProd)
          .map(([name, v]) => ({ name, qtd: v.qtd, receita: v.receita }))
          .sort((a, b) => b.receita - a.receita)
          .slice(0, 5)
      );
    } else {
      setCategories([]);
      setTopProducts([]);
    }

    // Evolution: 6 months
    const evoStart = subMonths(startOfMonth(new Date()), 5);
    const evoEnd = endOfMonth(new Date());
    const { data: evoSales } = await supabase
      .from('sales')
      .select('total_sale, sale_date')
      .eq('empresa_id', empresaId)
      .eq('status', 'active')
      .gte('sale_date', format(evoStart, 'yyyy-MM-dd'))
      .lte('sale_date', format(evoEnd, 'yyyy-MM-dd'));
    const months = eachMonthOfInterval({ start: evoStart, end: evoEnd });
    const byMonth: Record<string, number> = {};
    (evoSales || []).forEach((s: any) => {
      const k = format(new Date(s.sale_date + 'T00:00:00'), 'yyyy-MM');
      byMonth[k] = (byMonth[k] || 0) + Number(s.total_sale || 0);
    });
    setEvolution(months.map(m => ({
      label: format(m, 'MMM', { locale: ptBR }),
      valor: Math.round(byMonth[format(m, 'yyyy-MM')] || 0),
    })));
  }

  async function loadVistos(empresaId: string, ranges: ReturnType<typeof getRanges>) {
    const startStr = format(ranges.current.start, 'yyyy-MM-dd');
    const endStr = format(ranges.current.end, 'yyyy-MM-dd');
    const prevStartStr = format(ranges.previous.start, 'yyyy-MM-dd');
    const prevEndStr = format(ranges.previous.end, 'yyyy-MM-dd');

    const [currRes, prevRes] = await Promise.all([
      supabase.from('visa_sales')
        .select('id, total_value, card_fee_value, sale_date, product_id')
        .eq('empresa_id', empresaId)
        .gte('sale_date', startStr).lte('sale_date', endStr),
      supabase.from('visa_sales')
        .select('id, total_value, card_fee_value')
        .eq('empresa_id', empresaId)
        .gte('sale_date', prevStartStr).lte('sale_date', prevEndStr),
    ]);

    const curr = currRes.data || [];
    const prev = prevRes.data || [];

    const sumCurr = curr.reduce((s, v) => s + Number(v.total_value || 0), 0);
    const sumPrev = prev.reduce((s, v) => s + Number(v.total_value || 0), 0);
    const cardCurr = curr.reduce((s, v) => s + Number((v as any).card_fee_value || 0), 0);
    const cardPrev = prev.reduce((s, v) => s + Number((v as any).card_fee_value || 0), 0);
    const ticketCurr = curr.length > 0 ? sumCurr / curr.length : 0;
    const ticketPrev = prev.length > 0 ? sumPrev / prev.length : 0;

    setStats({
      faturamento: sumCurr, faturamentoAnterior: sumPrev,
      ticketMedio: ticketCurr, ticketMedioAnterior: ticketPrev,
      clientes: curr.length, clientesAnterior: prev.length,
      lucro: sumCurr - cardCurr, lucroAnterior: sumPrev - cardPrev,
    });

    // Series
    const days = eachDayOfInterval({ start: ranges.current.start, end: ranges.current.end });
    const recByDay: Record<string, number> = {};
    const desByDay: Record<string, number> = {};
    curr.forEach((s: any) => {
      const k = String(s.sale_date);
      recByDay[k] = (recByDay[k] || 0) + Number(s.total_value || 0);
      desByDay[k] = (desByDay[k] || 0) + Number(s.card_fee_value || 0);
    });
    const labelFmt = period === 'month' ? 'dd' : 'EEE';
    setSeries(days.map(d => {
      const k = format(d, 'yyyy-MM-dd');
      return {
        label: format(d, labelFmt, { locale: ptBR }),
        receita: Math.round(recByDay[k] || 0),
        despesa: Math.round(desByDay[k] || 0),
      };
    }));

    // Categories: produtos de visto
    const { data: products } = await supabase
      .from('visa_products').select('id, name').eq('empresa_id', empresaId);
    const prodMap: Record<string, string> = {};
    (products || []).forEach((p: any) => { prodMap[p.id] = p.name; });
    const byProd: Record<string, number> = {};
    const byProdQtd: Record<string, number> = {};
    curr.forEach((s: any) => {
      const name = prodMap[s.product_id] || 'Outros';
      byProd[name] = (byProd[name] || 0) + Number(s.total_value || 0);
      byProdQtd[name] = (byProdQtd[name] || 0) + 1;
    });
    const totalCat = Object.values(byProd).reduce((a, b) => a + b, 0) || 1;
    setCategories(Object.entries(byProd).map(([name, value], i) => ({
      name: `${name} ${Math.round((value / totalCat) * 100)}%`,
      value, color: COLORS[i % COLORS.length],
    })));
    setTopProducts(
      Object.entries(byProd).map(([name, receita]) => ({
        name, qtd: byProdQtd[name] || 0, receita,
      })).sort((a, b) => b.receita - a.receita).slice(0, 5)
    );

    // Evolution 6 months
    const evoStart = subMonths(startOfMonth(new Date()), 5);
    const evoEnd = endOfMonth(new Date());
    const { data: evoSales } = await supabase
      .from('visa_sales')
      .select('total_value, sale_date')
      .eq('empresa_id', empresaId)
      .gte('sale_date', format(evoStart, 'yyyy-MM-dd'))
      .lte('sale_date', format(evoEnd, 'yyyy-MM-dd'));
    const months = eachMonthOfInterval({ start: evoStart, end: evoEnd });
    const byMonth: Record<string, number> = {};
    (evoSales || []).forEach((s: any) => {
      const k = format(new Date(s.sale_date + 'T00:00:00'), 'yyyy-MM');
      byMonth[k] = (byMonth[k] || 0) + Number(s.total_value || 0);
    });
    setEvolution(months.map(m => ({
      label: format(m, 'MMM', { locale: ptBR }),
      valor: Math.round(byMonth[format(m, 'yyyy-MM')] || 0),
    })));
  }

  async function loadAlerts(empresaId: string) {
    const today = format(new Date(), 'yyyy-MM-dd');
    const list: AlertItem[] = [];

    // Receivables overdue
    const { data: rec } = await supabase.from('receivables')
      .select('amount, due_date, status')
      .eq('empresa_id', empresaId)
      .neq('status', 'paid')
      .lt('due_date', today);
    if (rec && rec.length > 0) {
      const total = rec.reduce((s, v) => s + Number(v.amount || 0), 0);
      list.push({
        type: 'danger',
        message: `${rec.length} contas a receber vencidas — total ${fmt(total)}`,
        route: '/financial/receivable',
      });
    }

    // Payables overdue
    const { data: pay } = await supabase.from('accounts_payable')
      .select('amount, due_date, status')
      .eq('empresa_id', empresaId)
      .neq('status', 'paid')
      .lt('due_date', today);
    if (pay && pay.length > 0) {
      const total = pay.reduce((s, v) => s + Number(v.amount || 0), 0);
      list.push({
        type: 'danger',
        message: `${pay.length} contas a pagar vencidas — total ${fmt(total)}`,
        route: '/financial/payable',
      });
    }

    // Comissão pendente (sales)
    const { data: comm } = await supabase.from('sales' as any)
      .select('id')
      .eq('empresa_id', empresaId)
      .eq('commission_invoice_status', 'pending');
    if (comm && comm.length > 0) {
      list.push({
        type: 'warning',
        message: `${comm.length} venda(s) aguardando pagamento de comissão`,
        route: '/sales',
      });
    }

    setAlerts(list);
  }

  const kpiCards = useMemo(() => {
    const fatPct = pct(stats.faturamento, stats.faturamentoAnterior);
    const ticketPct = pct(stats.ticketMedio, stats.ticketMedioAnterior);
    const cliPct = pct(stats.clientes, stats.clientesAnterior);
    const lucroPct = pct(stats.lucro, stats.lucroAnterior);
    const periodLabel = period === 'day' ? 'ontem' : period === 'week' ? 'sem. anterior' : 'mês ant.';
    return [
      {
        label: isVistos ? 'FATURAMENTO' : 'FATURAMENTO',
        value: fmt(stats.faturamento),
        delta: fatPct, periodLabel,
        icon: DollarSign,
        accent: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40',
      },
      {
        label: 'TICKET MÉDIO',
        value: fmt(stats.ticketMedio),
        delta: ticketPct, periodLabel,
        icon: ShoppingCart,
        accent: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40',
      },
      {
        label: isVistos ? 'VISTOS VENDIDOS' : 'CLIENTES ATENDIDOS',
        value: stats.clientes.toString(),
        delta: cliPct, periodLabel,
        icon: Users,
        accent: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-950/40',
      },
      {
        label: 'LUCRO LÍQUIDO',
        value: fmt(stats.lucro),
        delta: lucroPct, periodLabel,
        icon: Target,
        accent: 'bg-rose-50 text-rose-600 dark:bg-rose-950/40',
      },
    ];
  }, [stats, period, isVistos]);

  return (
    <AppLayout>
      <div className="p-4 space-y-3 bg-muted/30 min-h-full">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-foreground">
              Dashboard — {empresaName}
            </h1>
            <p className="text-xs text-muted-foreground">
              {userName ? `Bem-vindo, ${userName}` : 'Visão executiva'} · atualizado agora
            </p>
          </div>
          <div className="flex items-center gap-1 bg-card border rounded-md p-0.5">
            {(['day', 'week', 'month'] as Period[]).map((p) => (
              <Button
                key={p}
                variant={period === p ? 'default' : 'ghost'}
                size="sm"
                className="h-7 px-3 text-xs"
                onClick={() => setPeriod(p)}
              >
                {p === 'day' ? 'Hoje' : p === 'week' ? 'Semana' : 'Mês'}
              </Button>
            ))}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kpiCards.map((c) => (
            <Card key={c.label} className="overflow-hidden">
              <CardContent className="p-3">
                <div className="flex items-start gap-2">
                  <div className={`rounded-lg p-2 ${c.accent}`}>
                    <c.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold text-muted-foreground tracking-wider">
                      {c.label}
                    </p>
                    <p className="text-xl font-bold text-foreground mt-0.5 truncate">
                      {loading ? '...' : c.value}
                    </p>
                    <div className={`flex items-center gap-1 text-[10px] mt-1 ${c.delta.up ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {c.delta.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      <span className="font-semibold">
                        {c.delta.up ? '+' : '-'}{c.delta.value}% vs {c.periodLabel}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Row 2: Receita vs Despesa + Vendas por Categoria */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <Card className="lg:col-span-2">
            <CardContent className="p-3">
              <h3 className="text-xs font-semibold text-foreground mb-2">
                Receita vs {isVistos ? 'Taxa Máquina' : 'Despesa'} ({period === 'day' ? 'Hoje' : period === 'week' ? 'Semana' : 'Mês'})
              </h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={series}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: any) => fmtFull(Number(v))} />
                  <Bar dataKey="receita" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} name="Receita" />
                  <Bar dataKey="despesa" fill="#ef4444" radius={[3, 3, 0, 0]} name={isVistos ? 'Taxa' : 'Despesa'} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3">
              <h3 className="text-xs font-semibold text-foreground mb-2">
                {isVistos ? 'Vendas por Produto' : 'Vendas por Categoria'}
              </h3>
              {categories.length === 0 ? (
                <div className="h-[240px] flex items-center justify-center text-xs text-muted-foreground">
                  Sem dados no período
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={categories}
                      dataKey="value"
                      nameKey="name"
                      cx="50%" cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={2}
                    >
                      {categories.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => fmtFull(Number(v))} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Row 3: Evolução + Top Produtos + Alertas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-3">
              <h3 className="text-xs font-semibold text-foreground mb-2">Evolução Faturamento (6 meses)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={evolution}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: any) => fmtFull(Number(v))} />
                  <Line type="monotone" dataKey="valor" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3">
              <h3 className="text-xs font-semibold text-foreground mb-2">
                {isVistos ? 'Produtos Mais Vendidos' : 'Serviços Mais Vendidos'}
              </h3>
              {topProducts.length === 0 ? (
                <div className="h-[200px] flex items-center justify-center text-xs text-muted-foreground">
                  Sem dados
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-[10px] text-muted-foreground uppercase">
                      <th className="text-left py-1.5 font-semibold">Item</th>
                      <th className="text-right py-1.5 font-semibold">Qtd</th>
                      <th className="text-right py-1.5 font-semibold">Receita</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProducts.map((p, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-1.5 truncate max-w-[120px]" title={p.name}>{p.name}</td>
                        <td className="text-right py-1.5">{p.qtd}</td>
                        <td className="text-right py-1.5 font-semibold">{fmt(p.receita)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3">
              <h3 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                Alertas
              </h3>
              {alerts.length === 0 ? (
                <div className="h-[200px] flex flex-col items-center justify-center text-xs text-muted-foreground gap-2">
                  <FileWarning className="h-8 w-8 opacity-30" />
                  Nenhum alerta no momento
                </div>
              ) : (
                <div className="space-y-1.5">
                  {alerts.map((a, i) => (
                    <button
                      key={i}
                      onClick={() => a.route && navigate(a.route)}
                      className={`w-full text-left text-xs px-2.5 py-2 rounded-md border transition-colors hover:opacity-80 ${
                        a.type === 'danger'
                          ? 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/30 dark:border-rose-900 dark:text-rose-300'
                          : 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-900 dark:text-amber-300'
                      }`}
                    >
                      {a.message}
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
