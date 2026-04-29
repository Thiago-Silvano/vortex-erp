import jsPDF from "jspdf";
import vortexLogoUrl from "@/assets/vortex-logo.png";

// Lazy-loaded base64 da logo Vortex (fallback quando a agência não cadastrou logo)
let vortexLogoBase64Cache: string | null = null;
export async function getVortexLogoBase64(): Promise<string | null> {
  if (vortexLogoBase64Cache !== null) return vortexLogoBase64Cache || null;
  try {
    const res = await fetch(vortexLogoUrl);
    const blob = await res.blob();
    const b64: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    vortexLogoBase64Cache = b64;
    return b64;
  } catch {
    vortexLogoBase64Cache = "";
    return null;
  }
}

// ─── Types ─────────────────────────────────────────────────
export interface FlightLegPdf {
  origin: string;
  destination: string;
  departureDate?: string;
  departureTime?: string;
  arrivalDate?: string;
  arrivalTime?: string;
  connectionDuration?: string;
  direction?: "ida" | "volta";
  flightCode?: string;
  stopover?: boolean;
  stopoverDays?: number;
  stopoverMinutes?: number;
}

export interface HotelPdf {
  name: string;
  room?: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  meal?: string;
  description?: string;
  address?: string;
  // Reservation
  checkInTime?: string;
  checkOutTime?: string;
  roomCount?: number;
  guestCount?: number;
  city?: string;
  country?: string;
  stars?: number;
  category?: string;
  observations?: string;
  amenities?: string[];
  // TripAdvisor
  tripadvisorRating?: number;
  tripadvisorReviewsCount?: number;
  tripadvisorRanking?: string;
  tripadvisorBadges?: string[];
  tripadvisorTopReviews?: string[];
  tripadvisorRatingBreakdown?: { location: number; cleanliness: number; service: number; value: number; rooms: number };
  tripadvisorPopularMentions?: string[];
}

export interface ServicePdf {
  name: string;
  description?: string;
  date?: string;
  quantity?: number;
  value: number;
  type?: string;
}

export interface ProposalPaymentOptionPdf {
  method: string;
  label: string;
  installments: number;
  discountPercent: number;
  enabled: boolean;
  fixedValue?: number;
  showPerPerson?: boolean;
  highlighted?: boolean;
}

export interface QuoteOptionPdf {
  name: string;
  items: Array<{ name: string; value: number; description?: string }>;
  hotels: HotelPdf[];
  flightLegs: FlightLegPdf[];
  flightGroups?: FlightLegPdf[][];
  services: ServicePdf[];
  totalProducts: number;
  totalTrip: number;
}

export interface PremiumPdfData {
  agency: {
    name: string;
    whatsapp: string;
    email: string;
    website: string;
    logoBase64?: string;
  };
  client: { name: string };
  seller?: string;
  destination?: string;
  origin?: string;
  departureDate?: string;
  returnDate?: string;
  nights?: number;
  passengersCount?: number;
  passengers: Array<{
    name: string;
    document?: string;
    birthDate?: string;
    isMain?: boolean;
  }>;
  flightLegs: FlightLegPdf[];
  flightGroups?: FlightLegPdf[][];
  hotels: HotelPdf[];
  services: ServicePdf[];
  allItems: Array<{ name: string; value: number; description?: string }>;
  showIndividualValues?: boolean;
  totalProducts: number;
  totalTaxes: number;
  totalTrip: number;
  payment: {
    method: string;
    installments: number;
    receivables: Array<{ number: number; amount: number; dueDate?: string }>;
  };
  proposalPaymentOptions?: ProposalPaymentOptionPdf[];
  showPerPassenger?: boolean;
  notes?: string;
  destinationImageBase64?: string;
  quoteOptions?: QuoteOptionPdf[];
}

// ─── Editorial Theme — Carol Fonseca style ──────────────────
// Paleta espelhada no template HTML
const WHITE = [255, 255, 255] as const;
const CREAM = [236, 233, 223] as const; // #ece9df — fundo das células de voo / cards
const CREAM_SOFT = [245, 242, 233] as const; // versão mais clara
const SAND = [211, 204, 191] as const; // #d3ccbf — barra de data dos voos
const OCEAN = [34, 34, 34] as const; // #222 — títulos
const OCEAN_BANNER = [72, 61, 139] as const; // #483D8B — banner azul (DarkSlateBlue)
const TEXT_MAIN = [51, 51, 51] as const; // #333
const TEXT_MUTED = [102, 102, 102] as const; // #666
const TEXT_SOFT = [136, 136, 136] as const; // #888 — rodapé
const BORDER = [221, 221, 221] as const; // #ddd
const GOLD = [191, 158, 92] as const; // dourado para bordas decorativas

