import jsPDF from "jspdf";

// ─── Types (kept for compatibility with NewSalePage) ───────
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

// ─── Helpers ───────────────────────────────────────────────
const sanitize = (text: string = ""): string =>
  String(text)
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2026]/g, "...")
    .replace(/[\u00A0]/g, " ");

const fmtBRL = (v: number) =>
  (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// ─── Main entry ────────────────────────────────────────────
export function generateEditorialPdf(data: PremiumPdfData) {
  const doc = new jsPDF("p", "mm", "a4");
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();

  // 🎨 CORES
  const PRIMARY: [number, number, number] = [31, 58, 95];
  const MUTED: [number, number, number] = [120, 120, 130];
  const LIGHT: [number, number, number] = [245, 239, 227];

  const center = pw / 2;

  // ─────────────────────────
  // 🟦 CAPA
  // ─────────────────────────
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pw, ph, "F");

  // Linha topo
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, pw, 2, "F");

  let y = 30;

  // Logo da agência (se existir)
  if (data.agency?.logoBase64) {
    try {
      doc.addImage(data.agency.logoBase64, "PNG", center - 25, y - 10, 50, 18, undefined, "FAST");
      y += 15;
    } catch {
      /* ignore */
    }
  }

  // Título pequeno
  doc.setFont("helvetica", "italic");
  doc.setFontSize(16);
  doc.setTextColor(...MUTED);
  doc.text("Proposta de", center, y, { align: "center" });
  y += 12;

  // ORÇAMENTO
  doc.setFont("helvetica", "bold");
  doc.setFontSize(52);
  doc.setTextColor(...PRIMARY);
  doc.text("ORÇAMENTO", center, y, { align: "center", charSpace: 4 });
  y += 10;

  // Destino
  if (data.destination) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    doc.text(`VIAGEM PARA ${sanitize(data.destination).toUpperCase()}`, center, y, {
      align: "center",
    });
  }
  y += 15;

  // Imagem
  const imgH = 165;
  if (data.destinationImageBase64) {
    try {
      doc.addImage(data.destinationImageBase64, "JPEG", 20, y, pw - 40, imgH, undefined, "FAST");
    } catch {
      doc.setFillColor(...LIGHT);
      doc.rect(20, y, pw - 40, imgH, "F");
    }
  } else {
    doc.setFillColor(...LIGHT);
    doc.rect(20, y, pw - 40, imgH, "F");
  }
  y += imgH + 10;

  // Faixa inferior
  doc.setFillColor(120, 140, 170);
  doc.rect(20, y, pw - 40, 30, "F");

  doc.setFontSize(13);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(255, 255, 255);
  const dateRange = `${data.departureDate || ""} → ${data.returnDate || ""}`;
  doc.text(sanitize(dateRange), center, y + 12, { align: "center" });

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(sanitize(data.client?.name || ""), center, y + 22, { align: "center" });

  // ─────────────────────────
  // ✈️ VOOS
  // ─────────────────────────
  if (data.flightLegs && data.flightLegs.length > 0) {
    doc.addPage();
    y = 35;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(38);
    doc.setTextColor(...PRIMARY);
    doc.text("AÉREO", center, y, { align: "center" });
    y += 20;

    const drawFlight = (f: FlightLegPdf) => {
      if (y > ph - 50) {
        doc.addPage();
        y = 35;
      }
      doc.setFillColor(240, 240, 240);
      doc.roundedRect(20, y, pw - 40, 30, 6, 6, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(...PRIMARY);
      doc.text(sanitize(f.origin || ""), 40, y + 18);
      doc.text(sanitize(f.destination || ""), pw - 40, y + 18, { align: "right" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.setTextColor(...MUTED);
      doc.text(`Saída: ${f.departureTime || ""}`, 40, y + 25);
      doc.text(`Chegada: ${f.arrivalTime || ""}`, pw - 40, y + 25, { align: "right" });

      y += 40;
    };

    data.flightLegs.forEach(drawFlight);
  }

  // ─────────────────────────
  // 💰 INVESTIMENTO
  // ─────────────────────────
  doc.addPage();
  y = 40;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(38);
  doc.setTextColor(...PRIMARY);
  doc.text("INVESTIMENTO", center, y, { align: "center" });
  y += 25;

  doc.setFillColor(...LIGHT);
  doc.roundedRect(25, y, pw - 50, 45, 8, 8, "F");

  doc.setFont("helvetica", "italic");
  doc.setFontSize(12);
  doc.setTextColor(...MUTED);
  doc.text("Valor total da viagem", center, y + 15, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(36);
  doc.setTextColor(0, 0, 0);
  doc.text(fmtBRL(data.totalTrip), center, y + 30, { align: "center" });

  // Parcelamento
  if (data.payment?.installments > 1) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...MUTED);
    doc.text(
      `${data.payment.installments}x de ${fmtBRL(data.totalTrip / data.payment.installments)}`,
      center,
      y + 38,
      { align: "center" }
    );
  }

  y += 60;

  // Inclusos
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...PRIMARY);
  doc.text("Inclui", 25, y);
  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(50, 50, 50);
  const includes = [
    "Passagens aéreas com taxas",
    "Serviços selecionados",
    "Suporte premium durante a viagem",
  ];
  includes.forEach((i) => {
    doc.text("• " + i, 25, y);
    y += 7;
  });

  y += 10;

  // Observações
  if (data.notes) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...PRIMARY);
    doc.text("Observações", 25, y);
    y += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...MUTED);
    const lines = doc.splitTextToSize(sanitize(data.notes), pw - 50);
    doc.text(lines, 25, y);
  }

  return doc;
}
