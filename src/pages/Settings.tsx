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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Save, X } from 'lucide-react';
import { toast } from 'sonner';

interface CardRate {
  installments: number;
  rate: number;
  label?: string;
}

export default function Settings() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<AgencySettings>(getAgencySettings());
  const [ecRates, setEcRates] = useState<CardRate[]>([]);
  const [linkRates, setLinkRates] = useState<CardRate[]>([]);

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
  }, []);

  const loadRates = async () => {
    const { data } = await supabase.from('card_rates').select('*').order('installments') as any;
    if (data && data.length > 0) {
      const ec = data.filter((r: any) => r.payment_type === 'ec').map((r: any) => ({ installments: r.installments, rate: Number(r.rate) }));
      const link = data.filter((r: any) => r.payment_type === 'link').map((r: any) => ({ installments: r.installments, rate: Number(r.rate) }));
      setEcRates(ec.length > 0 ? ec : defaultEcRates);
      setLinkRates(link.length > 0 ? link : defaultLinkRates);
    } else {
      setEcRates(defaultEcRates);
      setLinkRates(defaultLinkRates);
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

  const handleSave = async () => {
    saveAgencySettings(settings);

    // Delete existing rates and insert new ones
    await supabase.from('card_rates').delete().neq('id', '00000000-0000-0000-0000-000000000000') as any;
    
    const allRates = [
      ...ecRates.map(r => ({ payment_type: 'ec', installments: r.installments, rate: r.rate })),
      ...linkRates.map(r => ({ payment_type: 'link', installments: r.installments, rate: r.rate })),
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
              <TableRow key={r.installments}>
                <TableCell className="font-medium">{r.installments}x</TableCell>
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
