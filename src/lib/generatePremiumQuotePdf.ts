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
export interface FlightLegPdf {
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
  installmentValue: number;
  totalValue: number;
  enabled: boolean;
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
  notes?: string;
  destinationImageBase64?: string;
  quoteOptions?: QuoteOptionPdf[];
}

// ─── Helpers ────────────────────────────────────────────────
// Sanitize text for jsPDF (remove characters outside Latin-1 / WinAnsiEncoding)
const sanitize = (text: string): string =>
  text
    .replace(/[\u2013\u2014]/g, '-')   // en/em dash
    .replace(/[\u2018\u2019]/g, "'")   // smart quotes
    .replace(/[\u201C\u201D]/g, '"')   // smart double quotes
    .replace(/[\u2026]/g, '...')       // ellipsis
    .replace(/[\u25B8\u25BA]/g, '-')   // triangles
    .replace(/[\u{1F300}-\u{1FFFF}]/gu, '') // all emoji
    .replace(/[^\x00-\xFF]/g, '');     // anything outside Latin-1

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
  const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const parts = d.split('-');
  if (parts.length === 3) return `${parseInt(parts[2])} de ${months[parseInt(parts[1]) - 1]} de ${parts[0]}`;
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

// Wrap doc.text to auto-sanitize all strings
function safeText(doc: jsPDF, text: string | string[], x: number, y: number, options?: any) {
  if (Array.isArray(text)) {
    doc.text(text.map(t => sanitize(t)), x, y, options);
  } else {
    doc.text(sanitize(text), x, y, options);
  }
}

