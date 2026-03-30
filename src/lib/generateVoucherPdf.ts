import jsPDF from 'jspdf';

// ─── Color Palette (matching Airline Voucher) ───────────────
const DARK_HEADER = [20, 20, 25] as const;
const WHITE = [255, 255, 255] as const;
const TEXT_MAIN = [40, 40, 40] as const;
const TEXT_MUTED = [120, 120, 120] as const;
const ACCENT_PURPLE = [91, 46, 255] as const;
const BORDER = [210, 210, 210] as const;
const LIGHT_BG = [248, 248, 250] as const;
const SECTION_HEADER_BG = [30, 30, 35] as const;
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
  detailedDescription?: string;
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
  reservationNumber?: string;
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
  vortexWhiteLogoBase64?: string;
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

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function checkPage(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > 275) {
    doc.addPage();
    return 15;
  }
  return y;
}

// ─── Draw page header (reused for each service page) ────────
function drawPageHeader(
  doc: jsPDF, data: VoucherPdfData, pw: number, m: number, cw: number, serviceName?: string
): number {
  const headerH = 22;
  doc.setFillColor(DARK_HEADER[0], DARK_HEADER[1], DARK_HEADER[2]);
  doc.rect(0, 0, pw, headerH, 'F');
  doc.setFillColor(GOLD_ACCENT[0], GOLD_ACCENT[1], GOLD_ACCENT[2]);
  doc.rect(0, headerH, pw, 0.8, 'F');

  // Vortex white logo (same as airline voucher: 24x20mm)
  const logoSrc = data.vortexWhiteLogoBase64 || data.agency.logoBase64;
  if (logoSrc) {
    try {
      doc.addImage(logoSrc, 'PNG', m, 0.5, 30, 35);
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
  doc.text(s(formatDateBR(data.saleDate) || '-'), infoX + 32, 14);

  let y = headerH + 6;

  // ─── CLIENT INFO CARD ──────────────────────────────────
  const clientCardH = 14;
  doc.setFillColor(WHITE[0], WHITE[1], WHITE[2]);
  doc.rect(m, y, cw, clientCardH, 'F');
  doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
  doc.setLineWidth(0.2);
  doc.rect(m, y, cw, clientCardH, 'S');

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

  // Passenger names below client card
  if (data.passengers.length > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(TEXT_MAIN[0], TEXT_MAIN[1], TEXT_MAIN[2]);
    const paxNames = data.passengers.map(p => s(p.name.toUpperCase())).join('  |  ');
    const paxLines = doc.splitTextToSize(`Passageiros: ${paxNames}`, cw);
    paxLines.forEach((line: string) => {
      doc.text(line, m, y);
      y += 4;
    });
    y += 2;
  }

  // Service title bar if provided
  if (serviceName) {
    y = drawSectionBar(doc, s(serviceName.toUpperCase()), y, m, cw);
    y += 3;
  }

  return y;
}

// ─── Draw passengers section ────────────────────────────────
function drawPassengers(doc: jsPDF, data: VoucherPdfData, y: number, m: number, cw: number): number {
  if (data.passengers.length === 0) return y;

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

    if (details.length > 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
      doc.text(details.join('  |  '), m + 7, y + 11);
    }

    y += cardH + 2;
  });
  y += 2;
  return y;
}

// ─── Draw hotel content ─────────────────────────────────────
function drawHotelContent(doc: jsPDF, hotel: HotelVoucher, y: number, m: number, cw: number): number {
  const titleLine = hotel.reservationNumber
    ? `${hotel.name}  |  Reserva: ${hotel.reservationNumber}`
    : hotel.name;

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

  if (hotel.detailedDescription) {
    const cleanDesc = hotel.detailedDescription.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
    if (cleanDesc) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(TEXT_MAIN[0], TEXT_MAIN[1], TEXT_MAIN[2]);
      const detLines = doc.splitTextToSize(s(cleanDesc), cw - 14);
      detLines.forEach((line: string) => {
        y = checkPage(doc, y, 5);
        doc.text(line, m + 7, y);
        y += 3.5;
      });
      y += 1;
    }
  }

  const cardH = y - hotelStartY + 2;
  doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
  doc.setLineWidth(0.2);
  doc.rect(m, hotelStartY, cw, cardH, 'S');
  doc.setFillColor(ACCENT_PURPLE[0], ACCENT_PURPLE[1], ACCENT_PURPLE[2]);
  doc.rect(m, hotelStartY, 2.5, cardH, 'F');

  return y + 4;
}