// ─── Helpers ───────────────────────────────────────────────
const sanitize = (text: string = ""): string =>
  String(text)
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2026]/g, "...")
    .replace(/[\u25B8\u25BA\u2192]/g, ">")
    .replace(/[\u{1F300}-\u{1FFFF}]/gu, "")
    .replace(/[^\x00-\xFF]/g, "");

const fmtBRL = (v: number) => (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatDateBR = (d?: string) => {
  if (!d) return "";
  const parts = d.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return d;
};

const WEEKDAYS = ["DOMINGO", "SEGUNDA-FEIRA", "TERCA-FEIRA", "QUARTA-FEIRA", "QUINTA-FEIRA", "SEXTA-FEIRA", "SABADO"];
const MONTHS_SHORT = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
const MONTHS_LONG = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const formatWeekday = (d?: string) => {
  if (!d) return "";
  const parts = d.split("-");
  if (parts.length !== 3) return "";
  const dt = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  const wd = WEEKDAYS[dt.getDay()];
  const mon = MONTHS_SHORT[parseInt(parts[1]) - 1];
  return `${wd}, ${parseInt(parts[2])} ${mon} ${parts[0]}`;
};

const formatRangeLong = (a?: string, b?: string) => {
  if (!a || !b) return "";
  const pa = a.split("-");
  const pb = b.split("-");
  if (pa.length !== 3 || pb.length !== 3) return "";
  const da = parseInt(pa[2]);
  const db = parseInt(pb[2]);
  const ma = MONTHS_LONG[parseInt(pa[1]) - 1];
  const mb = MONTHS_LONG[parseInt(pb[1]) - 1];
  if (pa[0] === pb[0] && pa[1] === pb[1]) return `${da} a ${db} de ${mb} de ${pb[0]}`;
  return `${da} de ${ma} a ${db} de ${mb} de ${pb[0]}`;
};

const setText = (doc: jsPDF, c: readonly [number, number, number]) => doc.setTextColor(c[0], c[1], c[2]);
const setFill = (doc: jsPDF, c: readonly [number, number, number]) => doc.setFillColor(c[0], c[1], c[2]);
const setStroke = (doc: jsPDF, c: readonly [number, number, number]) => doc.setDrawColor(c[0], c[1], c[2]);

function safeText(doc: jsPDF, text: string | string[], x: number, y: number, options?: any) {
  if (Array.isArray(text)) doc.text(text.map(sanitize), x, y, options);
  else doc.text(sanitize(text), x, y, options);
}

const extractCode = (s: string = ""): string => {
  const m = s.match(/\b([A-Z]{3})\b/);
  return m ? m[1] : sanitize(s).slice(0, 3).toUpperCase();
};

// ─── Page Background ───────────────────────────────────────
function drawPageBg(doc: jsPDF, pw: number, ph: number) {
  setFill(doc, WHITE);
  doc.rect(0, 0, pw, ph, "F");
}

function drawPageHeader(_doc: jsPDF, _pw: number, _agencyName: string) {
  // Páginas internas no template não têm faixa de topo — manter limpo.
}

function drawPageFooter(doc: jsPDF, pw: number, ph: number, agencyName: string) {
  // Rodapé limpo (sem nome da agência) — mantém apenas a linha divisória
  const m = 20;
  setStroke(doc, BORDER);
  doc.setLineWidth(0.3);
  doc.line(m, ph - 18, pw - m, ph - 18);
  void agencyName;
}

// ─── Section title (serif, centered) ──────────────────────
function drawSectionTitle(doc: jsPDF, pw: number, y: number, title: string): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  setText(doc, OCEAN);
  safeText(doc, title.toUpperCase(), pw / 2, y, { align: "center" });
  return y + 12;
}

function drawSubTitle(doc: jsPDF, pw: number, y: number, label: string): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  setText(doc, OCEAN);
  safeText(doc, label.toUpperCase(), pw / 2, y, { align: "center" });
  return y + 10;
}

