import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  ImageIcon, GripVertical, Save, Eye, FileDown, ExternalLink, Copy, Search, Loader2, Move,
  RefreshCw, Upload,
} from 'lucide-react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import ItineraryPreview from '@/components/itinerary/ItineraryPreview';
import ChecklistEditor from '@/components/itinerary/ChecklistEditor';
import ImageSearchModal, { type StockImage } from '@/components/ImageSearchModal';
import { generateItineraryPdf } from '@/lib/generateItineraryPdf';
import { getStaticMapUrl } from '@/components/itinerary/ItineraryMapSection';
import ImagePositionEditor, { type ImagePositionConfig, getImageStyle } from '@/components/ImagePositionEditor';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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
  image_position: ImagePositionConfig | null;
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
  thank_you_title: string;
  thank_you_text: string;
  thank_you_text_align: string;
  thank_you_image_url: string;
  thank_you_image_position: ImagePositionConfig | null;
  thank_you_font_color: string;
  thank_you_font_size: number;
  thank_you_font_style: string;
  thank_you_font_effect: string;
  thank_you_image_size: number;
  thank_you_title_font_color: string;
  thank_you_title_font_size: number;
  thank_you_title_font_style: string;
  thank_you_title_font_effect: string;
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

// ===== Sortable Day Item =====
function SortableDayItem({ day, dayIdx, children }: { day: Day; dayIdx: number; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: day.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style}>
      {React.Children.map(children, child =>
        React.isValidElement(child) ? React.cloneElement(child as any, { dragListeners: listeners, dragAttributes: attributes }) : child
      )}
    </div>
  );
}

// ===== Sortable Attraction Item =====
function SortableAttractionItem({ attr, children }: { attr: Attraction; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: attr.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style}>
      {React.Children.map(children, child =>
        React.isValidElement(child) ? React.cloneElement(child as any, { dragListeners: listeners, dragAttributes: attributes }) : child
      )}
    </div>
  );
}

