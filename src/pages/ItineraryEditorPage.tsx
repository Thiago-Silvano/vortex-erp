import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  ArrowLeft, Plus, Trash2, ChevronDown, ChevronRight, MapPin, Sparkles,
  ImageIcon, GripVertical, Save, Eye, FileDown, ExternalLink, Copy,
} from 'lucide-react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import ItineraryPreview from '@/components/itinerary/ItineraryPreview';
import ChecklistEditor from '@/components/itinerary/ChecklistEditor';

interface Destination {
  id: string;
  name: string;
  image_url: string;
  sort_order: number;
}

interface Attraction {
  id: string;
  day_id: string;
  name: string;
  location: string;
  address: string;
  city: string;
  description: string;
  image_url: string;
  time: string;
  duration: string;
  observation: string;
  category: string;
  sort_order: number;
}

interface Day {
  id: string;
  destination_id: string | null;
  day_number: number;
  title: string;
  subtitle: string;
  description: string;
  notes: string;
  sort_order: number;
  attractions: Attraction[];
}

interface Itinerary {
  id: string;
  title: string;
  subtitle: string;
  client_name: string;
  travel_date: string;
  cover_image_url: string;
  status: string;
  short_id: string;
  token: string;
  thank_you_text: string;
  thank_you_image_url: string;
}

interface ChecklistItem {
  id: string;
  category: string;
  item: string;
  sort_order: number;
}

const CATEGORIES = [
  { value: 'attraction', label: 'Atração' },
  { value: 'experience', label: 'Experiência' },
  { value: 'tour', label: 'Passeio' },
  { value: 'gastronomy', label: 'Gastronomia' },
  { value: 'landmark', label: 'Ponto Turístico' },
  { value: 'recommendation', label: 'Recomendação' },
];

