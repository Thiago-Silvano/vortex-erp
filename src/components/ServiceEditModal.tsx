import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Search, Loader2, Plane, Hotel, Car, Shield, Star, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
}

export interface ServiceMetadata {
  type?: 'aereo' | 'hotel' | 'carro' | 'seguro' | 'experiencia' | 'adicional';
  flightLegs?: FlightLeg[];
  baggage?: BaggageInfo;
  hotel?: HotelInfo;
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
});

export default function ServiceEditModal({ open, onClose, description, metadata, onSave, onHotelImagesFound }: Props) {
  const [type, setType] = useState<ServiceMetadata['type']>(metadata.type || 'adicional');
  const [desc, setDesc] = useState(description);
  const [detailedDesc, setDetailedDesc] = useState(metadata.detailedDescription || '');
  const [flightLegs, setFlightLegs] = useState<FlightLeg[]>(metadata.flightLegs || []);
  const [baggage, setBaggage] = useState<BaggageInfo>(metadata.baggage || { personalItem: 1, carryOn: 1, checkedBag: 1 });
  const [hotel, setHotel] = useState<HotelInfo>(metadata.hotel || emptyHotel());
  const [searchingHotel, setSearchingHotel] = useState(false);
  const [hotelImages, setHotelImages] = useState<string[]>(metadata.hotel?.images || []);
  const [selectedImageIndices, setSelectedImageIndices] = useState<Set<number>>(new Set());

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
    }
  }, [open]);

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

  const handleSearchHotel = async () => {
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
        }));
        if (data.images && data.images.length > 0) {
          setHotelImages(data.images);
          // Auto-select all images
          setSelectedImageIndices(new Set(data.images.map((_: string, i: number) => i)));
        }
        toast.success(`Informações do hotel encontradas! ${data.images?.length || 0} imagens geradas.`);
      } else {
        toast.error('Não foi possível encontrar informações do hotel');
      }
    } catch (e: any) {
      toast.error(e.message || 'Erro ao buscar hotel');
    } finally {
      setSearchingHotel(false);
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
            <Label>Descrição resumida</Label>
            <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Título do serviço" />
          </div>
          <div>
            <Label>Descrição detalhada (aparece na proposta)</Label>
            <Textarea value={detailedDesc} onChange={e => setDetailedDesc(e.target.value)} placeholder="Descrição completa para o cliente..." rows={3} />
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
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <Label>Nome do Hotel</Label>
                  <Input value={hotel.hotelName} onChange={e => setHotel(p => ({ ...p, hotelName: e.target.value }))} placeholder="Ex: Grand Hyatt Rio de Janeiro" />
                </div>
                <Button variant="outline" className="mt-6" onClick={handleSearchHotel} disabled={searchingHotel}>
                  {searchingHotel ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Search className="h-4 w-4 mr-1" />}
                  {searchingHotel ? 'Buscando...' : 'Buscar'}
                </Button>
              </div>

              {searchingHotel && (
                <div className="p-4 bg-muted/50 rounded-lg text-center text-sm text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                  Buscando informações e gerando imagens do hotel...
                </div>
              )}

              {hotel.description && (
                <div className="p-3 bg-muted/50 rounded-lg text-sm">
                  <p className="font-medium mb-1">{hotel.hotelName} {hotel.stars > 0 && `${'⭐'.repeat(hotel.stars)}`}</p>
                  <p className="text-muted-foreground">{hotel.description}</p>
                  {hotel.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {hotel.amenities.map((a, i) => (
                        <span key={i} className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">{a}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Hotel Images Gallery */}
              {hotelImages.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">Imagens do Hotel ({selectedImageIndices.size} selecionadas)</Label>
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
                        className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                          selectedImageIndices.has(idx) ? 'border-primary ring-2 ring-primary/30' : 'border-transparent hover:border-muted-foreground/30'
                        }`}
                        onClick={() => toggleImageSelection(idx)}
                      >
                        <img src={img} alt={`Hotel ${idx + 1}`} className="w-full h-24 object-cover" />
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

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div><Label className="text-xs">Estrelas</Label><Input type="number" min="0" max="5" value={hotel.stars} onChange={e => setHotel(p => ({ ...p, stars: parseInt(e.target.value) || 0 }))} /></div>
                <div><Label className="text-xs">Categoria</Label><Input value={hotel.category} onChange={e => setHotel(p => ({ ...p, category: e.target.value }))} placeholder="Resort, Boutique..." /></div>
                <div><Label className="text-xs">Check-in</Label><Input type="date" value={hotel.checkInDate} onChange={e => setHotel(p => ({ ...p, checkInDate: e.target.value }))} /></div>
                <div><Label className="text-xs">Check-out</Label><Input type="date" value={hotel.checkOutDate} onChange={e => setHotel(p => ({ ...p, checkOutDate: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div><Label className="text-xs">Endereço</Label><Input value={hotel.address} onChange={e => setHotel(p => ({ ...p, address: e.target.value }))} /></div>
                <div><Label className="text-xs">Cidade</Label><Input value={hotel.city} onChange={e => setHotel(p => ({ ...p, city: e.target.value }))} /></div>
                <div><Label className="text-xs">País</Label><Input value={hotel.country} onChange={e => setHotel(p => ({ ...p, country: e.target.value }))} /></div>
                <div><Label className="text-xs">Hora Check-in</Label><Input type="time" value={hotel.checkInTime} onChange={e => setHotel(p => ({ ...p, checkInTime: e.target.value }))} /></div>
              </div>
              <div>
                <Label className="text-xs">Descrição do Hotel</Label>
                <Textarea value={hotel.description} onChange={e => setHotel(p => ({ ...p, description: e.target.value }))} rows={3} placeholder="Descrição do hotel para a proposta..." />
              </div>
              <div>
                <Label className="text-xs">Comodidades (separadas por vírgula)</Label>
                <Input value={hotel.amenities.join(', ')} onChange={e => setHotel(p => ({ ...p, amenities: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))} placeholder="Piscina, Spa, WiFi, Restaurante..." />
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
