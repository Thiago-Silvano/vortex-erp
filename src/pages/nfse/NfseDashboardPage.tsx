import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, CheckCircle2, AlertTriangle, XCircle, Clock, DollarSign } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';
import { DOCUMENT_STATUS_MAP, normalizeDocumentStatus, type NfseDocumentStatus } from '@/lib/fiscal';

interface DashboardStats {
  today: number;
  month: number;
  pendingBackend: number;
  rejected: number;
  cancelled: number;
  totalValue: number;
}

export default function NfseDashboardPage() {
  const { activeCompany } = useCompany();
  const [stats, setStats] = useState<DashboardStats>({ today: 0, month: 0, pendingBackend: 0, rejected: 0, cancelled: 0, totalValue: 0 });
  const [recentNotes, setRecentNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeCompany) loadStats();
  }, [activeCompany]);

  const loadStats = async () => {
    if (!activeCompany) return;
    setLoading(true);

    const now = new Date();
    const todayStart = startOfDay(now).toISOString();
    const todayEnd = endOfDay(now).toISOString();
    const monthStart = startOfMonth(now).toISOString();
    const monthEnd = endOfMonth(now).toISOString();

    const { count: todayCount } = await supabase
      .from('nfse_documents')
      .select('*', { count: 'exact', head: true })
      .eq('empresa_id', activeCompany.id)
      .in('status', ['authorized', 'autorizada'])
      .gte('data_emissao', todayStart)
      .lte('data_emissao', todayEnd);

    const { count: monthCount } = await supabase
      .from('nfse_documents')
      .select('*', { count: 'exact', head: true })
      .eq('empresa_id', activeCompany.id)
      .in('status', ['authorized', 'autorizada'])
      .gte('data_emissao', monthStart)
      .lte('data_emissao', monthEnd);

    const { count: pendingCount } = await supabase
      .from('nfse_documents')
      .select('*', { count: 'exact', head: true })
      .eq('empresa_id', activeCompany.id)
      .in('status', ['draft', 'rascunho', 'waiting_backend', 'processando', 'queued', 'signing', 'transmitting', 'transmitindo', 'awaiting_status', 'validating']);

    const { count: rejectedCount } = await supabase
      .from('nfse_documents')
      .select('*', { count: 'exact', head: true })
      .eq('empresa_id', activeCompany.id)
      .in('status', ['rejected', 'rejeitada', 'validation_failed', 'internal_error']);

    const { count: cancelledCount } = await supabase
      .from('nfse_documents')
      .select('*', { count: 'exact', head: true })
      .eq('empresa_id', activeCompany.id)
      .in('status', ['canceled', 'cancelada', 'cancel_requested']);

    const { data: valueData } = await supabase
      .from('nfse_documents')
      .select('valor_servicos')
      .eq('empresa_id', activeCompany.id)
      .in('status', ['authorized', 'autorizada'])
      .gte('data_emissao', monthStart)
      .lte('data_emissao', monthEnd);

    const totalValue = (valueData || []).reduce((sum, d) => sum + (d.valor_servicos || 0), 0);

    setStats({
      today: todayCount || 0,
      month: monthCount || 0,
      pendingBackend: pendingCount || 0,
      rejected: rejectedCount || 0,
      cancelled: cancelledCount || 0,
      totalValue,
    });

    const { data: recent } = await supabase
      .from('nfse_documents')
      .select('*')
      .eq('empresa_id', activeCompany.id)
      .order('created_at', { ascending: false })
      .limit(10);

    setRecentNotes(recent || []);
    setLoading(false);
  };

  const statusBadge = (rawStatus: string) => {
    const status = normalizeDocumentStatus(rawStatus);
    const display = DOCUMENT_STATUS_MAP[status];
    return <Badge variant={display.variant}>{display.label}</Badge>;
  };

  const cards = [
    { title: 'Autorizadas Hoje', value: stats.today, icon: FileText, color: 'text-primary' },
    { title: 'Autorizadas no Mês', value: stats.month, icon: CheckCircle2, color: 'text-emerald-500' },
    { title: 'Pendentes', value: stats.pendingBackend, icon: Clock, color: 'text-amber-500' },
    { title: 'Rejeitadas / Erros', value: stats.rejected, icon: AlertTriangle, color: 'text-orange-500' },
    { title: 'Canceladas', value: stats.cancelled, icon: XCircle, color: 'text-destructive' },
    { title: 'Faturado no Mês', value: `R$ ${stats.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: DollarSign, color: 'text-emerald-600' },
  ];

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard Fiscal</h1>
          <p className="text-sm text-muted-foreground">Visão geral das NFS-e</p>
        </div>

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

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Notas Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : recentNotes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma nota fiscal registrada ainda.</p>
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
