import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Search, Loader2, Plane, Hotel, Car, Shield, Star, Check, MapPin, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import HotelSearchAutocomplete, { HotelDetails } from '@/components/HotelSearchAutocomplete';
import { useCompany } from '@/contexts/CompanyContext';

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
  flightLegs?: FlightLeg[];
  baggage?: BaggageInfo;
  hotel?: HotelInfo;
  experience?: ExperienceInfo;
  detailedDescription?: string;
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
  onSave: (description: string, metadata: ServiceMetadata) => void;
  onHotelImagesFound?: (images: string[]) => void;
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

export default function ServiceEditModal({ open, onClose, description, metadata, onSave, onHotelImagesFound }: Props) {
  const { activeCompany } = useCompany();
  const [type, setType] = useState<ServiceMetadata['type']>(metadata.type || 'adicional');
  const [desc, setDesc] = useState(description);
  const [detailedDesc, setDetailedDesc] = useState(metadata.detailedDescription || '');
  const [flightLegs, setFlightLegs] = useState<FlightLeg[]>(metadata.flightLegs || []);
  const [baggage, setBaggage] = useState<BaggageInfo>(metadata.baggage || { personalItem: 1, carryOn: 1, checkedBag: 1 });
  const [hotel, setHotel] = useState<HotelInfo>(metadata.hotel || emptyHotel());
  const [searchingHotel, setSearchingHotel] = useState(false);
  const [hotelImages, setHotelImages] = useState<string[]>(metadata.hotel?.images || []);
  const [selectedImageIndices, setSelectedImageIndices] = useState<Set<number>>(new Set());
  const [googleApiKey, setGoogleApiKey] = useState('');
  const [experience, setExperience] = useState<ExperienceInfo>(metadata.experience || { startDate: '', endDate: '', freeDays: 0, aiTips: '' });
  const [generatingItinerary, setGeneratingItinerary] = useState(false);

  useEffect(() => {
    if (open) {
      setType(metadata.type || 'adicional');
      setDesc(description);
      setDetailedDesc(metadata.detailedDescription || '');
      setFlightLegs(metadata.flightLegs || []);
      setBaggage(metadata.baggage || { personalItem: 1, carryOn: 1, checkedBag: 1 });
      setHotel(metadata.hotel || emptyHotel());
      setHotelImages(metadata.hotel?.images || []);
      setSelectedImageIndices(new Set());
      setExperience(metadata.experience || { startDate: '', endDate: '', freeDays: 0 });
      loadGoogleApiKey();
    }
  }, [open]);

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

  const loadGoogleApiKey = async () => {
    let query = supabase.from('agency_settings').select('*');
    if (activeCompany) query = query.eq('empresa_id', activeCompany.id);
    const { data } = await query.limit(1).single();
    if (data && (data as any).google_maps_api_key) {
      setGoogleApiKey((data as any).google_maps_api_key);
    }
  };

  const addFlightLeg = () => setFlightLegs(prev => [...prev, emptyLeg()]);
  const updateLeg = (idx: number, field: keyof FlightLeg, value: string) => {
    setFlightLegs(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  };
  const removeLeg = (idx: number) => setFlightLegs(prev => prev.filter((_, i) => i !== idx));

  const toggleImageSelection = (idx: number) => {
    setSelectedImageIndices(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleGoogleHotelSelect = (details: HotelDetails) => {
    setHotel(prev => ({
      ...prev,
      hotelName: details.name,
      address: details.address,
      city: details.city,
      country: details.country,
      phone: details.phone,
      website: details.website,
      rating: details.rating,
      reviewsTotal: details.reviews_total,
      placeId: details.place_id,
      stars: Math.round(details.rating),
    }));
    setDesc(details.name);
    if (details.photos && details.photos.length > 0) {
      setHotelImages(details.photos);
      setSelectedImageIndices(new Set(details.photos.map((_, i) => i)));
    }
    toast.success(`Hotel "${details.name}" selecionado com ${details.photos?.length || 0} fotos!`);
  };

  // Fallback AI search
  const handleSearchHotelAI = async () => {
    if (!hotel.hotelName.trim()) { toast.error('Digite o nome do hotel'); return; }
    setSearchingHotel(true);
    setHotelImages([]);
    setSelectedImageIndices(new Set());
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
          setHotelImages(data.images);
          setSelectedImageIndices(new Set(data.images.map((_: string, i: number) => i)));
        }
        toast.success(`Informações do hotel e TripAdvisor encontradas!`);
      } else {
        toast.error('Não foi possível encontrar informações do hotel');
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
        body: { city: desc.trim(), totalDays, freeDays: experience.freeDays || 0 },
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
    const selectedImages = hotelImages.filter((_, i) => selectedImageIndices.has(i));
    const meta: ServiceMetadata = { type, detailedDescription: detailedDesc };
    if (type === 'aereo') {
      meta.flightLegs = flightLegs;
      meta.baggage = baggage;
      const outbound = flightLegs.filter(l => l.direction === 'ida');
      const returnL = flightLegs.filter(l => l.direction === 'volta');
      meta.totalTravelDurationOutbound = calcTotalTravelDuration(outbound.length > 0 ? outbound : flightLegs.filter(l => l.direction !== 'volta'));
      meta.totalTravelDurationReturn = calcTotalTravelDuration(returnL);
    }
    if (type === 'hotel') {
      meta.hotel = { ...hotel, images: selectedImages };
    }
    if (type === 'experiencia') {
      meta.experience = experience;
    }
    onSave(desc, meta);
    if (type === 'hotel' && selectedImages.length > 0 && onHotelImagesFound) {
      onHotelImagesFound(selectedImages);
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Detalhes do Serviço</DialogTitle>
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

          {/* Description */}
          <div>
            <Label>Descrição resumida {type === 'experiencia' && '(nome da cidade/destino)'}</Label>
            <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder={type === 'experiencia' ? "Ex: Paris, Roma, Nova York..." : "Título do serviço"} />
          </div>

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

          <div>
            <Label>Descrição detalhada (aparece na proposta)</Label>
            <Textarea value={detailedDesc} onChange={e => setDetailedDesc(e.target.value)} placeholder="Descrição completa para o cliente..." rows={type === 'experiencia' ? 10 : 3} />
          </div>

          {/* ── AÉREO ── */}
          {type === 'aereo' && (
            <div className="space-y-4 border-t pt-4">
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
                      <span className="text-xs text-muted-foreground">Trecho {idx + 1}</span>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => removeLeg(idx)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div><Label className="text-xs">Código do Voo</Label><Input value={leg.flightCode} onChange={e => updateLeg(idx, 'flightCode', e.target.value)} placeholder="LA1234" /></div>
                    <div><Label className="text-xs">Origem</Label><Input value={leg.origin} onChange={e => updateLeg(idx, 'origin', e.target.value)} placeholder="GRU" /></div>
                    <div><Label className="text-xs">Destino</Label><Input value={leg.destination} onChange={e => updateLeg(idx, 'destination', e.target.value)} placeholder="MIA" /></div>
                    <div><Label className="text-xs">Conexão (duração)</Label><Input value={leg.connectionDuration} onChange={e => updateLeg(idx, 'connectionDuration', e.target.value)} placeholder="2h30" /></div>
                    <div><Label className="text-xs">Data Partida</Label><Input type="date" value={leg.departureDate} onChange={e => updateLeg(idx, 'departureDate', e.target.value)} /></div>
                    <div><Label className="text-xs">Hora Partida</Label><Input type="time" value={leg.departureTime} onChange={e => updateLeg(idx, 'departureTime', e.target.value)} /></div>
                    <div><Label className="text-xs">Data Chegada</Label><Input type="date" value={leg.arrivalDate} onChange={e => updateLeg(idx, 'arrivalDate', e.target.value)} /></div>
                    <div><Label className="text-xs">Hora Chegada</Label><Input type="time" value={leg.arrivalTime} onChange={e => updateLeg(idx, 'arrivalTime', e.target.value)} /></div>
                  </div>
                </div>
              ))}

              {/* Total travel duration preview */}
              {flightLegs.length > 0 && (() => {
                const outbound = flightLegs.filter(l => l.direction === 'ida');
                const returnL = flightLegs.filter(l => l.direction === 'volta');
                const durOut = calcTotalTravelDuration(outbound.length > 0 ? outbound : flightLegs.filter(l => l.direction !== 'volta'));
                const durRet = calcTotalTravelDuration(returnL);
                return (durOut || durRet) ? (
                  <div className="border-t pt-3 flex flex-wrap gap-4 text-sm">
                    {durOut && <span className="text-muted-foreground">⏱ Tempo total IDA: <strong className="text-foreground">{durOut}</strong></span>}
                    {durRet && <span className="text-muted-foreground">⏱ Tempo total VOLTA: <strong className="text-foreground">{durRet}</strong></span>}
                  </div>
                ) : null;
              })()}

              {/* Baggage */}
              <div className="border-t pt-4">
                <h3 className="font-semibold text-sm mb-3">Bagagem</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div><Label className="text-xs">Item Pessoal</Label><Input type="number" min="0" value={baggage.personalItem} onChange={e => setBaggage(p => ({ ...p, personalItem: parseInt(e.target.value) || 0 }))} /></div>
                  <div><Label className="text-xs">Mão</Label><Input type="number" min="0" value={baggage.carryOn} onChange={e => setBaggage(p => ({ ...p, carryOn: parseInt(e.target.value) || 0 }))} /></div>
                  <div><Label className="text-xs">Despachada</Label><Input type="number" min="0" value={baggage.checkedBag} onChange={e => setBaggage(p => ({ ...p, checkedBag: parseInt(e.target.value) || 0 }))} /></div>
                </div>
              </div>
            </div>
          )}

          {/* ── HOTEL ── */}
          {type === 'hotel' && (
            <div className="space-y-4 border-t pt-4">
              {/* Google Places Search */}
              {googleApiKey ? (
                <HotelSearchAutocomplete
                  apiKey={googleApiKey}
                  onSelect={handleGoogleHotelSelect}
                  placeholder="Buscar hotel no Google Maps..."
                />
              ) : (
                <div className="p-3 bg-muted/50 rounded-md text-sm text-muted-foreground">
                  Configure sua Google Maps API Key em <strong>Configurações → Integrações</strong> para buscar hotéis automaticamente.
                </div>
              )}

              {/* Hotel name + AI search */}
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <Label>Nome do Hotel</Label>
                  <Input value={hotel.hotelName} onChange={e => setHotel(p => ({ ...p, hotelName: e.target.value }))} placeholder="Ex: Grand Hyatt Rio de Janeiro" />
                </div>
                <Button variant="outline" className="mt-6" onClick={handleSearchHotelAI} disabled={searchingHotel}>
                  {searchingHotel ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Search className="h-4 w-4 mr-1" />}
                  {searchingHotel ? 'Buscando...' : 'Buscar'}
                </Button>
              </div>

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
              {hotelImages.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">Fotos do Hotel ({selectedImageIndices.size} selecionadas)</Label>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => setSelectedImageIndices(new Set(hotelImages.map((_, i) => i)))}>
                        Selecionar todas
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setSelectedImageIndices(new Set())}>
                        Limpar
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    {hotelImages.map((img, idx) => (
                      <div
                        key={idx}
                        className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all aspect-video ${
                          selectedImageIndices.has(idx) ? 'border-primary ring-2 ring-primary/30' : 'border-transparent hover:border-muted-foreground/30'
                        }`}
                        onClick={() => toggleImageSelection(idx)}
                      >
                        <img src={img} alt={`Hotel ${idx + 1}`} className="w-full h-full object-cover" />
                        {selectedImageIndices.has(idx) && (
                          <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center">
                            <Check className="h-3 w-3" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reservation Details */}
              <div className="border-t pt-4">
                <h3 className="font-semibold text-sm mb-3">Dados da Reserva</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div><Label className="text-xs">Check-in</Label><Input type="date" value={hotel.checkInDate} onChange={e => setHotel(p => ({ ...p, checkInDate: e.target.value }))} /></div>
                  <div><Label className="text-xs">Check-out</Label><Input type="date" value={hotel.checkOutDate} onChange={e => setHotel(p => ({ ...p, checkOutDate: e.target.value }))} /></div>
                  <div><Label className="text-xs">Noites</Label><Input type="number" min="0" value={hotel.nightsCount || 0} readOnly className="bg-muted" /></div>
                  <div><Label className="text-xs">Hora Check-in</Label><Input type="time" value={hotel.checkInTime} onChange={e => setHotel(p => ({ ...p, checkInTime: e.target.value }))} /></div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div><Label className="text-xs">Tipo de Quarto</Label><Input value={hotel.roomType || ''} onChange={e => setHotel(p => ({ ...p, roomType: e.target.value }))} placeholder="Deluxe Suite" /></div>
                <div><Label className="text-xs">Qtd. Quartos</Label><Input type="number" min="1" value={hotel.roomCount || 1} onChange={e => setHotel(p => ({ ...p, roomCount: parseInt(e.target.value) || 1 }))} /></div>
                <div><Label className="text-xs">Qtd. Hóspedes</Label><Input type="number" min="1" value={hotel.guestCount || 2} onChange={e => setHotel(p => ({ ...p, guestCount: parseInt(e.target.value) || 1 }))} /></div>
                <div><Label className="text-xs">Valor/Noite (R$)</Label><Input type="number" min="0" step="0.01" value={hotel.pricePerNight || 0} onChange={e => {
                  const ppn = parseFloat(e.target.value) || 0;
                  setHotel(p => ({ ...p, pricePerNight: ppn, totalPrice: ppn * (p.nightsCount || 0) }));
                }} /></div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div><Label className="text-xs">Estrelas</Label><Input type="number" min="0" max="5" value={hotel.stars} onChange={e => setHotel(p => ({ ...p, stars: parseInt(e.target.value) || 0 }))} /></div>
                <div><Label className="text-xs">Categoria</Label><Input value={hotel.category} onChange={e => setHotel(p => ({ ...p, category: e.target.value }))} placeholder="Resort, Boutique..." /></div>
                <div><Label className="text-xs">Cidade</Label><Input value={hotel.city} onChange={e => setHotel(p => ({ ...p, city: e.target.value }))} /></div>
                <div><Label className="text-xs">País</Label><Input value={hotel.country} onChange={e => setHotel(p => ({ ...p, country: e.target.value }))} /></div>
              </div>

              <div>
                <Label className="text-xs">Endereço</Label>
                <Input value={hotel.address} onChange={e => setHotel(p => ({ ...p, address: e.target.value }))} />
              </div>

              <div>
                <Label className="text-xs">Descrição do Hotel</Label>
                <Textarea value={hotel.description} onChange={e => setHotel(p => ({ ...p, description: e.target.value }))} rows={3} placeholder="Descrição do hotel para a proposta..." />
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

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave}>Salvar Detalhes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
