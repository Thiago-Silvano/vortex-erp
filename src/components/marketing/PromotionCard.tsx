import { Plane, Hotel, Coffee, Bus, Ticket, Map, Train, Users, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CardStyleOverrides } from "./CardStyleEditor";

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
  styleOverrides?: CardStyleOverrides;
}

const formatCurrency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatCurrencyShort = (v: number) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

/* Helper: check visibility */
function vis(s: CardStyleOverrides | undefined, key: keyof CardStyleOverrides, fallback = true): boolean {
  if (!s) return fallback;
  const v = s[key];
  return v === undefined ? fallback : !!v;
}

/* Build subtitle line respecting visibility */
function subtitleText(promo: PromotionCardData, s?: CardStyleOverrides): string {
  const parts: string[] = [];
  if (vis(s, "showAccommodation") && promo.accommodation_type) parts.push(promo.accommodation_type);
  if (vis(s, "showNights") && promo.nights) parts.push(`${promo.nights} noites`);
  return parts.join(" • ");
}

function IncludedServices({ promo, s, className = "" }: { promo: PromotionCardData; s?: CardStyleOverrides; className?: string }) {
  if (!vis(s, "showServices")) return null;
  const services = [
    { key: "airport", label: "Aéreo", icon: Plane, show: !!(promo.airport_origin && promo.airport_destination) },
    { key: "hotel", label: "Hospedagem", icon: Hotel, show: !!promo.accommodation_type },
    { key: "transfer", label: "Transfer", icon: Bus, show: promo.included_transfer },
    { key: "tickets", label: "Ingressos", icon: Ticket, show: promo.included_tickets },
    { key: "tours", label: "Passeios", icon: Map, show: promo.included_tours },
    { key: "guide", label: "Guia", icon: Users, show: promo.included_guide },
    { key: "train", label: "Trem", icon: Train, show: promo.included_train },
  ].filter(srv => srv.show);
  if (!services.length) return null;
  const bodyStyle: React.CSSProperties = {};
  if (s?.bodySize) bodyStyle.fontSize = `${s.bodySize}px`;
  if (s?.textColor) bodyStyle.color = s.textColor;
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {services.map(srv => (
        <div key={srv.key} className="flex items-center gap-1 text-xs text-muted-foreground" style={bodyStyle}>
          <srv.icon className="h-3.5 w-3.5" />
          <span>{srv.label}</span>
        </div>
      ))}
    </div>
  );
}