// ─── Cover Page ────────────────────────────────────────────
function drawCover(doc: jsPDF, data: PremiumPdfData, pw: number, ph: number, agencyName: string) {
  drawPageBg(doc, pw, ph);

  // Logo no topo esquerdo da capa.
  // Prioriza a logo da agência cadastrada; caso contrário usa a logo Vortex (cache).
  const logoBase64 = data.agency.logoBase64 || vortexLogoBase64Cache || null;
  if (logoBase64) {
    try {
      const w = 28;
      const h = 28;
      doc.addImage(logoBase64, "PNG", 12, 10, w, h);
    } catch {
      /* ignore */
    }
  }
  const headerOffset = 0;

  // === Cabeçalho da capa (espelha .cover-header do template) ===
  // Pré-título italic "Proposta de"
  const preTitleY = 30 + headerOffset;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(16);
  setText(doc, TEXT_MUTED);
  safeText(doc, "Proposta de", pw / 2, preTitleY, { align: "center" });

  // Título gigante "ORÇAMENTO"
  doc.setFont("helvetica", "normal");
  doc.setFontSize(40);
  setText(doc, OCEAN);
  safeText(doc, "ORÇAMENTO", pw / 2, preTitleY + 14, { align: "center", charSpace: 1 });

  // Subtítulo "VIAGEM PARA ..." (uppercase, letter-spacing 3px)
  if (data.destination) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    setText(doc, TEXT_MUTED);
    safeText(doc, `VIAGEM PARA ${data.destination.toUpperCase()}`, pw / 2, preTitleY + 22, {
      align: "center",
    });
  }

  // === Imagem hero (espelha .cover-image: width 100%, height 120mm) ===
  const imgX = 0;
  const imgY = preTitleY + 32;
  const imgW = pw;
  const imgH = 110;

  let drawnImage = false;
  if (data.destinationImageBase64) {
    try {
      doc.addImage(data.destinationImageBase64, "JPEG", imgX, imgY, imgW, imgH);
      drawnImage = true;
    } catch {
      /* fallback */
    }
  }
  if (!drawnImage) {
    // Placeholder cinza-claro (#d8d8d8 do template)
    setFill(doc, [216, 216, 216] as const);
    doc.rect(imgX, imgY, imgW, imgH, "F");
    doc.setFont("helvetica", "italic");
    doc.setFontSize(14);
    setText(doc, TEXT_SOFT);
    safeText(doc, data.destination || "Destino", pw / 2, imgY + imgH / 2, { align: "center" });
  }

  // === Banner azul oceano (.cover-banner) — período + cliente ===
  const bandH = 22;
  const bandY = ph - 35 - bandH;
  setFill(doc, OCEAN_BANNER);
  doc.rect(0, bandY, pw, bandH, "F");

  // Bordas douradas (mais finas) no topo e no fundo do banner
  const goldH = 0.6;
  setFill(doc, GOLD);
  doc.rect(0, bandY - goldH, pw, goldH, "F"); // topo
  doc.rect(0, bandY + bandH, pw, goldH, "F"); // base

  // Período da viagem — Início / Término / Noites lado a lado
  const inicio = formatDateBR(data.departureDate);
  const termino = formatDateBR(data.returnDate);
  const noites = data.nights ?? 0;
  if (inicio || termino || noites) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    setText(doc, WHITE);
    const line = `Início: ${inicio || "--/--/----"}     |     Término: ${termino || "--/--/----"}     |     Noites: ${String(noites).padStart(2, "0")}`;
    safeText(doc, line, pw / 2, bandY + bandH / 2 + 2, { align: "center" });
  }
  // suprimir aviso de variável não utilizada caso formatRangeLong continue importada
  void formatRangeLong;

  // Rodapé da capa removido — sem nome da agência
  void agencyName;
}

// ─── Flight Section ────────────────────────────────────────
type Leg = NonNullable<PremiumPdfData["flightLegs"]>[number];

