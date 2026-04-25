import jsPDF from "jspdf";

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
// Palette: white + bege + ocean blue
const WHITE = [255, 255, 255] as const;
const CREAM = [245, 239, 227] as const; // page bege
const CREAM_SOFT = [250, 246, 238] as const;
const SAND = [231, 218, 196] as const; // chip bege
const OCEAN = [31, 58, 95] as const; // dark navy
const OCEAN_SOFT = [122, 149, 176] as const; // muted blue
const TEXT_MAIN = [40, 40, 50] as const;
const TEXT_MUTED = [120, 120, 130] as const;
const BORDER = [220, 212, 196] as const;

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

function drawPageHeader(doc: jsPDF, pw: number, agencyName: string) {
  // top thin ocean line
  setFill(doc, OCEAN_SOFT);
  doc.rect(0, 0, pw, 1.5, "F");
}

function drawPageFooter(doc: jsPDF, pw: number, ph: number, agencyName: string) {
  setStroke(doc, BORDER);
  doc.setLineWidth(0.3);
  doc.line(20, ph - 18, pw - 20, ph - 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setText(doc, TEXT_MUTED);
  safeText(doc, agencyName.toUpperCase(), pw / 2, ph - 12, { align: "center", charSpace: 1.2 });
}

// ─── Section title (serif, centered) ──────────────────────
function drawSectionTitle(doc: jsPDF, pw: number, y: number, title: string): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  setText(doc, OCEAN);
  safeText(doc, title.toUpperCase(), pw / 2, y, { align: "center", charSpace: 3 });
  // small underline
  setFill(doc, OCEAN_SOFT);
  doc.rect(pw / 2 - 18, y + 3, 36, 0.6, "F");
  return y + 14;
}

function drawSubTitle(doc: jsPDF, pw: number, y: number, label: string): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  setText(doc, OCEAN);
  safeText(doc, label.toUpperCase(), pw / 2, y, { align: "center" });
  return y + 10;
}

// ─── Cover Page ────────────────────────────────────────────
function drawCover(doc: jsPDF, data: PremiumPdfData, pw: number, ph: number, agencyName: string) {
  drawPageBg(doc, pw, ph);

  // Top thin line
  setFill(doc, OCEAN_SOFT);
  doc.rect(0, 0, pw, 2, "F");

  // Logo top-left/center
  let topY = 22;
  if (data.agency.logoBase64) {
    try {
      doc.addImage(data.agency.logoBase64, "PNG", pw / 2 - 22, 14, 44, 18);
      topY = 38;
    } catch {
      /* ignore */
    }
  }
  const y = topY + 20;

  // mede largura do primeiro texto
  doc.setFont("helvetica", "italic");
  doc.setFontSize(18);

  const text1 = "Proposta de";
  const width1 = doc.getTextWidth(text1);

  // desenha primeiro
  safeText(doc, text1, 60, y);

  // desenha o segundo logo após
  doc.setFont("helvetica", "bold");
  doc.setFontSize(40);

  safeText(doc, "ORÇAMENTO", 60 + width1 + 5, y);
  // "Proposta de" — italic small
  //doc.setFont("helvetica", "italic");
  //doc.setFontSize(18);
  //setText(doc, OCEAN);
  //safeText(doc, "Proposta de", 70, topY + 12, { align: "center" });

  // ORÇAMENTO — huge serif
  //doc.setFont("helvetica", "bold");
  //doc.setFontSize(40);
  //setText(doc, OCEAN);
  //safeText(doc, "ORÇAMENTO", pw / 2, topY + 28, { align: "center", charSpace: 4 });

  // Destination subtitle
  if (data.destination) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    setText(doc, TEXT_MUTED);
    safeText(doc, `VIAGEM PARA ${data.destination.toUpperCase()}`, pw / 2, topY + 36, {
      align: "center",
      charSpace: 2,
    });
  }

  // Hero image area
  const imgX = 18;
  const imgY = topY + 44;
  const imgW = pw - 36;
  const imgH = 150;

  // Image or placeholder
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
    setFill(doc, CREAM);
    doc.rect(imgX, imgY, imgW, imgH, "F");
    doc.setFont("helvetica", "italic");
    doc.setFontSize(16);
    setText(doc, OCEAN_SOFT);
    safeText(doc, data.destination ? data.destination : "Destino", pw / 2, imgY + imgH / 2, { align: "center" });
  }

  // Bottom band — ocean soft
  const bandY = imgY + imgH + 8;
  const bandH = 26;
  setFill(doc, OCEAN_SOFT);
  doc.rect(imgX, bandY, imgW, bandH, "F");

  // Dates
  doc.setFont("helvetica", "italic");
  doc.setFontSize(11);
  setText(doc, WHITE);
  const dateRange = formatRangeLong(data.departureDate, data.returnDate);
  if (dateRange) safeText(doc, dateRange, pw / 2, bandY + 9, { align: "center" });

  // Client name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  setText(doc, WHITE);
  safeText(doc, (data.client.name || "").toUpperCase(), pw / 2, bandY + 18, { align: "center", charSpace: 1.5 });

  // Footer agency
  doc.setFont("helvetica", "italic");
  doc.setFontSize(12);
  setText(doc, OCEAN);
  safeText(doc, agencyName, pw / 2, ph - 22, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setText(doc, TEXT_MUTED);
  safeText(doc, "VIAGENS", pw / 2, ph - 16, { align: "center", charSpace: 2 });
}

