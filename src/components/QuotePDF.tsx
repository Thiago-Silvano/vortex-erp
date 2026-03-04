import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';
import { QuoteData, AgencySettings, ServiceItem, ServiceType, SERVICE_TYPE_CONFIG } from '@/types/quote';

const NAVY = '#1a2744';
const GOLD = '#c8a951';
const LIGHT_GRAY = '#f5f5f5';
const WHITE = '#ffffff';
const DARK_TEXT = '#2a2a2a';
const MID_TEXT = '#666666';

const s = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: DARK_TEXT },
  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, borderBottomWidth: 2, borderBottomColor: GOLD, paddingBottom: 16 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logo: { width: 60, height: 60, objectFit: 'contain' },
  agencyName: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: NAVY },
  agencyContact: { fontSize: 8, color: MID_TEXT, marginTop: 2 },
  headerRight: { alignItems: 'flex-end' },
  quoteTitle: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: GOLD, textTransform: 'uppercase', letterSpacing: 2 },
  // Client
  clientBox: { backgroundColor: NAVY, padding: 16, borderRadius: 6, marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between' },
  clientLabel: { fontSize: 8, color: GOLD, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 },
  clientValue: { fontSize: 11, color: WHITE, fontFamily: 'Helvetica-Bold' },
  clientCol: { flex: 1 },
  // Category
  categoryHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16, marginBottom: 8, borderBottomWidth: 1, borderBottomColor: GOLD, paddingBottom: 4 },
  categoryTitle: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: NAVY },
  // Service card
  serviceCard: { flexDirection: 'row', marginBottom: 8, borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 4, overflow: 'hidden' },
  serviceImage: { width: 80, height: 65, objectFit: 'cover' },
  serviceImagePlaceholder: { width: 80, height: 65, backgroundColor: LIGHT_GRAY, justifyContent: 'center', alignItems: 'center' },
  serviceBody: { flex: 1, padding: 8 },
  serviceTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: NAVY },
  serviceDesc: { fontSize: 8, color: MID_TEXT, marginTop: 2 },
  serviceMeta: { flexDirection: 'row', gap: 12, marginTop: 4 },
  serviceMetaItem: { fontSize: 8, color: MID_TEXT },
  serviceValue: { alignItems: 'flex-end', justifyContent: 'center', padding: 8, backgroundColor: LIGHT_GRAY, minWidth: 90 },
  serviceValueText: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: NAVY },
  serviceQty: { fontSize: 7, color: MID_TEXT },
  // Summary
  summaryBox: { marginTop: 20, borderTopWidth: 2, borderTopColor: GOLD, paddingTop: 12 },
  summaryTitle: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: NAVY, marginBottom: 8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, borderBottomWidth: 1, borderBottomColor: '#eee' },
  summaryLabel: { fontSize: 10, color: MID_TEXT },
  summaryValue: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: DARK_TEXT },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, backgroundColor: NAVY, paddingHorizontal: 12, borderRadius: 4, marginTop: 6 },
  totalLabel: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: GOLD },
  totalValue: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: WHITE },
  // Footer
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40 },
  footerLine: { borderTopWidth: 1, borderTopColor: '#ddd', paddingTop: 8 },
  footerText: { fontSize: 7, color: MID_TEXT, textAlign: 'center', lineHeight: 1.5 },
  // Notes
  notesBox: { marginTop: 16, padding: 10, backgroundColor: LIGHT_GRAY, borderRadius: 4 },
  notesTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: NAVY, marginBottom: 3 },
  notesText: { fontSize: 8, color: MID_TEXT },
});

