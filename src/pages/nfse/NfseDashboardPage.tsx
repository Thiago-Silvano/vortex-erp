import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FileText, CheckCircle2, AlertTriangle, XCircle, Clock, DollarSign, TrendingUp, BarChart3 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DashboardStats {
  today: number;
  month: number;
  pending: number;
  rejected: number;
  cancelled: number;
  totalValue: number;
}

export default function NfseDashboardPage() {
  const { activeCompany } = useCompany();
  const [stats, setStats] = useState<DashboardStats>({ today: 0, month: 0, pending: 0, rejected: 0, cancelled: 0, totalValue: 0 });
  const [recentNotes, setRecentNotes] = useState<any[]>([]);
  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeCompany) return;
    loadStats();
  }, [activeCompany, period]);

  const loadStats = async () => {
    if (!activeCompany) return;
    setLoading(true);

    const now = new Date();
    const todayStart = startOfDay(now).toISOString();
    const todayEnd = endOfDay(now).toISOString();
    const monthStart = startOfMonth(now).toISOString();
    const monthEnd = endOfMonth(now).toISOString();

    // Today's emissions
    const { count: todayCount } = await supabase
      .from('nfse_documents')
      .select('*', { count: 'exact', head: true })
      .eq('empresa_id', activeCompany.id)
      .eq('status', 'autorizada')
      .gte('data_emissao', todayStart)
      .lte('data_emissao', todayEnd);

    // Month emissions
    const { count: monthCount } = await supabase
      .from('nfse_documents')
      .select('*', { count: 'exact', head: true })
      .eq('empresa_id', activeCompany.id)
      .eq('status', 'autorizada')
      .gte('data_emissao', monthStart)
      .lte('data_emissao', monthEnd);

    // Pending
    const { count: pendingCount } = await supabase
      .from('nfse_documents')
      .select('*', { count: 'exact', head: true })
      .eq('empresa_id', activeCompany.id)
      .in('status', ['rascunho', 'processando', 'transmitindo']);

    // Rejected
    const { count: rejectedCount } = await supabase
      .from('nfse_documents')
      .select('*', { count: 'exact', head: true })
      .eq('empresa_id', activeCompany.id)
      .eq('status', 'rejeitada');

    // Cancelled
    const { count: cancelledCount } = await supabase
      .from('nfse_documents')
      .select('*', { count: 'exact', head: true })
      .eq('empresa_id', activeCompany.id)
      .eq('status', 'cancelada');

    // Total value this month
    const { data: valueData } = await supabase
      .from('nfse_documents')
      .select('valor_servicos')
      .eq('empresa_id', activeCompany.id)
      .eq('status', 'autorizada')
      .gte('data_emissao', monthStart)
      .lte('data_emissao', monthEnd);

    const totalValue = (valueData || []).reduce((sum, d) => sum + (d.valor_servicos || 0), 0);

    setStats({
      today: todayCount || 0,
      month: monthCount || 0,
      pending: pendingCount || 0,
      rejected: rejectedCount || 0,
      cancelled: cancelledCount || 0,
      totalValue,
    });

    // Recent notes
    const { data: recent } = await supabase
      .from('nfse_documents')
      .select('*')
      .eq('empresa_id', activeCompany.id)
      .order('created_at', { ascending: false })
      .limit(10);

    setRecentNotes(recent || []);
    setLoading(false);
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      rascunho: { label: 'Rascunho', variant: 'secondary' },
      processando: { label: 'Processando', variant: 'outline' },
      transmitindo: { label: 'Transmitindo', variant: 'outline' },
      autorizada: { label: 'Autorizada', variant: 'default' },
      rejeitada: { label: 'Rejeitada', variant: 'destructive' },
      cancelada: { label: 'Cancelada', variant: 'destructive' },
    };
    const s = map[status] || { label: status, variant: 'secondary' as const };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  const cards = [
    { title: 'Emitidas Hoje', value: stats.today, icon: FileText, color: 'text-primary' },
    { title: 'Emitidas no Mês', value: stats.month, icon: CheckCircle2, color: 'text-emerald-500' },
    { title: 'Pendentes', value: stats.pending, icon: Clock, color: 'text-amber-500' },
    { title: 'Rejeitadas', value: stats.rejected, icon: AlertTriangle, color: 'text-orange-500' },
    { title: 'Canceladas', value: stats.cancelled, icon: XCircle, color: 'text-destructive' },
    { title: 'Faturado no Mês', value: `R$ ${stats.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: DollarSign, color: 'text-emerald-600' },
  ];

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard Fiscal</h1>
            <p className="text-sm text-muted-foreground">Visão geral das NFS-e</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {cards.map((card) => (
            <Card key={card.title} className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <card.icon className={`h-4 w-4 ${card.color}`} />
                  <span className="text-xs text-muted-foreground">{card.title}</span>
                </div>
                <p className="text-xl font-bold text-foreground">{card.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Notas Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : recentNotes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma nota fiscal emitida ainda.</p>
            ) : (
              <div className="space-y-2">
                {recentNotes.map((note) => (
                  <div key={note.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{note.tomador_razao_social || 'Sem tomador'}</p>
                        <p className="text-xs text-muted-foreground">
                          {note.numero_nfse ? `Nº ${note.numero_nfse}` : 'Sem número'} •{' '}
                          {note.data_emissao ? format(new Date(note.data_emissao), 'dd/MM/yyyy HH:mm') : format(new Date(note.created_at), 'dd/MM/yyyy HH:mm')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">
                        R$ {(note.valor_servicos || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      {statusBadge(note.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
