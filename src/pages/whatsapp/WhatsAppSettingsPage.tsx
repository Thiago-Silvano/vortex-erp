import AppLayout from '@/components/AppLayout';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Settings, Wifi, WifiOff, Save, Smartphone, LogOut, QrCode, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { resetServerUrl, checkStatus, disconnectSession, getQrCode, connectSession } from '@/lib/whatsappApi';

export default function WhatsAppSettingsPage() {
  const { activeCompany } = useCompany();
  const empresaId = activeCompany?.id || '';
  const [settings, setSettings] = useState({
    id: '',
    server_url: 'http://localhost:3000',
    is_connected: false,
    session_name: '',
    auto_reply_enabled: false,
    auto_reply_message: '',
    connected_phone: '',
    connected_name: '',
  });
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loadingQr, setLoadingQr] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    if (empresaId) loadSettings();
  }, [empresaId]);

  const loadSettings = async () => {
    const { data } = await (supabase.from('whatsapp_settings').select('*').eq('empresa_id', empresaId).maybeSingle() as any);
    if (data) setSettings(prev => ({ ...prev, ...data }));
  };

  const handleSave = async () => {
    setLoading(true);
    const payload = {
      server_url: settings.server_url,
      session_name: settings.session_name,
      auto_reply_enabled: settings.auto_reply_enabled,
      auto_reply_message: settings.auto_reply_message,
      updated_at: new Date().toISOString(),
    };

    if (settings.id) {
      await (supabase.from('whatsapp_settings').update(payload).eq('id', settings.id) as any);
    } else {
      await (supabase.from('whatsapp_settings').insert({ ...payload, empresa_id: empresaId }) as any);
    }

    resetServerUrl(empresaId);
    toast.success('Configurações salvas');
    setLoading(false);
    loadSettings();
  };

  const checkConnection = async () => {
    if (!settings.server_url || settings.server_url.includes('localhost')) {
      toast.error('Configure uma URL de servidor válida (não pode ser localhost)');
      return;
    }
    if (!settings.id) {
      toast.error('Salve as configurações antes de verificar a conexão');
      return;
    }
    setChecking(true);
    try {
      await connectSession(settings.server_url, empresaId);
      const data = await checkStatus(settings.server_url, empresaId);
      console.log('WhatsApp status response:', JSON.stringify(data));

      const statusValue = String(data?.status ?? data?.state ?? '').toLowerCase();
      const connected = Boolean(data?.connected ?? data?.is_connected ?? data?.isConnected ?? data?.authenticated) || ['connected', 'open', 'ready'].includes(statusValue);

      // Extract phone number from response - try multiple fields
      // Always prefer fresh data from the server over cached DB values
      const phone = data?.phone || data?.wid?.user || data?.me?.user || data?.number || '';
      const name = data?.pushname || data?.name || data?.displayName || '';

      const updatePayload: any = {
        is_connected: connected,
        connected_phone: phone ? String(phone) : '',
        connected_name: name ? String(name) : '',
      };

      await (supabase.from('whatsapp_settings').update(updatePayload).eq('id', settings.id) as any);
      setSettings(prev => ({ ...prev, ...updatePayload }));
      toast.success(connected ? 'WhatsApp conectado!' : 'WhatsApp desconectado');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível conectar ao servidor. Verifique se a URL está correta e o servidor está rodando.');
      setSettings(prev => ({ ...prev, is_connected: false }));
    }
    setChecking(false);
  };

  const handleDisconnect = async () => {
    if (!settings.server_url || settings.server_url.includes('localhost')) {
      toast.error('Configure uma URL de servidor válida');
      return;
    }
    setDisconnecting(true);
    try {
      // Try to disconnect on the server — if endpoint not supported, proceed anyway
      try {
        await disconnectSession(settings.server_url, empresaId);
      } catch (serverErr) {
        console.warn('Servidor não suportou /disconnect, atualizando estado local:', serverErr);
      }
      // Always update local state regardless of server response
      await (supabase.from('whatsapp_settings').update({ is_connected: false, connected_phone: '', connected_name: '' }).eq('id', settings.id) as any);
      setSettings(prev => ({ ...prev, is_connected: false, connected_phone: '', connected_name: '' }));
      setQrCode(null);
      toast.success('WhatsApp desconectado! Escaneie o QR Code para reconectar.');
      fetchQrCode();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao desconectar. Verifique o servidor.');
    }
    setDisconnecting(false);
  };

  const fetchQrCode = async () => {
    if (!settings.server_url || settings.server_url.includes('localhost')) {
      toast.error('Configure uma URL de servidor válida');
      return;
    }
    setLoadingQr(true);
    setQrCode(null);
    try {
      await connectSession(settings.server_url, empresaId);
      const data = await getQrCode(settings.server_url, empresaId);
      const qr = data?.qr || data?.qrcode || data?.qr_code || data?.base64 || data?.image || null;
      if (qr) {
        setQrCode(typeof qr === 'string' && !qr.startsWith('data:') ? `data:image/png;base64,${qr}` : qr);
      } else {
        toast.error('QR Code não disponível. O servidor pode já estar conectado ou ainda está gerando.');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível obter o QR Code do servidor.');
    }
    setLoadingQr(false);
  };

  const handleClearConversations = async () => {
    setClearing(true);
    try {
      // Delete all messages first, then conversations for this empresa
      await (supabase.from('whatsapp_messages').delete().eq('empresa_id', empresaId) as any);
      await (supabase.from('whatsapp_conversations').delete().eq('empresa_id', empresaId) as any);
      toast.success('Todas as conversas foram removidas do ERP.');
    } catch (error) {
      toast.error('Erro ao limpar conversas.');
      console.error(error);
    }
    setClearing(false);
  };

  const formatPhone = (phone: string) => {
    if (!phone) return '';
    const clean = phone.replace(/\D/g, '');
    if (clean.length === 13) {
      return `+${clean.slice(0, 2)} (${clean.slice(2, 4)}) ${clean.slice(4, 9)}-${clean.slice(9)}`;
    }
    if (clean.length === 12) {
      return `+${clean.slice(0, 2)} (${clean.slice(2, 4)}) ${clean.slice(4, 8)}-${clean.slice(8)}`;
    }
    return phone;
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Settings className="h-6 w-6" /> Configurações WhatsApp</h1>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Servidor WhatsApp</CardTitle>
            <CardDescription>Configure a conexão com o servidor Node.js do WhatsApp Web</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>URL do Servidor</Label>
              <Input value={settings.server_url} onChange={e => setSettings(p => ({ ...p, server_url: e.target.value }))} placeholder="http://SEU_IP:3000" />
            </div>
            <div>
              <Label>Nome da Sessão</Label>
              <Input value={settings.session_name} onChange={e => setSettings(p => ({ ...p, session_name: e.target.value }))} placeholder="vortex-viagens" />
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm">Status:</span>
              {settings.is_connected ? (
                <Badge className="bg-green-500/10 text-green-600 gap-1"><Wifi className="h-3 w-3" /> Conectado</Badge>
              ) : (
                <Badge variant="secondary" className="gap-1"><WifiOff className="h-3 w-3" /> Desconectado</Badge>
              )}
              <Button variant="outline" size="sm" onClick={checkConnection} disabled={checking}>
                {checking ? 'Verificando...' : 'Verificar Conexão'}
              </Button>
            </div>

            {/* Connected phone info */}
            {settings.is_connected && (settings.connected_phone || settings.connected_name) && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                <Smartphone className="h-5 w-5 text-green-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-green-700">
                    {settings.connected_name && <span>{settings.connected_name} — </span>}
                    {formatPhone(settings.connected_phone) || 'Número não identificado'}
                  </p>
                  <p className="text-xs text-muted-foreground">Número autenticado no WhatsApp</p>
                </div>
              </div>
            )}

            {/* Disconnect button */}
            {settings.is_connected && (
              <Button variant="destructive" size="sm" className="gap-2" onClick={handleDisconnect} disabled={disconnecting}>
                <LogOut className="h-4 w-4" />
                {disconnecting ? 'Desconectando...' : 'Desconectar WhatsApp'}
              </Button>
            )}

            {/* QR Code section */}
            {!settings.is_connected && (
              <div className="space-y-3">
                <Button variant="outline" size="sm" className="gap-2" onClick={fetchQrCode} disabled={loadingQr}>
                  {loadingQr ? <RefreshCw className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
                  {loadingQr ? 'Carregando QR Code...' : 'Exibir QR Code'}
                </Button>
                {qrCode && (
                  <div className="flex flex-col items-center gap-3 p-4 rounded-lg border bg-card">
                    <p className="text-sm font-medium">Escaneie o QR Code com o WhatsApp</p>
                    <img src={qrCode} alt="QR Code WhatsApp" className="w-64 h-64 object-contain" />
                    <p className="text-xs text-muted-foreground">Abra o WhatsApp no celular → Menu → Aparelhos conectados → Conectar</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Resposta Automática</CardTitle>
            <CardDescription>Configure uma mensagem automática para novos contatos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Switch checked={settings.auto_reply_enabled} onCheckedChange={v => setSettings(p => ({ ...p, auto_reply_enabled: v }))} />
              <Label>Ativar resposta automática</Label>
            </div>
            {settings.auto_reply_enabled && (
              <div>
                <Label>Mensagem automática</Label>
                <Textarea
                  value={settings.auto_reply_message}
                  onChange={e => setSettings(p => ({ ...p, auto_reply_message: e.target.value }))}
                  rows={3}
                  placeholder="Olá! Obrigado por entrar em contato com a Vortex Viagens..."
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Clear conversations */}
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-lg text-destructive">Limpar Conversas</CardTitle>
            <CardDescription>Remove todas as conversas e mensagens do ERP. As mensagens no WhatsApp não serão afetadas.</CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="gap-2" disabled={clearing}>
                  <Trash2 className="h-4 w-4" />
                  {clearing ? 'Limpando...' : 'Limpar Todas as Conversas'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Limpar todas as conversas?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação irá remover todas as conversas e mensagens do ERP permanentemente. As mensagens no WhatsApp do celular não serão afetadas. Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearConversations} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Sim, limpar tudo
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

        <Button onClick={handleSave} disabled={loading} className="gap-2">
          <Save className="h-4 w-4" />
          {loading ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </div>
    </AppLayout>
  );
}