import jsPDF from 'jspdf';

// ─── Color Palette ──────────────────────────────────────────
const DEEP_BLUE = [13, 27, 42] as const;
const GOLD = [200, 164, 91] as const;
const LIGHT_GRAY = [245, 245, 245] as const;
const TEXT_MAIN = [26, 26, 26] as const;
const TEXT_MUTED = [120, 120, 120] as const;
const WHITE = [255, 255, 255] as const;
const GOLD_LIGHT = [248, 243, 231] as const;
const BORDER_COLOR = [220, 220, 220] as const;

// ─── Interfaces ─────────────────────────────────────────────
export interface FlightLegVoucher {
  origin: string;
  destination: string;
  departureDate?: string;
  departureTime?: string;
  arrivalDate?: string;
  arrivalTime?: string;
  connectionDuration?: string;
  direction?: 'ida' | 'volta';
  flightCode?: string;
}

export interface HotelVoucher {
  name: string;
  room?: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  meal?: string;
  description?: string;
  address?: string;
  reservationNumber?: string;
}

export interface ServiceVoucher {
  name: string;
  description?: string;
  date?: string;
  quantity?: number;
  value: number;
  type?: string;
}

export interface PassengerVoucher {
  name: string;
  document?: string;
  documentType?: string;
  birthDate?: string;
  isMain?: boolean;
}

export interface ReservationVoucher {
  description: string;
  confirmationCode: string;
  supplier?: string;
  checkIn?: string;
  checkOut?: string;
  status?: string;
}

export interface VoucherPdfData {
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
  passengers: PassengerVoucher[];
  flightLegs: FlightLegVoucher[];
  flightGroups?: FlightLegVoucher[][];
  hotels: HotelVoucher[];
  services: ServiceVoucher[];
  allItems: Array<{ name: string; value: number; description?: string }>;
  showIndividualValues?: boolean;
  totalTrip: number;
  reservations: ReservationVoucher[];
  payment: {
    method: string;
    installments: number;
    receivables: Array<{ number: number; amount: number; dueDate?: string }>;
  };
  notes?: string;
  saleDate?: string;
  shortId?: string;
}

// ─── Helpers ────────────────────────────────────────────────
const sanitize = (text: string): string =>
  text
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2026]/g, '...')
    .replace(/[\u25B8\u25BA]/g, '-')
    .replace(/[\u{1F300}-\u{1FFFF}]/gu, '')
    .replace(/[^\x00-\xFF]/g, '');

const fmt = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

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
    return date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  } catch { return formatDateBR(d); }
};

function setColor(doc: jsPDF, color: readonly [number, number, number]) {
  doc.setTextColor(color[0], color[1], color[2]);
}

function drawLine(doc: jsPDF, x1: number, y: number, x2: number, color: readonly number[] = BORDER_COLOR, width = 0.3) {
  doc.setDrawColor(color[0], color[1], color[2]);
  doc.setLineWidth(width);
  doc.line(x1, y, x2, y);
}

function checkPageBreak(doc: jsPDF, y: number, needed: number, margin: number): number {
  if (y + needed > 275) {
    doc.addPage();
    return margin + 5;
  }
  return y;
}

function safeText(doc: jsPDF, text: string | string[], x: number, y: number, options?: any) {
  if (Array.isArray(text)) {
    doc.text(text.map(t => sanitize(t)), x, y, options);
  } else {
    doc.text(sanitize(text), x, y, options);
  }
}

