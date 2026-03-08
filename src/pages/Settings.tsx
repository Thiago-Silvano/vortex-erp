import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { AgencySettings } from '@/types/quote';
import { getAgencySettings, saveAgencySettings, fileToBase64 } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Save, X } from 'lucide-react';
import { toast } from 'sonner';

export default function Settings() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<AgencySettings>(getAgencySettings());

  // Payment rates from DB
  const [rateSimpleEc, setRateSimpleEc] = useState(0);
  const [rateAntecEc, setRateAntecEc] = useState(0);
  const [rateSimpleLink, setRateSimpleLink] = useState(0);
  const [rateAntecLink, setRateAntecLink] = useState(0);
  const [settingsId, setSettingsId] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('agency_settings').select('*').limit(1).single().then(({ data }) => {
      if (data) {
        setSettingsId(data.id);
        setRateSimpleEc(Number((data as any).card_rate_simple_ec) || 0);
        setRateAntecEc(Number((data as any).card_rate_antecipado_ec) || 0);
        setRateSimpleLink(Number((data as any).card_rate_simple_link) || 0);
        setRateAntecLink(Number((data as any).card_rate_antecipado_link) || 0);
      }
    });
  }, []);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const base64 = await fileToBase64(file);
      setSettings(p => ({ ...p, logoBase64: base64 }));
    }
  };

  const handleSave = async () => {
    saveAgencySettings(settings);

    const rateData = {
      card_rate_simple_ec: rateSimpleEc,
      card_rate_antecipado_ec: rateAntecEc,
      card_rate_simple_link: rateSimpleLink,
      card_rate_antecipado_link: rateAntecLink,
    };

    if (settingsId) {
      await supabase.from('agency_settings').update(rateData as any).eq('id', settingsId);
    } else {
      await supabase.from('agency_settings').insert({ name: settings.name, ...rateData } as any);
    }

    toast.success('Configurações salvas!');
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>

        <Card>
          <CardHeader><CardTitle>Dados da Agência</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Nome da Agência</Label>
              <Input value={settings.name} onChange={e => setSettings(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <Label>Logo</Label>
              <Input type="file" accept="image/*" onChange={handleLogoUpload} />
              {settings.logoBase64 && (
                <div className="mt-2 relative inline-block">
                  <img src={settings.logoBase64} alt="Logo" className="h-16 object-contain" />
                  <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 h-5 w-5" onClick={() => setSettings(p => ({ ...p, logoBase64: undefined }))}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>WhatsApp</Label>
                <Input value={settings.whatsapp} onChange={e => setSettings(p => ({ ...p, whatsapp: e.target.value }))} placeholder="+55 11 99999-9999" />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={settings.email} onChange={e => setSettings(p => ({ ...p, email: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Website</Label>
              <Input value={settings.website} onChange={e => setSettings(p => ({ ...p, website: e.target.value }))} placeholder="www.suaagencia.com.br" />
            </div>
          </CardContent>
        </Card>

        {/* Payment Rates */}
        <Card>
          <CardHeader><CardTitle>Taxas de Pagamento - Cartão</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-medium text-sm text-muted-foreground mb-3">EC (Máquina)</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Taxa Simples (%)</Label>
                  <Input type="number" step="0.01" value={rateSimpleEc} onChange={e => setRateSimpleEc(parseFloat(e.target.value) || 0)} placeholder="3.49" />
                </div>
                <div>
                  <Label>Taxa Antecipação (%)</Label>
                  <Input type="number" step="0.01" value={rateAntecEc} onChange={e => setRateAntecEc(parseFloat(e.target.value) || 0)} placeholder="4.89" />
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-medium text-sm text-muted-foreground mb-3">Link de Pagamento</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Taxa Simples (%)</Label>
                  <Input type="number" step="0.01" value={rateSimpleLink} onChange={e => setRateSimpleLink(parseFloat(e.target.value) || 0)} placeholder="3.49" />
                </div>
                <div>
                  <Label>Taxa Antecipação (%)</Label>
                  <Input type="number" step="0.01" value={rateAntecLink} onChange={e => setRateAntecLink(parseFloat(e.target.value) || 0)} placeholder="4.89" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleSave} className="w-full">
          <Save className="h-4 w-4 mr-2" /> Salvar Configurações
        </Button>
      </div>
    </AppLayout>
  );
}
