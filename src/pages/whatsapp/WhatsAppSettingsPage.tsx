import { useState, useEffect, useRef, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Wifi, WifiOff, QrCode, RefreshCw, Settings2, Smartphone, Loader2,
  Unplug, Zap, AlertTriangle, Activity, Clock, Send, Inbox, Server,
  Webhook, RotateCcw, FileText, Trash2, CheckCircle2, XCircle, Circle,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Session {
  id: string;
  empresa_id: string;
  status: string;
  phone_number: string;
  qr_code: string;
  server_url: string;
  connected_at: string | null;
  last_message_sent_at?: string | null;
  last_message_received_at?: string | null;
  webhook_status?: string;
}

interface LogEntry {
  id: string;
  event_type: string;
  message: string;
  details: any;
  created_at: string;
}

const statusMap: Record<string, { label: string; color: string; icon: any; indicator: string }> = {
  connected: { label: 'Conectado', color: 'bg-green-500', icon: Wifi, indicator: '🟢' },
  disconnected: { label: 'Desconectado', color: 'bg-destructive', icon: WifiOff, indicator: '🔴' },
  waiting_qr: { label: 'Aguardando QR Code', color: 'bg-yellow-500', icon: QrCode, indicator: '🟡' },
  connecting: { label: 'Reconectando...', color: 'bg-blue-500', icon: Loader2, indicator: '🟡' },
};

const eventTypeLabels: Record<string, { label: string; color: string }> = {
  qr_generated: { label: 'QR-Code', color: 'text-yellow-600' },
  qr_scanned: { label: 'QR Escaneado', color: 'text-blue-600' },
  session_connected: { label: 'Conectado', color: 'text-green-600' },
  session_disconnected: { label: 'Desconectado', color: 'text-red-600' },
  session_update: { label: 'Sessão', color: 'text-blue-600' },
  session_reset: { label: 'Reset', color: 'text-orange-600' },
  message_sent: { label: 'Enviado', color: 'text-green-600' },
  message_received: { label: 'Recebido', color: 'text-blue-600' },
  test_send: { label: 'Teste', color: 'text-purple-600' },
  error: { label: 'Erro', color: 'text-red-600' },
  verification: { label: 'Verificação', color: 'text-cyan-600' },
};

/**
 * Normalizes phone number to E.164 format (digits only).
 */
function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-\(\)\+]/g, '');
}

async function callProxy(endpoint: string, method: string, empresaId: string, payload?: any) {
  if (!empresaId) throw new Error('empresa_id não definido.');

  const { data, error } = await supabase.functions.invoke('whatsapp-proxy', {
    body: { endpoint, method, empresa_id: empresaId, payload },
  });

  if (error) throw new Error(error.message || 'Erro ao chamar o servidor');

  const errMsg = data?.error || data?.data?.error || '';
  if (typeof errMsg === 'string' && errMsg.toLowerCase().includes('empresa_id')) {
    throw new Error('Erro de identificação da empresa.');
  }

  return data;
}

async function addLocalLog(empresaId: string, eventType: string, message: string, details: any = {}) {
  await supabase.from('whatsapp_logs').insert({
    empresa_id: empresaId,
    event_type: eventType,
    message,
    details,
  } as any);
}