// ─── Main Generator ─────────────────────────────────────────
export function generateVoucherPdf(data: VoucherPdfData) {
  const s = sanitize;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const m = 20;
  const cw = pw - m * 2;

  // White background
  doc.setFillColor(WHITE[0], WHITE[1], WHITE[2]);
  doc.rect(0, 0, pw, ph, 'F');

  let y = 8;

  // ─── Header: Logo + Agency Info ─────────────────────────
  if (data.agency.logoBase64) {
    try {
      doc.addImage(data.agency.logoBase64, 'PNG', m, y, 40, 20);
    } catch { /* fallback */ }
  }

  // Agency contact on the right
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  setColor(doc, TEXT_MUTED);
  const contactY = y + 6;
  if (data.agency.whatsapp) doc.text(s(data.agency.whatsapp), pw - m, contactY, { align: 'right' });
  if (data.agency.email) doc.text(data.agency.email, pw - m, contactY + 4, { align: 'right' });
  if (data.agency.website) doc.text(data.agency.website, pw - m, contactY + 8, { align: 'right' });

  y = 30;

  // ─── Title: VOUCHER (above gold stripe) ─────────────────
  doc.setFont('times', 'bold');
  doc.setFontSize(22);
  setColor(doc, DEEP_BLUE);
  doc.text('VOUCHER', pw / 2, y, { align: 'center' });
  y += 5;

  // Gold stripe
  doc.setFillColor(GOLD[0], GOLD[1], GOLD[2]);
  doc.rect(0, y, pw, 3, 'F');
  y += 7;

  // Short ID / Sale date
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  setColor(doc, TEXT_MUTED);
  const metaInfo: string[] = [];
  if (data.shortId) metaInfo.push(`Ref: ${data.shortId.toUpperCase()}`);
  if (data.saleDate) metaInfo.push(`Data: ${formatDateBR(data.saleDate)}`);
  if (metaInfo.length > 0) {
    doc.text(metaInfo.join('  |  '), pw / 2, y + 1, { align: 'center' });
    y += 6;
  }

  y += 2;

  // ─── Client Info ────────────────────────────────────────
  doc.setFillColor(LIGHT_GRAY[0], LIGHT_GRAY[1], LIGHT_GRAY[2]);
  doc.rect(m, y, cw, 14, 'F');
  doc.setFillColor(GOLD[0], GOLD[1], GOLD[2]);
  doc.rect(m, y, 3, 14, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  setColor(doc, TEXT_MUTED);
  doc.text('CLIENTE', m + 8, y + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  setColor(doc, DEEP_BLUE);
  doc.text(s(data.client.name), m + 8, y + 11);

  if (data.seller) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    setColor(doc, TEXT_MUTED);
    doc.text(s(`Consultor: ${data.seller}`), pw - m - 4, y + 11, { align: 'right' });
  }
  y += 18;

  // ─── Trip Summary ──────────────────────────────────────
  y = drawSectionTitle(doc, 'Resumo da viagem', y, m, pw);
  y += 2;

  const summaryItems: Array<{ label: string; value: string }> = [];
  if (data.destination) summaryItems.push({ label: 'Destino', value: data.destination });
  if (data.origin) summaryItems.push({ label: 'Origem', value: data.origin });
  if (data.departureDate && data.returnDate)
    summaryItems.push({ label: 'Periodo', value: `${formatDateBR(data.departureDate)} - ${formatDateBR(data.returnDate)}` });
  if (data.nights) summaryItems.push({ label: 'Duracao', value: `${data.nights} noites` });
  if (data.passengersCount) summaryItems.push({ label: 'Passageiros', value: `${data.passengersCount}` });

  if (summaryItems.length > 0) {
    const cardW = (cw - 6) / 2;
    const cardH = 16;
    summaryItems.forEach((item, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const cx = m + col * (cardW + 6);
      const cy = y + row * (cardH + 3);

      doc.setFillColor(LIGHT_GRAY[0], LIGHT_GRAY[1], LIGHT_GRAY[2]);
      doc.rect(cx, cy, cardW, cardH, 'F');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      setColor(doc, TEXT_MUTED);
      doc.text(item.label, cx + 4, cy + 6);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      setColor(doc, DEEP_BLUE);
      doc.text(s(item.value), cx + 4, cy + 12);
    });
    y += Math.ceil(summaryItems.length / 2) * (cardH + 3) + 4;
  }

  // ─── Passengers ─────────────────────────────────────────
  if (data.passengers.length > 0) {
    y = checkPageBreak(doc, y, 30, m);
    y = drawSectionTitle(doc, 'Passageiros', y, m, pw);
    y += 2;

    data.passengers.forEach((pax, idx) => {
      y = checkPageBreak(doc, y, 14, m);

      const bgColor = idx % 2 === 0 ? LIGHT_GRAY : WHITE;
      doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
      doc.rect(m, y - 2, cw, 12, 'F');

      // Main badge
      if (pax.isMain) {
        doc.setFillColor(GOLD[0], GOLD[1], GOLD[2]);
        doc.rect(m, y - 2, 2, 12, 'F');
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      setColor(doc, DEEP_BLUE);
      doc.text(s(pax.name), m + 5, y + 3);

      const paxDetails: string[] = [];
      if (pax.documentType && pax.document) {
        paxDetails.push(`${pax.documentType === 'cpf' ? 'CPF' : 'Passaporte'}: ${pax.document}`);
      }
      if (pax.birthDate) paxDetails.push(`Nasc: ${formatDateBR(pax.birthDate)}`);

      if (paxDetails.length > 0) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        setColor(doc, TEXT_MUTED);
        doc.text(paxDetails.join('  |  '), m + 5, y + 8);
      }

      y += 13;
    });
    y += 2;
  }

  // ─── Reservations ───────────────────────────────────────
  if (data.reservations.length > 0) {
    y = checkPageBreak(doc, y, 30, m);
    y = drawSectionTitle(doc, 'Reservas e codigos de confirmacao', y, m, pw);
    y += 2;

    data.reservations.forEach((res, idx) => {
      y = checkPageBreak(doc, y, 18, m);

      doc.setFillColor(idx % 2 === 0 ? LIGHT_GRAY[0] : WHITE[0], idx % 2 === 0 ? LIGHT_GRAY[1] : WHITE[1], idx % 2 === 0 ? LIGHT_GRAY[2] : WHITE[2]);
      doc.rect(m, y - 2, cw, 16, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      setColor(doc, DEEP_BLUE);
      doc.text(s(res.description || `Reserva ${idx + 1}`), m + 5, y + 3);

      if (res.confirmationCode) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        setColor(doc, GOLD);
        doc.text(s(`Cod: ${res.confirmationCode}`), pw - m - 5, y + 3, { align: 'right' });
      }

      const resDetails: string[] = [];
      if (res.supplier) resDetails.push(res.supplier);
      if (res.checkIn && res.checkOut) resDetails.push(`${formatDateBR(res.checkIn)} - ${formatDateBR(res.checkOut)}`);

      if (resDetails.length > 0) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        setColor(doc, TEXT_MUTED);
        doc.text(resDetails.join('  |  '), m + 5, y + 10);
      }

      y += 18;
    });
    y += 2;
  }

  // ─── Hotels ─────────────────────────────────────────────
  if (data.hotels.length > 0) {
    y = checkPageBreak(doc, y, 40, m);
    y = drawSectionTitle(doc, 'Hospedagem', y, m, pw);
    y += 2;

    data.hotels.forEach((hotel) => {
      y = checkPageBreak(doc, y, 30, m);

      doc.setFont('times', 'bold');
      doc.setFontSize(13);
      setColor(doc, DEEP_BLUE);
      doc.text(s(hotel.name), m + 5, y + 4);
      y += 8;

      if (hotel.room) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        setColor(doc, TEXT_MAIN);
        doc.text(s(hotel.room), m + 5, y);
        y += 4;
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      setColor(doc, TEXT_MUTED);
      const details: string[] = [];
      details.push(`${formatDateBR(hotel.checkIn)} - ${formatDateBR(hotel.checkOut)}`);
      details.push(`${hotel.nights} noites`);
      if (hotel.meal) details.push(hotel.meal);
      doc.text(details.join('  |  '), m + 5, y);
      y += 4;

      if (hotel.description) {
        doc.setFontSize(7);
        const descLines = doc.splitTextToSize(s(hotel.description), cw - 10);
        doc.text(descLines, m + 5, y);
        y += descLines.length * 3 + 2;
      }

      drawLine(doc, m, y + 1, pw - m);
      y += 4;
    });
  }

  // ─── Flight Itinerary ──────────────────────────────────
  const flightGroups = data.flightGroups && data.flightGroups.length > 0
    ? data.flightGroups
    : data.flightLegs.length > 0 ? [data.flightLegs] : [];

  if (flightGroups.length > 0) {
    y = checkPageBreak(doc, y, 50, m);
    y = drawSectionTitle(doc, 'Itinerario aereo', y, m, pw);
    y += 4;

    flightGroups.forEach((groupLegs, groupIdx) => {
      if (groupIdx > 0) {
        y = checkPageBreak(doc, y, 10, m);
        drawLine(doc, m + 20, y, pw - m - 20, BORDER_COLOR, 0.2);
        y += 6;
      }

      const outbound = groupLegs.filter(l => l.direction !== 'volta');
      const returnLegs = groupLegs.filter(l => l.direction === 'volta');

      if (outbound.length > 0) {
        y = drawFlightDirection(doc, 'IDA', outbound, y, m, pw, cw);
        y += 4;
      }
      if (returnLegs.length > 0) {
        y = checkPageBreak(doc, y, 40, m);
        y = drawFlightDirection(doc, 'VOLTA', returnLegs, y, m, pw, cw);
        y += 4;
      }
    });

    drawLine(doc, m, y, pw - m);
    y += 6;
  }

  // Services and Financial sections removed from voucher

  // ─── Notes ─────────────────────────────────────────────
  if (data.notes) {
    y = checkPageBreak(doc, y, 20, m);
    y = drawSectionTitle(doc, 'Observacoes', y, m, pw);
    y += 4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    setColor(doc, TEXT_MUTED);
    const noteLines = doc.splitTextToSize(s(data.notes), cw);
    noteLines.forEach((line: string) => {
      y = checkPageBreak(doc, y, 5, m);
      doc.text(line, m, y);
      y += 4;
    });
  }

  // ─── Footer on all pages ───────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const pageH = doc.internal.pageSize.getHeight();

    // Deep blue bottom bar
    doc.setFillColor(DEEP_BLUE[0], DEEP_BLUE[1], DEEP_BLUE[2]);
    doc.rect(0, pageH - 15, pw, 15, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
    const footerParts = [data.agency.name, data.agency.whatsapp, data.agency.email, data.agency.website].filter(Boolean);
    doc.text(footerParts.join('  |  '), pw / 2, pageH - 7, { align: 'center' });

    // Gold line above footer
    doc.setFillColor(GOLD[0], GOLD[1], GOLD[2]);
    doc.rect(0, pageH - 15, pw, 1, 'F');

    doc.setTextColor(200, 200, 200);
    doc.text(`${i} / ${totalPages}`, pw - m, pageH - 7, { align: 'right' });
  }

  return doc;
}