function PriceBlock({ promo, s }: { promo: PromotionCardData; s?: CardStyleOverrides }) {
  const priceStyle: React.CSSProperties = {};
  if (s?.priceSize) priceStyle.fontSize = `${s.priceSize}px`;
  if (s?.priceTextColor) priceStyle.color = s.priceTextColor;
  return (
    <div>
      {vis(s, "showInstallments") && promo.installments > 1 && (
        <p className="text-lg font-bold text-primary" style={priceStyle}>
          {promo.installments}x de {formatCurrency(promo.installment_value)}
        </p>
      )}
      {vis(s, "showTotalValue") && promo.total_value > 0 && (
        <p className={promo.installments > 1 ? "text-xs text-muted-foreground" : "text-lg font-bold text-primary"} style={promo.installments > 1 ? {} : priceStyle}>
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

function ImageEl({ promo, s, className = "" }: { promo: PromotionCardData; s?: CardStyleOverrides; className?: string }) {
  const imgStyle: React.CSSProperties = {};
  if (s?.imageBrightness && s.imageBrightness !== 100) imgStyle.filter = `brightness(${s.imageBrightness}%)`;
  if (promo.main_image_url) {
    return <img src={promo.main_image_url} alt={promo.destination_name} className={className} style={imgStyle} />;
  }
  return <ImagePlaceholder />;
}

function TitleEl({ text, s, className = "", baseStyle }: { text: string; s?: CardStyleOverrides; className?: string; baseStyle?: React.CSSProperties }) {
  const titleStyle: React.CSSProperties = { ...baseStyle };
  if (s?.titleFont) titleStyle.fontFamily = s.titleFont;
  if (s?.titleWeight) titleStyle.fontWeight = s.titleWeight;
  if (s?.titleSize) titleStyle.fontSize = `${s.titleSize}px`;
  if (s?.textColor) titleStyle.color = s.textColor;
  return <h3 className={className} style={titleStyle}>{text}</h3>;
}

function SubtitleEl({ promo, s, className = "" }: { promo: PromotionCardData; s?: CardStyleOverrides; className?: string }) {
  const text = subtitleText(promo, s);
  if (!text) return null;
  const st: React.CSSProperties = {};
  if (s?.subtitleSize) st.fontSize = `${s.subtitleSize}px`;
  if (s?.textColor) st.color = s.textColor;
  return <p className={className} style={st}>{text}</p>;
}

function CtaButton({ promo, s, onClickCta, variant = "default", className = "", style: baseStyle }: {
  promo: PromotionCardData; s?: CardStyleOverrides; onClickCta?: (p: PromotionCardData) => void;
  variant?: "default" | "gold"; className?: string; style?: React.CSSProperties;
}) {
  if (!vis(s, "showCta")) return null;
  const ctaStyle: React.CSSProperties = { ...baseStyle };
  if (s?.ctaBgColor) ctaStyle.background = s.ctaBgColor;
  if (s?.ctaTextColor) ctaStyle.color = s.ctaTextColor;
  if (s?.ctaBorderRadius !== undefined && s.ctaBorderRadius !== 8) ctaStyle.borderRadius = `${s.ctaBorderRadius}px`;
  const text = s?.ctaText || "Quero esse pacote";
  if (variant === "gold") {
    return (
      <button onClick={() => onClickCta?.(promo)} className={className} style={ctaStyle}>
        {text.toUpperCase()}
      </button>
    );
  }
  return (
    <Button size="sm" className={`text-xs ${className}`} onClick={() => onClickCta?.(promo)} style={ctaStyle}>
      {text}
    </Button>
  );
}

/* Card wrapper with common overrides + textColor propagation */
function CardWrap({ s, children, className = "", style: baseStyle }: {
  s?: CardStyleOverrides; children: React.ReactNode; className?: string; style?: React.CSSProperties;
}) {
  const wrapStyle: React.CSSProperties = { ...baseStyle };
  if (s?.bgColor) wrapStyle.background = s.bgColor;
  if (s?.textColor) wrapStyle.color = s.textColor;
  if (s?.borderRadius) wrapStyle.borderRadius = `${s.borderRadius}px`;
  if (s?.cardPadding) wrapStyle.padding = `${s.cardPadding}px`;
  if (s?.shadowIntensity !== undefined && s.shadowIntensity !== 50) {
    const v = s.shadowIntensity / 100;
    wrapStyle.boxShadow = `0 ${4 * v}px ${20 * v}px rgba(0,0,0,${0.15 * v})`;
  }
  if (s?.cardWidth && s.cardWidth > 0) wrapStyle.width = s.cardWidth;
  if (s?.cardHeight && s.cardHeight > 0) { wrapStyle.minHeight = s.cardHeight; }
  return <div className={className} style={wrapStyle}>{children}</div>;
}

// ──────────────────────────────────────────────────────────────────
// LAYOUTS
// ──────────────────────────────────────────────────────────────────

/** Layout 1: Imagem lateral */
function LateralCard({ promo, onClickCta, s }: Omit<Props, "layout"> & { s?: CardStyleOverrides }) {
  return (
    <CardWrap s={s} className="group flex overflow-hidden rounded-xl border bg-card shadow-sm hover:shadow-lg transition-all duration-300">
      <div className="w-2/5 min-h-[220px] relative overflow-hidden" style={s?.imageHeight ? { height: s.imageHeight } : undefined}>
        <ImageEl promo={promo} s={s} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
      </div>
      <div className="w-3/5 p-4 flex flex-col justify-between gap-3">
        <div>
          <TitleEl text={promo.destination_name} s={s} className="text-base font-bold" />
          <SubtitleEl promo={promo} s={s} className="text-xs text-muted-foreground" />
          {vis(s, "showPeriod") && promo.period_text && <p className="text-xs text-muted-foreground mt-1" style={s?.textColor ? { color: s.textColor } : undefined}>{promo.period_text}</p>}
          {vis(s, "showAirports") && promo.airport_origin && promo.airport_destination && (
            <p className="text-xs text-muted-foreground" style={s?.textColor ? { color: s.textColor } : undefined}>✈ {promo.airport_origin} → {promo.airport_destination}</p>
          )}
        </div>
        <IncludedServices promo={promo} s={s} />
        <div className="flex items-end justify-between gap-2">
          <PriceBlock promo={promo} s={s} />
          <CtaButton promo={promo} s={s} onClickCta={onClickCta} />
        </div>
      </div>
    </CardWrap>
  );
}

/** Layout 2: Imagem grande com texto sobreposto */
function OverlayCard({ promo, onClickCta, s }: Omit<Props, "layout"> & { s?: CardStyleOverrides }) {
  const overlayBg = s?.overlayColor
    ? `linear-gradient(to top, ${s.overlayColor}cc, ${s.overlayColor}4d, transparent)`
    : "linear-gradient(to top, rgba(0,0,0,0.8), rgba(0,0,0,0.3), transparent)";
  const overlayOpacity = s?.overlayOpacity ? s.overlayOpacity / 100 : undefined;
  return (
    <CardWrap s={s} className="group relative overflow-hidden rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 min-h-[320px]">
      <ImageEl promo={promo} s={s} className="w-full h-full object-cover absolute inset-0 group-hover:scale-105 transition-transform duration-500" />
      <div className="absolute inset-0" style={{ background: overlayBg, opacity: overlayOpacity }} />
      <div className="absolute bottom-0 left-0 right-0 p-5 text-white space-y-2">
        <TitleEl text={promo.destination_name} s={s} className="text-xl font-bold drop-shadow-md" />
        <SubtitleEl promo={promo} s={s} className="text-sm opacity-90" />
        {vis(s, "showPeriod") && promo.period_text && <p className="text-xs opacity-80">{promo.period_text}</p>}
        {vis(s, "showAirports") && promo.airport_origin && promo.airport_destination && (
          <Badge variant="secondary" className="bg-white/20 text-white border-0 text-xs">✈ {promo.airport_origin} → {promo.airport_destination}</Badge>
        )}
        <div className="flex items-end justify-between pt-1">
          <div>
            {vis(s, "showInstallments") && promo.installments > 1 && (
              <p className="text-lg font-bold" style={s?.priceSize ? { fontSize: s.priceSize } : undefined}>{promo.installments}x de {formatCurrency(promo.installment_value)}</p>
            )}
            {vis(s, "showTotalValue") && promo.total_value > 0 && (
              <p className={promo.installments > 1 ? "text-xs opacity-80" : "text-lg font-bold"}>
                {promo.installments > 1 ? "Total: " : ""}{formatCurrency(promo.total_value)}
              </p>
            )}
          </div>
          <CtaButton promo={promo} s={s} onClickCta={onClickCta} />
        </div>
      </div>
    </CardWrap>
  );
}

/** Layout 3: Catálogo / estilo editorial */
function CatalogCard({ promo, onClickCta, s }: Omit<Props, "layout"> & { s?: CardStyleOverrides }) {
  const bodyStyle: React.CSSProperties = {};
  if (s?.bodySize) bodyStyle.fontSize = `${s.bodySize}px`;
  if (s?.textColor) bodyStyle.color = s.textColor;
  return (
    <CardWrap s={s} className="group overflow-hidden rounded-xl border bg-card shadow-sm hover:shadow-lg transition-all duration-300">
      <div className="relative overflow-hidden" style={{ height: s?.imageHeight || 192 }}>
        <ImageEl promo={promo} s={s} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        {vis(s, "showBadge") && (
          <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground text-xs" style={s?.accentColor ? { background: s.accentColor } : undefined}>
            {s?.badgeText || "Promoção"}
          </Badge>
        )}
      </div>
      <div className="p-4 space-y-3">
        <div>
          <TitleEl text={promo.destination_name} s={s} className="text-base font-bold" />
          {vis(s, "showCountry") && <p className="text-xs text-muted-foreground" style={bodyStyle}>{promo.destination_country}</p>}
        </div>
        <div className="text-xs space-y-1 text-muted-foreground" style={bodyStyle}>
          {vis(s, "showAccommodation") && promo.accommodation_type && <p>🏨 {promo.accommodation_type}{vis(s, "showNights") && promo.nights ? ` • ${promo.nights} noites` : ""}</p>}
          {vis(s, "showPeriod") && promo.period_text && <p>📅 {promo.period_text}</p>}
          {vis(s, "showAirports") && promo.airport_origin && promo.airport_destination && (
            <p>✈️ {promo.airport_origin} → {promo.airport_destination}</p>
          )}
        </div>
        <IncludedServices promo={promo} s={s} />
        <div className="border-t pt-3 flex items-end justify-between">
          <PriceBlock promo={promo} s={s} />
          <CtaButton promo={promo} s={s} onClickCta={onClickCta} />
        </div>
      </div>
    </CardWrap>
  );
}

/** Layout 4: Minimalista */
function MinimalCard({ promo, onClickCta, s }: Omit<Props, "layout"> & { s?: CardStyleOverrides }) {
  return (
    <CardWrap s={s} className="group flex items-center gap-4 p-4 rounded-lg border bg-card hover:shadow-md transition-all duration-300">
      <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0">
        <ImageEl promo={promo} s={s} className="w-full h-full object-cover" />
      </div>
      <div className="flex-1 min-w-0">
        <TitleEl text={promo.destination_name} s={s} className="text-sm font-bold truncate" />
        <SubtitleEl promo={promo} s={s} className="text-xs text-muted-foreground" />
        {vis(s, "showPeriod") && promo.period_text && <p className="text-xs text-muted-foreground" style={s?.textColor ? { color: s.textColor } : undefined}>{promo.period_text}</p>}
      </div>
      <div className="text-right shrink-0">
        {vis(s, "showInstallments") && promo.installments > 1 && (
          <p className="text-sm font-bold text-primary" style={s?.priceSize ? { fontSize: s.priceSize } : undefined}>
            {promo.installments}x {formatCurrency(promo.installment_value)}
          </p>
        )}
        {vis(s, "showTotalValue") && promo.total_value > 0 && (
          <p className="text-xs text-muted-foreground">{formatCurrency(promo.total_value)}</p>
        )}
        <CtaButton promo={promo} s={s} onClickCta={onClickCta} variant="default" />
      </div>
    </CardWrap>
  );
}

// ──────────────────────────────────────────────────────────────────
// PREMIUM LAYOUTS
// ──────────────────────────────────────────────────────────────────

/** Layout 5: Premium Gold */
function PremiumGoldCard({ promo, onClickCta, s }: Omit<Props, "layout"> & { s?: CardStyleOverrides }) {
  const accent = s?.accentColor || "#d4a853";
  const sub = subtitleText(promo, s);
  const services = [
    { label: `${promo.airport_origin} → ${promo.airport_destination}`, icon: "✈", show: vis(s, "showAirports") && !!(promo.airport_origin && promo.airport_destination) },
    { label: promo.accommodation_type, icon: "🏨", show: vis(s, "showAccommodation") && !!promo.accommodation_type },
    { label: "Transfer + Passeios", icon: "🚐", show: vis(s, "showServices") && (promo.included_transfer || promo.included_tours) },
  ].filter(srv => srv.show);

  const priceBoxStyle: React.CSSProperties = s?.priceBoxBg
    ? { background: s.priceBoxBg, boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }
    : { background: `linear-gradient(135deg, ${accent} 0%, #f0d78c 50%, ${accent} 100%)`, boxShadow: `0 4px 20px ${accent}66` };

  const ctaBaseStyle: React.CSSProperties = s?.ctaBgColor
    ? { background: s.ctaBgColor, color: s.ctaTextColor || "#5a3e0a" }
    : { background: `linear-gradient(135deg, ${accent} 0%, #f0d78c 50%, ${accent} 100%)`, color: "#5a3e0a", boxShadow: `0 4px 15px ${accent}80, inset 0 1px 0 rgba(255,255,255,0.3)`, textShadow: "0 1px 0 rgba(255,255,255,0.3)" };

  const priceTxtColor = s?.priceTextColor || "#78350f";

  return (
    <CardWrap s={s} className="group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500" style={{ minHeight: s?.cardHeight || 480 }}>
      <ImageEl promo={promo} s={s} className="w-full h-full object-cover absolute inset-0 group-hover:scale-105 transition-transform duration-700" />
      <div className="absolute inset-0" style={{
        background: s?.overlayColor
          ? `linear-gradient(to bottom, ${s.overlayColor}1a, ${s.overlayColor}4d, ${s.overlayColor}b3)`
          : "linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.7) 100%)",
        opacity: s?.overlayOpacity ? s.overlayOpacity / 100 : undefined,
      }} />
      <div className="relative z-10 h-full flex flex-col justify-between p-5" style={{ minHeight: s?.cardHeight || 480 }}>
        <div>
          <TitleEl text={promo.destination_name.toUpperCase()} s={s} className="text-3xl font-bold text-white drop-shadow-lg tracking-wide" baseStyle={{ fontFamily: "Georgia, serif", textShadow: "2px 2px 8px rgba(0,0,0,0.6)" }} />
          {sub && <p className="text-white/90 text-sm mt-1 drop-shadow" style={{ textShadow: "1px 1px 4px rgba(0,0,0,0.5)", ...(s?.subtitleSize ? { fontSize: s.subtitleSize } : {}) }}>{sub}</p>}
        </div>
        <div className="space-y-3">
          <div className="inline-block rounded-lg px-5 py-3 shadow-xl" style={priceBoxStyle}>
            <p className="text-xs font-medium" style={{ color: `${priceTxtColor}cc` }}>A partir de</p>
            <div className="flex items-baseline gap-1">
              <span className="text-sm" style={{ color: `${priceTxtColor}b3` }}>R$</span>
              <span className="text-3xl font-extrabold" style={{
                color: priceTxtColor,
                fontFamily: s?.titleFont || "Georgia, serif",
                ...(s?.priceSize ? { fontSize: s.priceSize } : {}),
              }}>
                {formatCurrencyShort(promo.installment_value > 0 ? promo.installment_value : promo.total_value)}
              </span>
            </div>
            {vis(s, "showInstallments") && promo.installments > 1 && (
              <p className="text-xs font-semibold" style={{ color: `${priceTxtColor}cc` }}>{promo.installments}x sem juros</p>
            )}
          </div>
          {vis(s, "showServices") && services.length > 0 && (
            <div className="space-y-1.5">
              {services.map((srv, i) => (
                <div key={i} className="flex items-center gap-2 text-white text-sm drop-shadow">
                  <span>{srv.icon}</span>
                  <span style={{ textShadow: "1px 1px 3px rgba(0,0,0,0.5)", ...(s?.bodySize ? { fontSize: s.bodySize } : {}) }}>{srv.label}</span>
                </div>
              ))}
            </div>
          )}
          <CtaButton promo={promo} s={s} onClickCta={onClickCta} variant="gold"
            className="w-full py-3 rounded-lg text-sm font-bold uppercase tracking-wider transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            style={ctaBaseStyle}
          />
        </div>
      </div>
    </CardWrap>
  );
}

/** Layout 6: Premium Overlay */
function PremiumOverlayCard({ promo, onClickCta, s }: Omit<Props, "layout"> & { s?: CardStyleOverrides }) {
  const accent = s?.accentColor || "#d4a853";
  const bgSection = s?.bgColor || "#1e2846";
  const services = [
    { label: vis(s, "showNights") ? `${promo.nights} noites no paraíso` : "Estadia completa", icon: "🌊", show: promo.nights > 0 },
    { label: promo.accommodation_type || "Hotel", icon: "🏨", show: vis(s, "showAccommodation") && !!promo.accommodation_type },
    { label: "Café da manhã incluso", icon: "☕", show: vis(s, "showAccommodation") && !!promo.accommodation_type },
    { label: "Transfer incluso", icon: "🚐", show: vis(s, "showServices") && promo.included_transfer },
  ].filter(srv => srv.show);

  return (
    <CardWrap s={s} className="group overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500" style={{ minHeight: s?.cardHeight || 500 }}>
      <div className="relative overflow-hidden" style={{ height: s?.imageHeight || 224 }}>
        <ImageEl promo={promo} s={s} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
        <div className="absolute inset-0" style={{
          background: s?.overlayColor
            ? `linear-gradient(to bottom, ${s.overlayColor}33, ${s.overlayColor}b3)`
            : "linear-gradient(to bottom, rgba(30,40,70,0.2) 0%, rgba(30,40,70,0.7) 100%)",
          opacity: s?.overlayOpacity ? s.overlayOpacity / 100 : undefined,
        }} />
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <p className="text-white/70 text-xs italic mb-1" style={{ textShadow: "1px 1px 3px rgba(0,0,0,0.5)" }}>
            Imagine acordar com esse visual...
          </p>
          <TitleEl text={promo.destination_name.toUpperCase()} s={s} className="text-2xl font-bold text-white tracking-wide" baseStyle={{ fontFamily: "Georgia, serif", textShadow: "2px 2px 8px rgba(0,0,0,0.6)" }} />
        </div>
      </div>
      <div className="p-5 space-y-4" style={{ background: bgSection.startsWith("linear") ? bgSection : bgSection }}>
        {vis(s, "showServices") && services.length > 0 && (
          <div className="space-y-2.5">
            {services.map((srv, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-lg">{srv.icon}</span>
                <span className="text-white/90 text-sm" style={s?.bodySize ? { fontSize: s.bodySize } : undefined}>{srv.label}</span>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2 pt-2">
          <span className="text-lg">💰</span>
          <span className="text-white/70 text-sm">A partir de</span>
          <span className="text-xl font-bold" style={{ color: s?.priceTextColor || accent, fontFamily: s?.titleFont || "Georgia, serif", ...(s?.priceSize ? { fontSize: s.priceSize } : {}) }}>
            R${formatCurrencyShort(promo.installment_value > 0 ? promo.installment_value : promo.total_value)}
          </span>
          {vis(s, "showInstallments") && promo.installments > 1 && (
            <span className="text-white/60 text-xs">/mês</span>
          )}
        </div>
        <CtaButton promo={promo} s={s} onClickCta={onClickCta} variant="gold"
          className="w-full py-3 rounded-lg text-sm font-bold uppercase tracking-wider transition-all duration-300 hover:brightness-110 hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background: s?.ctaBgColor || `linear-gradient(135deg, ${accent} 0%, #f0d78c 50%, ${accent} 100%)`,
            color: s?.ctaTextColor || "#1e2846",
            boxShadow: `0 4px 15px ${accent}66, inset 0 1px 0 rgba(255,255,255,0.3)`,
          }}
        />
      </div>
    </CardWrap>
  );
}

/** Layout 7: Premium Dark */
function PremiumDarkCard({ promo, onClickCta, s }: Omit<Props, "layout"> & { s?: CardStyleOverrides }) {
  const accent = s?.accentColor || "#d4a853";
  const cardBg = s?.bgColor || "linear-gradient(180deg, #0f1b33 0%, #162040 50%, #0d1628 100%)";
  const inclusions = [
    { label: "Aéreo ida e volta", show: vis(s, "showAirports") && !!(promo.airport_origin && promo.airport_destination) },
    { label: vis(s, "showNights") ? `${promo.nights} noites hotel` : "Estadia hotel", show: promo.nights > 0 },
    { label: promo.accommodation_type, show: vis(s, "showAccommodation") && !!promo.accommodation_type },
    { label: "Transfer", show: vis(s, "showServices") && promo.included_transfer },
    { label: "Passeios inclusos", show: vis(s, "showServices") && promo.included_tours },
    { label: "Guia turístico", show: vis(s, "showServices") && promo.included_guide },
    { label: "Trem panorâmico", show: vis(s, "showServices") && promo.included_train },
    { label: "Ingressos inclusos", show: vis(s, "showServices") && promo.included_tickets },
  ].filter(srv => srv.show);

  const titleBaseStyle: React.CSSProperties = { color: s?.textColor || "#e8e0d0", fontFamily: "Georgia, serif", textShadow: "0 2px 4px rgba(0,0,0,0.3)" };

  return (
    <CardWrap s={s} className="group overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500" style={{ background: cardBg, minHeight: s?.cardHeight || 520 }}>
      <div className="h-1" style={{ background: `linear-gradient(90deg, ${accent}, #f0d78c, ${accent})` }} />
      <div className="p-5 space-y-4">
        <div className="text-center space-y-1">
          <TitleEl text={promo.destination_name.toUpperCase()} s={s} className="text-2xl font-bold tracking-wider" baseStyle={titleBaseStyle} />
          {vis(s, "showCountry") && (
            <div className="flex items-center justify-center gap-2">
              <div className="h-px w-8" style={{ background: `linear-gradient(90deg, transparent, ${accent})` }} />
              <p className="text-sm font-medium" style={{ color: accent }}>{promo.destination_country}</p>
              <div className="h-px w-8" style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }} />
            </div>
          )}
        </div>
        <div className="relative mx-auto rounded-lg overflow-hidden" style={{
          border: `2px solid ${accent}66`,
          boxShadow: "0 4px 20px rgba(0,0,0,0.4), inset 0 0 20px rgba(0,0,0,0.2)"
        }}>
          <div className="overflow-hidden" style={{ height: s?.imageHeight || 176 }}>
            <ImageEl promo={promo} s={s} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
          </div>
          <div className="absolute bottom-3 right-3 rounded-lg px-4 py-2 text-center" style={{
            background: s?.priceBoxBg || "rgba(255,255,255,0.92)",
            boxShadow: "0 4px 15px rgba(0,0,0,0.3)"
          }}>
            <p className="text-[10px] font-medium" style={{ color: s?.priceTextColor ? `${s.priceTextColor}99` : "#6b7280" }}>A partir de:</p>
            <div className="flex items-baseline justify-center gap-0.5">
              <span className="text-xs" style={{ color: s?.priceTextColor ? `${s.priceTextColor}99` : "#6b7280" }}>R$</span>
              <span className="text-2xl font-extrabold" style={{
                color: s?.priceTextColor || "#b8860b",
                fontFamily: s?.titleFont || "Georgia, serif",
                ...(s?.priceSize ? { fontSize: s.priceSize } : {}),
              }}>
                {formatCurrencyShort(promo.installment_value > 0 ? promo.installment_value : promo.total_value)}
              </span>
            </div>
            {vis(s, "showInstallments") && promo.installments > 1 && (
              <p className="text-[10px]" style={{ color: s?.priceTextColor ? `${s.priceTextColor}99` : "#6b7280" }}>{promo.installments}x por pessoa</p>
            )}
          </div>
        </div>
        {inclusions.length > 0 && (
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: accent }}>INCLUI:</p>
            <div className="space-y-1.5">
              {inclusions.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 shrink-0" style={{ color: accent }} />
                  <span className="text-sm text-white/85" style={s?.bodySize ? { fontSize: s.bodySize } : undefined}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {vis(s, "showAirports") && promo.airport_origin && promo.airport_destination && (
          <div className="flex items-center justify-center gap-3 text-white/70 text-xs pt-1">
            <span>✈ {promo.airport_origin} — {promo.airport_destination}</span>
            <span>•</span>
            <span>✈ {promo.airport_destination} — {promo.airport_origin}</span>
          </div>
        )}
        <CtaButton promo={promo} s={s} onClickCta={onClickCta} variant="gold"
          className="w-full py-3 rounded-lg text-sm font-bold uppercase tracking-wider transition-all duration-300 hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
          style={{
            background: s?.ctaBgColor || `linear-gradient(135deg, ${accent} 0%, #f0d78c 50%, ${accent} 100%)`,
            color: s?.ctaTextColor || "#1a1a2e",
            boxShadow: `0 4px 15px ${accent}66, inset 0 1px 0 rgba(255,255,255,0.3)`,
          }}
        />
      </div>
      <div className="h-1" style={{ background: `linear-gradient(90deg, ${accent}, #f0d78c, ${accent})` }} />
    </CardWrap>
  );
}

export default function PromotionCard({ promo, layout, onClickCta, styleOverrides }: Props) {
  const s = styleOverrides;
  switch (layout) {
    case "lateral": return <LateralCard promo={promo} onClickCta={onClickCta} s={s} />;
    case "overlay": return <OverlayCard promo={promo} onClickCta={onClickCta} s={s} />;
    case "catalog": return <CatalogCard promo={promo} onClickCta={onClickCta} s={s} />;
    case "minimal": return <MinimalCard promo={promo} onClickCta={onClickCta} s={s} />;
    case "premium_gold": return <PremiumGoldCard promo={promo} onClickCta={onClickCta} s={s} />;
    case "premium_overlay": return <PremiumOverlayCard promo={promo} onClickCta={onClickCta} s={s} />;
    case "premium_dark": return <PremiumDarkCard promo={promo} onClickCta={onClickCta} s={s} />;
    default: return <CatalogCard promo={promo} onClickCta={onClickCta} s={s} />;
  }
}
