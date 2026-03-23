import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
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

interface DetailItem {
  id: string;
  name: string;
  value?: number;
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

  // Detail lists for hover
  const [quotesDetails, setQuotesDetails] = useState<DetailItem[]>([]);
  const [salesDetails, setSalesDetails] = useState<DetailItem[]>([]);
  const [awaitingSignatureDetails, setAwaitingSignatureDetails] = useState<DetailItem[]>([]);
  const [awaitingPaymentDetails, setAwaitingPaymentDetails] = useState<DetailItem[]>([]);
  const [overdueDetails, setOverdueDetails] = useState<DetailItem[]>([]);
  const [receivedDetails, setReceivedDetails] = useState<DetailItem[]>([]);
  const [conversionDetails, setConversionDetails] = useState<DetailItem[]>([]);
  const [ticketDetails, setTicketDetails] = useState<DetailItem[]>([]);


  useEffect(() => {
    if (!activeCompany?.id) return;
    loadStats();
  }, [activeCompany?.id]);

  const loadStats = async () => {
    setLoading(true);
    const empresaId = activeCompany?.id;
    if (!empresaId) return;

    const { data: allSales } = await supabase.from('sales')
      .select('id, status, total_sale, created_at, updated_at, sale_workflow_status, client_name')
      .eq('empresa_id', empresaId);

    const quotes = allSales?.filter(s => s.status === 'draft') || [];
    const sales = allSales?.filter(s => s.status === 'active') || [];

    const { data: contracts } = await supabase.from('contracts')
      .select('id, status, sent_at, viewed_at, signed_at, sale_id, client_name')
      .eq('empresa_id', empresaId);

    const { data: receivables } = await supabase.from('receivables')
      .select('id, amount, status, due_date, sale_id')
      .eq('empresa_id', empresaId);

    // Awaiting signature: contracts sent/viewed but not signed
    const unsignedContracts = contracts?.filter(c => c.status === 'sent' || c.status === 'viewed') || [];
    const awaitingSignature = unsignedContracts.length;

    // Also get sales with workflow status aguardando_assinatura
    const salesAwaitingSignature = sales.filter(s => (s as any).sale_workflow_status === 'aguardando_assinatura');
    
    // Build awaiting signature details from sales
    const sigDetailMap = new Map<string, DetailItem>();
    salesAwaitingSignature.forEach(s => {
      sigDetailMap.set(s.id, { id: s.id, name: (s as any).client_name || 'Sem nome', value: Number(s.total_sale || 0) });
    });
    unsignedContracts.forEach(c => {
      if (c.sale_id && !sigDetailMap.has(c.sale_id)) {
        sigDetailMap.set(c.sale_id, { id: c.sale_id, name: c.client_name || 'Sem nome' });
      }
    });
    setAwaitingSignatureDetails(Array.from(sigDetailMap.values()));

    const pendingReceivables = receivables?.filter(r => r.status === 'pending') || [];
    const paidReceivables = receivables?.filter(r => r.status === 'paid') || [];
    const overdueReceivables = pendingReceivables.filter(r =>
      r.due_date && new Date(r.due_date) < new Date()
    );

    const totalReceived = paidReceivables.reduce((s, r) => s + Number(r.amount || 0), 0);
    const totalOverdue = overdueReceivables.reduce((s, r) => s + Number(r.amount || 0), 0);
    const awaitingPayment = pendingReceivables.length;

    // Awaiting payment details - group by sale
    const salesAwaitingPayment = sales.filter(s => (s as any).sale_workflow_status === 'aguardando_pagamento');
    setAwaitingPaymentDetails(salesAwaitingPayment.map(s => ({
      id: s.id, name: (s as any).client_name || 'Sem nome', value: Number(s.total_sale || 0),
    })));

    // Overdue details
    const overdueByClient: Record<string, DetailItem> = {};
    for (const r of overdueReceivables) {
      const sale = allSales?.find(s => s.id === r.sale_id);
      const name = (sale as any)?.client_name || 'Sem nome';
      if (!overdueByClient[name]) {
        overdueByClient[name] = { id: r.id, name, value: 0 };
      }
      overdueByClient[name].value = (overdueByClient[name].value || 0) + Number(r.amount || 0);
    }
    setOverdueDetails(Object.values(overdueByClient));

    // Received details - group paid receivables by client
    const receivedByClient: Record<string, DetailItem> = {};
    for (const r of paidReceivables) {
      const sale = allSales?.find(s => s.id === r.sale_id);
      const name = (sale as any)?.client_name || 'Sem nome';
      if (!receivedByClient[name]) {
        receivedByClient[name] = { id: r.id, name, value: 0 };
      }
      receivedByClient[name].value = (receivedByClient[name].value || 0) + Number(r.amount || 0);
    }
    setReceivedDetails(Object.values(receivedByClient).slice(0, 15));

    const totalQuotesValue = quotes.reduce((s, q) => s + Number(q.total_sale || 0), 0);
    const totalSalesValue = sales.reduce((s, q) => s + Number(q.total_sale || 0), 0);

    const conversionRate = quotes.length + sales.length > 0
      ? (sales.length / (quotes.length + sales.length)) * 100
      : 0;

    const avgTicket = sales.length > 0 ? totalSalesValue / sales.length : 0;

    // Conversion details
    setConversionDetails([
      { id: 'sales', name: `Vendas convertidas`, value: sales.length },
      { id: 'quotes', name: `Cotações abertas`, value: quotes.length },
      { id: 'total', name: `Total de oportunidades`, value: quotes.length + sales.length },
    ]);

    // Ticket details - top sales by value
    setTicketDetails(sales.sort((a, b) => Number(b.total_sale || 0) - Number(a.total_sale || 0)).slice(0, 10).map(s => ({
      id: s.id, name: (s as any).client_name || 'Sem nome', value: Number(s.total_sale || 0),
    })));

    setQuotesDetails(quotes.slice(0, 10).map(q => ({
      id: q.id, name: (q as any).client_name || 'Sem nome', value: Number(q.total_sale || 0),
    })));
    setSalesDetails(sales.slice(0, 10).map(s => ({
      id: s.id, name: (s as any).client_name || 'Sem nome', value: Number(s.total_sale || 0),
    })));

    // Build alerts
    const newAlerts: Alert[] = [];

    const sentNotSigned = contracts?.filter(c => (c.status === 'sent' || c.status === 'viewed') && c.sent_at) || [];
    sentNotSigned.forEach(c => {
      const hours = differenceInHours(new Date(), new Date(c.sent_at!));
      if (hours > 48) {
        newAlerts.push({
          id: `contract-${c.id}`,
          type: 'danger',
          icon: PenTool,
          message: `Contrato de ${c.client_name || 'cliente'} enviado há ${Math.floor(hours / 24)} dias sem assinatura`,
        });
      }
    });

    const viewedNotSigned = contracts?.filter(c => c.status === 'viewed' && c.viewed_at && !c.signed_at) || [];
    if (viewedNotSigned.length > 0) {
      newAlerts.push({
        id: 'viewed-not-signed',
        type: 'warning',
        icon: Eye,
        message: `${viewedNotSigned.length} contrato(s) visualizado(s) sem assinatura`,
      });
    }

    if (overdueReceivables.length > 0) {
      newAlerts.push({
        id: 'overdue-payments',
        type: 'danger',
        icon: CreditCard,
        message: `${overdueReceivables.length} parcela(s) vencida(s) — ${fmt(totalOverdue)}`,
      });
    }

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

    const staleQuotes = quotes.filter(q => differenceInDays(new Date(), new Date(q.updated_at)) >= 3);
    if (staleQuotes.length > 0) {
      newAlerts.push({
        id: 'stale-quotes',
        type: 'info',
        icon: Clock,
        message: `${staleQuotes.length} cotação(ões) sem interação há mais de 3 dias`,
      });
    }

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
      awaitingSignature: Math.max(awaitingSignature, salesAwaitingSignature.length),
      awaitingPayment: Math.max(awaitingPayment, salesAwaitingPayment.length),
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

  const renderDetailPopover = (details: DetailItem[], emptyMsg: string, plainNumbers?: boolean) => (
    <div className="space-y-1.5 max-h-48 overflow-y-auto">
      {details.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">{emptyMsg}</p>
      ) : (
        details.map((d, i) => (
          <div key={d.id + i} className="flex items-center justify-between gap-2 text-xs">
            <span className="truncate font-medium">{d.name}</span>
            {d.value !== undefined && <span className="text-muted-foreground shrink-0">{plainNumbers ? d.value : fmt(d.value)}</span>}
          </div>
        ))
      )}
      {details.length >= 10 && (
        <p className="text-[10px] text-muted-foreground italic pt-1">...e mais</p>
      )}
    </div>
  );

