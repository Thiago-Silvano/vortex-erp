import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { FileText, Upload, Trash2, Plus, Check, Loader2, Plane, Hotel, Car, Shield, MapPin, Clock, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface FlightLeg {
  origin: string;
  destination: string;
  departure_date: string;
  departure_time: string;
  arrival_date: string;
  arrival_time: string;
  airline: string;
  flight_number: string;
  direction: 'ida' | 'volta';
  connection_duration: string;
}

interface BaggageInfo {
  personal_item: number;
  carry_on: number;
  checked_bag: number;
}

interface ExtractedService {
  service_type: string;
  description: string;
  cost_price: number;
  quantity: number;
  start_date: string;
  end_date: string;
  location: string;
  supplier: string;
  details: string;
  flight_legs?: FlightLeg[];
  baggage?: BaggageInfo;
  total_travel_duration_outbound?: string;
  total_travel_duration_return?: string;
}

interface TripInfo {
  client_name: string;
  origin: string;
  destination: string;
  departure_date: string;
  return_date: string;
  passengers?: number;
}

interface ServiceCatalogOption {
  id: string;
  name: string;
  cost_center_id: string | null;
}

interface ImportedItem {
  description: string;
  cost_price: number;
  rav: number;
  total_value: number;
  service_catalog_id?: string;
  cost_center_id?: string;
  metadata?: any;
}

interface PdfImportModalProps {
  open: boolean;
  onClose: () => void;
  serviceCatalog: ServiceCatalogOption[];
  onImport: (items: ImportedItem[], tripInfo: TripInfo) => void;
  marginMode: 'none' | 'fixed' | 'manual';
  marginPercent: number;
}

const serviceIcons: Record<string, any> = {
  'passagem': Plane,
  'aére': Plane,
  'voo': Plane,
  'flight': Plane,
  'hotel': Hotel,
  'hospedagem': Hotel,
  'carro': Car,
  'aluguel': Car,
  'seguro': Shield,
  'transfer': MapPin,
  'traslado': MapPin,
  'experiência': MapPin,
  'passeio': MapPin,
  'ingresso': MapPin,
  'cruzeiro': MapPin,
};

function getServiceIcon(serviceType: string) {
  const lower = serviceType.toLowerCase();
  for (const [key, Icon] of Object.entries(serviceIcons)) {
    if (lower.includes(key)) return Icon;
  }
  return FileText;
}

function getServiceColor(serviceType: string): string {
  const lower = serviceType.toLowerCase();
  if (lower.includes('aére') || lower.includes('passagem') || lower.includes('voo')) return 'bg-blue-500/10 text-blue-700 border-blue-200';
  if (lower.includes('hotel') || lower.includes('hospedagem')) return 'bg-amber-500/10 text-amber-700 border-amber-200';
  if (lower.includes('carro') || lower.includes('aluguel')) return 'bg-green-500/10 text-green-700 border-green-200';
  if (lower.includes('seguro')) return 'bg-purple-500/10 text-purple-700 border-purple-200';
  if (lower.includes('transfer') || lower.includes('traslado')) return 'bg-cyan-500/10 text-cyan-700 border-cyan-200';
  return 'bg-muted text-muted-foreground border-border';
}

export default function PdfImportModal({ open, onClose, serviceCatalog, onImport, marginMode: initialMarginMode, marginPercent: initialMarginPercent }: PdfImportModalProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState<'upload' | 'review'>('upload');
  const [services, setServices] = useState<ExtractedService[]>([]);
  const [tripInfo, setTripInfo] = useState<TripInfo>({ client_name: '', origin: '', destination: '', departure_date: '', return_date: '' });
  const [marginMode, setMarginMode] = useState<'none' | 'fixed' | 'manual'>(initialMarginMode);
  const [marginPercent, setMarginPercent] = useState(initialMarginPercent);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.type !== 'application/pdf') { toast.error('Apenas arquivos PDF são aceitos.'); return; }
    if (f.size > 20 * 1024 * 1024) { toast.error('Arquivo muito grande (máx 20MB).'); return; }
    setFile(f);
    setPdfUrl(URL.createObjectURL(f));
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setAnalyzing(true);
    setProgress(10);

    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      const base64 = btoa(binary);

      setProgress(30);

      const { data, error } = await supabase.functions.invoke('analyze-quote-pdf', {
        body: { pdfBase64: base64, serviceCatalog: serviceCatalog.map(s => ({ name: s.name })) },
      });

      setProgress(80);

      if (error) { toast.error('Erro ao analisar PDF.'); setAnalyzing(false); setProgress(0); return; }
      if (data?.error) { toast.error(data.error); setAnalyzing(false); setProgress(0); return; }

      const extractedServices: ExtractedService[] = (data?.services || []).map((s: any) => ({
        service_type: s.service_type || '',
        description: s.description || '',
        cost_price: Number(s.cost_price) || 0,
        quantity: Number(s.quantity) || 1,
        start_date: s.start_date || s.dates || '',
        end_date: s.end_date || '',
        location: s.location || '',
        supplier: s.supplier || '',
        details: s.details || '',
        flight_legs: s.flight_legs || undefined,
        baggage: s.baggage || undefined,
        total_travel_duration_outbound: s.total_travel_duration_outbound || '',
        total_travel_duration_return: s.total_travel_duration_return || '',
      }));

      const extractedTrip = data?.trip_info || {};

      setServices(extractedServices);
      setTripInfo({
        client_name: extractedTrip.client_name || '',
        origin: extractedTrip.origin || '',
        destination: extractedTrip.destination || '',
        departure_date: extractedTrip.departure_date || '',
        return_date: extractedTrip.return_date || '',
        passengers: extractedTrip.passengers || 1,
      });

      setProgress(100);
      setStep('review');
      toast.success(`${extractedServices.length} serviço(s) identificado(s) no PDF!`);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao processar o arquivo.');
    } finally {
      setAnalyzing(false);
    }
  };

  const updateService = (idx: number, field: keyof ExtractedService, value: any) => {
    setServices(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  const removeService = (idx: number) => {
    setServices(prev => prev.filter((_, i) => i !== idx));
  };

  const addService = () => {
    setServices(prev => [...prev, { service_type: '', description: '', cost_price: 0, quantity: 1, start_date: '', end_date: '', location: '', supplier: '', details: '' }]);
  };

  const calcRav = (cost: number) => {
    if (marginMode === 'fixed' && marginPercent > 0) return Math.round(cost * (marginPercent / 100) * 100) / 100;
    return 0;
  };

  const handleConfirm = () => {
    const items: ImportedItem[] = services.map(s => {
      const matchedCatalog = serviceCatalog.find(c => c.name.toLowerCase().includes(s.service_type.toLowerCase()) || s.service_type.toLowerCase().includes(c.name.toLowerCase()));
      const cost = s.cost_price * (s.quantity || 1);
      const rav = calcRav(cost);
      return {
        description: s.description,
        cost_price: cost,
        rav,
        total_value: cost + rav,
        service_catalog_id: matchedCatalog?.id,
        cost_center_id: matchedCatalog?.cost_center_id || undefined,
      };
    });

    onImport(items, tripInfo);
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setFile(null);
    setPdfUrl('');
    setStep('upload');
    setServices([]);
    setTripInfo({ client_name: '', origin: '', destination: '', departure_date: '', return_date: '' });
    setProgress(0);
  };

  const totalCost = services.reduce((s, svc) => s + svc.cost_price * (svc.quantity || 1), 0);
  const totalWithMargin = marginMode === 'fixed' ? totalCost * (1 + marginPercent / 100) : totalCost;
  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatDate = (d: string) => {
    if (!d) return '';
    try {
      const parts = d.split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    } catch {}
    return d;
  };

  const hasFlightLegs = (svc: ExtractedService) => svc.flight_legs && svc.flight_legs.length > 0;

  const renderFlightItinerary = (svc: ExtractedService) => {
    if (!svc.flight_legs || svc.flight_legs.length === 0) return null;
    const outbound = svc.flight_legs.filter(l => l.direction === 'ida');
    const returnLegs = svc.flight_legs.filter(l => l.direction === 'volta');
    const unspecified = svc.flight_legs.filter(l => !l.direction || (l.direction !== 'ida' && l.direction !== 'volta'));

    const renderLegGroup = (legs: FlightLeg[], label: string, duration?: string) => {
      if (legs.length === 0) return null;
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-semibold">{label}</Badge>
            {duration && <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />Duração total: {duration}</span>}
          </div>
          <div className="space-y-1">
            {legs.map((leg, i) => (
              <div key={i}>
                <div className="flex items-center gap-2 text-sm bg-background rounded-md p-2 border">
                  <div className="flex items-center gap-1.5 font-mono font-semibold text-foreground min-w-[60px]">{leg.origin}</div>
                  <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                  <div className="flex items-center gap-1.5 font-mono font-semibold text-foreground min-w-[60px]">{leg.destination}</div>
                  <div className="text-muted-foreground text-xs mx-2">
                    {leg.departure_time && leg.arrival_time ? `${leg.departure_time} – ${leg.arrival_time}` : ''}
                    {leg.arrival_date && leg.departure_date && leg.arrival_date !== leg.departure_date && <span className="ml-1 text-primary">(+1)</span>}
                  </div>
                  {leg.airline && <Badge variant="secondary" className="text-xs">{leg.airline}</Badge>}
                  {leg.flight_number && <span className="text-xs text-muted-foreground">{leg.flight_number}</span>}
                  {formatDate(leg.departure_date) && <span className="text-xs text-muted-foreground ml-auto">{formatDate(leg.departure_date)}</span>}
                </div>
                {leg.connection_duration && (
                  <div className="flex items-center gap-1 text-xs text-amber-600 pl-4 py-1">
                    <Clock className="h-3 w-3" />
                    Conexão: {leg.connection_duration}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    };

    return (
      <div className="space-y-3 mt-2">
        {renderLegGroup(outbound, '✈️ IDA', svc.total_travel_duration_outbound)}
        {renderLegGroup(returnLegs, '✈️ VOLTA', svc.total_travel_duration_return)}
        {renderLegGroup(unspecified, '✈️ TRECHOS', '')}
        {svc.baggage && (svc.baggage.personal_item > 0 || svc.baggage.carry_on > 0 || svc.baggage.checked_bag > 0) && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground bg-muted/50 rounded-md p-2">
            <span className="font-medium">Bagagem:</span>
            {svc.baggage.personal_item > 0 && <span>🎒 Item pessoal: {svc.baggage.personal_item}</span>}
            {svc.baggage.carry_on > 0 && <span>💼 Mão: {svc.baggage.carry_on}</span>}
            {svc.baggage.checked_bag > 0 && <span>🧳 Despachada: {svc.baggage.checked_bag}</span>}
          </div>
        )}
      </div>
    );
  };

  const renderServiceCard = (svc: ExtractedService, idx: number) => {
    const Icon = getServiceIcon(svc.service_type);
    const colorClass = getServiceColor(svc.service_type);
    const isFlight = hasFlightLegs(svc);

    return (
      <Card key={idx} className="overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-md border ${colorClass}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Select value={svc.service_type} onValueChange={v => updateService(idx, 'service_type', v)}>
                    <SelectTrigger className="h-7 text-xs w-[180px]"><SelectValue placeholder="Tipo..." /></SelectTrigger>
                    <SelectContent>
                      {serviceCatalog.map(c => (
                        <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {svc.supplier && <Badge variant="outline" className="text-xs">{svc.supplier}</Badge>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="text-sm font-bold">{fmt(svc.cost_price * (svc.quantity || 1))}</p>
                {marginMode === 'fixed' && (
                  <p className="text-xs text-primary">{fmt(svc.cost_price * (svc.quantity || 1) * (1 + marginPercent / 100))}</p>
                )}
              </div>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeService(idx)}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          <Input
            value={svc.description}
            onChange={e => updateService(idx, 'description', e.target.value)}
            className="text-sm"
            placeholder="Descrição do serviço..."
          />

          {isFlight && renderFlightItinerary(svc)}

          {!isFlight && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              {svc.location && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {svc.location}
                </div>
              )}
              {svc.start_date && (
                <div className="text-muted-foreground">
                  📅 {formatDate(svc.start_date)}{svc.end_date ? ` → ${formatDate(svc.end_date)}` : ''}
                </div>
              )}
              {svc.details && (
                <div className="col-span-2 text-muted-foreground">ℹ️ {svc.details}</div>
              )}
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">Custo (R$)</Label>
              <Input type="number" step="0.01" value={svc.cost_price} onChange={e => updateService(idx, 'cost_price', parseFloat(e.target.value) || 0)} className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Quantidade</Label>
              <Input type="number" min={1} value={svc.quantity} onChange={e => updateService(idx, 'quantity', parseInt(e.target.value) || 1)} className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Fornecedor</Label>
              <Input value={svc.supplier} onChange={e => updateService(idx, 'supplier', e.target.value)} className="h-8 text-sm" placeholder="..." />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { handleReset(); onClose(); } }}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Importar Itinerário / Orçamento (PDF)
          </DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4">
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                {file ? file.name : 'Clique ou arraste um PDF (itinerário, voucher, orçamento de fornecedor)'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">O sistema irá identificar automaticamente passagens, hospedagem, aluguel de carro, seguro e outros serviços</p>
              <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
            </div>

            {pdfUrl && (
              <div className="border rounded-lg overflow-hidden">
                <iframe src={pdfUrl} className="w-full h-[300px]" title="PDF Preview" />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Aplicar Margem</Label>
                <Select value={marginMode} onValueChange={(v: any) => setMarginMode(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem margem (apenas custo)</SelectItem>
                    <SelectItem value="fixed">Margem fixa (%)</SelectItem>
                    <SelectItem value="manual">Margem manual por item</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {marginMode === 'fixed' && (
                <div>
                  <Label>Margem (%)</Label>
                  <Input type="number" step="0.1" value={marginPercent} onChange={e => setMarginPercent(parseFloat(e.target.value) || 0)} />
                </div>
              )}
            </div>

            {analyzing && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analisando PDF com IA... Identificando passagens, hospedagem, seguros e outros serviços
                </div>
                <Progress value={progress} />
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { handleReset(); onClose(); }}>Cancelar</Button>
              <Button onClick={handleAnalyze} disabled={!file || analyzing}>
                {analyzing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analisando...</> : <><Plane className="h-4 w-4 mr-2" />Analisar Documento</>}
              </Button>
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-4">
            {/* Trip info summary */}
            {(tripInfo.client_name || tripInfo.origin || tripInfo.destination) && (
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-4">
                  <p className="text-sm font-semibold text-foreground mb-2">📋 Informações da Viagem</p>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                    {tripInfo.client_name && (
                      <div>
                        <span className="text-xs text-muted-foreground block">Cliente</span>
                        <span className="font-medium">{tripInfo.client_name}</span>
                      </div>
                    )}
                    {tripInfo.origin && (
                      <div>
                        <span className="text-xs text-muted-foreground block">Origem</span>
                        <span className="font-medium">{tripInfo.origin}</span>
                      </div>
                    )}
                    {tripInfo.destination && (
                      <div>
                        <span className="text-xs text-muted-foreground block">Destino</span>
                        <span className="font-medium">{tripInfo.destination}</span>
                      </div>
                    )}
                    {tripInfo.departure_date && (
                      <div>
                        <span className="text-xs text-muted-foreground block">Ida</span>
                        <span className="font-medium">{formatDate(tripInfo.departure_date)}</span>
                      </div>
                    )}
                    {tripInfo.return_date && (
                      <div>
                        <span className="text-xs text-muted-foreground block">Volta</span>
                        <span className="font-medium">{formatDate(tripInfo.return_date)}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Services */}
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">{services.length} serviço(s) identificado(s)</p>
              <Button size="sm" variant="outline" onClick={addService}><Plus className="h-4 w-4 mr-1" />Adicionar Item</Button>
            </div>

            <div className="space-y-3">
              {services.map((svc, idx) => renderServiceCard(svc, idx))}
            </div>

            {/* Totals */}
            <Card className="border-primary/20">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div className="space-y-1">
                    <p className="text-sm">Custo Total: <strong className="text-lg">{fmt(totalCost)}</strong></p>
                    {marginMode === 'fixed' && (
                      <p className="text-sm text-primary">Valor de Venda (com {marginPercent}%): <strong className="text-lg">{fmt(totalWithMargin)}</strong></p>
                    )}
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    {services.length} serviço(s)
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('upload')}>← Voltar</Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { handleReset(); onClose(); }}>Cancelar</Button>
                <Button onClick={handleConfirm} disabled={services.length === 0}>
                  <Check className="h-4 w-4 mr-2" />Confirmar e Importar ({services.length} itens)
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
