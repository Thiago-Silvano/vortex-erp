import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { ShoppingCart, Cog, CalendarDays, CheckCircle, XCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface Stats {
  salesThisMonth: number;
  inProduction: number;
  scheduled: number;
  approved: number;
  denied: number;
}

const STATUS_COLORS: Record<string, string> = {
  falta_passaporte: '#f59e0b',
  produzindo: '#3b82f6',
  agendado: '#8b5cf6',
  aguardando_renovacao: '#f97316',
  aprovado: '#22c55e',
  negado: '#ef4444',
};

const STATUS_LABELS: Record<string, string> = {
  falta_passaporte: 'Falta Passaporte',
  produzindo: 'Produzindo',
  agendado: 'Agendado',
  aguardando_renovacao: 'Aguardando Renovação',
  aprovado: 'Aprovado',
  negado: 'Negado',
};

export default function VistosDashboard() {
  const { activeCompany } = useCompany();
  const [stats, setStats] = useState<Stats>({ salesThisMonth: 0, inProduction: 0, scheduled: 0, approved: 0, denied: 0 });
  const [statusChart, setStatusChart] = useState<{ name: string; value: number; color: string }[]>([]);
  const [productChart, setProductChart] = useState<{ name: string; vendas: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');

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
    loadStats();
  }, [activeCompany?.id]);

  const loadStats = async () => {
    setLoading(true);
    const empresaId = activeCompany?.id;

    // Sales this month
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const { data: sales } = await supabase
      .from('visa_sales')
      .select('id, product_id')
      .eq('empresa_id', empresaId)
      .gte('sale_date', monthStart);

    // Processes
    const { data: processes } = await supabase
      .from('visa_processes')
      .select('status, product_id')
      .eq('empresa_id', empresaId);

    // Products for names
    const { data: products } = await supabase
      .from('visa_products')
      .select('id, name')
      .eq('empresa_id', empresaId);

    const productMap: Record<string, string> = {};
    products?.forEach(p => { productMap[p.id] = p.name; });

    const statusCounts: Record<string, number> = {};
    let inProd = 0, sched = 0, appr = 0, den = 0;
    processes?.forEach(p => {
      statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
      if (p.status === 'produzindo' || p.status === 'falta_passaporte' || p.status === 'aguardando_renovacao') inProd++;
      if (p.status === 'agendado') sched++;
      if (p.status === 'aprovado') appr++;
      if (p.status === 'negado') den++;
    });

    setStats({
      salesThisMonth: sales?.length || 0,
      inProduction: inProd,
      scheduled: sched,
      approved: appr,
      denied: den,
    });

    setStatusChart(
      Object.entries(statusCounts).map(([k, v]) => ({
        name: STATUS_LABELS[k] || k,
        value: v,
        color: STATUS_COLORS[k] || '#94a3b8',
      }))
    );

    // Sales by product
    const prodSales: Record<string, number> = {};
    sales?.forEach(s => {
      const name = productMap[s.product_id] || 'Outro';
      prodSales[name] = (prodSales[name] || 0) + 1;
    });
    setProductChart(Object.entries(prodSales).map(([name, vendas]) => ({ name, vendas })));

    setLoading(false);
  };

  const total = stats.approved + stats.denied;
  const approvalRate = total > 0 ? Math.round((stats.approved / total) * 100) : 0;

  const statCards = [
    { label: 'Vendas do Mês', value: stats.salesThisMonth, icon: ShoppingCart, color: 'bg-primary text-primary-foreground' },
    { label: 'Em Produção', value: stats.inProduction, icon: Cog, color: 'bg-blue-600 text-white' },
    { label: 'Agendadas', value: stats.scheduled, icon: CalendarDays, color: 'bg-violet-600 text-white' },
    { label: 'Aprovados', value: stats.approved, icon: CheckCircle, color: 'bg-emerald-600 text-white' },
    { label: 'Negados', value: stats.denied, icon: XCircle, color: 'bg-destructive text-destructive-foreground' },
  ];

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {userName ? `Bem-vindo, ${userName}.` : 'Dashboard Vistos'}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Visão geral — Vortex Vistos</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[1,2,3,4,5].map(i => <Card key={i} className="animate-pulse"><CardContent className="p-6 h-28" /></Card>)}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {statCards.map(c => (
                <Card key={c.label} className={`${c.color} border-0 shadow-md`}>
                  <CardContent className="p-5">
                    <c.icon className="h-7 w-7 opacity-80 mb-2" />
                    <p className="text-2xl font-bold">{c.value}</p>
                    <p className="text-sm opacity-80">{c.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {approvalRate > 0 && (
              <Card>
                <CardContent className="p-5">
                  <p className="text-sm text-muted-foreground mb-1">Taxa de Aprovação</p>
                  <p className="text-3xl font-bold text-foreground">{approvalRate}%</p>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {statusChart.length > 0 && (
                <Card>
                  <CardContent className="p-5">
                    <h3 className="font-semibold mb-4 text-foreground">Processos por Status</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie data={statusChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>
                          {statusChart.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {productChart.length > 0 && (
                <Card>
                  <CardContent className="p-5">
                    <h3 className="font-semibold mb-4 text-foreground">Vendas por Produto</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={productChart}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="vendas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
