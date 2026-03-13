import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { AgencySettings } from '@/types/quote';
import { getAgencySettings, saveAgencySettings, fileToBase64 } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Save, X, CheckCircle, XCircle, Loader2, MapPin, Image } from 'lucide-react';
import { toast } from 'sonner';

interface CardRate {
  installments: number;
  rate: number;
  label?: string;
}

export default function Settings() {
  const navigate = useNavigate();
  const { activeCompany } = useCompany();
  const [settings, setSettings] = useState<AgencySettings>(getAgencySettings());
  const [ecRates, setEcRates] = useState<CardRate[]>([]);
  const [linkRates, setLinkRates] = useState<CardRate[]>([]);
  const [googleApiKey, setGoogleApiKey] = useState('');
  const [testingGoogle, setTestingGoogle] = useState(false);
  const [googleStatus, setGoogleStatus] = useState<'idle' | 'connected' | 'error'>('idle');
  const [unsplashKey, setUnsplashKey] = useState('');
  const [pexelsKey, setPexelsKey] = useState('');
  const [testingStock, setTestingStock] = useState(false);
  const [stockStatus, setStockStatus] = useState<{ unsplash?: boolean; pexels?: boolean } | null>(null);

  const defaultEcRates: CardRate[] = [
    { installments: 0, rate: 1.39, label: 'Débito' },
    { installments: 1, rate: 0.79 }, { installments: 2, rate: 1.80 }, { installments: 3, rate: 1.85 },
    { installments: 4, rate: 2.10 }, { installments: 5, rate: 2.35 }, { installments: 6, rate: 2.60 },
    { installments: 7, rate: 2.90 }, { installments: 8, rate: 3.10 }, { installments: 9, rate: 3.30 },
    { installments: 10, rate: 3.60 }, { installments: 11, rate: 3.80 }, { installments: 12, rate: 4.10 },
    { installments: 13, rate: 4.30 }, { installments: 14, rate: 4.50 }, { installments: 15, rate: 4.70 },
    { installments: 16, rate: 4.90 }, { installments: 17, rate: 5.10 }, { installments: 18, rate: 5.30 },
  ];

  const defaultLinkRates: CardRate[] = [
    { installments: 1, rate: 1.99 }, { installments: 2, rate: 2.90 }, { installments: 3, rate: 3.20 },
    { installments: 4, rate: 3.60 }, { installments: 5, rate: 3.90 }, { installments: 6, rate: 4.20 },
    { installments: 7, rate: 4.50 }, { installments: 8, rate: 4.80 }, { installments: 9, rate: 5.00 },
    { installments: 10, rate: 5.20 }, { installments: 11, rate: 5.40 }, { installments: 12, rate: 5.60 },
    { installments: 13, rate: 5.80 }, { installments: 14, rate: 6.00 }, { installments: 15, rate: 6.20 },
    { installments: 16, rate: 6.40 }, { installments: 17, rate: 6.60 }, { installments: 18, rate: 6.80 },
  ];

  useEffect(() => {
    loadRates();
    loadGoogleApiKey();
  }, [activeCompany]);

  const loadRates = async () => {
    let query = supabase.from('card_rates').select('*').order('installments');
    if (activeCompany) query = query.eq('empresa_id', activeCompany.id) as any;
    const { data } = await query as any;
    if (data && data.length > 0) {
      const ec = data.filter((r: any) => r.payment_type === 'ec').map((r: any) => ({ installments: r.installments, rate: Number(r.rate), label: r.installments === 0 ? 'Débito' : undefined }));
      const link = data.filter((r: any) => r.payment_type === 'link').map((r: any) => ({ installments: r.installments, rate: Number(r.rate) }));
      setEcRates(ec.length > 0 ? ec : defaultEcRates);
      setLinkRates(link.length > 0 ? link : defaultLinkRates);
    } else {
      setEcRates(defaultEcRates);
      setLinkRates(defaultLinkRates);
    }
  };

  const loadGoogleApiKey = async () => {
    let query = supabase.from('agency_settings').select('*');
    if (activeCompany) query = query.eq('empresa_id', activeCompany.id);
    const { data } = await query.limit(1).single();
    if (data) {
      const d = data as any;
      if (d.google_maps_api_key) { setGoogleApiKey(d.google_maps_api_key); setGoogleStatus('connected'); }
      if (d.unsplash_api_key) setUnsplashKey(d.unsplash_api_key);
      if (d.pexels_api_key) setPexelsKey(d.pexels_api_key);
      if (d.unsplash_api_key || d.pexels_api_key) setStockStatus({ unsplash: !!d.unsplash_api_key, pexels: !!d.pexels_api_key });
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const base64 = await fileToBase64(file);
      setSettings(p => ({ ...p, logoBase64: base64 }));
    }
  };

  const updateRate = (type: 'ec' | 'link', installments: number, rate: number) => {
    const setter = type === 'ec' ? setEcRates : setLinkRates;
    setter(prev => prev.map(r => r.installments === installments ? { ...r, rate } : r));
  };

  const testGoogleConnection = async () => {
    if (!googleApiKey.trim()) { toast.error('Insira a API Key primeiro'); return; }
    setTestingGoogle(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-places', {
        body: { action: 'test', apiKey: googleApiKey },
      });
      if (error) throw error;
      if (data?.success) {
        setGoogleStatus('connected');
        toast.success('Conectado com Google Maps!');
      } else {
        setGoogleStatus('error');
        toast.error(`Erro: ${data?.error || 'API Key inválida'}`);
      }
    } catch (e: any) {
      setGoogleStatus('error');
      toast.error(e.message || 'Erro ao testar conexão');
    } finally {
      setTestingGoogle(false);
    }
  };

  const handleSave = async () => {
    saveAgencySettings(settings);

    // Save Google Maps API Key to agency_settings
    const empresaId = activeCompany?.id || null;
    let query = supabase.from('agency_settings').select('id');
    if (empresaId) query = query.eq('empresa_id', empresaId);
    const { data: existing } = await query.limit(1).single();

    if (existing) {
      await supabase.from('agency_settings')
        .update({ google_maps_api_key: googleApiKey } as any)
        .eq('id', existing.id);
    } else if (empresaId) {
      await supabase.from('agency_settings')
        .insert({ empresa_id: empresaId, google_maps_api_key: googleApiKey, name: settings.name } as any);
    }

    // Delete existing rates for this company and insert new ones
    let deleteQuery = supabase.from('card_rates').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (activeCompany) deleteQuery = deleteQuery.eq('empresa_id', activeCompany.id) as any;
    await deleteQuery as any;
    
    const allRates = [
      ...ecRates.map(r => ({ payment_type: 'ec', installments: r.installments, rate: r.rate, empresa_id: empresaId })),
      ...linkRates.map(r => ({ payment_type: 'link', installments: r.installments, rate: r.rate, empresa_id: empresaId })),
    ];
    
    await supabase.from('card_rates').insert(allRates as any);

    toast.success('Configurações salvas!');
  };

  const renderRateTable = (type: 'ec' | 'link', rates: CardRate[], title: string) => (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">Parcelas</TableHead>
              <TableHead>Taxa (%)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rates.map(r => (
              <TableRow key={`${type}-${r.installments}-${r.label || ''}`}>
                <TableCell className="font-medium">{r.label || `${r.installments}x`}</TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="0.01"
                    value={r.rate}
                    onChange={e => updateRate(type, r.installments, parseFloat(e.target.value) || 0)}
                    className="w-28"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
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

        {/* Google Maps Integration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Integrações — Google Maps
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Google Maps API Key</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Necessária para buscar hotéis automaticamente. Obtenha em{' '}
                <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                  Google Cloud Console
                </a>
                . Ative as APIs: Places API, Maps JavaScript API.
              </p>
              <div className="flex gap-2">
                <Input
                  type="password"
                  value={googleApiKey}
                  onChange={e => { setGoogleApiKey(e.target.value); setGoogleStatus('idle'); }}
                  placeholder="AIzaSy..."
                  className="flex-1"
                />
                <Button variant="outline" onClick={testGoogleConnection} disabled={testingGoogle}>
                  {testingGoogle ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  Testar conexão
                </Button>
              </div>
              {googleStatus === 'connected' && (
                <div className="flex items-center gap-2 mt-2 text-sm text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  Conectado com Google Maps
                </div>
              )}
              {googleStatus === 'error' && (
                <div className="flex items-center gap-2 mt-2 text-sm text-destructive">
                  <XCircle className="h-4 w-4" />
                  Falha na conexão — verifique a API Key
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <h2 className="text-xl font-semibold text-foreground pt-4">Taxas de Pagamento - Cartão</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {renderRateTable('ec', ecRates, 'Taxas EC (Máquina)')}
          {renderRateTable('link', linkRates, 'Taxas Link de Pagamento')}
        </div>

        <Button onClick={handleSave} className="w-full">
          <Save className="h-4 w-4 mr-2" /> Salvar Configurações
        </Button>
      </div>
    </AppLayout>
  );
}