export default function ItineraryEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { activeCompany } = useCompany();
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [days, setDays] = useState<Day[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [selectedSection, setSelectedSection] = useState<string>('cover');

  // Load data
  useEffect(() => {
    if (!id) return;
    loadAll();
  }, [id]);

  const loadAll = async () => {
    if (!id) return;
    setLoading(true);

    const [itRes, destRes, daysRes, checkRes] = await Promise.all([
      supabase.from('itineraries').select('*').eq('id', id).single(),
      supabase.from('itinerary_destinations').select('*').eq('itinerary_id', id).order('sort_order'),
      supabase.from('itinerary_days').select('*').eq('itinerary_id', id).order('sort_order'),
      supabase.from('itinerary_checklist').select('*').eq('itinerary_id', id).order('sort_order'),
    ]);

    if (itRes.data) setItinerary(itRes.data as any);
    if (destRes.data) setDestinations(destRes.data as any[]);
    if (checkRes.data) setChecklist(checkRes.data as any[]);

    // Load attractions for each day
    if (daysRes.data) {
      const dayIds = (daysRes.data as any[]).map(d => d.id);
      let allAttractions: any[] = [];
      if (dayIds.length > 0) {
        const { data: attrData } = await supabase
          .from('itinerary_attractions')
          .select('*')
          .in('day_id', dayIds)
          .order('sort_order');
        allAttractions = attrData || [];
      }

      const daysWithAttr = (daysRes.data as any[]).map(d => ({
        ...d,
        attractions: allAttractions.filter(a => a.day_id === d.id),
      }));
      setDays(daysWithAttr);
    }

    setLoading(false);
  };

  // Auto-save
  const saveItinerary = useCallback(async () => {
    if (!itinerary || !id) return;
    setSaving(true);
    await supabase.from('itineraries').update({
      title: itinerary.title,
      subtitle: itinerary.subtitle,
      client_name: itinerary.client_name,
      travel_date: itinerary.travel_date,
      cover_image_url: itinerary.cover_image_url,
      thank_you_text: itinerary.thank_you_text,
      thank_you_image_url: itinerary.thank_you_image_url,
      updated_at: new Date().toISOString(),
    } as any).eq('id', id);
    setSaving(false);
    toast.success('Salvo!');
  }, [itinerary, id]);

  const updateItinerary = (field: keyof Itinerary, value: string) => {
    if (!itinerary) return;
    setItinerary({ ...itinerary, [field]: value });
  };

  // Destinations
  const addDestination = async () => {
    if (!id) return;
    const { data } = await supabase.from('itinerary_destinations').insert({
      itinerary_id: id,
      name: 'Novo Destino',
      sort_order: destinations.length,
    } as any).select().single();
    if (data) setDestinations([...destinations, data as any]);
  };

  const updateDestination = (idx: number, field: string, value: string) => {
    const updated = [...destinations];
    (updated[idx] as any)[field] = value;
    setDestinations(updated);
  };

  const saveDestination = async (dest: Destination) => {
    await supabase.from('itinerary_destinations').update({
      name: dest.name,
      image_url: dest.image_url,
    } as any).eq('id', dest.id);
  };

  const removeDestination = async (destId: string) => {
    await supabase.from('itinerary_destinations').delete().eq('id', destId);
    setDestinations(destinations.filter(d => d.id !== destId));
  };

  // Days
  const addDay = async () => {
    if (!id) return;
    const dayNum = days.length + 1;
    const { data } = await supabase.from('itinerary_days').insert({
      itinerary_id: id,
      day_number: dayNum,
      title: `Dia ${String(dayNum).padStart(2, '0')}`,
      sort_order: days.length,
    } as any).select().single();
    if (data) {
      const newDay = { ...(data as any), attractions: [] };
      setDays([...days, newDay]);
      setExpandedDays(prev => new Set([...prev, newDay.id]));
    }
  };

  const updateDay = (dayIdx: number, field: string, value: string) => {
    const updated = [...days];
    (updated[dayIdx] as any)[field] = value;
    setDays(updated);
  };

  const saveDay = async (day: Day) => {
    await supabase.from('itinerary_days').update({
      title: day.title,
      subtitle: day.subtitle,
      description: day.description,
      notes: day.notes,
      destination_id: day.destination_id,
    } as any).eq('id', day.id);
  };

  const removeDay = async (dayId: string) => {
    await supabase.from('itinerary_days').delete().eq('id', dayId);
    setDays(days.filter(d => d.id !== dayId));
  };

  // Attractions
  const addAttraction = async (dayId: string, dayIdx: number) => {
    const { data } = await supabase.from('itinerary_attractions').insert({
      day_id: dayId,
      name: '',
      sort_order: days[dayIdx].attractions.length,
    } as any).select().single();
    if (data) {
      const updated = [...days];
      updated[dayIdx].attractions.push(data as any);
      setDays(updated);
    }
  };

  const updateAttraction = (dayIdx: number, attrIdx: number, field: string, value: string) => {
    const updated = [...days];
    (updated[dayIdx].attractions[attrIdx] as any)[field] = value;
    setDays(updated);
  };

  const saveAttraction = async (attr: Attraction) => {
    await supabase.from('itinerary_attractions').update({
      name: attr.name,
      location: attr.location,
      address: attr.address,
      city: attr.city,
      description: attr.description,
      image_url: attr.image_url,
      time: attr.time,
      duration: attr.duration,
      observation: attr.observation,
      category: attr.category,
    } as any).eq('id', attr.id);
  };

  const removeAttraction = async (dayIdx: number, attrId: string) => {
    await supabase.from('itinerary_attractions').delete().eq('id', attrId);
    const updated = [...days];
    updated[dayIdx].attractions = updated[dayIdx].attractions.filter(a => a.id !== attrId);
    setDays(updated);
  };

  const generateDescription = async (dayIdx: number, attrIdx: number) => {
    const attr = days[dayIdx].attractions[attrIdx];
    if (!attr.name) { toast.error('Preencha o nome da atração primeiro'); return; }

    toast.info('Gerando descrição com IA...');
    try {
      const { data, error } = await supabase.functions.invoke('generate-itinerary', {
        body: {
          type: 'attraction_description',
          attractionName: attr.name,
          location: attr.location || attr.city,
        },
      });
      if (error) throw error;
      const text = data?.description || data?.text || '';
      if (text) {
        updateAttraction(dayIdx, attrIdx, 'description', text);
        toast.success('Descrição gerada!');
      }
    } catch {
      toast.error('Erro ao gerar descrição');
    }
  };

  const searchImage = async (dayIdx: number, attrIdx: number) => {
    const attr = days[dayIdx].attractions[attrIdx];
    if (!attr.name) { toast.error('Preencha o nome da atração primeiro'); return; }

    toast.info('Buscando imagem...');
    try {
      const { data, error } = await supabase.functions.invoke('google-places', {
        body: { query: `${attr.name} ${attr.location || attr.city}`.trim(), type: 'photo' },
      });
      if (error) throw error;
      const url = data?.photoUrl || data?.photo_url || '';
      if (url) {
        updateAttraction(dayIdx, attrIdx, 'image_url', url);
        toast.success('Imagem encontrada!');
      } else {
        toast.info('Nenhuma imagem encontrada');
      }
    } catch {
      toast.error('Erro ao buscar imagem');
    }
  };

  const toggleDay = (dayId: string) => {
    setExpandedDays(prev => {
      const next = new Set(prev);
      next.has(dayId) ? next.delete(dayId) : next.add(dayId);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Carregando roteiro...</p>
      </div>
    );
  }

  if (!itinerary) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Roteiro não encontrado</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top bar */}
      <div className="h-14 border-b bg-card flex items-center px-4 gap-3 shrink-0">
        <Button variant="ghost" size="sm" onClick={() => navigate('/itineraries')} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        <div className="h-6 w-px bg-border" />
        <span className="text-sm font-medium text-foreground truncate flex-1">{itinerary.title || 'Sem título'}</span>
        <div className="flex items-center gap-2">
          {saving && <span className="text-xs text-muted-foreground">Salvando...</span>}
          <Button size="sm" variant="outline" onClick={saveItinerary} className="gap-2">
            <Save className="h-3.5 w-3.5" /> Salvar
          </Button>
          <Button size="sm" variant="outline" onClick={() => {
            const url = `${window.location.origin}/roteiro/${itinerary.token}`;
            navigator.clipboard.writeText(url);
            toast.success('Link copiado!');
          }} className="gap-2">
            <ExternalLink className="h-3.5 w-3.5" /> Link
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 min-h-0">
        <ResizablePanelGroup direction="horizontal">
          {/* Editor Panel */}
          <ResizablePanel defaultSize={40} minSize={30}>
            <div className="h-full overflow-y-auto">
              {/* Navigation sidebar */}
              <div className="p-4 space-y-4">
                {/* Section selector */}
                <div className="space-y-1">
                  {['cover', 'destinations', 'days', 'checklist', 'thanks'].map(s => (
                    <button
                      key={s}
                      onClick={() => setSelectedSection(s)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                        selectedSection === s
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {{ cover: '📷 Capa', destinations: '📍 Destinos', days: '📅 Dias & Atrações', checklist: '✅ Checklist', thanks: '🙏 Agradecimento' }[s]}
                    </button>
                  ))}
                </div>

                <div className="h-px bg-border" />

                {/* Cover section */}
                {selectedSection === 'cover' && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-foreground">Capa do Roteiro</h3>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs">Título do Roteiro</Label>
                        <Input value={itinerary.title} onChange={e => updateItinerary('title', e.target.value)} onBlur={saveItinerary} placeholder="Ex: Roteiro Europa 2025" />
                      </div>
                      <div>
                        <Label className="text-xs">Subtítulo</Label>
                        <Input value={itinerary.subtitle} onChange={e => updateItinerary('subtitle', e.target.value)} onBlur={saveItinerary} placeholder="Ex: Uma jornada inesquecível" />
                      </div>
                      <div>
                        <Label className="text-xs">Nome do Cliente</Label>
                        <Input value={itinerary.client_name} onChange={e => updateItinerary('client_name', e.target.value)} onBlur={saveItinerary} />
                      </div>
                      <div>
                        <Label className="text-xs">Data da Viagem</Label>
                        <Input value={itinerary.travel_date} onChange={e => updateItinerary('travel_date', e.target.value)} onBlur={saveItinerary} placeholder="Ex: 15 a 30 de Julho 2025" />
                      </div>
                      <div>
                        <Label className="text-xs">Imagem de Capa (URL)</Label>
                        <Input value={itinerary.cover_image_url} onChange={e => updateItinerary('cover_image_url', e.target.value)} onBlur={saveItinerary} placeholder="URL da imagem" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Destinations section */}
                {selectedSection === 'destinations' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-foreground">Destinos</h3>
                      <Button size="sm" variant="outline" onClick={addDestination} className="gap-1.5 h-8">
                        <Plus className="h-3.5 w-3.5" /> Destino
                      </Button>
                    </div>
                    {destinations.map((dest, idx) => (
                      <div key={dest.id} className="p-3 border rounded-lg space-y-2 bg-muted/30">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-primary shrink-0" />
                          <Input
                            value={dest.name}
                            onChange={e => updateDestination(idx, 'name', e.target.value)}
                            onBlur={() => saveDestination(dest)}
                            placeholder="Nome do destino"
                            className="h-8"
                          />
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-destructive" onClick={() => removeDestination(dest.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {destinations.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">Adicione destinos ao seu roteiro</p>
                    )}
                  </div>
                )}

                {/* Days section */}
                {selectedSection === 'days' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-foreground">Dias & Atrações</h3>
                      <Button size="sm" variant="outline" onClick={addDay} className="gap-1.5 h-8">
                        <Plus className="h-3.5 w-3.5" /> Dia
                      </Button>
                    </div>
                    {days.map((day, dayIdx) => (
                      <div key={day.id} className="border rounded-lg overflow-hidden bg-card">
                        <button
                          className="w-full flex items-center gap-2 p-3 hover:bg-muted/50 transition-colors"
                          onClick={() => toggleDay(day.id)}
                        >
                          {expandedDays.has(day.id) ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                          <span className="text-sm font-medium">{day.title || `Dia ${day.day_number}`}</span>
                          <span className="text-xs text-muted-foreground ml-auto">{day.attractions.length} atração(ões)</span>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={e => { e.stopPropagation(); removeDay(day.id); }}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </button>

                        {expandedDays.has(day.id) && (
                          <div className="px-3 pb-3 space-y-3 border-t pt-3">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-xs">Título</Label>
                                <Input value={day.title} onChange={e => updateDay(dayIdx, 'title', e.target.value)} onBlur={() => saveDay(day)} className="h-8" />
                              </div>
                              <div>
                                <Label className="text-xs">Subtítulo</Label>
                                <Input value={day.subtitle} onChange={e => updateDay(dayIdx, 'subtitle', e.target.value)} onBlur={() => saveDay(day)} className="h-8" />
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs">Descrição</Label>
                              <Textarea value={day.description} onChange={e => updateDay(dayIdx, 'description', e.target.value)} onBlur={() => saveDay(day)} rows={2} className="text-sm" />
                            </div>

                            {/* Attractions */}
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs font-semibold">Atrações</Label>
                                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => addAttraction(day.id, dayIdx)}>
                                  <Plus className="h-3 w-3" /> Atração
                                </Button>
                              </div>
                              {day.attractions.map((attr, attrIdx) => (
                                <div key={attr.id} className="p-3 border rounded-md space-y-2 bg-background">
                                  <div className="flex items-center gap-2">
                                    <GripVertical className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                                    <Input
                                      value={attr.name}
                                      onChange={e => updateAttraction(dayIdx, attrIdx, 'name', e.target.value)}
                                      onBlur={() => saveAttraction(attr)}
                                      placeholder="Nome da atração"
                                      className="h-8 font-medium"
                                    />
                                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-destructive" onClick={() => removeAttraction(dayIdx, attr.id)}>
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <Label className="text-[10px]">Local</Label>
                                      <Input value={attr.location} onChange={e => updateAttraction(dayIdx, attrIdx, 'location', e.target.value)} onBlur={() => saveAttraction(attr)} className="h-7 text-xs" />
                                    </div>
                                    <div>
                                      <Label className="text-[10px]">Cidade</Label>
                                      <Input value={attr.city} onChange={e => updateAttraction(dayIdx, attrIdx, 'city', e.target.value)} onBlur={() => saveAttraction(attr)} className="h-7 text-xs" />
                                    </div>
                                  </div>
                                  <div>
                                    <Label className="text-[10px]">Categoria</Label>
                                    <Select value={attr.category} onValueChange={v => { updateAttraction(dayIdx, attrIdx, 'category', v); saveAttraction({ ...attr, category: v }); }}>
                                      <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <div className="flex items-center justify-between mb-1">
                                      <Label className="text-[10px]">Descrição</Label>
                                      <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1 text-primary" onClick={() => generateDescription(dayIdx, attrIdx)}>
                                        <Sparkles className="h-3 w-3" /> IA
                                      </Button>
                                    </div>
                                    <Textarea value={attr.description} onChange={e => updateAttraction(dayIdx, attrIdx, 'description', e.target.value)} onBlur={() => saveAttraction(attr)} rows={3} className="text-xs" />
                                  </div>
                                  <div>
                                    <div className="flex items-center justify-between mb-1">
                                      <Label className="text-[10px]">Imagem</Label>
                                      <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1 text-primary" onClick={() => searchImage(dayIdx, attrIdx)}>
                                        <ImageIcon className="h-3 w-3" /> Buscar
                                      </Button>
                                    </div>
                                    <Input value={attr.image_url} onChange={e => updateAttraction(dayIdx, attrIdx, 'image_url', e.target.value)} onBlur={() => saveAttraction(attr)} placeholder="URL da imagem" className="h-7 text-xs" />
                                    {attr.image_url && (
                                      <img src={attr.image_url} alt={attr.name} className="mt-2 h-20 w-full object-cover rounded" />
                                    )}
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <Label className="text-[10px]">Horário</Label>
                                      <Input value={attr.time} onChange={e => updateAttraction(dayIdx, attrIdx, 'time', e.target.value)} onBlur={() => saveAttraction(attr)} className="h-7 text-xs" placeholder="Ex: 09:00" />
                                    </div>
                                    <div>
                                      <Label className="text-[10px]">Duração</Label>
                                      <Input value={attr.duration} onChange={e => updateAttraction(dayIdx, attrIdx, 'duration', e.target.value)} onBlur={() => saveAttraction(attr)} className="h-7 text-xs" placeholder="Ex: 2h" />
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    {days.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">Adicione dias ao roteiro</p>
                    )}
                  </div>
                )}

                {/* Checklist section */}
                {selectedSection === 'checklist' && (
                  <ChecklistEditor
                    checklist={checklist}
                    setChecklist={setChecklist}
                    itineraryId={id!}
                  />
                )}

                {/* Thanks section */}
                {selectedSection === 'thanks' && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-foreground">Página de Agradecimento</h3>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs">Texto de Agradecimento</Label>
                        <Textarea
                          value={itinerary.thank_you_text}
                          onChange={e => updateItinerary('thank_you_text', e.target.value)}
                          onBlur={saveItinerary}
                          rows={4}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Imagem Institucional (URL)</Label>
                        <Input
                          value={itinerary.thank_you_image_url}
                          onChange={e => updateItinerary('thank_you_image_url', e.target.value)}
                          onBlur={saveItinerary}
                          placeholder="URL da imagem"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Preview Panel */}
          <ResizablePanel defaultSize={60} minSize={40}>
            <div className="h-full overflow-y-auto bg-muted/30 p-6">
              <div className="max-w-[800px] mx-auto">
                <ItineraryPreview
                  itinerary={itinerary}
                  destinations={destinations}
                  days={days}
                />
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