export default function ItineraryEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { activeCompany } = useCompany();
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [days, setDays] = useState<Day[]>([]);
  const daysRef = useRef<Day[]>([]);
  // Keep ref in sync
  useEffect(() => { daysRef.current = days; }, [days]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [thankYouImageEditorOpen, setThankYouImageEditorOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState<string>('cover');
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState('');
  const [unsplashKey, setUnsplashKey] = useState('');
  const [pexelsKey, setPexelsKey] = useState('');
  const [coverImageModalOpen, setCoverImageModalOpen] = useState(false);
  const [attrImageModal, setAttrImageModal] = useState<{ dayIdx: number; attrIdx: number } | null>(null);
  const [destImageModal, setDestImageModal] = useState<number | null>(null);
  const [searchingCoverImage, setSearchingCoverImage] = useState(false);
  const [positionEditor, setPositionEditor] = useState<{ dayIdx: number; attrIdx: number } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Load data
  useEffect(() => {
    if (!id) return;
    loadAll();
  }, [id]);

  // Load API keys
  useEffect(() => {
    if (!activeCompany?.id) return;
    supabase.from('agency_settings').select('google_maps_api_key, unsplash_api_key, pexels_api_key').eq('empresa_id', activeCompany.id).single().then(({ data }) => {
      if (data) {
        setGoogleMapsApiKey((data as any).google_maps_api_key || '');
        setUnsplashKey((data as any).unsplash_api_key || '');
        setPexelsKey((data as any).pexels_api_key || '');
      }
    });
  }, [activeCompany]);

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

  const saveItinerary = useCallback(async () => {
    if (!itinerary || !id) return;
    setSaving(true);
    await supabase.from('itineraries').update({
      title: itinerary.title,
      subtitle: itinerary.subtitle,
      client_name: itinerary.client_name,
      travel_date: itinerary.travel_date,
      cover_image_url: itinerary.cover_image_url,
      thank_you_title: itinerary.thank_you_title,
      thank_you_text: itinerary.thank_you_text,
      thank_you_text_align: itinerary.thank_you_text_align,
      thank_you_image_url: itinerary.thank_you_image_url,
      thank_you_image_position: itinerary.thank_you_image_position,
      thank_you_font_color: itinerary.thank_you_font_color,
      thank_you_font_size: itinerary.thank_you_font_size,
      thank_you_font_style: itinerary.thank_you_font_style,
      thank_you_font_effect: itinerary.thank_you_font_effect,
      thank_you_image_size: itinerary.thank_you_image_size,
      thank_you_title_font_color: itinerary.thank_you_title_font_color,
      thank_you_title_font_size: itinerary.thank_you_title_font_size,
      thank_you_title_font_style: itinerary.thank_you_title_font_style,
      thank_you_title_font_effect: itinerary.thank_you_title_font_effect,
      updated_at: new Date().toISOString(),
    } as any).eq('id', id);
    setSaving(false);
    toast.success('Salvo!');
  }, [itinerary, id]);

  const updateItinerary = (field: keyof Itinerary, value: string | number) => {
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

  const uploadDestinationImage = async (idx: number, file: File) => {
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) { toast.error('Arquivo muito grande (máx 5MB)'); return; }
    if (!file.type.startsWith('image/')) { toast.error('Selecione um arquivo de imagem'); return; }
    const ext = file.name.split('.').pop();
    const path = `itinerary-destinations/${id}/${Date.now()}.${ext}`;
    toast.info('Enviando imagem...');
    const { error } = await supabase.storage.from('quote-images').upload(path, file);
    if (error) { toast.error('Erro ao enviar imagem'); return; }
    const { data: urlData } = supabase.storage.from('quote-images').getPublicUrl(path);
    updateDestination(idx, 'image_url', urlData.publicUrl);
    const dest = { ...destinations[idx], image_url: urlData.publicUrl };
    await saveDestination(dest);
    toast.success('Imagem enviada!');
  };

  const refreshDestinationImage = async (idx: number) => {
    const dest = destinations[idx];
    if (!dest.name) { toast.error('Preencha o nome do destino primeiro'); return; }
    toast.info('Buscando imagem...');
    try {
      if (unsplashKey || pexelsKey) {
        setDestImageModal(idx);
        return;
      }
      if (googleMapsApiKey) {
        const { data, error } = await supabase.functions.invoke('google-places', {
          body: { action: 'search_photos', query: dest.name, apiKey: googleMapsApiKey },
        });
        if (error) throw error;
        const photos = (data?.photos || []) as string[];
        const otherPhotos = photos.filter((p: string) => p !== dest.image_url);
        const chosen = otherPhotos.length > 0
          ? otherPhotos[Math.floor(Math.random() * otherPhotos.length)]
          : photos.length > 0 ? photos[Math.floor(Math.random() * photos.length)] : null;
        if (chosen) {
          updateDestination(idx, 'image_url', chosen);
          await saveDestination({ ...dest, image_url: chosen });
          toast.success('Imagem atualizada!');
        } else {
          toast.info('Nenhuma imagem encontrada');
        }
      } else {
        toast.error('Configure API Keys nas configurações da agência');
      }
    } catch {
      toast.error('Erro ao buscar imagem');
    }
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

  const duplicateDay = async (dayIdx: number) => {
    if (!id) return;
    const srcDay = days[dayIdx];
    const dayNum = days.length + 1;
    const { data: newDayData } = await supabase.from('itinerary_days').insert({
      itinerary_id: id,
      day_number: dayNum,
      title: `${srcDay.title} (cópia)`,
      subtitle: srcDay.subtitle,
      description: srcDay.description,
      notes: srcDay.notes,
      sort_order: days.length,
    } as any).select().single();
    if (!newDayData) return;

    const newAttrs: any[] = [];
    for (const attr of srcDay.attractions) {
      const { data: na } = await supabase.from('itinerary_attractions').insert({
        day_id: (newDayData as any).id,
        name: attr.name,
        location: attr.location,
        address: attr.address,
        city: attr.city,
        description: attr.description,
        image_url: attr.image_url,
        image_position: attr.image_position,
        time: attr.time,
        duration: attr.duration,
        observation: attr.observation,
        category: attr.category,
        sort_order: attr.sort_order,
      } as any).select().single();
      if (na) newAttrs.push(na);
    }

    setDays([...days, { ...(newDayData as any), attractions: newAttrs }]);
    toast.success('Dia duplicado!');
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

  const updateAttraction = (dayIdx: number, attrIdx: number, field: string, value: any) => {
    const updated = [...days];
    (updated[dayIdx].attractions[attrIdx] as any)[field] = value;
    setDays(updated);
  };

  const updateAndSaveAttraction = (dayIdx: number, attrIdx: number, fields: Record<string, any>) => {
    const updated = [...days];
    Object.entries(fields).forEach(([field, value]) => {
      (updated[dayIdx].attractions[attrIdx] as any)[field] = value;
    });
    setDays(updated);
    saveAttraction(updated[dayIdx].attractions[attrIdx]);
  };

  const saveAttraction = async (attr: Attraction) => {
    await supabase.from('itinerary_attractions').update({
      name: attr.name,
      location: attr.location,
      address: attr.address,
      city: attr.city,
      description: attr.description,
      image_url: attr.image_url,
      image_position: attr.image_position,
      time: attr.time,
      duration: attr.duration,
      observation: attr.observation,
      category: attr.category,
    } as any).eq('id', attr.id);
  };

  const saveAttractionByIndex = (dayIdx: number, attrIdx: number) => {
    const currentDays = daysRef.current;
    const attr = currentDays[dayIdx]?.attractions[attrIdx];
    if (attr) saveAttraction(attr);
  };

  const saveImagePosition = (config: ImagePositionConfig) => {
    if (!positionEditor) return;
    const { dayIdx, attrIdx } = positionEditor;
    const updated = [...days];
    updated[dayIdx].attractions[attrIdx].image_position = config;
    setDays(updated);
    saveAttraction(updated[dayIdx].attractions[attrIdx]);
    toast.success('Posição da imagem salva!');
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
        updateAndSaveAttraction(dayIdx, attrIdx, { description: text });
        toast.success('Descrição gerada!');
      }
    } catch {
      toast.error('Erro ao gerar descrição');
    }
  };

  const searchImage = async (dayIdx: number, attrIdx: number) => {
    const attr = days[dayIdx].attractions[attrIdx];
    if (!attr.name) { toast.error('Preencha o nome da atração primeiro'); return; }

    if (unsplashKey || pexelsKey) {
      setAttrImageModal({ dayIdx, attrIdx });
    } else if (googleMapsApiKey) {
      toast.info('Buscando imagem...');
      try {
        const { data, error } = await supabase.functions.invoke('google-places', {
          body: { action: 'search_photos', query: `${attr.name} ${attr.location || attr.city}`.trim(), apiKey: googleMapsApiKey },
        });
        if (error) throw error;
        const photos = data?.photos || [];
        if (photos.length > 0) {
          updateAndSaveAttraction(dayIdx, attrIdx, { image_url: photos[0], image_position: null });
          toast.success('Imagem encontrada!');
        } else {
          toast.info('Nenhuma imagem encontrada');
        }
      } catch {
        toast.error('Erro ao buscar imagem');
      }
    } else {
      toast.error('Configure API Keys nas configurações da agência');
    }
  };

  const refreshImage = async (dayIdx: number, attrIdx: number) => {
    const attr = days[dayIdx].attractions[attrIdx];
    if (!attr.name) { toast.error('Preencha o nome da atração primeiro'); return; }
    toast.info('Buscando outra imagem...');
    try {
      if (googleMapsApiKey) {
        const { data, error } = await supabase.functions.invoke('google-places', {
          body: { action: 'search_photos', query: `${attr.name} ${attr.location || attr.city}`.trim(), apiKey: googleMapsApiKey },
        });
        if (error) throw error;
        const photos = (data?.photos || []) as string[];
        const currentUrl = attr.image_url;
        const otherPhotos = photos.filter((p: string) => p !== currentUrl);
        if (otherPhotos.length > 0) {
          const randomPhoto = otherPhotos[Math.floor(Math.random() * otherPhotos.length)];
          updateAndSaveAttraction(dayIdx, attrIdx, { image_url: randomPhoto, image_position: null });
          toast.success('Nova imagem carregada!');
        } else if (photos.length > 0) {
          updateAndSaveAttraction(dayIdx, attrIdx, { image_url: photos[Math.floor(Math.random() * photos.length)], image_position: null });
          toast.success('Imagem atualizada!');
        } else {
          toast.info('Nenhuma imagem alternativa encontrada');
        }
      } else if (unsplashKey || pexelsKey) {
        setAttrImageModal({ dayIdx, attrIdx });
      } else {
        toast.error('Configure API Keys nas configurações da agência');
      }
    } catch {
      toast.error('Erro ao buscar imagem');
    }
  };

  const uploadAttractionImage = async (dayIdx: number, attrIdx: number, file: File) => {
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) { toast.error('Arquivo muito grande (máx 5MB)'); return; }
    if (!file.type.startsWith('image/')) { toast.error('Selecione um arquivo de imagem'); return; }
    const ext = file.name.split('.').pop();
    const path = `itinerary-attractions/${id}/${Date.now()}.${ext}`;
    toast.info('Enviando imagem...');
    const { error } = await supabase.storage.from('quote-images').upload(path, file);
    if (error) { toast.error('Erro ao enviar imagem'); return; }
    const { data: urlData } = supabase.storage.from('quote-images').getPublicUrl(path);
    updateAndSaveAttraction(dayIdx, attrIdx, { image_url: urlData.publicUrl, image_position: null });
    toast.success('Imagem enviada!');
  };

  const uploadCoverImage = async (file: File) => {
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) { toast.error('Arquivo muito grande (máx 5MB)'); return; }
    if (!file.type.startsWith('image/')) { toast.error('Selecione um arquivo de imagem'); return; }
    const ext = file.name.split('.').pop();
    const path = `itinerary-covers/${id}/${Date.now()}.${ext}`;
    toast.info('Enviando imagem...');
    const { error } = await supabase.storage.from('quote-images').upload(path, file);
    if (error) { toast.error('Erro ao enviar imagem'); return; }
    const { data: urlData } = supabase.storage.from('quote-images').getPublicUrl(path);
    if (itinerary) {
      setItinerary({ ...itinerary, cover_image_url: urlData.publicUrl });
      toast.success('Imagem de capa enviada!');
    }
  };

  const uploadThankYouImage = async (file: File) => {
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) { toast.error('Arquivo muito grande (máx 5MB)'); return; }
    if (!file.type.startsWith('image/')) { toast.error('Selecione um arquivo de imagem'); return; }
    const ext = file.name.split('.').pop();
    const path = `itinerary-thankyou/${id}/${Date.now()}.${ext}`;
    toast.info('Enviando imagem...');
    const { error } = await supabase.storage.from('quote-images').upload(path, file);
    if (error) { toast.error('Erro ao enviar imagem'); return; }
    const { data: urlData } = supabase.storage.from('quote-images').getPublicUrl(path);
    if (itinerary) {
      setItinerary({ ...itinerary, thank_you_image_url: urlData.publicUrl });
      toast.success('Imagem de agradecimento enviada!');
    }
  };

  const searchCoverImage = async () => {
    const query = destinations.map(d => d.name).filter(Boolean).join(' ') || itinerary?.title || '';
    if (!query) { toast.error('Adicione destinos ou título primeiro'); return; }

    if (unsplashKey || pexelsKey) {
      setCoverImageModalOpen(true);
    } else if (googleMapsApiKey) {
      setSearchingCoverImage(true);
      try {
        const { data, error } = await supabase.functions.invoke('google-places', {
          body: { action: 'search_photos', query, apiKey: googleMapsApiKey },
        });
        if (error) throw error;
        const photos = data?.photos || [];
        if (photos.length > 0 && itinerary) {
          setItinerary({ ...itinerary, cover_image_url: photos[0] });
          toast.success('Imagem de capa encontrada!');
        } else {
          toast.info('Nenhuma imagem encontrada');
        }
      } catch {
        toast.error('Erro ao buscar imagem');
      } finally {
        setSearchingCoverImage(false);
      }
    } else {
      toast.error('Configure API Keys nas configurações da agência');
    }
  };

  const toggleDay = (dayId: string) => {
    setExpandedDays(prev => {
      const next = new Set(prev);
      next.has(dayId) ? next.delete(dayId) : next.add(dayId);
      return next;
    });
  };

  // Drag & drop handlers
  const handleDayDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = days.findIndex(d => d.id === active.id);
    const newIndex = days.findIndex(d => d.id === over.id);
    const reordered = arrayMove(days, oldIndex, newIndex);
    setDays(reordered);

    // Save sort orders
    for (let i = 0; i < reordered.length; i++) {
      await supabase.from('itinerary_days').update({ sort_order: i } as any).eq('id', reordered[i].id);
    }
  };

  const handleAttractionDragEnd = async (event: DragEndEvent, dayIdx: number) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const attrs = days[dayIdx].attractions;
    const oldIndex = attrs.findIndex(a => a.id === active.id);
    const newIndex = attrs.findIndex(a => a.id === over.id);
    const reordered = arrayMove(attrs, oldIndex, newIndex);

    const updated = [...days];
    updated[dayIdx].attractions = reordered;
    setDays(updated);

    for (let i = 0; i < reordered.length; i++) {
      await supabase.from('itinerary_attractions').update({ sort_order: i } as any).eq('id', reordered[i].id);
    }
  };

  // PDF Export
  const exportPdf = async () => {
    if (!itinerary) return;
    setGeneratingPdf(true);
    toast.info('Gerando PDF...');
    try {
      const allAttractions = days.flatMap(d => d.attractions).filter(a => a.name);
      const mapUrl = googleMapsApiKey ? getStaticMapUrl(destinations, allAttractions, googleMapsApiKey) || undefined : undefined;
      const pdf = await generateItineraryPdf(itinerary, destinations, days, checklist, mapUrl);
      pdf.save(`${itinerary.title || 'roteiro'}.pdf`);
      toast.success('PDF gerado com sucesso!');
    } catch (e) {
      console.error('PDF error:', e);
      toast.error('Erro ao gerar PDF');
    } finally {
      setGeneratingPdf(false);
    }
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
          <Button size="sm" variant="outline" onClick={exportPdf} disabled={generatingPdf} className="gap-2">
            {generatingPdf ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />} PDF
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
                        <div className="flex items-center justify-between mb-1">
                          <Label className="text-xs">Imagem de Capa</Label>
                          <div className="flex items-center gap-1">
                            <label className="cursor-pointer">
                              <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1 text-primary" asChild>
                                <span><Upload className="h-3 w-3" /> Upload</span>
                              </Button>
                              <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { uploadCoverImage(f); e.target.value = ''; } }} />
                            </label>
                            <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1 text-primary" onClick={searchCoverImage} disabled={searchingCoverImage}>
                              {searchingCoverImage ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />} Buscar
                            </Button>
                          </div>
                        </div>
                        <Input value={itinerary.cover_image_url} onChange={e => updateItinerary('cover_image_url', e.target.value)} onBlur={saveItinerary} placeholder="URL da imagem" />
                        {itinerary.cover_image_url && (
                          <img src={itinerary.cover_image_url} alt="Cover" className="mt-2 h-24 w-full object-cover rounded-lg" />
                        )}
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
                        {/* Destination image */}
                        {dest.image_url ? (
                          <div className="relative group">
                            <img src={dest.image_url} alt={dest.name} className="w-full h-24 object-cover rounded-md" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-md flex items-center justify-center gap-1">
                              <label className="cursor-pointer">
                                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-white" asChild>
                                  <span><Upload className="h-3 w-3" /></span>
                                </Button>
                                <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { uploadDestinationImage(idx, f); e.target.value = ''; } }} />
                              </label>
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-white" onClick={() => refreshDestinationImage(idx)} title="Buscar outra imagem">
                                <RefreshCw className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <label className="cursor-pointer flex-1">
                              <Button size="sm" variant="outline" className="w-full h-7 text-xs gap-1" asChild>
                                <span><Upload className="h-3 w-3" /> Upload</span>
                              </Button>
                              <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { uploadDestinationImage(idx, f); e.target.value = ''; } }} />
                            </label>
                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => refreshDestinationImage(idx)}>
                              <Search className="h-3 w-3" /> Buscar
                            </Button>
                          </div>
                        )}
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
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDayDragEnd}>
                      <SortableContext items={days.map(d => d.id)} strategy={verticalListSortingStrategy}>
                        {days.map((day, dayIdx) => (
                          <SortableDayItem key={day.id} day={day} dayIdx={dayIdx}>
                            <DayEditorBlock
                              day={day}
                              dayIdx={dayIdx}
                              expanded={expandedDays.has(day.id)}
                              onToggle={() => toggleDay(day.id)}
                              onRemove={() => removeDay(day.id)}
                              onDuplicate={() => duplicateDay(dayIdx)}
                              onUpdateDay={updateDay}
                              onSaveDay={saveDay}
                              onAddAttraction={addAttraction}
                              onUpdateAttraction={updateAttraction}
                              onSaveAttraction={saveAttractionByIndex}
                              onRemoveAttraction={removeAttraction}
                              onGenerateDescription={generateDescription}
                              onSearchImage={searchImage}
                              onRefreshImage={refreshImage}
                              onUploadImage={uploadAttractionImage}
                              onPositionEdit={(dI: number, aI: number) => setPositionEditor({ dayIdx: dI, attrIdx: aI })}
                              sensors={sensors}
                              onAttractionDragEnd={(e) => handleAttractionDragEnd(e, dayIdx)}
                            />
                          </SortableDayItem>
                        ))}
                      </SortableContext>
                    </DndContext>
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
                      {/* Title */}
                      <div>
                        <Label className="text-xs">Título</Label>
                        <Input
                          value={itinerary.thank_you_title || 'Obrigado'}
                          onChange={e => updateItinerary('thank_you_title', e.target.value)}
                          onBlur={saveItinerary}
                          placeholder="Título do agradecimento"
                        />
                      </div>

                      {/* Title font customization */}
                      <div className="border border-border rounded-lg p-3 space-y-3 bg-muted/30">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fonte do Título</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">Cor</Label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={itinerary.thank_you_title_font_color || '#d97706'}
                                onChange={e => updateItinerary('thank_you_title_font_color', e.target.value)}
                                onBlur={saveItinerary}
                                className="h-8 w-10 rounded border border-border cursor-pointer"
                              />
                              <Input
                                value={itinerary.thank_you_title_font_color || '#d97706'}
                                onChange={e => updateItinerary('thank_you_title_font_color', e.target.value)}
                                onBlur={saveItinerary}
                                className="h-8 text-xs"
                              />
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs">Tamanho ({itinerary.thank_you_title_font_size || 12}px)</Label>
                            <input
                              type="range"
                              min={10}
                              max={48}
                              value={itinerary.thank_you_title_font_size || 12}
                              onChange={e => updateItinerary('thank_you_title_font_size', Number(e.target.value))}
                              onMouseUp={saveItinerary}
                              onTouchEnd={saveItinerary}
                              className="w-full mt-1"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">Estilo</Label>
                            <Select
                              value={itinerary.thank_you_title_font_style || 'bold'}
                              onValueChange={v => { updateItinerary('thank_you_title_font_style', v); setTimeout(saveItinerary, 100); }}
                            >
                              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="normal">Normal</SelectItem>
                                <SelectItem value="bold">Negrito</SelectItem>
                                <SelectItem value="italic">Itálico</SelectItem>
                                <SelectItem value="bold-italic">Negrito Itálico</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs">Efeito</Label>
                            <Select
                              value={itinerary.thank_you_title_font_effect || 'spaced'}
                              onValueChange={v => { updateItinerary('thank_you_title_font_effect', v); setTimeout(saveItinerary, 100); }}
                            >
                              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Nenhum</SelectItem>
                                <SelectItem value="shadow">Sombra</SelectItem>
                                <SelectItem value="glow">Brilho</SelectItem>
                                <SelectItem value="spaced">Espaçado</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      {/* Text */}
                      <div>
                        <Label className="text-xs">Texto de Agradecimento</Label>
                        <Textarea
                          value={itinerary.thank_you_text}
                          onChange={e => updateItinerary('thank_you_text', e.target.value)}
                          onBlur={saveItinerary}
                          rows={4}
                        />
                      </div>

                      {/* Font customization */}
                      <div className="border border-border rounded-lg p-3 space-y-3 bg-muted/30">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fonte do Texto</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">Cor</Label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={itinerary.thank_you_font_color || '#374151'}
                                onChange={e => updateItinerary('thank_you_font_color', e.target.value)}
                                onBlur={saveItinerary}
                                className="h-8 w-10 rounded border border-border cursor-pointer"
                              />
                              <Input
                                value={itinerary.thank_you_font_color || '#374151'}
                                onChange={e => updateItinerary('thank_you_font_color', e.target.value)}
                                onBlur={saveItinerary}
                                className="h-8 text-xs"
                              />
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs">Tamanho ({itinerary.thank_you_font_size || 16}px)</Label>
                            <input
                              type="range"
                              min={10}
                              max={36}
                              value={itinerary.thank_you_font_size || 16}
                              onChange={e => updateItinerary('thank_you_font_size', Number(e.target.value))}
                              onMouseUp={saveItinerary}
                              onTouchEnd={saveItinerary}
                              className="w-full mt-1"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <Label className="text-xs">Estilo</Label>
                            <Select
                              value={itinerary.thank_you_font_style || 'normal'}
                              onValueChange={v => { updateItinerary('thank_you_font_style', v); setTimeout(saveItinerary, 100); }}
                            >
                              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="normal">Normal</SelectItem>
                                <SelectItem value="bold">Negrito</SelectItem>
                                <SelectItem value="italic">Itálico</SelectItem>
                                <SelectItem value="bold-italic">Negrito Itálico</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs">Efeito</Label>
                            <Select
                              value={itinerary.thank_you_font_effect || 'none'}
                              onValueChange={v => { updateItinerary('thank_you_font_effect', v); setTimeout(saveItinerary, 100); }}
                            >
                              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Nenhum</SelectItem>
                                <SelectItem value="shadow">Sombra</SelectItem>
                                <SelectItem value="glow">Brilho</SelectItem>
                                <SelectItem value="spaced">Espaçado</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs">Alinhamento</Label>
                            <Select
                              value={itinerary.thank_you_text_align || 'center'}
                              onValueChange={v => { updateItinerary('thank_you_text_align', v); setTimeout(saveItinerary, 100); }}
                            >
                              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="left">Esquerda</SelectItem>
                                <SelectItem value="center">Centro</SelectItem>
                                <SelectItem value="right">Direita</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      {/* Image */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <Label className="text-xs">Imagem Institucional</Label>
                          <div className="flex items-center gap-1">
                            {itinerary.thank_you_image_url && (
                              <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1 text-primary"
                                onClick={() => setThankYouImageEditorOpen(true)}>
                                <Move className="h-3 w-3" /> Posição
                              </Button>
                            )}
                            <label>
                              <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1 text-primary" asChild>
                                <span><Upload className="h-3 w-3" /> Upload</span>
                              </Button>
                              <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { uploadThankYouImage(f); e.target.value = ''; } }} />
                            </label>
                          </div>
                        </div>
                        <Input
                          value={itinerary.thank_you_image_url}
                          onChange={e => updateItinerary('thank_you_image_url', e.target.value)}
                          onBlur={saveItinerary}
                          placeholder="URL da imagem"
                        />
                      </div>

                      {/* Image size slider */}
                      {itinerary.thank_you_image_url && (
                        <div>
                          <Label className="text-xs">Tamanho da Imagem ({itinerary.thank_you_image_size || 100}%)</Label>
                          <input
                            type="range"
                            min={20}
                            max={100}
                            value={itinerary.thank_you_image_size || 100}
                            onChange={e => updateItinerary('thank_you_image_size', Number(e.target.value))}
                            onMouseUp={saveItinerary}
                            onTouchEnd={saveItinerary}
                            className="w-full mt-1"
                          />
                        </div>
                      )}
                    </div>

                    {/* Image Position Editor for thank you */}
                    {itinerary.thank_you_image_url && (
                      <ImagePositionEditor
                        open={thankYouImageEditorOpen}
                        onOpenChange={setThankYouImageEditorOpen}
                        imageUrl={itinerary.thank_you_image_url}
                        initialConfig={itinerary.thank_you_image_position}
                        onSave={(config) => {
                          updateItinerary('thank_you_image_position', config as any);
                          setTimeout(saveItinerary, 100);
                        }}
                      />
                    )}
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
                  checklist={checklist}
                  googleMapsApiKey={googleMapsApiKey}
                  interactive={true}
                />
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Cover image search modal */}
      {coverImageModalOpen && (
        <ImageSearchModal
          open={coverImageModalOpen}
          onClose={() => setCoverImageModalOpen(false)}
          onSelect={(img: StockImage) => {
            if (itinerary) {
              setItinerary({ ...itinerary, cover_image_url: img.url_full || img.url_download });
              setCoverImageModalOpen(false);
              toast.success('Imagem de capa selecionada!');
            }
          }}
          initialQuery={destinations.map(d => d.name).filter(Boolean).join(' ') || itinerary?.title || ''}
          unsplashKey={unsplashKey}
          pexelsKey={pexelsKey}
        />
      )}

      {/* Attraction image search modal */}
      {attrImageModal && (
        <ImageSearchModal
          open={!!attrImageModal}
          onClose={() => setAttrImageModal(null)}
          onSelect={(img: StockImage) => {
            if (attrImageModal) {
              updateAndSaveAttraction(attrImageModal.dayIdx, attrImageModal.attrIdx, { image_url: img.url_full || img.url_download, image_position: null });
              setAttrImageModal(null);
              toast.success('Imagem selecionada!');
            }
          }}
          initialQuery={attrImageModal ? `${days[attrImageModal.dayIdx]?.attractions[attrImageModal.attrIdx]?.name || ''} ${days[attrImageModal.dayIdx]?.attractions[attrImageModal.attrIdx]?.city || ''}`.trim() : ''}
          unsplashKey={unsplashKey}
          pexelsKey={pexelsKey}
        />
      )}

      {/* Destination image search modal */}
      {destImageModal !== null && (
        <ImageSearchModal
          open={destImageModal !== null}
          onClose={() => setDestImageModal(null)}
          onSelect={(img: StockImage) => {
            if (destImageModal !== null) {
              const url = img.url_full || img.url_download;
              updateDestination(destImageModal, 'image_url', url);
              saveDestination({ ...destinations[destImageModal], image_url: url });
              setDestImageModal(null);
              toast.success('Imagem selecionada!');
            }
          }}
          initialQuery={destImageModal !== null ? destinations[destImageModal]?.name || '' : ''}
          unsplashKey={unsplashKey}
          pexelsKey={pexelsKey}
        />
      )}

      {/* Image Position Editor */}
      {positionEditor && days[positionEditor.dayIdx]?.attractions[positionEditor.attrIdx]?.image_url && (
        <ImagePositionEditor
          open={!!positionEditor}
          onOpenChange={(open) => { if (!open) setPositionEditor(null); }}
          imageUrl={days[positionEditor.dayIdx].attractions[positionEditor.attrIdx].image_url}
          initialConfig={days[positionEditor.dayIdx].attractions[positionEditor.attrIdx].image_position}
          onSave={saveImagePosition}
        />
      )}
    </div>
  );
}

