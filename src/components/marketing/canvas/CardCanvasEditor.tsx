import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, X, Undo2, Redo2, Download, Image, Layers, Settings } from "lucide-react";
import { toPng } from "html-to-image";
import { toast } from "sonner";
import { useCanvasUndo } from "@/hooks/useCanvasUndo";
import CanvasElement from "./CanvasElement";
import ElementPropertiesPanel from "./ElementPropertiesPanel";
import type { CanvasState, CanvasElementId, ElementStyle } from "./types";
import { CANVAS_ELEMENTS } from "./types";
import { LAYOUT_PRESETS } from "./layouts";
import type { PromotionCardData } from "../PromotionCard";
import type { CardStyleOverrides } from "../CardStyleEditor";
import { Plane, Hotel, Bus, Ticket, Map, Users, Train } from "lucide-react";

const formatCurrency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Props {
  promo: PromotionCardData;
  initialStyle?: CardStyleOverrides;
  layoutId?: string;
  onSave: (style: CardStyleOverrides) => void;
  onClose: () => void;
}

function getElementContent(id: CanvasElementId, promo: PromotionCardData, canvasState: CanvasState): React.ReactNode {
  switch (id) {
    case "badge":
      return <span>{canvasState.badgeText}</span>;
    case "title":
      return <span>{promo.destination_name}</span>;
    case "subtitle": {
      const parts: string[] = [];
      if (promo.accommodation_type) parts.push(promo.accommodation_type);
      if (promo.nights) parts.push(`${promo.nights} noites`);
      return <span>{parts.join(" • ") || "Subtítulo"}</span>;
    }
    case "country":
      return <span>{promo.destination_country || "País"}</span>;
    case "period":
      return <span>📅 {promo.period_text || "Período"}</span>;
    case "airports":
      return <span>✈ {promo.airport_origin || "GRU"} → {promo.airport_destination || "CDG"}</span>;
    case "services": {
      const svcs = [
        { label: "Aéreo", icon: Plane, show: !!(promo.airport_origin && promo.airport_destination) },
        { label: "Hotel", icon: Hotel, show: !!promo.accommodation_type },
        { label: "Transfer", icon: Bus, show: promo.included_transfer },
        { label: "Ingressos", icon: Ticket, show: promo.included_tickets },
        { label: "Passeios", icon: Map, show: promo.included_tours },
        { label: "Guia", icon: Users, show: promo.included_guide },
        { label: "Trem", icon: Train, show: promo.included_train },
      ].filter(s => s.show);
      return (
        <div className="flex flex-wrap gap-2">
          {svcs.map(s => (
            <span key={s.label} className="flex items-center gap-1">
              <s.icon className="h-3 w-3" />
              <span>{s.label}</span>
            </span>
          ))}
        </div>
      );
    }
    case "price":
      return promo.installments > 1
        ? <span>{promo.installments}x de {formatCurrency(promo.installment_value)}</span>
        : <span>{formatCurrency(promo.total_value)}</span>;
    case "totalValue":
      return promo.installments > 1 && promo.total_value > 0
        ? <span>Total: {formatCurrency(promo.total_value)}</span>
        : <span>{formatCurrency(promo.total_value)}</span>;
    case "cta":
      return <span>{canvasState.ctaText}</span>;
    default:
      return null;
  }
}