// ─── Draw generic service content ───────────────────────────
function drawServiceContent(doc: jsPDF, service: ServiceVoucher, y: number, m: number, cw: number): number {
  y = checkPage(doc, y, 20);

  const startY = y;
  doc.setFillColor(WHITE[0], WHITE[1], WHITE[2]);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(TEXT_MAIN[0], TEXT_MAIN[1], TEXT_MAIN[2]);
  doc.text(s(service.name), m + 7, y + 6);
  y += 9;

  if (service.reservationNumber) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(ACCENT_PURPLE[0], ACCENT_PURPLE[1], ACCENT_PURPLE[2]);
    doc.text(`Reserva: ${s(service.reservationNumber)}`, m + 7, y);
    y += 4;
  }

  if (service.date) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
    doc.text(`Data: ${formatDateBR(service.date)}`, m + 7, y);
    y += 4;
  }

  if (service.value > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(ACCENT_PURPLE[0], ACCENT_PURPLE[1], ACCENT_PURPLE[2]);
    doc.text(fmt(service.value), m + cw - 7, startY + 6, { align: 'right' });
  }

  if (service.description) {
    const cleanDesc = service.description.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
    if (cleanDesc) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(TEXT_MAIN[0], TEXT_MAIN[1], TEXT_MAIN[2]);
      const descLines = doc.splitTextToSize(s(cleanDesc), cw - 14);
      descLines.forEach((line: string) => {
        y = checkPage(doc, y, 5);
        doc.text(line, m + 7, y);
        y += 4;
      });
    }
  }

  const cardH = Math.max(y - startY + 2, 14);
  doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
  doc.setLineWidth(0.2);
  doc.rect(m, startY, cw, cardH, 'S');
  doc.setFillColor(ACCENT_PURPLE[0], ACCENT_PURPLE[1], ACCENT_PURPLE[2]);
  doc.rect(m, startY, 2.5, cardH, 'F');

  return startY + cardH + 4;
}

// ─── Draw reservations ──────────────────────────────────────
function drawReservations(doc: jsPDF, reservations: ReservationVoucher[], y: number, m: number, cw: number): number {
  if (reservations.length === 0) return y;

  y = checkPage(doc, y, 20);
  y = drawSectionBar(doc, 'RESERVAS E CONFIRMACOES', y, m, cw);
  y += 3;

  reservations.forEach((res) => {
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
  return y;
}

// ─── Main Generator ─────────────────────────────────────────
export function generateVoucherPdf(data: VoucherPdfData) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();
  const m = 15;
  const cw = pw - m * 2;

  // Filter out airline services
  const nonAirlineServices = data.services.filter(svc => svc.type !== 'aereo');
  const nonAirlineHotels = data.hotels;

  // Build list of "pages" - each service gets its own page
  interface PageItem {
    type: 'hotel' | 'service';
    hotel?: HotelVoucher;
    service?: ServiceVoucher;
    name: string;
  }

  const pages: PageItem[] = [];

  nonAirlineHotels.forEach(hotel => {
    pages.push({ type: 'hotel', hotel, name: hotel.name });
  });

  nonAirlineServices.forEach(svc => {
    if (svc.type === 'hotel') return; // hotels already handled above
    pages.push({ type: 'service', service: svc, name: svc.name });
  });

  if (pages.length === 0) {
    // Fallback: single page with just client info
    drawPageHeader(doc, data, pw, m, cw);
  } else {
    pages.forEach((page, idx) => {
      if (idx > 0) doc.addPage();

      let y = drawPageHeader(doc, data, pw, m, cw, page.name);

      // Service-specific content
      if (page.type === 'hotel' && page.hotel) {
        y = drawSectionBar(doc, 'HOSPEDAGEM', y, m, cw);
        y += 3;
        y = drawHotelContent(doc, page.hotel, y, m, cw);
      } else if (page.type === 'service' && page.service) {
        y = drawSectionBar(doc, 'DETALHES DO SERVICO', y, m, cw);
        y += 3;
        y = drawServiceContent(doc, page.service, y, m, cw);
      }

      // Notes on last page
      if (idx === pages.length - 1 && data.notes) {
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

  doc.setFillColor(ACCENT_PURPLE[0], ACCENT_PURPLE[1], ACCENT_PURPLE[2]);
  doc.rect(m, y, 3, barH, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
  doc.text(s(title), m + 7, y + 6.5);

  return y + barH;
}