// ─── Draw Section Title ─────────────────────────────────────
function drawSectionTitle(doc: jsPDF, title: string, y: number, m: number, pw: number): number {
  doc.setFillColor(GOLD[0], GOLD[1], GOLD[2]);
  doc.rect(m, y, 3, 8, 'F');

  doc.setFont('times', 'bold');
  doc.setFontSize(14);
  setColor(doc, DEEP_BLUE);
  doc.text(title, m + 7, y + 6);

  drawLine(doc, m, y + 10, pw - m, BORDER_COLOR, 0.2);
  return y + 14;
}

// ─── Draw Flight Direction Group (Premium Airline Layout) ───
function drawFlightDirection(
  doc: jsPDF, label: string, legs: FlightLegVoucher[], y: number, m: number, pw: number, cw: number
): number {
  const CONNECTION_BG = [240, 240, 240] as const;
  const ACCENT_LINE = GOLD;

  // Calculate total travel time & connections
  let totalDurStr = '';
  let connectionsCount = 0;
  if (legs.length > 0 && legs[0]?.departureDate && legs[0]?.departureTime && legs[legs.length - 1]?.arrivalDate && legs[legs.length - 1]?.arrivalTime) {
    const dep = new Date(`${legs[0].departureDate}T${legs[0].departureTime}:00`);
    const arr = new Date(`${legs[legs.length - 1].arrivalDate}T${legs[legs.length - 1].arrivalTime}:00`);
    if (!isNaN(dep.getTime()) && !isNaN(arr.getTime()) && arr.getTime() > dep.getTime()) {
      const totalMin = Math.round((arr.getTime() - dep.getTime()) / 60000);
      const h = Math.floor(totalMin / 60);
      const mins = totalMin % 60;
      totalDurStr = mins > 0 ? `${h}h${mins}min` : `${h}h`;
    }
  }
  connectionsCount = legs.length > 1 ? legs.length - 1 : 0;

  const routeOrigin = legs[0]?.origin || '';
  const routeDest = legs[legs.length - 1]?.destination || '';

  // Header block with dark background
  const headerH = 20;
  y = checkPageBreak(doc, y, headerH + legs.length * 28 + connectionsCount * 12, m);

  doc.setFillColor(DEEP_BLUE[0], DEEP_BLUE[1], DEEP_BLUE[2]);
  doc.rect(m, y, cw, headerH, 'F');

  doc.setFillColor(GOLD[0], GOLD[1], GOLD[2]);
  doc.rect(m, y, 3, headerH, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(GOLD[0], GOLD[1], GOLD[2]);
  const dirLabel = label === 'IDA' ? 'VOO DE IDA' : 'VOO DE VOLTA';
  safeText(doc, dirLabel, m + 8, y + 7);

  if (legs[0]?.departureDate) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
    safeText(doc, formatDateLong(legs[0].departureDate), m + 8, y + 13);
  }

  if (routeOrigin && routeDest) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
    safeText(doc, `${routeOrigin}  >  ${routeDest}`, m + cw - 5, y + 7, { align: 'right' });
  }

  if (totalDurStr) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(200, 200, 200);
    const summaryParts: string[] = [totalDurStr];
    if (connectionsCount > 0) summaryParts.push(`${connectionsCount} ${connectionsCount === 1 ? 'conexao' : 'conexoes'}`);
    safeText(doc, summaryParts.join('  |  '), m + cw - 5, y + 13, { align: 'right' });
  }

  y += headerH + 4;

  // Render each leg as a card
  legs.forEach((leg, idx) => {
    y = checkPageBreak(doc, y, 26, m);

    const cardX = m + 2;
    const cardW = cw - 4;
    const cardH = 22;

    doc.setFillColor(252, 252, 252);
    doc.rect(cardX, y, cardW, cardH, 'F');

    doc.setDrawColor(BORDER_COLOR[0], BORDER_COLOR[1], BORDER_COLOR[2]);
    doc.setLineWidth(0.2);
    doc.rect(cardX, y, cardW, cardH, 'S');

    const originBlockX = cardX + 8;
    const destBlockX = cardX + cardW - 8;
    const lineStartX = cardX + 45;
    const lineEndX = cardX + cardW - 45;
    const midCardX = cardX + cardW / 2;

    // Origin block
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    setColor(doc, DEEP_BLUE);
    safeText(doc, leg.departureTime || '--:--', originBlockX, y + 9);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    setColor(doc, GOLD);
    safeText(doc, leg.origin || '---', originBlockX, y + 16);

    // Destination block
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    setColor(doc, DEEP_BLUE);
    safeText(doc, leg.arrivalTime || '--:--', destBlockX, y + 9, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    setColor(doc, GOLD);
    safeText(doc, leg.destination || '---', destBlockX, y + 16, { align: 'right' });

    // Flight line with plane
    const lineY = y + 8;
    doc.setDrawColor(ACCENT_LINE[0], ACCENT_LINE[1], ACCENT_LINE[2]);
    doc.setLineWidth(0.4);

    const planeX = midCardX;
    doc.line(lineStartX, lineY, planeX - 6, lineY);

    doc.setFillColor(GOLD[0], GOLD[1], GOLD[2]);
    doc.triangle(planeX - 4, lineY - 2, planeX - 4, lineY + 2, planeX + 2, lineY, 'F');

    doc.line(planeX + 4, lineY, lineEndX, lineY);

    doc.setFillColor(GOLD[0], GOLD[1], GOLD[2]);
    doc.circle(lineEndX + 1, lineY, 1, 'F');
    doc.circle(lineStartX - 1, lineY, 1, 'F');

    // Flight code
    if (leg.flightCode) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      setColor(doc, TEXT_MUTED);
      safeText(doc, leg.flightCode, midCardX, y + 17, { align: 'center' });
    }

    y += cardH + 2;

    // Connection block
    if (idx < legs.length - 1) {
      y = checkPageBreak(doc, y, 14, m);

      const connH = 10;
      const connX = m + 15;
      const connW = cw - 30;

      doc.setFillColor(CONNECTION_BG[0], CONNECTION_BG[1], CONNECTION_BG[2]);
      doc.roundedRect(connX, y, connW, connH, 2, 2, 'F');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      setColor(doc, TEXT_MUTED);

      const connCity = leg.destination || '';
      const connDuration = leg.connectionDuration || '';
      let connText = 'Conexao';
      if (connCity) connText += ` em ${connCity}`;
      if (connDuration) connText += `  |  ${connDuration}`;

      safeText(doc, connText, m + cw / 2, y + connH / 2 + 1.5, { align: 'center' });

      y += connH + 2;
    }
  });

  return y;
}
