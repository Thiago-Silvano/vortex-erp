import { useState, useRef, useEffect } from 'react';
import { ServiceItem, ServiceType, SERVICE_TYPE_CONFIG, FlightLeg } from '@/types/quote';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fileToBase64 } from '@/lib/storage';
import { Plus, X, ImagePlus, PlaneTakeoff, PlaneLanding } from 'lucide-react';
import AirportAutocomplete from '@/components/AirportAutocomplete';

interface Props {
  onAdd: (item: ServiceItem) => void;
  editItem?: ServiceItem;
  onCancel?: () => void;
  tripOrigin?: string;
  tripDestination?: string;
}

const emptyLeg = (direction: 'ida' | 'volta' = 'ida'): FlightLeg => ({
  origin: '', destination: '', departureDate: '', departureTime: '', arrivalDate: '', arrivalTime: '', direction,
});

const emptyItem = (): Omit<ServiceItem, 'id'> => ({
  type: 'aereo',
  title: '',
  description: '',
  supplier: '',
  startDate: '',
  endDate: '',
  location: '',
  value: 0,
  quantity: 1,
});

export default function ServiceItemForm({ onAdd, editItem, onCancel, tripOrigin, tripDestination }: Props) {
  const [item, setItem] = useState<Omit<ServiceItem, 'id'>>(
    editItem ? { ...editItem } : emptyItem()
  );
  const [flightLegs, setFlightLegs] = useState<FlightLeg[]>(
    editItem?.flightLegs?.length ? editItem.flightLegs : [emptyLeg('ida')]
  );
  const [imagePreview, setImagePreview] = useState<string | undefined>(editItem?.imageBase64);
  const [extraImages, setExtraImages] = useState<string[]>(editItem?.imagesBase64 || []);
  const extraImageInputRef = useRef<HTMLInputElement>(null);

  // Auto-fill title for aereo based on trip origin/destination
  useEffect(() => {
    if (item.type === 'aereo' && !editItem && tripOrigin && tripDestination && !item.title) {
      setItem(p => ({ ...p, title: `Voo ${tripOrigin} - ${tripDestination}` }));
    }
  }, [item.type, tripOrigin, tripDestination]);

  const isAereo = item.type === 'aereo';
  const isHotel = item.type === 'hotel';

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const base64 = await fileToBase64(file);
      setImagePreview(base64);
      setItem(prev => ({ ...prev, imageBase64: base64 }));
    }
  };

  const handleAddExtraImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = await fileToBase64(file);
    setExtraImages(prev => [...prev, base64]);
    if (extraImageInputRef.current) extraImageInputRef.current.value = '';
  };

  const removeExtraImage = (index: number) => {
    setExtraImages(prev => prev.filter((_, i) => i !== index));
  };

  const updateLeg = (index: number, field: keyof FlightLeg, value: string) => {
    setFlightLegs(prev => prev.map((leg, i) => i === index ? { ...leg, [field]: value } : leg));
  };

  const addLeg = (direction: 'ida' | 'volta') => {
    setFlightLegs(prev => [...prev, emptyLeg(direction)]);
  };

  const removeLeg = (index: number) => {
    if (flightLegs.length <= 1) return;
    setFlightLegs(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!item.title) return;
    onAdd({
      ...item,
      id: editItem?.id || crypto.randomUUID(),
      quantity: isAereo ? 1 : (isHotel ? 1 : item.quantity),
      imageBase64: imagePreview,
      imagesBase64: extraImages.length > 0 ? extraImages : undefined,
      flightLegs: isAereo ? flightLegs : undefined,
    });
    if (!editItem) {
      setItem(emptyItem());
      setImagePreview(undefined);
      setExtraImages([]);
      setFlightLegs([emptyLeg('ida')]);
    }
  };

  const idaLegs = flightLegs.filter(l => l.direction !== 'volta');
  const voltaLegs = flightLegs.filter(l => l.direction === 'volta');

  const renderLeg = (leg: FlightLeg, idx: number, globalIdx: number) => (
    <div key={globalIdx}>
      {globalIdx > 0 && flightLegs[globalIdx - 1]?.direction === leg.direction && (
        <div className="flex items-center gap-2 py-2 px-3 my-1 bg-accent/20 rounded-md border border-dashed border-accent/40">
          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">⏱️ Conexão:</span>
          <Input
            value={flightLegs[globalIdx - 1].connectionDuration || ''}
            onChange={e => updateLeg(globalIdx - 1, 'connectionDuration', e.target.value)}
            placeholder="Ex: 2h30"
            className="h-7 text-xs max-w-[120px]"
          />
        </div>
      )}
      <div className="p-3 rounded-md bg-muted/50 border space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground min-w-[24px]">
            {leg.direction === 'volta' ? '🔙' : '✈️'} Trecho {idx + 1} ({leg.direction === 'volta' ? 'Volta' : 'Ida'})
          </span>
          {flightLegs.length > 1 && (
            <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto" onClick={() => removeLeg(globalIdx)}>
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Origem</Label>
            <AirportAutocomplete
              value={leg.origin}
              onChange={v => updateLeg(globalIdx, 'origin', v)}
              placeholder="Aeroporto de origem..."
            />
          </div>
          <div>
            <Label className="text-xs">Destino</Label>
            <AirportAutocomplete
              value={leg.destination}
              onChange={v => updateLeg(globalIdx, 'destination', v)}
              placeholder="Aeroporto de destino..."
            />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <div>
            <Label className="text-xs">Data Partida</Label>
            <Input type="date" value={leg.departureDate} onChange={e => updateLeg(globalIdx, 'departureDate', e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Hora Partida</Label>
            <Input type="time" value={leg.departureTime} onChange={e => updateLeg(globalIdx, 'departureTime', e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Data Chegada</Label>
            <Input type="date" value={leg.arrivalDate} onChange={e => updateLeg(globalIdx, 'arrivalDate', e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Hora Chegada</Label>
            <Input type="time" value={leg.arrivalTime} onChange={e => updateLeg(globalIdx, 'arrivalTime', e.target.value)} />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Card className="border-dashed border-2 border-accent/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          {editItem ? 'Editar Serviço' : 'Adicionar Serviço'}
          {onCancel && (
            <Button variant="ghost" size="icon" onClick={onCancel}><X className="h-4 w-4" /></Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Tipo</Label>
            <Select value={item.type} onValueChange={(v) => setItem(p => ({ ...p, type: v as ServiceType }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(SERVICE_TYPE_CONFIG).map(([key, { label, icon }]) => (
                  <SelectItem key={key} value={key}>{icon} {label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{isHotel ? 'Nome do Hotel' : 'Título'}</Label>
            <Input value={item.title} onChange={e => setItem(p => ({ ...p, title: e.target.value }))} placeholder={isAereo ? "Ex: Voo São Paulo → Paris" : isHotel ? "Ex: Marriott Resort" : "Título do serviço"} />
          </div>
        </div>

        {/* Descrição - only for non-aéreo */}
        {!isAereo && (
          <div>
            <Label>Descrição</Label>
            <Textarea value={item.description} onChange={e => setItem(p => ({ ...p, description: e.target.value }))} placeholder="Detalhes do serviço..." rows={2} />
          </div>
        )}

        {/* Flight legs for aéreo */}
        {isAereo && (
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <PlaneTakeoff className="h-4 w-4" /> Trechos do Voo
            </Label>
            
            {/* Render all legs in order */}
            {flightLegs.map((leg, globalIdx) => {
              const sameDirectionBefore = flightLegs.slice(0, globalIdx).filter(l => l.direction === leg.direction);
              return renderLeg(leg, sameDirectionBefore.length, globalIdx);
            })}

            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" size="sm" onClick={() => addLeg('ida')} className="h-7 text-xs flex-1">
                <PlaneTakeoff className="h-3 w-3 mr-1" /> + Adicionar trecho ida
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => addLeg('volta')} className="h-7 text-xs flex-1">
                <PlaneLanding className="h-3 w-3 mr-1" /> + Adicionar trecho volta
              </Button>
            </div>
          </div>
        )}

        <div className={`grid ${isAereo ? 'grid-cols-2' : (isHotel ? 'grid-cols-2' : 'grid-cols-3')} gap-3`}>
          {/* Cia Aérea for aereo, hide supplier for hotel */}
          {isAereo && (
            <div>
              <Label>Cia Aérea</Label>
              <Input value={item.supplier} onChange={e => setItem(p => ({ ...p, supplier: e.target.value }))} placeholder="Ex: LATAM, GOL" />
            </div>
          )}
          {!isAereo && !isHotel && (
            <div>
              <Label>Fornecedor</Label>
              <Input value={item.supplier} onChange={e => setItem(p => ({ ...p, supplier: e.target.value }))} placeholder="Ex: Hotel Marriott" />
            </div>
          )}
          {isAereo ? (
            <div>
              <Label>Valor Total (R$)</Label>
              <Input type="number" min={0} step={0.01} value={item.value || ''} onChange={e => setItem(p => ({ ...p, value: parseFloat(e.target.value) || 0 }))} />
            </div>
          ) : (
            <>
              <div>
                <Label>Data Início</Label>
                <Input type="date" value={item.startDate} onChange={e => setItem(p => ({ ...p, startDate: e.target.value }))} />
              </div>
              <div>
                <Label>Data Fim</Label>
                <Input type="date" value={item.endDate} onChange={e => setItem(p => ({ ...p, endDate: e.target.value }))} />
              </div>
            </>
          )}
        </div>

        {!isAereo && (
          <div className={`grid ${isHotel ? 'grid-cols-2' : 'grid-cols-3'} gap-3`}>
            <div>
              <Label>{isHotel ? 'Endereço' : 'Local'}</Label>
              <Input value={item.location} onChange={e => setItem(p => ({ ...p, location: e.target.value }))} placeholder={isHotel ? "Ex: Rua Principal, 123" : "Ex: Paris, França"} />
            </div>
            <div>
              <Label>Valor (R$)</Label>
              <Input type="number" min={0} step={0.01} value={item.value || ''} onChange={e => setItem(p => ({ ...p, value: parseFloat(e.target.value) || 0 }))} />
            </div>
            {!isHotel && (
              <div>
                <Label>Quantidade</Label>
                <Input type="number" min={1} value={item.quantity} onChange={e => setItem(p => ({ ...p, quantity: parseInt(e.target.value) || 1 }))} />
              </div>
            )}
          </div>
        )}

        {/* Imagem principal */}
        <div>
          <Label>Imagem principal (opcional)</Label>
          <Input type="file" accept="image/*" onChange={handleImageUpload} />
          {imagePreview && (
            <div className="mt-2 relative inline-block">
              <img src={imagePreview} alt="Preview" className="h-20 rounded object-cover" />
              <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 h-5 w-5" onClick={() => { setImagePreview(undefined); setItem(p => ({ ...p, imageBase64: undefined })); }}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>

        {/* Imagens adicionais */}
        <div>
          <Label>Imagens adicionais</Label>
          <div className="mt-2 flex gap-2 flex-wrap items-center">
            {extraImages.map((img, idx) => (
              <div key={idx} className="relative inline-block">
                <img src={img} alt={`Extra ${idx + 1}`} className="h-16 w-16 rounded object-cover border" />
                <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 h-5 w-5" onClick={() => removeExtraImage(idx)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => extraImageInputRef.current?.click()}
              className="h-16 w-16 rounded border-2 border-dashed border-muted-foreground/40 flex items-center justify-center hover:border-accent hover:bg-accent/10 transition-colors cursor-pointer"
            >
              <ImagePlus className="h-5 w-5 text-muted-foreground" />
            </button>
            <input
              ref={extraImageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAddExtraImage}
            />
          </div>
        </div>

        <Button onClick={handleSubmit} className="w-full">
          <Plus className="h-4 w-4 mr-1" />
          {editItem ? 'Salvar Alterações' : 'Adicionar ao Orçamento'}
        </Button>
      </CardContent>
    </Card>
  );
}
