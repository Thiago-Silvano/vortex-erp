import jsPDF from 'jspdf';

// ─── Color Palette (matching LATAM voucher) ──────────────────
const DARK_HEADER = [27, 20, 48] as const; // deep purple-black header bar
const WHITE = [255, 255, 255] as const;
const TEXT_MAIN = [40, 40, 40] as const;
const TEXT_MUTED = [120, 120, 120] as const;
const ACCENT_PURPLE = [91, 46, 255] as const;
const BORDER = [210, 210, 210] as const;
const LIGHT_BG = [248, 248, 250] as const;
const SECTION_HEADER_BG = [40, 30, 65] as const;
const GOLD_ACCENT = [200, 164, 91] as const;

// ─── Types ──────────────────────────────────────────────────
export interface AirlineVoucherLeg {
  origin: string;
  destination: string;
  originFull?: string;
  destinationFull?: string;
  departureDate?: string;
  departureTime?: string;
  arrivalDate?: string;
  arrivalTime?: string;
  flightCode?: string;
  connectionDuration?: string;
  direction?: 'ida' | 'volta';
}

export interface AirlineVoucherPassenger {
  name: string;
  eticketNumber?: string;
  baggage?: {
    personalItem: number;
    carryOn: number;
    checkedBag: number;
  };
}

export interface AirlineVoucherData {
  agencyLogoBase64?: string;
  airlineLogoBase64?: string;
  airlineName?: string;
  shortId?: string;
  localizador?: string; // reservation code from airline
  passengers: AirlineVoucherPassenger[];
  flightLegs: AirlineVoucherLeg[];
  notes?: string;
  agencyName?: string;
  agencyWhatsapp?: string;
  agencyEmail?: string;
  agencyWebsite?: string;
}

// ─── Helpers ────────────────────────────────────────────────
const sanitize = (text: string): string =>
  text
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2026]/g, '...')
    .replace(/[^\x00-\xFF]/g, '');

const s = sanitize;

const formatDateBR = (d?: string) => {
  if (!d) return '';
  const parts = d.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return d;
};

const formatDateLong = (d?: string) => {
  if (!d) return '';
  try {
    const date = new Date(d + 'T12:00:00');
    const weekday = date.toLocaleDateString('pt-BR', { weekday: 'long' });
    return `${weekday}, ${formatDateBR(d)}`;
  } catch {
    return formatDateBR(d);
  }
};

function checkPage(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > 275) {
    doc.addPage();
    return 15;
  }
  return y;
}

function countConnections(legs: AirlineVoucherLeg[]): number {
  return legs.length > 1 ? legs.length - 1 : 0;
}

