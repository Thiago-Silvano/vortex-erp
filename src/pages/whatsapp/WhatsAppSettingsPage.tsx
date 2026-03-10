import { useState, useEffect, useRef, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, QrCode, RefreshCw, Settings2, Smartphone, Loader2, Unplug, Zap, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface Session {
  id: string;
  empresa_id: string;
  status: string;
  phone_number: string;
  qr_code: string;
  server_url: string;
  connected_at: string | null;
}

const statusMap: Record<string, { label: string; color: string; icon: any }> = {
  connected: { label: 'Conectado', color: 'bg-green-500', icon: Wifi },
  disconnected: { label: 'Desconectado', color: 'bg-destructive', icon: WifiOff },
  waiting_qr: { label: 'Aguardando QR Code', color: 'bg-yellow-500', icon: QrCode },
  connecting: { label: 'Conectando...', color: 'bg-blue-500', icon: Loader2 },
};

/** Calls the whatsapp-proxy edge function which proxies to the external Node.js server */
async function callProxy(endpoint: string, method: string, empresaId: string, payload?: any) {
  const { data, error } = await supabase.functions.invoke('whatsapp-proxy', {
    body: {
      endpoint,
      method,
      empresa_id: empresaId,
      payload,
    },
  });

  if (error) {
    console.error('Erro na chamada ao proxy WhatsApp:', error);
    throw new Error(error.message || 'Erro ao chamar o servidor');
  }

  console.log(`[WhatsApp Proxy] ${method} ${endpoint} →`, data);
  return data;
}

export default function WhatsAppSettingsPage() {
  const { activeCompany } = useCompany();
  const [session, setSession] = useState<Session | null>(null);
  const [serverUrl, setServerUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [pollingQr, setPollingQr] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchSession = async () => {
    if (!activeCompany?.id) return;
    const { data } = await supabase
      .from('whatsapp_sessions')
      .select('*')
      .eq('empresa_id', activeCompany.id)
      .single();
    if (data) {
      setSession(data as Session);
      setServerUrl((data as Session).server_url || '');
    }
  };

  useEffect(() => { fetchSession(); }, [activeCompany?.id]);

  // Realtime subscription for session updates
  useEffect(() => {
    if (!activeCompany?.id) return;
    const channel = supabase
      .channel('wa-session')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_sessions' }, () => {
        fetchSession();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeCompany?.id]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // Stop polling when connected or disconnected
  useEffect(() => {
    if (session?.status === 'connected' && pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
      setPollingQr(false);
      toast.success('WhatsApp conectado com sucesso!');
    }
  }, [session?.status]);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setPollingQr(false);
  }, []);

  const pollForQrCode = useCallback(async (empresaId: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    setPollingQr(true);

    let attempts = 0;
    const maxAttempts = 30; // 30 * 3s = 90s max polling

    const poll = async () => {
      attempts++;
      if (attempts > maxAttempts) {
        stopPolling();
        toast.error('Tempo esgotado aguardando QR Code. Tente novamente.');
        return;
      }

      try {
        const result = await callProxy('/status', 'GET', empresaId);
        const data = result?.data;
        console.log('[QR Poll] Status response:', data);

        if (data?.qr) {
          // QR code received - save to session
          await supabase.from('whatsapp_sessions').update({
            qr_code: data.qr,
            status: 'waiting_qr',
            updated_at: new Date().toISOString(),
          }).eq('empresa_id', empresaId);
          fetchSession();
        } else if (data?.connected || data?.status === 'connected' || data?.authenticated) {
          // Already connected
          await supabase.from('whatsapp_sessions').update({
            status: 'connected',
            qr_code: '',
            phone_number: data.phone || data.phone_number || '',
            connected_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }).eq('empresa_id', empresaId);
          stopPolling();
          fetchSession();
        }
      } catch (e) {
        console.error('[QR Poll] Error:', e);
      }
    };

    // First poll immediately
    await poll();
    // Then every 3 seconds
    pollingRef.current = setInterval(poll, 3000);
  }, [stopPolling]);

  const handleSaveServerUrl = async () => {
    if (!activeCompany?.id) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('whatsapp_sessions').upsert({
        empresa_id: activeCompany.id,
        server_url: serverUrl.trim(),
        status: session?.status || 'disconnected',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'empresa_id' });

      if (error) throw error;
      toast.success('URL do servidor salva!');
      fetchSession();
    } catch (e: any) {
      toast.error('Erro ao salvar: ' + e.message);
    }
    setLoading(false);
  };

  const handleTestConnection = async () => {
    if (!serverUrl.trim() || !activeCompany?.id) {
      toast.error('Configure a URL do servidor primeiro');
      return;
    }
    setLoading(true);
    setTestResult(null);

    try {
      await handleSaveServerUrl();
      const result = await callProxy('/status', 'GET', activeCompany.id);

      if (result?.ok) {
        setTestResult({ ok: true, message: 'Servidor conectado ✅' });
        toast.success('Servidor conectado com sucesso!');
      } else {
        setTestResult({ ok: false, message: `Servidor respondeu com erro: ${result?.error || result?.data?.message || 'desconhecido'}` });
        toast.error('Servidor respondeu com erro');
      }
    } catch (e: any) {
      console.error('Erro ao testar conexão:', e);
      setTestResult({ ok: false, message: 'Servidor inacessível ❌' });
      toast.error('Servidor inacessível');
    }
    setLoading(false);
  };

  const handleConnect = async () => {
    if (!serverUrl.trim() || !activeCompany?.id) {
      toast.error('Configure a URL do servidor primeiro');
      return;
    }
    setLoading(true);
    try {
      await handleSaveServerUrl();

      // Update status to connecting
      await supabase.from('whatsapp_sessions').update({
        status: 'connecting',
        qr_code: '',
        updated_at: new Date().toISOString(),
      }).eq('empresa_id', activeCompany.id);
      fetchSession();

      const result = await callProxy('/connect', 'GET', activeCompany.id);

      if (result?.ok !== false) {
        // Check if QR code came directly in the response
        const qr = result?.data?.qr || result?.data?.qrCode || result?.data?.qr_code;
        if (qr) {
          await supabase.from('whatsapp_sessions').update({
            qr_code: qr,
            status: 'waiting_qr',
            updated_at: new Date().toISOString(),
          }).eq('empresa_id', activeCompany.id);
          fetchSession();
          toast.success('QR Code recebido! Escaneie com seu WhatsApp.');
        } else {
          // Start polling for QR code
          toast.success('Conexão iniciada! Buscando QR Code...');
          await supabase.from('whatsapp_sessions').update({
            status: 'waiting_qr',
            updated_at: new Date().toISOString(),
          }).eq('empresa_id', activeCompany.id);
          fetchSession();
          pollForQrCode(activeCompany.id);
        }
      } else {
        toast.error('Erro do servidor: ' + (result?.error || 'desconhecido'));
      }
    } catch (e: any) {
      console.error('Erro ao conectar ao servidor WhatsApp:', e);
      toast.error('Servidor inacessível: ' + e.message);
    }
    setLoading(false);
  };

  const handleDisconnect = async () => {
    if (!activeCompany?.id) return;
    setLoading(true);
    try {
      await callProxy('/disconnect', 'GET', activeCompany.id);

      await supabase.from('whatsapp_sessions').update({
        status: 'disconnected',
        qr_code: '',
        connected_at: null,
        updated_at: new Date().toISOString(),
      }).eq('empresa_id', activeCompany.id);

      toast.success('WhatsApp desconectado');
      setTestResult(null);
      fetchSession();
    } catch (e: any) {
      console.error('Erro ao desconectar:', e);
      toast.error('Erro: ' + e.message);
    }
    setLoading(false);
  };

  const currentStatus = statusMap[session?.status || 'disconnected'] || statusMap.disconnected;
  const StatusIcon = currentStatus.icon;

  return (
    <AppLayout>
      <div className="p-6 space-y-6 max-w-3xl mx-auto">
        <div className="flex items-center gap-3">
          <Settings2 className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Configurações do WhatsApp</h1>
            <p className="text-sm text-muted-foreground">Conecte seu WhatsApp Web ao sistema</p>
          </div>
        </div>

        {/* Connection Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${currentStatus.color}/10`}>
                <StatusIcon className={`h-5 w-5 ${session?.status === 'connected' ? 'text-green-600' : session?.status === 'waiting_qr' ? 'text-yellow-600' : 'text-destructive'}`} />
              </div>
              Status da Conexão
              <Badge variant={session?.status === 'connected' ? 'default' : 'outline'} className="ml-auto">
                {currentStatus.label}
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
                <Button variant="outline" size="sm" onClick={fetchSession}>
                  <RefreshCw className="h-4 w-4 mr-2" /> Atualizar
                </Button>
              </div>
            )}

            {/* Test result message */}
            {testResult && (
              <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${testResult.ok ? 'bg-green-500/10 text-green-700' : 'bg-destructive/10 text-destructive'}`}>
                {testResult.ok ? <Wifi className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                {testResult.message}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 flex-wrap">
              <Button variant="outline" onClick={handleTestConnection} disabled={loading || !serverUrl.trim()}>
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
                Testar Conexão
              </Button>
              {session?.status !== 'connected' && (
                <Button onClick={handleConnect} disabled={loading || !serverUrl.trim()}>
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <QrCode className="h-4 w-4 mr-2" />}
                  Conectar WhatsApp
                </Button>
              )}
              {session?.status === 'connected' && (
                <Button variant="destructive" onClick={handleDisconnect} disabled={loading}>
                  <Unplug className="h-4 w-4 mr-2" /> Desconectar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Server Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Servidor de WhatsApp Web</CardTitle>
            <CardDescription>
              Configure a URL do seu servidor Node.js que executa o whatsapp-web.js.
              Este servidor é responsável por manter a sessão do WhatsApp Web.
            </CardDescription>
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
                Endpoints esperados: GET /connect, GET /disconnect, POST /send-message
              </p>
            </div>
            <Button onClick={handleSaveServerUrl} disabled={loading} variant="outline">
              Salvar Configuração
            </Button>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Como funciona</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3 text-sm text-muted-foreground list-decimal list-inside">
              <li>Configure a URL do seu servidor Node.js que executa a biblioteca whatsapp-web.js</li>
              <li>Clique em "Testar Conexão" para verificar se o servidor está acessível</li>
              <li>Clique em "Conectar WhatsApp" — o servidor gerará um QR Code</li>
              <li>Escaneie o QR Code com seu celular (WhatsApp → Aparelhos conectados)</li>
              <li>A sessão ficará salva no servidor e o sistema passará a receber e enviar mensagens automaticamente</li>
              <li>O servidor Node.js deve enviar eventos (mensagens recebidas, status) para o webhook:
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
