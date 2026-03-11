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

  // Top gold accent
  doc.setFillColor(GOLD[0], GOLD[1], GOLD[2]);
  doc.rect(0, 0, pw, 3, 'F');

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

  y = 32;
  drawLine(doc, m, y, pw - m, GOLD, 0.5);
  y += 6;

  // ─── Title: VOUCHER DE VIAGEM ───────────────────────────
  doc.setFont('times', 'bold');
  doc.setFontSize(22);
  setColor(doc, DEEP_BLUE);
  doc.text('VOUCHER DE VIAGEM', pw / 2, y, { align: 'center' });
  y += 4;

  // Short ID / Sale date
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  setColor(doc, TEXT_MUTED);
  const metaInfo: string[] = [];
  if (data.shortId) metaInfo.push(`Ref: ${data.shortId.toUpperCase()}`);
  if (data.saleDate) metaInfo.push(`Data: ${formatDateBR(data.saleDate)}`);
  if (metaInfo.length > 0) {
    doc.text(metaInfo.join('  |  '), pw / 2, y + 3, { align: 'center' });
    y += 6;
  }

  y += 4;

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
      if (res.status) resDetails.push(`Status: ${res.status}`);

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

  // ─── Services (hide when showIndividualValues is true) ──
  if (data.services.length > 0 && data.showIndividualValues !== true) {
    y = checkPageBreak(doc, y, 30, m);
    y = drawSectionTitle(doc, 'Servicos contratados', y, m, pw);
    y += 4;

    data.services.forEach((svc) => {
      y = checkPageBreak(doc, y, 14, m);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      setColor(doc, DEEP_BLUE);
      doc.text(s(`-  ${svc.name}`), m, y);

      if (svc.value > 0) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        setColor(doc, TEXT_MAIN);
        doc.text(fmt(svc.value), pw - m, y, { align: 'right' });
      }
      y += 4;

      if (svc.description) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        setColor(doc, TEXT_MUTED);
        const descLines = doc.splitTextToSize(s(svc.description), cw - 10);
        const maxLines = Math.min(descLines.length, 4);
        doc.text(descLines.slice(0, maxLines), m + 5, y);
        y += maxLines * 3 + 2;
      }
      y += 2;
    });

    drawLine(doc, m, y, pw - m);
    y += 6;
  }

  // ─── Financial Summary ─────────────────────────────────
  y = checkPageBreak(doc, y, 40, m);
  y = drawSectionTitle(doc, 'Condicao financeira', y, m, pw);
  y += 4;

  // Total - only show if showIndividualValues is not true
  if (data.showIndividualValues !== true) {
    doc.setFillColor(GOLD_LIGHT[0], GOLD_LIGHT[1], GOLD_LIGHT[2]);
    doc.rect(m, y - 1, cw, 14, 'F');
    doc.setFillColor(GOLD[0], GOLD[1], GOLD[2]);
    doc.rect(m, y - 1, 2, 14, 'F');

    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    setColor(doc, DEEP_BLUE);
    doc.text('Total da viagem', m + 8, y + 8);

    doc.setFont('times', 'bold');
    doc.setFontSize(14);
    setColor(doc, GOLD);
    doc.text(fmt(data.totalTrip), m + cw - 4, y + 8, { align: 'right' });
    y += 18;
  }

  // Payment method
  const methodLabels: Record<string, string> = {
    pix: 'PIX',
    credito: 'Cartao de Credito',
    boleto: 'Boleto Bancario',
    dinheiro: 'Dinheiro',
    debito: 'Cartao de Debito',
  };

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  setColor(doc, DEEP_BLUE);
  const methodText = methodLabels[data.payment.method] || data.payment.method;
  doc.text(s(`Forma: ${methodText}`), m, y);
  if (data.payment.installments > 1) {
    doc.setFont('helvetica', 'normal');
    doc.text(s(`  |  ${data.payment.installments}x`), m + doc.getTextWidth(s(`Forma: ${methodText}`)) + 2, y);
  }
  y += 7;

  // Receivables / installments
  if (data.payment.receivables.length > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    setColor(doc, TEXT_MUTED);

    data.payment.receivables.forEach((r) => {
      y = checkPageBreak(doc, y, 6, m);
      const dueLabel = r.dueDate ? formatDateBR(r.dueDate) : '-';
      doc.text(`Parcela ${r.number}`, m + 4, y);
      doc.text(fmt(r.amount), m + 45, y);
      doc.text(`Venc: ${dueLabel}`, m + 85, y);
      y += 5;
    });
  }

  y += 4;

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

// ─── Draw Flight Direction Group ────────────────────────────
function drawFlightDirection(
  doc: jsPDF, label: string, legs: FlightLegVoucher[], y: number, m: number, pw: number, cw: number
): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  setColor(doc, GOLD);
  doc.text(label, m, y);
  y += 6;

  if (legs[0]?.departureDate) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    setColor(doc, TEXT_MUTED);
    doc.text(formatDateBR(legs[0].departureDate), m, y);
    y += 6;
  }

  legs.forEach((leg, idx) => {
    y = checkPageBreak(doc, y, 25, m);

    const originX = m + 5;
    const destX = m + cw - 5;
    const midX = pw / 2;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    setColor(doc, DEEP_BLUE);
    doc.text(leg.origin || '---', originX, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    setColor(doc, TEXT_MAIN);
    if (leg.departureTime) doc.text(leg.departureTime, originX, y + 5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    setColor(doc, DEEP_BLUE);
    doc.text(leg.destination || '---', destX, y, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    setColor(doc, TEXT_MAIN);
    if (leg.arrivalTime) doc.text(leg.arrivalTime, destX, y + 5, { align: 'right' });

    // Dashed line
    const lineY = y - 3;
    const lineStart = originX + 22;
    const lineEnd = destX - 22;
    doc.setDrawColor(GOLD[0], GOLD[1], GOLD[2]);
    doc.setLineWidth(0.3);
    let dx = lineStart;
    while (dx < lineEnd - 5) {
      doc.line(dx, lineY, Math.min(dx + 3, lineEnd - 5), lineY);
      dx += 5;
    }
    // Arrow
    doc.setFillColor(GOLD[0], GOLD[1], GOLD[2]);
    doc.triangle(lineEnd - 3, lineY - 1.5, lineEnd - 3, lineY + 1.5, lineEnd, lineY, 'F');

    if (leg.flightCode) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      setColor(doc, TEXT_MUTED);
      doc.text(leg.flightCode, midX, lineY - 3, { align: 'center' });
    }

    y += 11;

    if (idx < legs.length - 1 && leg.connectionDuration) {
      doc.setFillColor(LIGHT_GRAY[0], LIGHT_GRAY[1], LIGHT_GRAY[2]);
      doc.rect(midX - 20, y - 2, 40, 7, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      setColor(doc, TEXT_MUTED);
      doc.text(`Conexao: ${leg.connectionDuration}`, midX, y + 2, { align: 'center' });
      y += 10;
    }
  });

  return y;
}