export default function CardCanvasEditor({ promo, initialStyle, layoutId = "default", onSave, onClose }: Props) {
  const initialLayout = LAYOUT_PRESETS.find(l => l.id === layoutId) || LAYOUT_PRESETS[0];
  const { state, push, undo, redo, canUndo, canRedo } = useCanvasUndo<CanvasState>(initialLayout.build(), 20);
  const [selected, setSelected] = useState<CanvasElementId | null>(null);
  const [tab, setTab] = useState("element");
  const cardRef = useRef<HTMLDivElement>(null);

  // Image panning state
  const imgDragging = useRef(false);
  const imgStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo]);

  const updateElement = useCallback((id: CanvasElementId, key: keyof ElementStyle, value: any) => {
    const next = {
      ...state,
      elements: {
        ...state.elements,
        [id]: { ...state.elements[id], [key]: value },
      },
    };
    push(next);
  }, [state, push]);

  const moveElement = useCallback((id: CanvasElementId, x: number, y: number) => {
    const next = {
      ...state,
      elements: {
        ...state.elements,
        [id]: { ...state.elements[id], x, y },
      },
    };
    push(next);
  }, [state, push]);

  const updateCard = useCallback((key: string, value: any) => {
    push({ ...state, card: { ...state.card, [key]: value } });
  }, [state, push]);

  const updateImage = useCallback((key: string, value: any) => {
    push({ ...state, image: { ...state.image, [key]: value } });
  }, [state, push]);

  const updateText = useCallback((key: "ctaText" | "badgeText", value: string) => {
    push({ ...state, [key]: value });
  }, [state, push]);

  // applyLayout removed — layout is now chosen in page editor

  // Image panning handlers
  const handleImagePointerDown = useCallback((e: React.PointerEvent) => {
    if (selected !== null) return; // only pan when no element is selected
    e.stopPropagation();
    imgDragging.current = true;
    imgStart.current = { x: e.clientX, y: e.clientY, ox: state.image.offsetX, oy: state.image.offsetY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [selected, state.image.offsetX, state.image.offsetY]);

  const handleImagePointerMove = useCallback((e: React.PointerEvent) => {
    if (!imgDragging.current) return;
    const dx = e.clientX - imgStart.current.x;
    const dy = e.clientY - imgStart.current.y;
    // Live update via DOM
    const img = cardRef.current?.querySelector("[data-canvas-image]") as HTMLElement;
    if (img) {
      img.style.objectPosition = `${imgStart.current.ox + dx}px ${imgStart.current.oy + dy}px`;
    }
  }, []);

  const handleImagePointerUp = useCallback((e: React.PointerEvent) => {
    if (!imgDragging.current) return;
    imgDragging.current = false;
    const dx = e.clientX - imgStart.current.x;
    const dy = e.clientY - imgStart.current.y;
    updateImage("offsetX", imgStart.current.ox + dx);
    updateImage("offsetY", imgStart.current.oy + dy);
  }, [updateImage]);

  const exportCard = async () => {
    if (!cardRef.current) return;
    try {
      const dataUrl = await toPng(cardRef.current, { quality: 1, pixelRatio: 2 });
      const link = document.createElement("a");
      link.download = `card-${promo.destination_name}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Exportado como PNG");
    } catch {
      toast.error("Erro ao exportar");
    }
  };

  const handleSave = () => {
    // Convert canvas state back to CardStyleOverrides for compatibility
    const out: CardStyleOverrides = {
      cardWidth: state.card.width,
      cardHeight: state.card.height,
      bgColor: state.card.bgColor,
      overlayColor: state.card.overlayColor,
      overlayOpacity: state.card.overlayOpacity,
      borderRadius: state.card.borderRadius,
      imageBrightness: state.image.brightness,
      ctaText: state.ctaText,
      badgeText: state.badgeText,
      // Store canvas state as JSON in a special field
      _canvasState: JSON.stringify(state),
    } as any;
    onSave(out);
  };

  const deselect = () => setSelected(null);

  const selectedEl = selected ? state.elements[selected] : null;

  return (
    <div className="fixed inset-0 z-50 flex bg-background">
      {/* Left panel */}
      <div className="w-80 border-r flex flex-col bg-card shrink-0">
        {/* Header */}
        <div className="p-3 border-b flex items-center justify-between">
          <h2 className="text-sm font-bold">Editor de Card</h2>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={undo} disabled={!canUndo} title="Desfazer (Ctrl+Z)">
              <Undo2 className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={redo} disabled={!canRedo} title="Refazer">
              <Redo2 className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid grid-cols-3 mx-2 mt-2 shrink-0">
            <TabsTrigger value="element" className="text-xs gap-1">
              <Layers className="h-3 w-3" /> Elemento
            </TabsTrigger>
            <TabsTrigger value="image" className="text-xs gap-1">
              <Image className="h-3 w-3" /> Imagem
            </TabsTrigger>
            <TabsTrigger value="card" className="text-xs gap-1">
              <Settings className="h-3 w-3" /> Card
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto">
            {/* ELEMENT TAB */}
            <TabsContent value="element" className="mt-0">
              {selected && selectedEl ? (
                <ElementPropertiesPanel
                  elementId={selected}
                  style={selectedEl}
                  onChange={(key, value) => updateElement(selected, key, value)}
                />
              ) : (
                <div className="p-3 space-y-2">
                  <p className="text-xs text-muted-foreground">Clique em um elemento no card para editá-lo, ou selecione abaixo:</p>
                  {CANVAS_ELEMENTS.map(def => (
                    <button
                      key={def.id}
                      className="w-full text-left text-xs px-3 py-2 rounded-md hover:bg-muted flex items-center justify-between"
                      onClick={() => { setSelected(def.id); setTab("element"); }}
                    >
                      <span>{def.label}</span>
                      {!state.elements[def.id].visible && (
                        <span className="text-[10px] text-muted-foreground">oculto</span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Texts edit */}
              {selected === "cta" && (
                <div className="p-3 border-t space-y-2">
                  <Label className="text-[10px]">Texto do botão</Label>
                  <Input className="h-7 text-xs" value={state.ctaText} onChange={e => updateText("ctaText", e.target.value)} />
                </div>
              )}
              {selected === "badge" && (
                <div className="p-3 border-t space-y-2">
                  <Label className="text-[10px]">Texto do badge</Label>
                  <Input className="h-7 text-xs" value={state.badgeText} onChange={e => updateText("badgeText", e.target.value)} />
                </div>
              )}
            </TabsContent>

            {/* IMAGE TAB */}
            <TabsContent value="image" className="p-3 space-y-3 mt-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Posição da imagem
              </p>
              <p className="text-xs text-muted-foreground">Clique e arraste a imagem no preview (desselecione elementos primeiro)</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px]">Offset X</Label>
                  <Input type="number" className="h-7 text-xs" value={state.image.offsetX} onChange={e => updateImage("offsetX", Number(e.target.value))} />
                </div>
                <div>
                  <Label className="text-[10px]">Offset Y</Label>
                  <Input type="number" className="h-7 text-xs" value={state.image.offsetY} onChange={e => updateImage("offsetY", Number(e.target.value))} />
                </div>
              </div>
              <Separator />
              <div className="space-y-1">
                <div className="flex justify-between">
                  <Label className="text-[10px]">Brilho</Label>
                  <span className="text-[10px] font-mono">{state.image.brightness}%</span>
                </div>
                <Slider value={[state.image.brightness]} min={30} max={150} step={1} onValueChange={([v]) => updateImage("brightness", v)} />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <Label className="text-[10px]">Escala</Label>
                  <span className="text-[10px] font-mono">{state.image.scale}%</span>
                </div>
                <Slider value={[state.image.scale]} min={50} max={200} step={1} onValueChange={([v]) => updateImage("scale", v)} />
              </div>
            </TabsContent>

            {/* CARD TAB */}
            <TabsContent value="card" className="p-3 space-y-3 mt-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Layout</p>
              <div className="grid grid-cols-2 gap-2">
                {LAYOUT_PRESETS.map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => applyLayout(preset.id)}
                    className={`text-left text-xs px-3 py-2 rounded-md border transition-colors ${
                      activeLayout === preset.id
                        ? "border-primary bg-primary/10 text-primary font-semibold"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <Separator />
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Dimensões</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px]">Largura</Label>
                  <Input type="number" className="h-7 text-xs" value={state.card.width} onChange={e => updateCard("width", Number(e.target.value))} />
                </div>
                <div>
                  <Label className="text-[10px]">Altura</Label>
                  <Input type="number" className="h-7 text-xs" value={state.card.height} onChange={e => updateCard("height", Number(e.target.value))} />
                </div>
              </div>
              <div className="flex gap-2">
                {[
                  { label: "1:1", w: 400, h: 400 },
                  { label: "9:16", w: 360, h: 640 },
                  { label: "16:9", w: 640, h: 360 },
                  { label: "A4", w: 420, h: 594 },
                ].map(p => (
                  <Button key={p.label} variant="outline" size="sm" className="text-[10px] h-6 px-2"
                    onClick={() => { updateCard("width", p.w); updateCard("height", p.h); }}>
                    {p.label}
                  </Button>
                ))}
              </div>
              <Separator />
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Aparência</p>
              <ColorRow label="Cor de fundo" value={state.card.bgColor} onChange={v => updateCard("bgColor", v)} />
              <ColorRow label="Cor do overlay" value={state.card.overlayColor} onChange={v => updateCard("overlayColor", v)} />
              <div className="space-y-1">
                <div className="flex justify-between">
                  <Label className="text-[10px]">Opacidade overlay</Label>
                  <span className="text-[10px] font-mono">{state.card.overlayOpacity}%</span>
                </div>
                <Slider value={[state.card.overlayOpacity]} min={0} max={100} step={1} onValueChange={([v]) => updateCard("overlayOpacity", v)} />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <Label className="text-[10px]">Borda arredondada</Label>
                  <span className="text-[10px] font-mono">{state.card.borderRadius}px</span>
                </div>
                <Slider value={[state.card.borderRadius]} min={0} max={32} step={1} onValueChange={([v]) => updateCard("borderRadius", v)} />
              </div>
            </TabsContent>
          </div>
        </Tabs>

        {/* Footer */}
        <div className="p-3 border-t flex gap-2 shrink-0">
          <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={exportCard}>
            <Download className="h-3 w-3 mr-1" /> PNG
          </Button>
          <Button size="sm" className="flex-1 text-xs" onClick={handleSave}>
            <Save className="h-3 w-3 mr-1" /> Salvar
          </Button>
        </div>
      </div>

      {/* Right panel - Canvas */}
      <div className="flex-1 flex items-center justify-center bg-muted/30 p-8 overflow-auto" onClick={deselect}>
        <div
          ref={cardRef}
          className="relative overflow-hidden"
          style={{
            width: state.card.width,
            height: state.card.height,
            borderRadius: state.card.borderRadius,
            background: state.card.bgColor,
          }}
        >
          {/* Background image */}
          {promo.main_image_url ? (
            <img
              data-canvas-image
              src={promo.main_image_url}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              style={{
                filter: state.image.brightness !== 100 ? `brightness(${state.image.brightness}%)` : undefined,
                objectPosition: `${state.image.offsetX}px ${state.image.offsetY}px`,
                transform: state.image.scale !== 100 ? `scale(${state.image.scale / 100})` : undefined,
                cursor: selected === null ? "grab" : undefined,
                touchAction: "none",
              }}
              onPointerDown={handleImagePointerDown}
              onPointerMove={handleImagePointerMove}
              onPointerUp={handleImagePointerUp}
              draggable={false}
            />
          ) : (
            <div className="absolute inset-0 bg-muted flex items-center justify-center">
              <Image className="h-12 w-12 text-muted-foreground/30" />
            </div>
          )}

          {/* Overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `linear-gradient(to bottom, transparent 0%, ${state.card.overlayColor}cc 100%)`,
              opacity: state.card.overlayOpacity / 100,
            }}
          />

          {/* Elements */}
          {CANVAS_ELEMENTS.map(def => (
            <CanvasElement
              key={def.id}
              id={def.id}
              style={state.elements[def.id]}
              selected={selected === def.id}
              onSelect={() => { setSelected(def.id); setTab("element"); }}
              onMove={(x, y) => moveElement(def.id, x, y)}
            >
              {getElementContent(def.id, promo, state)}
            </CanvasElement>
          ))}
        </div>
      </div>
    </div>
  );
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Label className="text-[10px] text-muted-foreground shrink-0">{label}</Label>
      <div className="flex items-center gap-1.5">
        <input type="color" value={value?.startsWith("#") ? value : "#000000"} onChange={e => onChange(e.target.value)} className="w-6 h-6 rounded border cursor-pointer" />
        <Input className="h-6 w-20 text-[10px] font-mono" value={value || ""} onChange={e => onChange(e.target.value)} placeholder="auto" />
      </div>
    </div>
  );
}
