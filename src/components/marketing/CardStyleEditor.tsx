import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Save, X, RotateCcw, Download, Palette, Type, Eye, Sliders } from "lucide-react";
import { toPng } from "html-to-image";
import { toast } from "sonner";
import PromotionCard, { type PromotionCardData, type LayoutStyle } from "./PromotionCard";

export interface CardStyleOverrides {
  // Colors
  bgColor?: string;
  textColor?: string;
  accentColor?: string;
  gradientFrom?: string;
  gradientTo?: string;
  ctaBgColor?: string;
  ctaTextColor?: string;
  priceBoxBg?: string;
  priceTextColor?: string;
  overlayColor?: string;

  // Typography
  titleSize?: number;
  titleFont?: string;
  titleWeight?: string;
  subtitleSize?: number;
  priceSize?: number;
  bodySize?: number;

  // Visibility
  showServices?: boolean;
  showPeriod?: boolean;
  showAirports?: boolean;
  showBadge?: boolean;
  showCta?: boolean;
  showInstallments?: boolean;
  showTotalValue?: boolean;
  showCountry?: boolean;

  // Layout tweaks
  imageHeight?: number;
  borderRadius?: number;
  cardPadding?: number;
  imageBrightness?: number;
  overlayOpacity?: number;
  shadowIntensity?: number;
  ctaBorderRadius?: number;

  // CTA text
  ctaText?: string;
  badgeText?: string;
}

const DEFAULT_STYLE: CardStyleOverrides = {
  bgColor: "",
  textColor: "",
  accentColor: "#d4a853",
  gradientFrom: "",
  gradientTo: "",
  ctaBgColor: "",
  ctaTextColor: "",
  priceBoxBg: "",
  priceTextColor: "",
  overlayColor: "",
  titleSize: 0,
  titleFont: "",
  titleWeight: "",
  subtitleSize: 0,
  priceSize: 0,
  bodySize: 0,
  showServices: true,
  showPeriod: true,
  showAirports: true,
  showBadge: true,
  showCta: true,
  showInstallments: true,
  showTotalValue: true,
  showCountry: true,
  imageHeight: 0,
  borderRadius: 0,
  cardPadding: 0,
  imageBrightness: 100,
  overlayOpacity: 0,
  shadowIntensity: 50,
  ctaBorderRadius: 8,
  ctaText: "Quero esse pacote",
  badgeText: "Promoção",
};

const FONT_OPTIONS = [
  { value: "", label: "Padrão do layout" },
  { value: "Georgia, serif", label: "Georgia (Serif)" },
  { value: "'Playfair Display', serif", label: "Playfair Display" },
  { value: "'Inter', sans-serif", label: "Inter" },
  { value: "'Poppins', sans-serif", label: "Poppins" },
  { value: "'Montserrat', sans-serif", label: "Montserrat" },
  { value: "'Oswald', sans-serif", label: "Oswald" },
  { value: "'Lora', serif", label: "Lora" },
];

const WEIGHT_OPTIONS = [
  { value: "", label: "Padrão" },
  { value: "400", label: "Normal" },
  { value: "500", label: "Medium" },
  { value: "600", label: "Semibold" },
  { value: "700", label: "Bold" },
  { value: "800", label: "Extra Bold" },
  { value: "900", label: "Black" },
];

interface Props {
  promo: PromotionCardData;
  layout: LayoutStyle;
  initialStyle?: CardStyleOverrides;
  onSave: (style: CardStyleOverrides) => void;
  onClose: () => void;
}

