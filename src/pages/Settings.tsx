import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AgencySettings } from '@/types/quote';
import { getAgencySettings, saveAgencySettings, fileToBase64 } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Save, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Settings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [settings, setSettings] = useState<AgencySettings>(getAgencySettings());

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const base64 = await fileToBase64(file);
      setSettings(p => ({ ...p, logoBase64: base64 }));
    }
  };

  const handleSave = () => {
    saveAgencySettings(settings);
    toast({ title: 'Configurações salvas!', description: 'Os dados da agência foram atualizados.' });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-primary text-primary-foreground">
        <div className="container mx-auto flex items-center gap-3 py-4 px-4">
          <Button variant="ghost" size="icon" className="text-primary-foreground" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Configurações da Agência</h1>
        </div>
      </header>

      <main className="container mx-auto py-6 px-4 max-w-2xl">
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

            <Button onClick={handleSave} className="w-full">
              <Save className="h-4 w-4 mr-2" /> Salvar Configurações
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
