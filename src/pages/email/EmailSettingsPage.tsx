import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Save, TestTube, Mail, Server, Lock, Link2 } from 'lucide-react';
import { toast } from 'sonner';

const CONNECTION_FIELDS = [
  'smtp_host', 'smtp_port', 'smtp_user', 'smtp_password', 'smtp_ssl',
  'imap_host', 'imap_port', 'imap_user', 'imap_password', 'imap_ssl',
] as const;

export default function EmailSettingsPage() {
  const { activeCompany, companies, isMaster, userCompanyIds } = useCompany();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [settings, setSettings] = useState({
    smtp_host: '', smtp_port: 587, smtp_user: '', smtp_password: '', smtp_ssl: true,
    imap_host: '', imap_port: 993, imap_user: '', imap_password: '', imap_ssl: true,
    from_name: '', from_email: '',
  });
  const [settingsId, setSettingsId] = useState<string | null>(null);

  useEffect(() => {
    if (!activeCompany) return;
    setLoading(true);
    supabase.from('email_settings').select('*').eq('empresa_id', activeCompany.id).maybeSingle()
      .then(({ data }) => {
        if (data) {
          const d = data as any;
          setSettings({
            smtp_host: d.smtp_host || '', smtp_port: d.smtp_port || 587,
            smtp_user: d.smtp_user || '', smtp_password: d.smtp_password || '',
            smtp_ssl: d.smtp_ssl ?? true,
            imap_host: d.imap_host || '', imap_port: d.imap_port || 993,
            imap_user: d.imap_user || '', imap_password: d.imap_password || '',
            imap_ssl: d.imap_ssl ?? true,
            from_name: d.from_name || '', from_email: d.from_email || '',
          });
          setSettingsId(d.id);
        }
        setLoading(false);
      });
  }, [activeCompany]);

  const handleSave = async () => {
    if (!activeCompany) return;
    setSaving(true);

    const record = { ...settings, empresa_id: activeCompany.id };

    // Save current company
    let success = false;
    if (settingsId) {
      const { error } = await supabase.from('email_settings').update(record as any).eq('id', settingsId);
      if (error) toast.error('Erro ao salvar: ' + error.message);
      else success = true;
    } else {
      const { data, error } = await supabase.from('email_settings').insert(record as any).select().single();
      if (error) toast.error('Erro ao salvar: ' + error.message);
      else {
        setSettingsId((data as any).id);
        success = true;
      }
    }

    // If master, sync connection settings to all other companies
    if (success && isMaster) {
      const connectionData: Record<string, any> = {};
      for (const key of CONNECTION_FIELDS) {
        connectionData[key] = settings[key];
      }

      const otherCompanyIds = userCompanyIds.filter(id => id !== activeCompany.id);

      for (const companyId of otherCompanyIds) {
        const { data: existing } = await supabase
          .from('email_settings')
          .select('id')
          .eq('empresa_id', companyId)
          .maybeSingle();

        if (existing) {
          await supabase.from('email_settings').update(connectionData as any).eq('id', (existing as any).id);
        } else {
          await supabase.from('email_settings').insert({
            ...connectionData,
            empresa_id: companyId,
            from_name: '',
            from_email: '',
          } as any);
        }
      }

      toast.success(`Configurações salvas e sincronizadas para ${otherCompanyIds.length + 1} empresa(s)`);
    } else if (success) {
      toast.success('Configurações salvas');
    }

    setSaving(false);
  };

  const handleTest = async () => {
    if (!activeCompany) return;
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          empresa_id: activeCompany.id,
          test: true,
          to: settings.from_email,
        },
      });
      if (error) throw error;
      toast.success('Email de teste enviado com sucesso!');
    } catch (err: any) {
      toast.error('Falha no teste: ' + (err.message || 'Erro'));
    }
    setTesting(false);
  };

  const u = (key: string, val: any) => setSettings(prev => ({ ...prev, [key]: val }));

  if (loading) return <AppLayout><div className="p-8 text-center text-muted-foreground">Carregando...</div></AppLayout>;

  return (
    <AppLayout>
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Configurações de Email</h1>
          <p className="text-muted-foreground text-sm">Configure servidores SMTP e IMAP para {activeCompany?.name}</p>
        </div>

        {/* Remetente - PER COMPANY */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Mail className="h-5 w-5" /> Remetente
              <Badge variant="outline" className="ml-auto text-xs font-normal">Por empresa</Badge>
            </CardTitle>
            <CardDescription>Identidade do email de saída — cada empresa pode ter um remetente diferente</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nome do remetente</Label>
                <Input value={settings.from_name} onChange={e => u('from_name', e.target.value)} placeholder="Vortex Viagens" />
              </div>
              <div>
                <Label>Email do remetente</Label>
                <Input value={settings.from_email} onChange={e => u('from_email', e.target.value)} placeholder="contato@vortexviagens.com.br" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SMTP - SHARED */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Server className="h-5 w-5" /> Servidor SMTP (Envio)
              {isMaster && <Badge className="ml-auto text-xs font-normal gap-1"><Link2 className="h-3 w-3" /> Compartilhado</Badge>}
            </CardTitle>
            <CardDescription>
              {isMaster
                ? 'Estas configurações serão sincronizadas automaticamente para todas as empresas'
                : 'Configurações para envio de emails'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Servidor SMTP</Label>
                <Input value={settings.smtp_host} onChange={e => u('smtp_host', e.target.value)} placeholder="smtp.hostinger.com" />
              </div>
              <div>
                <Label>Porta</Label>
                <Input type="number" value={settings.smtp_port} onChange={e => u('smtp_port', Number(e.target.value))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Usuário</Label>
                <Input value={settings.smtp_user} onChange={e => u('smtp_user', e.target.value)} placeholder="contato@vortexviagens.com.br" />
              </div>
              <div>
                <Label>Senha</Label>
                <Input type="password" value={settings.smtp_password} onChange={e => u('smtp_password', e.target.value)} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={settings.smtp_ssl} onCheckedChange={v => u('smtp_ssl', v)} />
              <Label className="text-sm">SSL/TLS</Label>
            </div>
          </CardContent>
        </Card>

        {/* IMAP - SHARED */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lock className="h-5 w-5" /> Servidor IMAP (Recebimento)
              {isMaster && <Badge className="ml-auto text-xs font-normal gap-1"><Link2 className="h-3 w-3" /> Compartilhado</Badge>}
            </CardTitle>
            <CardDescription>
              {isMaster
                ? 'Estas configurações serão sincronizadas automaticamente para todas as empresas'
                : 'Configurações para receber emails'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Servidor IMAP</Label>
                <Input value={settings.imap_host} onChange={e => u('imap_host', e.target.value)} placeholder="imap.hostinger.com" />
              </div>
              <div>
                <Label>Porta</Label>
                <Input type="number" value={settings.imap_port} onChange={e => u('imap_port', Number(e.target.value))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Usuário</Label>
                <Input value={settings.imap_user} onChange={e => u('imap_user', e.target.value)} placeholder="contato@vortexviagens.com.br" />
              </div>
              <div>
                <Label>Senha</Label>
                <Input type="password" value={settings.imap_password} onChange={e => u('imap_password', e.target.value)} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={settings.imap_ssl} onCheckedChange={v => u('imap_ssl', v)} />
              <Label className="text-sm">SSL/TLS</Label>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" /> {saving ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
          <Button variant="outline" onClick={handleTest} disabled={testing || !settings.smtp_host} className="gap-2">
            <TestTube className="h-4 w-4" /> {testing ? 'Testando...' : 'Enviar Email de Teste'}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
