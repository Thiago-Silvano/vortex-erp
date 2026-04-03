import type { CanvasState, CanvasElementId, ElementStyle } from "./types";
import { DEFAULT_ELEMENT_STYLE, CANVAS_ELEMENTS } from "./types";

export interface LayoutPreset {
  id: string;
  label: string;
  premium?: boolean;
  build: () => CanvasState;
}

function baseElements(): Record<CanvasElementId, ElementStyle> {
  const elements: any = {};
  CANVAS_ELEMENTS.forEach(def => {
    elements[def.id] = { ...DEFAULT_ELEMENT_STYLE, ...def.defaultStyle };
  });
  return elements;
}

// Default — bottom overlay
function buildDefault(): CanvasState {
  const elements = baseElements();
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

// Premium 1 — Elegant centered
function buildElegant(): CanvasState {
  const elements = baseElements();
  // Badge top-right
  elements.badge = { ...elements.badge, x: 290, y: 16, fontSize: 10, background: "rgba(30,30,60,0.85)", color: "#d4a853", borderRadius: 12, padding: 6 };
  // Title centered
  elements.title = { ...elements.title, x: 60, y: 200, fontSize: 28, fontWeight: "700", color: "#ffffff", fontFamily: "'Playfair Display', serif" };
  elements.subtitle = { ...elements.subtitle, x: 100, y: 240, fontSize: 14, color: "rgba(255,255,255,0.9)", fontFamily: "'Inter', sans-serif" };
  elements.country = { ...elements.country, x: 160, y: 265, fontSize: 11, color: "#d4a853" };
  elements.period = { ...elements.period, x: 20, y: 380, fontSize: 11, color: "rgba(255,255,255,0.7)" };
  elements.airports = { ...elements.airports, x: 20, y: 400, fontSize: 11, color: "rgba(255,255,255,0.7)" };
  elements.services = { ...elements.services, x: 20, y: 424, fontSize: 10, color: "rgba(255,255,255,0.6)" };
  elements.price = { ...elements.price, x: 100, y: 320, fontSize: 32, fontWeight: "800", color: "#d4a853", fontFamily: "'Montserrat', sans-serif" };
  elements.totalValue = { ...elements.totalValue, x: 130, y: 355, fontSize: 12, color: "rgba(255,255,255,0.5)" };
  elements.cta = { ...elements.cta, x: 110, y: 450, fontSize: 13, fontWeight: "600", background: "#d4a853", color: "#1a1a2e", borderRadius: 24, padding: 10 };
  return {
    elements,
    image: { offsetX: 0, offsetY: 0, brightness: 80, scale: 110 },
    card: { width: 400, height: 500, bgColor: "#0f0f23", overlayColor: "#0f0f23", overlayOpacity: 60, borderRadius: 20 },
    ctaText: "Reservar agora",
    badgeText: "Exclusivo",
  };
}

// Premium 2 — Split horizontal (image top, info bottom)
function buildSplit(): CanvasState {
  const elements = baseElements();
  elements.badge = { ...elements.badge, x: 16, y: 16, fontSize: 10, background: "#e74c3c", color: "#ffffff", borderRadius: 4, padding: 4 };
  elements.title = { ...elements.title, x: 20, y: 260, fontSize: 20, fontWeight: "700", color: "#ffffff", fontFamily: "'Poppins', sans-serif" };
  elements.subtitle = { ...elements.subtitle, x: 20, y: 288, fontSize: 12, color: "rgba(255,255,255,0.8)" };
  elements.country = { ...elements.country, x: 20, y: 308, fontSize: 11, color: "rgba(255,255,255,0.6)" };
  elements.period = { ...elements.period, x: 20, y: 340, fontSize: 11, color: "rgba(255,255,255,0.7)" };
  elements.airports = { ...elements.airports, x: 200, y: 340, fontSize: 11, color: "rgba(255,255,255,0.7)" };
  elements.services = { ...elements.services, x: 20, y: 365, fontSize: 10, color: "rgba(255,255,255,0.65)" };
  elements.price = { ...elements.price, x: 20, y: 410, fontSize: 26, fontWeight: "800", color: "#2ecc71", fontFamily: "'Montserrat', sans-serif" };
  elements.totalValue = { ...elements.totalValue, x: 20, y: 440, fontSize: 11, color: "rgba(255,255,255,0.5)" };
  elements.cta = { ...elements.cta, x: 240, y: 415, fontSize: 12, fontWeight: "700", background: "#2ecc71", color: "#ffffff", borderRadius: 6, padding: 8 };
  return {
    elements,
    image: { offsetX: 0, offsetY: 0, brightness: 90, scale: 100 },
    card: { width: 400, height: 500, bgColor: "#1e272e", overlayColor: "#1e272e", overlayOpacity: 70, borderRadius: 12 },
    ctaText: "Ver detalhes",
    badgeText: "Oferta",
  };
}

// Premium 3 — Minimalist white
function buildMinimalist(): CanvasState {
  const elements = baseElements();
  elements.badge = { ...elements.badge, x: 16, y: 16, fontSize: 9, background: "rgba(0,0,0,0.7)", color: "#ffffff", borderRadius: 16, padding: 6 };
  elements.title = { ...elements.title, x: 20, y: 310, fontSize: 24, fontWeight: "600", color: "#1a1a2e", fontFamily: "'Inter', sans-serif" };
  elements.subtitle = { ...elements.subtitle, x: 20, y: 342, fontSize: 12, color: "#555555" };
  elements.country = { ...elements.country, x: 20, y: 362, fontSize: 11, color: "#888888" };
  elements.period = { ...elements.period, x: 20, y: 390, fontSize: 11, color: "#666666" };
  elements.airports = { ...elements.airports, x: 200, y: 390, fontSize: 11, color: "#666666" };
  elements.services = { ...elements.services, x: 20, y: 412, fontSize: 10, color: "#888888" };
  elements.price = { ...elements.price, x: 20, y: 445, fontSize: 22, fontWeight: "700", color: "#1a1a2e" };
  elements.totalValue = { ...elements.totalValue, x: 20, y: 472, fontSize: 11, color: "#999999" };
  elements.cta = { ...elements.cta, x: 260, y: 450, fontSize: 12, fontWeight: "600", background: "#1a1a2e", color: "#ffffff", borderRadius: 8, padding: 8 };
  return {
    elements,
    image: { offsetX: 0, offsetY: -40, brightness: 110, scale: 100 },
    card: { width: 400, height: 500, bgColor: "#ffffff", overlayColor: "#ffffff", overlayOpacity: 80, borderRadius: 16 },
    ctaText: "Saiba mais",
    badgeText: "Novo",
  };
}

export const LAYOUT_PRESETS: LayoutPreset[] = [
  { id: "default", label: "Padrão", build: buildDefault },
  { id: "elegant", label: "✨ Elegante", premium: true, build: buildElegant },
  { id: "split", label: "✨ Moderno", premium: true, build: buildSplit },
  { id: "minimalist", label: "✨ Minimalista", premium: true, build: buildMinimalist },
];
