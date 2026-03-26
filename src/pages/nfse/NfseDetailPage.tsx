import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { ArrowLeft, Download, Mail, MessageCircle, XCircle, RefreshCw, FileText, Building2, Clock, AlertTriangle, Info } from 'lucide-react';
import { format } from 'date-fns';
import {
  DOCUMENT_STATUS_MAP,
  normalizeDocumentStatus,
  isFiscalBackendConfigured,
  nfseApi,
  mapErrorToDisplay,
  mapRawErrorToMessage,
  type NfseDocumentStatus,
} from '@/lib/fiscal';

export default function NfseDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [note, setNote] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [apiLogs, setApiLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) loadNote();
  }, [id]);

  const loadNote = async () => {
    setLoading(true);
    const [noteRes, eventsRes, logsRes] = await Promise.all([
      supabase.from('nfse_documents').select('*').eq('id', id).single(),
      supabase.from('nfse_events').select('*').eq('nfse_id', id).order('created_at', { ascending: false }),
      supabase.from('nfse_api_logs').select('*').eq('nfse_id', id).order('created_at', { ascending: false }),
    ]);
    setNote(noteRes.data);
    setEvents(eventsRes.data || []);
    setApiLogs(logsRes.data || []);
    setLoading(false);
  };

  const statusBadge = (rawStatus: string) => {
    const status = normalizeDocumentStatus(rawStatus);
    const display = DOCUMENT_STATUS_MAP[status];
    return <Badge variant={display.variant} className="text-sm">{display.label}</Badge>;
  };

  const handleCheckStatus = async () => {
    if (!isFiscalBackendConfigured()) {
      toast.info('Backend fiscal não conectado. Não é possível consultar status.');
      return;
    }
    try {
      const result = await nfseApi.getStatus(id!);
      if (result.success) {
        await supabase.from('nfse_documents').update({
          status: result.data.status,
          numero_nfse: result.data.numero_nfse || note.numero_nfse,
          chave_nfse: result.data.chave_nfse || note.chave_nfse,
          protocolo: result.data.protocolo || note.protocolo,
          data_emissao: result.data.data_emissao || note.data_emissao,
          motivo_rejeicao: result.data.motivo_rejeicao || null,
          updated_at: new Date().toISOString(),
        }).eq('id', id);
        toast.success('Status atualizado.');
        loadNote();
      } else {
        toast.error(mapErrorToDisplay((result as any).error).message);
      }
    } catch (e) {
      toast.error(mapRawErrorToMessage(e));
    }
  };

  if (loading) return <AppLayout><div className="p-6 text-muted-foreground">Carregando...</div></AppLayout>;
  if (!note) return <AppLayout><div className="p-6 text-muted-foreground">Nota não encontrada.</div></AppLayout>;

  const normalizedStatus = normalizeDocumentStatus(note.status);
  const statusDisplay = DOCUMENT_STATUS_MAP[normalizedStatus];

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/nfse/list')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">NFS-e {note.numero_nfse || '(sem número)'}</h1>
                {statusBadge(note.status)}
                <Badge variant="outline">{note.ambiente === 'producao' ? 'PRODUÇÃO' : 'HOMOLOGAÇÃO'}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Criada em {format(new Date(note.created_at), 'dd/MM/yyyy HH:mm')} por {note.emitido_por || '—'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {note.xml_nfse_autorizada && <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1" /> XML</Button>}
            {note.pdf_url && <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1" /> PDF</Button>}
            <Button variant="outline" size="sm"><Mail className="h-4 w-4 mr-1" /> E-mail</Button>
            <Button variant="outline" size="sm"><MessageCircle className="h-4 w-4 mr-1" /> WhatsApp</Button>
            <Button variant="outline" size="sm" onClick={handleCheckStatus}><RefreshCw className="h-4 w-4 mr-1" /> Consultar</Button>
            {['authorized', 'autorizada'].includes(note.status) && (
              <Button variant="destructive" size="sm"><XCircle className="h-4 w-4 mr-1" /> Cancelar</Button>
            )}
          </div>
        </div>

        {/* Status description */}
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <Info className={`h-5 w-5 ${statusDisplay.color}`} />
            <div>
              <p className="text-sm font-medium">{statusDisplay.label}</p>
              <p className="text-xs text-muted-foreground">{statusDisplay.description}</p>
            </div>
          </CardContent>
        </Card>

        {/* Rejection info */}
        {['rejected', 'rejeitada', 'validation_failed'].includes(note.status) && note.motivo_rejeicao && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive">Nota Rejeitada</p>
                <p className="text-sm">{note.motivo_rejeicao}</p>
                {note.motivo_rejeicao_tecnico && (
                  <p className="text-xs text-muted-foreground mt-1">Detalhe técnico: {note.motivo_rejeicao_tecnico}</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cancellation info */}
        {['canceled', 'cancelada', 'cancel_requested'].includes(note.status) && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-destructive">
                {note.status === 'cancel_requested' ? 'Cancelamento Solicitado' : 'Nota Cancelada'}
              </p>
              <p className="text-sm">Motivo: {note.motivo_cancelamento || '—'}</p>
              <p className="text-xs text-muted-foreground">
                Por {note.cancelado_por} em {note.cancelado_em ? format(new Date(note.cancelado_em), 'dd/MM/yyyy HH:mm') : '—'}
              </p>
              {note.protocolo_cancelamento && (
                <p className="text-xs text-muted-foreground">Protocolo: {note.protocolo_cancelamento}</p>
              )}
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="dados">
          <TabsList>
            <TabsTrigger value="dados">Dados</TabsTrigger>
            <TabsTrigger value="xml">XML</TabsTrigger>
            <TabsTrigger value="eventos">Eventos ({events.length})</TabsTrigger>
            <TabsTrigger value="logs">Logs API ({apiLogs.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="dados" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Building2 className="h-4 w-4" /> Tomador</CardTitle></CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <p><strong>{note.tomador_razao_social || '—'}</strong></p>
                  <p>CPF/CNPJ: {note.tomador_cnpj_cpf || '—'}</p>
                  <p>E-mail: {note.tomador_email || '—'}</p>
                  <p>Telefone: {note.tomador_telefone || '—'}</p>
                  <p>{note.tomador_logradouro} {note.tomador_numero}, {note.tomador_bairro}</p>
                  <p>{note.tomador_municipio}/{note.tomador_uf} - CEP {note.tomador_cep}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4" /> Serviço</CardTitle></CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <p>Código: {note.codigo_servico || '—'}</p>
                  <p>Item Lista: {note.item_lista_servico || '—'}</p>
                  <p className="whitespace-pre-wrap">{note.descricao_servico || '—'}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader><CardTitle className="text-sm">Valores</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div><p className="text-muted-foreground text-xs">Valor Serviços</p><p className="font-medium">R$ {(note.valor_servicos || 0).toFixed(2)}</p></div>
                  <div><p className="text-muted-foreground text-xs">Deduções</p><p>R$ {(note.valor_deducoes || 0).toFixed(2)}</p></div>
                  <div><p className="text-muted-foreground text-xs">Descontos</p><p>R$ {(note.valor_descontos || 0).toFixed(2)}</p></div>
                  <div><p className="text-muted-foreground text-xs">Base Cálculo</p><p>R$ {(note.base_calculo || 0).toFixed(2)}</p></div>
                  <div><p className="text-muted-foreground text-xs">Alíquota</p><p>{note.aliquota}%</p></div>
                  <div><p className="text-muted-foreground text-xs">Valor ISS</p><p>R$ {(note.valor_iss || 0).toFixed(2)}</p></div>
                  <div><p className="text-muted-foreground text-xs">ISS Retido</p><p>{note.iss_retido ? 'Sim' : 'Não'}</p></div>
                  <div><p className="text-muted-foreground text-xs">Valor Líquido</p><p className="font-bold text-primary">R$ {(note.valor_liquido || 0).toFixed(2)}</p></div>
                </div>
              </CardContent>
            </Card>

            {(note.chave_nfse || note.protocolo) && (
              <Card>
                <CardHeader><CardTitle className="text-sm">Protocolo</CardTitle></CardHeader>
                <CardContent className="text-sm space-y-1">
                  {note.chave_nfse && <p>Chave: <span className="font-mono text-xs break-all">{note.chave_nfse}</span></p>}
                  {note.protocolo && <p>Protocolo: <span className="font-mono text-xs">{note.protocolo}</span></p>}
                  {note.data_emissao && <p>Data Emissão: {format(new Date(note.data_emissao), 'dd/MM/yyyy HH:mm:ss')}</p>}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="xml" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">XML DPS (Enviado)</CardTitle></CardHeader>
              <CardContent>
                <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto max-h-[400px] whitespace-pre-wrap font-mono">
                  {note.xml_dps || 'Nenhum XML disponível — será gerado pelo backend fiscal externo.'}
                </pre>
              </CardContent>
            </Card>
            {note.xml_nfse_autorizada && (
              <Card className="mt-4">
                <CardHeader><CardTitle className="text-sm">XML NFS-e Autorizada</CardTitle></CardHeader>
                <CardContent>
                  <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto max-h-[400px] whitespace-pre-wrap font-mono">
                    {note.xml_nfse_autorizada}
                  </pre>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="eventos" className="mt-4">
            <Card>
              <CardContent className="p-4">
                {events.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhum evento registrado.</p>
                ) : (
                  <div className="space-y-3">
                    {events.map(ev => (
                      <div key={ev.id} className="flex items-start gap-3 p-3 rounded border border-border/50">
                        <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{ev.event_type}</span>
                            <Badge variant="outline" className="text-[10px]">{ev.source || 'frontend'}</Badge>
                            <span className="text-xs text-muted-foreground">{format(new Date(ev.created_at), 'dd/MM/yyyy HH:mm:ss')}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">{ev.description}</p>
                          {ev.user_email && <p className="text-xs text-muted-foreground">Por: {ev.user_email}</p>}
                          {ev.previous_status && ev.new_status && (
                            <p className="text-xs text-muted-foreground">
                              Status: {ev.previous_status} → {ev.new_status}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs" className="mt-4">
            <Card>
              <CardContent className="p-4">
                {apiLogs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhum log de API registrado.</p>
                ) : (
                  <div className="space-y-3">
                    {apiLogs.map(log => (
                      <div key={log.id} className="p-3 rounded border border-border/50 space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{log.method}</Badge>
                          <span className="text-xs font-mono">{log.endpoint}</span>
                          <Badge variant="outline" className="text-[10px]">{log.source || 'frontend'}</Badge>
                          <Badge variant={log.response_status && log.response_status < 300 ? 'default' : 'destructive'} className="ml-auto">
                            {log.response_status || 'N/A'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{log.response_time_ms}ms</span>
                        </div>
                        {log.request_id && <p className="text-xs text-muted-foreground">Request ID: {log.request_id}</p>}
                        <p className="text-xs text-muted-foreground">{format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss')}</p>
                        {log.error_message && <p className="text-xs text-destructive">{log.error_message}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
