import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { ElementStyle, CanvasElementId } from "./types";
import { CANVAS_ELEMENTS } from "./types";

const FONT_OPTIONS = [
  { value: "__default__", label: "Padrão" },
  { value: "Georgia, serif", label: "Georgia" },
  { value: "'Playfair Display', serif", label: "Playfair Display" },
  { value: "'Inter', sans-serif", label: "Inter" },
  { value: "'Poppins', sans-serif", label: "Poppins" },
  { value: "'Montserrat', sans-serif", label: "Montserrat" },
  { value: "'Oswald', sans-serif", label: "Oswald" },
  { value: "'Lora', serif", label: "Lora" },
];

const WEIGHT_OPTIONS = [
  { value: "__default__", label: "Padrão" },
  { value: "400", label: "Normal" },
  { value: "500", label: "Medium" },
  { value: "600", label: "Semibold" },
  { value: "700", label: "Bold" },
  { value: "800", label: "Extra Bold" },
  { value: "900", label: "Black" },
];

interface Props {
  elementId: CanvasElementId;
  style: ElementStyle;
  onChange: (key: keyof ElementStyle, value: any) => void;
}

export default function ElementPropertiesPanel({ elementId, style, onChange }: Props) {
  const def = CANVAS_ELEMENTS.find(e => e.id === elementId);

  return (
    <div className="space-y-3 p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold">{def?.label || elementId}</h3>
        <div className="flex items-center gap-2">
          <Label className="text-[10px]">Visível</Label>
          <Switch checked={style.visible} onCheckedChange={v => onChange("visible", v)} />
        </div>
      </div>

      <Separator />

      {/* Position */}
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Posição</p>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px]">X</Label>
          <Input type="number" className="h-7 text-xs" value={style.x} onChange={e => onChange("x", Number(e.target.value))} />
        </div>
        <div>
          <Label className="text-[10px]">Y</Label>
          <Input type="number" className="h-7 text-xs" value={style.y} onChange={e => onChange("y", Number(e.target.value))} />
        </div>
      </div>

      <Separator />

      {/* Colors */}
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Cores</p>
      <ColorRow label="Cor do texto" value={style.color} onChange={v => onChange("color", v)} />
      <ColorRow label="Fundo" value={style.background} onChange={v => onChange("background", v)} />

      <Separator />

      {/* Typography */}
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Tipografia</p>
      <div className="space-y-1">
        <Label className="text-[10px]">Tamanho</Label>
        <div className="flex items-center gap-2">
          <Slider value={[style.fontSize || 14]} min={8} max={72} step={1} onValueChange={([v]) => onChange("fontSize", v)} className="flex-1" />
          <span className="text-[10px] font-mono w-8 text-right">{style.fontSize}px</span>
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-[10px]">Fonte</Label>
        <Select value={style.fontFamily || "__default__"} onValueChange={v => onChange("fontFamily", v === "__default__" ? "" : v)}>
          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {FONT_OPTIONS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-[10px]">Peso</Label>
        <Select value={style.fontWeight || "__default__"} onValueChange={v => onChange("fontWeight", v === "__default__" ? "" : v)}>
          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {WEIGHT_OPTIONS.map(w => <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Shape */}
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Forma</p>
      <div className="space-y-1">
        <Label className="text-[10px]">Opacidade</Label>
        <div className="flex items-center gap-2">
          <Slider value={[style.opacity]} min={0} max={100} step={1} onValueChange={([v]) => onChange("opacity", v)} className="flex-1" />
          <span className="text-[10px] font-mono w-8 text-right">{style.opacity}%</span>
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-[10px]">Borda arredondada</Label>
        <div className="flex items-center gap-2">
          <Slider value={[style.borderRadius]} min={0} max={32} step={1} onValueChange={([v]) => onChange("borderRadius", v)} className="flex-1" />
          <span className="text-[10px] font-mono w-8 text-right">{style.borderRadius}px</span>
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-[10px]">Padding</Label>
        <div className="flex items-center gap-2">
          <Slider value={[style.padding]} min={0} max={32} step={1} onValueChange={([v]) => onChange("padding", v)} className="flex-1" />
          <span className="text-[10px] font-mono w-8 text-right">{style.padding}px</span>
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
        <input
          type="color"
          value={value?.startsWith("#") ? value : "#000000"}
          onChange={e => onChange(e.target.value)}
          className="w-6 h-6 rounded border cursor-pointer"
        />
        <Input className="h-6 w-20 text-[10px] font-mono" value={value || ""} onChange={e => onChange(e.target.value)} placeholder="auto" />
      </div>
    </div>
  );
}