// ─── Main Generator ─────────────────────────────────────────
export function generatePremiumQuotePdf(data: PremiumPdfData) {
  // Sanitize all string data upfront to avoid encoding issues
  const s = sanitize;
  
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth(); // 210
  const ph = doc.internal.pageSize.getHeight(); // 297
  const m = 20; // margin
  const cw = pw - m * 2; // content width

  // ═══════════════════════════════════════════════════════════
  // PAGE 1: COVER
  // ═══════════════════════════════════════════════════════════

  // Subtle background
  doc.setFillColor(LIGHT_GRAY[0], LIGHT_GRAY[1], LIGHT_GRAY[2]);
  doc.rect(0, 0, pw, ph, 'F');

  // Top gold accent line
  doc.setFillColor(GOLD[0], GOLD[1], GOLD[2]);
  doc.rect(0, 0, pw, 3, 'F');

  // Logo area - centered, no agency name text
  let logoY = 35;
  if (data.agency.logoBase64) {
    try {
      doc.addImage(data.agency.logoBase64, 'PNG', pw / 2 - 25, 12, 50, 25);
      logoY = 42;
    } catch { /* fallback */ }
  }

  // Contact info (top right)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  setColor(doc, TEXT_MUTED);
  if (data.agency.whatsapp) doc.text(s(data.agency.whatsapp), pw - m, 28, { align: 'right' });
  if (data.agency.email) doc.text(data.agency.email, pw - m, 33, { align: 'right' });

  // Divider after header
  drawLine(doc, m, logoY + 5, pw - m, GOLD, 0.5);

  // Main title area - centered
  const titleY = 100;

  doc.setFont('times', 'normal');
  doc.setFontSize(13);
  setColor(doc, GOLD);
  doc.text('PROPOSTA DE VIAGEM', pw / 2, titleY, { align: 'center' });

  // Destination
  if (data.destination) {
    doc.setFont('times', 'bold');
    doc.setFontSize(36);
    setColor(doc, DEEP_BLUE);
    const destLines = doc.splitTextToSize(s(data.destination), cw);
    doc.text(destLines, pw / 2, titleY + 18, { align: 'center' });
  }

  // Dates
  let coverY = titleY + (data.destination ? 35 : 18);
  if (data.departureDate && data.returnDate) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    setColor(doc, TEXT_MUTED);
    const dateStr = `${formatDateLong(data.departureDate)}  -  ${formatDateLong(data.returnDate)}`;
    doc.text(dateStr, pw / 2, coverY, { align: 'center' });
    coverY += 10;
  }

  // Gold divider
  doc.setFillColor(GOLD[0], GOLD[1], GOLD[2]);
  doc.rect(pw / 2 - 20, coverY, 40, 0.5, 'F');
  coverY += 15;

  // Client name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  setColor(doc, DEEP_BLUE);
  doc.text(s(data.client.name), pw / 2, coverY, { align: 'center' });
  coverY += 7;

  if (data.passengersCount && data.passengersCount > 1) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    setColor(doc, TEXT_MUTED);
    doc.text(`${data.passengersCount} passageiros`, pw / 2, coverY, { align: 'center' });
  }

  // Seller
  if (data.seller) {
    coverY += 12;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    setColor(doc, TEXT_MUTED);
    doc.text(s(`Consultor: ${data.seller}`), pw / 2, coverY, { align: 'center' });
  }

  // Bottom accent
  doc.setFillColor(DEEP_BLUE[0], DEEP_BLUE[1], DEEP_BLUE[2]);
  doc.rect(0, ph - 15, pw, 15, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  setColor(doc, WHITE);
  const footerContact = [data.agency.whatsapp, data.agency.email, data.agency.website].filter(Boolean).join('  ·  ');
  doc.text(footerContact, pw / 2, ph - 7, { align: 'center' });

  // ═══════════════════════════════════════════════════════════
  // PAGE 2+: CONTENT
  // ═══════════════════════════════════════════════════════════
  doc.addPage();
  let y = m;

  // White background for content pages
  doc.setFillColor(WHITE[0], WHITE[1], WHITE[2]);
  doc.rect(0, 0, pw, ph, 'F');

  // ─── Section: Resumo da Viagem ──────────────────────────
  y = drawSectionTitle(doc, 'Resumo da viagem', y, m, pw);
  y += 2;

  const summaryItems: Array<{ label: string; value: string; icon: string }> = [];
  if (data.destination) summaryItems.push({ label: 'Destino', value: data.destination, icon: '' });
  if (data.departureDate && data.returnDate)
    summaryItems.push({ label: 'Periodo', value: `${formatDateBR(data.departureDate)} - ${formatDateBR(data.returnDate)}`, icon: '' });
  if (data.nights) summaryItems.push({ label: 'Duracao', value: `${data.nights} noites`, icon: '' });
  if (data.passengersCount) summaryItems.push({ label: 'Passageiros', value: `${data.passengersCount} ${data.passengersCount > 1 ? 'adultos' : 'adulto'}`, icon: '' });

  // Draw summary cards in a grid
  if (summaryItems.length > 0) {
    const cardW = (cw - 6) / 2;
    const cardH = 18;
    summaryItems.forEach((item, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const cx = m + col * (cardW + 6);
      const cy = y + row * (cardH + 4);

      // Card background
      doc.setFillColor(LIGHT_GRAY[0], LIGHT_GRAY[1], LIGHT_GRAY[2]);
      doc.rect(cx, cy, cardW, cardH, 'F');

      // Label
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      setColor(doc, TEXT_MUTED);
      doc.text(item.label, cx + 5, cy + 7);

      // Value
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      setColor(doc, DEEP_BLUE);
      doc.text(item.value, cx + 5, cy + 13);
    });
    y += Math.ceil(summaryItems.length / 2) * (cardH + 4) + 6;
  }

  // ─── Section: Hospedagem ─────────────────────────────────
  if (data.hotels.length > 0) {
    y = checkPageBreak(doc, y, 50, m);
    y = drawSectionTitle(doc, 'Hospedagem', y, m, pw);
    y += 2;

    data.hotels.forEach((hotel) => {
      y = checkPageBreak(doc, y, 40, m);

      // Hotel icon
      doc.setFontSize(10);
      setColor(doc, GOLD);
      doc.text('', m, y + 5);

      // Hotel name
      doc.setFont('times', 'bold');
      doc.setFontSize(14);
      setColor(doc, DEEP_BLUE);
      doc.text(s(hotel.name), m + 8, y + 5);
      y += 9;

      if (hotel.room) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        setColor(doc, TEXT_MAIN);
        doc.text(s(hotel.room), m + 8, y);
        y += 5;
      }

      // Details grid
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      setColor(doc, TEXT_MUTED);

      const details: string[] = [];
      details.push(`${formatDateBR(hotel.checkIn)} - ${formatDateBR(hotel.checkOut)}`);
      details.push(`${hotel.nights} noites`);
      if (hotel.meal) details.push(hotel.meal);
      doc.text(details.join('  ·  '), m + 8, y);
      y += 5;

      if (hotel.address) {
        doc.setFontSize(8);
        doc.text(hotel.address, m + 8, y);
        y += 5;
      }

      if (hotel.description) {
        doc.setFontSize(8);
        setColor(doc, TEXT_MUTED);
        const descLines = doc.splitTextToSize(s(hotel.description), cw - 12);
        doc.text(descLines, m + 8, y);
        y += descLines.length * 3.5 + 2;
      }

      drawLine(doc, m, y + 2, pw - m);
      y += 6;
    });
  }

  // ─── Section: Itinerário Aéreo ───────────────────────────
  const flightGroups = data.flightGroups && data.flightGroups.length > 0
    ? data.flightGroups
    : data.flightLegs.length > 0 ? [data.flightLegs] : [];

  if (flightGroups.length > 0) {
    y = checkPageBreak(doc, y, 60, m);
    y = drawSectionTitle(doc, 'Itinerário aéreo', y, m, pw);
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

  // ─── Section: Experiências e Serviços (hide when showIndividualValues is true) ────────────────────
  if (data.services.length > 0 && data.showIndividualValues !== true) {
    y = checkPageBreak(doc, y, 30, m);
    y = drawSectionTitle(doc, 'Experiências e serviços', y, m, pw);
    y += 4;

    data.services.forEach((svc) => {
      y = checkPageBreak(doc, y, 16, m);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      setColor(doc, DEEP_BLUE);
      doc.text(s(`-  ${svc.name}`), m, y);

      if (svc.value > 0) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        setColor(doc, TEXT_MAIN);
        doc.text(fmt(svc.value), pw - m, y, { align: 'right' });
      }
      y += 5;

      if (svc.description) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        setColor(doc, TEXT_MUTED);
        const descLines = doc.splitTextToSize(s(svc.description), cw - 10);
        const maxLines = Math.min(descLines.length, 6);
        doc.text(descLines.slice(0, maxLines), m + 5, y);
        y += maxLines * 3.5 + 2;
      }
      y += 2;
    });

    drawLine(doc, m, y, pw - m);
    y += 6;
  }

  // ─── Section: Resumo Financeiro ──────────────────────────
  y = checkPageBreak(doc, y, 50, m);
  y = drawSectionTitle(doc, 'Resumo financeiro', y, m, pw);
  y += 4;

  // Financial box
  const boxX = m;
  const boxW = cw;
  let boxY = y;

  // Items list - when showIndividualValues, show service name instead of generic type
  if (data.allItems.length > 0) {
    data.allItems.forEach((item) => {
      boxY = checkPageBreak(doc, boxY, 14, m);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      setColor(doc, TEXT_MAIN);
      doc.text(s(item.name), boxX + 4, boxY);
      doc.text(fmt(item.value), boxX + boxW - 4, boxY, { align: 'right' });
      boxY += 6;

      // Show description for each item in resumo financeiro
      if ((item as any).description) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        setColor(doc, TEXT_MUTED);
        const descLines = doc.splitTextToSize(s((item as any).description), boxW - 12);
        const maxLines = Math.min(descLines.length, 3);
        doc.text(descLines.slice(0, maxLines), boxX + 6, boxY);
        boxY += maxLines * 3 + 2;
      }
    });
  }

  // Subtotals - hide when showIndividualValues is true
  if (data.totalProducts > 0 && data.allItems.length > 1 && data.showIndividualValues !== true) {
    drawLine(doc, boxX, boxY, boxX + boxW, BORDER_COLOR, 0.2);
    boxY += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    setColor(doc, TEXT_MUTED);
    doc.text('Subtotal', boxX + 4, boxY);
    doc.text(fmt(data.totalProducts), boxX + boxW - 4, boxY, { align: 'right' });
    boxY += 6;
  }

  if (data.totalTaxes > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    setColor(doc, TEXT_MUTED);
    doc.text('Taxas', boxX + 4, boxY);
    doc.text(fmt(data.totalTaxes), boxX + boxW - 4, boxY, { align: 'right' });
    boxY += 6;
  }

  // ── Per-person installment hero (before total) ──
  const paxCount = data.passengersCount || 1;
  const installmentAmount = data.payment.receivables.length > 0
    ? data.payment.receivables[0].amount
    : data.totalTrip / Math.max(data.payment.installments, 1);
  const perPersonInstallment = installmentAmount / paxCount;

  if (data.payment.installments > 1) {
    boxY += 4;
    // Dark box for installment hero
    doc.setFillColor(DEEP_BLUE[0], DEEP_BLUE[1], DEEP_BLUE[2]);
    doc.rect(boxX, boxY, boxW, 28, 'F');

    // Gold accent top
    doc.setFillColor(GOLD[0], GOLD[1], GOLD[2]);
    doc.rect(boxX, boxY, boxW, 1, 'F');

    // "Investimento por pessoa"
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(GOLD[0], GOLD[1], GOLD[2]);
    doc.text('INVESTIMENTO POR PESSOA', boxX + boxW / 2, boxY + 6, { align: 'center' });

    // "12x de R$ 450,00"
    const installText = `${data.payment.installments}x de ${fmt(perPersonInstallment)}`;
    doc.setFont('times', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
    doc.text(installText, boxX + boxW / 2, boxY + 17, { align: 'center' });

    // "por pessoa"
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('por pessoa', boxX + boxW / 2, boxY + 23, { align: 'center' });

    boxY += 32;
  }

  // Total highlight - only show if showIndividualValues is not true
  if (data.showIndividualValues !== true) {
    boxY += 2;
    doc.setFillColor(GOLD_LIGHT[0], GOLD_LIGHT[1], GOLD_LIGHT[2]);
    doc.rect(boxX, boxY - 1, boxW, 14, 'F');
    // Gold left accent
    doc.setFillColor(GOLD[0], GOLD[1], GOLD[2]);
    doc.rect(boxX, boxY - 1, 2, 14, 'F');

    doc.setFont('times', 'bold');
    doc.setFontSize(13);
    setColor(doc, DEEP_BLUE);
    doc.text('Total da viagem', boxX + 8, boxY + 8);

    doc.setFont('times', 'bold');
    doc.setFontSize(16);
    setColor(doc, GOLD);
    doc.text(fmt(data.totalTrip), boxX + boxW - 4, boxY + 8, { align: 'right' });

    if (paxCount > 1) {
      boxY += 14;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      setColor(doc, TEXT_MUTED);
      doc.text(`${fmt(data.totalTrip / paxCount)} por pessoa a vista  ·  ${paxCount} passageiros`, boxX + 8, boxY + 2);
      boxY += 4;
    }
  }

  y = boxY + 18;

  // ─── Section: Forma de Pagamento ─────────────────────────
  y = checkPageBreak(doc, y, 40, m);
  y = drawSectionTitle(doc, 'Opcoes de pagamento', y, m, pw);
  y += 6;

  const methodLabels: Record<string, string> = {
    pix: 'PIX',
    credito: 'Cartao de Credito',
    boleto: 'Boleto Bancario',
    dinheiro: 'Dinheiro',
  };

  // Show proposal payment options if available
  if (data.proposalPaymentOptions && data.proposalPaymentOptions.length > 0) {
    const paxCount = data.passengersCount || 1;
    const maxInstallments = Math.max(...data.proposalPaymentOptions.map(o => o.installments));

    data.proposalPaymentOptions.forEach((opt, idx) => {
      y = checkPageBreak(doc, y, 22, m);
      const isHighlighted = opt.installments === maxInstallments;

      // Option box
      const optBoxH = isHighlighted ? 22 : 18;
      if (isHighlighted) {
        doc.setFillColor(DEEP_BLUE[0], DEEP_BLUE[1], DEEP_BLUE[2]);
      } else {
        doc.setFillColor(idx % 2 === 0 ? LIGHT_GRAY[0] : WHITE[0], idx % 2 === 0 ? LIGHT_GRAY[1] : WHITE[1], idx % 2 === 0 ? LIGHT_GRAY[2] : WHITE[2]);
      }
      doc.rect(m, y - 3, cw, optBoxH, 'F');

      // Gold left accent
      doc.setFillColor(GOLD[0], GOLD[1], GOLD[2]);
      doc.rect(m, y - 3, 3, optBoxH, 'F');

      // "Mais popular" tag for highlighted
      if (isHighlighted) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(GOLD[0], GOLD[1], GOLD[2]);
        doc.text('MAIS POPULAR', m + 8, y);
      }

      // Label
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      if (isHighlighted) {
        doc.setTextColor(255, 255, 255);
      } else {
        setColor(doc, DEEP_BLUE);
      }
      doc.text(s(opt.label), m + 8, y + (isHighlighted ? 6 : 3));

      // Installment value
      const installText = opt.installments > 1
        ? `${opt.installments}x de ${fmt(opt.installmentValue)}`
        : fmt(opt.totalValue);
      doc.setFont('times', 'bold');
      doc.setFontSize(isHighlighted ? 15 : 13);
      setColor(doc, GOLD);
      doc.text(installText, m + cw - 4, y + (isHighlighted ? 6 : 3), { align: 'right' });

      // Per person
      if (paxCount > 1) {
        const perPerson = opt.installments > 1
          ? fmt(opt.installmentValue / paxCount)
          : fmt(opt.totalValue / paxCount);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        if (isHighlighted) {
          doc.setTextColor(200, 200, 200);
        } else {
          setColor(doc, TEXT_MUTED);
        }
        doc.text(`${perPerson} /pessoa`, m + cw - 4, y + (isHighlighted ? 13 : 10), { align: 'right' });
      }

      y += optBoxH + 2;
    });
  } else {
    // Fallback: show single payment method
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    setColor(doc, DEEP_BLUE);
    const methodText = methodLabels[data.payment.method] || data.payment.method;
    doc.text(methodText, m, y);

    if (data.payment.installments > 1) {
      doc.setFont('helvetica', 'normal');
      setColor(doc, TEXT_MAIN);
      doc.text(`  ·  ${data.payment.installments}x`, m + doc.getTextWidth(methodText) + 2, y);
    }
    y += 7;

    if (data.payment.receivables.length > 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      setColor(doc, TEXT_MUTED);

      data.payment.receivables.forEach((r) => {
        y = checkPageBreak(doc, y, 6, m);
        const dueLabel = r.dueDate ? formatDateBR(r.dueDate) : '-';
        doc.text(`Parcela ${r.number}`, m + 4, y);
        doc.text(fmt(r.amount), m + 50, y);
        doc.text(`Venc: ${dueLabel}`, m + 90, y);
        y += 5;
      });
    }
  }

  y += 4;

  // ─── Section: Observações ────────────────────────────────
  if (data.notes) {
    y = checkPageBreak(doc, y, 20, m);
    y = drawSectionTitle(doc, 'Observações', y, m, pw);
    y += 4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    setColor(doc, TEXT_MUTED);
    const noteLines = doc.splitTextToSize(s(data.notes), cw);
    noteLines.forEach((line: string) => {
      y = checkPageBreak(doc, y, 5, m);
      doc.text(line, m, y);
      y += 4;
    });
  }

  // ─── Footer on all pages ─────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const pageH = doc.internal.pageSize.getHeight();

    // Gold line
    doc.setFillColor(GOLD[0], GOLD[1], GOLD[2]);
    doc.rect(m, pageH - 18, cw, 0.3, 'F');

    // Footer text
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    setColor(doc, TEXT_MUTED);

    if (i > 1) {
      // Don't repeat on cover
      doc.text(data.agency.name, m, pageH - 12);
      const footerParts = [data.agency.whatsapp, data.agency.email, data.agency.website].filter(Boolean);
      doc.text(footerParts.join('  ·  '), m, pageH - 8);
    }

    doc.text(`Valores sujeitos a disponibilidade e alterações sem aviso prévio.`, pw / 2, pageH - 12, { align: 'center' });
    doc.text(`${i} / ${totalPages}`, pw - m, pageH - 12, { align: 'right' });
  }

  return doc;
}