export default function WhatsAppSettingsPage() {
  const { activeCompany } = useCompany();
  const [session, setSession] = useState<Session | null>(null);
  const [serverUrl, setServerUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [pollingQr, setPollingQr] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);
  const [autoReconnectEnabled, setAutoReconnectEnabled] = useState(true);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoReconnectRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const empresaIdRef = useRef<string | null>(null);

  useEffect(() => {
    empresaIdRef.current = activeCompany?.id || null;
  }, [activeCompany?.id]);

  // ─── Fetch session ───
  const fetchSession = useCallback(async () => {
    if (!activeCompany?.id) return;
    const { data } = await supabase
      .from('whatsapp_sessions')
      .select('*')
      .eq('empresa_id', activeCompany.id)
      .single();
    if (data) {
      setSession(data as any as Session);
      setServerUrl((data as any).server_url || '');
    }
  }, [activeCompany?.id]);

  // ─── Fetch logs ───
  const fetchLogs = useCallback(async () => {
    if (!activeCompany?.id) return;
    const { data } = await supabase
      .from('whatsapp_logs')
      .select('*')
      .eq('empresa_id', activeCompany.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setLogs(data as any as LogEntry[]);
  }, [activeCompany?.id]);

  useEffect(() => { fetchSession(); fetchLogs(); }, [fetchSession, fetchLogs]);

  // Realtime
  useEffect(() => {
    if (!activeCompany?.id) return;
    const channel = supabase
      .channel(`wa-settings-${activeCompany.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_sessions', filter: `empresa_id=eq.${activeCompany.id}` }, () => fetchSession())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'whatsapp_logs', filter: `empresa_id=eq.${activeCompany.id}` }, () => fetchLogs())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeCompany?.id, fetchSession, fetchLogs]);

  useEffect(() => {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; setPollingQr(false); }
    setTestResult(null);
  }, [activeCompany?.id]);

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (autoReconnectRef.current) clearInterval(autoReconnectRef.current);
    };
  }, []);

  useEffect(() => {
    if (session?.status === 'connected') {
      if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; setPollingQr(false); }
      setReconnectAttempts(0);
    }
  }, [session?.status]);

  // ─── Auto-Reconnect Monitor ───
  useEffect(() => {
    if (autoReconnectRef.current) { clearInterval(autoReconnectRef.current); autoReconnectRef.current = null; }
    if (!autoReconnectEnabled || !activeCompany?.id) return;

    const MAX_ATTEMPTS = 5;
    const CHECK_INTERVAL = 60000; // check every 60s

    autoReconnectRef.current = setInterval(async () => {
      const empresaId = empresaIdRef.current;
      if (!empresaId) return;

      try {
        // Check current DB status
        const { data: currentSession } = await supabase
          .from('whatsapp_sessions')
          .select('status, server_url, phone_number')
          .eq('empresa_id', empresaId)
          .single();

        if (!currentSession?.server_url || currentSession.status === 'connected' || currentSession.status === 'waiting_qr' || currentSession.status === 'connecting') return;

        // Session is disconnected — check if VPS server is actually connected
        const result = await callProxy('/status', 'GET', empresaId);
        const d = result?.data || result;

        if (d?.connected === true) {
          // Server says connected but DB says disconnected — sync it
          console.log('[Auto-Reconnect] Server connected, syncing DB status...');
          await supabase.from('whatsapp_sessions').update({
            status: 'connected',
            connected_at: new Date().toISOString(),
            qr_code: '',
            updated_at: new Date().toISOString(),
            phone_number: d.phone || d.phone_number || currentSession?.phone_number || '',
          } as any).eq('empresa_id', empresaId);
          await addLocalLog(empresaId, 'session_connected', 'Auto-reconexão: status sincronizado com o servidor');
          setReconnectAttempts(0);
          fetchSession();
          return;
        }

        // Server is also disconnected — try to reconnect
        setReconnectAttempts(prev => {
          if (prev >= MAX_ATTEMPTS) {
            console.log('[Auto-Reconnect] Max attempts reached, pausing...');
            return prev;
          }
          return prev + 1;
        });

        // Check if we haven't exceeded max attempts
        const { data: latestSession } = await supabase
          .from('whatsapp_sessions')
          .select('status')
          .eq('empresa_id', empresaId)
          .single();

        if (latestSession?.status === 'connected') return;

        console.log('[Auto-Reconnect] Attempting reconnection...');
        await addLocalLog(empresaId, 'session_update', 'Auto-reconexão: tentando reconectar automaticamente...');

        const connectResult = await callProxy('/connect', 'GET', empresaId);
        const connectData = connectResult?.data || connectResult;

        if (connectData?.qr) {
          await supabase.from('whatsapp_sessions').update({
            status: 'waiting_qr',
            qr_code: connectData.qr,
            updated_at: new Date().toISOString(),
          } as any).eq('empresa_id', empresaId);
          await addLocalLog(empresaId, 'qr_generated', 'Auto-reconexão: novo QR Code gerado. Escaneie para reconectar.');
          fetchSession();
        } else if (connectData?.connected === true) {
          await supabase.from('whatsapp_sessions').update({
            status: 'connected',
            connected_at: new Date().toISOString(),
            qr_code: '',
            updated_at: new Date().toISOString(),
          } as any).eq('empresa_id', empresaId);
          await addLocalLog(empresaId, 'session_connected', 'Auto-reconexão: WhatsApp reconectado com sucesso!');
          setReconnectAttempts(0);
          fetchSession();
        }
      } catch (e) {
        console.error('[Auto-Reconnect] Error:', e);
      }
    }, CHECK_INTERVAL);

    return () => {
      if (autoReconnectRef.current) { clearInterval(autoReconnectRef.current); autoReconnectRef.current = null; }
    };
  }, [autoReconnectEnabled, activeCompany?.id, fetchSession]);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
    setPollingQr(false);
  }, []);

  const updateSession = useCallback(async (fields: Record<string, any>) => {
    if (!activeCompany?.id) return;
    await supabase.from('whatsapp_sessions').update({
      ...fields,
      updated_at: new Date().toISOString(),
    }).eq('empresa_id', activeCompany.id);
    await fetchSession();
  }, [activeCompany?.id, fetchSession]);

  // ─── Post-connection verification ───
  const runPostConnectionVerification = useCallback(async (empresaId: string, phoneFromServer?: string) => {
    try {
      // 1. Check actual connected phone from /status
      const statusResult = await callProxy('/status', 'GET', empresaId);
      const d = statusResult?.data || statusResult;
      const connectedPhone = d?.phone || d?.phone_number || phoneFromServer || '';
      
      if (connectedPhone) {
        // Compare with stored phone
        const { data: currentSession } = await supabase
          .from('whatsapp_sessions')
          .select('phone_number')
          .eq('empresa_id', empresaId)
          .single();
        
        const storedPhone = currentSession?.phone_number || '';
        const normalizedConnected = normalizePhone(connectedPhone);
        const normalizedStored = normalizePhone(storedPhone);

        if (normalizedStored && normalizedConnected !== normalizedStored) {
          await addLocalLog(empresaId, 'verification', 
            `Número alterado detectado! Anterior: ${storedPhone} → Novo: ${connectedPhone}`,
            { old_phone: storedPhone, new_phone: connectedPhone }
          );
        }

        await updateSession({
          phone_number: connectedPhone,
          status: 'connected',
          qr_code: '',
          connected_at: new Date().toISOString(),
        });

        await addLocalLog(empresaId, 'verification',
          `Verificação pós-conexão: Número ativo ${connectedPhone}. Sessão atualizada.`,
          { phone: connectedPhone }
        );
      }
    } catch (e) {
      console.error('Post-connection verification failed:', e);
    }
  }, [updateSession]);

  // ─── Poll /status ───
  const startStatusPolling = useCallback((empresaId: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    setPollingQr(true);
    let attempts = 0;
    const maxAttempts = 30;

    const poll = async () => {
      const currentEmpresaId = empresaIdRef.current || empresaId;
      attempts++;
      if (attempts > maxAttempts) {
        stopPolling();
        toast.error('Tempo esgotado aguardando QR Code.');
        await updateSession({ status: 'disconnected', qr_code: '' });
        return;
      }
      try {
        const result = await callProxy('/status', 'GET', currentEmpresaId);
        const d = result?.data || result;

        if (d?.qr) {
          await updateSession({ qr_code: d.qr, status: 'waiting_qr' });
        } else if (d?.connected === true) {
          stopPolling();
          toast.success('WhatsApp conectado com sucesso!');
          // Run post-connection verification
          await runPostConnectionVerification(currentEmpresaId, d.phone || d.phone_number);
        }
      } catch (e: any) {
        if (e?.message?.includes('empresa_id')) { stopPolling(); toast.error('Erro: empresa não identificada.'); }
      }
    };

    poll();
    pollingRef.current = setInterval(poll, 3000);
  }, [stopPolling, updateSession, runPostConnectionVerification]);

  // ─── Save server URL ───
  const handleSaveServerUrl = async () => {
    if (!activeCompany?.id) return;
    setLoading(true);
    try {
      let cleanUrl = serverUrl.trim();
      cleanUrl = cleanUrl.replace(/\/(connect|disconnect|send-message|status)(\?[^]*)?$/i, '');
      cleanUrl = cleanUrl.replace(/\/+$/, '');

      const { error } = await supabase.from('whatsapp_sessions').upsert({
        empresa_id: activeCompany.id,
        server_url: cleanUrl,
        status: session?.status || 'disconnected',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'empresa_id' });

      if (error) throw error;
      setServerUrl(cleanUrl);
      toast.success('URL do servidor salva!');
      await fetchSession();
    } catch (e: any) {
      toast.error('Erro ao salvar: ' + e.message);
    }
    setLoading(false);
  };

  // ─── Test connection ───
  const handleTestConnection = async () => {
    if (!serverUrl.trim() || !activeCompany?.id) { toast.error('Configure a URL primeiro'); return; }
    setLoading(true);
    setTestResult(null);
    setServerOnline(null);
    try {
      await handleSaveServerUrl();
      const result = await callProxy('/status', 'GET', activeCompany.id);

      if (result?.ok === false && result?.error) {
        setTestResult({ ok: false, message: `Servidor inacessível: ${result.error}` });
        setServerOnline(false);
        toast.error('Servidor inacessível');
      } else {
        setServerOnline(true);
        const d = result?.data || result;
        if (d?.connected === true) {
          setTestResult({ ok: true, message: 'Servidor conectado e WhatsApp ativo ✅' });
          await runPostConnectionVerification(activeCompany.id, d.phone || d.phone_number);
          toast.success('WhatsApp já está conectado!');
        } else {
          setTestResult({ ok: true, message: 'Servidor acessível ✅ (WhatsApp não conectado)' });
          toast.success('Servidor acessível!');
        }
      }
    } catch (e: any) {
      setTestResult({ ok: false, message: 'Servidor inacessível ❌' });
      setServerOnline(false);
      toast.error('Servidor inacessível');
    }
    setLoading(false);
  };

  // ─── Connect ───
  const handleConnect = async () => {
    if (!serverUrl.trim() || !activeCompany?.id) { toast.error('Configure a URL primeiro'); return; }
    setLoading(true);
    try {
      await handleSaveServerUrl();
      const statusResult = await callProxy('/status', 'GET', activeCompany.id);
      const statusData = statusResult?.data || statusResult;

      if (statusData?.connected === true) {
        await runPostConnectionVerification(activeCompany.id, statusData.phone || statusData.phone_number);
        toast.success('WhatsApp já está conectado!');
        setLoading(false);
        return;
      }

      if (statusData?.qr) {
        await updateSession({ qr_code: statusData.qr, status: 'waiting_qr' });
        toast.info('QR Code disponível! Escaneie com seu WhatsApp.');
        startStatusPolling(activeCompany.id);
        setLoading(false);
        return;
      }

      await updateSession({ status: 'connecting', qr_code: '' });
      await addLocalLog(activeCompany.id, 'session_update', 'Iniciando conexão com o servidor...');
      
      const connectResult = await callProxy('/connect', 'GET', activeCompany.id);
      const connectData = connectResult?.data || connectResult;
      const errMsg = connectResult?.error || connectData?.error || '';

      if (typeof errMsg === 'string' && errMsg.includes('already running')) {
        toast.info('Sessão já iniciada. Buscando QR Code...');
      } else if (connectResult?.ok === false && connectResult?.error) {
        toast.error('Erro: ' + connectResult.error);
        await updateSession({ status: 'disconnected' });
        await addLocalLog(activeCompany.id, 'error', `Falha ao conectar: ${connectResult.error}`);
        setLoading(false);
        return;
      } else {
        toast.success('Conexão iniciada! Buscando QR Code...');
      }

      await updateSession({ status: 'waiting_qr' });
      startStatusPolling(activeCompany.id);
    } catch (e: any) {
      toast.error('Servidor inacessível: ' + e.message);
      await addLocalLog(activeCompany?.id || '', 'error', `Erro ao conectar: ${e.message}`);
    }
    setLoading(false);
  };

  // ─── Disconnect ───
  const handleDisconnect = async () => {
    if (!activeCompany?.id) return;
    setLoading(true);
    stopPolling();
    try {
      await callProxy('/disconnect', 'GET', activeCompany.id);
      await updateSession({ status: 'disconnected', qr_code: '', connected_at: null });
      await addLocalLog(activeCompany.id, 'session_disconnected', 'WhatsApp desconectado pelo usuário');
      toast.success('WhatsApp desconectado');
      setTestResult(null);
    } catch (e: any) {
      toast.error('Erro: ' + e.message);
    }
    setLoading(false);
  };

  // ─── Reset Session (disconnect + clear + reconnect) ───
  const handleResetSession = async () => {
    if (!activeCompany?.id || !serverUrl.trim()) { toast.error('Configure a URL primeiro'); return; }
    setResetting(true);
    stopPolling();
    try {
      await addLocalLog(activeCompany.id, 'session_reset', 'Iniciando reset de sessão...');
      
      // Step 1: Disconnect
      try {
        await callProxy('/disconnect', 'GET', activeCompany.id);
      } catch { /* ignore */ }
      
      await updateSession({ status: 'disconnected', qr_code: '', connected_at: null, phone_number: '' });
      await addLocalLog(activeCompany.id, 'session_reset', 'Sessão desconectada. Aguardando limpeza...');

      // Step 2: Wait a bit for server to clean up
      await new Promise(r => setTimeout(r, 3000));

      // Step 3: Reconnect
      await updateSession({ status: 'connecting', qr_code: '' });
      const connectResult = await callProxy('/connect', 'GET', activeCompany.id);
      
      if (connectResult?.ok === false && connectResult?.error) {
        await addLocalLog(activeCompany.id, 'error', `Falha no reset: ${connectResult.error}`);
        toast.error('Erro no reset: ' + connectResult.error);
        await updateSession({ status: 'disconnected' });
      } else {
        await addLocalLog(activeCompany.id, 'session_reset', 'Sessão resetada. Novo QR-Code será gerado.');
        toast.success('Sessão resetada! Aguardando novo QR Code...');
        await updateSession({ status: 'waiting_qr' });
        startStatusPolling(activeCompany.id);
      }
    } catch (e: any) {
      toast.error('Erro no reset: ' + e.message);
      await addLocalLog(activeCompany.id, 'error', `Erro no reset: ${e.message}`);
    }
    setResetting(false);
  };

  // ─── Clear logs ───
  const handleClearLogs = async () => {
    if (!activeCompany?.id) return;
    await supabase.from('whatsapp_logs').delete().eq('empresa_id', activeCompany.id);
    setLogs([]);
    toast.success('Logs limpos');
  };

  const currentStatus = statusMap[session?.status || 'disconnected'] || statusMap.disconnected;
  const StatusIcon = currentStatus.icon;

  const formatDate = (date: string | null | undefined) => {
    if (!date) return '—';
    try {
      return format(new Date(date), "dd/MM/yyyy HH:mm", { locale: ptBR });
    } catch { return '—'; }
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          <Settings2 className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Configurações do WhatsApp</h1>
            <p className="text-sm text-muted-foreground">Conecte e gerencie seu WhatsApp Web</p>
          </div>
        </div>

        {/* ═══ Connection Status Card ═══ */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${currentStatus.color}/10`}>
                <StatusIcon className={`h-5 w-5 ${session?.status === 'connected' ? 'text-green-600' : session?.status === 'waiting_qr' || session?.status === 'connecting' ? 'text-yellow-600' : 'text-destructive'}`} />
              </div>
              Status da Conexão
              <Badge variant={session?.status === 'connected' ? 'default' : 'outline'} className="ml-auto">
                {currentStatus.indicator} {currentStatus.label}
              </Badge>
            </CardTitle>
            {session?.phone_number && session.status === 'connected' && (
              <CardDescription className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Número conectado: {session.phone_number}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {/* QR Code display */}
            {session?.status === 'waiting_qr' && session.qr_code && (
              <div className="flex flex-col items-center gap-4 py-6 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground font-medium">Escaneie o QR Code com seu WhatsApp</p>
                <div className="bg-card p-4 rounded-lg shadow-md">
                  <img
                    src={session.qr_code.startsWith('data:') ? session.qr_code : `data:image/png;base64,${session.qr_code}`}
                    alt="QR Code WhatsApp"
                    className="w-64 h-64 object-contain"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Abra o WhatsApp → Aparelhos conectados → Conectar um aparelho</p>
              </div>
            )}

            {pollingQr && !session?.qr_code && (
              <div className="flex flex-col items-center gap-4 py-6 bg-muted/30 rounded-lg">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground font-medium">Aguardando QR Code do servidor...</p>
                <Button variant="outline" size="sm" onClick={stopPolling}>Cancelar</Button>
              </div>
            )}

            {pollingQr && session?.qr_code && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Verificando status da conexão...
              </div>
            )}

            {testResult && (
              <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${testResult.ok ? 'bg-green-500/10 text-green-700' : 'bg-destructive/10 text-destructive'}`}>
                {testResult.ok ? <Wifi className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                {testResult.message}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 flex-wrap">
              <Button variant="outline" onClick={handleTestConnection} disabled={loading || !serverUrl.trim()}>
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
                Testar Conexão
              </Button>
              {session?.status !== 'connected' && (
                <Button onClick={handleConnect} disabled={loading || !serverUrl.trim() || pollingQr}>
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <QrCode className="h-4 w-4 mr-2" />}
                  Gerar novo QR-Code
                </Button>
              )}
              {session?.status === 'connected' && (
                <Button variant="destructive" onClick={handleDisconnect} disabled={loading}>
                  <Unplug className="h-4 w-4 mr-2" /> Desconectar
                </Button>
              )}
              <Button
                variant="outline"
                onClick={handleResetSession}
                disabled={resetting || loading || !serverUrl.trim()}
                className="border-orange-300 text-orange-700 hover:bg-orange-50"
              >
                {resetting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-2" />}
                Resetar Sessão
              </Button>
            </div>

            {/* Auto-Reconnect Toggle */}
            <Separator className="my-4" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw className={`h-4 w-4 ${autoReconnectEnabled ? 'text-green-600' : 'text-muted-foreground'}`} />
                <div>
                  <p className="text-sm font-medium">Auto-Reconexão</p>
                  <p className="text-xs text-muted-foreground">
                    Tenta reconectar automaticamente quando a sessão cair
                    {reconnectAttempts > 0 && ` (${reconnectAttempts}/5 tentativas)`}
                  </p>
                </div>
              </div>
              <Button
                variant={autoReconnectEnabled ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAutoReconnectEnabled(!autoReconnectEnabled)}
              >
                {autoReconnectEnabled ? 'Ativado' : 'Desativado'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ═══ Diagnostic Panel ═══ */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Diagnóstico da Conexão
            </CardTitle>
            <CardDescription>Informações detalhadas sobre o estado da integração</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Status */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
                <Circle className={`h-4 w-4 ${session?.status === 'connected' ? 'text-green-500 fill-green-500' : session?.status === 'waiting_qr' || session?.status === 'connecting' ? 'text-yellow-500 fill-yellow-500' : 'text-red-500 fill-red-500'}`} />
                <div>
                  <p className="text-xs text-muted-foreground">Status da Sessão</p>
                  <p className="text-sm font-medium">{currentStatus.indicator} {currentStatus.label}</p>
                </div>
              </div>

              {/* Phone */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
                <Smartphone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Número Ativo</p>
                  <p className="text-sm font-medium">{session?.phone_number || '—'}</p>
                </div>
              </div>

              {/* Connected at */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Última Conexão</p>
                  <p className="text-sm font-medium">{formatDate(session?.connected_at)}</p>
                </div>
              </div>

              {/* Last sent */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
                <Send className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Último Envio</p>
                  <p className="text-sm font-medium">{formatDate(session?.last_message_sent_at)}</p>
                </div>
              </div>

              {/* Last received */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
                <Inbox className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Último Recebimento</p>
                  <p className="text-sm font-medium">{formatDate(session?.last_message_received_at)}</p>
                </div>
              </div>

              {/* Server status */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
                <Server className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Servidor Node</p>
                  <p className="text-sm font-medium flex items-center gap-1">
                    {serverOnline === true ? <><CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> Online</> :
                     serverOnline === false ? <><XCircle className="h-3.5 w-3.5 text-red-500" /> Offline</> :
                     '— (testar para verificar)'}
                  </p>
                </div>
              </div>

              {/* Webhook status */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 sm:col-span-2 lg:col-span-1">
                <Webhook className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Webhook</p>
                  <p className="text-sm font-medium flex items-center gap-1">
                    {session?.webhook_status === 'active' ? <><CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> Ativo</> :
                     <><XCircle className="h-3.5 w-3.5 text-yellow-500" /> Sem dados</>}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ═══ Server Configuration ═══ */}
        <Card>
          <CardHeader>
            <CardTitle>Servidor de WhatsApp Web</CardTitle>
            <CardDescription>Configure a URL do seu servidor Node.js (whatsapp-web.js)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>URL do Servidor</Label>
              <Input
                value={serverUrl}
                onChange={e => setServerUrl(e.target.value)}
                placeholder="http://76.13.165.192:3000"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Endpoints: GET /connect, GET /status, GET /disconnect, POST /send-message
              </p>
            </div>
            <Button onClick={handleSaveServerUrl} disabled={loading} variant="outline">
              Salvar Configuração
            </Button>
          </CardContent>
        </Card>

        {/* ═══ Logs ═══ */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Logs de Eventos
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={fetchLogs}>
                  <RefreshCw className="h-3.5 w-3.5 mr-1" /> Atualizar
                </Button>
                <Button variant="outline" size="sm" onClick={handleClearLogs} className="text-destructive hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Limpar
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhum log registrado</p>
            ) : (
              <ScrollArea className="h-72">
                <div className="space-y-1">
                  {logs.map(log => {
                    const typeConfig = eventTypeLabels[log.event_type] || { label: log.event_type, color: 'text-muted-foreground' };
                    return (
                      <div key={log.id} className="flex items-start gap-3 py-2 px-2 rounded hover:bg-muted/30 text-sm">
                        <span className="text-xs text-muted-foreground whitespace-nowrap min-w-[110px]">
                          {formatDate(log.created_at)}
                        </span>
                        <Badge variant="outline" className={`text-[10px] ${typeConfig.color} min-w-[80px] justify-center`}>
                          {typeConfig.label}
                        </Badge>
                        <span className="text-foreground flex-1">{log.message}</span>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* ═══ Instructions ═══ */}
        <Card>
          <CardHeader>
            <CardTitle>Como funciona</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3 text-sm text-muted-foreground list-decimal list-inside">
              <li>Configure a URL do seu servidor Node.js (ex: http://76.13.165.192:3000)</li>
              <li>Clique em "Testar Conexão" para verificar se o servidor está acessível</li>
              <li>Clique em "Gerar novo QR-Code" — o servidor gerará um QR Code</li>
              <li>Escaneie o QR Code com seu celular (WhatsApp → Aparelhos conectados)</li>
              <li>O sistema verifica automaticamente o número conectado e atualiza o ERP</li>
              <li>Use "Resetar Sessão" para limpar sessões antigas e gerar novo QR-Code</li>
              <li>O servidor Node.js deve enviar eventos para o webhook:
                <code className="block mt-1 bg-muted px-2 py-1 rounded text-xs font-mono">
                  POST {import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-webhook
                </code>
              </li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
