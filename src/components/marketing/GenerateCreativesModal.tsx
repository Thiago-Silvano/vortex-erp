import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Wand2, Loader2, Sparkles } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  promotion: {
    id?: string;
    destination_name: string;
    destination_country: string;
    accommodation_type: string;
    nights: number;
    period_text: string;
    airport_origin: string;
    airport_destination: string;
    installments: number;
    installment_value: number;
    total_value: number;
    included_tickets: boolean;
    included_tours: boolean;
    included_guide: boolean;
    included_transfer: boolean;
    included_train: boolean;
    main_image_url?: string | null;
  };
}

const TYPES = [
  { value: "feed", label: "Feed (1:1)", format: "1:1" },
  { value: "story", label: "Story (9:16)", format: "9:16" },
  { value: "whatsapp", label: "WhatsApp", format: "1:1" },
  { value: "banner", label: "Banner", format: "1:1" },
];

const STYLES = [
  { value: "premium", label: "Premium", desc: "Elegante e sofisticado" },
  { value: "oferta", label: "Oferta", desc: "Impactante e urgente" },
  { value: "emocional", label: "Emocional", desc: "Suave e inspirador" },
  { value: "minimalista", label: "Minimalista", desc: "Limpo e moderno" },
  { value: "familia", label: "Família", desc: "Divertido e acolhedor" },
  { value: "economico", label: "Econômico", desc: "Destaque no preço" },
];

const GENERATION_MODES = [
  { value: "ai", label: "Gerar com IA", desc: "Layout gerado automaticamente" },
  { value: "template", label: "Usar template existente", desc: "Aproveitar layout já criado" },
];

export default function GenerateCreativesModal({ open, onClose, promotion }: Props) {
  const navigate = useNavigate();
  const [type, setType] = useState("feed");
  const [style, setStyle] = useState("premium");
  const [mode, setMode] = useState("ai");
  const [generating, setGenerating] = useState(false);

  const selectedType = TYPES.find(t => t.value === type);

  const handleGenerate = async () => {
    if (mode === "template") {
      navigate("/marketing/templates");
      onClose();
      return;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-creative", {
        body: {
          promotion,
          style,
          format: selectedType?.format || "1:1",
        },
      });

      if (error) throw error;

      if (data?.layout) {
        sessionStorage.setItem("ai_creative_layout", JSON.stringify({
          ...data.layout,
          promotionId: promotion.id,
          mainImageUrl: promotion.main_image_url,
        }));

        const params = new URLSearchParams({
          promotion: promotion.id || "new",
          format: selectedType?.format || "1:1",
          style,
          aiGenerated: "true",
        });
        navigate(`/promo-maker?${params.toString()}`);
        onClose();
        toast.success("Criativo gerado com IA! Edite livremente.");
      } else {
        throw new Error("Nenhum layout retornado");
      }
    } catch (err) {
      console.error("AI generation error:", err);
      toast.error("Erro ao gerar criativo. Abrindo editor com layout padrão...");
      const params = new URLSearchParams({
        promotion: promotion.id || "new",
        format: selectedType?.format || "1:1",
        style,
      });
      navigate(`/promo-maker?${params.toString()}`);
      onClose();
    }
    setGenerating(false);
  };

  return (
    <Dialog open={open} onOpenChange={() => !generating && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-4 w-4" /> Gerar Criativos
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="bg-muted/50 rounded-md p-3 text-xs space-y-1">
            <p className="font-medium">{promotion.destination_name}, {promotion.destination_country}</p>
            <p>{promotion.accommodation_type} • {promotion.nights} noites</p>
            <p>{promotion.airport_origin} → {promotion.airport_destination}</p>
            <p className="font-semibold">
              {promotion.installments}x R$ {Number(promotion.installment_value || 0).toFixed(2)} = R$ {Number(promotion.total_value || 0).toFixed(2)}
            </p>
          </div>

          <div>
            <Label className="text-xs mb-2 block">Como deseja criar?</Label>
            <RadioGroup value={mode} onValueChange={setMode} className="gap-2">
              {GENERATION_MODES.map(m => (
                <label key={m.value} className="flex items-start gap-2 p-2 rounded-md border cursor-pointer hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value={m.value} className="mt-0.5" />
                  <div>
                    <span className="text-xs font-medium">{m.label}</span>
                    <p className="text-[10px] text-muted-foreground">{m.desc}</p>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </div>

          {mode === "ai" && (
            <>
              <div>
                <Label className="text-xs">Tipo</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Estilo</Label>
                <div className="grid grid-cols-3 gap-1.5 mt-1">
                  {STYLES.map(s => (
                    <button
                      key={s.value}
                      onClick={() => setStyle(s.value)}
                      className={`p-2 rounded-md border text-left transition-all ${
                        style === s.value
                          ? "border-primary bg-primary/10 ring-1 ring-primary"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <span className="text-[11px] font-medium block">{s.label}</span>
                      <span className="text-[9px] text-muted-foreground">{s.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={generating}>Cancelar</Button>
          <Button size="sm" onClick={handleGenerate} disabled={generating}>
            {generating ? (
              <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Gerando...</>
            ) : mode === "ai" ? (
              <><Sparkles className="h-3.5 w-3.5 mr-1" /> Gerar com IA</>
            ) : (
              <>Escolher Template</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
