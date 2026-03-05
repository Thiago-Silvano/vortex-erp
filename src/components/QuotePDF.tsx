import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import { QuoteData, AgencySettings, ServiceItem, ServiceType, SERVICE_TYPE_CONFIG, FlightLeg } from "@/types/quote";

// Convert logo to absolute URL for @react-pdf/renderer compatibility
const VORTEX_LOGO_URL = new URL('/images/vortex-logo-white.png', window.location.origin).href;

const NAVY = "#1a2744";
const GOLD = "#c8a951";
const SAND_BG = "#f5f0e8";
const LIGHT_BG = "#f5f0e8";
const LIGHT_GRAY = "#ede8de";
const WHITE = "#faf8f4";
const DARK_TEXT = "#1a1a1a";
const MID_TEXT = "#555555";
const GREEN = "#16a34a";

const s = StyleSheet.create({
  // Page
  page: { fontFamily: "Helvetica", fontSize: 9, color: DARK_TEXT, backgroundColor: SAND_BG },
  pageContent: { paddingHorizontal: 40, paddingTop: 36, paddingBottom: 60 },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 14,
    borderBottomWidth: 2,
    borderBottomColor: GOLD,
    marginBottom: 18,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  logo: { width: 50, height: 50, objectFit: "contain" },
  agencyName: { fontSize: 18, fontFamily: "Helvetica-Bold", color: NAVY, letterSpacing: 0.5 },
  agencyContact: { fontSize: 7, color: MID_TEXT, marginTop: 2, lineHeight: 1.4 },
  quoteLabel: { fontSize: 11, fontFamily: "Helvetica-Bold", color: GOLD, textTransform: "uppercase", letterSpacing: 3 },

  // Client highlight bar
  clientBar: {
    backgroundColor: NAVY,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  clientLabel: { fontSize: 7, color: GOLD, textTransform: "uppercase", letterSpacing: 1.5 },
  clientName: { fontSize: 14, color: WHITE, fontFamily: "Helvetica-Bold", marginTop: 2 },

  // Trip info
  tripBox: {
    backgroundColor: LIGHT_BG,
    padding: 12,
    borderRadius: 6,
    marginBottom: 20,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  tripCol: { flex: 1, paddingHorizontal: 4 },
  tripLabel: {
    fontSize: 6.5,
    color: GOLD,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 2,
    fontFamily: "Helvetica-Bold",
  },
  tripValue: { fontSize: 10, color: NAVY, fontFamily: "Helvetica-Bold" },

  // Category
  catHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    marginBottom: 8,
    borderBottomWidth: 1.5,
    borderBottomColor: GOLD,
    paddingBottom: 5,
  },
  catIcon: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: WHITE,
    backgroundColor: GOLD,
    width: 20,
    height: 20,
    textAlign: "center",
    lineHeight: 20,
    borderRadius: 10,
  },
  catTitle: { fontSize: 12, fontFamily: "Helvetica-Bold", color: NAVY },

  // Service card (generic)
  card: {
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 6,
    overflow: "hidden",
    backgroundColor: WHITE,
  },
  cardRow: { flexDirection: "row" },
  cardImage: { width: 80, height: 70, objectFit: "cover" },
  cardImagePlaceholder: {
    width: 80,
    height: 70,
    backgroundColor: LIGHT_GRAY,
    justifyContent: "center",
    alignItems: "center",
  },
  cardBody: { flex: 1, padding: 10, justifyContent: "center" },
  cardTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", color: NAVY, marginBottom: 2 },
  cardMeta: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 3 },
  cardMetaLabel: { fontSize: 8, color: MID_TEXT, fontFamily: "Helvetica-Bold" },
  cardMetaValue: { fontSize: 8, color: MID_TEXT },
  cardValueBox: {
    alignItems: "flex-end",
    justifyContent: "center",
    padding: 10,
    backgroundColor: LIGHT_BG,
    minWidth: 90,
  },
  cardValueText: { fontSize: 12, fontFamily: "Helvetica-Bold", color: NAVY },
  cardQty: { fontSize: 7, color: MID_TEXT, marginTop: 2 },

  // Hotel card
  hotelCard: {
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 6,
    overflow: "hidden",
    backgroundColor: WHITE,
  },
  hotelImageMain: { width: "100%", height: 160, objectFit: "cover" },
  hotelBody: { padding: 12 },
  hotelTitle: { fontSize: 13, fontFamily: "Helvetica-Bold", color: NAVY, marginBottom: 4 },
  hotelMeta: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 6 },
  hotelSectionTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: NAVY,
    marginTop: 6,
    marginBottom: 3,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  hotelDescText: { fontSize: 8, color: MID_TEXT, lineHeight: 1.5 },
  hotelImagesRow: { flexDirection: "row", gap: 4, marginTop: 6 },
  hotelImageSmall: { width: 58, height: 44, objectFit: "cover", borderRadius: 3 },

  // Flight card
  flightCard: {
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 6,
    overflow: "hidden",
    backgroundColor: WHITE,
  },
  flightImageFull: { width: "100%", height: 100, objectFit: "contain", backgroundColor: WHITE },
  flightBody: { padding: 10 },
  flightTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 },
  flightTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", color: NAVY },
  flightDirectionLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: WHITE,
    backgroundColor: NAVY,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 3,
    marginBottom: 4,
  },
  flightLeg: { paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  flightLegRoute: { flexDirection: "row", alignItems: "center", marginBottom: 2 },
  flightLegOrigin: { fontSize: 9, fontFamily: "Helvetica-Bold", color: NAVY },
  flightLegArrow: { fontSize: 9, color: GOLD, fontFamily: "Helvetica-Bold", marginHorizontal: 6 },
  flightLegDest: { fontSize: 9, fontFamily: "Helvetica-Bold", color: NAVY },
  flightLegInfo: { fontSize: 7.5, color: MID_TEXT, marginTop: 1 },
  flightLegInfoBold: { fontFamily: "Helvetica-Bold", color: NAVY },
  flightConnection: { fontSize: 7, color: GOLD, fontFamily: "Helvetica-Bold", textAlign: "center", paddingVertical: 3 },

  // Summary
  summaryBox: { marginTop: 20, borderTopWidth: 2, borderTopColor: GOLD, paddingTop: 12 },
  summaryTitle: { fontSize: 13, fontFamily: "Helvetica-Bold", color: NAVY, marginBottom: 8 },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  summaryLabel: { fontSize: 9, color: MID_TEXT },
  summaryValue: { fontSize: 9, fontFamily: "Helvetica-Bold", color: DARK_TEXT },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    backgroundColor: NAVY,
    paddingHorizontal: 14,
    borderRadius: 6,
    marginTop: 8,
  },
  totalLabel: { fontSize: 12, fontFamily: "Helvetica-Bold", color: GOLD },
  totalValue: { fontSize: 16, fontFamily: "Helvetica-Bold", color: WHITE },

  // Payment
  paymentBox: { marginTop: 14 },
  paymentTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", color: NAVY, marginBottom: 8 },
  paymentCard: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 6,
    padding: 12,
    marginBottom: 6,
    backgroundColor: LIGHT_BG,
  },
  paymentCardGreen: {
    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderRadius: 6,
    padding: 12,
    marginBottom: 6,
    backgroundColor: "#f0fdf4",
  },
  paymentLabel: { fontSize: 8, color: MID_TEXT, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  paymentLabelGreen: { fontSize: 8, color: GREEN, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  paymentInstallment: { fontSize: 18, fontFamily: "Helvetica-Bold", color: NAVY },
  paymentInstallmentGreen: { fontSize: 16, fontFamily: "Helvetica-Bold", color: GREEN },
  paymentTotal: { fontSize: 8, color: MID_TEXT, marginTop: 2 },

  // Notes
  notesBox: {
    marginTop: 14,
    padding: 10,
    backgroundColor: LIGHT_BG,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: GOLD,
  },
  notesTitle: { fontSize: 8, fontFamily: "Helvetica-Bold", color: NAVY, marginBottom: 3 },
  notesText: { fontSize: 7.5, color: MID_TEXT, lineHeight: 1.5 },

  // Footer
  footer: { position: "absolute", bottom: 14, left: 40, right: 40 },
  footerLine: { borderTopWidth: 1, borderTopColor: GOLD, paddingTop: 6 },
  footerText: { fontSize: 6, color: MID_TEXT, textAlign: "center", lineHeight: 1.5 },
  footerBold: { fontSize: 6, color: NAVY, textAlign: "center", fontFamily: "Helvetica-Bold" },
});

