import { useEffect, useState } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfDay, endOfDay, subMonths, startOfYear, endOfYear, subYears } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ShoppingCart, DollarSign, TrendingUp, TrendingDown, Users, BarChart3 } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { useCompany } from '@/contexts/CompanyContext';
import PipelineDashboard from '@/components/PipelineDashboard';

type Period = 'month' | 'last_month' | 'day' | 'week' | '6months' | 'year' | 'last_year' | 'custom';

const PERIOD_LABELS: Record<Period, string> = {
  month: 'Mês atual',
  last_month: 'Mês passado',
  day: 'Hoje',
  week: 'Semana',
  '6months': '6 meses',
  year: 'Ano atual',
  last_year: 'Ano anterior',
  custom: 'Personalizado',
};

function getDateRange(period: Period, customStart: string, customEnd: string) {
  const now = new Date();
  switch (period) {
    case 'day': return { start: startOfDay(now), end: endOfDay(now) };
    case 'week': return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
    case 'month': return { start: startOfMonth(now), end: endOfMonth(now) };
    case 'last_month': { const lm = subMonths(now, 1); return { start: startOfMonth(lm), end: endOfMonth(lm) }; }
    case '6months': return { start: subMonths(startOfMonth(now), 5), end: endOfMonth(now) };
    case 'year': return { start: startOfYear(now), end: endOfYear(now) };
    case 'last_year': { const ly = subYears(now, 1); return { start: startOfYear(ly), end: endOfYear(ly) }; }
    case 'custom':
      if (customStart && customEnd) return { start: new Date(customStart + 'T00:00:00'), end: new Date(customEnd + 'T23:59:59') };
      return { start: startOfMonth(now), end: endOfMonth(now) };
  }
}

interface DashboardStats {
  totalSales: number;
  totalRevenue: number;
  grossProfit: number;
  netProfit: number;
  totalCosts: number;
  clientsCount: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { activeCompany, isMaster } = useCompany();
  const [stats, setStats] = useState<DashboardStats>({ totalSales: 0, totalRevenue: 0, grossProfit: 0, netProfit: 0, totalCosts: 0, clientsCount: 0 });
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [period, setPeriod] = useState<Period>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        const raw = data.user.email?.split('@')[0] || 'Usuário';
        setUserName(raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase());
      }
    });
  }, []);

  useEffect(() => {
    if (isMaster) {
      if (period === 'custom' && (!customStart || !customEnd)) return;
      loadStats();
    }
  }, [activeCompany?.id, isMaster, period, customStart, customEnd]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRange(period, customStart, customEnd);
      const startStr = format(start, 'yyyy-MM-dd');
      const endStr = format(end, 'yyyy-MM-dd');
      let query = supabase.from('sales').select('id, client_name, total_sale, total_supplier_cost, gross_profit, net_profit, status, passengers_count, sale_date')
        .gte('sale_date', startStr)
        .lte('sale_date', endStr);
      if (activeCompany?.id) query = query.eq('empresa_id', activeCompany.id);
      const { data: sales } = await query;
      if (!sales) { setLoading(false); return; }

      const activeSales = sales.filter(s => s.status === 'active');
      const totalSales = activeSales.length;
      const totalRevenue = activeSales.reduce((s, v) => s + Number(v.total_sale || 0), 0);
      const grossProfit = activeSales.reduce((s, v) => s + Number(v.gross_profit || 0), 0);
      const netProfit = activeSales.reduce((s, v) => s + Number(v.net_profit || 0), 0);
      const totalCosts = activeSales.reduce((s, v) => s + Number(v.total_supplier_cost || 0), 0);
      const clientsCount = activeSales.reduce((s, v) => s + Number(v.passengers_count || 0), 0);

      setStats({ totalSales, totalRevenue, grossProfit, netProfit, totalCosts, clientsCount });
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  const statCards = [
    { label: 'Vendas', value: stats.totalSales.toString(), icon: ShoppingCart, color: 'text-primary' },
    { label: 'Faturado', value: fmt(stats.totalRevenue), icon: DollarSign, color: 'text-yellow-600' },
    { label: 'Lucro Bruto', value: fmt(stats.grossProfit), icon: TrendingUp, color: 'text-emerald-600' },
    { label: 'Lucro Líquido', value: fmt(stats.netProfit), icon: BarChart3, color: 'text-blue-600' },
    { label: 'Custos', value: fmt(stats.totalCosts), icon: TrendingDown, color: 'text-destructive' },
    { label: 'Clientes', value: stats.clientsCount.toString(), icon: Users, color: 'text-violet-600' },
  ];

  return (
    <AppLayout>
      <div className="p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold text-foreground">
              {userName ? `Bem-vindo, ${userName}` : 'Dashboard'}
            </h1>
            <p className="text-xs text-muted-foreground">{PERIOD_LABELS[period]}</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Mês atual</SelectItem>
                <SelectItem value="last_month">Mês passado</SelectItem>
                <SelectItem value="day">Hoje</SelectItem>
                <SelectItem value="week">Semana</SelectItem>
                <SelectItem value="6months">6 meses</SelectItem>
                <SelectItem value="year">Ano atual</SelectItem>
                <SelectItem value="last_year">Ano anterior</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
            {period === 'custom' && (
              <>
                <Input type="date" value={customStart} onChange={e => { setCustomStart(e.target.value); if (!customEnd || e.target.value > customEnd) setCustomEnd(e.target.value); }} className="w-[130px] h-8 text-xs" />
                <span className="text-xs text-muted-foreground">até</span>
                <Input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} min={customStart || undefined} className="w-[130px] h-8 text-xs" />
              </>
            )}
          </div>
        </div>

        {/* Stat cards - compact inline */}
        <div className="grid grid-cols-6 gap-2">
          {statCards.map((card) => (
            <Card key={card.label}>
              <CardContent className="px-2 py-1.5">
                <div className="flex items-center gap-1.5">
                  <card.icon className={`h-3.5 w-3.5 ${card.color}`} />
                  <span className="text-xs text-muted-foreground">{card.label}</span>
                </div>
                <p className={`text-sm font-bold ${card.color} mt-0.5`}>{card.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Pipeline */}
        <div>
          <h2 className="text-xs font-semibold text-foreground mb-1">Pipeline Comercial</h2>
          <PipelineDashboard />
        </div>
      </div>
    </AppLayout>
  );
}
