import { useState, useRef, useEffect } from 'react';
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
import { FileText, Upload, Trash2, Plus, Check, Loader2, Plane, Hotel, Car, Shield, MapPin, Clock, ArrowRight, ClipboardPaste, Image as ImageIcon, ChevronsUpDown, User } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import QuickClientModal from '@/components/QuickClientModal';
import { useCompany } from '@/contexts/CompanyContext';
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
  quote_option_key?: string;
}

interface ExtractedQuoteOption {
  title: string;
  services: ExtractedService[];
}

interface ExtractedPaymentTerm {
  label: string;
  installments: number;
  notes: string;
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
  quote_option_id?: string;
}

interface PdfImportResult {
  items: ImportedItem[];
  tripInfo: TripInfo;
  quoteOptions: { title: string }[];
  paymentTerms: ExtractedPaymentTerm[];
  generalNotes: string;
  selectedClient?: { id: string; full_name: string } | null;
}

interface PdfImportModalProps {
  open: boolean;
  onClose: () => void;
  serviceCatalog: ServiceCatalogOption[];
  onImport: (result: PdfImportResult) => void;
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
  const { activeCompany } = useCompany();
  const [pendingFiles, setPendingFiles] = useState<Array<{
    id: string;
    file: File;
    url: string;
    isImage: boolean;
    serviceType: string; // '' = auto
    optionTitle: string;
  }>>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState<'upload' | 'review'>('upload');
  const [services, setServices] = useState<ExtractedService[]>([]);
  const [quoteOptions, setQuoteOptions] = useState<ExtractedQuoteOption[]>([]);
  const [paymentTerms, setPaymentTerms] = useState<ExtractedPaymentTerm[]>([]);
  const [generalNotes, setGeneralNotes] = useState('');
  const [tripInfo, setTripInfo] = useState<TripInfo>({ client_name: '', origin: '', destination: '', departure_date: '', return_date: '' });
  const [marginMode, setMarginMode] = useState<'none' | 'fixed' | 'manual'>(initialMarginMode);
  const [marginPercent, setMarginPercent] = useState(initialMarginPercent);
  const [clientList, setClientList] = useState<Array<{ id: string; full_name: string }>>([]);
  const [selectedClient, setSelectedClient] = useState<{ id: string; full_name: string } | null>(null);
  const [clientPopoverOpen, setClientPopoverOpen] = useState(false);
  const [quickClientOpen, setQuickClientOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    let q = supabase.from('clients').select('id, full_name').order('full_name');
    if (activeCompany?.id) q = q.eq('empresa_id', activeCompany.id);
    q.then(({ data }) => { if (data) setClientList(data as any); });
  }, [open, activeCompany?.id]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fs = Array.from(e.target.files || []);
    fs.forEach(acceptFile);
    if (fileRef.current) fileRef.current.value = '';
  };

  const acceptFile = (f: File) => {
    const isPdf = f.type === 'application/pdf';
    const isImg = f.type.startsWith('image/');
    if (!isPdf && !isImg) { toast.error('Envie um PDF ou uma imagem (JPG/PNG/WEBP).'); return; }
    if (f.size > 20 * 1024 * 1024) { toast.error('Arquivo muito grande (máx 20MB).'); return; }
    setPendingFiles(prev => [...prev, {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      file: f,
      url: URL.createObjectURL(f),
      isImage: isImg,
      serviceType: '',
      optionTitle: 'Opção 1',
    }]);
  };

  const updatePendingFile = (id: string, patch: Partial<{ serviceType: string; optionTitle: string }>) => {
    setPendingFiles(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p));
  };

  const removePendingFile = (id: string) => {
    setPendingFiles(prev => {
      const target = prev.find(p => p.id === id);
      if (target) try { URL.revokeObjectURL(target.url); } catch {}
      return prev.filter(p => p.id !== id);
    });
  };

  // Permite colar imagem direto da área de transferência (Ctrl+V) enquanto o modal está aberto
  useEffect(() => {
    if (!open || step !== 'upload') return;
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      let pasted = 0;
      for (const item of Array.from(items)) {
        if (item.kind === 'file') {
          const f = item.getAsFile();
          if (f) {
            acceptFile(f);
            pasted++;
          }
        }
      }
      if (pasted > 0) {
        e.preventDefault();
        toast.success(`${pasted} arquivo(s) colado(s) da área de transferência.`);
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [open, step]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const fs = Array.from(e.dataTransfer.files || []);
    fs.forEach(acceptFile);
  };

  const handleAnalyze = async () => {
    if (pendingFiles.length === 0) return;
    setAnalyzing(true);
    setProgress(10);

    try {
      const normalizeService = (s: any, quoteOptionKey?: string, forcedType?: string): ExtractedService => ({
        service_type: forcedType || s.service_type || '',
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
        quote_option_key: quoteOptionKey,
      });

      // Build unique ordered list of option titles from the user selections
      const uniqueOptionTitles: string[] = [];
      for (const p of pendingFiles) {
        const t = (p.optionTitle || 'Opção 1').trim() || 'Opção 1';
        if (!uniqueOptionTitles.includes(t)) uniqueOptionTitles.push(t);
      }
      const optionKeyByTitle: Record<string, string> = {};
      uniqueOptionTitles.forEach((t, i) => { optionKeyByTitle[t] = String(i); });

      const fileToBase64 = async (f: File) => {
        const buffer = await f.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        return btoa(binary);
      };

      const allServices: ExtractedService[] = [];
      let mergedPaymentTerms: ExtractedPaymentTerm[] = [];
      let mergedNotes = '';
      let mergedTrip: any = {};

      for (let i = 0; i < pendingFiles.length; i++) {
        const p = pendingFiles[i];
        setProgress(10 + Math.round((i / pendingFiles.length) * 80));
        const base64 = await fileToBase64(p.file);
        const { data, error } = await supabase.functions.invoke('analyze-quote-pdf', {
          body: {
            pdfBase64: base64,
            mimeType: p.file.type || (p.isImage ? 'image/png' : 'application/pdf'),
            serviceCatalog: serviceCatalog.map(s => ({ name: s.name })),
            hintServiceType: p.serviceType || undefined,
          },
        });
        if (error || data?.error) {
          toast.error(`Erro ao analisar "${p.file.name}".`);
          continue;
        }
        const title = (p.optionTitle || 'Opção 1').trim() || 'Opção 1';
        const quoteKey = optionKeyByTitle[title];
        const forcedType = p.serviceType || undefined;

        const rawServices: any[] = (data?.quote_options || []).length > 0
          ? (data.quote_options as any[]).flatMap(o => o.services || [])
          : (data?.services || []);

        rawServices.forEach(s => allServices.push(normalizeService(s, quoteKey, forcedType)));

        if (data?.payment_info?.payment_terms?.length) {
          mergedPaymentTerms = mergedPaymentTerms.concat(
            data.payment_info.payment_terms.map((term: any) => ({
              label: term.label || '',
              installments: Number(term.installments) || 1,
              notes: term.notes || '',
            }))
          );
        }
        if (data?.payment_info?.general_notes) {
          mergedNotes = mergedNotes ? `${mergedNotes}\n${data.payment_info.general_notes}` : data.payment_info.general_notes;
        }
        if (data?.trip_info && !mergedTrip.client_name) {
          mergedTrip = data.trip_info;
        }
      }

      const extractedQuoteOptions: ExtractedQuoteOption[] = uniqueOptionTitles.map((title, index) => ({
        title,
        services: allServices.filter(s => s.quote_option_key === String(index)),
      }));
      const extractedTrip = mergedTrip || {};

      setServices(allServices);
      setQuoteOptions(extractedQuoteOptions);
      setPaymentTerms(mergedPaymentTerms);
      setGeneralNotes(mergedNotes);
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
      toast.success(`${allServices.length} serviço(s) identificado(s) em ${pendingFiles.length} arquivo(s)!`);
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

  const detectServiceType = (serviceType: string): string | undefined => {
    const lower = serviceType.toLowerCase();
    if (lower.includes('aére') || lower.includes('passagem') || lower.includes('voo') || lower.includes('flight')) return 'aereo';
    if (lower.includes('hotel') || lower.includes('hospedagem')) return 'hotel';
    if (lower.includes('carro') || lower.includes('aluguel')) return 'carro';
    if (lower.includes('seguro')) return 'seguro';
    if (lower.includes('experiência') || lower.includes('passeio') || lower.includes('ingresso')) return 'experiencia';
    return 'adicional';
  };

  const handleConfirm = async () => {
    // Carrega cias aéreas cadastradas para tentar match automático
    let airlinesList: Array<{ id: string; name: string }> = [];
    try {
      const { data } = await (supabase.from('airlines' as any).select('id, name').eq('is_active', true) as any);
      airlinesList = (data || []) as any;
    } catch {}
    const findAirlineId = (raw?: string): string | undefined => {
      if (!raw) return undefined;
      const norm = raw.toLowerCase().trim();
      const exact = airlinesList.find(a => a.name.toLowerCase() === norm);
      if (exact) return exact.id;
      const partial = airlinesList.find(a => norm.includes(a.name.toLowerCase()) || a.name.toLowerCase().includes(norm));
      return partial?.id;
    };

    const items: ImportedItem[] = services.map(s => {
      const matchedCatalog = serviceCatalog.find(c => c.name.toLowerCase().includes(s.service_type.toLowerCase()) || s.service_type.toLowerCase().includes(c.name.toLowerCase()));
      const cost = s.cost_price * (s.quantity || 1);
      const rav = calcRav(cost);
      const detectedType = detectServiceType(s.service_type);

      const metadata: any = { type: detectedType, detailedDescription: s.details || '' };

      if (detectedType === 'aereo' && s.flight_legs?.length) {
        const mainAirlineRaw = s.flight_legs.find(l => l.airline)?.airline || '';
        const mainAirlineId = findAirlineId(mainAirlineRaw);
        if (mainAirlineId) metadata.airlineId = mainAirlineId;
        metadata.flightLegs = s.flight_legs.map(leg => ({
          origin: leg.origin || '',
          destination: leg.destination || '',
          departureDate: leg.departure_date || '',
          departureTime: leg.departure_time || '',
          arrivalDate: leg.arrival_date || '',
          arrivalTime: leg.arrival_time || '',
          connectionDuration: leg.connection_duration || '',
          direction: leg.direction || 'ida',
          flightCode: leg.flight_number ? `${leg.airline || ''} ${leg.flight_number}`.trim() : (leg.airline || ''),
          airlineId: findAirlineId(leg.airline) || mainAirlineId,
        }));
        if (s.baggage) {
          metadata.baggage = {
            personalItem: s.baggage.personal_item ?? 1,
            carryOn: s.baggage.carry_on ?? 1,
            checkedBag: s.baggage.checked_bag ?? 1,
          };
        }
        metadata.totalTravelDurationOutbound = s.total_travel_duration_outbound || '';
        metadata.totalTravelDurationReturn = s.total_travel_duration_return || '';
      }

      let finalDescription = s.description;
      if (detectedType === 'aereo' && s.flight_legs?.length) {
        const idaLegs = s.flight_legs.filter(l => l.direction === 'ida');
        const legsForRoute = idaLegs.length ? idaLegs : s.flight_legs;
        const first = legsForRoute[0];
        const last = legsForRoute[legsForRoute.length - 1];
        if (first && last) {
          finalDescription = `${first.origin} para ${last.destination}`;
        }
        metadata.detailedDescription = '';
      }

      return {
        description: finalDescription,
        cost_price: cost,
        rav,
        total_value: cost + rav,
        service_catalog_id: matchedCatalog?.id,
        cost_center_id: matchedCatalog?.cost_center_id || undefined,
        metadata,
        quote_option_id: s.quote_option_key,
      };
    });

    onImport({
      items,
      tripInfo,
      quoteOptions: quoteOptions.map(option => ({ title: option.title })),
      paymentTerms,
      generalNotes,
      selectedClient,
    });
    handleReset();
    onClose();
  };

  const handleReset = () => {
    pendingFiles.forEach(p => { try { URL.revokeObjectURL(p.url); } catch {} });
    setPendingFiles([]);
    setStep('upload');
    setServices([]);
    setQuoteOptions([]);
    setPaymentTerms([]);
    setGeneralNotes('');
    setTripInfo({ client_name: '', origin: '', destination: '', departure_date: '', return_date: '' });
    setProgress(0);
    setSelectedClient(null);
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
    <>
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
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                {pendingFiles.length > 0
                  ? `${pendingFiles.length} arquivo(s) selecionado(s) — clique para adicionar mais`
                  : 'Clique, arraste ou cole (Ctrl+V) um ou mais PDFs/imagens'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Aceita PDF, JPG, PNG ou WEBP (máx 20MB) — passagens, hospedagem, carro, seguro e outros
              </p>
              <p className="text-xs text-primary mt-2 inline-flex items-center gap-1">
                <ClipboardPaste className="h-3 w-3" /> Dica: copie um print e pressione Ctrl+V aqui
              </p>
              <input ref={fileRef} type="file" accept=".pdf,image/*" multiple className="hidden" onChange={handleFileChange} />
            </div>

            {pendingFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Arquivos para análise
                </p>
                {pendingFiles.map((p) => {
                  const Icon = getServiceIcon(p.serviceType);
                  return (
                    <div key={p.id} className="flex items-center gap-2 border rounded-lg p-2">
                      <div className="h-12 w-12 shrink-0 rounded-md bg-muted/40 overflow-hidden flex items-center justify-center border">
                        {p.isImage ? (
                          <img src={p.url} alt={p.file.name} className="h-full w-full object-cover" />
                        ) : (
                          <FileText className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate" title={p.file.name}>{p.file.name}</p>
                        <p className="text-[10px] text-muted-foreground">{(p.file.size / 1024).toFixed(0)} KB</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                        <Select value={p.serviceType || 'auto'} onValueChange={(v) => updatePendingFile(p.id, { serviceType: v === 'auto' ? '' : v })}>
                          <SelectTrigger className="h-8 text-xs w-[150px]">
                            <SelectValue placeholder="Tipo..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="auto">Auto-detectar</SelectItem>
                            <SelectItem value="Aéreo">Aéreo</SelectItem>
                            <SelectItem value="Hospedagem">Hospedagem</SelectItem>
                            <SelectItem value="Aluguel de carro">Aluguel de carro</SelectItem>
                            <SelectItem value="Seguro viagem">Seguro viagem</SelectItem>
                            <SelectItem value="Experiência/Passeio">Experiência/Passeio</SelectItem>
                            <SelectItem value="Transfer">Transfer</SelectItem>
                            <SelectItem value="Outros">Outros</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Input
                        value={p.optionTitle}
                        onChange={(e) => updatePendingFile(p.id, { optionTitle: e.target.value })}
                        placeholder="Opção 1"
                        className="h-8 text-xs w-[130px]"
                        title="Opção da cotação (ex: Opção 1, Opção Econômica)"
                      />
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removePendingFile(p.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  );
                })}
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
                  Analisando {pendingFiles.length} arquivo(s) com IA... Identificando passagens, hospedagem, seguros e outros serviços
                </div>
                <Progress value={progress} />
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { handleReset(); onClose(); }}>Cancelar</Button>
              <Button onClick={handleAnalyze} disabled={pendingFiles.length === 0 || analyzing}>
                {analyzing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analisando...</> : <><Plane className="h-4 w-4 mr-2" />Analisar {pendingFiles.length > 0 ? `${pendingFiles.length} arquivo(s)` : 'Documento'}</>}
              </Button>
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-4">
            {/* Client selection (optional) */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold text-foreground">Cliente <span className="text-xs font-normal text-muted-foreground">(opcional)</span></p>
                </div>
                <div className="flex gap-2">
                  <Popover open={clientPopoverOpen} onOpenChange={setClientPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" className="flex-1 justify-between font-normal h-9">
                        {selectedClient?.full_name || 'Selecione um cliente existente...'}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar cliente..." />
                        <CommandList>
                          <CommandEmpty>Nenhum cliente encontrado</CommandEmpty>
                          <CommandGroup>
                            {clientList.map(c => (
                              <CommandItem key={c.id} value={c.full_name} onSelect={() => { setSelectedClient(c); setClientPopoverOpen(false); }}>
                                {c.full_name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {selectedClient && (
                    <Button type="button" size="sm" variant="ghost" onClick={() => setSelectedClient(null)}>Limpar</Button>
                  )}
                  <Button type="button" size="icon" variant="outline" onClick={() => setQuickClientOpen(true)} title="Cadastrar novo cliente">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {(quoteOptions.length > 0 || paymentTerms.length > 0 || generalNotes) && (
              <Card>
                <CardContent className="p-4 space-y-4">
                  {quoteOptions.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-foreground mb-2">🧾 Opções identificadas</p>
                      <div className="flex flex-wrap gap-2">
                        {quoteOptions.map((option, index) => (
                          <Badge key={`${option.title}-${index}`} variant="secondary">{option.title}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {paymentTerms.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-foreground mb-2">💳 Formas de pagamento detectadas</p>
                      <div className="space-y-2">
                        {paymentTerms.map((term, index) => (
                          <div key={`${term.label}-${index}`} className="rounded-md border border-border p-3 text-sm">
                            <p className="font-medium">{term.label}</p>
                            {term.installments > 1 && <p className="text-muted-foreground">Até {term.installments}x</p>}
                            {term.notes && <p className="text-muted-foreground mt-1">{term.notes}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {generalNotes && (
                    <div>
                      <p className="text-sm font-semibold text-foreground mb-2">📝 Observações gerais</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-line">{generalNotes}</p>
                    </div>
                  )}
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
    <QuickClientModal
      open={quickClientOpen}
      onClose={() => setQuickClientOpen(false)}
      onClientCreated={(c) => {
        const created = { id: c.id, full_name: c.full_name };
        setClientList(prev => [created, ...prev.filter(x => x.id !== created.id)]);
        setSelectedClient(created);
        setQuickClientOpen(false);
      }}
    />
    </>
  );
}
