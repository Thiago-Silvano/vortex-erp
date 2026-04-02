import { useState, useRef, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { toPng } from 'html-to-image';
import {
  Download, Image as ImageIcon, Type, Palette, Eye,
  AlignLeft, AlignCenter, AlignRight, Bold, Italic, Underline,
  Square, RectangleVertical, Plus, Trash2, Circle,
  ChevronUp, ChevronDown, Copy, Lock, Unlock, Save,
  Minus, Plane, Building2, Bus, Ticket, ShieldPlus, Sticker,
  AlignHorizontalDistributeCenter, AlignVerticalDistributeCenter,
  Camera, Undo2, Redo2, Compass, MessageCircle,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

// ─── Types ───
interface TextElement {
  id: string;
  type: 'text';
  content: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
  fontStyle: 'normal' | 'italic';
  textDecoration: 'none' | 'underline';
  color: string;
  textAlign: 'left' | 'center' | 'right';
  letterSpacing: number;
  lineHeight: number;
  textTransform: 'none' | 'uppercase' | 'lowercase';
  opacity: number;
  textShadow: string;
  stroke: string;
  strokeWidth: number;
  locked: boolean;
  width: number;
}

type GradientFade = 'none' | 'left-right' | 'right-left' | 'top-bottom' | 'bottom-top';

interface ShapeElement {
  id: string;
  type: 'shape';
  shape: 'rectangle' | 'circle' | 'square' | 'line';
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  borderColor: string;
  borderWidth: number;
  borderRadius: number;
  opacity: number;
  locked: boolean;
  gradientFade: GradientFade;
  gradientFadeIntensity: number; // 0 to 1, default 1
  rotation: number;
  shadow: string;
}

interface StickerElement {
  id: string;
  type: 'sticker';
  sticker: string;
  x: number;
  y: number;
  size: number;
  color: string;
  opacity: number;
  rotation: number;
  locked: boolean;
}

type CanvasElement = TextElement | ShapeElement | StickerElement;

interface ImageConfig {
  url: string;
  zoom: number;
  brightness: number;
  contrast: number;
  saturate: number;
  blur: number;
  offsetX: number;
  offsetY: number;
  overlayColor: string;
  overlayOpacity: number;
}

type FormatKey = '1:1' | '9:16';
const FORMAT_SIZES: Record<FormatKey, { w: number; h: number }> = {
  '1:1': { w: 1080, h: 1080 },
  '9:16': { w: 1080, h: 1920 },
};

const GOOGLE_FONTS = [
  'Inter', 'Poppins', 'Montserrat', 'Oswald', 'Playfair Display',
  'Roboto', 'Raleway', 'Lato', 'Bebas Neue', 'Bangers',
  'Dancing Script', 'Pacifico', 'Righteous', 'Abril Fatface',
  'Anton', 'Josefin Sans', 'Quicksand',
];

const defaultTextProps = {
  fontStyle: 'normal' as const,
  textDecoration: 'none' as const,
};

const TEMPLATES = [
  {
    name: 'Oferta Viagem',
    bg: '#0d1b2a',
    elements: [
      { id: '1', type: 'text' as const, content: 'PROMOÇÃO', x: 50, y: 8, fontSize: 48, fontFamily: 'Bebas Neue', fontWeight: '400', ...defaultTextProps, color: '#d4af37', textAlign: 'center' as const, letterSpacing: 8, lineHeight: 1.1, textTransform: 'uppercase' as const, opacity: 1, textShadow: 'none', stroke: '', strokeWidth: 0, locked: false, width: 80 },
      { id: '2', type: 'text' as const, content: 'Cancún', x: 50, y: 22, fontSize: 72, fontFamily: 'Playfair Display', fontWeight: '700', ...defaultTextProps, color: '#ffffff', textAlign: 'center' as const, letterSpacing: 2, lineHeight: 1, textTransform: 'none' as const, opacity: 1, textShadow: '0 2px 8px rgba(0,0,0,0.5)', stroke: '', strokeWidth: 0, locked: false, width: 80 },
      { id: '3', type: 'text' as const, content: '7 noites com aéreo', x: 50, y: 35, fontSize: 24, fontFamily: 'Inter', fontWeight: '300', ...defaultTextProps, color: '#e0e0e0', textAlign: 'center' as const, letterSpacing: 1, lineHeight: 1.4, textTransform: 'none' as const, opacity: 0.9, textShadow: 'none', stroke: '', strokeWidth: 0, locked: false, width: 80 },
      { id: '4', type: 'text' as const, content: 'a partir de', x: 50, y: 55, fontSize: 18, fontFamily: 'Inter', fontWeight: '400', ...defaultTextProps, color: '#aaa', textAlign: 'center' as const, letterSpacing: 0, lineHeight: 1.4, textTransform: 'none' as const, opacity: 1, textShadow: 'none', stroke: '', strokeWidth: 0, locked: false, width: 80 },
      { id: '5', type: 'text' as const, content: 'R$ 4.990', x: 50, y: 65, fontSize: 64, fontFamily: 'Montserrat', fontWeight: '800', ...defaultTextProps, color: '#d4af37', textAlign: 'center' as const, letterSpacing: 0, lineHeight: 1, textTransform: 'none' as const, opacity: 1, textShadow: '0 2px 12px rgba(212,175,55,0.3)', stroke: '', strokeWidth: 0, locked: false, width: 80 },
      { id: '6', type: 'text' as const, content: 'ou 10x de R$ 549', x: 50, y: 78, fontSize: 20, fontFamily: 'Inter', fontWeight: '400', ...defaultTextProps, color: '#ccc', textAlign: 'center' as const, letterSpacing: 0, lineHeight: 1.4, textTransform: 'none' as const, opacity: 0.8, textShadow: 'none', stroke: '', strokeWidth: 0, locked: false, width: 80 },
      { id: '7', type: 'text' as const, content: 'Vortex Viagens', x: 50, y: 90, fontSize: 16, fontFamily: 'Inter', fontWeight: '600', ...defaultTextProps, color: '#d4af37', textAlign: 'center' as const, letterSpacing: 2, lineHeight: 1, textTransform: 'uppercase' as const, opacity: 0.7, textShadow: 'none', stroke: '', strokeWidth: 0, locked: false, width: 80 },
    ] as CanvasElement[],
  },
  {
    name: 'Pacote Resort',
    bg: '#1a1a2e',
    elements: [
      { id: '1', type: 'text' as const, content: '🏖️ ALL INCLUSIVE', x: 50, y: 10, fontSize: 36, fontFamily: 'Oswald', fontWeight: '600', ...defaultTextProps, color: '#00b4d8', textAlign: 'center' as const, letterSpacing: 4, lineHeight: 1.2, textTransform: 'uppercase' as const, opacity: 1, textShadow: 'none', stroke: '', strokeWidth: 0, locked: false, width: 80 },
      { id: '2', type: 'text' as const, content: 'Punta Cana', x: 50, y: 25, fontSize: 64, fontFamily: 'Abril Fatface', fontWeight: '400', ...defaultTextProps, color: '#ffffff', textAlign: 'center' as const, letterSpacing: 1, lineHeight: 1, textTransform: 'none' as const, opacity: 1, textShadow: '0 4px 16px rgba(0,0,0,0.4)', stroke: '', strokeWidth: 0, locked: false, width: 85 },
      { id: '3', type: 'text' as const, content: 'Hotel 5★ + Aéreo + Traslado', x: 50, y: 40, fontSize: 22, fontFamily: 'Quicksand', fontWeight: '500', ...defaultTextProps, color: '#e0e0e0', textAlign: 'center' as const, letterSpacing: 0, lineHeight: 1.4, textTransform: 'none' as const, opacity: 0.85, textShadow: 'none', stroke: '', strokeWidth: 0, locked: false, width: 85 },
      { id: '4', type: 'text' as const, content: 'R$ 6.490', x: 50, y: 60, fontSize: 72, fontFamily: 'Montserrat', fontWeight: '900', ...defaultTextProps, color: '#00b4d8', textAlign: 'center' as const, letterSpacing: -2, lineHeight: 1, textTransform: 'none' as const, opacity: 1, textShadow: '0 0 30px rgba(0,180,216,0.3)', stroke: '', strokeWidth: 0, locked: false, width: 80 },
      { id: '5', type: 'text' as const, content: 'por pessoa', x: 50, y: 74, fontSize: 18, fontFamily: 'Inter', fontWeight: '400', ...defaultTextProps, color: '#999', textAlign: 'center' as const, letterSpacing: 2, lineHeight: 1, textTransform: 'uppercase' as const, opacity: 0.7, textShadow: 'none', stroke: '', strokeWidth: 0, locked: false, width: 80 },
      { id: '6', type: 'text' as const, content: '📲 Fale conosco', x: 50, y: 88, fontSize: 20, fontFamily: 'Inter', fontWeight: '600', ...defaultTextProps, color: '#25d366', textAlign: 'center' as const, letterSpacing: 0, lineHeight: 1, textTransform: 'none' as const, opacity: 1, textShadow: 'none', stroke: '', strokeWidth: 0, locked: false, width: 80 },
    ] as CanvasElement[],
  },
];

const defaultImage: ImageConfig = {
  url: '', zoom: 1, brightness: 1, contrast: 1, saturate: 1, blur: 0,
  offsetX: 0, offsetY: 0, overlayColor: '#000000', overlayOpacity: 0.4,
};

const DEFAULT_LOGO_SETTINGS = {
  logoSize: 8,
  logoOpacity: 0.6,
  logoColor: '',
  showLogo: true,
  logoX: 92,
  logoY: 92,
};

const QUOTE_IMAGES_PUBLIC_PATH = '/storage/v1/object/public/quote-images/';

const genId = () => `el_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const STICKER_DEFS = [
  {
    id: 'airplane', name: 'Avião', Icon: Plane,
    svg: 'M21 16v-2l-8-5V3.5a1.5 1.5 0 00-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z',
  },
  {
    id: 'hotel', name: 'Hotel', Icon: Building2,
    svg: 'M20 2H4a2 2 0 00-2 2v18h20V4a2 2 0 00-2-2zM6 6h3v3H6V6zm0 5h3v3H6v-3zm5-5h3v3h-3V6zm0 5h3v3h-3v-3zm-1 11H8v-4h2v4zm4 0h-2v-4h2v4zm4-11h3v3h-3v-3zm0-5h3v3h-3V6z',
  },
  {
    id: 'transfer', name: 'Transfer', Icon: Bus,
    svg: 'M4 16c0 .88.39 1.67 1 2.22V20a1 1 0 001 1h1a1 1 0 001-1v-1h8v1a1 1 0 001 1h1a1 1 0 001-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4S4 2.5 4 6v10zm3.5 1a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm9 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM18 10H6V6h12v4z',
  },
  {
    id: 'ticket', name: 'Ingressos', Icon: Ticket,
    svg: 'M22 10V6a2 2 0 00-2-2H4a2 2 0 00-2 2v4a2 2 0 010 4v4a2 2 0 002 2h16a2 2 0 002-2v-4a2 2 0 010-4zm-2-1.46a4 4 0 000 6.92V18H4v-2.54a4 4 0 000-6.92V6h16v2.54zM11 15h2v2h-2v-2zm0-4h2v2h-2v-2zm0-4h2v2h-2V7z',
  },
  {
    id: 'health', name: 'Seguro Saúde', Icon: ShieldPlus,
    svg: 'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm4 14h-3v3h-2v-3H8v-2h3v-3h2v3h3v2z',
  },
  {
    id: 'camera', name: 'Câmera', Icon: Camera,
    svg: 'M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2v11zM12 17a5 5 0 100-10 5 5 0 000 10zm0-2a3 3 0 110-6 3 3 0 010 6z',
  },
  {
    id: 'guide', name: 'Guia Turístico', Icon: Compass,
    svg: 'M12 2a10 10 0 100 20 10 10 0 000-20zm0 18a8 8 0 110-16 8 8 0 010 16zm-1-13l6 3-3 6-6-3 3-6zm1 4a1 1 0 100 2 1 1 0 000-2z',
  },
  {
    id: 'whatsapp', name: 'WhatsApp', Icon: MessageCircle,
    svg: 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z',
  },
];

interface SavedTemplate {
  id?: string;
  name: string;
  bg: string;
  bgGradient: string;
  format: FormatKey;
  elements: CanvasElement[];
  imageConfig: ImageConfig;
  imageInShape: boolean;
  imageShapeId: string;
  logoSize: number;
  logoOpacity: number;
  logoColor: string;
  showLogo: boolean;
  logoX: number;
  logoY: number;
}

const MARKETING_CATEGORIES = [
  { value: 'feed', label: 'Feed' },
  { value: 'story', label: 'Story' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'banner', label: 'Banner' },
  { value: 'promotion', label: 'Promoção' },
];

export default function PromoMakerPage() {
  const [searchParams] = useSearchParams();
  const [format, setFormat] = useState<FormatKey>((searchParams.get('format') as FormatKey) || '1:1');
  const [bgColor, setBgColor] = useState('#0d1b2a');
  const [bgGradient, setBgGradient] = useState('');
  const [elements, setElements] = useState<CanvasElement[]>(TEMPLATES[0].elements);
  const [image, setImage] = useState<ImageConfig>(defaultImage);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [preview, setPreview] = useState<'feed' | 'stories' | 'whatsapp' | null>(null);
  const [dragInfo, setDragInfo] = useState<{ id: string; startX: number; startY: number; elX: number; elY: number } | null>(null);
  const [imageInShape, setImageInShape] = useState(false);
  const [imageShapeId, setImageShapeId] = useState('');
  const [rightTab, setRightTab] = useState('element');
  const [logoSize, setLogoSize] = useState(DEFAULT_LOGO_SETTINGS.logoSize);
  const [logoOpacity, setLogoOpacity] = useState(DEFAULT_LOGO_SETTINGS.logoOpacity);
  const [logoColor, setLogoColor] = useState(DEFAULT_LOGO_SETTINGS.logoColor);
  const [showLogo, setShowLogo] = useState(DEFAULT_LOGO_SETTINGS.showLogo);
  const [logoX, setLogoX] = useState(DEFAULT_LOGO_SETTINGS.logoX);
  const [logoY, setLogoY] = useState(DEFAULT_LOGO_SETTINGS.logoY);
  const [logoDrag, setLogoDrag] = useState<{ startX: number; startY: number; elX: number; elY: number } | null>(null);
  const [savedTemplates, setSavedTemplates] = useState<SavedTemplate[]>([]);
  const [saveTemplateName, setSaveTemplateName] = useState('');
  const { activeCompany } = useCompany();

  // Load promotion data from URL params
  useEffect(() => {
    const promoId = searchParams.get('promotion');
    if (!promoId || promoId === 'new') return;
    supabase
      .from('promotions')
      .select('*')
      .eq('id', promoId)
      .single()
      .then(({ data }: any) => {
        if (!data) return;
        const style = searchParams.get('style') || 'premium';
        const accentColor = style === 'premium' ? '#d4af37' : style === 'oferta' ? '#ff4444' : style === 'emocional' ? '#ff6b9d' : style === 'minimalista' ? '#333333' : style === 'familia' ? '#4ecdc4' : '#00b4d8';
        
        const services: string[] = [];
        if (data.included_tickets) services.push('Ingressos');
        if (data.included_tours) services.push('Passeios');
        if (data.included_guide) services.push('Guia');
        if (data.included_transfer) services.push('Transfer');
        if (data.included_train) services.push('Trem');

        const promoElements: CanvasElement[] = [
          { id: genId(), type: 'text', content: data.destination_name?.toUpperCase() || 'DESTINO', x: 50, y: 15, fontSize: 72, fontFamily: 'Playfair Display', fontWeight: '700', ...defaultTextProps, color: '#ffffff', textAlign: 'center', letterSpacing: 2, lineHeight: 1, textTransform: 'uppercase', opacity: 1, textShadow: '0 2px 8px rgba(0,0,0,0.5)', stroke: '', strokeWidth: 0, locked: false, width: 85 },
          { id: genId(), type: 'text', content: `${data.nights} noites + café da manhã`, x: 50, y: 30, fontSize: 24, fontFamily: 'Inter', fontWeight: '300', ...defaultTextProps, color: '#e0e0e0', textAlign: 'center', letterSpacing: 1, lineHeight: 1.4, textTransform: 'none', opacity: 0.9, textShadow: 'none', stroke: '', strokeWidth: 0, locked: false, width: 80 },
          { id: genId(), type: 'text', content: `R$ ${Number(data.installment_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`, x: 50, y: 52, fontSize: 64, fontFamily: 'Montserrat', fontWeight: '800', ...defaultTextProps, color: accentColor, textAlign: 'center', letterSpacing: 0, lineHeight: 1, textTransform: 'none', opacity: 1, textShadow: `0 2px 12px ${accentColor}40`, stroke: '', strokeWidth: 0, locked: false, width: 80 },
          { id: genId(), type: 'text', content: `${data.installments}x sem juros`, x: 50, y: 64, fontSize: 20, fontFamily: 'Inter', fontWeight: '400', ...defaultTextProps, color: '#ccc', textAlign: 'center', letterSpacing: 0, lineHeight: 1.4, textTransform: 'none', opacity: 0.8, textShadow: 'none', stroke: '', strokeWidth: 0, locked: false, width: 80 },
          { id: genId(), type: 'text', content: `✈️ ${data.airport_origin || 'SAO'} → ${data.airport_destination || 'DST'}`, x: 50, y: 76, fontSize: 18, fontFamily: 'Inter', fontWeight: '500', ...defaultTextProps, color: '#ffffff', textAlign: 'center', letterSpacing: 0, lineHeight: 1.4, textTransform: 'none', opacity: 0.9, textShadow: 'none', stroke: '', strokeWidth: 0, locked: false, width: 80 },
          { id: genId(), type: 'text', content: `🏨 ${data.accommodation_type || 'Hotel'}`, x: 50, y: 82, fontSize: 18, fontFamily: 'Inter', fontWeight: '500', ...defaultTextProps, color: '#ffffff', textAlign: 'center', letterSpacing: 0, lineHeight: 1.4, textTransform: 'none', opacity: 0.9, textShadow: 'none', stroke: '', strokeWidth: 0, locked: false, width: 80 },
        ];

        if (services.length > 0) {
          promoElements.push({ id: genId(), type: 'text', content: `🎟️ ${services.join(' + ')}`, x: 50, y: 88, fontSize: 16, fontFamily: 'Inter', fontWeight: '500', ...defaultTextProps, color: '#ffffff', textAlign: 'center', letterSpacing: 0, lineHeight: 1.4, textTransform: 'none', opacity: 0.85, textShadow: 'none', stroke: '', strokeWidth: 0, locked: false, width: 80 });
        }

        promoElements.push({ id: genId(), type: 'text', content: 'SAIBA MAIS', x: 50, y: 94, fontSize: 16, fontFamily: 'Inter', fontWeight: '700', ...defaultTextProps, color: accentColor, textAlign: 'center', letterSpacing: 2, lineHeight: 1, textTransform: 'uppercase', opacity: 1, textShadow: 'none', stroke: '', strokeWidth: 0, locked: false, width: 40 });

        setElements(promoElements);
        
        if (data.main_image_url) {
          setImage(prev => ({ ...prev, url: data.main_image_url }));
        }
      });
  }, [searchParams]);

  // Load saved templates from database
  useEffect(() => {
    if (!activeCompany?.id) return;
    supabase
      .from('promo_templates')
      .select('*')
      .eq('empresa_id', activeCompany.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) {
          setSavedTemplates(data.map((row: any) => ({
            ...DEFAULT_LOGO_SETTINGS,
            id: row.id,
            name: row.name,
            ...(row.template_data as any),
            imageConfig: { ...defaultImage, ...((row.template_data as any)?.imageConfig || {}) },
          })));
        }
      });
  }, [activeCompany?.id]);
  const [alignMode, setAlignMode] = useState<'none' | 'horizontal' | 'vertical'>('none');
  const [alignSpacing, setAlignSpacing] = useState(5);

  // Undo/Redo – Word-like behaviour using refs to avoid stale closures
  const historyRef = useRef<CanvasElement[][]>([]);
  const historyIndexRef = useRef(-1);
  const isUndoRedoRef = useRef(false);
  const [, forceRender] = useState(0);

  // Push to history whenever elements change (but not from undo/redo)
  useEffect(() => {
    if (isUndoRedoRef.current) {
      isUndoRedoRef.current = false;
      return;
    }
    const snapshot = JSON.parse(JSON.stringify(elements));
    const trimmed = historyRef.current.slice(0, historyIndexRef.current + 1);
    trimmed.push(snapshot);
    if (trimmed.length > 50) trimmed.shift();
    historyRef.current = trimmed;
    historyIndexRef.current = trimmed.length - 1;
    forceRender(n => n + 1);
  }, [elements]);

  const canUndo = historyIndexRef.current > 0;
  const canRedo = historyIndexRef.current < historyRef.current.length - 1;

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    isUndoRedoRef.current = true;
    historyIndexRef.current -= 1;
    setElements(JSON.parse(JSON.stringify(historyRef.current[historyIndexRef.current])));
    forceRender(n => n + 1);
  }, []);

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    isUndoRedoRef.current = true;
    historyIndexRef.current += 1;
    setElements(JSON.parse(JSON.stringify(historyRef.current[historyIndexRef.current])));
    forceRender(n => n + 1);
  }, []);

  // Keyboard shortcuts – stable refs, no stale closures
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);

  const canvasRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const link = document.createElement('link');
    link.href = `https://fonts.googleapis.com/css2?${GOOGLE_FONTS.map(f => `family=${f.replace(/ /g, '+')}:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,300;1,400;1,500;1,600;1,700;1,800;1,900`).join('&')}&display=swap`;
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

  const selected = elements.find(e => e.id === selectedId) || null;
  const canvasSize = FORMAT_SIZES[format];
  const scale = format === '9:16' ? Math.min(380 / canvasSize.w, 650 / canvasSize.h) : 380 / canvasSize.w;

  const updateEl = (id: string, patch: Partial<TextElement> | Partial<ShapeElement> | Partial<StickerElement>) => {
    setElements(prev => prev.map(e => e.id === id ? { ...e, ...patch } as CanvasElement : e));
  };

  const addTextElement = () => {
    const newEl: TextElement = {
      id: genId(), type: 'text', content: 'Novo texto', x: 50, y: 50,
      fontSize: 28, fontFamily: 'Inter', fontWeight: '600', fontStyle: 'normal',
      textDecoration: 'none', color: '#ffffff',
      textAlign: 'center', letterSpacing: 0, lineHeight: 1.3,
      textTransform: 'none', opacity: 1, textShadow: 'none',
      stroke: '', strokeWidth: 0, locked: false, width: 80,
    };
    setElements(prev => [...prev, newEl]);
    setSelectedId(newEl.id);
    setRightTab('element');
  };

  const addShapeElement = (shape: 'rectangle' | 'circle' | 'square' | 'line') => {
    const newEl: ShapeElement = {
      id: genId(), type: 'shape', shape,
      x: 50, y: 50,
      width: shape === 'line' ? 40 : shape === 'circle' ? 20 : shape === 'square' ? 20 : 40,
      height: shape === 'line' ? 0.5 : shape === 'circle' ? 20 : shape === 'square' ? 20 : 25,
      color: shape === 'line' ? '#ffffff' : '#d4af37',
      borderColor: 'transparent', borderWidth: 0,
      borderRadius: shape === 'circle' ? 50 : 0,
      opacity: shape === 'line' ? 1 : 0.8, locked: false,
      gradientFade: 'none' as GradientFade,
      gradientFadeIntensity: 1,
      rotation: 0,
      shadow: 'none',
    };
    setElements(prev => [...prev, newEl]);
    setSelectedId(newEl.id);
    setRightTab('element');
  };

  const addStickerElement = (stickerId: string) => {
    const newEl: StickerElement = {
      id: genId(), type: 'sticker', sticker: stickerId,
      x: 50, y: 50, size: 10, color: '#ffffff',
      opacity: 1, rotation: 0, locked: false,
    };
    setElements(prev => [...prev, newEl]);
    setSelectedId(newEl.id);
    setRightTab('element');
  };

  const deleteElement = (id: string) => {
    setElements(prev => prev.filter(e => e.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const duplicateElement = (id: string) => {
    const el = elements.find(e => e.id === id);
    if (!el) return;
    const dup = { ...el, id: genId(), y: Math.min(el.y + 5, 95) };
    setElements(prev => [...prev, dup]);
    setSelectedId(dup.id);
  };

  const moveLayer = (id: string, dir: 'up' | 'down') => {
    setElements(prev => {
      const idx = prev.findIndex(e => e.id === id);
      if (idx < 0) return prev;
      const newArr = [...prev];
      const swapIdx = dir === 'up' ? idx + 1 : idx - 1;
      if (swapIdx < 0 || swapIdx >= newArr.length) return prev;
      [newArr[idx], newArr[swapIdx]] = [newArr[swapIdx], newArr[idx]];
      return newArr;
    });
  };

  const applyTemplate = (tpl: typeof TEMPLATES[0]) => {
    setBgColor(tpl.bg);
    setElements(tpl.elements.map(e => ({ ...e, id: genId() })));
    setSelectedId(null);
  };

  const applySavedTemplate = (tpl: SavedTemplate) => {
    const elementIds = new Map<string, string>();
    const remappedElements = tpl.elements.map((el) => {
      const newId = genId();
      elementIds.set(el.id, newId);
      return { ...el, id: newId };
    });

    setBgColor(tpl.bg);
    setBgGradient(tpl.bgGradient || '');
    setFormat(tpl.format || '1:1');
    setElements(remappedElements);
    setImage({ ...defaultImage, ...(tpl.imageConfig || {}) });
    setImageInShape(tpl.imageInShape || false);
    setImageShapeId(tpl.imageShapeId ? (elementIds.get(tpl.imageShapeId) || '') : '');
    setLogoSize(tpl.logoSize ?? DEFAULT_LOGO_SETTINGS.logoSize);
    setLogoOpacity(tpl.logoOpacity ?? DEFAULT_LOGO_SETTINGS.logoOpacity);
    setLogoColor(tpl.logoColor ?? DEFAULT_LOGO_SETTINGS.logoColor);
    setShowLogo(tpl.showLogo ?? DEFAULT_LOGO_SETTINGS.showLogo);
    setLogoX(tpl.logoX ?? DEFAULT_LOGO_SETTINGS.logoX);
    setLogoY(tpl.logoY ?? DEFAULT_LOGO_SETTINGS.logoY);
    setSelectedId(null);
    setSelectedIds([]);
    toast.success(`Template "${tpl.name}" aplicado!`);
  };

  const uploadImageBlob = async (blob: Blob, sourceUrl?: string): Promise<string> => {
    const contentType = blob.type || 'image/png';
    let ext = contentType.split('/')[1]?.split('+')[0] || 'png';

    if ((ext === 'octet-stream' || !ext) && sourceUrl?.startsWith('http')) {
      try {
        const pathname = new URL(sourceUrl).pathname;
        const match = pathname.match(/\.([a-zA-Z0-9]+)$/);
        if (match?.[1]) ext = match[1].toLowerCase();
      } catch {
        // ignore URL parsing failures and fallback to png
      }
    }

    const fileName = `promo-templates/${activeCompany?.id}/${crypto.randomUUID()}.${ext || 'png'}`;
    const { error } = await supabase.storage.from('quote-images').upload(fileName, blob, { contentType: blob.type });
    if (error) throw error;
    const { data: publicData } = supabase.storage.from('quote-images').getPublicUrl(fileName);
    return publicData.publicUrl;
  };

  const persistTemplateImage = async (sourceUrl: string): Promise<string> => {
    if (!sourceUrl) return '';
    if (!activeCompany?.id) throw new Error('Empresa não selecionada');
    if (sourceUrl.includes(QUOTE_IMAGES_PUBLIC_PATH)) return sourceUrl;

    if (sourceUrl.startsWith('blob:') || sourceUrl.startsWith('data:')) {
      const response = await fetch(sourceUrl);
      return uploadImageBlob(await response.blob(), sourceUrl);
    }

    if (/^https?:\/\//i.test(sourceUrl)) {
      try {
        const response = await fetch(sourceUrl);
        if (!response.ok) throw new Error(`Falha ao baixar imagem externa: ${response.status}`);
        return uploadImageBlob(await response.blob(), sourceUrl);
      } catch {
        const { data, error } = await supabase.functions.invoke('proxy-image', {
          body: { url: sourceUrl },
        });

        if (error || !data?.dataUrl) throw error || new Error('Falha ao proxyar imagem externa');
        const proxiedResponse = await fetch(data.dataUrl);
        return uploadImageBlob(await proxiedResponse.blob(), sourceUrl);
      }
    }

    return sourceUrl;
  };

  const buildTemplateData = (imageUrl: string) => ({
    bg: bgColor,
    bgGradient,
    format,
    elements,
    imageConfig: { ...image, url: imageUrl },
    imageInShape,
    imageShapeId,
    logoSize,
    logoOpacity,
    logoColor,
    showLogo,
    logoX,
    logoY,
  });

  const saveCurrentAsTemplate = async () => {
    const name = saveTemplateName.trim();
    if (!name) { toast.error('Digite um nome para o template'); return; }
    if (!activeCompany?.id) { toast.error('Selecione uma empresa'); return; }
    let imageUrl = image.url || '';
    try {
      imageUrl = await persistTemplateImage(imageUrl);
    } catch {
      toast.error('Erro ao salvar imagem do template');
      return;
    }
    const templateData = buildTemplateData(imageUrl);
    const { data: row, error } = await supabase
      .from('promo_templates')
      .insert({ empresa_id: activeCompany.id, name, template_data: templateData as any })
      .select()
      .single();
    if (error) {
      console.error('Erro ao salvar template:', error);
      toast.error('Erro ao salvar template.');
      return;
    }
    const tpl: SavedTemplate = { id: row.id, name, ...templateData };
    setSavedTemplates(prev => [tpl, ...prev]);
    setSaveTemplateName('');
    toast.success(`Template "${name}" salvo!`);
  };

  const deleteSavedTemplate = async (idx: number) => {
    const tpl = savedTemplates[idx];
    if (tpl.id) {
      await supabase.from('promo_templates').delete().eq('id', tpl.id);
    }
    setSavedTemplates(prev => prev.filter((_, i) => i !== idx));
    toast.success('Template removido');
  };

  const overwriteSavedTemplate = async (idx: number) => {
    const tpl = savedTemplates[idx];
    if (!tpl.id) return;
    let imageUrl = image.url || '';
    try {
      imageUrl = await persistTemplateImage(imageUrl);
    } catch {
      toast.error('Erro ao salvar imagem do template');
      return;
    }
    const templateData = buildTemplateData(imageUrl);
    const { error } = await supabase
      .from('promo_templates')
      .update({ template_data: templateData as any })
      .eq('id', tpl.id);
    if (error) {
      toast.error('Erro ao atualizar template.');
      return;
    }
    setSavedTemplates(prev => prev.map((t, i) => i === idx ? { ...t, ...templateData } : t));
    toast.success(`Template "${tpl.name}" atualizado!`);
  };

  const shapeElements = elements.filter(el => el.type === 'shape') as ShapeElement[];

  const getMultiSelectedElements = () => {
    if (selectedIds.length >= 2) return elements.filter(e => selectedIds.includes(e.id));
    return [];
  };

  const alignHorizontally = () => {
    const els = getMultiSelectedElements();
    if (els.length < 2) return;
    const ref = els.reduce((a, b) => a.y < b.y ? a : b);
    // Check if all elements share the same X (e.g. after vertical align)
    const allSameX = els.every(e => Math.abs(e.x - els[0].x) < 2);
    if (allSameX) {
      // Distribute left-to-right with spacing, align Y
      const sorted = [...els].sort((a, b) => a.y - b.y);
      const startX = sorted[0].x;
      setElements(prev => prev.map(e => {
        if (!selectedIds.includes(e.id)) return e;
        const idx = sorted.findIndex(s => s.id === e.id);
        return { ...e, y: ref.y, x: startX + idx * alignSpacing } as CanvasElement;
      }));
    } else {
      // Normal: align Y, keep X
      setElements(prev => prev.map(e =>
        selectedIds.includes(e.id) ? { ...e, y: ref.y } as CanvasElement : e
      ));
    }
    setAlignMode('horizontal');
    toast.success('Elementos alinhados horizontalmente (mesmo Y).');
  };

  const alignVertically = () => {
    const els = getMultiSelectedElements();
    if (els.length < 2) return;
    // Align all to same X (leftmost), keep each element's Y
    const ref = els.reduce((a, b) => a.x < b.x ? a : b);
    setElements(prev => prev.map(e =>
      selectedIds.includes(e.id) ? { ...e, x: ref.x } as CanvasElement : e
    ));
    setAlignMode('vertical');
    toast.success('Elementos alinhados verticalmente (mesmo X).');
  };

  const applySpacing = (spacing: number) => {
    setAlignSpacing(spacing);
    const els = getMultiSelectedElements();
    if (els.length < 2) return;
    if (alignMode === 'horizontal') {
      const sorted = [...els].sort((a, b) => a.x - b.x);
      const startX = sorted[0].x;
      setElements(prev => prev.map(e => {
        const idx = sorted.findIndex(s => s.id === e.id);
        if (idx < 0) return e;
        return { ...e, x: startX + idx * spacing } as CanvasElement;
      }));
    } else if (alignMode === 'vertical') {
      const sorted = [...els].sort((a, b) => a.y - b.y);
      const startY = sorted[0].y;
      setElements(prev => prev.map(e => {
        const idx = sorted.findIndex(s => s.id === e.id);
        if (idx < 0) return e;
        return { ...e, y: startY + idx * spacing } as CanvasElement;
      }));
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setImage(prev => ({ ...prev, url: objectUrl }));
  };

  const handleCanvasMouseDown = (e: React.MouseEvent, elId: string) => {
    const el = elements.find(x => x.id === elId);
    if (!el || el.locked) return;
    e.stopPropagation();
    if (e.ctrlKey || e.metaKey) {
      // Multi-select toggle
      setSelectedIds(prev => {
        const current = prev.length > 0 ? prev : (selectedId ? [selectedId] : []);
        if (current.includes(elId)) {
          const next = current.filter(id => id !== elId);
          setSelectedId(next.length === 1 ? next[0] : next.length === 0 ? null : selectedId);
          return next;
        }
        const next = [...current.filter(id => id !== elId), elId];
        setSelectedId(elId);
        return next;
      });
    } else {
      setSelectedId(elId);
      setSelectedIds([]);
    }
    setDragInfo({ id: elId, startX: e.clientX, startY: e.clientY, elX: el.x, elY: el.y });
  };

  const clamp = (v: number) => Math.max(2, Math.min(98, v));

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    if (logoDrag) {
      const dx = ((e.clientX - logoDrag.startX) / rect.width) * 100;
      const dy = ((e.clientY - logoDrag.startY) / rect.height) * 100;
      setLogoX(clamp(logoDrag.elX + dx));
      setLogoY(clamp(logoDrag.elY + dy));
      return;
    }
    if (!dragInfo) return;
    const dx = ((e.clientX - dragInfo.startX) / rect.width) * 100;
    const dy = ((e.clientY - dragInfo.startY) / rect.height) * 100;
    updateEl(dragInfo.id, {
      x: clamp(dragInfo.elX + dx),
      y: clamp(dragInfo.elY + dy),
    });
  }, [dragInfo, logoDrag]);

  const handleCanvasMouseUp = useCallback(() => { setDragInfo(null); setLogoDrag(null); }, []);

  const handleExport = async () => {
    if (!canvasRef.current) return;
    try {
      // Ensure all Google Fonts are fully loaded before capturing
      await document.fonts.ready;

      // Build font CSS for embedding into the exported image
      const usedFonts = new Set(
        elements.filter(el => el.type === 'text').map(el => (el as TextElement).fontFamily)
      );
      const fontCssPromises = Array.from(usedFonts).map(async (font) => {
        try {
          const url = `https://fonts.googleapis.com/css2?family=${font.replace(/ /g, '+')}:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap`;
          const res = await fetch(url);
          const css = await res.text();
          // Fetch each font file and convert to base64 data URI
          const fontUrls = css.match(/url\((https:\/\/[^)]+)\)/g) || [];
          let inlinedCss = css;
          for (const match of fontUrls) {
            const fontUrl = match.slice(4, -1);
            try {
              const fontRes = await fetch(fontUrl);
              const blob = await fontRes.blob();
              const dataUrl = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(blob);
              });
              inlinedCss = inlinedCss.replace(fontUrl, dataUrl);
            } catch { /* skip individual font file */ }
          }
          return inlinedCss;
        } catch { return ''; }
      });
      const fontCss = (await Promise.all(fontCssPromises)).join('\n');

      const dataUrl = await toPng(canvasRef.current, {
        width: canvasSize.w, height: canvasSize.h, pixelRatio: 2,
        style: { transform: 'none', width: `${canvasSize.w}px`, height: `${canvasSize.h}px` },
        fontEmbedCSS: fontCss,
      });
      const link = document.createElement('a');
      link.download = `promo-vortex-${format.replace(':', 'x')}-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
      toast.success('Imagem exportada com sucesso!');
    } catch {
      toast.error('Erro ao exportar imagem');
    }
  };

  const renderCanvas = () => (
    <div
      ref={canvasRef}
      className="relative overflow-hidden select-none"
      style={{
        width: canvasSize.w, height: canvasSize.h,
        transform: `scale(${scale})`, transformOrigin: 'top left',
        background: bgGradient || bgColor,
      }}
      onMouseMove={handleCanvasMouseMove}
      onMouseUp={handleCanvasMouseUp}
      onMouseLeave={handleCanvasMouseUp}
      onClick={() => { setSelectedId(null); setSelectedIds([]); }}
    >
      {/* Full background image (only when NOT in shape mode) */}
      {image.url && !imageInShape && (
        <>
          <img
            src={image.url} alt="" className="absolute inset-0 w-full h-full pointer-events-none" draggable={false}
            style={{
              objectFit: 'cover',
              objectPosition: `${50 + image.offsetX}% ${50 + image.offsetY}%`,
              transform: `scale(${image.zoom})`,
              filter: `brightness(${image.brightness}) contrast(${image.contrast}) saturate(${image.saturate}) blur(${image.blur}px)`,
            }}
          />
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: image.overlayColor, opacity: image.overlayOpacity }} />
        </>
      )}

      {/* Shapes (behind text) */}
      {elements.filter(el => el.type === 'shape').map(el => {
        const isImageTarget = imageInShape && imageShapeId === el.id && image.url;
        const isLine = el.shape === 'line';
        return (
          <div
            key={el.id}
            className={`absolute cursor-move overflow-hidden ${selectedId === el.id || selectedIds.includes(el.id) ? 'ring-2 ring-blue-500 ring-offset-1' : ''}`}
            style={{
              left: `${el.x}%`, top: `${el.y}%`,
              transform: `translate(-50%, -50%) rotate(${el.rotation || 0}deg)`,
              width: `${el.width}%`,
              height: isLine ? `${Math.max(el.height, 0.3)}%` : `${el.height}%`,
              backgroundColor: isImageTarget ? undefined : el.color,
              borderRadius: el.shape === 'circle' ? '50%' : isLine ? '0' : `${el.borderRadius}px`,
              border: el.borderWidth > 0 ? `${el.borderWidth}px solid ${el.borderColor}` : undefined,
              opacity: el.opacity,
              boxShadow: el.shadow && el.shadow !== 'none' ? el.shadow : undefined,
              pointerEvents: el.locked ? 'none' : 'auto',
              userSelect: 'none',
              ...(el.gradientFade !== 'none' ? (() => {
                const intensity = el.gradientFadeIntensity ?? 1;
                const endAlpha = 1 - intensity; // 1 = fully transparent end, 0 = no fade
                const dir = el.gradientFade === 'left-right' ? 'to right'
                  : el.gradientFade === 'right-left' ? 'to left'
                  : el.gradientFade === 'top-bottom' ? 'to bottom' : 'to top';
                const grad = `linear-gradient(${dir}, rgba(0,0,0,1), rgba(0,0,0,${endAlpha}))`;
                return { WebkitMaskImage: grad, maskImage: grad };
              })() : {}),
            }}
            onMouseDown={(e) => handleCanvasMouseDown(e, el.id)}
            onClick={(e) => { e.stopPropagation(); if (!e.ctrlKey && !e.metaKey) { setSelectedId(el.id); setSelectedIds([]); } }}
          >
            {isImageTarget && (
              <>
                <img
                  src={image.url} alt="" className="absolute inset-0 w-full h-full pointer-events-none" draggable={false}
                  style={{
                    objectFit: 'cover',
                    objectPosition: `${50 + image.offsetX}% ${50 + image.offsetY}%`,
                    transform: `scale(${image.zoom})`,
                    filter: `brightness(${image.brightness}) contrast(${image.contrast}) saturate(${image.saturate}) blur(${image.blur}px)`,
                  }}
                />
                <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: image.overlayColor, opacity: image.overlayOpacity }} />
              </>
            )}
          </div>
        );
      })}

      {/* Stickers */}
      {elements.filter(el => el.type === 'sticker').map(el => {
        const def = STICKER_DEFS.find(s => s.id === el.sticker);
        if (!def) return null;
        return (
          <div
            key={el.id}
            className={`absolute cursor-move ${selectedId === el.id || selectedIds.includes(el.id) ? 'ring-2 ring-blue-500 ring-offset-1' : ''}`}
            style={{
              left: `${el.x}%`, top: `${el.y}%`,
              transform: `translate(-50%, -50%) rotate(${el.rotation}deg)`,
              width: `${el.size}%`, height: `${el.size}%`,
              opacity: el.opacity,
              pointerEvents: el.locked ? 'none' : 'auto',
              userSelect: 'none',
            }}
            onMouseDown={(e) => handleCanvasMouseDown(e, el.id)}
            onClick={(e) => { e.stopPropagation(); if (!e.ctrlKey && !e.metaKey) { setSelectedId(el.id); setSelectedIds([]); } }}
          >
            <svg viewBox="-2 -2 28 28" className="w-full h-full">
              <circle cx="12" cy="12" r="13.5" fill="none" stroke={el.color} strokeWidth="1.5" opacity="0.5" />
              <circle cx="12" cy="12" r="11.5" fill={el.color} opacity="0.15" />
              <path d={def.svg} fill={el.color} />
            </svg>
          </div>
        );
      })}

      {/* Texts on top */}
      {elements.filter(el => el.type === 'text').map(el => (
          <div
            key={el.id}
            className={`absolute cursor-move ${selectedId === el.id || selectedIds.includes(el.id) ? 'ring-2 ring-blue-500 ring-offset-1' : ''}`}
            style={{
              left: `${el.x}%`, top: `${el.y}%`,
              transform: 'translate(-50%, -50%)',
              width: 'max-content',
              whiteSpace: 'nowrap',
              fontFamily: `'${el.fontFamily}', sans-serif`,
              fontSize: `${el.fontSize}px`,
              fontWeight: el.fontWeight,
              fontStyle: el.fontStyle,
              textDecoration: el.textDecoration !== 'none' ? el.textDecoration : undefined,
              color: el.color,
              textAlign: el.textAlign,
              letterSpacing: `${el.letterSpacing}px`,
              lineHeight: el.lineHeight,
              textTransform: el.textTransform,
              opacity: el.opacity,
              textShadow: el.textShadow !== 'none' ? el.textShadow : undefined,
              WebkitTextStroke: el.stroke && el.strokeWidth ? `${el.strokeWidth}px ${el.stroke}` : undefined,
              pointerEvents: el.locked ? 'none' : 'auto',
              userSelect: 'none',
            }}
            onMouseDown={(e) => handleCanvasMouseDown(e, el.id)}
            onClick={(e) => { e.stopPropagation(); if (!e.ctrlKey && !e.metaKey) { setSelectedId(el.id); setSelectedIds([]); } }}
          >
            {el.content}
          </div>
        ))}
      

      {showLogo && (
        <div
          className="absolute cursor-move"
          style={{
            left: `${logoX}%`, top: `${logoY}%`,
            transform: 'translate(-50%, -50%)',
            height: `${logoSize}%`, opacity: logoOpacity,
            zIndex: 9999,
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            setSelectedId(null);
            setLogoDrag({ startX: e.clientX, startY: e.clientY, elX: logoX, elY: logoY });
          }}
        >
          <img
            src="/images/vortex-logo-white.png" alt="Vortex"
            className="h-full w-auto"
            style={{
              ...(logoColor ? {
                filter: 'brightness(0) invert(1)',
                WebkitFilter: 'brightness(0) invert(1)',
              } : {}),
            }}
            draggable={false}
          />
          {logoColor && (
            <div className="absolute inset-0" style={{
              backgroundColor: logoColor,
              mixBlendMode: 'multiply',
              maskImage: 'url(/images/vortex-logo-white.png)',
              WebkitMaskImage: 'url(/images/vortex-logo-white.png)',
              maskSize: 'contain',
              WebkitMaskSize: 'contain',
              maskRepeat: 'no-repeat',
              WebkitMaskRepeat: 'no-repeat',
            }} />
          )}
        </div>
      )}
    </div>
  );

  const renderTextProps = (sel: TextElement) => (
    <div className="p-3 space-y-3">
      <div>
        <Label className="text-xs">Texto</Label>
        <textarea
          value={sel.content}
          onChange={e => updateEl(sel.id, { content: e.target.value })}
          className="w-full mt-1 rounded-md border border-input bg-background px-2 py-1.5 text-sm min-h-[60px] resize-none"
        />
      </div>

      <div>
        <Label className="text-xs">Formatação</Label>
        <div className="flex gap-1 mt-1">
          <Button size="sm" variant={Number(sel.fontWeight) >= 700 ? 'default' : 'outline'} className="h-8 w-8 p-0"
            onClick={() => updateEl(sel.id, { fontWeight: Number(sel.fontWeight) >= 700 ? '400' : '700' })}>
            <Bold className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant={sel.fontStyle === 'italic' ? 'default' : 'outline'} className="h-8 w-8 p-0"
            onClick={() => updateEl(sel.id, { fontStyle: sel.fontStyle === 'italic' ? 'normal' : 'italic' })}>
            <Italic className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant={sel.textDecoration === 'underline' ? 'default' : 'outline'} className="h-8 w-8 p-0"
            onClick={() => updateEl(sel.id, { textDecoration: sel.textDecoration === 'underline' ? 'none' : 'underline' })}>
            <Underline className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Fonte</Label>
          <Select value={sel.fontFamily} onValueChange={v => updateEl(sel.id, { fontFamily: v })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {GOOGLE_FONTS.map(f => (
                <SelectItem key={f} value={f} style={{ fontFamily: `'${f}'` }}>{f}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Tamanho</Label>
          <Input type="number" value={sel.fontSize} onChange={e => updateEl(sel.id, { fontSize: Number(e.target.value) })} className="h-8 text-xs" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Peso</Label>
          <Select value={sel.fontWeight} onValueChange={v => updateEl(sel.id, { fontWeight: v })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {['300', '400', '500', '600', '700', '800', '900'].map(w => (
                <SelectItem key={w} value={w}>{w}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Cor</Label>
          <div className="flex items-center gap-1 mt-1">
            <input type="color" value={sel.color} onChange={e => updateEl(sel.id, { color: e.target.value })} className="w-8 h-8 rounded cursor-pointer border-0" />
            <Input value={sel.color} onChange={e => updateEl(sel.id, { color: e.target.value })} className="h-8 text-xs flex-1" />
          </div>
        </div>
      </div>

      <div>
        <Label className="text-xs">Alinhamento</Label>
        <div className="flex gap-1 mt-1">
          {([{ v: 'left' as const, Icon: AlignLeft }, { v: 'center' as const, Icon: AlignCenter }, { v: 'right' as const, Icon: AlignRight }]).map(({ v, Icon }) => (
            <Button key={v} size="sm" variant={sel.textAlign === v ? 'default' : 'outline'} className="h-8 w-8 p-0" onClick={() => updateEl(sel.id, { textAlign: v })}>
              <Icon className="h-3.5 w-3.5" />
            </Button>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-xs">Transformação</Label>
        <div className="flex gap-1 mt-1">
          {[{ v: 'none' as const, label: 'Aa' }, { v: 'uppercase' as const, label: 'AA' }, { v: 'lowercase' as const, label: 'aa' }].map(({ v, label }) => (
            <Button key={v} size="sm" variant={sel.textTransform === v ? 'default' : 'outline'} className="h-8 px-2 text-xs" onClick={() => updateEl(sel.id, { textTransform: v })}>
              {label}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div>
          <Label className="text-xs flex justify-between">Espaçamento letras <span className="text-muted-foreground">{sel.letterSpacing}px</span></Label>
          <Slider value={[sel.letterSpacing]} onValueChange={([v]) => updateEl(sel.id, { letterSpacing: v })} min={-5} max={20} step={0.5} />
        </div>
        <div>
          <Label className="text-xs flex justify-between">Entrelinha <span className="text-muted-foreground">{sel.lineHeight}</span></Label>
          <Slider value={[sel.lineHeight]} onValueChange={([v]) => updateEl(sel.id, { lineHeight: v })} min={0.8} max={2.5} step={0.05} />
        </div>
        <div>
          <Label className="text-xs flex justify-between">Opacidade <span className="text-muted-foreground">{Math.round(sel.opacity * 100)}%</span></Label>
          <Slider value={[sel.opacity]} onValueChange={([v]) => updateEl(sel.id, { opacity: v })} min={0} max={1} step={0.05} />
        </div>
        <div>
          <Label className="text-xs flex justify-between">Largura <span className="text-muted-foreground">{sel.width}%</span></Label>
          <Slider value={[sel.width]} onValueChange={([v]) => updateEl(sel.id, { width: v })} min={10} max={100} step={1} />
        </div>
      </div>

      <Separator />

      <div>
        <Label className="text-xs">Sombra</Label>
        <Select value={sel.textShadow} onValueChange={v => updateEl(sel.id, { textShadow: v })}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Nenhuma</SelectItem>
            <SelectItem value="0 2px 4px rgba(0,0,0,0.5)">Suave</SelectItem>
            <SelectItem value="0 2px 8px rgba(0,0,0,0.5)">Média</SelectItem>
            <SelectItem value="0 4px 16px rgba(0,0,0,0.8)">Forte</SelectItem>
            <SelectItem value="0 0 20px rgba(212,175,55,0.4)">Brilho Dourado</SelectItem>
            <SelectItem value="0 0 30px rgba(0,180,216,0.4)">Brilho Azul</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Contorno cor</Label>
          <div className="flex items-center gap-1 mt-1">
            <input type="color" value={sel.stroke || '#000000'} onChange={e => updateEl(sel.id, { stroke: e.target.value })} className="w-6 h-6 rounded cursor-pointer border-0" />
            <Input value={sel.stroke} onChange={e => updateEl(sel.id, { stroke: e.target.value })} className="h-7 text-xs flex-1" placeholder="Nenhum" />
          </div>
        </div>
        <div>
          <Label className="text-xs">Espessura</Label>
          <Slider value={[sel.strokeWidth]} onValueChange={([v]) => updateEl(sel.id, { strokeWidth: v })} min={0} max={5} step={0.5} className="mt-2" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-2">
        <div>
          <Label className="text-xs">Posição X</Label>
          <Slider value={[sel.x]} onValueChange={([v]) => updateEl(sel.id, { x: v })} min={0} max={100} step={0.5} />
        </div>
        <div>
          <Label className="text-xs">Posição Y</Label>
          <Slider value={[sel.y]} onValueChange={([v]) => updateEl(sel.id, { y: v })} min={0} max={100} step={0.5} />
        </div>
      </div>
    </div>
  );

  const renderStickerProps = (sel: StickerElement) => (
    <div className="p-3 space-y-3">
      <div>
        <Label className="text-xs">Figurinha</Label>
        <p className="text-sm font-medium mt-1">{STICKER_DEFS.find(s => s.id === sel.sticker)?.name}</p>
      </div>
      <div>
        <Label className="text-xs">Cor</Label>
        <div className="flex items-center gap-2 mt-1">
          <input type="color" value={sel.color} onChange={e => updateEl(sel.id, { color: e.target.value })} className="w-8 h-8 rounded cursor-pointer border-0" />
          <Input value={sel.color} onChange={e => updateEl(sel.id, { color: e.target.value })} className="h-8 text-xs flex-1" />
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          {['#ffffff', '#000000', '#d4af37', '#00b4d8', '#e63946', '#25d366', '#ff6b35', '#7209b7'].map(c => (
            <div key={c} className="w-6 h-6 rounded cursor-pointer border border-border hover:scale-110 transition-transform"
              style={{ background: c }} onClick={() => updateEl(sel.id, { color: c })} />
          ))}
        </div>
      </div>
      <div>
        <Label className="text-xs flex justify-between">Tamanho <span className="text-muted-foreground">{sel.size}%</span></Label>
        <Slider value={[sel.size]} onValueChange={([v]) => updateEl(sel.id, { size: v })} min={3} max={40} step={1} />
      </div>
      <div>
        <Label className="text-xs flex justify-between">Opacidade <span className="text-muted-foreground">{Math.round(sel.opacity * 100)}%</span></Label>
        <Slider value={[sel.opacity]} onValueChange={([v]) => updateEl(sel.id, { opacity: v })} min={0} max={1} step={0.05} />
      </div>
      <div>
        <Label className="text-xs flex justify-between">Rotação <span className="text-muted-foreground">{sel.rotation}°</span></Label>
        <Slider value={[sel.rotation]} onValueChange={([v]) => updateEl(sel.id, { rotation: v })} min={0} max={360} step={1} />
      </div>
      <div className="grid grid-cols-2 gap-2 pt-2">
        <div>
          <Label className="text-xs">Posição X</Label>
          <Slider value={[sel.x]} onValueChange={([v]) => updateEl(sel.id, { x: v })} min={0} max={100} step={0.5} />
        </div>
        <div>
          <Label className="text-xs">Posição Y</Label>
          <Slider value={[sel.y]} onValueChange={([v]) => updateEl(sel.id, { y: v })} min={0} max={100} step={0.5} />
        </div>
      </div>
    </div>
  );

  const renderShapeProps = (sel: ShapeElement) => (
    <div className="p-3 space-y-3">
      <div>
        <Label className="text-xs">Tipo de forma</Label>
        <div className="flex gap-1 mt-1 flex-wrap">
          {([
            { v: 'rectangle' as const, Icon: RectangleVertical, label: 'Ret.' },
            { v: 'square' as const, Icon: Square, label: 'Quad.' },
            { v: 'circle' as const, Icon: Circle, label: 'Circ.' },
            { v: 'line' as const, Icon: Minus, label: 'Linha' },
          ]).map(({ v, Icon, label }) => (
            <Button key={v} size="sm" variant={sel.shape === v ? 'default' : 'outline'} className="h-8 gap-1 text-xs flex-1"
              onClick={() => updateEl(sel.id, {
                shape: v,
                borderRadius: v === 'circle' ? 50 : v === 'line' ? 0 : sel.borderRadius,
                height: v === 'square' ? sel.width : v === 'circle' ? sel.width : v === 'line' ? 0.5 : sel.height,
                width: v === 'line' ? 40 : sel.width,
              })}>
              <Icon className="h-3 w-3" /> {label}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-xs">Cor {sel.shape === 'line' ? 'da linha' : 'de preenchimento'}</Label>
        <div className="flex items-center gap-2 mt-1">
          <input type="color" value={sel.color} onChange={e => updateEl(sel.id, { color: e.target.value })} className="w-8 h-8 rounded cursor-pointer border-0" />
          <Input value={sel.color} onChange={e => updateEl(sel.id, { color: e.target.value })} className="h-8 text-xs flex-1" />
        </div>
      </div>

      <Separator />

      {sel.shape !== 'line' && (
        <>
          <div>
            <Label className="text-xs">Cor da borda</Label>
            <div className="flex items-center gap-2 mt-1">
              <input type="color" value={sel.borderColor === 'transparent' ? '#000000' : sel.borderColor} onChange={e => updateEl(sel.id, { borderColor: e.target.value })} className="w-8 h-8 rounded cursor-pointer border-0" />
              <Input value={sel.borderColor === 'transparent' ? '' : sel.borderColor} onChange={e => updateEl(sel.id, { borderColor: e.target.value || 'transparent' })} className="h-8 text-xs flex-1" placeholder="Nenhuma" />
            </div>
          </div>
          <div>
            <Label className="text-xs flex justify-between">Espessura da borda <span className="text-muted-foreground">{sel.borderWidth}px</span></Label>
            <Slider value={[sel.borderWidth]} onValueChange={([v]) => updateEl(sel.id, { borderWidth: v })} min={0} max={20} step={1} />
          </div>
        </>
      )}

      {sel.shape !== 'circle' && sel.shape !== 'line' && (
        <div>
          <Label className="text-xs flex justify-between">Arredondamento <span className="text-muted-foreground">{sel.borderRadius}px</span></Label>
          <Slider value={[sel.borderRadius]} onValueChange={([v]) => updateEl(sel.id, { borderRadius: v })} min={0} max={200} step={1} />
        </div>
      )}

      <div>
        <Label className="text-xs">Sombra</Label>
        <Select value={sel.shadow || 'none'} onValueChange={v => updateEl(sel.id, { shadow: v })}>
          <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Nenhuma</SelectItem>
            <SelectItem value="0 2px 4px rgba(0,0,0,0.3)">Suave</SelectItem>
            <SelectItem value="0 4px 8px rgba(0,0,0,0.4)">Média</SelectItem>
            <SelectItem value="0 6px 16px rgba(0,0,0,0.6)">Forte</SelectItem>
            <SelectItem value="0 0 15px rgba(255,255,255,0.5)">Brilho Branco</SelectItem>
            <SelectItem value="0 0 15px rgba(212,175,55,0.5)">Brilho Dourado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {sel.shape !== 'line' && (
        <div>
          <Label className="text-xs">Degradê de opacidade</Label>
          <Select value={sel.gradientFade} onValueChange={(v: GradientFade) => updateEl(sel.id, { gradientFade: v })}>
            <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhum</SelectItem>
              <SelectItem value="left-right">Esquerda → Direita</SelectItem>
              <SelectItem value="right-left">Direita → Esquerda</SelectItem>
              <SelectItem value="top-bottom">Cima → Baixo</SelectItem>
              <SelectItem value="bottom-top">Baixo → Cima</SelectItem>
            </SelectContent>
          </Select>
          {sel.gradientFade !== 'none' && (
            <div className="mt-2">
              <Label className="text-xs flex justify-between">Intensidade <span className="text-muted-foreground">{Math.round((sel.gradientFadeIntensity ?? 1) * 100)}%</span></Label>
              <Slider value={[sel.gradientFadeIntensity ?? 1]} onValueChange={([v]) => updateEl(sel.id, { gradientFadeIntensity: v })} min={0.1} max={1} step={0.05} />
            </div>
          )}
        </div>
      )}

      <Separator />

      <div className="space-y-2">
        <div>
          <Label className="text-xs flex justify-between">Largura <span className="text-muted-foreground">{sel.width}%</span></Label>
          <Slider value={[sel.width]} onValueChange={([v]) => {
            const patch: Partial<ShapeElement> = { width: v };
            if (sel.shape === 'square' || sel.shape === 'circle') patch.height = v;
            updateEl(sel.id, patch);
          }} min={2} max={100} step={1} />
        </div>
        {sel.shape === 'rectangle' && (
          <div>
            <Label className="text-xs flex justify-between">Altura <span className="text-muted-foreground">{sel.height}%</span></Label>
            <Slider value={[sel.height]} onValueChange={([v]) => updateEl(sel.id, { height: v })} min={2} max={100} step={1} />
          </div>
        )}
        {sel.shape === 'line' && (
          <div>
            <Label className="text-xs flex justify-between">Espessura <span className="text-muted-foreground">{sel.height}%</span></Label>
            <Slider value={[sel.height]} onValueChange={([v]) => updateEl(sel.id, { height: v })} min={0.1} max={5} step={0.1} />
          </div>
        )}
        <div>
          <Label className="text-xs flex justify-between">Opacidade <span className="text-muted-foreground">{Math.round(sel.opacity * 100)}%</span></Label>
          <Slider value={[sel.opacity]} onValueChange={([v]) => updateEl(sel.id, { opacity: v })} min={0} max={1} step={0.05} />
        </div>
        <div>
          <Label className="text-xs flex justify-between">Rotação <span className="text-muted-foreground">{sel.rotation || 0}°</span></Label>
          <Slider value={[sel.rotation || 0]} onValueChange={([v]) => updateEl(sel.id, { rotation: v })} min={0} max={360} step={1} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-2">
        <div>
          <Label className="text-xs">Posição X</Label>
          <Slider value={[sel.x]} onValueChange={([v]) => updateEl(sel.id, { x: v })} min={0} max={100} step={0.5} />
        </div>
        <div>
          <Label className="text-xs">Posição Y</Label>
          <Slider value={[sel.y]} onValueChange={([v]) => updateEl(sel.id, { y: v })} min={0} max={100} step={0.5} />
        </div>
      </div>
    </div>
  );

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-64px)]">
        <div className="flex items-center justify-between px-4 py-2 border-b bg-card gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" /> Promo Maker
            </h1>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex gap-1">
              {(['1:1', '9:16'] as FormatKey[]).map(f => (
                <Button key={f} variant={format === f ? 'default' : 'outline'} size="sm" onClick={() => setFormat(f)} className="gap-1">
                  {f === '1:1' ? <Square className="h-3.5 w-3.5" /> : <RectangleVertical className="h-3.5 w-3.5" />} {f}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1 mr-2">
              <Button variant="outline" size="sm" onClick={undo} disabled={!canUndo} title="Desfazer (Ctrl+Z)" className="gap-1 h-8 w-8 p-0">
                <Undo2 className="h-3.5 w-3.5" />
              </Button>
              <Button variant="outline" size="sm" onClick={redo} disabled={!canRedo} title="Refazer (Ctrl+Y)" className="gap-1 h-8 w-8 p-0">
                <Redo2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={() => setPreview(preview ? null : 'feed')} className="gap-1">
              <Eye className="h-3.5 w-3.5" /> Preview
            </Button>
            <Button size="sm" onClick={handleExport} className="gap-1">
              <Download className="h-3.5 w-3.5" /> Exportar PNG
            </Button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left panel */}
          <div className="w-80 border-r bg-card flex flex-col overflow-hidden">
            <Tabs defaultValue="layers" className="flex flex-col h-full">
              <TabsList className="w-full rounded-none">
                <TabsTrigger value="layers" className="text-xs flex-1">Camadas</TabsTrigger>
                <TabsTrigger value="templates" className="text-xs flex-1">Templates</TabsTrigger>
              </TabsList>

              <TabsContent value="layers" className="flex-1 overflow-hidden m-0">
                <ScrollArea className="h-full">
                  <div className="p-2 space-y-1">
                    <Button variant="outline" size="sm" className="w-full gap-1 mb-1" onClick={addTextElement}>
                      <Plus className="h-3.5 w-3.5" /> Texto
                    </Button>
                    <div className="flex gap-1 mb-1">
                      <Button variant="outline" size="sm" className="flex-1 gap-1 text-xs" onClick={() => addShapeElement('rectangle')}>
                        <RectangleVertical className="h-3 w-3" /> Ret.
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1 gap-1 text-xs" onClick={() => addShapeElement('square')}>
                        <Square className="h-3 w-3" /> Quad.
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1 gap-1 text-xs" onClick={() => addShapeElement('circle')}>
                        <Circle className="h-3 w-3" /> Circ.
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1 gap-1 text-xs" onClick={() => addShapeElement('line')}>
                        <Minus className="h-3 w-3" /> Linha
                      </Button>
                    </div>
                    <div className="mb-2">
                      <Label className="text-[10px] text-muted-foreground mb-1 block">Figurinhas</Label>
                      <div className="flex gap-1 flex-wrap">
                        {STICKER_DEFS.map(s => (
                          <Button key={s.id} variant="outline" size="sm" className="gap-1 text-xs h-8" onClick={() => addStickerElement(s.id)} title={s.name}>
                            <s.Icon className="h-3.5 w-3.5" />
                          </Button>
                        ))}
                      </div>
                    </div>
                    {[...elements].reverse().map(el => (
                      <div
                        key={el.id}
                        className={`flex items-center gap-1 p-1.5 rounded text-xs cursor-pointer transition-colors ${
                          selectedId === el.id || selectedIds.includes(el.id) ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted'
                        }`}
                        onClick={(e) => {
                          if (e.ctrlKey || e.metaKey) {
                            setSelectedIds(prev => {
                              const current = prev.length > 0 ? prev : (selectedId ? [selectedId] : []);
                              if (current.includes(el.id)) {
                                const next = current.filter(id => id !== el.id);
                                setSelectedId(next.length >= 1 ? next[next.length - 1] : null);
                                return next;
                              }
                              setSelectedId(el.id);
                              return [...current.filter(id => id !== el.id), el.id];
                            });
                          } else {
                            setSelectedId(el.id);
                            setSelectedIds([]);
                          }
                        }}
                      >
                        {el.type === 'text' ? (
                          <Type className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        ) : el.type === 'sticker' ? (
                          <Sticker className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        ) : el.shape === 'line' ? (
                          <Minus className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        ) : el.shape === 'circle' ? (
                          <Circle className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        ) : (
                          <Square className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        )}
                        <span className="truncate flex-1 text-foreground">
                          {el.type === 'text' ? el.content.slice(0, 16) : el.type === 'sticker' ? (STICKER_DEFS.find(s => s.id === el.sticker)?.name || 'Figurinha') : el.shape === 'rectangle' ? 'Retângulo' : el.shape === 'square' ? 'Quadrado' : el.shape === 'line' ? 'Linha' : 'Círculo'}
                        </span>
                        <div className="flex gap-0.5">
                          <button onClick={(e) => { e.stopPropagation(); updateEl(el.id, { locked: !el.locked }); }} className="p-0.5 hover:bg-muted rounded">
                            {el.locked ? <Lock className="h-3 w-3 text-muted-foreground" /> : <Unlock className="h-3 w-3 text-muted-foreground" />}
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); moveLayer(el.id, 'up'); }} className="p-0.5 hover:bg-muted rounded">
                            <ChevronUp className="h-3 w-3 text-muted-foreground" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); moveLayer(el.id, 'down'); }} className="p-0.5 hover:bg-muted rounded">
                            <ChevronDown className="h-3 w-3 text-muted-foreground" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); duplicateElement(el.id); }} className="p-0.5 hover:bg-muted rounded">
                            <Copy className="h-3 w-3 text-muted-foreground" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); deleteElement(el.id); }} className="p-0.5 hover:bg-muted rounded text-destructive">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="templates" className="flex-1 overflow-hidden m-0">
                <ScrollArea className="h-full">
                  <div className="p-2 space-y-2">
                    {/* Save current */}
                    <div className="p-2 border border-dashed border-border rounded-md space-y-1.5">
                      <Label className="text-xs font-semibold">Salvar como template</Label>
                      <div className="flex gap-1">
                        <Input
                          value={saveTemplateName}
                          onChange={e => setSaveTemplateName(e.target.value)}
                          placeholder="Nome do template"
                          className="h-8 text-xs flex-1"
                        />
                        <Button size="sm" className="h-8 gap-1 text-xs" onClick={saveCurrentAsTemplate}>
                          <Save className="h-3 w-3" /> Salvar
                        </Button>
                      </div>
                    </div>

                    <Separator />
                    <Label className="text-xs text-muted-foreground">Templates padrão</Label>

                    {TEMPLATES.map((tpl, i) => (
                      <Card key={i} className="p-3 cursor-pointer hover:ring-2 ring-primary/50 transition-all" onClick={() => applyTemplate(tpl)}>
                        <div className="h-16 rounded mb-2" style={{ background: tpl.bg }} />
                        <p className="text-xs font-medium text-foreground">{tpl.name}</p>
                      </Card>
                    ))}

                    {savedTemplates.length > 0 && (
                      <>
                        <Separator />
                        <Label className="text-xs text-muted-foreground">Meus templates salvos</Label>
                        {savedTemplates.map((tpl, i) => (
                          <Card key={`saved-${i}`} className="p-3 cursor-pointer hover:ring-2 ring-primary/50 transition-all relative group/tpl">
                            <div onClick={() => applySavedTemplate(tpl)}>
                              <div className="h-16 rounded mb-2" style={{ background: tpl.bgGradient || tpl.bg }} />
                              <p className="text-xs font-medium text-foreground">{tpl.name}</p>
                              <p className="text-[10px] text-muted-foreground">{tpl.format} • {tpl.elements.length} elementos</p>
                            </div>
                            <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover/tpl:opacity-100 transition-opacity z-10">
                              <button
                                onClick={(e) => { e.stopPropagation(); overwriteSavedTemplate(i); }}
                                className="p-1 rounded bg-primary text-primary-foreground hover:bg-primary/80"
                                title="Salvar alterações neste template"
                              >
                                <Save className="h-3 w-3" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); deleteSavedTemplate(i); }}
                                className="p-1 rounded bg-destructive text-destructive-foreground hover:bg-destructive/80"
                                title="Excluir template"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </Card>
                        ))}
                      </>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>

          {/* Center — canvas */}
          <div className="flex-1 flex items-center justify-center bg-muted/30 overflow-auto p-4">
            {preview ? (
              <div className="flex flex-col items-center gap-3">
                <div className="flex gap-2">
                  {(['feed', 'stories', 'whatsapp'] as const).map(p => (
                    <Button key={p} size="sm" variant={preview === p ? 'default' : 'outline'} onClick={() => setPreview(p)} className="text-xs capitalize">
                      {p === 'feed' ? '📱 Feed' : p === 'stories' ? '📖 Stories' : '💬 WhatsApp'}
                    </Button>
                  ))}
                  <Button size="sm" variant="ghost" onClick={() => setPreview(null)}>✕</Button>
                </div>
                <div className={`bg-black rounded-2xl overflow-hidden shadow-2xl ${
                  preview === 'stories' ? 'w-[280px]' : preview === 'whatsapp' ? 'w-[300px]' : 'w-[320px]'
                }`}>
                  <div className="p-2 flex items-center gap-2 text-white text-xs">
                    <div className="w-6 h-6 rounded-full bg-gray-700" />
                    <span className="font-medium">vortexviagens</span>
                  </div>
                  <div style={{ width: '100%', aspectRatio: format === '9:16' ? '9/16' : '1/1', overflow: 'hidden' }}>
                    {renderCanvas()}
                  </div>
                  {preview === 'feed' && (
                    <div className="p-2 text-white text-xs space-y-1">
                      <div className="flex gap-3">❤️ 💬 📤</div>
                      <p><b>vortexviagens</b> Confira nossa oferta! ✈️</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ width: canvasSize.w * scale, height: canvasSize.h * scale }} className="shadow-2xl rounded-lg overflow-hidden">
                {renderCanvas()}
              </div>
            )}
          </div>

          {/* Right panel */}
          <div className="w-96 border-l bg-card overflow-hidden flex flex-col">
            <Tabs value={rightTab} onValueChange={setRightTab} className="flex flex-col h-full">
              <TabsList className="w-full rounded-none">
                <TabsTrigger value="element" className="text-xs flex-1">Elemento</TabsTrigger>
                <TabsTrigger value="bg" className="text-xs flex-1">Fundo</TabsTrigger>
                <TabsTrigger value="image" className="text-xs flex-1">Imagem</TabsTrigger>
              </TabsList>

              <TabsContent value="element" className="flex-1 overflow-hidden m-0">
                <ScrollArea className="h-full">
                  {selectedIds.length >= 2 ? (
                     <div className="p-3 space-y-3">
                      <div className="text-sm font-medium text-foreground">{selectedIds.length} elementos selecionados</div>
                      <p className="text-xs text-muted-foreground">Segure Ctrl e clique para selecionar múltiplos elementos</p>
                      <Separator />

                      {/* Group position X/Y */}
                      <Label className="text-xs font-semibold">Posição do grupo</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[10px] text-muted-foreground">X</Label>
                          <Input
                            type="number"
                            className="h-7 text-xs"
                            value={Math.round(Math.min(...getMultiSelectedElements().map(e => e.x)))}
                            onChange={(e) => {
                              const els = getMultiSelectedElements();
                              if (els.length < 2) return;
                              const minX = Math.min(...els.map(el => el.x));
                              const delta = Number(e.target.value) - minX;
                              setElements(prev => prev.map(el =>
                                selectedIds.includes(el.id) ? { ...el, x: el.x + delta } as CanvasElement : el
                              ));
                            }}
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Y</Label>
                          <Input
                            type="number"
                            className="h-7 text-xs"
                            value={Math.round(Math.min(...getMultiSelectedElements().map(e => e.y)))}
                            onChange={(e) => {
                              const els = getMultiSelectedElements();
                              if (els.length < 2) return;
                              const minY = Math.min(...els.map(el => el.y));
                              const delta = Number(e.target.value) - minY;
                              setElements(prev => prev.map(el =>
                                selectedIds.includes(el.id) ? { ...el, y: el.y + delta } as CanvasElement : el
                              ));
                            }}
                          />
                        </div>
                      </div>
                      <Separator />

                      <Label className="text-xs font-semibold">Alinhamento de posição</Label>
                      <div className="flex gap-1 mb-2">
                        <Button variant="outline" size="sm" className="flex-1 gap-1 text-xs" onClick={() => {
                          const els = getMultiSelectedElements();
                          if (els.length < 2) return;
                          const minX = Math.min(...els.map(e => e.x));
                          setElements(prev => prev.map(e => selectedIds.includes(e.id) ? { ...e, x: minX } as CanvasElement : e));
                          toast.success('Alinhados à esquerda.');
                        }}>
                          <AlignLeft className="h-3.5 w-3.5" /> Esq
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1 gap-1 text-xs" onClick={() => {
                          const els = getMultiSelectedElements();
                          if (els.length < 2) return;
                          const minX = Math.min(...els.map(e => e.x));
                          const maxX = Math.max(...els.map(e => e.x));
                          const centerX = (minX + maxX) / 2;
                          setElements(prev => prev.map(e => selectedIds.includes(e.id) ? { ...e, x: centerX } as CanvasElement : e));
                          toast.success('Alinhados ao centro.');
                        }}>
                          <AlignCenter className="h-3.5 w-3.5" /> Centro
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1 gap-1 text-xs" onClick={() => {
                          const els = getMultiSelectedElements();
                          if (els.length < 2) return;
                          const maxX = Math.max(...els.map(e => e.x));
                          setElements(prev => prev.map(e => selectedIds.includes(e.id) ? { ...e, x: maxX } as CanvasElement : e));
                          toast.success('Alinhados à direita.');
                        }}>
                          <AlignRight className="h-3.5 w-3.5" /> Dir
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <Button variant={alignMode === 'horizontal' ? 'default' : 'outline'} size="sm" className="w-full gap-2 justify-start text-xs" onClick={alignHorizontally}>
                          <AlignHorizontalDistributeCenter className="h-4 w-4" />
                          Alinhar horizontalmente (mesmo Y)
                        </Button>
                        <Button variant={alignMode === 'vertical' ? 'default' : 'outline'} size="sm" className="w-full gap-2 justify-start text-xs" onClick={alignVertically}>
                          <AlignVerticalDistributeCenter className="h-4 w-4" />
                          Alinhar verticalmente (mesmo X)
                        </Button>
                      </div>
                      {alignMode !== 'none' && (
                        <>
                          <Separator />
                          <div>
                            <Label className="text-xs font-semibold flex justify-between">
                              Espaçamento entre elementos
                              <span className="text-muted-foreground">{alignSpacing}%</span>
                            </Label>
                            <p className="text-[10px] text-muted-foreground mb-2">
                              {alignMode === 'horizontal' ? 'Distância horizontal entre cada elemento' : 'Distância vertical entre cada elemento'}
                            </p>
                            <Slider
                              value={[alignSpacing]}
                              onValueChange={([v]) => applySpacing(v)}
                              min={0}
                              max={30}
                              step={0.5}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  ) : selected ? (
                    selected.type === 'text' ? renderTextProps(selected) : selected.type === 'sticker' ? renderStickerProps(selected) : renderShapeProps(selected)
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm p-4">
                      <Type className="h-8 w-8 mb-2 opacity-40" />
                      <p>Selecione um elemento no canvas ou nas camadas</p>
                      <p className="text-xs mt-1 text-muted-foreground">Ctrl+clique para selecionar múltiplos</p>
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="bg" className="flex-1 overflow-hidden m-0">
                <ScrollArea className="h-full">
                  <div className="p-3 space-y-3">
                    <div>
                      <Label className="text-xs">Cor de fundo</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <input type="color" value={bgColor} onChange={e => { setBgColor(e.target.value); setBgGradient(''); }} className="w-8 h-8 rounded cursor-pointer border-0" />
                        <Input value={bgColor} onChange={e => { setBgColor(e.target.value); setBgGradient(''); }} className="h-8 text-xs" />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Gradiente</Label>
                      <div className="grid grid-cols-2 gap-1 mt-1">
                        {[
                          '', 'linear-gradient(135deg, #0d1b2a 0%, #1b2838 100%)',
                          'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                          'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                          'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                          'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                          'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
                        ].map((g, i) => (
                          <div key={i} className={`h-8 rounded cursor-pointer border-2 transition-all ${bgGradient === g ? 'border-primary scale-105' : 'border-transparent'}`}
                            style={{ background: g || bgColor }} onClick={() => setBgGradient(g)} />
                        ))}
                      </div>
                    </div>
                    <Separator />
                    <div>
                      <Label className="text-xs mb-1 block">Cores Rápidas</Label>
                      <div className="flex flex-wrap gap-1">
                        {['#0d1b2a', '#1a1a2e', '#16213e', '#1a1a1a', '#ffffff', '#0f3460', '#533483', '#2b2d42'].map(c => (
                          <div key={c} className="w-7 h-7 rounded cursor-pointer border border-border hover:scale-110 transition-transform"
                            style={{ background: c }} onClick={() => { setBgColor(c); setBgGradient(''); }} />
                        ))}
                      </div>
                    </div>
                    <Separator />
                    <div>
                      <Label className="text-xs font-semibold mb-1 block">Logo</Label>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Checkbox checked={showLogo} onCheckedChange={(v) => setShowLogo(!!v)} id="show-logo" />
                          <Label htmlFor="show-logo" className="text-xs cursor-pointer">Exibir logo</Label>
                        </div>
                        {showLogo && (
                          <>
                            <div>
                              <Label className="text-xs">Tamanho ({logoSize}%)</Label>
                              <Slider min={3} max={25} step={1} value={[logoSize]} onValueChange={([v]) => setLogoSize(v)} className="mt-1" />
                            </div>
                            <div>
                              <Label className="text-xs">Opacidade ({Math.round(logoOpacity * 100)}%)</Label>
                              <Slider min={0.1} max={1} step={0.05} value={[logoOpacity]} onValueChange={([v]) => setLogoOpacity(v)} className="mt-1" />
                            </div>
                            <div>
                              <Label className="text-xs">Cor da logo</Label>
                              <div className="flex items-center gap-2 mt-1">
                                <Select value={logoColor || 'original'} onValueChange={v => setLogoColor(v === 'original' ? '' : v)}>
                                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="original">Original (branca)</SelectItem>
                                    <SelectItem value="#000000">Preto</SelectItem>
                                    <SelectItem value="#d4af37">Dourado</SelectItem>
                                    <SelectItem value="#ffffff">Branco</SelectItem>
                                    <SelectItem value="#00b4d8">Azul</SelectItem>
                                    <SelectItem value="#e63946">Vermelho</SelectItem>
                                    <SelectItem value="custom">Personalizada</SelectItem>
                                  </SelectContent>
                                </Select>
                                {logoColor === 'custom' && (
                                  <input type="color" value="#d4af37" onChange={e => setLogoColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0" />
                                )}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="image" className="flex-1 overflow-hidden m-0">
                <ScrollArea className="h-full">
                  <div className="p-3 space-y-3">
                    <div>
                      <Label className="text-xs">Imagem de fundo</Label>
                      <input ref={fileRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                      <div className="flex gap-1 mt-1">
                        <Button variant="outline" size="sm" className="gap-1 flex-1 text-xs" onClick={() => fileRef.current?.click()}>
                          <ImageIcon className="h-3.5 w-3.5" /> Upload
                        </Button>
                        {image.url && (
                          <Button variant="ghost" size="sm" className="text-xs text-destructive" onClick={() => setImage(defaultImage)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                      <div className="mt-1">
                        <Label className="text-xs">Ou cole a URL</Label>
                        <Input placeholder="https://..." className="h-8 text-xs mt-1" onBlur={e => { if (e.target.value) setImage(prev => ({ ...prev, url: e.target.value })); }} />
                      </div>
                    </div>
                    {image.url && (
                      <>
                        {/* Image in shape checkbox */}
                        <div className="space-y-2 pt-1">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id="img-in-shape"
                              checked={imageInShape}
                              onCheckedChange={(checked) => {
                                setImageInShape(!!checked);
                                if (!checked) setImageShapeId('');
                              }}
                            />
                            <Label htmlFor="img-in-shape" className="text-xs cursor-pointer">
                              Imagem dentro de uma forma?
                            </Label>
                          </div>
                          {imageInShape && (
                            <Select value={imageShapeId} onValueChange={setImageShapeId}>
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Selecione a forma..." />
                              </SelectTrigger>
                              <SelectContent>
                                {shapeElements.length === 0 ? (
                                  <SelectItem value="__none" disabled>Nenhuma forma criada</SelectItem>
                                ) : (
                                  shapeElements.map(s => (
                                    <SelectItem key={s.id} value={s.id}>
                                      {s.shape === 'rectangle' ? 'Retângulo' : s.shape === 'square' ? 'Quadrado' : 'Círculo'} ({s.id})
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                        <Separator />
                        <div className="space-y-2">
                          <div>
                            <Label className="text-xs flex justify-between">Zoom <span className="text-muted-foreground">{Math.round(image.zoom * 100)}%</span></Label>
                            <Slider value={[image.zoom]} onValueChange={([v]) => setImage(p => ({ ...p, zoom: v }))} min={1} max={3} step={0.05} />
                          </div>
                          <div>
                            <Label className="text-xs flex justify-between">Brilho <span className="text-muted-foreground">{Math.round(image.brightness * 100)}%</span></Label>
                            <Slider value={[image.brightness]} onValueChange={([v]) => setImage(p => ({ ...p, brightness: v }))} min={0.2} max={2} step={0.05} />
                          </div>
                          <div>
                            <Label className="text-xs flex justify-between">Contraste <span className="text-muted-foreground">{Math.round(image.contrast * 100)}%</span></Label>
                            <Slider value={[image.contrast]} onValueChange={([v]) => setImage(p => ({ ...p, contrast: v }))} min={0.2} max={2} step={0.05} />
                          </div>
                          <div>
                            <Label className="text-xs flex justify-between">Saturação <span className="text-muted-foreground">{Math.round(image.saturate * 100)}%</span></Label>
                            <Slider value={[image.saturate]} onValueChange={([v]) => setImage(p => ({ ...p, saturate: v }))} min={0} max={3} step={0.05} />
                          </div>
                          <div>
                            <Label className="text-xs flex justify-between">Desfoque <span className="text-muted-foreground">{image.blur}px</span></Label>
                            <Slider value={[image.blur]} onValueChange={([v]) => setImage(p => ({ ...p, blur: v }))} min={0} max={10} step={0.5} />
                          </div>
                        </div>
                        <Separator />
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">Pos. Horizontal</Label>
                            <Slider value={[image.offsetX]} onValueChange={([v]) => setImage(p => ({ ...p, offsetX: v }))} min={-50} max={50} step={1} />
                          </div>
                          <div>
                            <Label className="text-xs">Pos. Vertical</Label>
                            <Slider value={[image.offsetY]} onValueChange={([v]) => setImage(p => ({ ...p, offsetY: v }))} min={-50} max={50} step={1} />
                          </div>
                        </div>
                        <Separator />
                        <div>
                          <Label className="text-xs">Overlay</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <input type="color" value={image.overlayColor} onChange={e => setImage(p => ({ ...p, overlayColor: e.target.value }))} className="w-6 h-6 rounded cursor-pointer border-0" />
                            <div className="flex-1">
                              <Slider value={[image.overlayOpacity]} onValueChange={([v]) => setImage(p => ({ ...p, overlayOpacity: v }))} min={0} max={0.9} step={0.05} />
                            </div>
                            <span className="text-xs text-muted-foreground w-8">{Math.round(image.overlayOpacity * 100)}%</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}