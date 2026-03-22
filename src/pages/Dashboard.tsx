import { useEffect, useState } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingCart, DollarSign, TrendingUp, TrendingDown, Users, BarChart3 } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { useCompany } from '@/contexts/CompanyContext';
import PipelineDashboard from '@/components/PipelineDashboard';

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
  const { activeCompany } = useCompany();
  const [stats, setStats] = useState<DashboardStats>({ totalSales: 0, totalRevenue: 0, grossProfit: 0, netProfit: 0, totalCosts: 0, clientsCount: 0 });
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    loadStats();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        const raw = data.user.email?.split('@')[0] || 'Usuário';
        setUserName(raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase());
      }
    });
  }, [activeCompany?.id]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');
      let query = supabase.from('sales').select('id, client_name, total_sale, total_supplier_cost, gross_profit, net_profit, status, passengers_count, sale_date')
        .gte('sale_date', monthStart)
        .lte('sale_date', monthEnd);
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
    { label: 'Total de Vendas', value: stats.totalSales.toString(), icon: ShoppingCart, color: 'bg-primary text-primary-foreground', iconColor: 'text-primary-foreground/80' },
    { label: 'Total Faturado', value: fmt(stats.totalRevenue), icon: DollarSign, color: 'bg-yellow-500 text-white', iconColor: 'text-white/80' },
    { label: 'Lucro Bruto', value: fmt(stats.grossProfit), icon: TrendingUp, color: 'bg-emerald-600 text-white', iconColor: 'text-white/80' },
    { label: 'Lucro Líquido', value: fmt(stats.netProfit), icon: BarChart3, color: 'bg-blue-600 text-white', iconColor: 'text-white/80' },
    { label: 'Custos Totais', value: fmt(stats.totalCosts), icon: TrendingDown, color: 'bg-destructive text-destructive-foreground', iconColor: 'text-destructive-foreground/80' },
    { label: 'Clientes Atendidos', value: stats.clientsCount.toString(), icon: Users, color: 'bg-violet-600 text-white', iconColor: 'text-white/80' },
  ];

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {userName ? `Bem-vindo, ${userName}.` : 'Dashboard'}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Visão geral do mês atual</p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6 h-28" />
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {statCards.map((card) => (
              <Card key={card.label} className={`${card.color} border-0 shadow-md hover:shadow-lg transition-shadow`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <card.icon className={`h-5 w-5 ${card.iconColor}`} />
                  </div>
                  <p className="text-lg font-bold leading-tight">{card.value}</p>
                  <p className="text-xs opacity-80 mt-1">{card.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Pipeline Dashboard */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">Pipeline Comercial</h2>
          <PipelineDashboard />
        </div>
      </div>
    </AppLayout>
  );
}
