import { Plane, Hotel, Coffee, Bus, Ticket, Map, Train, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface PromotionCardData {
  id: string;
  destination_name: string;
  destination_country: string;
  accommodation_type: string;
  nights: number;
  period_text: string;
  departure_date: string | null;
  return_date: string | null;
  airport_origin: string;
  airport_destination: string;
  included_tickets: boolean;
  included_tours: boolean;
  included_guide: boolean;
  included_transfer: boolean;
  included_train: boolean;
  installments: number;
  installment_value: number;
  total_value: number;
  main_image_url: string | null;
  status: string;
}

interface Props {
  promo: PromotionCardData;
  layout: "lateral" | "overlay" | "catalog" | "minimal";
  onClickCta?: (promo: PromotionCardData) => void;
}

const formatCurrency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function IncludedServices({ promo }: { promo: PromotionCardData }) {
  const services = [
    { key: "airport", label: "Aéreo", icon: Plane, show: !!(promo.airport_origin && promo.airport_destination) },
    { key: "hotel", label: "Hospedagem", icon: Hotel, show: !!promo.accommodation_type },
    { key: "transfer", label: "Transfer", icon: Bus, show: promo.included_transfer },
    { key: "tickets", label: "Ingressos", icon: Ticket, show: promo.included_tickets },
    { key: "tours", label: "Passeios", icon: Map, show: promo.included_tours },
    { key: "guide", label: "Guia", icon: Users, show: promo.included_guide },
    { key: "train", label: "Trem", icon: Train, show: promo.included_train },
  ].filter(s => s.show);

  if (!services.length) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {services.map(s => (
        <div key={s.key} className="flex items-center gap-1 text-xs text-muted-foreground">
          <s.icon className="h-3.5 w-3.5" />
          <span>{s.label}</span>
        </div>
      ))}
    </div>
  );
}

function PriceBlock({ promo }: { promo: PromotionCardData }) {
  return (
    <div>
      {promo.installments > 1 && (
        <p className="text-lg font-bold text-primary">
          {promo.installments}x de {formatCurrency(promo.installment_value)}
        </p>
      )}
      {promo.total_value > 0 && (
        <p className={promo.installments > 1 ? "text-xs text-muted-foreground" : "text-lg font-bold text-primary"}>
          {promo.installments > 1 ? "Total: " : ""}{formatCurrency(promo.total_value)}
        </p>
      )}
    </div>
  );
}

function ImagePlaceholder() {
  return (
    <div className="w-full h-full bg-muted flex items-center justify-center">
      <Hotel className="h-12 w-12 text-muted-foreground/30" />
    </div>
  );
}

