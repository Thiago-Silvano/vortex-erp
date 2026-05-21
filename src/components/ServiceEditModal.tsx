import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import RichTextEditor from '@/components/RichTextEditor';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Search, Loader2, Plane, Hotel, Car, Shield, Star, Check, MapPin, Calendar, OctagonAlert, FileUp, Upload, Images, GripVertical, X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCompany } from '@/contexts/CompanyContext';
import { maskCurrencyInput, parseCurrency } from '@/lib/masks';
import TripAdvisorImageModal from '@/components/TripAdvisorImageModal';

interface FlightLeg {
  origin: string;
  destination: string;
  departureDate: string;
  departureTime: string;
  arrivalDate: string;
  arrivalTime: string;
  connectionDuration: string;
  direction: 'ida' | 'volta';
  flightCode: string;
  airlineId?: string;
  localizador?: string;
  stopover?: boolean;
  stopoverDays?: number;
  stopoverMinutes?: number;
}

interface BaggageInfo {
  personalItem: number;
  carryOn: number;
  checkedBag: number;
}

interface HotelInfo {
  hotelName: string;
  stars: number;
  address: string;
  city: string;
  country: string;
  description: string;
  amenities: string[];
  checkInTime: string;
  checkOutTime: string;
  checkInDate: string;
  checkOutDate: string;
  category: string;
  highlights: string[];
  images?: string[];
  placeId?: string;
  phone?: string;
  website?: string;
  rating?: number;
  reviewsTotal?: number;
  roomType?: string;
  roomCount?: number;
  guestCount?: number;
  nightsCount?: number;
  pricePerNight?: number;
  totalPrice?: number;
  observations?: string;
  tripadvisorRating?: number;
  tripadvisorReviewsCount?: number;
  tripadvisorRanking?: string;
  tripadvisorBadges?: string[];
  tripadvisorTopReviews?: string[];
  tripadvisorRatingBreakdown?: {
    location: number;
    cleanliness: number;
    service: number;
    value: number;
    rooms: number;
  };
  tripadvisorPopularMentions?: string[];
}

export interface ExperienceInfo {
  startDate: string;
  endDate: string;
  freeDays: number;
  aiTips: string;
}

export interface ServiceMetadata {
  type?: 'aereo' | 'hotel' | 'carro' | 'seguro' | 'experiencia' | 'adicional';
  airlineId?: string;
  flightLegs?: FlightLeg[];
  baggage?: BaggageInfo;
  hotel?: HotelInfo;
  experience?: ExperienceInfo;
  detailedDescription?: string;
  isAirService?: boolean;
  totalTravelDurationOutbound?: string;
  totalTravelDurationReturn?: string;
}