// ─── Main Generator ─────────────────────────────────────────
export function generateAirlineVoucherPdf(data: AirlineVoucherData): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();
  const m = 15;
  const cw = pw - m * 2;

  let y = 8;

  // ─── TOP HEADER BAR ──────────────────────────────────────
  const headerH = 22;
  doc.setFillColor(DARK_HEADER[0], DARK_HEADER[1], DARK_HEADER[2]);
  doc.rect(0, 0, pw, headerH, 'F');

  // Agency logo (left)
  if (data.agencyLogoBase64) {
    try {
      doc.addImage(data.agencyLogoBase64, 'PNG', m, 2, 28, 18);
    } catch { /* skip */ }
  }

  // Airline logo (center-left) — white bg for PNG transparency
  if (data.airlineLogoBase64) {
    try {
      const logoX = m + 35;
      const logoY = 2;
      const logoW = 38;
      const logoH = 18;
      doc.setFillColor(WHITE[0], WHITE[1], WHITE[2]);
      doc.roundedRect(logoX - 1, logoY, logoW + 2, logoH, 2, 2, 'F');
      doc.addImage(data.airlineLogoBase64, 'PNG', logoX, logoY + 1, logoW, logoH - 2);
    } catch { /* skip */ }
  } else if (data.airlineName) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
    doc.text(s(data.airlineName), m + 52, 13);
  }

  // Numero da Compra + Localizador (center-right)
  const infoX = pw - m - 60;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(180, 180, 180);
  doc.text('Numero da Compra', infoX, 7);
  doc.text('Localizador', infoX + 32, 7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
  doc.text(s(data.shortId || '-'), infoX, 14);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
  doc.text(s(data.localizador || '-'), infoX + 32, 14);

  y = headerH + 8;

  // ─── FLIGHT ITINERARY ─────────────────────────────────────
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.text('Informacoes do voo', m, y);
  y += 5;

  const outbound = data.flightLegs.filter(l => l.direction !== 'volta');
  const returnLegs = data.flightLegs.filter(l => l.direction === 'volta');

  if (outbound.length > 0) {
    y = drawFlightSection(doc, 'IDA', outbound, y, m, pw, cw);
    y += 4;
  }
  if (returnLegs.length > 0) {
    y = checkPage(doc, y, 50);
    y = drawFlightSection(doc, 'VOLTA', returnLegs, y, m, pw, cw);
    y += 6;
  }

  // ─── PASSENGERS ───────────────────────────────────────────
  y = checkPage(doc, y, 20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(TEXT_MAIN[0], TEXT_MAIN[1], TEXT_MAIN[2]);
  doc.text(`Passageiros: ${data.passengers.length}`, m, y);
  y += 5;

  data.passengers.forEach((pax) => {
    y = checkPage(doc, y, 32);
    y = drawPassengerCard(doc, pax, y, m, pw, cw);
    y += 3;
  });

  // Baggage disclaimer
  y = checkPage(doc, y, 10);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  const disclaimer = '*Alem da bagagem especificada acima, cada passageiro pode levar consigo uma bolsa, mochila ou sacola (considerado item pessoal).';
  const discLines = doc.splitTextToSize(s(disclaimer), cw);
  doc.text(discLines, m, y);
  y += discLines.length * 3.5 + 4;

  // ─── NOTES ────────────────────────────────────────────────
  if (data.notes) {
    y = checkPage(doc, y, 15);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(TEXT_MAIN[0], TEXT_MAIN[1], TEXT_MAIN[2]);
    doc.text('Observacoes', m, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
    const noteLines = doc.splitTextToSize(s(data.notes), cw);
    noteLines.forEach((line: string) => {
      y = checkPage(doc, y, 5);
      doc.text(line, m, y);
      y += 4;
    });
  }

  // ─── FOOTER ───────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const ph = doc.internal.pageSize.getHeight();

    doc.setFillColor(DARK_HEADER[0], DARK_HEADER[1], DARK_HEADER[2]);
    doc.rect(0, ph - 12, pw, 12, 'F');

    doc.setFillColor(GOLD_ACCENT[0], GOLD_ACCENT[1], GOLD_ACCENT[2]);
    doc.rect(0, ph - 12, pw, 0.8, 'F');

    const footerParts = [data.agencyName, data.agencyWhatsapp, data.agencyEmail, data.agencyWebsite].filter(Boolean);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
    doc.text(footerParts.join('  |  '), pw / 2, ph - 5, { align: 'center' });

    doc.setTextColor(180, 180, 180);
    doc.text(`${i} / ${totalPages}`, pw - m, ph - 5, { align: 'right' });
  }

  return doc;
}

// ─── Flight Section (IDA / VOLTA) ──────────────────────────
function drawFlightSection(
  doc: jsPDF, label: string, legs: AirlineVoucherLeg[], y: number, m: number, pw: number, cw: number
): number {
  const connections = countConnections(legs);
  const firstDate = legs[0]?.departureDate;
  const firstTime = legs[0]?.departureTime;

  // Section header bar (dark with accent)
  const barH = 10;
  y = checkPage(doc, y, barH + legs.length * 30 + connections * 8);

  doc.setFillColor(SECTION_HEADER_BG[0], SECTION_HEADER_BG[1], SECTION_HEADER_BG[2]);
  doc.rect(m, y, cw, barH, 'F');

  // Left accent
  doc.setFillColor(ACCENT_PURPLE[0], ACCENT_PURPLE[1], ACCENT_PURPLE[2]);
  doc.rect(m, y, 3, barH, 'F');

  // Direction icon + label
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
  const dirIcon = label === 'IDA' ? '>' : '<';
  doc.text(`${dirIcon}  Itinerario de ${label}`, m + 7, y + 6.5);

  // Date + time center
  if (firstDate) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(200, 200, 200);
    const dateStr = `${formatDateLong(firstDate)}${firstTime ? ` (${firstTime})` : ''}`;
    doc.text(s(dateStr), m + cw / 2, y + 6.5, { align: 'center' });
  }

  // Connections count (right)
  if (connections > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(200, 200, 200);
    doc.text(`${connections} Escala${connections > 1 ? 's' : ''}`, m + cw - 5, y + 6.5, { align: 'right' });
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(200, 200, 200);
    doc.text('Direto', m + cw - 5, y + 6.5, { align: 'right' });
  }

  y += barH + 3;

  // Render each leg row
  legs.forEach((leg, idx) => {
    y = checkPage(doc, y, 28);
    y = drawLegRow(doc, leg, y, m, pw, cw);

    if (idx < legs.length - 1) {
      // Separator line between legs
      doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
      doc.setLineWidth(0.3);
      doc.line(m, y + 1, m + cw, y + 1);
      y += 3;
    }
  });

  return y;
}