// ===== Day Editor Block (extracted for sortable) =====
function DayEditorBlock({
  day, dayIdx, expanded, onToggle, onRemove, onDuplicate,
  onUpdateDay, onSaveDay, onAddAttraction, onUpdateAttraction,
  onSaveAttraction, onRemoveAttraction, onGenerateDescription, onSearchImage, onRefreshImage, onUploadImage, onPositionEdit,
  sensors, onAttractionDragEnd,
  dragListeners, dragAttributes,
}: any) {
  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      <button
        className="w-full flex items-center gap-2 p-3 hover:bg-muted/50 transition-colors"
        onClick={onToggle}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground/50 cursor-grab shrink-0" {...(dragListeners || {})} {...(dragAttributes || {})} onClick={(e: any) => e.stopPropagation()} />
        {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        <span className="text-sm font-medium">{day.title || `Dia ${day.day_number}`}</span>
        <span className="text-xs text-muted-foreground ml-auto mr-2">{day.attractions.length} atração(ões)</span>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={(e: any) => { e.stopPropagation(); onDuplicate(); }} title="Duplicar dia">
          <Copy className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e: any) => { e.stopPropagation(); onRemove(); }}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t pt-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Título</Label>
              <Input value={day.title} onChange={(e: any) => onUpdateDay(dayIdx, 'title', e.target.value)} onBlur={() => onSaveDay(day)} className="h-8" />
            </div>
            <div>
              <Label className="text-xs">Subtítulo</Label>
              <Input value={day.subtitle} onChange={(e: any) => onUpdateDay(dayIdx, 'subtitle', e.target.value)} onBlur={() => onSaveDay(day)} className="h-8" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Descrição</Label>
            <Textarea value={day.description} onChange={(e: any) => onUpdateDay(dayIdx, 'description', e.target.value)} onBlur={() => onSaveDay(day)} rows={2} className="text-sm" />
          </div>

          {/* Attractions with drag & drop */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Atrações</Label>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => onAddAttraction(day.id, dayIdx)}>
                <Plus className="h-3 w-3" /> Atração
              </Button>
            </div>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onAttractionDragEnd}>
              <SortableContext items={day.attractions.map((a: any) => a.id)} strategy={verticalListSortingStrategy}>
                {day.attractions.map((attr: any, attrIdx: number) => (
                  <SortableAttractionItem key={attr.id} attr={attr}>
                    <AttractionEditorBlock
                      attr={attr}
                      dayIdx={dayIdx}
                      attrIdx={attrIdx}
                      onUpdate={onUpdateAttraction}
                      onSave={onSaveAttraction}
                      onRemove={onRemoveAttraction}
                      onGenerateDescription={onGenerateDescription}
                      onSearchImage={onSearchImage}
                      onRefreshImage={onRefreshImage}
                      onUploadImage={onUploadImage}
                      onPositionEdit={onPositionEdit}
                    />
                  </SortableAttractionItem>
                ))}
              </SortableContext>
            </DndContext>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== Attraction Editor Block =====