export default function CardStyleEditor({ promo, layout, initialStyle, onSave, onClose }: Props) {
  const [style, setStyle] = useState<CardStyleOverrides>({ ...DEFAULT_STYLE, ...initialStyle });
  const cardRef = useRef<HTMLDivElement>(null);

  const update = useCallback((key: keyof CardStyleOverrides, value: any) => {
    setStyle(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetStyle = () => setStyle({ ...DEFAULT_STYLE });

  const exportCard = async (format: "png" | "jpg") => {
    if (!cardRef.current) return;
    try {
      const dataUrl = await toPng(cardRef.current, { quality: 1, pixelRatio: 2 });
      const link = document.createElement("a");
      link.download = `card-${promo.destination_name}.${format}`;
      link.href = dataUrl;
      link.click();
      toast.success(`Exportado como ${format.toUpperCase()}`);
    } catch {
      toast.error("Erro ao exportar");
    }
  };

  const ColorInput = ({ label, propKey }: { label: string; propKey: keyof CardStyleOverrides }) => (
    <div className="flex items-center justify-between gap-2">
      <Label className="text-xs text-muted-foreground shrink-0">{label}</Label>
      <div className="flex items-center gap-1.5">
        <input
          type="color"
          value={(style[propKey] as string) || "#000000"}
          onChange={e => update(propKey, e.target.value)}
          className="w-7 h-7 rounded border cursor-pointer"
        />
        <Input
          className="h-7 w-20 text-xs font-mono"
          value={(style[propKey] as string) || ""}
          onChange={e => update(propKey, e.target.value)}
          placeholder="auto"
        />
      </div>
    </div>
  );

  const SliderInput = ({ label, propKey, min, max, step = 1, suffix = "" }: {
    label: string; propKey: keyof CardStyleOverrides; min: number; max: number; step?: number; suffix?: string;
  }) => (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <span className="text-xs font-mono text-muted-foreground">{style[propKey]}{suffix}</span>
      </div>
      <Slider
        value={[style[propKey] as number]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => update(propKey, v)}
        className="w-full"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex bg-background">
      {/* Left panel - Controls */}
      <div className="w-80 border-r flex flex-col bg-card">
        {/* Header */}
        <div className="p-3 border-b flex items-center justify-between">
          <h2 className="text-sm font-bold">Editor de Card</h2>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={resetStyle} title="Resetar">
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="colors" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid grid-cols-4 mx-2 mt-2">
            <TabsTrigger value="colors" className="text-xs px-1 gap-1">
              <Palette className="h-3 w-3" /> Cores
            </TabsTrigger>
            <TabsTrigger value="typography" className="text-xs px-1 gap-1">
              <Type className="h-3 w-3" /> Texto
            </TabsTrigger>
            <TabsTrigger value="visibility" className="text-xs px-1 gap-1">
              <Eye className="h-3 w-3" /> Campos
            </TabsTrigger>
            <TabsTrigger value="layout" className="text-xs px-1 gap-1">
              <Sliders className="h-3 w-3" /> Layout
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1">
            {/* COLORS TAB */}
            <TabsContent value="colors" className="p-3 space-y-3 mt-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Card</p>
              <ColorInput label="Fundo" propKey="bgColor" />
              <ColorInput label="Texto" propKey="textColor" />
              <ColorInput label="Cor destaque" propKey="accentColor" />
              <Separator className="my-2" />
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Gradiente overlay</p>
              <ColorInput label="De" propKey="gradientFrom" />
              <ColorInput label="Para" propKey="gradientTo" />
              <ColorInput label="Cor overlay" propKey="overlayColor" />
              <Separator className="my-2" />
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Preço</p>
              <ColorInput label="Fundo preço" propKey="priceBoxBg" />
              <ColorInput label="Texto preço" propKey="priceTextColor" />
              <Separator className="my-2" />
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Botão CTA</p>
              <ColorInput label="Fundo CTA" propKey="ctaBgColor" />
              <ColorInput label="Texto CTA" propKey="ctaTextColor" />
            </TabsContent>

            {/* TYPOGRAPHY TAB */}
            <TabsContent value="typography" className="p-3 space-y-3 mt-0">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Fonte do título</Label>
                <Select value={style.titleFont || ""} onValueChange={v => update("titleFont", v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Padrão" /></SelectTrigger>
                  <SelectContent>
                    {FONT_OPTIONS.map(f => (
                      <SelectItem key={f.value} value={f.value} style={{ fontFamily: f.value || undefined }}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Peso do título</Label>
                <Select value={style.titleWeight || ""} onValueChange={v => update("titleWeight", v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Padrão" /></SelectTrigger>
                  <SelectContent>
                    {WEIGHT_OPTIONS.map(w => (
                      <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Separator className="my-2" />
              <SliderInput label="Tamanho do título" propKey="titleSize" min={0} max={60} suffix="px" />
              <SliderInput label="Tamanho do subtítulo" propKey="subtitleSize" min={0} max={30} suffix="px" />
              <SliderInput label="Tamanho do preço" propKey="priceSize" min={0} max={60} suffix="px" />
              <SliderInput label="Tamanho do texto" propKey="bodySize" min={0} max={20} suffix="px" />
              <Separator className="my-2" />
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Texto do botão</Label>
                <Input
                  className="h-8 text-xs"
                  value={style.ctaText || ""}
                  onChange={e => update("ctaText", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Texto do badge</Label>
                <Input
                  className="h-8 text-xs"
                  value={style.badgeText || ""}
                  onChange={e => update("badgeText", e.target.value)}
                />
              </div>
            </TabsContent>

            {/* VISIBILITY TAB */}
            <TabsContent value="visibility" className="p-3 space-y-3 mt-0">
              {([
                ["showServices", "Serviços inclusos"],
                ["showPeriod", "Período"],
                ["showAirports", "Aeroportos"],
                ["showBadge", "Badge / etiqueta"],
                ["showCta", "Botão CTA"],
                ["showInstallments", "Parcelas"],
                ["showTotalValue", "Valor total"],
                ["showCountry", "País"],
              ] as [keyof CardStyleOverrides, string][]).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between">
                  <Label className="text-xs">{label}</Label>
                  <Switch
                    checked={style[key] as boolean}
                    onCheckedChange={v => update(key, v)}
                  />
                </div>
              ))}
            </TabsContent>

            {/* LAYOUT TAB */}
            <TabsContent value="layout" className="p-3 space-y-3 mt-0">
              <SliderInput label="Altura da imagem" propKey="imageHeight" min={0} max={500} suffix="px" />
              <SliderInput label="Borda arredondada" propKey="borderRadius" min={0} max={32} suffix="px" />
              <SliderInput label="Padding" propKey="cardPadding" min={0} max={40} suffix="px" />
              <Separator className="my-2" />
              <SliderInput label="Brilho da imagem" propKey="imageBrightness" min={30} max={150} suffix="%" />
              <SliderInput label="Opacidade overlay" propKey="overlayOpacity" min={0} max={100} suffix="%" />
              <SliderInput label="Intensidade sombra" propKey="shadowIntensity" min={0} max={100} suffix="%" />
              <Separator className="my-2" />
              <SliderInput label="Borda do botão" propKey="ctaBorderRadius" min={0} max={24} suffix="px" />
            </TabsContent>
          </ScrollArea>
        </Tabs>

        {/* Footer */}
        <div className="p-3 border-t flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => exportCard("png")}>
            <Download className="h-3 w-3 mr-1" /> PNG
          </Button>
          <Button size="sm" className="flex-1 text-xs" onClick={() => onSave(style)}>
            <Save className="h-3 w-3 mr-1" /> Salvar
          </Button>
        </div>
      </div>

      {/* Right panel - Card Preview */}
      <div className="flex-1 flex items-center justify-center bg-muted/30 p-8 overflow-auto">
        <div className="w-full max-w-md" ref={cardRef}>
          <PromotionCard promo={promo} layout={layout} styleOverrides={style} />
        </div>
      </div>
    </div>
  );
}
