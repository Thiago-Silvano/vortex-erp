export interface ElementStyle {
  x: number;
  y: number;
  color: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
  background: string;
  borderRadius: number;
  opacity: number;
  padding: number;
  visible: boolean;
  width: string; // "auto" or px
}

export const DEFAULT_ELEMENT_STYLE: ElementStyle = {
  x: 0,
  y: 0,
  color: "",
  fontSize: 0,
  fontFamily: "",
  fontWeight: "",
  background: "",
  borderRadius: 0,
  opacity: 100,
  padding: 0,
  visible: true,
  width: "auto",
};

export type CanvasElementId =
  | "badge"
  | "title"
  | "subtitle"
  | "country"
  | "period"
  | "airports"
  | "services"
  | "price"
  | "totalValue"
  | "cta";

export interface CanvasElementDef {
  id: CanvasElementId;
  label: string;
  defaultStyle: Partial<ElementStyle>;
}

export const CANVAS_ELEMENTS: CanvasElementDef[] = [
  { id: "badge", label: "Badge", defaultStyle: { fontSize: 11, padding: 4, borderRadius: 4, background: "rgba(212,168,83,0.9)", color: "#ffffff" } },
  { id: "title", label: "Título", defaultStyle: { fontSize: 22, fontWeight: "700", color: "#ffffff" } },
  { id: "subtitle", label: "Subtítulo", defaultStyle: { fontSize: 13, color: "rgba(255,255,255,0.85)" } },
  { id: "country", label: "País", defaultStyle: { fontSize: 12, color: "rgba(255,255,255,0.7)" } },
  { id: "period", label: "Período", defaultStyle: { fontSize: 12, color: "rgba(255,255,255,0.8)" } },
  { id: "airports", label: "Aeroportos", defaultStyle: { fontSize: 12, color: "rgba(255,255,255,0.8)" } },
  { id: "services", label: "Serviços", defaultStyle: { fontSize: 11, color: "rgba(255,255,255,0.8)" } },
  { id: "price", label: "Preço parcelado", defaultStyle: { fontSize: 20, fontWeight: "700", color: "#ffffff" } },
  { id: "totalValue", label: "Valor total", defaultStyle: { fontSize: 12, color: "rgba(255,255,255,0.7)" } },
  { id: "cta", label: "Botão CTA", defaultStyle: { fontSize: 13, fontWeight: "600", background: "#d4a853", color: "#1a1a2e", borderRadius: 8, padding: 8 } },
];

export interface CanvasState {
  elements: Record<CanvasElementId, ElementStyle>;
  image: {
    offsetX: number;
    offsetY: number;
    brightness: number;
    scale: number;
  };
  card: {
    width: number;
    height: number;
    bgColor: string;
    overlayColor: string;
    overlayOpacity: number;
    borderRadius: number;
  };
  ctaText: string;
  badgeText: string;
}

export function buildInitialState(): CanvasState {
  const elements: any = {};
  CANVAS_ELEMENTS.forEach(def => {
    elements[def.id] = { ...DEFAULT_ELEMENT_STYLE, ...def.defaultStyle };
  });

  // Default positions (overlay-like layout)
  elements.badge.x = 16; elements.badge.y = 16;
  elements.title.x = 20; elements.title.y = 280;
  elements.subtitle.x = 20; elements.subtitle.y = 310;
  elements.country.x = 20; elements.country.y = 330;
  elements.period.x = 20; elements.period.y = 352;
  elements.airports.x = 20; elements.airports.y = 372;
  elements.services.x = 20; elements.services.y = 396;
  elements.price.x = 20; elements.price.y = 430;
  elements.totalValue.x = 20; elements.totalValue.y = 456;
  elements.cta.x = 250; elements.cta.y = 428;

  return {
    elements,
    image: { offsetX: 0, offsetY: 0, brightness: 100, scale: 100 },
    card: { width: 400, height: 500, bgColor: "#1a1a2e", overlayColor: "#000000", overlayOpacity: 50, borderRadius: 16 },
    ctaText: "Quero esse pacote",
    badgeText: "Promoção",
  };
}