// ─── Single Flight Leg Row ──────────────────────────────────
function drawLegRow(
  doc: jsPDF, leg: AirlineVoucherLeg, y: number, m: number, pw: number, cw: number
): number {
  const rowH = 24;
  const leftCol = m + 4;
  const rightCol = m + cw - 4;
  const midX = m + cw / 2;

  // Light background
  doc.setFillColor(WHITE[0], WHITE[1], WHITE[2]);
  doc.rect(m, y, cw, rowH, 'F');

  // Border
  doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
  doc.setLineWidth(0.2);
  doc.rect(m, y, cw, rowH, 'S');

  // ── LEFT: Departure time + date + city ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(TEXT_MAIN[0], TEXT_MAIN[1], TEXT_MAIN[2]);
  doc.text(s(leg.departureTime || '--:--'), leftCol, y + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.text(formatDateBR(leg.departureDate), leftCol, y + 14);

  // Origin full name + city
  const originLabel = leg.originFull || leg.origin || '';
  if (originLabel.length > 3) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(TEXT_MAIN[0], TEXT_MAIN[1], TEXT_MAIN[2]);
    const originLines = doc.splitTextToSize(s(originLabel), 42);
    doc.text(originLines, leftCol + 26, y + 7);
  }

  // ── CENTER: IATA codes + flight icon + flight number ──
  const iataOrigin = leg.origin && leg.origin.length <= 4 ? leg.origin : '';
  const iataDest = leg.destination && leg.destination.length <= 4 ? leg.destination : '';

  // Origin IATA box
  if (iataOrigin) {
    doc.setFillColor(LIGHT_BG[0], LIGHT_BG[1], LIGHT_BG[2]);
    doc.rect(midX - 28, y + 3, 16, 8, 'F');
    doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
    doc.setLineWidth(0.2);
    doc.rect(midX - 28, y + 3, 16, 8, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(TEXT_MAIN[0], TEXT_MAIN[1], TEXT_MAIN[2]);
    doc.text(s(iataOrigin), midX - 20, y + 8.5, { align: 'center' });
  }

  // Flight icon (plane triangle)
  const planeX = midX;
  const planeY = y + 7;
  doc.setDrawColor(ACCENT_PURPLE[0], ACCENT_PURPLE[1], ACCENT_PURPLE[2]);
  doc.setLineWidth(0.5);
  doc.line(midX - 10, planeY, midX - 3, planeY);
  doc.setFillColor(ACCENT_PURPLE[0], ACCENT_PURPLE[1], ACCENT_PURPLE[2]);
  doc.triangle(planeX - 2, planeY - 1.5, planeX - 2, planeY + 1.5, planeX + 2, planeY, 'F');
  doc.line(midX + 3, planeY, midX + 10, planeY);

  // Flight number below icon
  if (leg.flightCode) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
    doc.text(s(leg.flightCode), midX, y + 14, { align: 'center' });
  }

  // Destination IATA box
  if (iataDest) {
    doc.setFillColor(LIGHT_BG[0], LIGHT_BG[1], LIGHT_BG[2]);
    doc.rect(midX + 12, y + 3, 16, 8, 'F');
    doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
    doc.setLineWidth(0.2);
    doc.rect(midX + 12, y + 3, 16, 8, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(TEXT_MAIN[0], TEXT_MAIN[1], TEXT_MAIN[2]);
    doc.text(s(iataDest), midX + 20, y + 8.5, { align: 'center' });
  }

  // ── RIGHT: Arrival time + date + city ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(TEXT_MAIN[0], TEXT_MAIN[1], TEXT_MAIN[2]);
  doc.text(s(leg.arrivalTime || '--:--'), rightCol, y + 9, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.text(formatDateBR(leg.arrivalDate), rightCol, y + 14, { align: 'right' });

  // Destination full name
  const destLabel = leg.destinationFull || leg.destination || '';
  if (destLabel.length > 3) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(TEXT_MAIN[0], TEXT_MAIN[1], TEXT_MAIN[2]);
    const destLines = doc.splitTextToSize(s(destLabel), 42);
    doc.text(destLines, rightCol - 26, y + 7, { align: 'right' });
  }

  return y + rowH + 2;
}

// ─── Baggage icon helper (draws a small colored icon) ───────
function drawBagIcon(doc: jsPDF, type: 'personal' | 'carryon' | 'checked', x: number, y: number) {
  const size = 5;
  if (type === 'personal') {
    // Green backpack
    doc.setFillColor(76, 175, 80);
    doc.roundedRect(x, y - size + 1, size, size, 1, 1, 'F');
    doc.setFillColor(56, 142, 60);
    doc.roundedRect(x + 0.8, y - size + 2.2, size - 1.6, size - 2.5, 0.5, 0.5, 'F');
    // Straps
    doc.setDrawColor(56, 142, 60);
    doc.setLineWidth(0.4);
    doc.line(x + 1, y + 1, x + 1, y + 2.5);
    doc.line(x + size - 1, y + 1, x + size - 1, y + 2.5);
  } else if (type === 'carryon') {
    // Blue suitcase
    doc.setFillColor(66, 165, 245);
    doc.roundedRect(x + 0.5, y - size + 1.5, size - 1, size - 0.5, 0.8, 0.8, 'F');
    // Handle
    doc.setDrawColor(33, 150, 243);
    doc.setLineWidth(0.5);
    doc.line(x + size / 2, y - size + 1.5, x + size / 2, y - size);
    // Wheels
    doc.setFillColor(33, 33, 33);
    doc.circle(x + 1.5, y + 1.2, 0.4, 'F');
    doc.circle(x + size - 1.5, y + 1.2, 0.4, 'F');
  } else {
    // Red/pink checked bag
    doc.setFillColor(211, 47, 47);
    doc.roundedRect(x + 0.3, y - size + 1, size - 0.6, size, 1, 1, 'F');
    // Handle
    doc.setDrawColor(183, 28, 28);
    doc.setLineWidth(0.5);
    doc.line(x + size / 2, y - size + 1, x + size / 2, y - size - 0.5);
    // Wheels
    doc.setFillColor(33, 33, 33);
    doc.circle(x + 1.5, y + 1.3, 0.4, 'F');
    doc.circle(x + size - 1.5, y + 1.3, 0.4, 'F');
  }
}

// ─── Passenger Card ─────────────────────────────────────────
function drawPassengerCard(
  doc: jsPDF, pax: AirlineVoucherPassenger, y: number, m: number, pw: number, cw: number
): number {
  const cardH = 30;

  // Card background + border
  doc.setFillColor(WHITE[0], WHITE[1], WHITE[2]);
  doc.rect(m, y, cw, cardH, 'F');
  doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
  doc.setLineWidth(0.3);
  doc.rect(m, y, cw, cardH, 'S');

  // Left accent
  doc.setFillColor(ACCENT_PURPLE[0], ACCENT_PURPLE[1], ACCENT_PURPLE[2]);
  doc.rect(m, y, 2.5, cardH, 'F');

  const innerLeft = m + 8;
  const innerRight = m + cw - 6;

  // ── Row 1: Name + E-ticket ──
  const row1Y = y + 7;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(TEXT_MAIN[0], TEXT_MAIN[1], TEXT_MAIN[2]);
  doc.text(s(pax.name.toUpperCase()), innerLeft, row1Y);

  if (pax.eticketNumber) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(ACCENT_PURPLE[0], ACCENT_PURPLE[1], ACCENT_PURPLE[2]);
    doc.text(`E-ticket: ${s(pax.eticketNumber)}`, innerRight, row1Y, { align: 'right' });
  }

  // Separator line
  const sepY = y + 11;
  doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
  doc.setLineWidth(0.15);
  doc.line(innerLeft, sepY, innerRight, sepY);

  // ── Row 2: Seats + Baggage ──
  const row2LabelY = sepY + 5;
  const row2ValueY = row2LabelY + 5;

  // Seats column (fixed width ~30mm)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(TEXT_MAIN[0], TEXT_MAIN[1], TEXT_MAIN[2]);
  doc.text('Assentos', innerLeft, row2LabelY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.text('Nao informado', innerLeft, row2ValueY);

  // Baggage header
  const bagCol = innerLeft + 35;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(TEXT_MAIN[0], TEXT_MAIN[1], TEXT_MAIN[2]);
  doc.text('Bagagens*', bagCol, row2LabelY);

  const bag = pax.baggage || { personalItem: 1, carryOn: 1, checkedBag: 1 };
  const colSpacing = 45;
  let colIdx = 0;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(TEXT_MAIN[0], TEXT_MAIN[1], TEXT_MAIN[2]);

  if (bag.personalItem > 0) {
    const cx = bagCol + colIdx * colSpacing;
    drawBagIcon(doc, 'personal', cx, row2ValueY);
    doc.text('Bolsa ou mochila', cx + 7, row2ValueY);
    colIdx++;
  }

  if (bag.carryOn > 0) {
    const cx = bagCol + colIdx * colSpacing;
    drawBagIcon(doc, 'carryon', cx, row2ValueY);
    doc.text('Mala pequena 12kg', cx + 7, row2ValueY);
    colIdx++;
  }

  if (bag.checkedBag > 0) {
    const cx = bagCol + colIdx * colSpacing;
    drawBagIcon(doc, 'checked', cx, row2ValueY);
    doc.text('Bagagem despachada 23kg', cx + 7, row2ValueY);
    colIdx++;
  }

  return y + cardH;
}