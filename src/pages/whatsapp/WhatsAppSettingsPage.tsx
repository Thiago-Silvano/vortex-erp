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
import { sendMessage } from '@/lib/whatsappApi';

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
    reminder_enabled: false,
    reminder_phone: '',
    reminder_template_48h: '',
    reminder_template_24h: '',
    reminder_template_10h: '',
    reminder_template_urgent: '',
    reminder_template_missed: '',
  });
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loadingQr, setLoadingQr] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  const sendTestReminder = async () => {
    if (!settings.reminder_phone) { toast.error('Informe o número de destino'); return; }
    if (!settings.server_url || settings.server_url.includes('localhost')) {
      toast.error('Configure uma URL de servidor WhatsApp válida'); return;
    }
    setSendingTest(true);
    try {
      const msg = `✅ Mensagem de teste — Lembretes de Reservas\n\nSe você recebeu esta mensagem, a configuração de envio via WhatsApp está funcionando.`;
      await sendMessage(settings.server_url, empresaId, settings.reminder_phone, msg);
      toast.success('Mensagem de teste enviada!');
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao enviar mensagem de teste');
    }
    setSendingTest(false);
  };

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
      reminder_enabled: settings.reminder_enabled,
      reminder_phone: settings.reminder_phone,
      reminder_template_48h: settings.reminder_template_48h,
      reminder_template_24h: settings.reminder_template_24h,
      reminder_template_10h: settings.reminder_template_10h,
      reminder_template_urgent: settings.reminder_template_urgent,
      reminder_template_missed: settings.reminder_template_missed,
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
      // Try disconnect via proxy — try POST then GET
      let disconnected = false;
      for (const method of ['POST', 'GET']) {
        try {
          const { data, error } = await supabase.functions.invoke('whatsapp-proxy', {
            body: { server_url: settings.server_url, endpoint: `/disconnect?empresa_id=${encodeURIComponent(empresaId)}`, method },
          });
          if (!error && !(data && data.error)) {
            disconnected = true;
            break;
          }
        } catch {
          // try next method
        }
      }
      if (!disconnected) {
        console.warn('Servidor não suportou /disconnect, atualizando apenas estado local');
      }
      // Always update local state
      await (supabase.from('whatsapp_settings').update({ is_connected: false, connected_phone: '', connected_name: '' }).eq('id', settings.id) as any);
      setSettings(prev => ({ ...prev, is_connected: false, connected_phone: '', connected_name: '' }));
      setQrCode(null);
      toast.success('WhatsApp desconectado!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao desconectar.');
    }
    setDisconnecting(false);
  };

  const fetchQrCode = async (forceFresh = false) => {
    if (!settings.server_url || settings.server_url.includes('localhost')) {
      toast.error('Configure uma URL de servidor válida');
      return;
    }
    setLoadingQr(true);
    setQrCode(null);
    try {
      // Force a fresh QR by disconnecting any stale session first
      if (forceFresh) {
        try {
          await disconnectSession(settings.server_url, empresaId);
        } catch {
          // ignore — server may not be connected
        }
        await new Promise(r => setTimeout(r, 1500));
      }

      await connectSession(settings.server_url, empresaId);
      // Wait for QR generation on the server
      await new Promise(r => setTimeout(r, 2000));

      // Poll up to ~20s to get a QR
      let qr: string | null = null;
      let lastQrSig = '';
      for (let attempt = 0; attempt < 8 && !qr; attempt++) {
        if (attempt > 0) await new Promise(r => setTimeout(r, 2000));
        const data = await getQrCode(settings.server_url, empresaId);
        if (data?.connected) {
          toast.info('O servidor já está conectado ao WhatsApp.');
          setLoadingQr(false);
          return;
        }
        const candidate: string | null = data?.qr || data?.qrcode || data?.qr_code || data?.base64 || data?.image || null;
        if (candidate) {
          const sig = String(candidate).slice(-40);
          console.log(`[WA QR] attempt ${attempt + 1} signature:`, sig, 'length:', candidate.length);
          if (sig !== lastQrSig) {
            qr = candidate;
            lastQrSig = sig;
          }
        } else {
          console.log(`[WA QR] attempt ${attempt + 1}: no QR in response`, data);
        }
      }
      if (qr) {
        const src = typeof qr === 'string' && !qr.startsWith('data:') ? `data:image/png;base64,${qr}` : qr;
        // Cache-bust the <img> by appending a timestamp fragment (does not affect data URLs decoding)
        setQrCode(src);
        toast.success('Novo QR Code gerado. Escaneie agora.');
      } else {
        toast.error('QR Code não disponível. O servidor ainda está gerando, tente novamente em alguns segundos.');
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
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => fetchQrCode(false)} disabled={loadingQr}>
                    {loadingQr ? <RefreshCw className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
                    {loadingQr ? 'Carregando QR Code...' : 'Exibir QR Code'}
                  </Button>
                  <Button variant="secondary" size="sm" className="gap-2" onClick={() => fetchQrCode(true)} disabled={loadingQr}>
                    <RefreshCw className={`h-4 w-4 ${loadingQr ? 'animate-spin' : ''}`} />
                    Forçar novo QR Code
                  </Button>
                </div>
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

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Lembretes de Reservas (WhatsApp)</CardTitle>
            <CardDescription>
              Envia lembretes automáticos via WhatsApp para reservas com check-in próximo. Use as variáveis{' '}
              <code className="px-1 rounded bg-muted">{'{{descricao}}'}</code>,{' '}
              <code className="px-1 rounded bg-muted">{'{{localizador}}'}</code> e{' '}
              <code className="px-1 rounded bg-muted">{'{{checkin}}'}</code> nas mensagens.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Switch checked={settings.reminder_enabled} onCheckedChange={v => setSettings(p => ({ ...p, reminder_enabled: v }))} />
              <Label>Ativar lembretes via WhatsApp</Label>
            </div>
            {settings.reminder_enabled && (
              <>
                <div>
                  <Label>Número de destino (com DDI/DDD, somente dígitos)</Label>
                  <Input
                    value={settings.reminder_phone}
                    onChange={e => setSettings(p => ({ ...p, reminder_phone: e.target.value.replace(/\D/g, '') }))}
                    placeholder="5548999999999"
                  />
                </div>
                <div>
                  <Label>Mensagem — 48h antes</Label>
                  <Textarea rows={3} value={settings.reminder_template_48h} onChange={e => setSettings(p => ({ ...p, reminder_template_48h: e.target.value }))} />
                </div>
                <div>
                  <Label>Mensagem — 24h antes</Label>
                  <Textarea rows={3} value={settings.reminder_template_24h} onChange={e => setSettings(p => ({ ...p, reminder_template_24h: e.target.value }))} />
                </div>
                <div>
                  <Label>Mensagem — 10h antes</Label>
                  <Textarea rows={3} value={settings.reminder_template_10h} onChange={e => setSettings(p => ({ ...p, reminder_template_10h: e.target.value }))} />
                </div>
                <div>
                  <Label>Mensagem — URGENTE (menos de 2h)</Label>
                  <Textarea rows={3} value={settings.reminder_template_urgent} onChange={e => setSettings(p => ({ ...p, reminder_template_urgent: e.target.value }))} />
                </div>
                <div>
                  <Label>Mensagem — Check-in não realizado</Label>
                  <Textarea rows={3} value={settings.reminder_template_missed} onChange={e => setSettings(p => ({ ...p, reminder_template_missed: e.target.value }))} />
                </div>
              </>
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