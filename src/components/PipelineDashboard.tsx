import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  FileText, DollarSign, PenTool, CreditCard, AlertTriangle,
  TrendingUp, Clock, CheckCircle2, Eye, Users, BarChart3,
} from 'lucide-react';
import { differenceInDays, differenceInHours } from 'date-fns';

interface PipelineStats {
  totalQuotes: number;
  totalQuotesValue: number;
  totalSales: number;
  totalSalesValue: number;
  awaitingSignature: number;
  awaitingPayment: number;
  totalReceived: number;
  totalOverdue: number;
  conversionRate: number;
  avgTicket: number;
  avgDaysToClose: number;
}

interface Alert {
  id: string;
  type: 'warning' | 'danger' | 'info';
  icon: any;
  message: string;
}

export default function PipelineDashboard() {
  const { activeCompany } = useCompany();
  const [stats, setStats] = useState<PipelineStats>({
    totalQuotes: 0, totalQuotesValue: 0, totalSales: 0, totalSalesValue: 0,
    awaitingSignature: 0, awaitingPayment: 0, totalReceived: 0, totalOverdue: 0,
    conversionRate: 0, avgTicket: 0, avgDaysToClose: 0,
  });
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeCompany?.id) return;
    loadStats();
  }, [activeCompany?.id]);

  const loadStats = async () => {
    setLoading(true);
    const empresaId = activeCompany?.id;
    if (!empresaId) return;

    // Fetch all sales (drafts=quotes, active=sales)
    const { data: allSales } = await supabase.from('sales')
      .select('id, status, total_sale, created_at, updated_at, sale_workflow_status')
      .eq('empresa_id', empresaId);

    const quotes = allSales?.filter(s => s.status === 'draft') || [];
    const sales = allSales?.filter(s => s.status === 'active') || [];

    // Contracts
    const { data: contracts } = await supabase.from('contracts')
      .select('id, status, sent_at, viewed_at, signed_at, sale_id')
      .eq('empresa_id', empresaId);

    // Receivables
    const { data: receivables } = await supabase.from('receivables')
      .select('id, amount, status, due_date, sale_id')
      .eq('empresa_id', empresaId);

    const awaitingSignature = contracts?.filter(c => c.status === 'sent' || c.status === 'viewed').length || 0;

    const pendingReceivables = receivables?.filter(r => r.status === 'pending') || [];
    const paidReceivables = receivables?.filter(r => r.status === 'paid') || [];
    const overdueReceivables = pendingReceivables.filter(r =>
      r.due_date && new Date(r.due_date) < new Date()
    );

    const totalReceived = paidReceivables.reduce((s, r) => s + Number(r.amount || 0), 0);
    const totalOverdue = overdueReceivables.reduce((s, r) => s + Number(r.amount || 0), 0);
    const awaitingPayment = pendingReceivables.length;

    const totalQuotesValue = quotes.reduce((s, q) => s + Number(q.total_sale || 0), 0);
    const totalSalesValue = sales.reduce((s, q) => s + Number(q.total_sale || 0), 0);

    const conversionRate = quotes.length + sales.length > 0
      ? (sales.length / (quotes.length + sales.length)) * 100
      : 0;

    const avgTicket = sales.length > 0 ? totalSalesValue / sales.length : 0;

    // Build alerts
    const newAlerts: Alert[] = [];

    // Contracts sent but not signed
    const sentNotSigned = contracts?.filter(c => (c.status === 'sent' || c.status === 'viewed') && c.sent_at) || [];
    sentNotSigned.forEach(c => {
      const hours = differenceInHours(new Date(), new Date(c.sent_at!));
      if (hours > 48) {
        newAlerts.push({
          id: `contract-${c.id}`,
          type: 'danger',
          icon: PenTool,
          message: `Contrato enviado há ${Math.floor(hours / 24)} dias sem assinatura`,
        });
      }
    });

    // Viewed but not signed
    const viewedNotSigned = contracts?.filter(c => c.status === 'viewed' && c.viewed_at && !c.signed_at) || [];
    if (viewedNotSigned.length > 0) {
      newAlerts.push({
        id: 'viewed-not-signed',
        type: 'warning',
        icon: Eye,
        message: `${viewedNotSigned.length} contrato(s) visualizado(s) sem assinatura`,
      });
    }

    // Overdue payments
    if (overdueReceivables.length > 0) {
      newAlerts.push({
        id: 'overdue-payments',
        type: 'danger',
        icon: CreditCard,
        message: `${overdueReceivables.length} parcela(s) vencida(s) — ${fmt(totalOverdue)}`,
      });
    }

    // Approved quotes without conversion
    const approvedNoConversion = quotes.filter(q =>
      (q as any).sale_workflow_status === 'emitido'
    );
    if (approvedNoConversion.length > 0) {
      newAlerts.push({
        id: 'approved-no-sale',
        type: 'warning',
        icon: TrendingUp,
        message: `${approvedNoConversion.length} cotação(ões) aprovada(s) sem conversão em venda`,
      });
    }

    // Stale quotes (no interaction > 3 days)
    const staleQuotes = quotes.filter(q => differenceInDays(new Date(), new Date(q.updated_at)) >= 3);
    if (staleQuotes.length > 0) {
      newAlerts.push({
        id: 'stale-quotes',
        type: 'info',
        icon: Clock,
        message: `${staleQuotes.length} cotação(ões) sem interação há mais de 3 dias`,
      });
    }

    // Sales without contracts
    const salesWithContracts = new Set(contracts?.map(c => c.sale_id) || []);
    const salesWithoutContracts = sales.filter(s => !salesWithContracts.has(s.id));
    if (salesWithoutContracts.length > 0) {
      newAlerts.push({
        id: 'no-contract',
        type: 'warning',
        icon: FileText,
        message: `${salesWithoutContracts.length} venda(s) sem contrato gerado`,
      });
    }

    setAlerts(newAlerts);

    setStats({
      totalQuotes: quotes.length,
      totalQuotesValue,
      totalSales: sales.length,
      totalSalesValue,
      awaitingSignature,
      awaitingPayment,
      totalReceived,
      totalOverdue,
      conversionRate,
      avgTicket,
      avgDaysToClose: 0,
    });

    setLoading(false);
  };

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map(i => (
          <Card key={i} className="animate-pulse"><CardContent className="p-6 h-24" /></Card>
        ))}
      </div>
    );
  }

  const kpis = [
    { label: 'Cotações Abertas', value: stats.totalQuotes.toString(), sub: fmt(stats.totalQuotesValue), icon: FileText, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950' },
    { label: 'Vendas Ativas', value: stats.totalSales.toString(), sub: fmt(stats.totalSalesValue), icon: DollarSign, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950' },
    { label: 'Aguard. Assinatura', value: stats.awaitingSignature.toString(), icon: PenTool, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950' },
    { label: 'Aguard. Pagamento', value: stats.awaitingPayment.toString(), icon: CreditCard, color: 'text-purple-600 bg-purple-50 dark:bg-purple-950' },
    { label: 'Recebido', value: fmt(stats.totalReceived), icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950' },
    { label: 'Inadimplente', value: fmt(stats.totalOverdue), icon: AlertTriangle, color: stats.totalOverdue > 0 ? 'text-red-600 bg-red-50 dark:bg-red-950' : 'text-muted-foreground bg-muted' },
    { label: 'Taxa Conversão', value: `${stats.conversionRate.toFixed(1)}%`, icon: TrendingUp, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950' },
    { label: 'Ticket Médio', value: fmt(stats.avgTicket), icon: BarChart3, color: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-950' },
  ];

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3">
        {kpis.map(kpi => (
          <Card key={kpi.label} className="border shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">{kpi.label}</p>
                  <p className="text-lg font-bold mt-0.5 truncate">{kpi.value}</p>
                  {kpi.sub && <p className="text-xs text-muted-foreground">{kpi.sub}</p>}
                </div>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${kpi.color}`}>
                  <kpi.icon className="h-4 w-4" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Alertas ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {alerts.map(alert => (
                <div
                  key={alert.id}
                  className={`flex items-center gap-3 p-2.5 rounded-lg text-sm ${
                    alert.type === 'danger' ? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
                      : alert.type === 'warning' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                  }`}
                >
                  <alert.icon className="h-4 w-4 shrink-0" />
                  <span>{alert.message}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