function AttractionEditorBlock({
  attr, dayIdx, attrIdx, onUpdate, onSave, onRemove, onGenerateDescription, onSearchImage, onRefreshImage, onUploadImage, onPositionEdit,
  dragListeners, dragAttributes,
}: any) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const save = () => onSave(dayIdx, attrIdx);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadImage(dayIdx, attrIdx, file);
      e.target.value = '';
    }
  };

  return (
    <div className="p-3 border rounded-md space-y-2 bg-background">
      <div className="flex items-center gap-2">
        <GripVertical className="h-4 w-4 text-muted-foreground/50 cursor-grab shrink-0" {...(dragListeners || {})} {...(dragAttributes || {})} />
        <Input
          value={attr.name}
          onChange={(e: any) => onUpdate(dayIdx, attrIdx, 'name', e.target.value)}
          onBlur={save}
          placeholder="Nome da atração"
          className="h-8 font-medium"
        />
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-destructive" onClick={() => onRemove(dayIdx, attr.id)}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px]">Local</Label>
          <Input value={attr.location} onChange={(e: any) => onUpdate(dayIdx, attrIdx, 'location', e.target.value)} onBlur={save} className="h-7 text-xs" />
        </div>
        <div>
          <Label className="text-[10px]">Cidade</Label>
          <Input value={attr.city} onChange={(e: any) => onUpdate(dayIdx, attrIdx, 'city', e.target.value)} onBlur={save} className="h-7 text-xs" />
        </div>
      </div>
      <div>
        <Label className="text-[10px]">Categoria</Label>
        <Select value={attr.category} onValueChange={(v: any) => { onUpdate(dayIdx, attrIdx, 'category', v); setTimeout(() => onSave(dayIdx, attrIdx), 50); }}>
          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <Label className="text-[10px]">Descrição</Label>
          <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1 text-primary" onClick={() => onGenerateDescription(dayIdx, attrIdx)}>
            <Sparkles className="h-3 w-3" /> IA
          </Button>
        </div>
        <Textarea value={attr.description} onChange={(e: any) => onUpdate(dayIdx, attrIdx, 'description', e.target.value)} onBlur={save} rows={3} className="text-xs" />
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <Label className="text-[10px]">Imagem</Label>
          <div className="flex gap-1">
            {attr.image_url && (
              <>
                <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1 text-muted-foreground" onClick={() => onPositionEdit(dayIdx, attrIdx)} title="Ajustar posição">
                  <Move className="h-3 w-3" /> Posicionar
                </Button>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground" onClick={() => onRefreshImage(dayIdx, attrIdx)} title="Buscar outra imagem">
                  <RefreshCw className="h-3 w-3" />
                </Button>
              </>
            )}
            <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1 text-primary" onClick={() => onSearchImage(dayIdx, attrIdx)}>
              <ImageIcon className="h-3 w-3" /> Buscar
            </Button>
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-primary" onClick={() => fileInputRef.current?.click()} title="Enviar imagem manualmente">
              <Upload className="h-3 w-3" />
            </Button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>
        </div>
        <Input value={attr.image_url} onChange={(e: any) => onUpdate(dayIdx, attrIdx, 'image_url', e.target.value)} onBlur={save} placeholder="URL da imagem" className="h-7 text-xs" />
        {attr.image_url && (
          <div
            className="mt-2 h-20 w-full overflow-hidden rounded cursor-pointer relative group"
            onClick={() => onPositionEdit(dayIdx, attrIdx)}
            title="Clique para ajustar posição da imagem"
          >
            <img src={attr.image_url} alt={attr.name} className="w-full h-full pointer-events-none" style={getImageStyle(attr.image_position)} />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
              <Move className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px]">Horário</Label>
          <Input value={attr.time} onChange={(e: any) => onUpdate(dayIdx, attrIdx, 'time', e.target.value)} onBlur={save} className="h-7 text-xs" placeholder="Ex: 09:00" />
        </div>
        <div>
          <Label className="text-[10px]">Duração</Label>
          <Input value={attr.duration} onChange={(e: any) => onUpdate(dayIdx, attrIdx, 'duration', e.target.value)} onBlur={save} className="h-7 text-xs" placeholder="Ex: 2h" />
        </div>
      </div>
    </div>
  );
}
