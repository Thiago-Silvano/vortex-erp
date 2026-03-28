import { useEffect, useState } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingCart, DollarSign, TrendingUp, TrendingDown, Users, BarChart3, Lock } from 'lucide-react';
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
  const { activeCompany, isMaster } = useCompany();
  const [stats, setStats] = useState<DashboardStats>({ totalSales: 0, totalRevenue: 0, grossProfit: 0, netProfit: 0, totalCosts: 0, clientsCount: 0 });
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    if (isMaster) loadStats();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        const raw = data.user.email?.split('@')[0] || 'Usuário';
        setUserName(raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase());
      }
    });
  }, [activeCompany?.id, isMaster]);

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
    { label: 'Vendas', value: stats.totalSales.toString(), icon: ShoppingCart, color: 'text-primary' },
    { label: 'Faturado', value: fmt(stats.totalRevenue), icon: DollarSign, color: 'text-yellow-600' },
    { label: 'Lucro Bruto', value: fmt(stats.grossProfit), icon: TrendingUp, color: 'text-emerald-600' },
    { label: 'Lucro Líquido', value: fmt(stats.netProfit), icon: BarChart3, color: 'text-blue-600' },
    { label: 'Custos', value: fmt(stats.totalCosts), icon: TrendingDown, color: 'text-destructive' },
    { label: 'Clientes', value: stats.clientsCount.toString(), icon: Users, color: 'text-violet-600' },
  ];

  if (!isMaster) {
    return (
      <AppLayout>
        <div className="p-4 flex flex-col items-center justify-center min-h-[40vh] text-center gap-2">
          <Lock className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-medium">Acesso Restrito</p>
          <p className="text-xs text-muted-foreground">Dashboard restrito a usuários Master.</p>
          <Button variant="outline" size="sm" onClick={() => navigate('/sales')}>Ir para Vendas</Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold text-foreground">
              {userName ? `Bem-vindo, ${userName}` : 'Dashboard'}
            </h1>
            <p className="text-xs text-muted-foreground">Mês atual</p>
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
