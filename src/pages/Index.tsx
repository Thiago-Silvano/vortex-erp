import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QuoteData, ClientData, TripData, ServiceItem, SERVICE_TYPE_CONFIG } from '@/types/quote';
import { saveQuoteData } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ServiceItemForm from '@/components/ServiceItemForm';
import { Eye, Trash2, Pencil, Settings, FileText } from 'lucide-react';

const defaultClient: ClientData = { name: '', passengers: 1, phone: '', email: '', notes: '' };
const defaultTrip: TripData = { origin: '', destination: '', departureDate: '', returnDate: '', nights: 1, tripType: 'Lazer' };

export default function Index() {
  const navigate = useNavigate();
  const [client, setClient] = useState<ClientData>(defaultClient);
  const [trip, setTrip] = useState<TripData>(defaultTrip);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

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

  const handlePreview = () => {
    const quote: QuoteData = { client, trip, services };
    saveQuoteData(quote);
    navigate('/preview');
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-primary text-primary-foreground">
        <div className="container mx-auto flex items-center justify-between py-4 px-4">
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6" />
            <h1 className="text-xl font-bold">Sistema de Orçamentos</h1>
          </div>
          <Button variant="ghost" className="text-primary-foreground hover:text-accent" onClick={() => navigate('/settings')}>
            <Settings className="h-5 w-5 mr-1" /> Configurações
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
                <Label>Nome do Cliente</Label>
                <Input value={client.name} onChange={e => setClient(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <Label>Nº de Passageiros</Label>
                <Input type="number" min={1} value={client.passengers} onChange={e => setClient(p => ({ ...p, passengers: parseInt(e.target.value) || 1 }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Telefone</Label>
                <Input value={client.phone} onChange={e => setClient(p => ({ ...p, phone: e.target.value }))} />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={client.email} onChange={e => setClient(p => ({ ...p, email: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea value={client.notes} onChange={e => setClient(p => ({ ...p, notes: e.target.value }))} rows={2} />
            </div>
          </CardContent>
        </Card>

        {/* Trip Data */}
        <Card>
          <CardHeader><CardTitle>Informações da Viagem</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Origem</Label>
                <Input value={trip.origin} onChange={e => setTrip(p => ({ ...p, origin: e.target.value }))} />
              </div>
              <div>
                <Label>Destino</Label>
                <Input value={trip.destination} onChange={e => setTrip(p => ({ ...p, destination: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <Label>Data Ida</Label>
                <Input type="date" value={trip.departureDate} onChange={e => setTrip(p => ({ ...p, departureDate: e.target.value }))} />
              </div>
              <div>
                <Label>Data Volta</Label>
                <Input type="date" value={trip.returnDate} onChange={e => setTrip(p => ({ ...p, returnDate: e.target.value }))} />
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
                    <SelectItem value="Negócios">Negócios</SelectItem>
                    <SelectItem value="Lua de mel">Lua de mel</SelectItem>
                    <SelectItem value="Família">Família</SelectItem>
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
              Serviços ({services.length})
              {!showForm && !editingId && (
                <Button size="sm" onClick={() => setShowForm(true)}>+ Adicionar Serviço</Button>
              )}
            </CardTitle>
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
                    <p className="text-xs text-muted-foreground">{s.supplier} • {s.location}</p>
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
              <p className="text-center text-muted-foreground py-8">Nenhum serviço adicionado. Clique em "Adicionar Serviço" para começar.</p>
            )}
          </CardContent>
        </Card>

        {/* Summary */}
        {services.length > 0 && (
          <Card className="bg-primary text-primary-foreground">
            <CardContent className="flex items-center justify-between py-4">
              <div>
                <p className="text-sm opacity-80">{services.length} serviço(s)</p>
                <p className="text-2xl font-bold">
                  Total: R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <Button size="lg" variant="secondary" onClick={handlePreview} className="text-accent-foreground">
                <Eye className="h-5 w-5 mr-2" /> Visualizar Orçamento
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