  const kpis: { label: string; value: string; sub?: string; icon: any; color: string; details?: DetailItem[]; detailLabel?: string; detailFmtPlain?: boolean }[] = [
    { label: 'Cotações Abertas', value: stats.totalQuotes.toString(), sub: fmt(stats.totalQuotesValue), icon: FileText, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950', details: quotesDetails, detailLabel: 'Cotações abertas' },
    { label: 'Aguard. Assinatura', value: stats.awaitingSignature.toString(), icon: PenTool, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950', details: awaitingSignatureDetails, detailLabel: 'Aguardando assinatura' },
    { label: 'Aguard. Pagamento', value: stats.awaitingPayment.toString(), icon: CreditCard, color: 'text-purple-600 bg-purple-50 dark:bg-purple-950', details: awaitingPaymentDetails, detailLabel: 'Aguardando pagamento' },
    { label: 'Inadimplente', value: fmt(stats.totalOverdue), icon: AlertTriangle, color: stats.totalOverdue > 0 ? 'text-red-600 bg-red-50 dark:bg-red-950' : 'text-muted-foreground bg-muted', details: overdueDetails, detailLabel: 'Inadimplentes' },
    { label: 'Taxa Conversão', value: `${stats.conversionRate.toFixed(1)}%`, icon: TrendingUp, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950', details: conversionDetails, detailLabel: 'Composição da taxa de conversão', detailFmtPlain: true },
    { label: 'Ticket Médio', value: fmt(stats.avgTicket), icon: BarChart3, color: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-950', details: ticketDetails, detailLabel: 'Maiores vendas (compõem o ticket médio)' },
  ];

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3">
        {kpis.map(kpi => {
          const hasHover = kpi.details && kpi.details.length > 0;
          const cardContent = (
            <Card key={kpi.label} className={`border shadow-sm ${hasHover ? 'cursor-pointer hover:shadow-md transition-shadow' : 'cursor-default'}`}>
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
          );

          if (kpi.details && kpi.details.length > 0) {
            return (
              <HoverCard key={kpi.label} openDelay={200} closeDelay={100}>
                <HoverCardTrigger asChild>
                  {cardContent}
                </HoverCardTrigger>
                <HoverCardContent className="w-72" side="bottom" align="start">
                  <div className="space-y-2">
                    <p className="text-sm font-semibold">{kpi.detailLabel}</p>
                    {renderDetailPopover(kpi.details, 'Nenhum item', kpi.detailFmtPlain)}
                  </div>
                </HoverCardContent>
              </HoverCard>
            );
          }

          return cardContent;
        })}
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
