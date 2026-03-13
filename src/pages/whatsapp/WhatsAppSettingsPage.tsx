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
import { Settings, Wifi, WifiOff, Save } from 'lucide-react';
import { toast } from 'sonner';
import { resetServerUrl, checkStatus } from '@/lib/whatsappApi';

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
  });
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (empresaId) loadSettings();
  }, [empresaId]);

  const loadSettings = async () => {
    const { data } = await (supabase.from('whatsapp_settings').select('*').eq('empresa_id', empresaId).maybeSingle() as any);
    if (data) setSettings(data);
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

    resetServerUrl();
    toast.success('Configurações salvas');
    setLoading(false);
    loadSettings();
  };

  const checkConnection = async () => {
    setChecking(true);
    try {
      const data = await checkStatus(settings.server_url);
      const connected = data.connected || data.status === 'connected';
      setSettings(prev => ({ ...prev, is_connected: connected }));
      await (supabase.from('whatsapp_settings').update({ is_connected: connected }).eq('id', settings.id) as any);
      toast.success(connected ? 'WhatsApp conectado!' : 'WhatsApp desconectado');
    } catch {
      toast.error('Não foi possível conectar ao servidor');
      setSettings(prev => ({ ...prev, is_connected: false }));
    }
    setChecking(false);
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
            <div className="flex items-center gap-3">
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

        <Button onClick={handleSave} disabled={loading} className="gap-2">
          <Save className="h-4 w-4" />
          {loading ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </div>
    </AppLayout>
  );
}
