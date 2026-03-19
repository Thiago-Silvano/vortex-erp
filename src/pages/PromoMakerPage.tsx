import { useState, useRef, useCallback, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { toPng } from 'html-to-image';
import {
  Download, Image as ImageIcon, Type, Palette, RotateCcw, Eye,
  AlignLeft, AlignCenter, AlignRight, Bold, Italic, Layers, Smartphone,
  Square, RectangleVertical, Plus, Trash2, Move, ZoomIn, ZoomOut, Sun,
  GripVertical, ChevronUp, ChevronDown, Copy, Lock, Unlock,
} from 'lucide-react';
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

const TEMPLATES = [
  {
    name: 'Oferta Viagem',
    bg: '#0d1b2a',
    elements: [
      { id: '1', type: 'text' as const, content: 'PROMOÇÃO', x: 50, y: 8, fontSize: 48, fontFamily: 'Bebas Neue', fontWeight: '400', color: '#d4af37', textAlign: 'center' as const, letterSpacing: 8, lineHeight: 1.1, textTransform: 'uppercase' as const, opacity: 1, textShadow: 'none', stroke: '', strokeWidth: 0, locked: false, width: 80 },
      { id: '2', type: 'text' as const, content: 'Cancún', x: 50, y: 22, fontSize: 72, fontFamily: 'Playfair Display', fontWeight: '700', color: '#ffffff', textAlign: 'center' as const, letterSpacing: 2, lineHeight: 1, textTransform: 'none' as const, opacity: 1, textShadow: '0 2px 8px rgba(0,0,0,0.5)', stroke: '', strokeWidth: 0, locked: false, width: 80 },
      { id: '3', type: 'text' as const, content: '7 noites com aéreo', x: 50, y: 35, fontSize: 24, fontFamily: 'Inter', fontWeight: '300', color: '#e0e0e0', textAlign: 'center' as const, letterSpacing: 1, lineHeight: 1.4, textTransform: 'none' as const, opacity: 0.9, textShadow: 'none', stroke: '', strokeWidth: 0, locked: false, width: 80 },
      { id: '4', type: 'text' as const, content: 'a partir de', x: 50, y: 55, fontSize: 18, fontFamily: 'Inter', fontWeight: '400', color: '#aaa', textAlign: 'center' as const, letterSpacing: 0, lineHeight: 1.4, textTransform: 'none' as const, opacity: 1, textShadow: 'none', stroke: '', strokeWidth: 0, locked: false, width: 80 },
      { id: '5', type: 'text' as const, content: 'R$ 4.990', x: 50, y: 65, fontSize: 64, fontFamily: 'Montserrat', fontWeight: '800', color: '#d4af37', textAlign: 'center' as const, letterSpacing: 0, lineHeight: 1, textTransform: 'none' as const, opacity: 1, textShadow: '0 2px 12px rgba(212,175,55,0.3)', stroke: '', strokeWidth: 0, locked: false, width: 80 },
      { id: '6', type: 'text' as const, content: 'ou 10x de R$ 549', x: 50, y: 78, fontSize: 20, fontFamily: 'Inter', fontWeight: '400', color: '#ccc', textAlign: 'center' as const, letterSpacing: 0, lineHeight: 1.4, textTransform: 'none' as const, opacity: 0.8, textShadow: 'none', stroke: '', strokeWidth: 0, locked: false, width: 80 },
      { id: '7', type: 'text' as const, content: 'Vortex Viagens', x: 50, y: 90, fontSize: 16, fontFamily: 'Inter', fontWeight: '600', color: '#d4af37', textAlign: 'center' as const, letterSpacing: 2, lineHeight: 1, textTransform: 'uppercase' as const, opacity: 0.7, textShadow: 'none', stroke: '', strokeWidth: 0, locked: false, width: 80 },
    ],
  },
  {
    name: 'Pacote Resort',
    bg: '#1a1a2e',
    elements: [
      { id: '1', type: 'text' as const, content: '🏖️ ALL INCLUSIVE', x: 50, y: 10, fontSize: 36, fontFamily: 'Oswald', fontWeight: '600', color: '#00b4d8', textAlign: 'center' as const, letterSpacing: 4, lineHeight: 1.2, textTransform: 'uppercase' as const, opacity: 1, textShadow: 'none', stroke: '', strokeWidth: 0, locked: false, width: 80 },
      { id: '2', type: 'text' as const, content: 'Punta Cana', x: 50, y: 25, fontSize: 64, fontFamily: 'Abril Fatface', fontWeight: '400', color: '#ffffff', textAlign: 'center' as const, letterSpacing: 1, lineHeight: 1, textTransform: 'none' as const, opacity: 1, textShadow: '0 4px 16px rgba(0,0,0,0.4)', stroke: '', strokeWidth: 0, locked: false, width: 85 },
      { id: '3', type: 'text' as const, content: 'Hotel 5★ + Aéreo + Traslado', x: 50, y: 40, fontSize: 22, fontFamily: 'Quicksand', fontWeight: '500', color: '#e0e0e0', textAlign: 'center' as const, letterSpacing: 0, lineHeight: 1.4, textTransform: 'none' as const, opacity: 0.85, textShadow: 'none', stroke: '', strokeWidth: 0, locked: false, width: 85 },
      { id: '4', type: 'text' as const, content: 'R$ 6.490', x: 50, y: 60, fontSize: 72, fontFamily: 'Montserrat', fontWeight: '900', color: '#00b4d8', textAlign: 'center' as const, letterSpacing: -2, lineHeight: 1, textTransform: 'none' as const, opacity: 1, textShadow: '0 0 30px rgba(0,180,216,0.3)', stroke: '', strokeWidth: 0, locked: false, width: 80 },
      { id: '5', type: 'text' as const, content: 'por pessoa', x: 50, y: 74, fontSize: 18, fontFamily: 'Inter', fontWeight: '400', color: '#999', textAlign: 'center' as const, letterSpacing: 2, lineHeight: 1, textTransform: 'uppercase' as const, opacity: 0.7, textShadow: 'none', stroke: '', strokeWidth: 0, locked: false, width: 80 },
      { id: '6', type: 'text' as const, content: '📲 Fale conosco', x: 50, y: 88, fontSize: 20, fontFamily: 'Inter', fontWeight: '600', color: '#25d366', textAlign: 'center' as const, letterSpacing: 0, lineHeight: 1, textTransform: 'none' as const, opacity: 1, textShadow: 'none', stroke: '', strokeWidth: 0, locked: false, width: 80 },
    ],
  },
];

const defaultImage: ImageConfig = {
  url: '',
  zoom: 1,
  brightness: 1,
  contrast: 1,
  saturate: 1,
  blur: 0,
  offsetX: 0,
  offsetY: 0,
  overlayColor: '#000000',
  overlayOpacity: 0.4,
};

let idCounter = 100;
const genId = () => String(++idCounter);

export default function PromoMakerPage() {
  const [format, setFormat] = useState<FormatKey>('1:1');
  const [bgColor, setBgColor] = useState('#0d1b2a');
  const [bgGradient, setBgGradient] = useState('');
  const [elements, setElements] = useState<TextElement[]>(TEMPLATES[0].elements);
  const [image, setImage] = useState<ImageConfig>(defaultImage);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [preview, setPreview] = useState<'feed' | 'stories' | 'whatsapp' | null>(null);
  const [dragInfo, setDragInfo] = useState<{ id: string; startX: number; startY: number; elX: number; elY: number } | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Load Google Fonts
  useEffect(() => {
    const link = document.createElement('link');
    link.href = `https://fonts.googleapis.com/css2?${GOOGLE_FONTS.map(f => `family=${f.replace(/ /g, '+')}:wght@300;400;500;600;700;800;900`).join('&')}&display=swap`;
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

  const selected = elements.find(e => e.id === selectedId) || null;
  const canvasSize = FORMAT_SIZES[format];
  const scale = format === '9:16' ? Math.min(380 / canvasSize.w, 650 / canvasSize.h) : 380 / canvasSize.w;

  const updateEl = (id: string, patch: Partial<TextElement>) => {
    setElements(prev => prev.map(e => e.id === id ? { ...e, ...patch } : e));
  };

  const addTextElement = () => {
    const newEl: TextElement = {
      id: genId(), type: 'text', content: 'Novo texto', x: 50, y: 50,
      fontSize: 28, fontFamily: 'Inter', fontWeight: '600', color: '#ffffff',
      textAlign: 'center', letterSpacing: 0, lineHeight: 1.3,
      textTransform: 'none', opacity: 1, textShadow: 'none',
      stroke: '', strokeWidth: 0, locked: false, width: 80,
    };
    setElements(prev => [...prev, newEl]);
    setSelectedId(newEl.id);
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImage(prev => ({ ...prev, url: reader.result as string }));
    reader.readAsDataURL(file);
  };

  // Drag handling
  const handleCanvasMouseDown = (e: React.MouseEvent, elId: string) => {
    const el = elements.find(x => x.id === elId);
    if (!el || el.locked) return;
    e.stopPropagation();
    setSelectedId(elId);
    setDragInfo({ id: elId, startX: e.clientX, startY: e.clientY, elX: el.x, elY: el.y });
  };

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragInfo || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const dx = ((e.clientX - dragInfo.startX) / rect.width) * 100;
    const dy = ((e.clientY - dragInfo.startY) / rect.height) * 100;
    updateEl(dragInfo.id, {
      x: Math.max(0, Math.min(100, dragInfo.elX + dx)),
      y: Math.max(0, Math.min(100, dragInfo.elY + dy)),
    });
  }, [dragInfo]);

  const handleCanvasMouseUp = useCallback(() => setDragInfo(null), []);

  // Export
  const handleExport = async () => {
    if (!canvasRef.current) return;
    try {
      const dataUrl = await toPng(canvasRef.current, {
        width: canvasSize.w,
        height: canvasSize.h,
        pixelRatio: 1,
        style: { transform: 'none', width: `${canvasSize.w}px`, height: `${canvasSize.h}px` },
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
        width: canvasSize.w,
        height: canvasSize.h,
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        background: bgGradient || bgColor,
      }}
      onMouseMove={handleCanvasMouseMove}
      onMouseUp={handleCanvasMouseUp}
      onMouseLeave={handleCanvasMouseUp}
      onClick={() => setSelectedId(null)}
    >
      {/* Background image */}
      {image.url && (
        <>
          <img
            src={image.url}
            alt=""
            className="absolute inset-0 w-full h-full pointer-events-none"
            draggable={false}
            style={{
              objectFit: 'cover',
              objectPosition: `${50 + image.offsetX}% ${50 + image.offsetY}%`,
              transform: `scale(${image.zoom})`,
              filter: `brightness(${image.brightness}) contrast(${image.contrast}) saturate(${image.saturate}) blur(${image.blur}px)`,
            }}
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ backgroundColor: image.overlayColor, opacity: image.overlayOpacity }}
          />
        </>
      )}

      {/* Text elements */}
      {elements.map(el => (
        <div
          key={el.id}
          className={`absolute cursor-move ${selectedId === el.id ? 'ring-2 ring-blue-500 ring-offset-1' : ''}`}
          style={{
            left: `${el.x}%`,
            top: `${el.y}%`,
            transform: 'translate(-50%, -50%)',
            width: `${el.width}%`,
            fontFamily: `'${el.fontFamily}', sans-serif`,
            fontSize: `${el.fontSize}px`,
            fontWeight: el.fontWeight,
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
          onClick={(e) => { e.stopPropagation(); setSelectedId(el.id); }}
        >
          {el.content}
        </div>
      ))}

      {/* Logo */}
      <img
        src="/images/vortex-logo-white.png"
        alt="Vortex"
        className="absolute pointer-events-none"
        style={{
          bottom: '3%', right: '3%', height: '8%', opacity: 0.6,
        }}
        draggable={false}
      />
    </div>
  );

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-64px)]">
        {/* Top toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b bg-card gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              Promo Maker
            </h1>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex gap-1">
              {(['1:1', '9:16'] as FormatKey[]).map(f => (
                <Button
                  key={f}
                  variant={format === f ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFormat(f)}
                  className="gap-1"
                >
                  {f === '1:1' ? <Square className="h-3.5 w-3.5" /> : <RectangleVertical className="h-3.5 w-3.5" />}
                  {f}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPreview(preview ? null : 'feed')} className="gap-1">
              <Eye className="h-3.5 w-3.5" /> Preview
            </Button>
            <Button size="sm" onClick={handleExport} className="gap-1">
              <Download className="h-3.5 w-3.5" /> Exportar PNG
            </Button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left panel — layers & templates */}
          <div className="w-56 border-r bg-card flex flex-col overflow-hidden">
            <Tabs defaultValue="layers" className="flex flex-col h-full">
              <TabsList className="w-full rounded-none">
                <TabsTrigger value="layers" className="text-xs flex-1">Camadas</TabsTrigger>
                <TabsTrigger value="templates" className="text-xs flex-1">Templates</TabsTrigger>
              </TabsList>

              <TabsContent value="layers" className="flex-1 overflow-hidden m-0">
                <ScrollArea className="h-full">
                  <div className="p-2 space-y-1">
                    <Button variant="outline" size="sm" className="w-full gap-1 mb-2" onClick={addTextElement}>
                      <Plus className="h-3.5 w-3.5" /> Adicionar Texto
                    </Button>
                    {[...elements].reverse().map(el => (
                      <div
                        key={el.id}
                        className={`flex items-center gap-1 p-1.5 rounded text-xs cursor-pointer transition-colors ${
                          selectedId === el.id ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted'
                        }`}
                        onClick={() => setSelectedId(el.id)}
                      >
                        <Type className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <span className="truncate flex-1 text-foreground">{el.content.slice(0, 18)}</span>
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
                    {TEMPLATES.map((tpl, i) => (
                      <Card
                        key={i}
                        className="p-3 cursor-pointer hover:ring-2 ring-primary/50 transition-all"
                        onClick={() => applyTemplate(tpl)}
                      >
                        <div className="h-16 rounded mb-2" style={{ background: tpl.bg }} />
                        <p className="text-xs font-medium text-foreground">{tpl.name}</p>
                      </Card>
                    ))}
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
              <div
                style={{
                  width: canvasSize.w * scale,
                  height: canvasSize.h * scale,
                }}
                className="shadow-2xl rounded-lg overflow-hidden"
              >
                {renderCanvas()}
              </div>
            )}
          </div>

          {/* Right panel — properties */}
          <div className="w-72 border-l bg-card overflow-hidden flex flex-col">
            <Tabs defaultValue="element" className="flex flex-col h-full">
              <TabsList className="w-full rounded-none">
                <TabsTrigger value="element" className="text-xs flex-1">Elemento</TabsTrigger>
                <TabsTrigger value="bg" className="text-xs flex-1">Fundo</TabsTrigger>
                <TabsTrigger value="image" className="text-xs flex-1">Imagem</TabsTrigger>
              </TabsList>

              {/* Element tab */}
              <TabsContent value="element" className="flex-1 overflow-hidden m-0">
                <ScrollArea className="h-full">
                  {selected ? (
                    <div className="p-3 space-y-3">
                      <div>
                        <Label className="text-xs">Texto</Label>
                        <textarea
                          value={selected.content}
                          onChange={e => updateEl(selected.id, { content: e.target.value })}
                          className="w-full mt-1 rounded-md border border-input bg-background px-2 py-1.5 text-sm min-h-[60px] resize-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Fonte</Label>
                          <Select value={selected.fontFamily} onValueChange={v => updateEl(selected.id, { fontFamily: v })}>
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
                          <Input
                            type="number"
                            value={selected.fontSize}
                            onChange={e => updateEl(selected.id, { fontSize: Number(e.target.value) })}
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Peso</Label>
                          <Select value={selected.fontWeight} onValueChange={v => updateEl(selected.id, { fontWeight: v })}>
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
                            <input
                              type="color"
                              value={selected.color}
                              onChange={e => updateEl(selected.id, { color: e.target.value })}
                              className="w-8 h-8 rounded cursor-pointer border-0"
                            />
                            <Input
                              value={selected.color}
                              onChange={e => updateEl(selected.id, { color: e.target.value })}
                              className="h-8 text-xs flex-1"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs">Alinhamento</Label>
                        <div className="flex gap-1 mt-1">
                          {[
                            { v: 'left', Icon: AlignLeft },
                            { v: 'center', Icon: AlignCenter },
                            { v: 'right', Icon: AlignRight },
                          ].map(({ v, Icon }) => (
                            <Button
                              key={v}
                              size="sm"
                              variant={selected.textAlign === v ? 'default' : 'outline'}
                              className="h-8 w-8 p-0"
                              onClick={() => updateEl(selected.id, { textAlign: v as any })}
                            >
                              <Icon className="h-3.5 w-3.5" />
                            </Button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs">Transformação</Label>
                        <div className="flex gap-1 mt-1">
                          {[
                            { v: 'none', label: 'Aa' },
                            { v: 'uppercase', label: 'AA' },
                            { v: 'lowercase', label: 'aa' },
                          ].map(({ v, label }) => (
                            <Button
                              key={v}
                              size="sm"
                              variant={selected.textTransform === v ? 'default' : 'outline'}
                              className="h-8 px-2 text-xs"
                              onClick={() => updateEl(selected.id, { textTransform: v as any })}
                            >
                              {label}
                            </Button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div>
                          <Label className="text-xs flex justify-between">Espaçamento letras <span className="text-muted-foreground">{selected.letterSpacing}px</span></Label>
                          <Slider value={[selected.letterSpacing]} onValueChange={([v]) => updateEl(selected.id, { letterSpacing: v })} min={-5} max={20} step={0.5} />
                        </div>
                        <div>
                          <Label className="text-xs flex justify-between">Entrelinha <span className="text-muted-foreground">{selected.lineHeight}</span></Label>
                          <Slider value={[selected.lineHeight]} onValueChange={([v]) => updateEl(selected.id, { lineHeight: v })} min={0.8} max={2.5} step={0.05} />
                        </div>
                        <div>
                          <Label className="text-xs flex justify-between">Opacidade <span className="text-muted-foreground">{Math.round(selected.opacity * 100)}%</span></Label>
                          <Slider value={[selected.opacity]} onValueChange={([v]) => updateEl(selected.id, { opacity: v })} min={0} max={1} step={0.05} />
                        </div>
                        <div>
                          <Label className="text-xs flex justify-between">Largura <span className="text-muted-foreground">{selected.width}%</span></Label>
                          <Slider value={[selected.width]} onValueChange={([v]) => updateEl(selected.id, { width: v })} min={10} max={100} step={1} />
                        </div>
                      </div>

                      <Separator />

                      <div>
                        <Label className="text-xs">Sombra</Label>
                        <Select
                          value={selected.textShadow}
                          onValueChange={v => updateEl(selected.id, { textShadow: v })}
                        >
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
                            <input type="color" value={selected.stroke || '#000000'} onChange={e => updateEl(selected.id, { stroke: e.target.value })} className="w-6 h-6 rounded cursor-pointer border-0" />
                            <Input value={selected.stroke} onChange={e => updateEl(selected.id, { stroke: e.target.value })} className="h-7 text-xs flex-1" placeholder="Nenhum" />
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs">Espessura</Label>
                          <Slider value={[selected.strokeWidth]} onValueChange={([v]) => updateEl(selected.id, { strokeWidth: v })} min={0} max={5} step={0.5} className="mt-2" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2">
                        <div>
                          <Label className="text-xs">Posição X</Label>
                          <Slider value={[selected.x]} onValueChange={([v]) => updateEl(selected.id, { x: v })} min={0} max={100} step={0.5} />
                        </div>
                        <div>
                          <Label className="text-xs">Posição Y</Label>
                          <Slider value={[selected.y]} onValueChange={([v]) => updateEl(selected.id, { y: v })} min={0} max={100} step={0.5} />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm p-4">
                      <Type className="h-8 w-8 mb-2 opacity-40" />
                      <p>Selecione um elemento no canvas ou nas camadas</p>
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              {/* Background tab */}
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
                          <div
                            key={i}
                            className={`h-8 rounded cursor-pointer border-2 transition-all ${bgGradient === g ? 'border-primary scale-105' : 'border-transparent'}`}
                            style={{ background: g || bgColor }}
                            onClick={() => setBgGradient(g)}
                          />
                        ))}
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <Label className="text-xs mb-1 block">Cores Rápidas</Label>
                      <div className="flex flex-wrap gap-1">
                        {['#0d1b2a', '#1a1a2e', '#16213e', '#1a1a1a', '#ffffff', '#0f3460', '#533483', '#2b2d42'].map(c => (
                          <div
                            key={c}
                            className="w-7 h-7 rounded cursor-pointer border border-border hover:scale-110 transition-transform"
                            style={{ background: c }}
                            onClick={() => { setBgColor(c); setBgGradient(''); }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Image tab */}
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
                        <Input
                          placeholder="https://..."
                          className="h-8 text-xs mt-1"
                          onBlur={e => { if (e.target.value) setImage(prev => ({ ...prev, url: e.target.value })); }}
                        />
                      </div>
                    </div>

                    {image.url && (
                      <>
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
