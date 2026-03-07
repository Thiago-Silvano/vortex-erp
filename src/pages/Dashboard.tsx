import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, CheckCircle, TrendingUp, TrendingDown, Plus, DollarSign } from 'lucide-react';
import AppLayout from '@/components/AppLayout';

interface DashboardStats {
  openCount: number;
  openValue: number;
  completedCount: number;
  soldValue: number;
  lostValue: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({ openCount: 0, openValue: 0, completedCount: 0, soldValue: 0, lostValue: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const { data: quotes } = await supabase.from('quotes').select('status, payment_rav, id');
      if (!quotes) { setLoading(false); return; }

      // Fetch services totals for each quote
      const quoteIds = quotes.map(q => q.id);
      const { data: services } = await supabase.from('services').select('quote_id, value, quantity').in('quote_id', quoteIds);

      const quoteTotals: Record<string, number> = {};
      services?.forEach(s => {
        quoteTotals[s.quote_id] = (quoteTotals[s.quote_id] || 0) + Number(s.value) * s.quantity;
      });

      let openCount = 0, openValue = 0, completedCount = 0, soldValue = 0, lostValue = 0;

      quotes.forEach(q => {
        const servicesCost = quoteTotals[q.id] || 0;
        const rav = Number(q.payment_rav) || 0;
        const total = servicesCost + rav;

        if (q.status === 'concluido') {
          completedCount++;
          soldValue += total;
        } else if (q.status === 'perdido') {
          lostValue += total;
        } else {
          openCount++;
          openValue += total;
        }
      });

      setStats({ openCount, openValue, completedCount, soldValue, lostValue });
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const statCards = [
    {
      label: 'Cotações em Aberto',
      value: stats.openCount.toString(),
      subtitle: `R$ ${stats.openValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icon: FileText,
      color: 'bg-primary text-primary-foreground',
      iconColor: 'text-primary-foreground/80',
    },
    {
      label: 'Cotações Concluídas',
      value: stats.completedCount.toString(),
      icon: CheckCircle,
      color: 'bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]',
      iconColor: 'text-white/80',
    },
    {
      label: 'Valor Vendido',
      value: `R$ ${stats.soldValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icon: TrendingUp,
      color: 'bg-accent text-accent-foreground',
      iconColor: 'text-accent-foreground/80',
    },
    {
      label: 'Valor Perdido',
      value: `R$ ${stats.lostValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icon: TrendingDown,
      color: 'bg-destructive text-destructive-foreground',
      iconColor: 'text-destructive-foreground/80',
    },
  ];

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground text-sm mt-1">Visão geral das suas cotações</p>
          </div>
          <Button onClick={() => navigate('/new')} className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90 font-semibold">
            <Plus className="h-5 w-5" /> Nova Cotação
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6 h-32" />
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((card) => (
              <Card key={card.label} className={`${card.color} border-0 shadow-md hover:shadow-lg transition-shadow`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <card.icon className={`h-8 w-8 ${card.iconColor}`} />
                  </div>
                  <p className="text-2xl font-bold">{card.value}</p>
                  <p className="text-sm opacity-80 mt-1">{card.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="cursor-pointer hover:shadow-md transition-shadow border-2 border-transparent hover:border-accent" onClick={() => navigate('/quotes')}>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Ver Cotações</h3>
                <p className="text-sm text-muted-foreground">Gerenciar todas as cotações</p>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-shadow border-2 border-transparent hover:border-accent" onClick={() => navigate('/new')}>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-accent/20 flex items-center justify-center">
                <Plus className="h-6 w-6 text-accent-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Nova Cotação</h3>
                <p className="text-sm text-muted-foreground">Criar uma nova cotação do zero</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