function drawFlightLegCard(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  leg: Leg,
  scale: number = 1,
): number {
  const dateStr = formatWeekday(leg.departureDate) || formatDateBR(leg.departureDate);

  // (1) DATA - barra bege
  const dateH = 7 * scale;
  setFill(doc, SAND);
  doc.rect(x, y, w, dateH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(Math.max(5, 8 * scale));
  setText(doc, OCEAN);
  safeText(doc, dateStr.toUpperCase(), x + w / 2, y + dateH * 0.7, { align: "center" });

  if (leg.flightCode) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(Math.max(4.5, 7 * scale));
    setText(doc, TEXT_MUTED);
    safeText(doc, sanitize(leg.flightCode), x + w - 3, y + dateH * 0.7, { align: "right" });
  }

  // (2) Localizacoes
  const locY = y + dateH;
  const locH = 18 * scale;
  const sideW = w * 0.45;
  const planeW = w * 0.1;

  setFill(doc, CREAM);
  doc.rect(x, locY, sideW, locH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(Math.max(9, 18 * scale));
  setText(doc, OCEAN);
  const oCode = extractCode(leg.origin);
  safeText(doc, oCode, x + sideW / 2, locY + locH / 2 + 3 * scale, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(Math.max(7, 14 * scale));
  setText(doc, TEXT_MUTED);
  safeText(doc, ">", x + sideW + planeW / 2, locY + locH / 2 + 2 * scale, { align: "center" });

  setFill(doc, CREAM);
  doc.rect(x + sideW + planeW, locY, sideW, locH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(Math.max(9, 18 * scale));
  setText(doc, OCEAN);
  const dCode = extractCode(leg.destination);
  safeText(doc, dCode, x + sideW + planeW + sideW / 2, locY + locH / 2 + 3 * scale, { align: "center" });

  // (3) Horarios
  const timeY = locY + locH;
  const timeH = 8 * scale;
  setFill(doc, CREAM);
  doc.rect(x, timeY, w, timeH, "F");
  setFill(doc, WHITE);
  doc.rect(x + w / 2 - 0.4, timeY, 0.8, timeH, "F");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(Math.max(5, 8 * scale));
  setText(doc, TEXT_MUTED);
  safeText(doc, `SAIDA: ${leg.departureTime || "--:--"}`, x + w / 4, timeY + timeH * 0.7, {
    align: "center",
  });
  safeText(doc, `CHEGADA: ${leg.arrivalTime || "--:--"}`, x + (3 * w) / 4, timeY + timeH * 0.7, {
    align: "center",
  });

  return timeY + timeH;
}

function drawFlightSection(doc: jsPDF, data: PremiumPdfData, pw: number, ph: number, agencyName: string) {
  if (!data.flightLegs || data.flightLegs.length === 0) return;

  const ida = data.flightLegs.filter((l) => l.direction !== "volta");
  const volta = data.flightLegs.filter((l) => l.direction === "volta");

  const m = 24;
  const cardW = pw - m * 2;

  // Calculo dinamico de escala para caber muitos trechos numa pagina
  const isZeroDur = (s?: string) => {
    const v = (s || "").trim();
    if (!v) return true;
    return /^0+[:hH]?0*m?$/.test(v.replace(/\s/g, "")) || v === "00:00";
  };
  const countConnections = (legs: Leg[]) =>
    legs.reduce((acc, _l, i) => (i > 0 && !isZeroDur(legs[i - 1].connectionDuration) ? acc + 1 : acc), 0);
  void countConnections;

  type FlightPageGroup = { label: string; legs: Leg[]; startIndex: number; allLegs: Leg[] };
  type FlightPage = { groups: FlightPageGroup[]; legsCount: number };

  const sourceGroups = [
    { label: "Ida", legs: ida },
    { label: "Volta", legs: volta },
  ].filter((group) => group.legs.length > 0);
  const pages: FlightPage[] = [];
  let currentPage: FlightPage = { groups: [], legsCount: 0 };
  const maxLegsPerPage = 6;
  const pushCurrentPage = () => {
    if (currentPage.legsCount > 0) pages.push(currentPage);
    currentPage = { groups: [], legsCount: 0 };
  };

  sourceGroups.forEach((group) => {
    for (let start = 0; start < group.legs.length;) {
      if (currentPage.legsCount >= maxLegsPerPage) pushCurrentPage();
      const availableSlots = maxLegsPerPage - currentPage.legsCount;
      const take = Math.min(availableSlots, group.legs.length - start);
      currentPage.groups.push({
        label: start === 0 ? group.label : `${group.label} (cont.)`,
        legs: group.legs.slice(start, start + take),
        startIndex: start,
        allLegs: group.legs,
      });
      currentPage.legsCount += take;
      start += take;
    }
  });
  pushCurrentPage();

  const groupBottomGap = 3;
  const subTitleBlockH = 14;
  const cardGap = 2.5;
  const connBlockH = 7;
  const baseCardH = 7 + 18 + 8;

  pages.forEach((page, pageIndex) => {
    doc.addPage();
    drawPageBg(doc, pw, ph);
    drawPageHeader(doc, pw, agencyName);

    let y = 35;
    if (pageIndex === 0) {
      y = drawSectionTitle(doc, pw, y, "Aéreo");
      y += 6;
    }

    const totalConnections = page.groups.reduce(
      (acc, group) =>
        acc +
        group.legs.reduce((sum, _leg, idx) => {
          const globalIdx = group.startIndex + idx;
          return globalIdx > 0 && !isZeroDur(group.allLegs[globalIdx - 1]?.connectionDuration) ? sum + 1 : sum;
        }, 0),
      0,
    );
    const availableH = ph - 30 - y;
    const fixedH =
      page.groups.length * (subTitleBlockH + groupBottomGap) +
      page.legsCount * cardGap +
      totalConnections * connBlockH;
    const idealCardH = page.legsCount > 0 ? (availableH - fixedH) / page.legsCount : baseCardH;
    let scale = Math.min(1.18, idealCardH / baseCardH);
    if (!Number.isFinite(scale) || scale <= 0) scale = 1;
    scale = Math.max(0.4, scale);

    page.groups.forEach((group) => {
      y = drawSubTitle(doc, pw, y, group.label);
      y += 4;

      group.legs.forEach((leg, idx) => {
        const globalIdx = group.startIndex + idx;
        const prevLeg = globalIdx > 0 ? group.allLegs[globalIdx - 1] : undefined;
        const connDur = (prevLeg?.connectionDuration || "").trim();
        if (globalIdx > 0 && connDur && !isZeroDur(connDur)) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(Math.max(6, 8 * scale));
          setText(doc, TEXT_MUTED);
          safeText(doc, `Duração da conexão: ${sanitize(connDur)}`, pw / 2, y + 4.2, { align: "center" });
          y += connBlockH;
        }

        y = drawFlightLegCard(doc, m, y, cardW, leg, scale);
        y += cardGap;
      });

      y += groupBottomGap;
    });

    drawPageFooter(doc, pw, ph, agencyName);
  });
}

// ─── Hotels Section ───────────────────────────────────────
function drawHotelsSection(doc: jsPDF, data: PremiumPdfData, pw: number, ph: number, agencyName: string) {
  if (!data.hotels || data.hotels.length === 0) return;

  doc.addPage();
  drawPageBg(doc, pw, ph);
  drawPageHeader(doc, pw, agencyName);

  let y = 35;
  y = drawSectionTitle(doc, pw, y, "Hospedagem");
  y += 8;

  const m = 22;
  const cardW = pw - m * 2;

  // Helpers locais
  const ensureSpace = (need: number) => {
    if (y + need > ph - 25) {
      drawPageFooter(doc, pw, ph, agencyName);
      doc.addPage();
      drawPageBg(doc, pw, ph);
      drawPageHeader(doc, pw, agencyName);
      y = 35;
    }
  };
  const drawChip = (text: string, x: number, yy: number, fill: readonly [number, number, number], color: readonly [number, number, number]): number => {
    doc.setFontSize(7.5);
    const w = doc.getTextWidth(sanitize(text)) + 5;
    setFill(doc, fill);
    doc.roundedRect(x, yy - 3.5, w, 5.5, 2, 2, "F");
    setText(doc, color);
    safeText(doc, text, x + 2.5, yy);
    return w;
  };

  const VIOLET_BG = [237, 233, 254] as const; // #ede9fe
  const VIOLET_FG = [109, 40, 217] as const;  // #6d28d9
  const GREEN_BG = [209, 250, 229] as const;  // #d1fae5
  const GREEN_FG = [4, 120, 87] as const;     // #047857
  const TA_GREEN = [16, 185, 129] as const;   // #10b981
  const SLATE_BG = [241, 245, 249] as const;  // #f1f5f9
  const SLATE_FG = [100, 116, 139] as const;  // #64748b
  const NEUTRAL_BG = [250, 249, 246] as const;
  const NEUTRAL_BORDER = [240, 237, 232] as const;

  data.hotels.forEach((h, idx) => {
    ensureSpace(60);

    // ── Header do card: nome, estrelas, categoria
    setFill(doc, [255, 255, 255]);
    setStroke(doc, NEUTRAL_BORDER);
    doc.setLineWidth(0.3);

    const headerY = y;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    setText(doc, OCEAN);
    safeText(doc, sanitize(h.name || ""), m, y + 5);
    y += 7;

    if (h.stars && h.stars > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      setText(doc, GOLD);
      safeText(doc, "*".repeat(h.stars), m, y);
    }
    if (h.category) {
      const catX = m + (h.stars ? doc.getTextWidth("*".repeat(h.stars)) + 4 : 0);
      drawChip(h.category, catX, y, NEUTRAL_BORDER, TEXT_SOFT);
    }
    y += 4;

    // Endereço
    if (h.address || h.city) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      setText(doc, TEXT_SOFT);
      const addr = [h.address, h.city, h.country].filter(Boolean).join(", ");
      safeText(doc, addr, m, y + 3);
      y += 5;
    }

    // Description
    if (h.description) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      setText(doc, TEXT_MAIN);
      const lines = doc.splitTextToSize(sanitize(h.description), cardW);
      doc.text(lines, m, y + 4);
      y += lines.length * 3.5 + 3;
    }

    // Amenities (badges roxas)
    if (h.amenities && h.amenities.length > 0) {
      ensureSpace(10);
      let cx = m;
      const cyAm = y + 4;
      doc.setFont("helvetica", "normal");
      h.amenities.forEach(a => {
        const w = doc.getTextWidth(sanitize(a)) + 5;
        if (cx + w > m + cardW) { y += 7; cx = m; }
        drawChip(a, cx, y + 4, VIOLET_BG, VIOLET_FG);
        cx += w + 2;
      });
      y += 7;
    }

    // ── TripAdvisor block ─────────
    const ta = {
      rating: h.tripadvisorRating,
      reviews: h.tripadvisorReviewsCount,
      ranking: h.tripadvisorRanking,
      badges: h.tripadvisorBadges,
      topReviews: h.tripadvisorTopReviews,
      breakdown: h.tripadvisorRatingBreakdown,
      mentions: h.tripadvisorPopularMentions,
    };
    const hasTA = !!(ta.rating || ta.ranking || (ta.badges && ta.badges.length) || (ta.topReviews && ta.topReviews.length) || ta.breakdown || (ta.mentions && ta.mentions.length));

    if (hasTA) {
      ensureSpace(40);
      // Separator
      setStroke(doc, NEUTRAL_BORDER);
      doc.setLineWidth(0.2);
      doc.line(m, y + 2, m + cardW, y + 2);
      y += 6;

      // Header TA
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      setText(doc, OCEAN);
      safeText(doc, "TripAdvisor", m, y);
      let xCursor = m + doc.getTextWidth("TripAdvisor") + 4;
      if (ta.rating) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        setText(doc, TA_GREEN);
        safeText(doc, String(ta.rating), xCursor, y);
        xCursor += doc.getTextWidth(String(ta.rating)) + 1.5;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        setText(doc, TEXT_SOFT);
        safeText(doc, "/5", xCursor, y);
        xCursor += 4;
        if (ta.reviews) {
          safeText(doc, `(${ta.reviews.toLocaleString("pt-BR")} avaliações)`, xCursor, y);
        }
      }
      y += 5;

      if (ta.ranking) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        setText(doc, TEXT_SOFT);
        safeText(doc, sanitize(ta.ranking), m, y + 2);
        y += 5;
      }

      if (ta.badges && ta.badges.length > 0) {
        ensureSpace(8);
        let cx = m;
        ta.badges.forEach(b => {
          const label = b;
          const w = doc.getTextWidth(sanitize(label)) + 5;
          if (cx + w > m + cardW) { y += 7; cx = m; }
          drawChip(label, cx, y + 4, GREEN_BG, GREEN_FG);
          cx += w + 2;
        });
        y += 7;
      }

      // Breakdown (5 colunas)
      if (ta.breakdown) {
        ensureSpace(14);
        const items = [
          { label: "Localização", value: ta.breakdown.location },
          { label: "Limpeza", value: ta.breakdown.cleanliness },
          { label: "Serviço", value: ta.breakdown.service },
          { label: "Custo-benefício", value: ta.breakdown.value },
          { label: "Quartos", value: ta.breakdown.rooms },
        ];
        const colW = cardW / items.length;
        items.forEach((it, i) => {
          const cx = m + i * colW + colW / 2;
          doc.setFont("helvetica", "bold");
          doc.setFontSize(11);
          setText(doc, OCEAN);
          safeText(doc, String(it.value), cx, y + 5, { align: "center" });
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7);
          setText(doc, TEXT_SOFT);
          safeText(doc, it.label, cx, y + 9, { align: "center" });
        });
        y += 13;
      }

      // Top reviews
      if (ta.topReviews && ta.topReviews.length > 0) {
        ensureSpace(6 + ta.topReviews.length * 5);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        setText(doc, OCEAN);
        safeText(doc, "Avaliações em destaque:", m, y + 3);
        y += 5;
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8);
        setText(doc, TEXT_SOFT);
        ta.topReviews.forEach(r => {
          const lines = doc.splitTextToSize(sanitize(`"${r}"`), cardW);
          doc.text(lines, m, y + 3);
          y += lines.length * 3.2 + 1;
        });
        y += 1;
      }

      // Mentions
      if (ta.mentions && ta.mentions.length > 0) {
        ensureSpace(8);
        let cx = m;
        ta.mentions.forEach(mt => {
          const label = `#${mt}`;
          const w = doc.getTextWidth(sanitize(label)) + 5;
          if (cx + w > m + cardW) { y += 6; cx = m; }
          drawChip(label, cx, y + 4, SLATE_BG, SLATE_FG);
          cx += w + 2;
        });
        y += 7;
      }
    }

    // ── Dados da Reserva ─────────
    const hasReservation = !!(h.checkIn || h.checkOut || h.room || h.guestCount || h.nights);
    if (hasReservation) {
      ensureSpace(28);
      // Separator
      setStroke(doc, NEUTRAL_BORDER);
      doc.setLineWidth(0.2);
      doc.line(m, y + 2, m + cardW, y + 2);
      y += 6;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      setText(doc, TEXT_SOFT);
      safeText(doc, "DADOS DA RESERVA", m, y);
      y += 4;

      const fields: { label: string; value: string }[] = [];
      if (h.checkIn) fields.push({ label: "Check-in", value: `${formatDateBR(h.checkIn)}${h.checkInTime ? " " + h.checkInTime : ""}` });
      if (h.checkOut) fields.push({ label: "Check-out", value: `${formatDateBR(h.checkOut)}${h.checkOutTime ? " " + h.checkOutTime : ""}` });
      if (h.nights) fields.push({ label: "Noites", value: String(h.nights) });
      if (h.room) fields.push({ label: "Tipo de Quarto", value: h.room });
      if (h.roomCount) fields.push({ label: "Qtd. Quartos", value: String(h.roomCount) });
      if (h.guestCount) fields.push({ label: "Hóspedes", value: String(h.guestCount) });
      if (h.meal) fields.push({ label: "Regime", value: h.meal });

      const cols = 4;
      const cellGap = 2;
      const cellW = (cardW - cellGap * (cols - 1)) / cols;
      const cellH = 12;
      fields.forEach((f, i) => {
        const row = Math.floor(i / cols);
        const col = i % cols;
        if (col === 0 && row > 0) y += cellH + cellGap;
        const cx = m + col * (cellW + cellGap);
        const cy = y + 1;
        setFill(doc, NEUTRAL_BG);
        setStroke(doc, NEUTRAL_BORDER);
        doc.setLineWidth(0.2);
        doc.roundedRect(cx, cy, cellW, cellH, 1.5, 1.5, "FD");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.5);
        setText(doc, TEXT_SOFT);
        safeText(doc, f.label.toUpperCase(), cx + 2, cy + 4);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        setText(doc, OCEAN);
        safeText(doc, f.value, cx + 2, cy + 9);
      });
      // Avança após a última linha
      const totalRows = Math.ceil(fields.length / cols);
      y += totalRows * cellH + (totalRows - 1) * cellGap + 4;

      if (h.observations) {
        ensureSpace(8);
        doc.setFont("helvetica", "italic");
        doc.setFontSize(7.5);
        setText(doc, TEXT_SOFT);
        const lines = doc.splitTextToSize(sanitize(`Obs: ${h.observations}`), cardW);
        doc.text(lines, m, y + 3);
        y += lines.length * 3 + 2;
      }
    }

    // Espaço entre hotéis
    if (idx < data.hotels.length - 1) {
      y += 8;
      setStroke(doc, GOLD);
      doc.setLineWidth(0.4);
      doc.line(m + cardW * 0.4, y, m + cardW * 0.6, y);
      y += 6;
    }
  });

  drawPageFooter(doc, pw, ph, agencyName);
}