function calcTotalTravelDuration(legs: FlightLeg[]): string {
  if (legs.length === 0) return '';
  const first = legs[0];
  const last = legs[legs.length - 1];
  if (!first.departureDate || !first.departureTime || !last.arrivalDate || !last.arrivalTime) return '';
  const dep = new Date(`${first.departureDate}T${first.departureTime}:00`);
  const arr = new Date(`${last.arrivalDate}T${last.arrivalTime}:00`);
  if (isNaN(dep.getTime()) || isNaN(arr.getTime())) return '';
  let diffMs = arr.getTime() - dep.getTime();
  if (diffMs < 0) return '';
  const totalMinutes = Math.round(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
}

interface Props {
  open: boolean;
  onClose: () => void;
  description: string;
  metadata: ServiceMetadata;
  reservationNumber?: string;
  costPrice?: number;
  rav?: number;
  onSave: (description: string, metadata: ServiceMetadata, reservationNumber?: string, costPrice?: number, rav?: number) => void;
  onHotelImagesFound?: (images: string[]) => void;
  onImportPdf?: () => void;
  existingImages?: string[];
}

const emptyLeg = (): FlightLeg => ({
  origin: '', destination: '', departureDate: '', departureTime: '',
  arrivalDate: '', arrivalTime: '', connectionDuration: '', direction: 'ida', flightCode: '',
});

const emptyHotel = (): HotelInfo => ({
  hotelName: '', stars: 0, address: '', city: '', country: '', description: '',
  amenities: [], checkInTime: '15:00', checkOutTime: '11:00',
  checkInDate: '', checkOutDate: '', category: '', highlights: [], images: [],
  phone: '', website: '', rating: 0, reviewsTotal: 0,
  roomType: '', roomCount: 1, guestCount: 2, nightsCount: 0, pricePerNight: 0, totalPrice: 0, observations: '',
});

export default function ServiceEditModal({ open, onClose, description, metadata, reservationNumber, costPrice, rav, onSave, onHotelImagesFound, onImportPdf, existingImages }: Props) {
  const { activeCompany } = useCompany();
  const [type, setType] = useState<ServiceMetadata['type']>(metadata.type || 'adicional');
  const [desc, setDesc] = useState(description);
  const [detailedDesc, setDetailedDesc] = useState(metadata.detailedDescription || '');
  const [flightLegs, setFlightLegs] = useState<FlightLeg[]>(metadata.flightLegs || []);
  const [baggage, setBaggage] = useState<BaggageInfo>(metadata.baggage || { personalItem: 1, carryOn: 1, checkedBag: 1 });
  const [hotel, setHotel] = useState<HotelInfo>(metadata.hotel || emptyHotel());
  const [searchingHotel, setSearchingHotel] = useState(false);
  const [hotelImages, setHotelImages] = useState<string[]>(metadata.hotel?.images || []);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(
    new Set((metadata.hotel?.images || []))
  );
  const [taImagesOpen, setTaImagesOpen] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  // Library picker
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [librarySearch, setLibrarySearch] = useState('');
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryResults, setLibraryResults] = useState<any[]>([]);
  const [librarySelected, setLibrarySelected] = useState<Set<string>>(new Set());
  const [libraryTypeFilter, setLibraryTypeFilter] = useState<string>('all');
  const [experience, setExperience] = useState<ExperienceInfo>(metadata.experience || { startDate: '', endDate: '', freeDays: 0, aiTips: '' });
  const [generatingItinerary, setGeneratingItinerary] = useState(false);
  const [isAirService, setIsAirService] = useState(metadata.isAirService || false);
  const [airlineId, setAirlineId] = useState(metadata.airlineId || '');
  const [airlinesList, setAirlinesList] = useState<any[]>([]);
  const [mainReservation, setMainReservation] = useState(reservationNumber || '');
  const [costPriceStr, setCostPriceStr] = useState<string>(costPrice ? maskCurrencyInput(costPrice) : '');
  const [ravStr, setRavStr] = useState<string>(rav ? maskCurrencyInput(rav) : '');

  useEffect(() => {
    if (open) {
      const mainAirline = metadata.airlineId || '';
      setType(metadata.type || 'adicional');
      setDesc(description);
      setDetailedDesc(metadata.detailedDescription || '');
      setIsAirService(metadata.isAirService || false);
      // Sync main airlineId to legs that don't have their own
      const legs = (metadata.flightLegs || []).map(l => ({
        ...l,
        airlineId: l.airlineId || mainAirline || undefined,
      }));
      setFlightLegs(legs);
      setBaggage(metadata.baggage || { personalItem: 1, carryOn: 1, checkedBag: 1 });
      setHotel(metadata.hotel || emptyHotel());
      const tp = metadata.type || 'adicional';
      const existingImgs = tp === 'hotel'
        ? (metadata.hotel?.images || [])
        : (existingImages || []);
      setHotelImages(existingImgs);
      setPreviewImageUrl(null);
      setSelectedImages(new Set(existingImgs));
      setExperience(metadata.experience || { startDate: '', endDate: '', freeDays: 0, aiTips: '' });
      setAirlineId(mainAirline);
      setMainReservation(reservationNumber || '');
      setCostPriceStr(costPrice ? maskCurrencyInput(costPrice) : '');
      setRavStr(rav ? maskCurrencyInput(rav) : '');
      loadAirlines();
    }
  }, [open, metadata, description, reservationNumber, costPrice, rav]);

  const loadAirlines = async () => {
    if (!activeCompany) return;
    const { data } = await (supabase.from('airlines' as any).select('*') as any)
      .eq('empresa_id', activeCompany.id)
      .eq('is_active', true)
      .order('name');
    setAirlinesList(data || []);
  };

  // Calculate nights when dates change
  useEffect(() => {
    if (hotel.checkInDate && hotel.checkOutDate) {
      const cin = new Date(hotel.checkInDate);
      const cout = new Date(hotel.checkOutDate);
      const diff = Math.max(0, Math.round((cout.getTime() - cin.getTime()) / (1000 * 60 * 60 * 24)));
      setHotel(prev => ({
        ...prev,
        nightsCount: diff,
        totalPrice: diff * (prev.pricePerNight || 0),
      }));
    }
  }, [hotel.checkInDate, hotel.checkOutDate]);

  const addFlightLeg = () => setFlightLegs(prev => [...prev, { ...emptyLeg(), airlineId: airlineId || undefined }]);
  const updateLeg = (idx: number, field: keyof FlightLeg, value: string) => {
    setFlightLegs(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  };

  const handleAirlineIdChange = (newId: string) => {
    setAirlineId(newId);
    // Apply to all existing legs
    setFlightLegs(prev => prev.map(l => ({ ...l, airlineId: newId })));
  };
  const removeLeg = (idx: number) => setFlightLegs(prev => prev.filter((_, i) => i !== idx));

  const toggleImageSelection = (url: string) => {
    setSelectedImages(prev => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  };

  const removeImage = (idx: number) => {
    setHotelImages(prev => {
      const url = prev[idx];
      setSelectedImages(s => { const n = new Set(s); n.delete(url); return n; });
      return prev.filter((_, i) => i !== idx);
    });
  };

  const reorderImages = (from: number, to: number) => {
    if (from === to) return;
    setHotelImages(prev => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const handleUploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const libType = inferLibraryType();
    const productName = (type === 'hotel' ? hotel.hotelName : desc)?.trim() || '';
    const canSaveToLibrary = !!activeCompany?.id && !!productName;
    const urls: string[] = [];
    let savedToLibrary = 0;

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      try {
        if (canSaveToLibrary) {
          const ext = file.name.split('.').pop() || 'jpg';
          const path = `${activeCompany!.id}/${libType}/${crypto.randomUUID()}.${ext}`;
          const { error: upErr } = await supabase.storage
            .from('product-images-library').upload(path, file);
          if (upErr) throw upErr;
          const { data: pub } = supabase.storage
            .from('product-images-library').getPublicUrl(path);
          await (supabase.from('product_images' as any).insert({
            empresa_id: activeCompany!.id,
            product_type: libType,
            product_name: productName,
            image_url: pub.publicUrl,
            storage_path: path,
            keywords: null,
          }) as any);
          urls.push(pub.publicUrl);
          savedToLibrary++;
        } else {
          // Fallback: sem empresa/nome, mantém comportamento antigo (base64)
          const url = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          urls.push(url);
        }
      } catch (err: any) {
        console.error('Upload error:', err);
        toast.error(`Falha ao enviar ${file.name}`);
      }
    }

    if (urls.length > 0) {
      setHotelImages(prev => [...prev, ...urls]);
      setSelectedImages(prev => { const n = new Set(prev); urls.forEach(u => n.add(u)); return n; });
      if (savedToLibrary > 0) {
        toast.success(`${urls.length} imagem(ns) adicionada(s) e salva(s) no Banco de Imagens`);
      } else {
        toast.success(`${urls.length} imagem(ns) adicionada(s)`);
      }
    }
  };

  const inferLibraryType = (): string => {
    if (type === 'hotel') return 'hospedagem';
    if (type === 'carro') return 'carro';
    if (type === 'experiencia') return 'experiencia';
    return 'servico';
  };

  const openLibrary = () => {
    setLibrarySelected(new Set());
    const defaultName = type === 'hotel'
      ? (hotel.hotelName || '')
      : (desc || '');
    setLibrarySearch(defaultName.trim());
    setLibraryTypeFilter(inferLibraryType());
    setLibraryOpen(true);
    // Run initial search with current filter
    setTimeout(() => runLibrarySearch(defaultName.trim(), inferLibraryType()), 0);
  };

  const runLibrarySearch = async (q?: string, typeFilter?: string) => {
    if (!activeCompany?.id) return;
    setLibraryLoading(true);
    try {
      const term = (q ?? librarySearch).trim();
      const tf = typeFilter ?? libraryTypeFilter;
      let query: any = (supabase.from('product_images' as any) as any)
        .select('*').eq('empresa_id', activeCompany.id);
      if (tf && tf !== 'all') query = query.eq('product_type', tf);
      if (term) query = query.or(`product_name.ilike.%${term}%,keywords.ilike.%${term}%`);
      const { data } = await query.order('product_name').limit(120);
      setLibraryResults((data || []) as any[]);
    } finally { setLibraryLoading(false); }
  };

  const toggleLibrarySelected = (url: string) => {
    setLibrarySelected(prev => {
      const n = new Set(prev);
      if (n.has(url)) n.delete(url); else n.add(url);
      return n;
    });
  };

  const addSelectedFromLibrary = () => {
    const urls = Array.from(librarySelected);
    if (urls.length === 0) { toast.info('Selecione ao menos uma imagem'); return; }
    setHotelImages(prev => {
      const merged = [...prev];
      urls.forEach(u => { if (!merged.includes(u)) merged.push(u); });
      return merged;
    });
    setSelectedImages(prev => {
      const n = new Set(prev);
      urls.forEach(u => n.add(u));
      return n;
    });
    toast.success(`${urls.length} imagem(ns) adicionada(s) do banco`);
    setLibraryOpen(false);
  };

  // Fallback AI search
  const handleSearchHotelAI = async () => {
    if (!hotel.hotelName.trim()) { toast.error('Digite o nome do hotel'); return; }
    setSearchingHotel(true);
    try {
      const { data, error } = await supabase.functions.invoke('search-hotel-ai', {
        body: { hotelName: hotel.hotelName, location: hotel.city || hotel.country || '' },
      });
      if (error) throw error;
      if (data?.success && data.data) {
        const h = data.data;
        setHotel(prev => ({
          ...prev,
          hotelName: h.name || prev.hotelName,
          stars: h.stars || prev.stars,
          address: h.address || prev.address,
          city: h.city || prev.city,
          country: h.country || prev.country,
          description: h.description || prev.description,
          amenities: h.amenities || prev.amenities,
          checkInTime: h.check_in_time || prev.checkInTime,
          checkOutTime: h.check_out_time || prev.checkOutTime,
          category: h.category || prev.category,
          highlights: h.highlights || prev.highlights,
          tripadvisorRating: h.tripadvisor_rating || prev.tripadvisorRating,
          tripadvisorReviewsCount: h.tripadvisor_reviews_count || prev.tripadvisorReviewsCount,
          tripadvisorRanking: h.tripadvisor_ranking || prev.tripadvisorRanking,
          tripadvisorBadges: h.tripadvisor_badges || prev.tripadvisorBadges,
          tripadvisorTopReviews: h.tripadvisor_top_reviews || prev.tripadvisorTopReviews,
          tripadvisorRatingBreakdown: h.tripadvisor_rating_breakdown || prev.tripadvisorRatingBreakdown,
          tripadvisorPopularMentions: h.tripadvisor_popular_mentions || prev.tripadvisorPopularMentions,
        }));
        if (data.images && data.images.length > 0) {
          setHotelImages(prev => {
            const merged = [...prev];
            (data.images as string[]).forEach((u) => { if (!merged.includes(u)) merged.push(u); });
            return merged;
          });
          setSelectedImages(prev => {
            const n = new Set(prev);
            (data.images as string[]).forEach((u) => n.add(u));
            return n;
          });
        }
        toast.success(`Informações do hotel e TripAdvisor encontradas!`);
      } else {
        toast.warning('Hotel não encontrado no TripAdvisor. Ajuste o nome/cidade e tente novamente.');
      }
    } catch (e: any) {
      toast.error(e.message || 'Erro ao buscar hotel');
    } finally {
      setSearchingHotel(false);
    }
  };

  const calcExperienceDays = () => {
    if (!experience.startDate || !experience.endDate) return 0;
    const start = new Date(experience.startDate);
    const end = new Date(experience.endDate);
    return Math.max(0, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  };

  const handleGenerateItinerary = async () => {
    if (!desc.trim()) { toast.error('Preencha o nome da cidade na descrição resumida'); return; }
    if (!experience.startDate || !experience.endDate) { toast.error('Preencha as datas de início e fim'); return; }
    const totalDays = calcExperienceDays();
    if (totalDays <= 0) { toast.error('A data final deve ser posterior à data inicial'); return; }
    setGeneratingItinerary(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-itinerary', {
        body: { city: desc.trim(), totalDays, freeDays: experience.freeDays || 0, aiTips: experience.aiTips || '' },
      });
      if (error) throw error;
      if (data?.success && data.itinerary) {
        setDetailedDesc(data.itinerary);
        toast.success('Roteiro gerado com sucesso!');
      } else {
        toast.error(data?.error || 'Erro ao gerar roteiro');
      }
    } catch (e: any) {
      toast.error(e.message || 'Erro ao gerar roteiro');
    } finally {
      setGeneratingItinerary(false);
    }
  };

  const handleSave = () => {
    const orderedSelectedImages = hotelImages.filter((u) => selectedImages.has(u));
    const meta: ServiceMetadata = { type, detailedDescription: detailedDesc, isAirService: type === 'adicional' ? isAirService : undefined };
    if (type === 'aereo') {
      meta.airlineId = airlineId || undefined;
      // Auto-compute stopover flags based on time between consecutive legs
      const legsWithStopover = flightLegs.map((leg, idx) => {
        const nextLeg = flightLegs[idx + 1];
        if (!nextLeg) return { ...leg, stopover: false, stopoverDays: 0 };
        const sameCity = leg.destination && nextLeg.origin && leg.destination.trim().toUpperCase() === nextLeg.origin.trim().toUpperCase();
        if (!sameCity || !leg.arrivalDate || !leg.arrivalTime || !nextLeg.departureDate || !nextLeg.departureTime) return { ...leg, stopover: false, stopoverDays: 0 };
        const arrival = new Date(`${leg.arrivalDate}T${leg.arrivalTime}:00`);
        const departure = new Date(`${nextLeg.departureDate}T${nextLeg.departureTime}:00`);
        if (isNaN(arrival.getTime()) || isNaN(departure.getTime())) return { ...leg, stopover: false, stopoverDays: 0 };
        const diffMinutes = Math.round((departure.getTime() - arrival.getTime()) / 60000);
        if (diffMinutes > 720) { // > 12h = stopover
          const days = Math.floor(diffMinutes / 1440);
          return { ...leg, stopover: true, stopoverDays: days || 1, stopoverMinutes: diffMinutes };
        }
        return { ...leg, stopover: false, stopoverDays: 0 };
      });
      meta.flightLegs = legsWithStopover;
      meta.baggage = baggage;
      const outbound = legsWithStopover.filter(l => l.direction === 'ida');
      const returnL = legsWithStopover.filter(l => l.direction === 'volta');
      meta.totalTravelDurationOutbound = calcTotalTravelDuration(outbound.length > 0 ? outbound : legsWithStopover.filter(l => l.direction !== 'volta'));
      meta.totalTravelDurationReturn = calcTotalTravelDuration(returnL);
    }
    if (type === 'hotel') {
      meta.hotel = { ...hotel, images: orderedSelectedImages };
    }
    if (type === 'experiencia') {
      meta.experience = experience;
    }
    // Para hotel, o título usado em listas/recibos é o próprio hotelName
    const finalDesc = type === 'hotel' ? (hotel.hotelName || desc) : desc;
    // Para hotel, não persistir detailedDescription (legado)
    if (type === 'hotel') meta.detailedDescription = undefined;
    onSave(
      finalDesc,
      meta,
      mainReservation || undefined,
      parseCurrency(costPriceStr),
      parseCurrency(ravStr),
    );
    if (onHotelImagesFound) {
      onHotelImagesFound(orderedSelectedImages);
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3 pr-6">
            <DialogTitle>Editar Detalhes do Serviço</DialogTitle>
            {onImportPdf && (
              <Button
                size="sm"
                onClick={onImportPdf}
                className="gap-2 bg-orange-500 hover:bg-orange-600 text-white mx-[10px]"
              >
                <FileUp className="h-4 w-4" /> Importar PDF
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Type selector */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
            {([
              { value: 'aereo', label: 'Aéreo', icon: Plane },
              { value: 'hotel', label: 'Hotel', icon: Hotel },
              { value: 'carro', label: 'Carro', icon: Car },
              { value: 'seguro', label: 'Seguro', icon: Shield },
              { value: 'experiencia', label: 'Experiência', icon: Star },
              { value: 'adicional', label: 'Outros', icon: Plus },
            ] as const).map(opt => (
              <Button key={opt.value} variant={type === opt.value ? 'default' : 'outline'} size="sm"
                className="w-full" onClick={() => setType(opt.value)}>
                <opt.icon className="h-3 w-3 mr-1" />{opt.label}
              </Button>
            ))}
          </div>

          {/* Número da Reserva (todos os tipos exceto aéreo, que tem campo próprio) */}
          {type !== 'aereo' && (
            <div>
              <Label className="text-xs">Número da Reserva / Localizador</Label>
              <Input
                value={mainReservation}
                onChange={e => setMainReservation(e.target.value.toUpperCase())}
                placeholder="Ex: ABC123"
              />
            </div>
          )}

          {/* Description (oculto para hotel — usa hotelName) */}
          {type !== 'hotel' && (
            <div>
              <Label>Descrição resumida {type === 'experiencia' && '(nome da cidade/destino)'}</Label>
              <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder={type === 'experiencia' ? "Ex: Paris, Roma, Nova York..." : "Título do serviço"} />
            </div>
          )}

          {/* Hotel name (entre tipo de serviço e valores) */}
          {type === 'hotel' && (
            <div className="space-y-2">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Label>Nome do Hotel</Label>
                  <div className="relative">
                    <Input value={hotel.hotelName} onChange={e => setHotel(p => ({ ...p, hotelName: e.target.value }))} placeholder="Ex: Grand Hyatt Rio de Janeiro" className={hotel.city ? 'pr-32' : ''} />
                    {hotel.city && (
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary max-w-[120px] truncate">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{hotel.city}</span>
                      </span>
                    )}
                  </div>
                </div>
                <Button variant="outline" onClick={handleSearchHotelAI} disabled={searchingHotel}>
                  {searchingHotel ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Search className="h-4 w-4 mr-1" />}
                  {searchingHotel ? 'Buscando...' : 'Buscar no TripAdvisor'}
                </Button>
              </div>
            </div>
          )}

          {/* ── EXPERIÊNCIA dates ── */}
          {type === 'experiencia' && (
            <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-sm">Dados da Experiência</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs">Data Inicial</Label>
                  <Input type="date" value={experience.startDate} onChange={e => setExperience(p => ({ ...p, startDate: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Data Final</Label>
                  <Input type="date" value={experience.endDate} onChange={e => setExperience(p => ({ ...p, endDate: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Total de Dias</Label>
                  <Input type="number" value={calcExperienceDays()} readOnly className="bg-muted" />
                </div>
                <div>
                  <Label className="text-xs">Dias Livres</Label>
                  <Input type="number" min="0" max={Math.max(0, calcExperienceDays() - 1)} value={experience.freeDays} onChange={e => setExperience(p => ({ ...p, freeDays: parseInt(e.target.value) || 0 }))} />
                </div>
              </div>
              <div>
                <Label className="text-xs">Dicas para I.A</Label>
                <Textarea
                  value={experience.aiTips || ''}
                  onChange={e => setExperience(p => ({ ...p, aiTips: e.target.value }))}
                  placeholder="Ex: Dia 18 chegada de avião, fazer check-in, tarde livre. Dia 20 jantar especial no restaurante X..."
                  rows={3}
                  className="text-xs"
                />
              </div>
              {calcExperienceDays() > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {calcExperienceDays() - (experience.freeDays || 0)} dia(s) de roteiro serão gerados
                  </span>
                  <Button size="sm" variant="outline" onClick={handleGenerateItinerary} disabled={generatingItinerary}>
                    {generatingItinerary ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Calendar className="h-3 w-3 mr-1" />}
                    {generatingItinerary ? 'Gerando roteiro...' : 'Gerar Roteiro com IA'}
                  </Button>
                </div>
              )}
            </div>
          )}

          {type !== 'hotel' && (
            <div>
              <Label>Descrição detalhada (aparece na proposta)</Label>
              <RichTextEditor value={detailedDesc} onChange={setDetailedDesc} placeholder="Descrição completa para o cliente..." rows={type === 'experiencia' ? 10 : 3} />
            </div>
          )}

          {/* Valores do serviço — Custo e RAV (Lucro Bruto). Total = Custo + RAV */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-lg border bg-muted/30 p-3">
            <div>
              <Label className="text-xs">Valor do Custo</Label>
              <Input
                inputMode="numeric"
                value={costPriceStr}
                onChange={e => setCostPriceStr(maskCurrencyInput(e.target.value))}
                placeholder="R$ 0,00"
                className="[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
            </div>
            <div>
              <Label className="text-xs">RAV / Lucro Bruto</Label>
              <Input
                inputMode="numeric"
                value={ravStr}
                onChange={e => setRavStr(maskCurrencyInput(e.target.value))}
                placeholder="R$ 0,00"
                className="[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
            </div>
            <div>
              <Label className="text-xs">Total do Serviço</Label>
              <Input
                value={maskCurrencyInput(parseCurrency(costPriceStr) + parseCurrency(ravStr)) || 'R$ 0,00'}
                readOnly
                className="bg-background font-semibold"
              />
            </div>
          </div>

          {type === 'adicional' && (
            <div className="flex items-center gap-2 py-1">
              <Checkbox id="isAirService" checked={isAirService} onCheckedChange={(v) => setIsAirService(!!v)} />
              <Label htmlFor="isAirService" className="text-sm cursor-pointer">Serviço aéreo? (aparecerá no voucher aéreo)</Label>
            </div>
          )}

          {/* ── Generic image gallery (for non-hotel services) ── */}
          {type !== 'hotel' && (
            <div className="space-y-2 border-t pt-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <Label className="text-sm font-semibold">
                  Fotos do Serviço {hotelImages.length > 0 && `(${selectedImages.size}/${hotelImages.length} selecionadas)`}
                </Label>
                <div className="flex gap-2 flex-wrap">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => { handleUploadFiles(e.target.files); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                  />
                  <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-3 w-3 mr-1" /> Importar do Arquivo
                  </Button>
                  <Button size="sm" variant="outline" onClick={openLibrary}>
                    <Images className="h-3 w-3 mr-1" /> Banco de Imagens
                  </Button>
                </div>
              </div>
              {hotelImages.length === 0 ? (
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center text-xs text-muted-foreground">
                  Nenhuma imagem ainda. Clique em "Importar do Arquivo" para adicionar fotos do seu computador.
                </div>
              ) : (
                <>
                  <p className="text-[11px] text-muted-foreground">Arraste as miniaturas para reordenar. Clique para ampliar. Use o ✓ para incluir/excluir da proposta.</p>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    {hotelImages.map((img, idx) => {
                      const isSelected = selectedImages.has(img);
                      return (
                        <div
                          key={img + idx}
                          draggable
                          onDragStart={() => setDragIdx(idx)}
                          onDragOver={(e) => { e.preventDefault(); }}
                          onDrop={(e) => { e.preventDefault(); if (dragIdx !== null) reorderImages(dragIdx, idx); setDragIdx(null); }}
                          onDragEnd={() => setDragIdx(null)}
                          className={`group relative rounded-lg overflow-hidden border-2 transition-all aspect-video ${
                            isSelected ? 'border-primary ring-2 ring-primary/30' : 'border-dashed border-muted-foreground/30 opacity-60'
                          } ${dragIdx === idx ? 'opacity-50' : ''}`}
                        >
                          <button type="button" className="block h-full w-full cursor-zoom-in" onClick={() => setPreviewImageUrl(img)} title="Clique para ampliar">
                            <img src={img} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover pointer-events-none" />
                          </button>
                          <div className="absolute top-1 left-1 bg-background/80 text-foreground rounded p-0.5 cursor-grab active:cursor-grabbing">
                            <GripVertical className="h-3 w-3" />
                          </div>
                          <span className="absolute bottom-1 left-1 bg-background/80 text-foreground rounded text-[10px] px-1">#{idx + 1}</span>
                          <button
                            type="button"
                            onClick={() => toggleImageSelection(img)}
                            className={`absolute top-1 right-7 rounded-full h-5 w-5 flex items-center justify-center ${
                              isSelected ? 'bg-primary text-primary-foreground' : 'bg-background/80 text-foreground border border-border'
                            }`}
                            title={isSelected ? 'Remover da proposta' : 'Incluir na proposta'}
                          >
                            {isSelected ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => removeImage(idx)}
                            className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full h-5 w-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Excluir imagem"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── AÉREO ── */}
          {type === 'aereo' && (
            <div className="space-y-4 border-t pt-4">
              {/* Cia Aérea principal */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Cia Aérea principal da viagem</Label>
                  <Select value={airlineId} onValueChange={handleAirlineIdChange}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {airlinesList.map((a: any) => (
                        <SelectItem key={a.id} value={a.id}>
                          <span className="flex items-center gap-2">
                            {a.logo_url && <img src={a.logo_url} alt="" className="h-4 w-6 object-contain inline" />}
                            {a.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Nº Reserva principal (Localizador)</Label>
                  <Input
                    value={mainReservation}
                    onChange={e => setMainReservation(e.target.value.toUpperCase())}
                    placeholder="ABC123"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Trechos do Voo</h3>
                <Button size="sm" variant="outline" onClick={addFlightLeg}><Plus className="h-3 w-3 mr-1" />Trecho</Button>
              </div>
              {flightLegs.map((leg, idx) => (
                <div key={idx} className="border rounded-lg p-4 space-y-3 relative bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Select value={leg.direction} onValueChange={v => updateLeg(idx, 'direction', v)}>
                        <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ida">Ida</SelectItem>
                          <SelectItem value="volta">Volta</SelectItem>
                        </SelectContent>
                      </Select>
                      <OctagonAlert className="h-3.5 w-3.5 text-destructive" />
                      <span className="text-xs text-muted-foreground">Trecho {idx + 1}</span>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => removeLeg(idx)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div><Label className="text-xs">Código do Voo</Label><Input value={leg.flightCode} onChange={e => updateLeg(idx, 'flightCode', e.target.value)} placeholder="LA1234" /></div>
                    <div><Label className="text-xs">Origem</Label><Input value={leg.origin} onChange={e => updateLeg(idx, 'origin', e.target.value)} placeholder="GRU" /></div>
                    <div><Label className="text-xs">Destino</Label><Input value={leg.destination} onChange={e => updateLeg(idx, 'destination', e.target.value)} placeholder="MIA" /></div>
                    <div>
                      <Label className="text-xs">Cia Aérea do trecho</Label>
                      <Select value={leg.airlineId || ''} onValueChange={v => updateLeg(idx, 'airlineId', v)}>
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          {airlinesList.map((a: any) => (
                            <SelectItem key={a.id} value={a.id}>
                              <span className="flex items-center gap-2">
                                {a.logo_url && <img src={a.logo_url} alt="" className="h-4 w-6 object-contain inline" />}
                                {a.name}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Localizador do trecho</Label>
                      <Input
                        value={leg.localizador || ''}
                        onChange={e => updateLeg(idx, 'localizador', e.target.value.toUpperCase())}
                        placeholder={mainReservation ? `(usar ${mainReservation})` : 'Opcional'}
                      />
                    </div>
                    <div><Label className="text-xs">Conexão (duração)</Label><Input value={leg.connectionDuration} onChange={e => updateLeg(idx, 'connectionDuration', e.target.value)} placeholder="2h30" /></div>
                    <div><Label className="text-xs">Data Partida</Label><Input type="date" value={leg.departureDate} onChange={e => updateLeg(idx, 'departureDate', e.target.value)} /></div>
                    <div><Label className="text-xs">Hora Partida</Label><Input type="time" value={leg.departureTime} onChange={e => updateLeg(idx, 'departureTime', e.target.value)} /></div>
                    <div><Label className="text-xs">Data Chegada</Label><Input type="date" value={leg.arrivalDate} onChange={e => updateLeg(idx, 'arrivalDate', e.target.value)} /></div>
                    <div><Label className="text-xs">Hora Chegada</Label><Input type="time" value={leg.arrivalTime} onChange={e => updateLeg(idx, 'arrivalTime', e.target.value)} /></div>
                  </div>
                  {/* Stopover auto-detection */}
                  {(() => {
                    // Check if next leg departs from same city this leg arrives at
                    const nextLeg = flightLegs[idx + 1];
                    if (!nextLeg) return null;
                    const sameCity = leg.destination && nextLeg.origin && leg.destination.trim().toUpperCase() === nextLeg.origin.trim().toUpperCase();
                    if (!sameCity) return null;
                    // Calculate time difference
                    if (!leg.arrivalDate || !leg.arrivalTime || !nextLeg.departureDate || !nextLeg.departureTime) return null;
                    const arrival = new Date(`${leg.arrivalDate}T${leg.arrivalTime}:00`);
                    const departure = new Date(`${nextLeg.departureDate}T${nextLeg.departureTime}:00`);
                    if (isNaN(arrival.getTime()) || isNaN(departure.getTime())) return null;
                    const diffMs = departure.getTime() - arrival.getTime();
                    if (diffMs <= 0) return null;
                    const totalMinutes = Math.round(diffMs / 60000);
                    const days = Math.floor(totalMinutes / 1440);
                    const hours = Math.floor((totalMinutes % 1440) / 60);
                    const mins = totalMinutes % 60;
                    // Only show as stopover if > 12 hours (otherwise it's a regular connection)
                    if (totalMinutes <= 720) return null;
                    const parts: string[] = [];
                    if (days > 0) parts.push(`${days} dia${days > 1 ? 's' : ''}`);
                    if (hours > 0) parts.push(`${hours}h`);
                    if (mins > 0) parts.push(`${mins}min`);
                    const stopLabel = parts.join(' ');
                    return (
                      <div className="flex items-center gap-2 pt-1">
                        <OctagonAlert className="h-3.5 w-3.5 text-destructive" />
                        <span className="text-xs font-bold text-destructive">
                          STOPOVER DE {stopLabel} em {leg.destination}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              ))}

              {/* Total travel duration preview */}
              {flightLegs.length > 0 && (() => {
                const outbound = flightLegs.filter(l => l.direction === 'ida');
                const returnL = flightLegs.filter(l => l.direction === 'volta');
                const durOut = calcTotalTravelDuration(outbound.length > 0 ? outbound : flightLegs.filter(l => l.direction !== 'volta'));
                const durRet = calcTotalTravelDuration(returnL);
                // Auto-detect stopovers for summary
                let totalStopoverMinutes = 0;
                flightLegs.forEach((leg, idx) => {
                  const nextLeg = flightLegs[idx + 1];
                  if (!nextLeg) return;
                  const sameCity = leg.destination && nextLeg.origin && leg.destination.trim().toUpperCase() === nextLeg.origin.trim().toUpperCase();
                  if (!sameCity || !leg.arrivalDate || !leg.arrivalTime || !nextLeg.departureDate || !nextLeg.departureTime) return;
                  const arrival = new Date(`${leg.arrivalDate}T${leg.arrivalTime}:00`);
                  const departure = new Date(`${nextLeg.departureDate}T${nextLeg.departureTime}:00`);
                  if (isNaN(arrival.getTime()) || isNaN(departure.getTime())) return;
                  const diff = Math.round((departure.getTime() - arrival.getTime()) / 60000);
                  if (diff > 720) totalStopoverMinutes += diff;
                });
                const stopDays = Math.floor(totalStopoverMinutes / 1440);
                const stopHours = Math.floor((totalStopoverMinutes % 1440) / 60);
                const stopMins = totalStopoverMinutes % 60;
                const stopParts: string[] = [];
                if (stopDays > 0) stopParts.push(`${stopDays} dia${stopDays > 1 ? 's' : ''}`);
                if (stopHours > 0) stopParts.push(`${stopHours}h`);
                if (stopMins > 0) stopParts.push(`${stopMins}min`);
                const stopLabel = stopParts.join(' ');
                return (durOut || durRet || totalStopoverMinutes > 0) ? (
                  <div className="border-t pt-3 flex flex-wrap gap-4 text-sm">
                    {durOut && <span className="text-muted-foreground">⏱ Tempo total IDA: <strong className="text-foreground">{durOut}</strong></span>}
                    {durRet && <span className="text-muted-foreground">⏱ Tempo total VOLTA: <strong className="text-foreground">{durRet}</strong></span>}
                    {totalStopoverMinutes > 0 && (
                      <span className="text-destructive font-semibold flex items-center gap-1">
                        <OctagonAlert className="h-3.5 w-3.5" /> Stopover de {stopLabel}
                      </span>
                    )}
                  </div>
                ) : null;
              })()}
            </div>
          )}

          {/* ── HOTEL ── */}
          {type === 'hotel' && (
            <div className="space-y-4 border-t pt-4">
              {searchingHotel && (
                <div className="p-4 bg-muted/50 rounded-lg text-center text-sm text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                  Buscando informações do hotel e TripAdvisor...
                </div>
              )}

              {/* Hotel Info Card */}
              {hotel.hotelName && (hotel.rating || hotel.description || hotel.address || hotel.tripadvisorRating) && (
                <div className="p-4 bg-muted/30 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-foreground">{hotel.hotelName}</h4>
                    {(hotel.rating || 0) > 0 && (
                      <span className="flex items-center gap-1 text-sm">
                        <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                        <span className="font-medium">{hotel.rating}</span>
                        {(hotel.reviewsTotal || 0) > 0 && (
                          <span className="text-muted-foreground text-xs">({hotel.reviewsTotal?.toLocaleString('pt-BR')} avaliações)</span>
                        )}
                      </span>
                    )}
                  </div>
                  {hotel.address && <p className="text-sm text-muted-foreground">{hotel.address}</p>}
                  {hotel.description && <p className="text-sm">{hotel.description}</p>}
                  {hotel.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {hotel.amenities.map((a, i) => (
                        <span key={i} className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">{a}</span>
                      ))}
                    </div>
                  )}
                  {hotel.phone && <p className="text-xs text-muted-foreground">📞 {hotel.phone}</p>}
                  {hotel.website && <p className="text-xs text-muted-foreground">🌐 {hotel.website}</p>}

                  {/* TripAdvisor Section */}
                  {(hotel.tripadvisorRating || hotel.tripadvisorRanking) && (
                    <div className="border-t pt-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">🦉 TripAdvisor</span>
                        {hotel.tripadvisorRating && (
                          <span className="flex items-center gap-1 text-sm">
                            <span className="font-bold text-emerald-600">{hotel.tripadvisorRating}</span>
                            <span className="text-muted-foreground text-xs">/5</span>
                            {hotel.tripadvisorReviewsCount && (
                              <span className="text-muted-foreground text-xs">({hotel.tripadvisorReviewsCount.toLocaleString('pt-BR')} avaliações)</span>
                            )}
                          </span>
                        )}
                      </div>

                      {hotel.tripadvisorRanking && (
                        <p className="text-xs text-muted-foreground">🏆 {hotel.tripadvisorRanking}</p>
                      )}

                      {hotel.tripadvisorBadges && hotel.tripadvisorBadges.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {hotel.tripadvisorBadges.map((b, i) => (
                            <span key={i} className="px-2 py-0.5 bg-emerald-500/10 text-emerald-700 text-xs rounded-full font-medium">🏅 {b}</span>
                          ))}
                        </div>
                      )}

                      {hotel.tripadvisorRatingBreakdown && (
                        <div className="grid grid-cols-5 gap-2 text-xs">
                          {[
                            { label: 'Localização', value: hotel.tripadvisorRatingBreakdown.location },
                            { label: 'Limpeza', value: hotel.tripadvisorRatingBreakdown.cleanliness },
                            { label: 'Serviço', value: hotel.tripadvisorRatingBreakdown.service },
                            { label: 'Custo-benefício', value: hotel.tripadvisorRatingBreakdown.value },
                            { label: 'Quartos', value: hotel.tripadvisorRatingBreakdown.rooms },
                          ].map((item, i) => (
                            <div key={i} className="text-center">
                              <div className="font-medium text-foreground">{item.value}</div>
                              <div className="text-muted-foreground">{item.label}</div>
                            </div>
                          ))}
                        </div>
                      )}

                      {hotel.tripadvisorTopReviews && hotel.tripadvisorTopReviews.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-foreground">Avaliações em destaque:</p>
                          {hotel.tripadvisorTopReviews.map((r, i) => (
                            <p key={i} className="text-xs text-muted-foreground italic">"{r}"</p>
                          ))}
                        </div>
                      )}

                      {hotel.tripadvisorPopularMentions && hotel.tripadvisorPopularMentions.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {hotel.tripadvisorPopularMentions.map((m, i) => (
                            <span key={i} className="px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded-full">#{m}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Hotel Images Gallery */}
              <div className="space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <Label className="text-sm font-semibold">
                    Fotos do Hotel {hotelImages.length > 0 && `(${selectedImages.size}/${hotelImages.length} selecionadas)`}
                  </Label>
                  <div className="flex gap-2 flex-wrap">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => { handleUploadFiles(e.target.files); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                    />
                    <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
                      <Upload className="h-3 w-3 mr-1" /> Importar do Arquivo
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setTaImagesOpen(true)}>
                      <Images className="h-3 w-3 mr-1" /> Buscar imagens TripAdvisor
                    </Button>
                    <Button size="sm" variant="outline" onClick={openLibrary}>
                      <Images className="h-3 w-3 mr-1" /> Banco de Imagens
                    </Button>
                  </div>
                </div>
                {hotelImages.length === 0 ? (
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center text-xs text-muted-foreground">
                    Nenhuma imagem ainda. Use "Buscar no TripAdvisor" acima para preencher automaticamente, importe imagens do arquivo, ou busque imagens no TripAdvisor.
                  </div>
                ) : (
                  <>
                    <p className="text-[11px] text-muted-foreground">Arraste as miniaturas para reordenar. Clique para ampliar. Use o ✓ para incluir/excluir da proposta.</p>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                      {hotelImages.map((img, idx) => {
                        const isSelected = selectedImages.has(img);
                        return (
                          <div
                            key={img + idx}
                            draggable
                            onDragStart={() => setDragIdx(idx)}
                            onDragOver={(e) => { e.preventDefault(); }}
                            onDrop={(e) => { e.preventDefault(); if (dragIdx !== null) reorderImages(dragIdx, idx); setDragIdx(null); }}
                            onDragEnd={() => setDragIdx(null)}
                            className={`group relative rounded-lg overflow-hidden border-2 transition-all aspect-video ${
                              isSelected ? 'border-primary ring-2 ring-primary/30' : 'border-dashed border-muted-foreground/30 opacity-60'
                            } ${dragIdx === idx ? 'opacity-50' : ''}`}
                          >
                            <button type="button" className="block h-full w-full cursor-zoom-in" onClick={() => setPreviewImageUrl(img)} title="Clique para ampliar">
                              <img src={img} alt={`Hotel ${idx + 1}`} className="w-full h-full object-cover pointer-events-none" />
                            </button>
                            <div className="absolute top-1 left-1 bg-background/80 text-foreground rounded p-0.5 cursor-grab active:cursor-grabbing">
                              <GripVertical className="h-3 w-3" />
                            </div>
                            <span className="absolute bottom-1 left-1 bg-background/80 text-foreground rounded text-[10px] px-1">#{idx + 1}</span>
                            <button
                              type="button"
                              onClick={() => toggleImageSelection(img)}
                              className={`absolute top-1 right-7 rounded-full h-5 w-5 flex items-center justify-center ${
                                isSelected ? 'bg-primary text-primary-foreground' : 'bg-background/80 text-foreground border border-border'
                              }`}
                              title={isSelected ? 'Remover da proposta' : 'Incluir na proposta'}
                            >
                              {isSelected ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => removeImage(idx)}
                              className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full h-5 w-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Excluir imagem"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              {/* Reservation Details */}
              <div className="border-t pt-4">
                <h3 className="font-semibold text-sm mb-3">Dados da Reserva</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div><Label className="text-xs">Check-in</Label><Input type="date" value={hotel.checkInDate} onChange={e => {
                    const cin = e.target.value;
                    setHotel(p => {
                      const next = { ...p, checkInDate: cin };
                      if (cin && !p.checkOutDate) {
                        const d = new Date(cin);
                        d.setDate(d.getDate() + 1);
                        next.checkOutDate = d.toISOString().split('T')[0];
                      }
                      return next;
                    });
                  }} /></div>
                  <div><Label className="text-xs">Check-out</Label><Input type="date" min={hotel.checkInDate || undefined} value={hotel.checkOutDate} onChange={e => setHotel(p => ({ ...p, checkOutDate: e.target.value }))} /></div>
                  <div><Label className="text-xs">Hora Check-in</Label><Input type="time" value={hotel.checkInTime} onChange={e => setHotel(p => ({ ...p, checkInTime: e.target.value }))} /></div>
                  <div><Label className="text-xs">Hora Check-out</Label><Input type="time" value={hotel.checkOutTime} onChange={e => setHotel(p => ({ ...p, checkOutTime: e.target.value }))} /></div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div><Label className="text-xs">Tipo de Quarto</Label><Input value={hotel.roomType || ''} onChange={e => setHotel(p => ({ ...p, roomType: e.target.value }))} placeholder="Deluxe Suite" /></div>
                <div><Label className="text-xs">Qtd. Quartos</Label><Input type="number" min="1" value={hotel.roomCount || 1} onChange={e => setHotel(p => ({ ...p, roomCount: parseInt(e.target.value) || 1 }))} /></div>
                <div><Label className="text-xs">Qtd. Hóspedes</Label><Input type="number" min="1" value={hotel.guestCount || 2} onChange={e => setHotel(p => ({ ...p, guestCount: parseInt(e.target.value) || 1 }))} /></div>
                <div><Label className="text-xs">Estrelas</Label><Input type="number" min="0" max="5" value={hotel.stars} onChange={e => setHotel(p => ({ ...p, stars: parseInt(e.target.value) || 0 }))} /></div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div><Label className="text-xs">Categoria</Label><Input value={hotel.category} onChange={e => setHotel(p => ({ ...p, category: e.target.value }))} placeholder="Resort, Boutique..." /></div>
                <div><Label className="text-xs">Cidade</Label><Input value={hotel.city} onChange={e => setHotel(p => ({ ...p, city: e.target.value }))} /></div>
                <div><Label className="text-xs">País</Label><Input value={hotel.country} onChange={e => setHotel(p => ({ ...p, country: e.target.value }))} /></div>
              </div>

              <div>
                <Label className="text-xs">Endereço</Label>
                <Input value={hotel.address} onChange={e => setHotel(p => ({ ...p, address: e.target.value }))} />
              </div>

              <div>
                <Label className="text-xs">Comodidades (separadas por vírgula)</Label>
                <Input value={hotel.amenities.join(', ')} onChange={e => setHotel(p => ({ ...p, amenities: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))} placeholder="Piscina, Spa, WiFi, Restaurante..." />
              </div>
              <div>
                <Label className="text-xs">Observações</Label>
                <Textarea value={hotel.observations || ''} onChange={e => setHotel(p => ({ ...p, observations: e.target.value }))} rows={2} placeholder="Observações sobre a hospedagem..." />
              </div>
            </div>
          )}
        </div>

        <Dialog open={!!previewImageUrl} onOpenChange={(v) => !v && setPreviewImageUrl(null)}>
          <DialogContent className="max-w-4xl p-2">
            {previewImageUrl && (
              <img src={previewImageUrl} alt="Foto da hospedagem ampliada" className="w-full max-h-[85vh] object-contain rounded" />
            )}
          </DialogContent>
        </Dialog>

        <TripAdvisorImageModal
          open={taImagesOpen}
          onClose={() => setTaImagesOpen(false)}
          initialQuery={
            hotel.hotelName
              ? [hotel.hotelName, hotel.city, hotel.country]
                  .filter(Boolean)
                  .join(' ')
                  .trim()
              : ''
          }
          onSelect={(img) => {
            const url = img.url_full || img.url_preview;
            if (!url) return;
            setHotelImages(prev => prev.includes(url) ? prev : [...prev, url]);
            setSelectedImages(prev => { const n = new Set(prev); n.add(url); return n; });
            toast.success('Imagem adicionada');
          }}
        />

        <Dialog open={libraryOpen} onOpenChange={setLibraryOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Banco de Imagens</DialogTitle>
            </DialogHeader>
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={libraryTypeFilter} onValueChange={(v) => { setLibraryTypeFilter(v); runLibrarySearch(undefined, v); }}>
                <SelectTrigger className="w-40"><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="cidade">Cidade</SelectItem>
                  <SelectItem value="hospedagem">Hospedagem</SelectItem>
                  <SelectItem value="servico">Serviço</SelectItem>
                  <SelectItem value="carro">Carro</SelectItem>
                  <SelectItem value="passeio">Passeio</SelectItem>
                  <SelectItem value="experiencia">Experiência</SelectItem>
                </SelectContent>
              </Select>
              <Input
                className="flex-1 min-w-[200px]"
                value={librarySearch}
                onChange={e => setLibrarySearch(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); runLibrarySearch(); } }}
                placeholder="Nome ou palavra-chave"
              />
              <Button onClick={() => runLibrarySearch()} disabled={libraryLoading} className="gap-1">
                <Search className="h-4 w-4"/>Buscar
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">Clique para selecionar várias imagens.</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-h-[55vh] overflow-y-auto">
              {libraryResults.length === 0 && !libraryLoading && (
                <p className="col-span-full text-sm text-muted-foreground text-center py-8">Nenhuma imagem encontrada</p>
              )}
              {libraryResults.map((img: any) => {
                const isSel = librarySelected.has(img.image_url);
                return (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => toggleLibrarySelected(img.image_url)}
                    className={`group relative rounded overflow-hidden border-2 text-left transition-all ${isSel ? 'border-primary ring-2 ring-primary/30' : 'border-transparent hover:border-primary/50'}`}
                  >
                    <img src={img.image_url} alt={img.product_name} className="h-32 w-full object-cover"/>
                    <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-1.5 py-0.5 truncate">{img.product_name}</span>
                    {isSel && (
                      <span className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center">
                        <Check className="h-3 w-3"/>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setLibraryOpen(false)}>Cancelar</Button>
              <Button onClick={addSelectedFromLibrary} disabled={librarySelected.size === 0}>
                Adicionar {librarySelected.size > 0 ? `(${librarySelected.size})` : ''}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave}>Salvar Detalhes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
