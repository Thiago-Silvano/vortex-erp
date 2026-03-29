import jsPDF from 'jspdf';

// ─── Color Palette (matching Airline Voucher) ───────────────
const DARK_HEADER = [27, 20, 48] as const;
const WHITE = [255, 255, 255] as const;
const TEXT_MAIN = [40, 40, 40] as const;
const TEXT_MUTED = [120, 120, 120] as const;
const ACCENT_PURPLE = [91, 46, 255] as const;
const BORDER = [210, 210, 210] as const;
const LIGHT_BG = [248, 248, 250] as const;
const SECTION_HEADER_BG = [40, 30, 65] as const;
const GOLD_ACCENT = [200, 164, 91] as const;

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
  eticketNumber?: string;
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

// ─── Main Generator ─────────────────────────────────────────
export function generateVoucherPdf(data: VoucherPdfData) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();
  const m = 15;
  const cw = pw - m * 2;

  let y = 8;

  // ─── TOP HEADER BAR (dark, matches airline voucher) ──────
  const headerH = 22;
  doc.setFillColor(DARK_HEADER[0], DARK_HEADER[1], DARK_HEADER[2]);
  doc.rect(0, 0, pw, headerH, 'F');

  // Agency logo (left)
  if (data.agency.logoBase64) {
    try {
      doc.addImage(data.agency.logoBase64, 'PNG', m, 1, 24, 20);
    } catch { /* skip */ }
  }

  // Ref + Date (center-right)
  const infoX = pw - m - 60;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(180, 180, 180);
  doc.text('Referencia', infoX, 7);
  doc.text('Data', infoX + 32, 7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
  doc.text(s(data.shortId?.toUpperCase() || '-'), infoX, 14);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
  doc.text(s(formatDateBR(data.saleDate) || '-'), infoX + 32, 14);

  y = headerH + 6;

  // ─── CLIENT INFO CARD ──────────────────────────────────
  const clientCardH = 14;
  doc.setFillColor(WHITE[0], WHITE[1], WHITE[2]);
  doc.rect(m, y, cw, clientCardH, 'F');
  doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
  doc.setLineWidth(0.2);
  doc.rect(m, y, cw, clientCardH, 'S');

  // Left accent
  doc.setFillColor(ACCENT_PURPLE[0], ACCENT_PURPLE[1], ACCENT_PURPLE[2]);
  doc.rect(m, y, 2.5, clientCardH, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.text('CLIENTE', m + 7, y + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(TEXT_MAIN[0], TEXT_MAIN[1], TEXT_MAIN[2]);
  doc.text(s(data.client.name), m + 7, y + 11);

  if (data.seller) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
    doc.text(s(`Consultor: ${data.seller}`), m + cw - 5, y + 11, { align: 'right' });
  }

  y += clientCardH + 5;

  // ─── TRIP SUMMARY ──────────────────────────────────────
  const summaryItems: Array<{ label: string; value: string }> = [];
  if (data.destination) summaryItems.push({ label: 'Destino', value: data.destination });
  if (data.origin) summaryItems.push({ label: 'Origem', value: data.origin });
  if (data.departureDate && data.returnDate)
    summaryItems.push({ label: 'Periodo', value: `${formatDateBR(data.departureDate)} - ${formatDateBR(data.returnDate)}` });
  if (data.nights) summaryItems.push({ label: 'Duracao', value: `${data.nights} noites` });
  if (data.passengersCount) summaryItems.push({ label: 'Passageiros', value: `${data.passengersCount}` });

  if (summaryItems.length > 0) {
    y = drawSectionBar(doc, 'RESUMO DA VIAGEM', y, m, cw);
    y += 3;

    summaryItems.forEach((item, i) => {
      const colW = cw / Math.min(summaryItems.length, 3);
      const col = i % 3;
      const row = Math.floor(i / 3);
      const cx = m + col * colW;
      const cy = y + row * 14;

      doc.setFillColor(LIGHT_BG[0], LIGHT_BG[1], LIGHT_BG[2]);
      doc.rect(cx + 1, cy, colW - 2, 12, 'F');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
      doc.text(item.label, cx + 4, cy + 5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(TEXT_MAIN[0], TEXT_MAIN[1], TEXT_MAIN[2]);
      doc.text(s(item.value), cx + 4, cy + 10);
    });
    y += Math.ceil(summaryItems.length / 3) * 14 + 4;
  }

  // ─── PASSENGERS ───────────────────────────────────────
  if (data.passengers.length > 0) {
    y = checkPage(doc, y, 20);
    y = drawSectionBar(doc, `PASSAGEIROS: ${data.passengers.length}`, y, m, cw);
    y += 3;

    data.passengers.forEach((pax) => {
      y = checkPage(doc, y, 18);

      const cardH = 14;
      doc.setFillColor(WHITE[0], WHITE[1], WHITE[2]);
      doc.rect(m, y, cw, cardH, 'F');
      doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
      doc.setLineWidth(0.2);
      doc.rect(m, y, cw, cardH, 'S');

      doc.setFillColor(ACCENT_PURPLE[0], ACCENT_PURPLE[1], ACCENT_PURPLE[2]);
      doc.rect(m, y, 2.5, cardH, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(TEXT_MAIN[0], TEXT_MAIN[1], TEXT_MAIN[2]);
      doc.text(s(pax.name.toUpperCase()), m + 7, y + 6);

      const details: string[] = [];
      if (pax.documentType && pax.document) {
        details.push(`${pax.documentType === 'cpf' ? 'CPF' : 'Passaporte'}: ${pax.document}`);
      }
      if (pax.birthDate) details.push(`Nasc: ${formatDateBR(pax.birthDate)}`);
      if (pax.eticketNumber) details.push(`Bilhete: ${pax.eticketNumber}`);

      if (details.length > 0) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
        doc.text(details.join('  |  '), m + 7, y + 11);
      }

      y += cardH + 2;
    });
    y += 2;
  }

  // ─── HOTELS ────────────────────────────────────────────
  if (data.hotels.length > 0) {
    y = checkPage(doc, y, 30);
    y = drawSectionBar(doc, 'HOSPEDAGEM', y, m, cw);
    y += 3;

    data.hotels.forEach((hotel) => {
      y = checkPage(doc, y, 30);

      const titleLine = hotel.reservationNumber
        ? `${hotel.name}  |  Reserva: ${hotel.reservationNumber}`
        : hotel.name;

      // Hotel card
      const hotelStartY = y;
      doc.setFillColor(WHITE[0], WHITE[1], WHITE[2]);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(TEXT_MAIN[0], TEXT_MAIN[1], TEXT_MAIN[2]);
      doc.text(s(titleLine), m + 7, y + 6);
      y += 9;

      if (hotel.room) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(TEXT_MAIN[0], TEXT_MAIN[1], TEXT_MAIN[2]);
        doc.text(s(hotel.room), m + 7, y);
        y += 4;
      }

      const hotelDetails: string[] = [];
      hotelDetails.push(`${formatDateBR(hotel.checkIn)} - ${formatDateBR(hotel.checkOut)}`);
      hotelDetails.push(`${hotel.nights} noites`);
      if (hotel.meal) hotelDetails.push(hotel.meal);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
      doc.text(hotelDetails.join('  |  '), m + 7, y);
      y += 4;

      if (hotel.description) {
        doc.setFontSize(7);
        const descLines = doc.splitTextToSize(s(hotel.description), cw - 14);
        doc.text(descLines, m + 7, y);
        y += descLines.length * 3 + 2;
      }

      // Draw card border
      const cardH = y - hotelStartY + 2;
      doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
      doc.setLineWidth(0.2);
      doc.rect(m, hotelStartY, cw, cardH, 'S');
      doc.setFillColor(ACCENT_PURPLE[0], ACCENT_PURPLE[1], ACCENT_PURPLE[2]);
      doc.rect(m, hotelStartY, 2.5, cardH, 'F');

      y += 4;
    });
  }

  // ─── RESERVATIONS ──────────────────────────────────────
  if (data.reservations.length > 0) {
    y = checkPage(doc, y, 20);
    y = drawSectionBar(doc, 'RESERVAS E CONFIRMACOES', y, m, cw);
    y += 3;

    data.reservations.forEach((res) => {
      y = checkPage(doc, y, 16);

      const cardH = 14;
      doc.setFillColor(WHITE[0], WHITE[1], WHITE[2]);
      doc.rect(m, y, cw, cardH, 'F');
      doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
      doc.setLineWidth(0.2);
      doc.rect(m, y, cw, cardH, 'S');

      doc.setFillColor(ACCENT_PURPLE[0], ACCENT_PURPLE[1], ACCENT_PURPLE[2]);
      doc.rect(m, y, 2.5, cardH, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(TEXT_MAIN[0], TEXT_MAIN[1], TEXT_MAIN[2]);
      doc.text(s(res.description || 'Reserva'), m + 7, y + 6);

      if (res.confirmationCode) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(ACCENT_PURPLE[0], ACCENT_PURPLE[1], ACCENT_PURPLE[2]);
        doc.text(s(`Codigo: ${res.confirmationCode}`), m + cw - 5, y + 6, { align: 'right' });
      }

      const resDetails: string[] = [];
      if (res.supplier) resDetails.push(res.supplier);
      if (res.checkIn && res.checkOut) resDetails.push(`${formatDateBR(res.checkIn)} - ${formatDateBR(res.checkOut)}`);

      if (resDetails.length > 0) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
        doc.text(resDetails.join('  |  '), m + 7, y + 11);
      }

      y += cardH + 2;
    });
    y += 2;
  }

  // ─── FLIGHT ITINERARY ─────────────────────────────────
  const flightGroups = data.flightGroups && data.flightGroups.length > 0
    ? data.flightGroups
    : data.flightLegs.length > 0 ? [data.flightLegs] : [];

  if (flightGroups.length > 0) {
    flightGroups.forEach((groupLegs, groupIdx) => {
      const outbound = groupLegs.filter(l => l.direction !== 'volta');
      const returnLegs = groupLegs.filter(l => l.direction === 'volta');

      if (outbound.length > 0) {
        y = checkPage(doc, y, 50);
        y = drawFlightSection(doc, 'IDA', outbound, y, m, pw, cw);
        y += 4;
      }
      if (returnLegs.length > 0) {
        y = checkPage(doc, y, 50);
        y = drawFlightSection(doc, 'VOLTA', returnLegs, y, m, pw, cw);
        y += 4;
      }

      if (groupIdx < flightGroups.length - 1) {
        doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
        doc.setLineWidth(0.2);
        doc.line(m + 20, y, m + cw - 20, y);
        y += 4;
      }
    });

    // E-tickets
    const paxWithEticket = data.passengers.filter(p => p.eticketNumber);
    if (paxWithEticket.length > 0) {
      y += 2;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(TEXT_MAIN[0], TEXT_MAIN[1], TEXT_MAIN[2]);
      doc.text('Bilhetes Eletronicos:', m + 5, y);
      y += 5;
      paxWithEticket.forEach((pax) => {
        y = checkPage(doc, y, 5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(TEXT_MAIN[0], TEXT_MAIN[1], TEXT_MAIN[2]);
        doc.text(s(`${pax.name}: ${pax.eticketNumber}`), m + 8, y);
        y += 4;
      });
      y += 4;
    }
  }

  // ─── NOTES ────────────────────────────────────────────
  if (data.notes) {
    y = checkPage(doc, y, 15);
    y = drawSectionBar(doc, 'OBSERVACOES', y, m, cw);
    y += 3;

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

  // ─── FOOTER (all pages) ───────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const ph = doc.internal.pageSize.getHeight();

    doc.setFillColor(DARK_HEADER[0], DARK_HEADER[1], DARK_HEADER[2]);
    doc.rect(0, ph - 12, pw, 12, 'F');

    doc.setFillColor(GOLD_ACCENT[0], GOLD_ACCENT[1], GOLD_ACCENT[2]);
    doc.rect(0, ph - 12, pw, 0.8, 'F');

    const footerParts = [data.agency.name, data.agency.whatsapp, data.agency.email, data.agency.website].filter(Boolean);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
    doc.text(footerParts.join('  |  '), pw / 2, ph - 5, { align: 'center' });

    doc.setTextColor(180, 180, 180);
    doc.text(`${i} / ${totalPages}`, pw - m, ph - 5, { align: 'right' });
  }

  return doc;
}

// ─── Section Header Bar (dark with accent) ──────────────────
function drawSectionBar(doc: jsPDF, title: string, y: number, m: number, cw: number): number {
  const barH = 10;
  y = checkPage(doc, y, barH + 10);

  doc.setFillColor(SECTION_HEADER_BG[0], SECTION_HEADER_BG[1], SECTION_HEADER_BG[2]);
  doc.rect(m, y, cw, barH, 'F');

  // Left accent
  doc.setFillColor(ACCENT_PURPLE[0], ACCENT_PURPLE[1], ACCENT_PURPLE[2]);
  doc.rect(m, y, 3, barH, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
  doc.text(s(title), m + 7, y + 6.5);

  return y + barH;
}

// ─── Flight Section (IDA / VOLTA) ──────────────────────────
function drawFlightSection(
  doc: jsPDF, label: string, legs: FlightLegVoucher[], y: number, m: number, pw: number, cw: number
): number {
  const connections = legs.length > 1 ? legs.length - 1 : 0;
  const firstDate = legs[0]?.departureDate;
  const firstTime = legs[0]?.departureTime;

  const barH = 10;
  y = checkPage(doc, y, barH + legs.length * 30 + connections * 8);

  doc.setFillColor(SECTION_HEADER_BG[0], SECTION_HEADER_BG[1], SECTION_HEADER_BG[2]);
  doc.rect(m, y, cw, barH, 'F');

  doc.setFillColor(ACCENT_PURPLE[0], ACCENT_PURPLE[1], ACCENT_PURPLE[2]);
  doc.rect(m, y, 3, barH, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
  const dirIcon = label === 'IDA' ? '>' : '<';
  doc.text(`${dirIcon}  ${label}`, m + 7, y + 6.5);

  if (firstDate) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(200, 200, 200);
    const dateStr = `${formatDateLong(firstDate)}${firstTime ? ` (${firstTime})` : ''}`;
    doc.text(s(dateStr), m + cw / 2, y + 6.5, { align: 'center' });
  }

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

  legs.forEach((leg, idx) => {
    y = checkPage(doc, y, 28);
    y = drawLegRow(doc, leg, y, m, cw);

    if (idx < legs.length - 1) {
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
  doc: jsPDF, leg: FlightLegVoucher, y: number, m: number, cw: number
): number {
  const rowH = 24;
  const leftCol = m + 4;
  const rightCol = m + cw - 4;
  const midX = m + cw / 2;

  doc.setFillColor(WHITE[0], WHITE[1], WHITE[2]);
  doc.rect(m, y, cw, rowH, 'F');
  doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
  doc.setLineWidth(0.2);
  doc.rect(m, y, cw, rowH, 'S');

  // Departure
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(TEXT_MAIN[0], TEXT_MAIN[1], TEXT_MAIN[2]);
  doc.text(s(leg.departureTime || '--:--'), leftCol, y + 9);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.text(formatDateBR(leg.departureDate), leftCol, y + 14);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(TEXT_MAIN[0], TEXT_MAIN[1], TEXT_MAIN[2]);
  doc.text(s(leg.origin || '---'), leftCol + 26, y + 9);

  // Center: flight icon + code
  const iataOrigin = leg.origin && leg.origin.length <= 4 ? leg.origin : '';
  const iataDest = leg.destination && leg.destination.length <= 4 ? leg.destination : '';

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

  // Plane icon
  const planeY = y + 7;
  doc.setDrawColor(ACCENT_PURPLE[0], ACCENT_PURPLE[1], ACCENT_PURPLE[2]);
  doc.setLineWidth(0.5);
  doc.line(midX - 10, planeY, midX - 3, planeY);
  doc.setFillColor(ACCENT_PURPLE[0], ACCENT_PURPLE[1], ACCENT_PURPLE[2]);
  doc.triangle(midX - 2, planeY - 1.5, midX - 2, planeY + 1.5, midX + 2, planeY, 'F');
  doc.line(midX + 3, planeY, midX + 10, planeY);

  if (leg.flightCode) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
    doc.text(s(leg.flightCode), midX, y + 14, { align: 'center' });
  }

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

  // Arrival
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(TEXT_MAIN[0], TEXT_MAIN[1], TEXT_MAIN[2]);
  doc.text(s(leg.arrivalTime || '--:--'), rightCol, y + 9, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.text(formatDateBR(leg.arrivalDate), rightCol, y + 14, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(TEXT_MAIN[0], TEXT_MAIN[1], TEXT_MAIN[2]);
  doc.text(s(leg.destination || '---'), rightCol - 26, y + 9, { align: 'right' });

  return y + rowH + 2;
}