// ─── Investment / Summary ─────────────────────────────────
function drawInvestmentPage(doc: jsPDF, data: PremiumPdfData, pw: number, ph: number, agencyName: string) {
  doc.addPage();
  drawPageBg(doc, pw, ph);
  drawPageHeader(doc, pw, agencyName);

  const m = 26;
  const w = pw - m * 2;

  // === Bloco título + card centralizados verticalmente na área superior ===
  // Área disponível: do topo (y=20) até onde a lista "Inclui" começa (y≈155).
  const heroTop = 20;
  const heroBottom = 155;
  const cardH = 38;
  const titleH = 12; // altura visual do título
  const titleGap = 14; // gap entre título e card
  const blockH = titleH + titleGap + cardH;
  const blockStart = heroTop + (heroBottom - heroTop - blockH) / 2;

  // Título "INVESTIMENTO"
  drawSectionTitle(doc, pw, blockStart + titleH, "Investimento");

  // Card com valor total — banner azul com bordas douradas (estilo capa)
  const cardY = blockStart + titleH + titleGap;
  const goldH = 0.6;
  // Bordas douradas (topo e fundo)
  setFill(doc, GOLD);
  doc.rect(m, cardY - goldH, w, goldH, "F");
  doc.rect(m, cardY + cardH, w, goldH, "F");
  // Banner azul oceano
  setFill(doc, OCEAN_BANNER);
  doc.rect(m, cardY, w, cardH, "F");

  doc.setFont("helvetica", "italic");
  doc.setFontSize(11);
  setText(doc, [255, 255, 255]);
  safeText(doc, "Valor total da viagem", pw / 2, cardY + 12, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  setText(doc, [255, 255, 255]);
  safeText(doc, fmtBRL(data.totalTrip || 0), pw / 2, cardY + 27, { align: "center" });

  if (data.payment?.installments && data.payment.installments > 1) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    setText(doc, [235, 235, 235]);
    const inst = (data.totalTrip || 0) / data.payment.installments;
    safeText(doc, `ou ${data.payment.installments}x de ${fmtBRL(inst)}`, pw / 2, cardY + 35, { align: "center" });
  }

  let y = heroBottom + 5;

  // Includes list
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  setText(doc, OCEAN);
  safeText(doc, "Inclui", m, y);
  y += 7;
  setStroke(doc, OCEAN_BANNER);
  doc.setLineWidth(0.4);
  doc.line(m, y, m + 18, y);
  y += 8;

  const items: string[] = [];
  if (data.flightLegs?.length) items.push("Passagens aéreas com taxas");
  if (data.hotels?.length) items.push("Hospedagem conforme escolha");
  if (data.services?.length) items.push("Serviços e experiências selecionados");
  items.push("Suporte premium durante a viagem");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  setText(doc, TEXT_MAIN);
  items.forEach((it) => {
    safeText(doc, "-  " + it, m, y);
    y += 6;
  });

  y += 6;
  // Notes
  if (data.notes) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    setText(doc, OCEAN);
    safeText(doc, "Observações", m, y);
    y += 7;
    setStroke(doc, OCEAN_BANNER);
    doc.line(m, y, m + 30, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    setText(doc, TEXT_MAIN);
    const lines = doc.splitTextToSize(sanitize(data.notes), w);
    doc.text(lines.slice(0, 18), m, y);
  }

  drawPageFooter(doc, pw, ph, agencyName);
}

// ─── Main entry ───────────────────────────────────────────
export function generateEditorialPdf(data: PremiumPdfData) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const agencyName = data.agency?.name || "Vortex Viagens";

  drawCover(doc, data, pw, ph, agencyName);
  drawFlightSection(doc, data, pw, ph, agencyName);
  drawHotelsSection(doc, data, pw, ph, agencyName);
  drawInvestmentPage(doc, data, pw, ph, agencyName);

  return doc;
}

// Versão async — pré-carrega a logo Vortex (fallback) antes de renderizar
export async function generateEditorialPdfAsync(data: PremiumPdfData) {
  if (!data.agency?.logoBase64) {
    await getVortexLogoBase64();
  }
  return generateEditorialPdf(data);
}