function formatCurrency(v: number) {
  return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

function formatDate(d: string) {
  if (!d) return '-';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

const SERVICE_ORDER: ServiceType[] = ['aereo', 'hotel', 'carro', 'seguro', 'experiencia', 'adicional'];

interface Props {
  quote: QuoteData;
  agency: AgencySettings;
}

export default function QuotePDF({ quote, agency }: Props) {
  const grouped = SERVICE_ORDER.reduce((acc, type) => {
    const items = quote.services.filter(s => s.type === type);
    if (items.length > 0) acc.push({ type, items });
    return acc;
  }, [] as { type: ServiceType; items: ServiceItem[] }[]);

  const categoryTotals = grouped.map(g => ({
    label: SERVICE_TYPE_CONFIG[g.type].label,
    icon: SERVICE_TYPE_CONFIG[g.type].icon,
    total: g.items.reduce((sum, i) => sum + i.value * i.quantity, 0),
  }));

  const grandTotal = categoryTotals.reduce((sum, c) => sum + c.total, 0);

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            {agency.logoBase64 && <Image src={agency.logoBase64} style={s.logo} />}
            <View>
              <Text style={s.agencyName}>{agency.name}</Text>
              {agency.whatsapp && <Text style={s.agencyContact}>WhatsApp: {agency.whatsapp}</Text>}
              {agency.email && <Text style={s.agencyContact}>{agency.email}</Text>}
              {agency.website && <Text style={s.agencyContact}>{agency.website}</Text>}
            </View>
          </View>
          <View style={s.headerRight}>
            <Text style={s.quoteTitle}>Orçamento</Text>
          </View>
        </View>

        {/* Client Info */}
        <View style={s.clientBox}>
          <View style={s.clientCol}>
            <Text style={s.clientLabel}>Cliente</Text>
            <Text style={s.clientValue}>{quote.client.name}</Text>
          </View>
          <View style={s.clientCol}>
            <Text style={s.clientLabel}>Destino</Text>
            <Text style={s.clientValue}>{quote.trip.origin} → {quote.trip.destination}</Text>
          </View>
          <View style={s.clientCol}>
            <Text style={s.clientLabel}>Período</Text>
            <Text style={s.clientValue}>{formatDate(quote.trip.departureDate)} a {formatDate(quote.trip.returnDate)}</Text>
          </View>
          <View style={{ ...s.clientCol, flex: 0.5 }}>
            <Text style={s.clientLabel}>Passageiros</Text>
            <Text style={s.clientValue}>{quote.client.passengers}</Text>
          </View>
        </View>

        {/* Services by category */}
        {grouped.map(({ type, items }) => (
          <View key={type} wrap={false}>
            <View style={s.categoryHeader}>
              <Text style={{ fontSize: 14 }}>{SERVICE_TYPE_CONFIG[type].icon}</Text>
              <Text style={s.categoryTitle}>{SERVICE_TYPE_CONFIG[type].label}</Text>
            </View>
            {items.map(item => (
              <View key={item.id} style={s.serviceCard} wrap={false}>
                {item.imageBase64 ? (
                  <Image src={item.imageBase64} style={s.serviceImage} />
                ) : (
                  <View style={s.serviceImagePlaceholder}>
                    <Text style={{ fontSize: 20 }}>{SERVICE_TYPE_CONFIG[type].icon}</Text>
                  </View>
                )}
                <View style={s.serviceBody}>
                  <Text style={s.serviceTitle}>{item.title}</Text>
                  {item.description && <Text style={s.serviceDesc}>{item.description}</Text>}
                  <View style={s.serviceMeta}>
                    {item.supplier && <Text style={s.serviceMetaItem}>📍 {item.supplier}</Text>}
                    {item.location && <Text style={s.serviceMetaItem}>📌 {item.location}</Text>}
                    {item.startDate && <Text style={s.serviceMetaItem}>📅 {formatDate(item.startDate)} - {formatDate(item.endDate)}</Text>}
                  </View>
                </View>
                <View style={s.serviceValue}>
                  <Text style={s.serviceValueText}>{formatCurrency(item.value * item.quantity)}</Text>
                  {item.quantity > 1 && <Text style={s.serviceQty}>{item.quantity}x {formatCurrency(item.value)}</Text>}
                </View>
              </View>
            ))}
          </View>
        ))}

        {/* Notes */}
        {quote.client.notes && (
          <View style={s.notesBox}>
            <Text style={s.notesTitle}>Observações</Text>
            <Text style={s.notesText}>{quote.client.notes}</Text>
          </View>
        )}

        {/* Financial Summary */}
        <View style={s.summaryBox}>
          <Text style={s.summaryTitle}>Resumo Financeiro</Text>
          {categoryTotals.map(c => (
            <View key={c.label} style={s.summaryRow}>
              <Text style={s.summaryLabel}>{c.icon} {c.label}</Text>
              <Text style={s.summaryValue}>{formatCurrency(c.total)}</Text>
            </View>
          ))}
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>TOTAL DA VIAGEM</Text>
            <Text style={s.totalValue}>{formatCurrency(grandTotal)}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <View style={s.footerLine}>
            <Text style={s.footerText}>
              Valores sujeitos à disponibilidade no momento da emissão • Tarifas podem sofrer alteração sem aviso prévio{'\n'}
              Valores por pessoa, salvo indicação contrária • {agency.name} {agency.website ? `• ${agency.website}` : ''}
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
