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
const OCEAN_BANNER = [105, 132, 155] as const; // #69849b — banner azul oceano da capa / estrelas
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
  safeText(doc, title.toUpperCase(), pw / 2, y, { align: "center", charSpace: 2 });
  return y + 12;
}

function drawSubTitle(doc: jsPDF, pw: number, y: number, label: string): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  setText(doc, OCEAN);
  safeText(doc, label.toUpperCase(), pw / 2, y, { align: "center", charSpace: 2 });
  return y + 10;
}

// ─── Cover Page ────────────────────────────────────────────
function drawCover(doc: jsPDF, data: PremiumPdfData, pw: number, ph: number, agencyName: string) {
  drawPageBg(doc, pw, ph);

  // Logo opcional bem no topo (somente se a agência cadastrou).
  // O template HTML não tem logo na capa — só usamos logo da agência (não a Vortex padrão).
  let headerOffset = 0;
  if (data.agency.logoBase64) {
    try {
      const w = 36;
      const h = 16;
      doc.addImage(data.agency.logoBase64, "PNG", pw / 2 - w / 2, 12, w, h);
      headerOffset = h + 4;
    } catch {
      /* ignore */
    }
  }

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
  safeText(doc, "ORCAMENTO", pw / 2, preTitleY + 14, { align: "center", charSpace: 1 });

  // Subtítulo "VIAGEM PARA ..." (uppercase, letter-spacing 3px)
  if (data.destination) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    setText(doc, TEXT_MUTED);
    safeText(doc, `VIAGEM PARA ${data.destination.toUpperCase()}`, pw / 2, preTitleY + 22, {
      align: "center",
      charSpace: 2.5,
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
  // No template está absoluto, bottom: 35mm. width 100%, padding vertical generoso.
  const bandH = 36;
  const bandY = ph - 35 - bandH;
  setFill(doc, OCEAN_BANNER);
  doc.rect(0, bandY, pw, bandH, "F");

  // Bordas douradas no topo e no fundo do banner
  const goldH = 1.2;
  setFill(doc, GOLD);
  doc.rect(0, bandY - goldH, pw, goldH, "F"); // topo
  doc.rect(0, bandY + bandH, pw, goldH, "F"); // base

  // Período da viagem — centralizado vertical e horizontalmente, fonte maior
  const dateRange = formatRangeLong(data.departureDate, data.returnDate);
  if (dateRange) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(20);
    setText(doc, WHITE);
    safeText(doc, dateRange, pw / 2, bandY + bandH / 2 + 2, {
      align: "center",
    });
  }

  // === Rodapé da capa (.cover-footer) — nome da agência centralizado verticalmente
  // na faixa branca abaixo do banner. ===
  const footerAreaTop = bandY + bandH + goldH;
  const footerAreaBottom = ph;
  const footerCenterY = (footerAreaTop + footerAreaBottom) / 2 + 1.5; // +1.5 ajuste óptico do baseline
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setText(doc, TEXT_MUTED);
  safeText(doc, agencyName.toUpperCase(), pw / 2, footerCenterY, {
    align: "center",
    charSpace: 1.2,
  });
}

// ─── Flight Section ────────────────────────────────────────
type Leg = NonNullable<PremiumPdfData["flightLegs"]>[number];

function drawFlightLegCard(doc: jsPDF, x: number, y: number, w: number, leg: Leg): number {
  // === Layout do template HTML (.flight-table) ===
  // 1) Faixa bege escuro com a DATA (e código do voo opcional à direita)
  // 2) Linha de localizações: ORIGEM (45%)  ✈ (10%)  DESTINO (45%) — fundo bege claro
  // 3) Linha de horários abaixo: SAÍDA / CHEGADA — fundo bege claro com linha branca separadora

  const dateStr = formatWeekday(leg.departureDate) || formatDateBR(leg.departureDate);

  // (1) DATA — barra bege #d3ccbf
  const dateH = 7;
  setFill(doc, SAND);
  doc.rect(x, y, w, dateH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setText(doc, OCEAN);
  safeText(doc, dateStr.toUpperCase(), x + w / 2, y + 4.8, { align: "center", charSpace: 0.5 });

  // Código do voo discreto à direita
  if (leg.flightCode) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    setText(doc, TEXT_MUTED);
    safeText(doc, sanitize(leg.flightCode), x + w - 3, y + 4.8, { align: "right" });
  }

  // (2) Linha de localizações
  const locY = y + dateH;
  const locH = 18;
  const sideW = w * 0.45;
  const planeW = w * 0.1;

  // Origem (esquerda)
  setFill(doc, CREAM);
  doc.rect(x, locY, sideW, locH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  setText(doc, OCEAN);
  const oCode = extractCode(leg.origin);
  safeText(doc, oCode, x + sideW / 2, locY + locH / 2 + 3, { align: "center" });

  // Plane icon (centro)
  // ✈ não está nas glyphs Helvetica padrão; usamos ">" como o código já fazia
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  setText(doc, TEXT_MUTED);
  safeText(doc, ">", x + sideW + planeW / 2, locY + locH / 2 + 2, { align: "center" });

  // Destino (direita)
  setFill(doc, CREAM);
  doc.rect(x + sideW + planeW, locY, sideW, locH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  setText(doc, OCEAN);
  const dCode = extractCode(leg.destination);
  safeText(doc, dCode, x + sideW + planeW + sideW / 2, locY + locH / 2 + 3, { align: "center" });

  // (3) Linha de horários — fundo bege claro com linha branca separadora central
  const timeY = locY + locH;
  const timeH = 8;
  setFill(doc, CREAM);
  doc.rect(x, timeY, w, timeH, "F");
  // separador branco vertical no meio (.border-top: 2px solid #ffffff equivalente)
  setFill(doc, WHITE);
  doc.rect(x + w / 2 - 0.4, timeY, 0.8, timeH, "F");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setText(doc, TEXT_MUTED);
  safeText(doc, `SAIDA: ${leg.departureTime || "--:--"}`, x + w / 4, timeY + 5.5, {
    align: "center",
    charSpace: 0.5,
  });
  safeText(doc, `CHEGADA: ${leg.arrivalTime || "--:--"}`, x + (3 * w) / 4, timeY + 5.5, {
    align: "center",
    charSpace: 0.5,
  });

  return timeY + timeH; // altura total usada
}

function drawFlightSection(doc: jsPDF, data: PremiumPdfData, pw: number, ph: number, agencyName: string) {
  if (!data.flightLegs || data.flightLegs.length === 0) return;

  doc.addPage();
  drawPageBg(doc, pw, ph);
  drawPageHeader(doc, pw, agencyName);

  let y = 35;
  y = drawSectionTitle(doc, pw, y, "Aéreo");
  y += 6;

  const ida = data.flightLegs.filter((l) => l.direction !== "volta");
  const volta = data.flightLegs.filter((l) => l.direction === "volta");

  const m = 24;
  const cardW = pw - m * 2;

  const drawGroup = (label: string, legs: Leg[]) => {
    if (legs.length === 0) return;
    y = drawSubTitle(doc, pw, y, label);
    y += 4;
    legs.forEach((leg) => {
      // page break check
      if (y + 30 > ph - 30) {
        drawPageFooter(doc, pw, ph, agencyName);
        doc.addPage();
        drawPageBg(doc, pw, ph);
        drawPageHeader(doc, pw, agencyName);
        y = 35;
      }
      y = drawFlightLegCard(doc, m, y, cardW, leg);
      y += 4;
    });
    y += 4;
  };

  drawGroup("Ida", ida);
  drawGroup("Volta", volta);

  drawPageFooter(doc, pw, ph, agencyName);
}

// ─── Hotels Section ───────────────────────────────────────
function drawHotelsSection(doc: jsPDF, data: PremiumPdfData, pw: number, ph: number, agencyName: string) {
  if (!data.hotels || data.hotels.length === 0) return;

  doc.addPage();
  drawPageBg(doc, pw, ph);
  drawPageHeader(doc, pw, agencyName);

  let y = 35;
  y = drawSectionTitle(doc, pw, y, "Acomodações");
  y += 8;

  const m = 22;
  const cardH = 50;
  const imgW = 50;
  const cardW = pw - m * 2;

  data.hotels.forEach((h, idx) => {
    if (y + cardH + 8 > ph - 30) {
      drawPageFooter(doc, pw, ph, agencyName);
      doc.addPage();
      drawPageBg(doc, pw, ph);
      drawPageHeader(doc, pw, agencyName);
      y = 35;
    }

    // Imagem placeholder (cinza-claro #d8d8d8 do template) com cantos arredondados
    setFill(doc, [216, 216, 216] as const);
    doc.roundedRect(m, y, imgW, cardH, 3, 3, "F");
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    setText(doc, TEXT_SOFT);
    safeText(doc, "HOTEL", m + imgW / 2, y + cardH / 2 + 2, { align: "center" });

    // Right side text
    const tx = m + imgW + 6;
    const tw = cardW - imgW - 6;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    setText(doc, OCEAN);
    safeText(doc, `OPCAO ${idx + 1}: ${(h.name || "").toUpperCase()}`, tx, y + 5);

    // Estrelas no tom oceano (#69849b)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    setText(doc, OCEAN_BANNER);
    safeText(doc, "* * * * *", tx, y + 11);

    // Description
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    setText(doc, TEXT_MAIN);
    const descRaw =
      h.description ||
      `${h.nights || 0} diaria(s) - Check-in ${formatDateBR(h.checkIn)} / Check-out ${formatDateBR(h.checkOut)}${h.meal ? " - " + h.meal : ""}`;
    const descLines = doc.splitTextToSize(sanitize(descRaw), tw);
    doc.text(descLines.slice(0, 4), tx, y + 17);

    // Amenity chips
    const chipY = y + cardH - 8;
    const amenities = [h.meal || "Café da manha", "Wi-Fi", "Piscina"];
    let cx = tx;
    amenities.forEach((a) => {
      const text = sanitize(a);
      const w = doc.getTextWidth(text) + 6;
      setFill(doc, CREAM);
      doc.roundedRect(cx, chipY - 4, w, 5.5, 1.5, 1.5, "F");
      doc.setFontSize(7);
      setText(doc, OCEAN);
      safeText(doc, text, cx + 3, chipY);
      cx += w + 3;
    });

    y += cardH + 8;
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
  const goldH = 1.2;
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