// ─── Flight Section ────────────────────────────────────────
type Leg = NonNullable<PremiumPdfData["flightLegs"]>[number];

function drawFlightLegCard(doc: jsPDF, x: number, y: number, w: number, leg: Leg): number {
  // Date header — bege strip
  const dateStr = formatWeekday(leg.departureDate) || formatDateBR(leg.departureDate);
  setFill(doc, SAND);
  doc.rect(x, y, w, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setText(doc, OCEAN);
  safeText(doc, dateStr.toUpperCase(), x + w / 2, y + 4.7, { align: "center" });
  let yy = y + 7;

  // Two side-by-side boxes (origin / destination) with plane icon between
  const gap = 6;
  const planeW = 8;
  const boxW = (w - planeW - gap * 2) / 2;

  // Origin box
  setFill(doc, CREAM_SOFT);
  doc.rect(x, yy + 2, boxW, 14, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  setText(doc, OCEAN);
  const oCode = extractCode(leg.origin);
  const oLabel = sanitize(leg.origin || "");
  // Format like "GRU | São Paulo, BR" if we have a comma; else just code
  const oDisplay = oLabel.includes("|") || oLabel.includes(",") ? oLabel : `${oCode}`;
  safeText(doc, oDisplay, x + boxW / 2, yy + 8, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  setText(doc, TEXT_MUTED);
  safeText(doc, `SAIDA: ${leg.departureTime || "--:--"}`, x + boxW / 2, yy + 13, { align: "center", charSpace: 0.5 });

  // Plane symbol
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  setText(doc, OCEAN_SOFT);
  safeText(doc, ">", x + boxW + gap + planeW / 2, yy + 10, { align: "center" });

  // Destination box
  const dx = x + boxW + gap + planeW + gap;
  setFill(doc, CREAM_SOFT);
  doc.rect(dx, yy + 2, boxW, 14, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  setText(doc, OCEAN);
  const dCode = extractCode(leg.destination);
  const dLabel = sanitize(leg.destination || "");
  const dDisplay = dLabel.includes("|") || dLabel.includes(",") ? dLabel : `${dCode}`;
  safeText(doc, dDisplay, dx + boxW / 2, yy + 8, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  setText(doc, TEXT_MUTED);
  safeText(doc, `CHEGADA: ${leg.arrivalTime || "--:--"}`, dx + boxW / 2, yy + 13, { align: "center", charSpace: 0.5 });

  // Flight code small (right-aligned tiny)
  if (leg.flightCode) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    setText(doc, TEXT_MUTED);
    safeText(doc, sanitize(leg.flightCode), x + w - 1, yy + 1.5, { align: "right" });
  }

  return yy + 19; // total height used
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

    // Image placeholder (rounded look via cream block)
    setFill(doc, CREAM);
    doc.roundedRect(m, y, imgW, cardH, 4, 4, "F");
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    setText(doc, OCEAN_SOFT);
    safeText(doc, "HOTEL", m + imgW / 2, y + cardH / 2 + 2, { align: "center" });

    // Right side text
    const tx = m + imgW + 6;
    const tw = cardW - imgW - 6;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    setText(doc, OCEAN);
    safeText(doc, `OPCAO ${idx + 1}: ${(h.name || "").toUpperCase()}`, tx, y + 5);

    // Stars (★★★★) ascii
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    setText(doc, OCEAN_SOFT);
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

  let y = 35;
  y = drawSectionTitle(doc, pw, y, "Investimento");
  y += 10;

  const m = 26;
  const w = pw - m * 2;

  // Card for total
  setFill(doc, CREAM);
  doc.roundedRect(m, y, w, 38, 4, 4, "F");
  doc.setFont("helvetica", "italic");
  doc.setFontSize(11);
  setText(doc, OCEAN);
  safeText(doc, "Valor total da viagem", pw / 2, y + 11, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  setText(doc, OCEAN);
  safeText(doc, fmtBRL(data.totalTrip || 0), pw / 2, y + 25, { align: "center" });

  if (data.payment?.installments && data.payment.installments > 1) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    setText(doc, TEXT_MUTED);
    const inst = (data.totalTrip || 0) / data.payment.installments;
    safeText(doc, `ou ${data.payment.installments}x de ${fmtBRL(inst)}`, pw / 2, y + 33, { align: "center" });
  }

  y += 50;

  // Includes list
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  setText(doc, OCEAN);
  safeText(doc, "Inclui", m, y);
  y += 7;
  setStroke(doc, OCEAN_SOFT);
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
    setStroke(doc, OCEAN_SOFT);
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
