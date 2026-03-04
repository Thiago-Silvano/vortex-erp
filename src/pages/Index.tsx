import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QuoteData, ClientData, TripData, ServiceItem, SERVICE_TYPE_CONFIG } from '@/types/quote';
import { saveQuoteData, getAgencySettings } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ServiceItemForm from '@/components/ServiceItemForm';
import AutocompleteInput from '@/components/AutocompleteInput';
import { WORLD_CITIES } from '@/data/cities';
import { Eye, Trash2, Pencil, Settings, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const defaultClient: ClientData = { name: '', passengers: 1, phone: '', email: '', notes: '' };
const defaultTrip: TripData = { origin: '', destination: '', departureDate: '', returnDate: '', nights: 1, tripType: 'Lazer' };

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : '';
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

interface ValidationErrors {
  [key: string]: string;
}

export default function Index() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [client, setClient] = useState<ClientData>(defaultClient);
  const [trip, setTrip] = useState<TripData>(defaultTrip);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});

  const addService = (item: ServiceItem) => {
    setServices(prev => {
      const idx = prev.findIndex(s => s.id === item.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = item; return next; }
      return [...prev, item];
    });
    setEditingId(null);
    setShowForm(false);
  };

  const removeService = (id: string) => setServices(prev => prev.filter(s => s.id !== id));

  const total = services.reduce((sum, s) => sum + s.value * s.quantity, 0);

  const validate = (): boolean => {
    const errs: ValidationErrors = {};

    if (!client.name.trim()) errs.clientName = 'Nome do cliente e obrigatorio';
    if (!client.phone.trim()) errs.clientPhone = 'Telefone e obrigatorio';
    if (client.email && !isValidEmail(client.email)) errs.clientEmail = 'Email invalido';
    if (!trip.origin.trim()) errs.tripOrigin = 'Origem e obrigatoria';
    if (!trip.destination.trim()) errs.tripDestination = 'Destino e obrigatorio';
    if (!trip.departureDate) errs.tripDeparture = 'Data de ida e obrigatoria';
    if (!trip.returnDate) errs.tripReturn = 'Data de volta e obrigatoria';
    if (services.length === 0) errs.services = 'Adicione pelo menos um servico';

    const agency = getAgencySettings();
    if (!agency || !agency.name.trim()) errs.agency = 'Configure o nome da agencia em Configuracoes';

    setErrors(errs);

    if (Object.keys(errs).length > 0) {
      const firstError = Object.values(errs)[0];
      toast({
        title: 'Campos obrigatorios',
        description: firstError,
        variant: 'destructive',
      });
      return false;
    }
    return true;
  };

  const handlePreview = () => {
    if (!validate()) return;
    const quote: QuoteData = { client, trip, services };
    saveQuoteData(quote);
    navigate('/preview');
  };

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhone(value);
    setClient(p => ({ ...p, phone: formatted }));
    if (errors.clientPhone) setErrors(prev => { const { clientPhone, ...rest } = prev; return rest; });
  };

  const handleEmailChange = (value: string) => {
    setClient(p => ({ ...p, email: value }));
    if (errors.clientEmail && (isValidEmail(value) || !value)) {
      setErrors(prev => { const { clientEmail, ...rest } = prev; return rest; });
    }
  };

  const clearError = (key: string) => {
    if (errors[key]) setErrors(prev => { const { [key]: _, ...rest } = prev; return rest; });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-primary text-primary-foreground">
        <div className="container mx-auto flex items-center justify-between py-4 px-4">
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6" />
            <h1 className="text-xl font-bold">Sistema de Orcamentos</h1>
          </div>
          <Button variant="ghost" className="text-primary-foreground hover:text-accent" onClick={() => navigate('/settings')}>
            <Settings className="h-5 w-5 mr-1" /> Configuracoes
          </Button>
        </div>
      </header>

      <main className="container mx-auto py-6 px-4 max-w-4xl space-y-6">
        {/* Client Data */}
        <Card>
          <CardHeader><CardTitle>Dados do Cliente</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nome do Cliente *</Label>
                <Input
                  value={client.name}
                  onChange={e => { setClient(p => ({ ...p, name: e.target.value })); clearError('clientName'); }}
                  className={errors.clientName ? 'border-destructive' : ''}
                />
                {errors.clientName && <p className="text-xs text-destructive mt-1">{errors.clientName}</p>}
              </div>
              <div>
                <Label>Passageiros</Label>
                <Input type="number" min={1} value={client.passengers} onChange={e => setClient(p => ({ ...p, passengers: parseInt(e.target.value) || 1 }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Telefone *</Label>
                <Input
                  value={client.phone}
                  onChange={e => handlePhoneChange(e.target.value)}
                  placeholder="(XX) XXXXX-XXXX"
                  className={errors.clientPhone ? 'border-destructive' : ''}
                />
                {errors.clientPhone && <p className="text-xs text-destructive mt-1">{errors.clientPhone}</p>}
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={client.email}
                  onChange={e => handleEmailChange(e.target.value)}
                  placeholder="exemplo@email.com"
                  className={errors.clientEmail ? 'border-destructive' : ''}
                />
                {errors.clientEmail && <p className="text-xs text-destructive mt-1">{errors.clientEmail}</p>}
              </div>
            </div>
            <div>
              <Label>Observacoes</Label>
              <Textarea value={client.notes} onChange={e => setClient(p => ({ ...p, notes: e.target.value }))} rows={2} />
            </div>
          </CardContent>
        </Card>

        {/* Trip Data */}
        <Card>
          <CardHeader><CardTitle>Informacoes da Viagem</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Origem *</Label>
                <AutocompleteInput
                  value={trip.origin}
                  onChange={v => { setTrip(p => ({ ...p, origin: v })); clearError('tripOrigin'); }}
                  suggestions={WORLD_CITIES}
                  placeholder="Buscar cidade..."
                  className={errors.tripOrigin ? 'border-destructive' : ''}
                />
                {errors.tripOrigin && <p className="text-xs text-destructive mt-1">{errors.tripOrigin}</p>}
              </div>
              <div>
                <Label>Destino *</Label>
                <AutocompleteInput
                  value={trip.destination}
                  onChange={v => { setTrip(p => ({ ...p, destination: v })); clearError('tripDestination'); }}
                  suggestions={WORLD_CITIES}
                  placeholder="Buscar cidade..."
                  className={errors.tripDestination ? 'border-destructive' : ''}
                />
                {errors.tripDestination && <p className="text-xs text-destructive mt-1">{errors.tripDestination}</p>}
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <Label>Data Ida *</Label>
                <Input
                  type="date"
                  value={trip.departureDate}
                  onChange={e => { setTrip(p => ({ ...p, departureDate: e.target.value })); clearError('tripDeparture'); }}
                  className={errors.tripDeparture ? 'border-destructive' : ''}
                />
                {errors.tripDeparture && <p className="text-xs text-destructive mt-1">{errors.tripDeparture}</p>}
              </div>
              <div>
                <Label>Data Volta *</Label>
                <Input
                  type="date"
                  value={trip.returnDate}
                  onChange={e => { setTrip(p => ({ ...p, returnDate: e.target.value })); clearError('tripReturn'); }}
                  className={errors.tripReturn ? 'border-destructive' : ''}
                />
                {errors.tripReturn && <p className="text-xs text-destructive mt-1">{errors.tripReturn}</p>}
              </div>
              <div>
                <Label>Noites</Label>
                <Input type="number" min={1} value={trip.nights} onChange={e => setTrip(p => ({ ...p, nights: parseInt(e.target.value) || 1 }))} />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={trip.tripType} onValueChange={(v) => setTrip(p => ({ ...p, tripType: v as TripData['tripType'] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Lazer">Lazer</SelectItem>
                    <SelectItem value="Negócios">Negocios</SelectItem>
                    <SelectItem value="Lua de mel">Lua de mel</SelectItem>
                    <SelectItem value="Família">Familia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Services */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Servicos ({services.length})
              {!showForm && !editingId && (
                <Button size="sm" onClick={() => { setShowForm(true); clearError('services'); }}>+ Adicionar Servico</Button>
              )}
            </CardTitle>
            {errors.services && <p className="text-xs text-destructive">{errors.services}</p>}
          </CardHeader>
          <CardContent className="space-y-3">
            {services.map(s => (
              editingId === s.id ? (
                <ServiceItemForm key={s.id} editItem={s} onAdd={addService} onCancel={() => setEditingId(null)} />
              ) : (
                <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50">
                  {s.imageBase64 && <img src={s.imageBase64} alt="" className="h-12 w-12 rounded object-cover" />}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {SERVICE_TYPE_CONFIG[s.type].icon} {s.title}
                    </p>
                    <p className="text-xs text-muted-foreground">{s.supplier} - {s.location}</p>
                  </div>
                  <span className="text-sm font-semibold whitespace-nowrap">
                    R$ {(s.value * s.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                  <Button variant="ghost" size="icon" onClick={() => setEditingId(s.id)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => removeService(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              )
            ))}
            {showForm && <ServiceItemForm onAdd={addService} onCancel={() => setShowForm(false)} />}
            {services.length === 0 && !showForm && (
              <p className="text-center text-muted-foreground py-8">Nenhum servico adicionado. Clique em "Adicionar Servico" para comecar.</p>
            )}
          </CardContent>
        </Card>

        {/* Summary */}
        {services.length > 0 && (
          <Card className="bg-primary text-primary-foreground">
            <CardContent className="flex items-center justify-between py-4">
              <div>
                <p className="text-sm opacity-80">{services.length} servico(s)</p>
                <p className="text-2xl font-bold">
                  Total: R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <Button size="lg" variant="secondary" onClick={handlePreview} className="text-accent-foreground">
                <Eye className="h-5 w-5 mr-2" /> Visualizar Orcamento
              </Button>
            </CardContent>
          </Card>
        )}

        {services.length === 0 && (
          <div className="flex justify-end">
            <Button size="lg" variant="secondary" onClick={handlePreview}>
              <Eye className="h-5 w-5 mr-2" /> Visualizar Orcamento
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
