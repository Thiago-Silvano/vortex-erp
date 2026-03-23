import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, CheckCircle2, Clock, AlertCircle, Eye, TrendingUp, Shield, Activity } from 'lucide-react';
import { format } from 'date-fns';

interface ContractStat {
  total: number;
  signed: number;
  pending: number;
  viewed: number;
  expired: number;
  sent: number;
}

interface AuditEntry {
  id: string;
  action: string;
  actor: string;
  actor_type: string;
  created_at: string;
  ip_address: string;
  contract_id: string;
  contract_title?: string;
  details?: any;
}

const STATUS_COLORS: Record<string, string> = {
  signed: 'bg-emerald-100 text-emerald-700',
  viewed: 'bg-amber-100 text-amber-700',
  sent: 'bg-blue-100 text-blue-700',
  draft: 'bg-muted text-muted-foreground',
  expired: 'bg-red-100 text-red-700',
};

const STATUS_LABELS: Record<string, string> = {
  signed: 'Assinado',
  viewed: 'Visualizado',
  sent: 'Enviado',
  draft: 'Rascunho',
  expired: 'Expirado',
};

export default function ContractsDashboardPage() {
  const { activeCompany } = useCompany();
  const [stats, setStats] = useState<ContractStat>({ total: 0, signed: 0, pending: 0, viewed: 0, expired: 0, sent: 0 });
  const [contracts, setContracts] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeCompany) loadData();
  }, [activeCompany]);

  const loadData = async () => {
    if (!activeCompany) return;
    setLoading(true);

    // Load contracts
    const { data: contractsData } = await supabase
      .from('contracts')
      .select('*')
      .eq('empresa_id', activeCompany.id)
      .order('created_at', { ascending: false });

    const list = (contractsData as any[]) || [];
    setContracts(list);

    // Calculate stats
    const s: ContractStat = { total: list.length, signed: 0, pending: 0, viewed: 0, expired: 0, sent: 0 };
    list.forEach(c => {
      if (c.status === 'signed') s.signed++;
      else if (c.status === 'viewed') s.viewed++;
      else if (c.status === 'sent') s.sent++;
      else if (c.status === 'expired') s.expired++;
      else s.pending++;
    });
    setStats(s);

    // Load recent audit logs (last 100)
    const contractIds = list.map(c => c.id);
    if (contractIds.length > 0) {
      const { data: logsData } = await supabase
        .from('contract_audit_log')
        .select('*')
        .in('contract_id', contractIds.slice(0, 50))
        .order('created_at', { ascending: false })
        .limit(100);

      const logs = ((logsData as any[]) || []).map(log => ({
        ...log,
        contract_title: list.find(c => c.id === log.contract_id)?.title || '',
      }));
      setAuditLogs(logs);
    }

    setLoading(false);
  };

  const conversionRate = stats.total > 0 ? ((stats.signed / stats.total) * 100).toFixed(1) : '0';

  const getActionLabel = (action: string) => {
    const map: Record<string, string> = {
      created: '📄 Criado',
      viewed: '👁️ Visualizado',
      signed: '✅ Assinado',
      sent_email: '📧 Enviado por email',
      sent_whatsapp: '💬 Enviado por WhatsApp',
    };
    return map[action] || action;
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard de Contratos</h1>
          <p className="text-sm text-muted-foreground mt-1">Visão geral de todos os contratos da empresa</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <FileText className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle2 className="h-5 w-5 mx-auto mb-1 text-emerald-600" />
              <p className="text-2xl font-bold text-emerald-600">{stats.signed}</p>
              <p className="text-xs text-muted-foreground">Assinados</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="h-5 w-5 mx-auto mb-1 text-amber-600" />
              <p className="text-2xl font-bold text-amber-600">{stats.viewed + stats.sent + stats.pending}</p>
              <p className="text-xs text-muted-foreground">Pendentes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <AlertCircle className="h-5 w-5 mx-auto mb-1 text-red-600" />
              <p className="text-2xl font-bold text-red-600">{stats.expired}</p>
              <p className="text-xs text-muted-foreground">Expirados</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-5 w-5 mx-auto mb-1 text-primary" />
              <p className="text-2xl font-bold text-primary">{conversionRate}%</p>
              <p className="text-xs text-muted-foreground">Taxa Conversão</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Shield className="h-5 w-5 mx-auto mb-1 text-blue-600" />
              <p className="text-2xl font-bold text-blue-600">{auditLogs.length}</p>
              <p className="text-xs text-muted-foreground">Logs Auditoria</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="contracts">
          <TabsList>
            <TabsTrigger value="contracts" className="gap-1.5"><FileText className="h-3.5 w-3.5" /> Contratos</TabsTrigger>
            <TabsTrigger value="audit" className="gap-1.5"><Activity className="h-3.5 w-3.5" /> Logs de Aceite</TabsTrigger>
          </TabsList>

          <TabsContent value="contracts">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contrato</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Criado</TableHead>
                      <TableHead>Assinado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                    ) : contracts.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum contrato encontrado</TableCell></TableRow>
                    ) : contracts.slice(0, 50).map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.title}</TableCell>
                        <TableCell>{c.client_name}</TableCell>
                        <TableCell>
                          <Badge className={STATUS_COLORS[c.status] || STATUS_COLORS.draft}>
                            {STATUS_LABELS[c.status] || c.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(c.created_at), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {c.signed_at ? format(new Date(c.signed_at), 'dd/MM/yyyy HH:mm') : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Ação</TableHead>
                      <TableHead>Contrato</TableHead>
                      <TableHead>Ator</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>IP</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                    ) : auditLogs.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum log de auditoria</TableCell></TableRow>
                    ) : auditLogs.map(log => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm whitespace-nowrap">
                          {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss')}
                        </TableCell>
                        <TableCell className="text-sm">{getActionLabel(log.action)}</TableCell>
                        <TableCell className="text-sm font-medium">{log.contract_title}</TableCell>
                        <TableCell className="text-sm">{log.actor || '—'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {log.actor_type === 'client' ? 'Cliente' : 'Usuário'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono">
                          {log.ip_address || '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
