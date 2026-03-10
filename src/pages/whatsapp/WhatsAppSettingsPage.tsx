import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, QrCode, RefreshCw, Settings2, Smartphone, Loader2, Unplug } from 'lucide-react';
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

export default function WhatsAppSettingsPage() {
  const { activeCompany } = useCompany();
  const [session, setSession] = useState<Session | null>(null);
  const [serverUrl, setServerUrl] = useState('');
  const [loading, setLoading] = useState(false);

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

  const handleConnect = async () => {
    if (!serverUrl.trim()) {
      toast.error('Configure a URL do servidor primeiro');
      return;
    }
    setLoading(true);
    try {
      // Save server URL first
      await handleSaveServerUrl();
      // Request QR code from the Node.js server
      const res = await fetch(`${serverUrl.trim()}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empresa_id: activeCompany?.id }),
      });
      if (!res.ok) throw new Error('Servidor não respondeu');
      toast.success('Solicitação de conexão enviada! Aguarde o QR Code aparecer.');
    } catch (e: any) {
      toast.error('Erro ao conectar: ' + e.message);
    }
    setLoading(false);
  };

  const handleDisconnect = async () => {
    if (!serverUrl.trim() || !activeCompany?.id) return;
    setLoading(true);
    try {
      await fetch(`${serverUrl.trim()}/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empresa_id: activeCompany.id }),
      });
      await supabase.from('whatsapp_sessions').update({
        status: 'disconnected',
        qr_code: '',
        connected_at: null,
        updated_at: new Date().toISOString(),
      }).eq('empresa_id', activeCompany.id);
      toast.success('WhatsApp desconectado');
      fetchSession();
    } catch (e: any) {
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

            {/* Actions */}
            <div className="flex gap-3">
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
              Configure a URL do seu servidor Node.js que executa o whatsapp-web.js / Baileys.
              Este servidor é responsável por manter a sessão do WhatsApp Web.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>URL do Servidor</Label>
              <Input
                value={serverUrl}
                onChange={e => setServerUrl(e.target.value)}
                placeholder="https://seu-servidor.com ou http://localhost:3001"
              />
              <p className="text-xs text-muted-foreground mt-1">
                O servidor deve expor os endpoints: /connect, /disconnect, /send-message
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
              <li>Configure a URL do seu servidor Node.js que executa a biblioteca de automação do WhatsApp Web</li>
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
