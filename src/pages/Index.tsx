import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { QuoteData, ClientData, TripData, ServiceItem, SERVICE_TYPE_CONFIG, PaymentData } from '@/types/quote';
import { getAgencySettings } from '@/lib/storage';
import { saveQuoteToDB, uploadImage } from '@/lib/supabase-storage';
import { useCompany } from '@/contexts/CompanyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ServiceItemForm from '@/components/ServiceItemForm';
import AutocompleteInput from '@/components/AutocompleteInput';
import InternalFiles from '@/components/InternalFiles';
import AppLayout from '@/components/AppLayout';
import { WORLD_CITIES } from '@/data/cities';
import { Eye, Trash2, Pencil, Save, Link, Copy, ImagePlus, X, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const defaultClient: ClientData = { name: '', passengers: 1, phone: '', email: '', notes: '' };
const defaultTrip: TripData = { origin: '', destination: '', departureDate: '', returnDate: '', tripType: 'Lazer', nights: 0 };
const defaultPayment: PaymentData = { pixValue: 0, installmentsNoInterest: 0, installmentsWithInterest: 0, installmentValueNoInterest: 0, installmentValueWithInterest: 0 };

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (value.startsWith('+')) {
    return '+' + digits.slice(0, 15);
  }
  const br = digits.slice(0, 11);
  if (br.length <= 2) return br.length ? `(${br}` : '';
  if (br.length <= 7) return `(${br.slice(0, 2)}) ${br.slice(2)}`;
  return `(${br.slice(0, 2)}) ${br.slice(2, 7)}-${br.slice(7)}`;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function calcNights(dep: string, ret: string): number {
  if (!dep || !ret) return 0;
  const d1 = new Date(dep);
  const d2 = new Date(ret);
  return Math.max(0, Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)));
}

interface ValidationErrors {
  [key: string]: string;
}