const CATEGORY_ICONS: Record<ServiceType, string> = {
  aereo: "A",
  hotel: "H",
  carro: "C",
  seguro: "S",
  experiencia: "E",
  adicional: "+",
};

function formatCurrency(v: number) {
  const formatted = v
    .toFixed(2)
    .replace(".", ",")
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `R$ ${formatted}`;
}

function formatCurrencyInteger(v: number) {
  const formatted = Math.round(v)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `R$ ${formatted}`;
}

function formatDate(d: string) {
  if (!d) return "-";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function sanitizeText(text: string): string {
  return text
    .replace(/ã/g, "a")
    .replace(/Ã/g, "A")
    .replace(/õ/g, "o")
    .replace(/Õ/g, "O")
    .replace(/á/g, "a")
    .replace(/Á/g, "A")
    .replace(/é/g, "e")
    .replace(/É/g, "E")
    .replace(/í/g, "i")
    .replace(/Í/g, "I")
    .replace(/ó/g, "o")
    .replace(/Ó/g, "O")
    .replace(/ú/g, "u")
    .replace(/Ú/g, "U")
    .replace(/â/g, "a")
    .replace(/Â/g, "A")
    .replace(/ê/g, "e")
    .replace(/Ê/g, "E")
    .replace(/î/g, "i")
    .replace(/Î/g, "I")
    .replace(/ô/g, "o")
    .replace(/Ô/g, "O")
    .replace(/û/g, "u")
    .replace(/Û/g, "U")
    .replace(/ç/g, "c")
    .replace(/Ç/g, "C")
    .replace(/ñ/g, "n")
    .replace(/Ñ/g, "N")
    .replace(/à/g, "a")
    .replace(/À/g, "A")
    .replace(/ü/g, "u")
    .replace(/Ü/g, "U")
    .replace(/[^\x00-\x7F]/g, "");
}

function getAllImages(item: ServiceItem): string[] {
  const images: string[] = [];
  if (item.imageBase64) images.push(item.imageBase64);
  if (item.imagesBase64) {
    item.imagesBase64.forEach((img) => {
      if (!images.includes(img)) images.push(img);
    });
  }
  return images;
}

const SERVICE_ORDER: ServiceType[] = ["aereo", "hotel", "carro", "seguro", "experiencia", "adicional"];

// ── Hotel Card ──────────────────────────────────────────
function HotelServiceCard({ item }: { item: ServiceItem }) {
  const images = getAllImages(item);
  const descLines = (item.description || "").split("\n").filter((l) => l.trim());

  // Parse description into sections
  const sections: { title: string; lines: string[] }[] = [];
  let currentSection: { title: string; lines: string[] } = { title: "", lines: [] };

  for (const line of descLines) {
    const trimmed = line.trim();
    // Check if it's a section header (all caps or starts with emoji-like prefix followed by caps)
    const isSectionHeader =
      /^[A-Z\s]{4,}$/.test(
        sanitizeText(trimmed)
          .replace(/[^A-Za-z\s]/g, "")
          .trim(),
      ) && trimmed.length < 40;

    if (isSectionHeader || trimmed.match(/^[\p{Emoji}\u200d\ufe0f\s]*[A-ZÀ-Ú\s]{4,}$/u)) {
      if (currentSection.title || currentSection.lines.length > 0) {
        sections.push(currentSection);
      }
      currentSection = {
        title: sanitizeText(trimmed)
          .replace(/[^A-Za-z\s\/]/g, "")
          .trim(),
        lines: [],
      };
    } else {
      currentSection.lines.push(sanitizeText(trimmed));
    }
  }
  if (currentSection.title || currentSection.lines.length > 0) {
    sections.push(currentSection);
  }

  return (
    <View style={s.hotelCard} wrap={false}>
      <View style={s.hotelBody}>
        <View
          style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}
        >
          <View style={{ flex: 1 }}>
            <Text style={s.hotelTitle}>{sanitizeText(item.title)}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.cardValueText}>{formatCurrency(item.value * item.quantity)}</Text>
          </View>
        </View>

        <View style={s.hotelMeta}>
          {item.location && (
            <View style={{ flexDirection: "row" }}>
              <Text style={s.cardMetaLabel}>Endereco: </Text>
              <Text style={s.cardMetaValue}>{sanitizeText(item.location)}</Text>
            </View>
          )}
          {item.startDate && (
            <View style={{ flexDirection: "row" }}>
              <Text style={s.cardMetaLabel}>Periodo: </Text>
              <Text style={s.cardMetaValue}>
                {formatDate(item.startDate)} a {formatDate(item.endDate)}
              </Text>
            </View>
          )}
        </View>

        {/* Organized description by sections */}
        {sections.map((sec, idx) => (
          <View key={idx}>
            {sec.title ? <Text style={s.hotelSectionTitle}>{sec.title}</Text> : null}
            {sec.lines.map((line, li) => (
              <Text key={li} style={s.hotelDescText}>
                {line}
              </Text>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Flight Card ─────────────────────────────────────────
function FlightServiceCard({ item }: { item: ServiceItem }) {
  const images = getAllImages(item);
  const idaLegs = (item.flightLegs || []).filter((l) => l.direction !== "volta");
  const voltaLegs = (item.flightLegs || []).filter((l) => l.direction === "volta");

  const renderLegs = (legs: FlightLeg[], label: string) => {
    if (legs.length === 0) return null;
    return (
      <View style={{ marginBottom: 4 }}>
        <Text style={s.flightDirectionLabel}>{label}</Text>
        {legs.map((leg, idx) => (
          <View key={idx}>
            {idx > 0 && legs[idx - 1]?.connectionDuration && (
              <Text style={s.flightConnection}>Conexao: {sanitizeText(legs[idx - 1].connectionDuration!)}</Text>
            )}
            <View style={s.flightLeg}>
              <View style={s.flightLegRoute}>
                <Text style={s.flightLegOrigin}>{sanitizeText(leg.origin)}</Text>
                <Text style={s.flightLegArrow}>{">"}</Text>
                <Text style={s.flightLegDest}>{sanitizeText(leg.destination)}</Text>
              </View>
              {leg.departureDate && (
                <Text style={s.flightLegInfo}>
                  <Text style={s.flightLegInfoBold}>Partida: </Text>
                  {formatDate(leg.departureDate)}
                  {leg.departureTime ? ` as ${leg.departureTime}` : ""}
                </Text>
              )}
              {leg.arrivalDate && (
                <Text style={s.flightLegInfo}>
                  <Text style={s.flightLegInfoBold}>Chegada: </Text>
                  {formatDate(leg.arrivalDate)}
                  {leg.arrivalTime ? ` as ${leg.arrivalTime}` : ""}
                </Text>
              )}
            </View>
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={s.flightCard} wrap={false}>
      {images.length > 0 && <Image src={images[0]} style={s.flightImageFull} />}
      <View style={s.flightBody}>
        <View style={s.flightTitleRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.flightTitle}>{sanitizeText(item.title)}</Text>
            {item.supplier && (
              <View style={{ flexDirection: "row", marginTop: 2 }}>
                <Text style={s.cardMetaLabel}>Cia Aérea: </Text>
                <Text style={s.cardMetaValue}>{sanitizeText(item.supplier)}</Text>
              </View>
            )}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.cardValueText}>{formatCurrency(item.value)}</Text>
          </View>
        </View>
        {renderLegs(idaLegs, "Voo de Ida")}
        {renderLegs(voltaLegs, "Voo de Volta")}
        {/* Baggage info */}
        {item.baggage && (item.baggage.personalItem > 0 || item.baggage.carryOn > 0 || item.baggage.checkedBag > 0) && (
          <View
            style={{
              flexDirection: "row",
              gap: 8,
              marginTop: 6,
              paddingTop: 6,
              borderTopWidth: 1,
              borderTopColor: "#f0f0f0",
            }}
          >
            {item.baggage.personalItem > 0 && (
              <View
                style={{
                  flexDirection: "row",
                  backgroundColor: LIGHT_GRAY,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 10,
                }}
              >
                <Text style={{ fontSize: 7.5, color: MID_TEXT }}>{item.baggage.personalItem}x Bolsa</Text>
              </View>
            )}
            {item.baggage.carryOn > 0 && (
              <View
                style={{
                  flexDirection: "row",
                  backgroundColor: LIGHT_GRAY,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 10,
                }}
              >
                <Text style={{ fontSize: 7.5, color: MID_TEXT }}>{item.baggage.carryOn}x Mala de mao</Text>
              </View>
            )}
            {item.baggage.checkedBag > 0 && (
              <View
                style={{
                  flexDirection: "row",
                  backgroundColor: LIGHT_GRAY,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 10,
                }}
              >
                <Text style={{ fontSize: 7.5, color: MID_TEXT }}>{item.baggage.checkedBag}x Mala despachada</Text>
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

// ── Generic Service Card ────────────────────────────────
function GenericServiceCard({ item, type }: { item: ServiceItem; type: ServiceType }) {
  const images = getAllImages(item);

  return (
    <View style={s.card} wrap={false}>
      <View style={s.cardRow}>
        {images.length > 0 ? (
          <Image src={images[0]} style={s.cardImage} />
        ) : (
          <View style={s.cardImagePlaceholder}>
            <Text style={{ fontSize: 16, fontFamily: "Helvetica-Bold", color: GOLD }}>{CATEGORY_ICONS[type]}</Text>
          </View>
        )}
        <View style={s.cardBody}>
          <Text style={s.cardTitle}>{sanitizeText(item.title)}</Text>
          {item.description && (
            <Text style={{ fontSize: 7.5, color: MID_TEXT, lineHeight: 1.4, marginBottom: 3 }}>
              {sanitizeText(item.description)}
            </Text>
          )}
          <View style={s.cardMeta}>
            {item.supplier && (
              <View style={{ flexDirection: "row" }}>
                <Text style={s.cardMetaLabel}>Fornecedor: </Text>
                <Text style={s.cardMetaValue}>{sanitizeText(item.supplier)}</Text>
              </View>
            )}
            {item.location && (
              <View style={{ flexDirection: "row" }}>
                <Text style={s.cardMetaLabel}>Local: </Text>
                <Text style={s.cardMetaValue}>{sanitizeText(item.location)}</Text>
              </View>
            )}
            {item.startDate && (
              <View style={{ flexDirection: "row" }}>
                <Text style={s.cardMetaLabel}>Data: </Text>
                <Text style={s.cardMetaValue}>
                  {formatDate(item.startDate)} a {formatDate(item.endDate)}
                </Text>
              </View>
            )}
          </View>
        </View>
        <View style={s.cardValueBox}>
          <Text style={s.cardValueText}>{formatCurrency(item.value * item.quantity)}</Text>
          {item.quantity > 1 && (
            <Text style={s.cardQty}>
              {item.quantity}x {formatCurrency(item.value)}
            </Text>
          )}
        </View>
      </View>
      {/* Extra images row */}
      {images.length > 1 && (
        <View style={{ flexDirection: "row", gap: 3, padding: 6, paddingTop: 0 }}>
          {images.slice(1, 6).map((img, idx) => (
            <Image key={idx} src={img} style={{ width: 50, height: 38, objectFit: "cover", borderRadius: 3 }} />
          ))}
        </View>
      )}
    </View>
  );
}

// ── Main PDF Document ───────────────────────────────────
interface Props {
  quote: QuoteData;
  agency: AgencySettings;
}

export default function QuotePDF({ quote, agency }: Props) {
  const grouped = SERVICE_ORDER.reduce(
    (acc, type) => {
      const items = quote.services.filter((svc) => svc.type === type);
      if (items.length > 0) acc.push({ type, items });
      return acc;
    },
    [] as { type: ServiceType; items: ServiceItem[] }[],
  );

  const categoryTotals = grouped.map((g) => ({
    label: SERVICE_TYPE_CONFIG[g.type].pdfLabel,
    total: g.items.reduce((sum, i) => sum + i.value * i.quantity, 0),
  }));

  const grandTotal = categoryTotals.reduce((sum, c) => sum + c.total, 0);
  const payment = quote.payment;
  const showIndividual = payment?.showIndividualValues;

  return (
    <Document>
      {/* ── Page 1: Header + Trip Info + Services ── */}
      <Page size="A4" style={s.page}>
        <View style={s.pageContent}>
          {/* Header */}
          <View style={s.header}>
            <View style={s.headerLeft}>
              {(agency.logoBase64 || VORTEX_LOGO_URL) && <Image src={agency.logoBase64 || VORTEX_LOGO_URL} style={s.logo} />}
              <View>
                <View style={{ flexDirection: "row", gap: 8, marginTop: 2 }}>
                  {agency.whatsapp && <Text style={s.agencyContact}>WhatsApp: {sanitizeText(agency.whatsapp)}</Text>}
                  {agency.email && <Text style={s.agencyContact}>{sanitizeText(agency.email)}</Text>}
                </View>
                {agency.website && <Text style={s.agencyContact}>{sanitizeText(agency.website)}</Text>}
              </View>
            </View>
            <Text style={s.quoteLabel}>Cotação de viagem</Text>
          </View>

          {/* Client bar */}
          <View style={s.clientBar}>
            <View>
              <Text style={s.clientLabel}>Cliente</Text>
              <Text style={s.clientName}>{sanitizeText(quote.client.name)}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ fontSize: 7, color: GOLD, fontFamily: "Helvetica-Bold" }}>PAX</Text>
              <Text style={{ fontSize: 14, color: WHITE, fontFamily: "Helvetica-Bold" }}>
                {quote.client.passengers}
              </Text>
            </View>
          </View>

          {/* Trip info */}
          <View style={s.tripBox}>
            <View style={s.tripCol}>
              <Text style={s.tripLabel}>Origem - Destino</Text>
              <Text style={s.tripValue}>
                {sanitizeText(quote.trip.origin)} - {sanitizeText(quote.trip.destination)}
              </Text>
            </View>
            <View style={s.tripCol}>
              <Text style={s.tripLabel}>Periodo</Text>
              <Text style={s.tripValue}>
                {formatDate(quote.trip.departureDate)} a {formatDate(quote.trip.returnDate)}
              </Text>
            </View>
            <View style={{ ...s.tripCol, flex: 0.5 }}>
              <Text style={s.tripLabel}>Tipo</Text>
              <Text style={s.tripValue}>{sanitizeText(quote.trip.tripType)}</Text>
            </View>
          </View>

          {/* Services by category */}
          {grouped.map(({ type, items }) => (
            <View key={type}>
              <View style={s.catHeader}>
                <Text style={s.catIcon}>{CATEGORY_ICONS[type]}</Text>
                <Text style={s.catTitle}>{SERVICE_TYPE_CONFIG[type].pdfLabel}</Text>
              </View>
              {items.map((item) => {
                if (type === "aereo") return <FlightServiceCard key={item.id} item={item} />;
                if (type === "hotel") return <HotelServiceCard key={item.id} item={item} />;
                return <GenericServiceCard key={item.id} item={item} type={type} />;
              })}
            </View>
          ))}

          {/* Notes */}
          {quote.client.notes && (
            <View style={s.notesBox}>
              <Text style={s.notesTitle}>Observacoes</Text>
              <Text style={s.notesText}>{sanitizeText(quote.client.notes)}</Text>
            </View>
          )}

          {/* Financial Summary - on new page */}
          <View style={s.summaryBox} break>
            <Text style={s.summaryTitle}>Investimento</Text>

            {showIndividual &&
              categoryTotals.map((c) => (
                <View key={c.label} style={s.summaryRow}>
                  <Text style={s.summaryLabel}>{c.label}</Text>
                  <Text style={s.summaryValue}>{formatCurrency(c.total)}</Text>
                </View>
              ))}

            <View style={s.totalRow}>
              <Text style={s.totalLabel}>VALOR TOTAL POR PESSOA</Text>
              <Text style={s.totalValue}>{formatCurrency(grandTotal)}</Text>
            </View>

            {/* Payment Conditions */}
            {payment &&
              (payment.pixValue > 0 || payment.installmentsNoInterest > 0 || payment.installmentsWithInterest > 0) && (
                <View style={s.paymentBox}>
                  <Text style={s.paymentTitle}>Condicoes de Pagamento</Text>

                  {payment.pixValue > 0 && (
                    <View style={s.paymentCardGreen}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <View>
                          <Text style={s.paymentLabelGreen}>Pix a vista</Text>
                          <Text style={{ fontSize: 7, color: GREEN, marginTop: 1 }}>
                            Pagamento instantaneo com desconto
                          </Text>
                        </View>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                          {grandTotal > 0 && payment.pixValue < grandTotal && (
                            <Text style={{ fontSize: 16, fontFamily: "Helvetica-Bold", color: GREEN }}>
                              {Math.round(((grandTotal - payment.pixValue) / grandTotal) * 100)}% OFF
                            </Text>
                          )}
                          <Text style={s.paymentInstallmentGreen}>{formatCurrencyInteger(payment.pixValue)}</Text>
                        </View>
                      </View>
                    </View>
                  )}

                  {payment.installmentsNoInterest > 0 && payment.installmentValueNoInterest > 0 && (
                    <View style={s.paymentCard}>
                      <Text style={s.paymentLabel}>Cartao sem juros</Text>
                      <Text style={s.paymentInstallment}>
                        {payment.installmentsNoInterest}x {formatCurrency(payment.installmentValueNoInterest)}
                      </Text>
                      <Text style={s.paymentTotal}>
                        Total: {formatCurrency(payment.installmentsNoInterest * payment.installmentValueNoInterest)}
                      </Text>
                    </View>
                  )}

                  {payment.installmentsWithInterest > 0 && payment.installmentValueWithInterest > 0 && (
                    <View style={s.paymentCard}>
                      <Text style={s.paymentLabel}>Cartao com juros</Text>
                      <Text style={s.paymentInstallment}>
                        {payment.installmentsWithInterest}x {formatCurrency(payment.installmentValueWithInterest)}
                      </Text>
                      <Text style={s.paymentTotal}>
                        Total: {formatCurrency(payment.installmentsWithInterest * payment.installmentValueWithInterest)}
                      </Text>
                    </View>
                  )}
                </View>
              )}
          </View>
        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <View style={s.footerLine}>
            <Text style={s.footerBold}>Vortex Viagens - CNPJ: 51.209.371/0001-19</Text>
            <Text style={s.footerText}>
              Rua Jorge Elias De Lucca, 677 - Nacoes Shopping - Sala 04 - Criciuma - SC, 88813-901
            </Text>
            <Text style={s.footerText}>(48) 3500-0975 | contato@vortexviagens.com.br | @vortexviagem</Text>
            <Text style={s.footerText}>
              Valores sujeitos a disponibilidade no momento da emissao - Tarifas podem sofrer alteracao sem aviso previo
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
