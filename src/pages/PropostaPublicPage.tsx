import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface SaleData {
  id: string;
  client_name: string;
  sale_date: string;
  total_sale: number;
  payment_method: string;
  installments: number;
  notes: string;
  status: string;
  short_id: string;
}

interface SaleItemData {
  description: string;
  total_value: number;
  cost_center_id: string | null;
  service_catalog_id: string | null;
}

interface PassengerData {
  first_name: string;
  last_name: string;
  is_main: boolean;
}

interface ReceivableData {
  installment_number: number;
  amount: number;
  due_date: string | null;
}

interface AgencyData {
  name: string;
  whatsapp: string;
  email: string;
  website: string;
  logo_url: string | null;
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatDateBR = (d?: string | null) => {
  if (!d) return '';
  const parts = d.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return d;
};

const formatDateLong = (d?: string | null) => {
  if (!d) return '';
  const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const parts = d.split('-');
  if (parts.length === 3) return `${parseInt(parts[2])} de ${months[parseInt(parts[1]) - 1]} de ${parts[0]}`;
  return d;
};

export default function PropostaPublicPage() {
  const { shortId } = useParams<{ shortId: string }>();
  const [sale, setSale] = useState<SaleData | null>(null);
  const [items, setItems] = useState<SaleItemData[]>([]);
  const [passengers, setPassengers] = useState<PassengerData[]>([]);
  const [receivables, setReceivables] = useState<ReceivableData[]>([]);
  const [agency, setAgency] = useState<AgencyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [quoteData, setQuoteData] = useState<any>(null);
  const [catalogNames, setCatalogNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!shortId) return;
    loadProposal();
  }, [shortId]);

  const loadProposal = async () => {
    setLoading(true);

    // Fetch sale by short_id
    const { data: saleData, error } = await supabase
      .from('sales')
      .select('*')
      .eq('short_id' as any, shortId)
      .single();

    if (error || !saleData) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setSale(saleData as any);

    // Fetch items, passengers, receivables, agency in parallel
    const saleId = saleData.id;
    const empresaId = (saleData as any).empresa_id;

    const [itemsRes, passengersRes, receivablesRes, agencyRes, catalogRes] = await Promise.all([
      supabase.from('sale_items').select('*').eq('sale_id', saleId).order('sort_order'),
      supabase.from('sale_passengers').select('*').eq('sale_id', saleId).order('sort_order'),
      supabase.from('receivables').select('*').eq('sale_id', saleId).order('installment_number'),
      empresaId
        ? supabase.from('agency_settings').select('*').eq('empresa_id', empresaId).limit(1)
        : supabase.from('agency_settings').select('*').limit(1),
      supabase.from('services_catalog').select('id, name'),
    ]);

    if (itemsRes.data) setItems(itemsRes.data as any);
    if (passengersRes.data) setPassengers(passengersRes.data as any);
    if (receivablesRes.data) setReceivables(receivablesRes.data as any);
    if (agencyRes.data && agencyRes.data.length > 0) setAgency(agencyRes.data[0] as any);

    // Build catalog name map
    if (catalogRes.data) {
      const map: Record<string, string> = {};
      catalogRes.data.forEach((c: any) => { map[c.id] = c.name; });
      setCatalogNames(map);
    }

    // Fetch quote data if linked
    if ((saleData as any).quote_id) {
      const { data: qData } = await supabase.from('quotes').select('*').eq('id', (saleData as any).quote_id).single();
      if (qData) setQuoteData(qData);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f5f5f5' }}>
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#C8A45B] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p style={{ color: '#787878' }}>Carregando proposta...</p>
        </div>
      </div>
    );
  }

  if (notFound || !sale) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f5f5f5' }}>
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2" style={{ color: '#0D1B2A' }}>Proposta não encontrada</h1>
          <p style={{ color: '#787878' }}>Este link pode ter expirado ou ser inválido.</p>
        </div>
      </div>
    );
  }

  const totalSale = sale.total_sale || 0;
  const destination = quoteData?.trip_destination || '';
  const origin = quoteData?.trip_origin || '';
  const departureDate = quoteData?.trip_departure_date;
  const returnDate = quoteData?.trip_return_date;
  const nights = quoteData?.trip_nights;

  const methodLabels: Record<string, string> = {
    pix: 'PIX',
    credito: 'Cartão de Crédito',
    boleto: 'Boleto Bancário',
    dinheiro: 'Dinheiro',
  };

  return (
    <div className="min-h-screen" style={{ background: '#f5f5f5', fontFamily: "'Georgia', 'Times New Roman', serif" }}>
      {/* Top gold accent */}
      <div style={{ height: 3, background: '#C8A45B' }} />

      {/* Header */}
      <header className="py-6 px-6 md:px-12" style={{ background: '#0D1B2A' }}>
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            {agency?.logo_url && (
              <img src={agency.logo_url} alt={agency.name} className="h-10 mb-2" />
            )}
            <h2 className="text-sm font-normal" style={{ color: '#C8A45B', letterSpacing: 2, fontFamily: 'sans-serif' }}>
              PROPOSTA DE VIAGEM
            </h2>
          </div>
          <div className="text-right text-xs" style={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'sans-serif' }}>
            {agency && (
              <>
                <p>{agency.name}</p>
                {agency.whatsapp && <p>{agency.whatsapp}</p>}
                {agency.email && <p>{agency.email}</p>}
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-12 px-6 md:px-12 text-center" style={{ background: '#0D1B2A' }}>
        <div className="max-w-3xl mx-auto">
          {destination && (
            <h1 className="text-3xl md:text-5xl font-bold mb-4" style={{ color: '#fff' }}>
              {destination}
            </h1>
          )}
          {departureDate && returnDate && (
            <p className="text-base mb-3" style={{ color: 'rgba(255,255,255,0.6)' }}>
              {formatDateLong(departureDate)} — {formatDateLong(returnDate)}
            </p>
          )}
          <div className="w-10 h-0.5 mx-auto my-4" style={{ background: '#C8A45B' }} />
          <p className="text-lg font-semibold" style={{ color: '#fff' }}>{sale.client_name}</p>
          {passengers.length > 1 && (
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {passengers.length} passageiros
            </p>
          )}
        </div>
      </section>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 md:px-12 py-10 space-y-10">

        {/* Summary cards */}
        {(destination || departureDate || nights) && (
          <section>
            <SectionTitle>Resumo da viagem</SectionTitle>
            <div className="grid grid-cols-2 gap-3 mt-4">
              {destination && <SummaryCard label="Destino" value={destination} />}
              {departureDate && returnDate && (
                <SummaryCard label="Periodo" value={`${formatDateBR(departureDate)} - ${formatDateBR(returnDate)}`} />
              )}
              {nights && <SummaryCard label="Duracao" value={`${nights} noites`} />}
              {passengers.length > 0 && (
                <SummaryCard label="Passageiros" value={`${passengers.length} ${passengers.length > 1 ? 'adultos' : 'adulto'}`} />
              )}
            </div>
          </section>
        )}

        {/* Services */}
        {items.length > 0 && (
          <section>
            <SectionTitle>Servicos inclusos</SectionTitle>
            <div className="mt-4 space-y-3">
              {items.map((item, idx) => {
                const name = item.service_catalog_id ? catalogNames[item.service_catalog_id] || item.description : item.description;
                return (
                  <div key={idx} className="flex items-center justify-between py-3 px-4 rounded-lg" style={{ background: '#fff', border: '1px solid #e5e5e5' }}>
                    <span className="font-medium text-sm" style={{ color: '#0D1B2A' }}>
                      {name || `Servico ${idx + 1}`}
                    </span>
                    {item.total_value > 0 && (
                      <span className="text-sm font-semibold" style={{ color: '#0D1B2A' }}>
                        {fmt(item.total_value)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Financial summary */}
        <section>
          <SectionTitle>Resumo financeiro</SectionTitle>
          <div className="mt-4 rounded-lg overflow-hidden" style={{ border: '1px solid #e5e5e5' }}>
            {items.map((item, idx) => {
              const name = item.service_catalog_id ? catalogNames[item.service_catalog_id] || item.description : item.description;
              return (
                <div key={idx} className="flex justify-between py-3 px-5" style={{ background: '#fff', borderBottom: '1px solid #f0f0f0' }}>
                  <span className="text-sm" style={{ color: '#1a1a1a' }}>{name || `Servico ${idx + 1}`}</span>
                  <span className="text-sm" style={{ color: '#1a1a1a' }}>{fmt(item.total_value)}</span>
                </div>
              );
            })}
            <div className="flex justify-between py-4 px-5" style={{ background: '#F8F3E7', borderLeft: '3px solid #C8A45B' }}>
              <span className="text-base font-bold" style={{ color: '#0D1B2A', fontFamily: "'Georgia', serif" }}>Total da viagem</span>
              <span className="text-lg font-bold" style={{ color: '#C8A45B', fontFamily: "'Georgia', serif" }}>{fmt(totalSale)}</span>
            </div>
          </div>
        </section>

        {/* Payment */}
        <section>
          <SectionTitle>Forma de pagamento</SectionTitle>
          <div className="mt-4 p-5 rounded-lg" style={{ background: '#fff', border: '1px solid #e5e5e5' }}>
            <p className="font-semibold text-sm mb-3" style={{ color: '#0D1B2A' }}>
              {methodLabels[sale.payment_method || ''] || sale.payment_method}
              {sale.installments > 1 && ` · ${sale.installments}x`}
            </p>
            {receivables.length > 0 && (
              <div className="space-y-2">
                {receivables.map((r, idx) => (
                  <div key={idx} className="flex justify-between text-sm" style={{ color: '#787878' }}>
                    <span>Parcela {r.installment_number}</span>
                    <span>{fmt(r.amount)}</span>
                    <span>Venc: {formatDateBR(r.due_date)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Notes */}
        {sale.notes && (
          <section>
            <SectionTitle>Observacoes</SectionTitle>
            <div className="mt-4 p-5 rounded-lg text-sm" style={{ background: '#fff', border: '1px solid #e5e5e5', color: '#787878', whiteSpace: 'pre-wrap' }}>
              {sale.notes}
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="py-6 px-6 text-center" style={{ background: '#0D1B2A' }}>
        <div className="w-20 h-0.5 mx-auto mb-4" style={{ background: '#C8A45B' }} />
        {agency && (
          <div className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
            <p>{agency.name}</p>
            <p className="mt-1">
              {[agency.whatsapp, agency.email, agency.website].filter(Boolean).join('  ·  ')}
            </p>
          </div>
        )}
        <p className="text-xs mt-3" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Valores sujeitos a disponibilidade e alteracoes sem aviso previo.
        </p>
      </footer>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-1 h-6 rounded" style={{ background: '#C8A45B' }} />
      <h2 className="text-xl font-bold" style={{ color: '#0D1B2A', fontFamily: "'Georgia', serif" }}>
        {children}
      </h2>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 rounded-lg" style={{ background: '#fff', border: '1px solid #e5e5e5' }}>
      <p className="text-xs font-medium mb-1" style={{ color: '#787878', fontFamily: 'sans-serif' }}>{label}</p>
      <p className="text-sm font-bold" style={{ color: '#0D1B2A' }}>{value}</p>
    </div>
  );
}