export default function Index() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { activeCompany } = useCompany();
  const [quoteId, setQuoteId] = useState<string | undefined>();
  const [shortId, setShortId] = useState<string | undefined>();
  const [client, setClient] = useState<ClientData>(defaultClient);
  const [trip, setTrip] = useState<TripData>(defaultTrip);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [payment, setPayment] = useState<PaymentData>(defaultPayment);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [saving, setSaving] = useState(false);
  const [destinationImage, setDestinationImage] = useState<string | undefined>();
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const [allSellers, setAllSellers] = useState<{id: string; full_name: string}[]>([]);
  const [sellerId, setSellerId] = useState<string>('');
  const initialLoadRef = useRef(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email || null));
    if (activeCompany) {
      (supabase.from('sellers') as any).select('id, full_name').eq('empresa_id', activeCompany.id).eq('status', 'active').order('full_name').then(({ data }: any) => { if (data) setAllSellers(data); });
    }
  }, [activeCompany]);

  useEffect(() => {
    const state = location.state as any;
    if (state?.editQuote) {
      const q = state.editQuote;
      setQuoteId(q.id);
      setShortId(q.shortId);
      setClient(q.client);
      setTrip(q.trip);
      setServices(q.services);
      setDestinationImage(q.destinationImageUrl);
      if (q.payment) setPayment(q.payment);
      if (q.sellerId) setSellerId(q.sellerId);
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  // Auto-calculate nights
  useEffect(() => {
    const nights = calcNights(trip.departureDate, trip.returnDate);
    setTrip(p => ({ ...p, nights }));
  }, [trip.departureDate, trip.returnDate]);

  // Track unsaved changes
  useEffect(() => {
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      return;
    }
    const hasData = client.name || services.length > 0 || trip.origin || trip.destination;
    if (hasData) setHasUnsavedChanges(true);
  }, [client, services, trip, payment, destinationImage]);

  const handleNavigateAway = (path: string) => {
    if (hasUnsavedChanges) {
      setPendingNavigation(path);
      setShowLeaveDialog(true);
    } else {
      navigate(path);
    }
  };

  const confirmLeave = () => {
    setShowLeaveDialog(false);
    setHasUnsavedChanges(false);
    if (pendingNavigation) navigate(pendingNavigation);
  };

  const confirmLeaveAndSave = async () => {
    await handleSave();
    setShowLeaveDialog(false);
    setHasUnsavedChanges(false);
    if (pendingNavigation) navigate(pendingNavigation);
  };

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

  const costTotal = services.reduce((sum, s) => sum + s.value * s.quantity, 0);
  const total = costTotal + (payment.rav || 0);

  // Auto-recalculate pix value when discount or total changes
  useEffect(() => {
    if (discountPercent > 0 && total > 0) {
      setPayment(p => ({
        ...p,
        pixValue: Math.round(total * (1 - discountPercent / 100) * 100) / 100,
      }));
    }
  }, [total, discountPercent]);

  // Auto-recalculate installment value when total or installments change
  useEffect(() => {
    if (payment.installmentsNoInterest > 0 && total > 0) {
      setPayment(p => ({
        ...p,
        installmentValueNoInterest: Math.round((total / p.installmentsNoInterest) * 100) / 100,
      }));
    }
  }, [total, payment.installmentsNoInterest]);

  const validate = (): boolean => {
    const errs: ValidationErrors = {};
    if (!client.name.trim()) errs.clientName = 'Nome do cliente é obrigatório';
    if (!client.phone.trim()) errs.clientPhone = 'Telefone é obrigatório';
    if (client.email && !isValidEmail(client.email)) errs.clientEmail = 'Email inválido';
    if (!trip.origin.trim()) errs.tripOrigin = 'Origem é obrigatória';
    if (!trip.destination.trim()) errs.tripDestination = 'Destino é obrigatório';
    if (!trip.departureDate) errs.tripDeparture = 'Data de ida é obrigatória';
    if (!trip.returnDate) errs.tripReturn = 'Data de volta é obrigatória';
    if (services.length === 0) errs.services = 'Adicione pelo menos um serviço';
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast({ title: 'Campos obrigatórios', description: Object.values(errs)[0], variant: 'destructive' });
      return false;
    }
    return true;
  };

  const handlePreview = () => {
    if (!validate()) return;
    const quote: QuoteData = { id: quoteId, client, trip, services, payment, destinationImageUrl: destinationImage };
    navigate('/preview', { state: { quote, shortId } });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const quoteData: any = { client, trip, services, payment, destinationImageUrl: destinationImage, sellerId };
      const saved = await saveQuoteToDB(quoteData, quoteId, activeCompany?.id);
      setQuoteId(saved.id);
      setShortId(saved.shortId);
      setHasUnsavedChanges(false);
      toast({ title: 'Cotação salva!', description: 'Cotação salva com sucesso.' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro ao salvar', description: 'Ocorreu um erro. Tente novamente.', variant: 'destructive' });
    }
    setSaving(false);
  };

  const handleGenerateLink = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const quoteData: any = { client, trip, services, payment, destinationImageUrl: destinationImage, sellerId };
      const saved = await saveQuoteToDB(quoteData, quoteId, activeCompany?.id);
      setQuoteId(saved.id);
      setShortId(saved.shortId);
      const link = `${window.location.origin}/orcamento/${saved.shortId}`;
      await navigator.clipboard.writeText(link);
      toast({ title: 'Link gerado e copiado!', description: link });
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro ao gerar link', description: 'Ocorreu um erro. Tente novamente.', variant: 'destructive' });
    }
    setSaving(false);
  };

  const handleCopyLink = () => {
    if (!shortId) {
      toast({ title: 'Salve primeiro', description: 'Salve o orçamento para gerar um link.', variant: 'destructive' });
      return;
    }
    const link = `${window.location.origin}/orcamento/${shortId}`;
    navigator.clipboard.writeText(link);
    toast({ title: 'Link copiado!', description: link });
  };

  const handleDestinationImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadImage(file, 'destinations');
    if (url) {
      setDestinationImage(url);
      toast({ title: 'Imagem do destino enviada!' });
    }
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
    <AppLayout>
      <div className="container mx-auto py-6 px-4 max-w-4xl space-y-6">
        {/* Back button */}
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => handleNavigateAway('/quotes')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar às Cotações
          </Button>
          {quoteId && <span className="text-sm text-muted-foreground">Editando cotação #{shortId}</span>}
        </div>

        {/* Leave confirmation dialog */}
        <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Deseja salvar antes de sair?</AlertDialogTitle>
              <AlertDialogDescription>
                Você tem alterações não salvas nesta cotação. Deseja salvar antes de sair?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowLeaveDialog(false)}>Cancelar</AlertDialogCancel>
              <Button variant="outline" onClick={confirmLeave}>Sair sem salvar</Button>
              <AlertDialogAction onClick={confirmLeaveAndSave}>Salvar e sair</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {shortId && (
          <div className="flex items-center gap-2 bg-accent/50 border border-accent rounded-lg px-4 py-3">
            <Link className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Link do orçamento:</span>
            <code className="text-sm bg-background px-2 py-1 rounded flex-1 truncate">
              {window.location.origin}/orcamento/{shortId}
            </code>
            <Button variant="outline" size="sm" onClick={handleCopyLink}>
              <Copy className="h-3 w-3 mr-1" /> Copiar
            </Button>
          </div>
        )}

        {/* Client Data */}
        <Card>
          <CardHeader><CardTitle>Dados do Cliente</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Telefone *</Label>
                <Input
                  value={client.phone}
                  onChange={e => handlePhoneChange(e.target.value)}
                  placeholder="+55 (XX) XXXXX-XXXX"
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
              <Label>Observações</Label>
              <Textarea value={client.notes} onChange={e => setClient(p => ({ ...p, notes: e.target.value }))} rows={2} />
            </div>
            <div>
              <Label>Vendedor Responsável</Label>
              <Select value={sellerId} onValueChange={setSellerId}>
                <SelectTrigger><SelectValue placeholder="Selecione o vendedor" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum</SelectItem>
                  {allSellers.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Trip Data */}
        <Card>
          <CardHeader><CardTitle>Informações da Viagem</CardTitle></CardHeader>
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                <Input
                  type="number"
                  min={0}
                  value={trip.nights || 0}
                  onChange={e => setTrip(p => ({ ...p, nights: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>

            {/* Destination Image */}
            <div>
              <Label>Imagem do Destino (exibida no link do orçamento)</Label>
              <Input type="file" accept="image/*" onChange={handleDestinationImage} />
              {destinationImage && (
                <div className="mt-2 relative inline-block">
                  <img src={destinationImage} alt="Destino" className="h-24 rounded object-cover" />
                  <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 h-5 w-5" onClick={() => setDestinationImage(undefined)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Services */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Serviços ({services.length})
              {!showForm && !editingId && (
                <Button size="sm" onClick={() => { setShowForm(true); clearError('services'); }}>+ Adicionar Serviço</Button>
              )}
            </CardTitle>
            {errors.services && <p className="text-xs text-destructive">{errors.services}</p>}
          </CardHeader>
          <CardContent className="space-y-3">
            {services.map(s => (
              editingId === s.id ? (
                <ServiceItemForm key={s.id} editItem={s} onAdd={addService} onCancel={() => setEditingId(null)} tripOrigin={trip.origin} tripDestination={trip.destination} />
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
            {showForm && <ServiceItemForm onAdd={addService} onCancel={() => setShowForm(false)} tripOrigin={trip.origin} tripDestination={trip.destination} />}
            {services.length === 0 && !showForm && (
              <p className="text-center text-muted-foreground py-8">Nenhum serviço adicionado. Clique em "Adicionar Serviço" para começar.</p>
            )}
          </CardContent>
        </Card>

        {/* Payment Conditions - now after services */}
        <Card>
          <CardHeader><CardTitle>Condições de Pagamento</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                id="showIndividualValues"
                checked={payment.showIndividualValues || false}
                onChange={e => setPayment(p => ({ ...p, showIndividualValues: e.target.checked }))}
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="showIndividualValues" className="cursor-pointer text-sm">
                Informar no orçamento valor individual de cada serviço?
              </Label>
            </div>

            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                id="showPerPassenger"
                checked={payment.showPerPassenger || false}
                onChange={e => setPayment(p => ({ ...p, showPerPassenger: e.target.checked }))}
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="showPerPassenger" className="cursor-pointer text-sm">
                Mostrar valor por passageiro?
              </Label>
            </div>

            {/* RAV (Markup) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="font-semibold">💼 RAV (Lucro / Markup)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={payment.rav || ''}
                  onChange={e => setPayment(p => ({ ...p, rav: parseFloat(e.target.value) || 0 }))}
                  placeholder="Ex: 1500.00"
                />
              </div>
              <div>
                <Label className="text-muted-foreground text-sm">Custo dos serviços</Label>
                <p className="text-lg font-semibold mt-1">
                  R$ {costTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {/* Valor Total */}
            <div className="bg-primary/10 rounded-lg p-4 border border-primary/20">
              <Label className="text-lg font-bold text-primary">Valor Total (Custo + RAV)</Label>
              <p className="text-3xl font-bold text-primary mt-1">
                R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-green-600 font-semibold">% Desconto Pix</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={discountPercent || ''}
                  onChange={e => {
                    const pct = parseFloat(e.target.value) || 0;
                    setDiscountPercent(pct);
                    if (pct > 0 && total > 0) {
                      setPayment(p => ({
                        ...p,
                        pixValue: Math.round(total * (1 - pct / 100) * 100) / 100,
                      }));
                    }
                  }}
                  placeholder="Ex: 5"
                />
              </div>
              <div>
                <Label className="text-green-600 font-semibold">💰 Valor à vista (Pix)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={payment.pixValue || ''}
                  onChange={e => setPayment(p => ({ ...p, pixValue: parseFloat(e.target.value) || 0 }))}
                  placeholder="Ex: 8500.00"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <Label>Parcelas sem juros</Label>
                <Input
                  type="number"
                  min={0}
                  value={payment.installmentsNoInterest || ''}
                  onChange={e => {
                    const n = parseInt(e.target.value) || 0;
                    setPayment(p => ({
                      ...p,
                      installmentsNoInterest: n,
                      installmentValueNoInterest: n > 0 ? Math.round((total / n) * 100) / 100 : 0,
                    }));
                  }}
                  placeholder="Ex: 10"
                />
              </div>
              <div>
                <Label>Valor da parcela (s/ juros)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={payment.installmentValueNoInterest || ''}
                  onChange={e => setPayment(p => ({ ...p, installmentValueNoInterest: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <Label>Parcelas com juros</Label>
                <Input
                  type="number"
                  min={0}
                  value={payment.installmentsWithInterest || ''}
                  onChange={e => setPayment(p => ({ ...p, installmentsWithInterest: parseInt(e.target.value) || 0 }))}
                  placeholder="Ex: 12"
                />
              </div>
              <div>
                <Label>Valor da parcela (c/ juros)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={payment.installmentValueWithInterest || ''}
                  onChange={e => setPayment(p => ({ ...p, installmentValueWithInterest: parseFloat(e.target.value) || 0 }))}
                  placeholder="Ex: 850.00"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Internal Files */}
        <InternalFiles quoteId={quoteId} />

        {/* Summary & Actions */}
        {services.length > 0 && (
          <Card className="bg-primary text-primary-foreground">
            <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-4 gap-3">
              <div>
                <p className="text-sm opacity-80">{services.length} serviço(s)</p>
                <p className="text-xl sm:text-2xl font-bold">
                  Total: R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="flex gap-2 flex-wrap w-full sm:w-auto">
                <Button size="sm" onClick={handleSave} disabled={saving} className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 flex-1 sm:flex-none sm:size-default">
                  <Save className="h-4 w-4 mr-1 sm:mr-2" /> {saving ? 'Salvando...' : 'Salvar'}
                </Button>
                <Button size="sm" onClick={handleGenerateLink} disabled={saving} className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 flex-1 sm:flex-none sm:size-default">
                  <Link className="h-4 w-4 mr-1 sm:mr-2" /> Gerar Link
                </Button>
                <Button size="sm" onClick={handlePreview} className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 flex-1 sm:flex-none sm:size-default">
                  <Eye className="h-4 w-4 mr-1 sm:mr-2" /> Visualizar PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {services.length === 0 && (
          <div className="flex justify-end gap-2">
            <Button size="lg" variant="outline" onClick={handleSave} disabled={saving}>
              <Save className="h-5 w-5 mr-2" /> {saving ? 'Salvando...' : 'Salvar Rascunho'}
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
