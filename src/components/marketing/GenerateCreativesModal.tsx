import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Wand2, Loader2 } from "lucide-react";

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
    main_image_url: string;
  };
}

const TYPES = [
  { value: "feed", label: "Feed (1:1)" },
  { value: "story", label: "Story (9:16)" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "banner", label: "Banner" },
];

const STYLES = [
  { value: "premium", label: "Premium" },
  { value: "oferta", label: "Oferta" },
  { value: "emocional", label: "Emocional" },
  { value: "minimalista", label: "Minimalista" },
  { value: "familia", label: "Família" },
  { value: "economico", label: "Econômico" },
];

export default function GenerateCreativesModal({ open, onClose, promotion }: Props) {
  const navigate = useNavigate();
  const [type, setType] = useState("feed");
  const [style, setStyle] = useState("premium");
  const [generating, setGenerating] = useState(false);

  const handleGenerate = () => {
    // Navigate to PromoMaker with promotion data pre-loaded
    const format = type === "story" ? "9:16" : "1:1";
    const params = new URLSearchParams({
      promotion: promotion.id || "new",
      format,
      style,
    });
    navigate(`/promo-maker?${params.toString()}`);
    onClose();
    toast.success("Abrindo editor com dados da promoção...");
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
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
              {promotion.installments}x R$ {promotion.installment_value.toFixed(2)} = R$ {promotion.total_value.toFixed(2)}
            </p>
          </div>

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
            <Select value={style} onValueChange={setStyle}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STYLES.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" onClick={handleGenerate} disabled={generating}>
            {generating ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Wand2 className="h-3.5 w-3.5 mr-1" />}
            Gerar no Editor
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