// ─── Draw Section Title ─────────────────────────────────────
function drawSectionTitle(doc: jsPDF, title: string, y: number, m: number, pw: number): number {
  const cw = pw - m * 2;

  // Gold accent bar
  doc.setFillColor(GOLD[0], GOLD[1], GOLD[2]);
  doc.rect(m, y, 3, 8, 'F');

  doc.setFont('times', 'bold');
  doc.setFontSize(16);
  setColor(doc, DEEP_BLUE);
  doc.text(title, m + 7, y + 6);

  // Thin line after title
  drawLine(doc, m, y + 10, pw - m, BORDER_COLOR, 0.2);

  return y + 14;
}

// ─── Draw Flight Direction Group ────────────────────────────
function drawFlightDirection(
  doc: jsPDF,
  label: string,
  legs: FlightLegPdf[],
  y: number,
  m: number,
  pw: number,
  cw: number
): number {
  // Direction label
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  setColor(doc, GOLD);
  doc.text(label, m, y);
  y += 6;

  // Date of first leg
  if (legs[0]?.departureDate) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    setColor(doc, TEXT_MUTED);
    doc.text(formatDateLong(legs[0].departureDate), m, y);
    y += 6;
  }

  legs.forEach((leg, idx) => {
    y = checkPageBreak(doc, y, 14, m);

    const segW = cw;
    const originX = m + 5;
    const destX = m + segW - 5;
    const midX = pw / 2;

    // Origin code
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    setColor(doc, DEEP_BLUE);
    doc.text(leg.origin || '---', originX, y);

    // Departure time
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    setColor(doc, TEXT_MAIN);
    if (leg.departureTime) doc.text(leg.departureTime, originX, y + 4);

    // Destination code
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    setColor(doc, DEEP_BLUE);
    doc.text(leg.destination || '---', destX, y, { align: 'right' });

    // Arrival time
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    setColor(doc, TEXT_MAIN);
    if (leg.arrivalTime) doc.text(leg.arrivalTime, destX, y + 4, { align: 'right' });

    // Flight line with arrow
    const lineY = y - 1;
    const lineStart = originX + 18;
    const lineEnd = destX - 18;

    doc.setDrawColor(GOLD[0], GOLD[1], GOLD[2]);
    doc.setLineWidth(0.3);
    const dashLen = 3;
    const gapLen = 2;
    let dx = lineStart;
    while (dx < lineEnd - 4) {
      doc.line(dx, lineY, Math.min(dx + dashLen, lineEnd - 4), lineY);
      dx += dashLen + gapLen;
    }

    // Arrow head
    doc.setFillColor(GOLD[0], GOLD[1], GOLD[2]);
    doc.triangle(lineEnd - 2, lineY - 1, lineEnd - 2, lineY + 1, lineEnd, lineY, 'F');

    // Flight code
    if (leg.flightCode) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5);
      setColor(doc, TEXT_MUTED);
      doc.text(leg.flightCode, midX, lineY - 2, { align: 'center' });
    }

    y += 7;

    // Connection info
    if (idx < legs.length - 1 && leg.connectionDuration) {
      doc.setFillColor(LIGHT_GRAY[0], LIGHT_GRAY[1], LIGHT_GRAY[2]);
      doc.rect(midX - 16, y - 2, 32, 5, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5);
      setColor(doc, TEXT_MUTED);
      doc.text(`Conexão: ${leg.connectionDuration}`, midX, y + 1, { align: 'center' });
      y += 6;
    }
  });

  // Total travel duration - calculate from first departure to last arrival
  if (legs.length > 0 && legs[0]?.departureDate && legs[0]?.departureTime && legs[legs.length - 1]?.arrivalDate && legs[legs.length - 1]?.arrivalTime) {
    const dep = new Date(`${legs[0].departureDate}T${legs[0].departureTime}:00`);
    const arr = new Date(`${legs[legs.length - 1].arrivalDate}T${legs[legs.length - 1].arrivalTime}:00`);
    if (!isNaN(dep.getTime()) && !isNaN(arr.getTime()) && arr.getTime() > dep.getTime()) {
      const totalMin = Math.round((arr.getTime() - dep.getTime()) / 60000);
      const h = Math.floor(totalMin / 60);
      const mins = totalMin % 60;
      const durStr = mins > 0 ? `${h}h ${mins}min` : `${h}h`;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      setColor(doc, TEXT_MUTED);
      doc.text(`⏱ Tempo total: ${durStr}`, m, y);
      y += 5;
    }
  }

  return y;
}
