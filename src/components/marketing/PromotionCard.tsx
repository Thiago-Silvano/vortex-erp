import { Plane, Hotel, Coffee, Bus, Ticket, Map, Train, Users, Check } from "lucide-react";
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

export type LayoutStyle = "lateral" | "overlay" | "catalog" | "minimal" | "premium_gold" | "premium_overlay" | "premium_dark";

interface Props {
  promo: PromotionCardData;
  layout: LayoutStyle;
  onClickCta?: (promo: PromotionCardData) => void;
}

const formatCurrency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatCurrencyShort = (v: number) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

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

/* ================================================================
   NEW PREMIUM LAYOUTS (inspired by reference images)
   ================================================================ */

/** Layout 5: Premium Gold - Beach overlay with gold price box and CTA */
function PremiumGoldCard({ promo, onClickCta }: Omit<Props, "layout">) {
  const services = [
    { label: `${promo.airport_origin} → ${promo.airport_destination}`, icon: "✈", show: !!(promo.airport_origin && promo.airport_destination) },
    { label: promo.accommodation_type, icon: "🏨", show: !!promo.accommodation_type },
    { label: "Transfer + Passeios", icon: "🚐", show: promo.included_transfer || promo.included_tours },
  ].filter(s => s.show);

  return (
    <div className="group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500" style={{ minHeight: 480 }}>
      {/* Background image */}
      {promo.main_image_url ? (
        <img src={promo.main_image_url} alt={promo.destination_name} className="w-full h-full object-cover absolute inset-0 group-hover:scale-105 transition-transform duration-700" />
      ) : <div className="absolute inset-0"><ImagePlaceholder /></div>}

      {/* Gradient overlay */}
      <div className="absolute inset-0" style={{
        background: "linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.7) 100%)"
      }} />

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col justify-between p-5" style={{ minHeight: 480 }}>
        {/* Top: Title */}
        <div>
          <h3 className="text-3xl font-bold text-white drop-shadow-lg tracking-wide" style={{ fontFamily: "Georgia, serif", textShadow: "2px 2px 8px rgba(0,0,0,0.6)" }}>
            {promo.destination_name.toUpperCase()}
          </h3>
          <p className="text-white/90 text-sm mt-1 drop-shadow" style={{ textShadow: "1px 1px 4px rgba(0,0,0,0.5)" }}>
            {promo.nights} noites{promo.accommodation_type ? ` + ${promo.accommodation_type}` : ""}
          </p>
        </div>

        {/* Bottom section */}
        <div className="space-y-3">
          {/* Gold price box */}
          <div className="inline-block rounded-lg px-5 py-3 shadow-xl" style={{
            background: "linear-gradient(135deg, #d4a853 0%, #f0d78c 50%, #c49b3a 100%)",
            boxShadow: "0 4px 20px rgba(196, 155, 58, 0.4)"
          }}>
            <p className="text-xs text-amber-900/80 font-medium">A partir de</p>
            <div className="flex items-baseline gap-1">
              <span className="text-sm text-amber-900/70">R$</span>
              <span className="text-3xl font-extrabold text-amber-900" style={{ fontFamily: "Georgia, serif" }}>
                {formatCurrencyShort(promo.installment_value > 0 ? promo.installment_value : promo.total_value)}
              </span>
            </div>
            {promo.installments > 1 && (
              <p className="text-xs text-amber-900/80 font-semibold">{promo.installments}x sem juros</p>
            )}
          </div>

          {/* Services */}
          <div className="space-y-1.5">
            {services.map((s, i) => (
              <div key={i} className="flex items-center gap-2 text-white text-sm drop-shadow">
                <span>{s.icon}</span>
                <span style={{ textShadow: "1px 1px 3px rgba(0,0,0,0.5)" }}>{s.label}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          {onClickCta && (
            <button
              onClick={() => onClickCta(promo)}
              className="w-full py-3 rounded-lg text-sm font-bold uppercase tracking-wider transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: "linear-gradient(135deg, #d4a853 0%, #f0d78c 50%, #c49b3a 100%)",
                color: "#5a3e0a",
                boxShadow: "0 4px 15px rgba(196, 155, 58, 0.5), inset 0 1px 0 rgba(255,255,255,0.3)",
                textShadow: "0 1px 0 rgba(255,255,255,0.3)"
              }}
            >
              SAIBA MAIS
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Layout 6: Premium Overlay - Large image top + dark info section with icons */
function PremiumOverlayCard({ promo, onClickCta }: Omit<Props, "layout">) {
  const services = [
    { label: `${promo.nights} noites no paraíso`, icon: "🌊", show: promo.nights > 0 },
    { label: promo.accommodation_type || "Hotel", icon: "🏨", show: !!promo.accommodation_type },
    { label: "Café da manhã incluso", icon: "☕", show: !!promo.accommodation_type },
    { label: "Transfer incluso", icon: "🚐", show: promo.included_transfer },
  ].filter(s => s.show);

  return (
    <div className="group overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500" style={{ minHeight: 500 }}>
      {/* Top: image with title overlay */}
      <div className="relative h-56 overflow-hidden">
        {promo.main_image_url ? (
          <img src={promo.main_image_url} alt={promo.destination_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
        ) : <ImagePlaceholder />}
        <div className="absolute inset-0" style={{
          background: "linear-gradient(to bottom, rgba(30,40,70,0.2) 0%, rgba(30,40,70,0.7) 100%)"
        }} />
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <p className="text-white/70 text-xs italic mb-1" style={{ textShadow: "1px 1px 3px rgba(0,0,0,0.5)" }}>
            Imagine acordar com esse visual...
          </p>
          <h3 className="text-2xl font-bold text-white tracking-wide" style={{ fontFamily: "Georgia, serif", textShadow: "2px 2px 8px rgba(0,0,0,0.6)" }}>
            {promo.destination_name.toUpperCase()}
          </h3>
        </div>
      </div>

      {/* Bottom: dark info section */}
      <div className="p-5 space-y-4" style={{
        background: "linear-gradient(180deg, #1e2846 0%, #14203a 100%)"
      }}>
        {/* Services with icons */}
        <div className="space-y-2.5">
          {services.map((s, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-lg">{s.icon}</span>
              <span className="text-white/90 text-sm">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Price section */}
        <div className="flex items-center gap-2 pt-2">
          <span className="text-lg">💰</span>
          <span className="text-white/70 text-sm">A partir de</span>
          <span className="text-xl font-bold" style={{ color: "#d4a853", fontFamily: "Georgia, serif" }}>
            R${formatCurrencyShort(promo.installment_value > 0 ? promo.installment_value : promo.total_value)}
          </span>
          {promo.installments > 1 && (
            <span className="text-white/60 text-xs">/mês</span>
          )}
        </div>

        {/* CTA */}
        {onClickCta && (
          <button
            onClick={() => onClickCta(promo)}
            className="w-full py-3 rounded-lg text-sm font-bold uppercase tracking-wider transition-all duration-300 hover:brightness-110 hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: "linear-gradient(135deg, #d4a853 0%, #f0d78c 50%, #c49b3a 100%)",
              color: "#1e2846",
              boxShadow: "0 4px 15px rgba(196, 155, 58, 0.4), inset 0 1px 0 rgba(255,255,255,0.3)"
            }}
          >
            Quero esse pacote
          </button>
        )}
      </div>
    </div>
  );
}

/** Layout 7: Premium Dark - Navy dark card with framed image, gold accents, checklist */
function PremiumDarkCard({ promo, onClickCta }: Omit<Props, "layout">) {
  const inclusions = [
    { label: "Aéreo ida e volta", show: !!(promo.airport_origin && promo.airport_destination) },
    { label: `${promo.nights} noites hotel`, show: promo.nights > 0 },
    { label: promo.accommodation_type, show: !!promo.accommodation_type },
    { label: "Transfer", show: promo.included_transfer },
    { label: "Passeios inclusos", show: promo.included_tours },
    { label: "Guia turístico", show: promo.included_guide },
    { label: "Trem panorâmico", show: promo.included_train },
    { label: "Ingressos inclusos", show: promo.included_tickets },
  ].filter(s => s.show);

  return (
    <div className="group overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500" style={{
      background: "linear-gradient(180deg, #0f1b33 0%, #162040 50%, #0d1628 100%)",
      minHeight: 520,
    }}>
      {/* Gold top line */}
      <div className="h-1" style={{ background: "linear-gradient(90deg, #c49b3a, #f0d78c, #c49b3a)" }} />

      <div className="p-5 space-y-4">
        {/* Destination title */}
        <div className="text-center space-y-1">
          <h3 className="text-2xl font-bold tracking-wider" style={{
            color: "#e8e0d0",
            fontFamily: "Georgia, serif",
            textShadow: "0 2px 4px rgba(0,0,0,0.3)"
          }}>
            {promo.destination_name.toUpperCase()}
          </h3>
          <div className="flex items-center justify-center gap-2">
            <div className="h-px w-8" style={{ background: "linear-gradient(90deg, transparent, #d4a853)" }} />
            <p className="text-sm font-medium" style={{ color: "#d4a853" }}>
              {promo.destination_country}
            </p>
            <div className="h-px w-8" style={{ background: "linear-gradient(90deg, #d4a853, transparent)" }} />
          </div>
        </div>

        {/* Framed image */}
        <div className="relative mx-auto rounded-lg overflow-hidden" style={{
          border: "2px solid rgba(212, 168, 83, 0.4)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.4), inset 0 0 20px rgba(0,0,0,0.2)"
        }}>
          <div className="h-44 overflow-hidden">
            {promo.main_image_url ? (
              <img src={promo.main_image_url} alt={promo.destination_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
            ) : <ImagePlaceholder />}
          </div>

          {/* Price overlay on image */}
          <div className="absolute bottom-3 right-3 rounded-lg px-4 py-2 text-center" style={{
            background: "rgba(255,255,255,0.92)",
            boxShadow: "0 4px 15px rgba(0,0,0,0.3)"
          }}>
            <p className="text-[10px] text-gray-500 font-medium">A partir de:</p>
            <div className="flex items-baseline justify-center gap-0.5">
              <span className="text-xs text-gray-500">R$</span>
              <span className="text-2xl font-extrabold" style={{ color: "#b8860b", fontFamily: "Georgia, serif" }}>
                {formatCurrencyShort(promo.installment_value > 0 ? promo.installment_value : promo.total_value)}
              </span>
            </div>
            {promo.installments > 1 && (
              <p className="text-[10px] text-gray-500">{promo.installments}x por pessoa</p>
            )}
          </div>
        </div>

        {/* Inclusions title */}
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#d4a853" }}>
            INCLUI:
          </p>
          <div className="space-y-1.5">
            {inclusions.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 shrink-0" style={{ color: "#d4a853" }} />
                <span className="text-sm text-white/85">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Flight info */}
        {promo.airport_origin && promo.airport_destination && (
          <div className="flex items-center justify-center gap-3 text-white/70 text-xs pt-1">
            <span>✈ {promo.airport_origin} — {promo.airport_destination}</span>
            <span>•</span>
            <span>✈ {promo.airport_destination} — {promo.airport_origin}</span>
          </div>
        )}

        {/* CTA */}
        {onClickCta && (
          <button
            onClick={() => onClickCta(promo)}
            className="w-full py-3 rounded-lg text-sm font-bold uppercase tracking-wider transition-all duration-300 hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
            style={{
              background: "linear-gradient(135deg, #d4a853 0%, #f0d78c 50%, #c49b3a 100%)",
              color: "#1a1a2e",
              boxShadow: "0 4px 15px rgba(196, 155, 58, 0.4), inset 0 1px 0 rgba(255,255,255,0.3)"
            }}
          >
            Quero esse pacote
          </button>
        )}
      </div>

      {/* Gold bottom line */}
      <div className="h-1" style={{ background: "linear-gradient(90deg, #c49b3a, #f0d78c, #c49b3a)" }} />
    </div>
  );
}

export default function PromotionCard({ promo, layout, onClickCta }: Props) {
  switch (layout) {
    case "lateral": return <LateralCard promo={promo} onClickCta={onClickCta} />;
    case "overlay": return <OverlayCard promo={promo} onClickCta={onClickCta} />;
    case "catalog": return <CatalogCard promo={promo} onClickCta={onClickCta} />;
    case "minimal": return <MinimalCard promo={promo} onClickCta={onClickCta} />;
    case "premium_gold": return <PremiumGoldCard promo={promo} onClickCta={onClickCta} />;
    case "premium_overlay": return <PremiumOverlayCard promo={promo} onClickCta={onClickCta} />;
    case "premium_dark": return <PremiumDarkCard promo={promo} onClickCta={onClickCta} />;
    default: return <CatalogCard promo={promo} onClickCta={onClickCta} />;
  }
}
