import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { QuoteData, AgencySettings, ServiceItem, ServiceType, SERVICE_TYPE_CONFIG, FlightLeg } from '@/types/quote';

const NAVY = '#1a2744';
const GOLD = '#c8a951';
const LIGHT_GRAY = '#f5f5f5';
const WHITE = '#ffffff';
const DARK_TEXT = '#2a2a2a';
const MID_TEXT = '#555555';

const s = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: DARK_TEXT },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottomWidth: 2, borderBottomColor: GOLD, paddingBottom: 14 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  logo: { width: 56, height: 56, objectFit: 'contain' },
  agencyName: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: NAVY, letterSpacing: 0.5 },
  agencyContact: { fontSize: 8, color: MID_TEXT, marginTop: 3, lineHeight: 1.4 },
  headerRight: { alignItems: 'flex-end' },
  quoteTitle: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: GOLD, textTransform: 'uppercase', letterSpacing: 3 },
  clientNameRow: { backgroundColor: NAVY, paddingVertical: 10, paddingHorizontal: 18, borderRadius: 6, marginBottom: 10 },
  clientNameLabel: { fontSize: 7, color: GOLD, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 3 },
  clientNameValue: { fontSize: 14, color: WHITE, fontFamily: 'Helvetica-Bold' },
  tripBox: { backgroundColor: LIGHT_GRAY, padding: 14, borderRadius: 6, marginBottom: 24, flexDirection: 'row', justifyContent: 'space-between', borderWidth: 1, borderColor: '#e0e0e0' },
  tripCol: { flex: 1, paddingHorizontal: 6 },
  tripLabel: { fontSize: 7, color: GOLD, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 3, fontFamily: 'Helvetica-Bold' },
  tripValue: { fontSize: 11, color: NAVY, fontFamily: 'Helvetica-Bold' },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: GOLD, paddingBottom: 6 },
  categoryIcon: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: WHITE, backgroundColor: GOLD, width: 22, height: 22, textAlign: 'center', lineHeight: 22, borderRadius: 11 },
  categoryTitle: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: NAVY, letterSpacing: 0.3 },
  serviceCard: { flexDirection: 'row', marginBottom: 10, borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 6, overflow: 'hidden', backgroundColor: WHITE },
  serviceImage: { width: 80, height: 70, objectFit: 'cover' },
  serviceImagePlaceholder: { width: 80, height: 70, backgroundColor: LIGHT_GRAY, justifyContent: 'center', alignItems: 'center' },
  serviceBody: { flex: 1, padding: 10, justifyContent: 'center' },
  serviceTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: NAVY, marginBottom: 3 },
  serviceDesc: { fontSize: 8, color: MID_TEXT, marginBottom: 4, lineHeight: 1.4 },
  serviceMeta: { flexDirection: 'row', gap: 14, marginTop: 2 },
  serviceMetaItem: { fontSize: 8, color: MID_TEXT },
  serviceMetaLabel: { fontSize: 8, color: MID_TEXT, fontFamily: 'Helvetica-Bold' },
  serviceValue: { alignItems: 'flex-end', justifyContent: 'center', padding: 10, backgroundColor: LIGHT_GRAY, minWidth: 95 },
  serviceValueText: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: NAVY },
  serviceQty: { fontSize: 7, color: MID_TEXT, marginTop: 2 },
  serviceImagesRow: { flexDirection: 'row', gap: 4, marginBottom: 6 },
  serviceImageSmall: { width: 55, height: 42, objectFit: 'cover', borderRadius: 3 },
  aereoImageCard: { marginBottom: 10, borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 6, overflow: 'hidden', backgroundColor: WHITE },
  aereoImageFull: { width: '100%', height: 130, objectFit: 'contain', backgroundColor: WHITE },
  aereoBody: { padding: 10 },
  flightLegsBox: { marginTop: 6, marginBottom: 4 },
  flightLeg: { paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  flightLegRoute: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 3 },
  flightLegText: { fontSize: 9, color: NAVY, fontFamily: 'Helvetica-Bold' },
  flightLegArrow: { fontSize: 9, color: GOLD, fontFamily: 'Helvetica-Bold', marginHorizontal: 4 },
  flightLegInfoLine: { fontSize: 8, color: MID_TEXT, marginTop: 1 },
  flightLegInfoLabel: { fontFamily: 'Helvetica-Bold', color: NAVY },
  summaryBox: { marginTop: 28, borderTopWidth: 2, borderTopColor: GOLD, paddingTop: 14 },
  summaryTitle: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: NAVY, marginBottom: 10 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#eee' },
  summaryLabel: { fontSize: 10, color: MID_TEXT },
  summaryValue: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: DARK_TEXT },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, backgroundColor: NAVY, paddingHorizontal: 14, borderRadius: 6, marginTop: 8 },
  totalLabel: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: GOLD },
  totalValue: { fontSize: 15, fontFamily: 'Helvetica-Bold', color: WHITE },
  notesBox: { marginTop: 18, padding: 12, backgroundColor: LIGHT_GRAY, borderRadius: 6, borderLeftWidth: 3, borderLeftColor: GOLD },
  notesTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: NAVY, marginBottom: 4 },
  notesText: { fontSize: 8, color: MID_TEXT, lineHeight: 1.5 },
  footer: { position: 'absolute', bottom: 28, left: 40, right: 40 },
  footerLine: { borderTopWidth: 1, borderTopColor: '#ddd', paddingTop: 8 },
  footerText: { fontSize: 7, color: MID_TEXT, textAlign: 'center', lineHeight: 1.6 },
});

