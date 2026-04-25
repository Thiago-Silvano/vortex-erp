import jsPDF from 'jspdf';
import type { PremiumPdfData, FlightLegPdf } from './generatePremiumQuotePdf';

// ─── BLACK LUXO Theme ──────────────────────────────────────
// Customizable theme tokens
export interface BlackLuxoTheme {
  bg: readonly [number, number, number];        // page background
  surface: readonly [number, number, number];   // card surface
  border: readonly [number, number, number];    // gold border subtle
  gold: readonly [number, number, number];      // primary accent
  goldSoft: readonly [number, number, number];
  white: readonly [number, number, number];
  textMain: readonly [number, number, number];
  textMuted: readonly [number, number, number];
  textDim: readonly [number, number, number];
  fontFamily: 'helvetica' | 'times' | 'courier';
  agencyName: string;
  tagline: string;
  includedItems: string[];
}

export const DEFAULT_BLACK_LUXO_THEME: BlackLuxoTheme = {
  bg: [11, 11, 11],
  surface: [22, 22, 22],
  border: [201, 169, 110],
  gold: [201, 169, 110],
  goldSoft: [180, 150, 95],
  white: [255, 255, 255],
  textMain: [234, 234, 234],
  textMuted: [187, 187, 187],
  textDim: [136, 136, 136],
  fontFamily: 'helvetica',
  agencyName: 'VORTEX VIAGENS',
  tagline: 'sua experiência exclusiva começa aqui.',
  includedItems: ['Passagens aéreas', 'Bagagem inclusa', 'Taxas e impostos', 'Suporte premium 24/7'],
};

// ─── Helpers ───────────────────────────────────────────────
const sanitize = (text: string = ''): string =>
  String(text)
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2026]/g, '...')
    .replace(/[\u25B8\u25BA\u2192]/g, '>')
    .replace(/[\u{1F300}-\u{1FFFF}]/gu, '')
    .replace(/[^\x00-\xFF]/g, '');