/** Layout 1: Imagem lateral */
function LateralCard({ promo, onClickCta }: Omit<Props, "layout">) {
  return (
    <div className="group flex overflow-hidden rounded-xl border bg-card shadow-sm hover:shadow-lg transition-all duration-300">
      <div className="w-2/5 min-h-[220px] relative overflow-hidden">
        {promo.main_image_url ? (
          <img src={promo.main_image_url} alt={promo.destination_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : <ImagePlaceholder />}
      </div>
      <div className="w-3/5 p-4 flex flex-col justify-between gap-3">
        <div>
          <h3 className="text-base font-bold">{promo.destination_name}</h3>
          <p className="text-xs text-muted-foreground">{promo.accommodation_type}{promo.nights ? ` • ${promo.nights} noites` : ""}</p>
          {promo.period_text && <p className="text-xs text-muted-foreground mt-1">{promo.period_text}</p>}
          {promo.airport_origin && promo.airport_destination && (
            <p className="text-xs text-muted-foreground">✈ {promo.airport_origin} → {promo.airport_destination}</p>
          )}
        </div>
        <IncludedServices promo={promo} />
        <div className="flex items-end justify-between gap-2">
          <PriceBlock promo={promo} />
          {onClickCta && (
            <Button size="sm" className="text-xs" onClick={() => onClickCta(promo)}>
              Quero esse pacote
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Layout 2: Imagem grande com texto sobreposto */
function OverlayCard({ promo, onClickCta }: Omit<Props, "layout">) {
  return (
    <div className="group relative overflow-hidden rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 min-h-[320px]">
      {promo.main_image_url ? (
        <img src={promo.main_image_url} alt={promo.destination_name} className="w-full h-full object-cover absolute inset-0 group-hover:scale-105 transition-transform duration-500" />
      ) : <div className="absolute inset-0"><ImagePlaceholder /></div>}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-5 text-white space-y-2">
        <h3 className="text-xl font-bold drop-shadow-md">{promo.destination_name}</h3>
        <p className="text-sm opacity-90">{promo.accommodation_type}{promo.nights ? ` • ${promo.nights} noites` : ""}</p>
        {promo.period_text && <p className="text-xs opacity-80">{promo.period_text}</p>}
        <div className="flex flex-wrap gap-2">
          {promo.airport_origin && promo.airport_destination && (
            <Badge variant="secondary" className="bg-white/20 text-white border-0 text-xs">✈ {promo.airport_origin} → {promo.airport_destination}</Badge>
          )}
        </div>
        <div className="flex items-end justify-between pt-1">
          <div>
            {promo.installments > 1 && (
              <p className="text-lg font-bold">{promo.installments}x de {formatCurrency(promo.installment_value)}</p>
            )}
            {promo.total_value > 0 && (
              <p className={promo.installments > 1 ? "text-xs opacity-80" : "text-lg font-bold"}>
                {promo.installments > 1 ? "Total: " : ""}{formatCurrency(promo.total_value)}
              </p>
            )}
          </div>
          {onClickCta && (
            <Button size="sm" variant="secondary" className="text-xs" onClick={() => onClickCta(promo)}>
              Quero esse pacote
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Layout 3: Catálogo / estilo editorial */
function CatalogCard({ promo, onClickCta }: Omit<Props, "layout">) {
  return (
    <div className="group overflow-hidden rounded-xl border bg-card shadow-sm hover:shadow-lg transition-all duration-300">
      <div className="relative h-48 overflow-hidden">
        {promo.main_image_url ? (
          <img src={promo.main_image_url} alt={promo.destination_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : <ImagePlaceholder />}
        <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground text-xs">Promoção</Badge>
      </div>
      <div className="p-4 space-y-3">
        <div>
          <h3 className="text-base font-bold">{promo.destination_name}</h3>
          <p className="text-xs text-muted-foreground">{promo.destination_country}</p>
        </div>
        <div className="text-xs space-y-1 text-muted-foreground">
          {promo.accommodation_type && <p>🏨 {promo.accommodation_type} • {promo.nights} noites</p>}
          {promo.period_text && <p>📅 {promo.period_text}</p>}
          {promo.airport_origin && promo.airport_destination && (
            <p>✈️ {promo.airport_origin} → {promo.airport_destination}</p>
          )}
        </div>
        <IncludedServices promo={promo} />
        <div className="border-t pt-3 flex items-end justify-between">
          <PriceBlock promo={promo} />
          {onClickCta && (
            <Button size="sm" className="text-xs" onClick={() => onClickCta(promo)}>
              Quero esse pacote
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Layout 4: Minimalista */
function MinimalCard({ promo, onClickCta }: Omit<Props, "layout">) {
  return (
    <div className="group flex items-center gap-4 p-4 rounded-lg border bg-card hover:shadow-md transition-all duration-300">
      <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0">
        {promo.main_image_url ? (
          <img src={promo.main_image_url} alt={promo.destination_name} className="w-full h-full object-cover" />
        ) : <ImagePlaceholder />}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-bold truncate">{promo.destination_name}</h3>
        <p className="text-xs text-muted-foreground">{promo.accommodation_type} • {promo.nights} noites</p>
        {promo.period_text && <p className="text-xs text-muted-foreground">{promo.period_text}</p>}
      </div>
      <div className="text-right shrink-0">
        {promo.installments > 1 && (
          <p className="text-sm font-bold text-primary">{promo.installments}x {formatCurrency(promo.installment_value)}</p>
        )}
        {promo.total_value > 0 && (
          <p className="text-xs text-muted-foreground">{formatCurrency(promo.total_value)}</p>
        )}
        {onClickCta && (
          <Button size="sm" variant="outline" className="text-xs mt-1" onClick={() => onClickCta(promo)}>
            Ver mais
          </Button>
        )}
      </div>
    </div>
  );
}

export default function PromotionCard({ promo, layout, onClickCta }: Props) {
  switch (layout) {
    case "lateral": return <LateralCard promo={promo} onClickCta={onClickCta} />;
    case "overlay": return <OverlayCard promo={promo} onClickCta={onClickCta} />;
    case "catalog": return <CatalogCard promo={promo} onClickCta={onClickCta} />;
    case "minimal": return <MinimalCard promo={promo} onClickCta={onClickCta} />;
    default: return <CatalogCard promo={promo} onClickCta={onClickCta} />;
  }
}