const CATEGORY_ICONS: Record<ServiceType, string> = {
  aereo: 'A', hotel: 'H', carro: 'C', seguro: 'S', experiencia: 'E', adicional: '+',
};

function formatCurrency(v: number) {
  const formatted = v.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `R$ ${formatted}`;
}

function formatDate(d: string) {
  if (!d) return '-';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

function sanitizeText(text: string): string {
  return text
    .replace(/ã/g, 'a').replace(/Ã/g, 'A')
    .replace(/õ/g, 'o').replace(/Õ/g, 'O')
    .replace(/á/g, 'a').replace(/Á/g, 'A')
    .replace(/é/g, 'e').replace(/É/g, 'E')
    .replace(/í/g, 'i').replace(/Í/g, 'I')
    .replace(/ó/g, 'o').replace(/Ó/g, 'O')
    .replace(/ú/g, 'u').replace(/Ú/g, 'U')
    .replace(/â/g, 'a').replace(/Â/g, 'A')
    .replace(/ê/g, 'e').replace(/Ê/g, 'E')
    .replace(/î/g, 'i').replace(/Î/g, 'I')
    .replace(/ô/g, 'o').replace(/Ô/g, 'O')
    .replace(/û/g, 'u').replace(/Û/g, 'U')
    .replace(/ç/g, 'c').replace(/Ç/g, 'C')
    .replace(/ñ/g, 'n').replace(/Ñ/g, 'N')
    .replace(/à/g, 'a').replace(/À/g, 'A')
    .replace(/ü/g, 'u').replace(/Ü/g, 'U')
    .replace(/[^\x00-\x7F]/g, '');
}

function getAllImages(item: ServiceItem): string[] {
  const images: string[] = [];
  if (item.imageBase64) images.push(item.imageBase64);
  if (item.imagesBase64) {
    item.imagesBase64.forEach(img => {
      if (!images.includes(img)) images.push(img);
    });
  }
  return images;
}

const SERVICE_ORDER: ServiceType[] = ['aereo', 'hotel', 'carro', 'seguro', 'experiencia', 'adicional'];

function FlightLegRow({ leg }: { leg: FlightLeg }) {
  return (
    <View style={s.flightLeg}>
      <View style={s.flightLegRoute}>
        <Text style={s.flightLegText}>{sanitizeText(leg.origin)}</Text>
        <Text style={s.flightLegArrow}>{'>'}</Text>
        <Text style={s.flightLegText}>{sanitizeText(leg.destination)}</Text>
      </View>
      {leg.departureDate && (
        <Text style={s.flightLegInfoLine}>
          <Text style={s.flightLegInfoLabel}>Partida: </Text>
          {formatDate(leg.departureDate)}{leg.departureTime ? ` ${leg.departureTime}` : ''}
        </Text>
      )}
      {leg.arrivalDate && (
        <Text style={s.flightLegInfoLine}>
          <Text style={s.flightLegInfoLabel}>Chegada: </Text>
          {formatDate(leg.arrivalDate)}{leg.arrivalTime ? ` ${leg.arrivalTime}` : ''}
        </Text>
      )}
    </View>
  );
}

function AereoServiceCard({ item }: { item: ServiceItem }) {
  const images = getAllImages(item);
  const hasImage = images.length > 0;

  return (
    <View style={s.aereoImageCard} wrap={false}>
      {hasImage && <Image src={images[0]} style={s.aereoImageFull} />}
      <View style={s.aereoBody}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={s.serviceTitle}>{sanitizeText(item.title)}</Text>
            {item.supplier && (
              <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                <Text style={s.serviceMetaLabel}>Cia Aerea: </Text>
                <Text style={s.serviceMetaItem}>{sanitizeText(item.supplier)}</Text>
              </View>
            )}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={s.serviceValueText}>{formatCurrency(item.value)}</Text>
          </View>
        </View>
        {item.flightLegs && item.flightLegs.length > 0 && (
          <View style={s.flightLegsBox}>
            {item.flightLegs.map((leg, idx) => (
              <FlightLegRow key={idx} leg={leg} />
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

function GenericServiceCard({ item, type }: { item: ServiceItem; type: ServiceType }) {
  const images = getAllImages(item);

  return (
    <View style={s.serviceCard} wrap={false}>
      {images.length === 1 ? (
        <Image src={images[0]} style={s.serviceImage} />
      ) : images.length === 0 ? (
        <View style={s.serviceImagePlaceholder}>
          <Text style={{ fontSize: 18, fontFamily: 'Helvetica-Bold', color: GOLD }}>{CATEGORY_ICONS[type]}</Text>
        </View>
      ) : null}
      <View style={s.serviceBody}>
        {images.length > 1 && (
          <View style={s.serviceImagesRow}>
            {images.map((img, idx) => (
              <Image key={idx} src={img} style={s.serviceImageSmall} />
            ))}
          </View>
        )}
        <Text style={s.serviceTitle}>{sanitizeText(item.title)}</Text>
        {item.description && <Text style={s.serviceDesc}>{sanitizeText(item.description)}</Text>}
        <View style={s.serviceMeta}>
          {item.supplier && (
            <View style={{ flexDirection: 'row' }}>
              <Text style={s.serviceMetaLabel}>Fornecedor: </Text>
              <Text style={s.serviceMetaItem}>{sanitizeText(item.supplier)}</Text>
            </View>
          )}
          {item.location && (
            <View style={{ flexDirection: 'row' }}>
              <Text style={s.serviceMetaLabel}>Local: </Text>
              <Text style={s.serviceMetaItem}>{sanitizeText(item.location)}</Text>
            </View>
          )}
          {item.startDate && (
            <View style={{ flexDirection: 'row' }}>
              <Text style={s.serviceMetaLabel}>Data: </Text>
              <Text style={s.serviceMetaItem}>{formatDate(item.startDate)} - {formatDate(item.endDate)}</Text>
            </View>
          )}
        </View>
      </View>
      <View style={s.serviceValue}>
        <Text style={s.serviceValueText}>{formatCurrency(item.value * item.quantity)}</Text>
        {item.quantity > 1 && <Text style={s.serviceQty}>{item.quantity}x {formatCurrency(item.value)}</Text>}
      </View>
    </View>
  );
}

interface Props {
  quote: QuoteData;
  agency: AgencySettings;
}

export default function QuotePDF({ quote, agency }: Props) {
  const grouped = SERVICE_ORDER.reduce((acc, type) => {
    const items = quote.services.filter(svc => svc.type === type);
    if (items.length > 0) acc.push({ type, items });
    return acc;
  }, [] as { type: ServiceType; items: ServiceItem[] }[]);

  const categoryTotals = grouped.map(g => ({
    label: SERVICE_TYPE_CONFIG[g.type].pdfLabel,
    total: g.items.reduce((sum, i) => sum + i.value * i.quantity, 0),
  }));

  const grandTotal = categoryTotals.reduce((sum, c) => sum + c.total, 0);

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View style={s.headerLeft}>
            {agency.logoBase64 && <Image src={agency.logoBase64} style={s.logo} />}
            <View>
              <Text style={s.agencyName}>{sanitizeText(agency.name)}</Text>
              {agency.whatsapp && <Text style={s.agencyContact}>WhatsApp: {sanitizeText(agency.whatsapp)}</Text>}
              {agency.email && <Text style={s.agencyContact}>{sanitizeText(agency.email)}</Text>}
              {agency.website && <Text style={s.agencyContact}>{sanitizeText(agency.website)}</Text>}
            </View>
          </View>
          <View style={s.headerRight}>
            <Text style={s.quoteTitle}>Orcamento</Text>
          </View>
        </View>

        <View style={s.clientNameRow}>
          <Text style={s.clientNameLabel}>Cliente</Text>
          <Text style={s.clientNameValue}>{sanitizeText(quote.client.name)}</Text>
        </View>

        <View style={s.tripBox}>
          <View style={s.tripCol}>
            <Text style={s.tripLabel}>Origem</Text>
            <Text style={s.tripValue}>{sanitizeText(quote.trip.origin)}</Text>
          </View>
          <View style={s.tripCol}>
            <Text style={s.tripLabel}>Destino</Text>
            <Text style={s.tripValue}>{sanitizeText(quote.trip.destination)}</Text>
          </View>
          <View style={s.tripCol}>
            <Text style={s.tripLabel}>Periodo</Text>
            <Text style={s.tripValue}>{formatDate(quote.trip.departureDate)} a {formatDate(quote.trip.returnDate)}</Text>
          </View>
          <View style={{ ...s.tripCol, flex: 0.5 }}>
            <Text style={s.tripLabel}>Pax</Text>
            <Text style={s.tripValue}>{quote.client.passengers}</Text>
          </View>
        </View>

        {grouped.map(({ type, items }) => (
          <View key={type} wrap={false}>
            <View style={s.categoryHeader}>
              <Text style={s.categoryIcon}>{CATEGORY_ICONS[type]}</Text>
              <Text style={s.categoryTitle}>{SERVICE_TYPE_CONFIG[type].pdfLabel}</Text>
            </View>
            {items.map(item => (
              type === 'aereo'
                ? <AereoServiceCard key={item.id} item={item} />
                : <GenericServiceCard key={item.id} item={item} type={type} />
            ))}
          </View>
        ))}

        {quote.client.notes && (
          <View style={s.notesBox}>
            <Text style={s.notesTitle}>Observacoes</Text>
            <Text style={s.notesText}>{sanitizeText(quote.client.notes)}</Text>
          </View>
        )}

        <View style={s.summaryBox}>
          <Text style={s.summaryTitle}>Resumo Financeiro</Text>
          {categoryTotals.map(c => (
            <View key={c.label} style={s.summaryRow}>
              <Text style={s.summaryLabel}>{c.label}</Text>
              <Text style={s.summaryValue}>{formatCurrency(c.total)}</Text>
            </View>
          ))}
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>TOTAL DA VIAGEM</Text>
            <Text style={s.totalValue}>{formatCurrency(grandTotal)}</Text>
          </View>
        </View>

        <View style={s.footer} fixed>
          <View style={s.footerLine}>
            <Text style={s.footerText}>
              Valores sujeitos a disponibilidade no momento da emissao - Tarifas podem sofrer alteracao sem aviso previo{'\n'}
              Valores por pessoa, salvo indicacao contraria - {sanitizeText(agency.name)} {agency.website ? `- ${sanitizeText(agency.website)}` : ''}
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