const fmtBRL = (v: number) =>
  (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatDateBR = (d?: string) => {
  if (!d) return '';
  const parts = d.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return d;
};

const formatDateLong = (d?: string) => {
  if (!d) return '';
  const months = ['Janeiro','Fevereiro','Marco','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const parts = d.split('-');
  if (parts.length === 3) return `${parseInt(parts[2])} de ${months[parseInt(parts[1]) - 1]} de ${parts[0]}`;
  return d;
};

function setText(doc: jsPDF, color: readonly [number, number, number]) {
  doc.setTextColor(color[0], color[1], color[2]);
}
function setFill(doc: jsPDF, color: readonly [number, number, number]) {
  doc.setFillColor(color[0], color[1], color[2]);
}
function setStroke(doc: jsPDF, color: readonly [number, number, number]) {
  doc.setDrawColor(color[0], color[1], color[2]);
}

function safeText(doc: jsPDF, text: string | string[], x: number, y: number, options?: any) {
  if (Array.isArray(text)) doc.text(text.map(sanitize), x, y, options);
  else doc.text(sanitize(text), x, y, options);
}

// Paint full dark background on every new page
function paintDarkBg(doc: jsPDF, theme: BlackLuxoTheme) {
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  setFill(doc, theme.bg);
  doc.rect(0, 0, pw, ph, 'F');
  // top gold line
  setFill(doc, theme.gold);
  doc.rect(0, 0, pw, 1.2, 'F');
  // bottom gold line
  doc.rect(0, ph - 1.2, pw, 1.2, 'F');
}

function newDarkPage(doc: jsPDF, theme: BlackLuxoTheme) {
  doc.addPage();
  paintDarkBg(doc, theme);
}

function ensureSpace(doc: jsPDF, y: number, needed: number, theme: BlackLuxoTheme, marginTop = 25): number {
  const ph = doc.internal.pageSize.getHeight();
  if (y + needed > ph - 18) {
    newDarkPage(doc, theme);
    return marginTop;
  }
  return y;
}

// Rounded card with subtle gold border on dark background
function drawCard(doc: jsPDF, x: number, y: number, w: number, h: number, theme: BlackLuxoTheme) {
  setFill(doc, theme.surface);
  doc.roundedRect(x, y, w, h, 4, 4, 'F');
  setStroke(doc, theme.border);
  doc.setLineWidth(0.25);
  doc.roundedRect(x, y, w, h, 4, 4, 'S');
}

// Section title (gold)
function sectionTitle(doc: jsPDF, label: string, x: number, y: number, theme: BlackLuxoTheme) {
  doc.setFont(theme.fontFamily, 'bold');
  doc.setFontSize(15);
  setText(doc, theme.gold);
  safeText(doc, label, x, y);
  // underline
  setStroke(doc, theme.gold);
  doc.setLineWidth(0.4);
  const w = doc.getTextWidth(sanitize(label));
  doc.line(x, y + 1.5, x + w, y + 1.5);
}

// Header brand (small, top of every interior page)
function brandHeader(doc: jsPDF, theme: BlackLuxoTheme, logoBase64?: string) {
  const pw = doc.internal.pageSize.getWidth();
  if (logoBase64) {
    try { doc.addImage(logoBase64, 'PNG', 20, 8, 22, 10); } catch { /* */ }
  }
  doc.setFont(theme.fontFamily, 'bold');
  doc.setFontSize(8);
  setText(doc, theme.gold);
  safeText(doc, theme.agencyName, pw - 20, 13, { align: 'right' });
}

// Footer (every page)
function pageFooter(doc: jsPDF, theme: BlackLuxoTheme, agency: PremiumPdfData['agency']) {
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  doc.setFont(theme.fontFamily, 'normal');
  doc.setFontSize(7.5);
  setText(doc, theme.textDim);
  const parts = [agency.website, agency.email, agency.whatsapp].filter(Boolean).join('  •  ');
  safeText(doc, parts || theme.agencyName, pw / 2, ph - 6, { align: 'center' });
}

// ─── Group flight legs into IDA / VOLTA ─────────────────────
function splitFlights(legs: FlightLegPdf[]) {
  const ida = legs.filter((l) => (l.direction ?? 'ida') === 'ida');
  const volta = legs.filter((l) => l.direction === 'volta');
  return { ida, volta };
}

// ─── Main generator ────────────────────────────────────────
export function generateBlackLuxoPdf(
  data: PremiumPdfData,
  themeOverride?: Partial<BlackLuxoTheme>,
): jsPDF {
  const theme: BlackLuxoTheme = { ...DEFAULT_BLACK_LUXO_THEME, ...(themeOverride || {}) };
  // If agency name is provided in data and override didn't, prefer agency.name
  if (!themeOverride?.agencyName && data.agency?.name) {
    theme.agencyName = data.agency.name.toUpperCase();
  }

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const m = 20;
  const cw = pw - m * 2;

  // ═══════════════════════════════════════════════════════════
  // PAGE 1 — COVER (Black Luxo)
  // ═══════════════════════════════════════════════════════════
  paintDarkBg(doc, theme);

  // Optional destination image (top half, dimmed)
  if (data.destinationImageBase64) {
    try {
      doc.addImage(data.destinationImageBase64, 'JPEG', 0, 0, pw, ph * 0.55);
      // Dark overlay for legibility
      setFill(doc, theme.bg);
      // Manual translucency: paint a near-opaque overlay
      doc.setGState(new (doc as any).GState({ opacity: 0.55 }));
      doc.rect(0, 0, pw, ph * 0.55, 'F');
      doc.setGState(new (doc as any).GState({ opacity: 1 }));
    } catch { /* skip */ }
  }

  // Logo or brand
  if (data.agency.logoBase64) {
    try { doc.addImage(data.agency.logoBase64, 'PNG', m, 18, 38, 17); } catch { /* */ }
  } else {
    doc.setFont(theme.fontFamily, 'bold');
    doc.setFontSize(11);
    setText(doc, theme.gold);
    doc.setCharSpace(2);
    safeText(doc, theme.agencyName, m, 26);
    doc.setCharSpace(0);
  }

  // Right-side meta
  doc.setFont(theme.fontFamily, 'normal');
  doc.setFontSize(8);
  setText(doc, theme.textDim);
  safeText(doc, 'PROPOSTA EXCLUSIVA', pw - m, 23, { align: 'right' });
  doc.setFontSize(7);
  safeText(doc, `Emitido em ${new Date().toLocaleDateString('pt-BR')}`, pw - m, 28, { align: 'right' });

  // Destination — huge headline
  let yCover = ph * 0.45;
  doc.setFont(theme.fontFamily, 'bold');
  doc.setFontSize(40);
  setText(doc, theme.white);
  const dest = (data.destination || 'Sua próxima viagem').toUpperCase();
  // wrap if too long
  const destLines = doc.splitTextToSize(sanitize(dest), cw);
  destLines.slice(0, 2).forEach((line: string, i: number) => {
    safeText(doc, line, m, yCover + i * 14);
  });
  yCover += destLines.length * 14;

  // Period
  doc.setFont(theme.fontFamily, 'normal');
  doc.setFontSize(11);
  setText(doc, theme.gold);
  const period = [data.departureDate, data.returnDate].filter(Boolean).map(formatDateLong).join('   >   ');
  if (period) {
    yCover += 4;
    safeText(doc, period, m, yCover);
  }
  if (data.nights) {
    yCover += 6;
    setText(doc, theme.textMuted);
    doc.setFontSize(9);
    safeText(doc, `${data.nights} noite${data.nights > 1 ? 's' : ''}  •  ${data.passengersCount || 1} passageiro${(data.passengersCount || 1) > 1 ? 's' : ''}`, m, yCover);
  }

  // Client greeting
  yCover += 14;
  doc.setFont(theme.fontFamily, 'normal');
  doc.setFontSize(13);
  setText(doc, theme.white);
  safeText(doc, `${data.client.name},`, m, yCover);
  yCover += 6;
  setText(doc, theme.textMuted);
  doc.setFontSize(10);
  safeText(doc, theme.tagline, m, yCover);

  // Price card (cover, prominent)
  const cardY = ph - 70;
  drawCard(doc, m, cardY, cw, 42, theme);
  // gold left bar
  setFill(doc, theme.gold);
  doc.rect(m, cardY, 1.5, 42, 'F');

  doc.setFont(theme.fontFamily, 'normal');
  doc.setFontSize(8.5);
  setText(doc, theme.textDim);
  safeText(doc, 'INVESTIMENTO TOTAL', m + 8, cardY + 9);

  doc.setFont(theme.fontFamily, 'bold');
  doc.setFontSize(28);
  setText(doc, theme.gold);
  safeText(doc, fmtBRL(data.totalTrip), m + 8, cardY + 23);

  // payment summary (first enabled option, or installments)
  doc.setFont(theme.fontFamily, 'normal');
  doc.setFontSize(9);
  setText(doc, theme.textMuted);
  let payText = '';
  const firstOpt = (data.proposalPaymentOptions || []).find((o) => o.enabled);
  if (firstOpt) {
    const v = firstOpt.fixedValue ?? data.totalTrip;
    if (firstOpt.installments > 1) {
      payText = `${firstOpt.label}: ${firstOpt.installments}x de ${fmtBRL(v / firstOpt.installments)}`;
    } else {
      payText = `${firstOpt.label}: ${fmtBRL(v)}`;
    }
  } else if (data.payment?.installments && data.payment.installments > 1) {
    payText = `Em até ${data.payment.installments}x de ${fmtBRL(data.totalTrip / data.payment.installments)}`;
  } else {
    payText = 'Pagamento à vista';
  }
  safeText(doc, payText, m + 8, cardY + 33);

  pageFooter(doc, theme, data.agency);

  // ═══════════════════════════════════════════════════════════
  // PAGE 2 — FLIGHTS (if any)
  // ═══════════════════════════════════════════════════════════
  if (data.flightLegs && data.flightLegs.length > 0) {
    newDarkPage(doc, theme);
    brandHeader(doc, theme, data.agency.logoBase64);

    let y = 32;
    sectionTitle(doc, 'Itinerário Aéreo', m, y, theme);
    y += 12;

    const { ida, volta } = splitFlights(data.flightLegs);

    const drawFlightGroup = (title: string, legs: FlightLegPdf[], yStart: number): number => {
      let yy = yStart;
      doc.setFont(theme.fontFamily, 'bold');
      doc.setFontSize(11);
      setText(doc, theme.gold);
      safeText(doc, title, m, yy);
      yy += 7;

      legs.forEach((leg) => {
        yy = ensureSpace(doc, yy, 28, theme, 32);
        const cardH = 24;
        drawCard(doc, m, yy, cw, cardH, theme);
        // gold left accent
        setFill(doc, theme.gold);
        doc.rect(m, yy, 1.2, cardH, 'F');

        // route
        doc.setFont(theme.fontFamily, 'bold');
        doc.setFontSize(13);
        setText(doc, theme.white);
        safeText(doc, `${leg.origin || ''}  >  ${leg.destination || ''}`, m + 6, yy + 9);

        // times
        doc.setFont(theme.fontFamily, 'normal');
        doc.setFontSize(9);
        setText(doc, theme.textMuted);
        const timeLine = [
          leg.departureTime ? `Saída ${leg.departureTime}` : '',
          leg.arrivalTime ? `Chegada ${leg.arrivalTime}` : '',
          leg.flightCode ? `Voo ${leg.flightCode}` : '',
        ].filter(Boolean).join('   •   ');
        if (timeLine) safeText(doc, timeLine, m + 6, yy + 16);

        // date right-aligned
        doc.setFontSize(8.5);
        setText(doc, theme.gold);
        safeText(doc, formatDateBR(leg.departureDate) || '', m + cw - 4, yy + 9, { align: 'right' });

        // connection
        if (leg.connectionDuration) {
          doc.setFontSize(7.5);
          setText(doc, theme.textDim);
          safeText(doc, `Conexão: ${leg.connectionDuration}`, m + 6, yy + 21);
        }
        yy += cardH + 4;
      });
      return yy;
    };

    if (ida.length) y = drawFlightGroup('IDA', ida, y) + 4;
    if (volta.length) y = drawFlightGroup('VOLTA', volta, y);

    pageFooter(doc, theme, data.agency);
  }

  // ═══════════════════════════════════════════════════════════
  // PAGE 3 — HOTELS (if any)
  // ═══════════════════════════════════════════════════════════
  if (data.hotels && data.hotels.length > 0) {
    newDarkPage(doc, theme);
    brandHeader(doc, theme, data.agency.logoBase64);
    let y = 32;
    sectionTitle(doc, 'Hospedagem', m, y, theme);
    y += 12;

    data.hotels.forEach((h) => {
      y = ensureSpace(doc, y, 32, theme, 32);
      const cardH = 28;
      drawCard(doc, m, y, cw, cardH, theme);
      setFill(doc, theme.gold);
      doc.rect(m, y, 1.2, cardH, 'F');

      doc.setFont(theme.fontFamily, 'bold');
      doc.setFontSize(12);
      setText(doc, theme.white);
      safeText(doc, h.name || 'Hotel', m + 6, y + 9);

      doc.setFont(theme.fontFamily, 'normal');
      doc.setFontSize(9);
      setText(doc, theme.textMuted);
      const dates = `${formatDateBR(h.checkIn)}  >  ${formatDateBR(h.checkOut)}  •  ${h.nights || 0} noite(s)`;
      safeText(doc, dates, m + 6, y + 16);
      if (h.room || h.meal) {
        setText(doc, theme.textDim);
        doc.setFontSize(8.5);
        safeText(doc, [h.room, h.meal].filter(Boolean).join('  •  '), m + 6, y + 22);
      }
      y += cardH + 4;
    });
    pageFooter(doc, theme, data.agency);
  }

  // ═══════════════════════════════════════════════════════════
  // PAGE — INCLUDED + INVESTMENT
  // ═══════════════════════════════════════════════════════════
  newDarkPage(doc, theme);
  brandHeader(doc, theme, data.agency.logoBase64);
  let y = 32;
  sectionTitle(doc, 'O que está incluso', m, y, theme);
  y += 12;

  // 2-column grid
  const colW = (cw - 6) / 2;
  const itemH = 14;
  theme.includedItems.forEach((it, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = m + col * (colW + 6);
    const yy = y + row * (itemH + 4);
    drawCard(doc, x, yy, colW, itemH, theme);
    setFill(doc, theme.gold);
    doc.circle(x + 5, yy + itemH / 2, 1.2, 'F');
    doc.setFont(theme.fontFamily, 'normal');
    doc.setFontSize(10);
    setText(doc, theme.textMain);
    safeText(doc, it, x + 9, yy + itemH / 2 + 1.5);
  });
  y += Math.ceil(theme.includedItems.length / 2) * (itemH + 4) + 8;

  // Optional individual items list
  if (data.showIndividualValues && data.allItems?.length) {
    y = ensureSpace(doc, y, 30, theme, 32);
    sectionTitle(doc, 'Detalhamento', m, y, theme);
    y += 10;
    data.allItems.forEach((it) => {
      y = ensureSpace(doc, y, 8, theme, 32);
      doc.setFont(theme.fontFamily, 'normal');
      doc.setFontSize(9.5);
      setText(doc, theme.textMain);
      safeText(doc, it.name, m + 2, y);
      setText(doc, theme.gold);
      safeText(doc, fmtBRL(it.value), m + cw - 2, y, { align: 'right' });
      y += 4;
      setStroke(doc, [55, 55, 55]);
      doc.setLineWidth(0.1);
      doc.line(m + 2, y, m + cw - 2, y);
      y += 3;
    });
    y += 4;
  }

  // Investment card (repeat highlight)
  y = ensureSpace(doc, y, 50, theme, 32);
  drawCard(doc, m, y, cw, 42, theme);
  setFill(doc, theme.gold);
  doc.rect(m, y, 1.5, 42, 'F');
  doc.setFont(theme.fontFamily, 'normal');
  doc.setFontSize(8.5);
  setText(doc, theme.textDim);
  safeText(doc, 'INVESTIMENTO TOTAL', m + 8, y + 9);
  doc.setFont(theme.fontFamily, 'bold');
  doc.setFontSize(26);
  setText(doc, theme.gold);
  safeText(doc, fmtBRL(data.totalTrip), m + 8, y + 23);

  // List enabled payment options
  doc.setFont(theme.fontFamily, 'normal');
  doc.setFontSize(8.5);
  setText(doc, theme.textMuted);
  let py = y + 31;
  const opts = (data.proposalPaymentOptions || []).filter((o) => o.enabled).slice(0, 3);
  if (opts.length) {
    opts.forEach((o, i) => {
      const v = o.fixedValue ?? data.totalTrip;
      const line = o.installments > 1
        ? `${o.label}: ${o.installments}x de ${fmtBRL(v / o.installments)}`
        : `${o.label}: ${fmtBRL(v)}`;
      safeText(doc, line, m + 8 + (i % 2) * (cw / 2 - 4), py + Math.floor(i / 2) * 4);
    });
  } else if (data.payment?.installments > 1) {
    safeText(doc, `Em até ${data.payment.installments}x de ${fmtBRL(data.totalTrip / data.payment.installments)}`, m + 8, py);
  }
  pageFooter(doc, theme, data.agency);

  // ═══════════════════════════════════════════════════════════
  // PAGE — NOTES (if any)
  // ═══════════════════════════════════════════════════════════
  if (data.notes && data.notes.trim()) {
    newDarkPage(doc, theme);
    brandHeader(doc, theme, data.agency.logoBase64);
    let yn = 32;
    sectionTitle(doc, 'Informações importantes', m, yn, theme);
    yn += 12;
    doc.setFont(theme.fontFamily, 'normal');
    doc.setFontSize(10);
    setText(doc, theme.textMuted);
    const lines = doc.splitTextToSize(sanitize(data.notes), cw);
    lines.forEach((ln: string) => {
      yn = ensureSpace(doc, yn, 6, theme, 32);
      safeText(doc, ln, m, yn);
      yn += 5.5;
    });
    pageFooter(doc, theme, data.agency);
  }

  // ═══════════════════════════════════════════════════════════
  // FINAL — THANK YOU PAGE
  // ═══════════════════════════════════════════════════════════
  newDarkPage(doc, theme);
  brandHeader(doc, theme, data.agency.logoBase64);
  doc.setFont(theme.fontFamily, 'bold');
  doc.setFontSize(28);
  setText(doc, theme.gold);
  safeText(doc, 'Obrigado.', pw / 2, ph / 2 - 6, { align: 'center' });
  doc.setFont(theme.fontFamily, 'normal');
  doc.setFontSize(11);
  setText(doc, theme.textMuted);
  safeText(doc, 'Estamos prontos para tornar essa viagem realidade.', pw / 2, ph / 2 + 4, { align: 'center' });
  if (data.agency.whatsapp) {
    doc.setFontSize(10);
    setText(doc, theme.gold);
    safeText(doc, `WhatsApp: ${data.agency.whatsapp}`, pw / 2, ph / 2 + 16, { align: 'center' });
  }
  pageFooter(doc, theme, data.agency);

  return doc;
}

// Convenience wrapper requested by spec: generateTravelPDF(cotacao)
export async function generateTravelPDF(
  data: PremiumPdfData,
  themeOverride?: Partial<BlackLuxoTheme>,
): Promise<jsPDF> {
  return generateBlackLuxoPdf(data, themeOverride);
}
