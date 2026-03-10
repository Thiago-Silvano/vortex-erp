import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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
  destination_image_url?: string;
  quote_id?: string;
  empresa_id?: string;
}

interface SaleItemData {
  id: string;
  description: string;
  total_value: number;
  service_catalog_id: string | null;
  images: string[];
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

    const { data: saleData, error } = await (supabase
      .from('sales')
      .select('*') as any)
      .eq('short_id', shortId)
      .single();

    if (error || !saleData) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setSale(saleData as any);

    const saleId = saleData.id;
    const empresaId = (saleData as any).empresa_id;

    const [itemsRes, passengersRes, receivablesRes, agencyRes, catalogRes] = await Promise.all([
      supabase.from('sale_items').select('*').eq('sale_id', saleId).order('sort_order'),
      supabase.from('sale_passengers' as any).select('*').eq('sale_id', saleId).order('sort_order') as any,
      supabase.from('receivables').select('*').eq('sale_id', saleId).order('installment_number'),
      empresaId
        ? supabase.from('agency_settings').select('*').eq('empresa_id', empresaId).limit(1)
        : supabase.from('agency_settings').select('*').limit(1),
      supabase.from('services_catalog').select('id, name'),
    ]);

    // Build catalog name map
    const nameMap: Record<string, string> = {};
    if (catalogRes.data) {
      catalogRes.data.forEach((c: any) => { nameMap[c.id] = c.name; });
    }
    setCatalogNames(nameMap);

    // Load images for each item
    const loadedItems: SaleItemData[] = [];
    if (itemsRes.data) {
      for (const item of itemsRes.data) {
        const { data: imgs } = await (supabase.from('sale_item_images' as any) as any)
          .select('image_url')
          .eq('sale_item_id', item.id)
          .order('sort_order');
        loadedItems.push({
          id: item.id,
          description: item.description,
          total_value: Number(item.total_value),
          service_catalog_id: item.service_catalog_id,
          images: imgs?.map((i: any) => i.image_url) || [],
        });
      }
    }
    setItems(loadedItems);

    if (passengersRes.data) setPassengers(passengersRes.data as any);
    if (receivablesRes.data) setReceivables(receivablesRes.data as any);
    if (agencyRes.data && agencyRes.data.length > 0) setAgency(agencyRes.data[0] as any);

    if ((saleData as any).quote_id) {
      const { data: qData } = await supabase.from('quotes').select('*').eq('id', (saleData as any).quote_id).single();
      if (qData) setQuoteData(qData);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0D1B2A 0%, #1B3A4B 100%)' }}>
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-[#C8A45B] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60 text-sm" style={{ fontFamily: 'sans-serif' }}>Carregando sua proposta...</p>
        </div>
      </div>
    );
  }

  if (notFound || !sale) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0D1B2A' }}>
        <div className="text-center px-6">
          <div className="w-16 h-16 rounded-full border-2 border-[#C8A45B]/30 flex items-center justify-center mx-auto mb-6">
            <span className="text-2xl" style={{ color: '#C8A45B' }}>?</span>
          </div>
          <h1 className="text-2xl font-bold mb-2 text-white">Proposta não encontrada</h1>
          <p className="text-white/50">Este link pode ter expirado ou ser inválido.</p>
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
  const passengersCount = quoteData?.client_passengers || passengers.length;
  const heroImage = sale.destination_image_url || quoteData?.destination_image_url;

  const methodLabels: Record<string, string> = {
    pix: 'PIX',
    credito: 'Cartão de Crédito',
    boleto: 'Boleto Bancário',
    dinheiro: 'Dinheiro',
  };

  return (
    <div className="min-h-screen" style={{ background: '#f8f7f4' }}>
      {/* Hero Section - Full destination image background */}
      <div className="relative" style={{ minHeight: heroImage ? 500 : 320 }}>
        {heroImage && (
          <img
            src={heroImage}
            alt={destination || 'Destino'}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0" style={{
          background: heroImage
            ? 'linear-gradient(to bottom, rgba(13,27,42,0.3) 0%, rgba(13,27,42,0.6) 50%, rgba(13,27,42,0.95) 100%)'
            : 'linear-gradient(135deg, #0D1B2A 0%, #1B3A4B 100%)',
        }} />

        {/* Gold accent top */}
        <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(90deg, #C8A45B, #E8D5A3, #C8A45B)' }} />

        <div className="relative z-10 max-w-3xl mx-auto px-6 pt-6 pb-10 flex flex-col h-full" style={{ minHeight: heroImage ? 500 : 320 }}>
          {/* Top bar: Logo + Agency */}
          <div className="flex items-start justify-between mb-auto">
            <div>
              {agency?.logo_url && (
                <img src={agency.logo_url} alt={agency.name} className="h-8 brightness-0 invert opacity-80" />
              )}
            </div>
            <div className="text-right text-[11px] text-white/40" style={{ fontFamily: 'sans-serif' }}>
              {agency && (
                <>
                  <p>{agency.name}</p>
                  {agency.whatsapp && <p>{agency.whatsapp}</p>}
                </>
              )}
            </div>
          </div>

          {/* Center content over image */}
          <div className="text-center my-auto py-8">
            <p className="text-[11px] font-semibold tracking-[5px] uppercase mb-3" style={{ color: '#C8A45B' }}>
              Viagem personalizada para
            </p>
            <h1 className="text-3xl md:text-5xl font-bold mb-4 text-white" style={{ fontFamily: "'Georgia', serif", textShadow: '0 2px 20px rgba(0,0,0,0.4)' }}>
              {sale.client_name}
            </h1>
            <div className="w-16 h-[2px] mx-auto mb-4" style={{ background: 'linear-gradient(90deg, transparent, #C8A45B, transparent)' }} />
            {destination && (
              <p className="text-lg md:text-xl font-medium text-white/90 mb-2" style={{ fontFamily: "'Georgia', serif" }}>
                {destination}
              </p>
            )}
            {departureDate && returnDate && (
              <p className="text-sm text-white/60">
                {formatDateLong(departureDate)} — {formatDateLong(returnDate)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Trip info bar below hero */}
      {(origin || destination || passengersCount || nights) && (
        <div style={{ background: '#0D1B2A' }}>
          <div className="max-w-3xl mx-auto px-6 py-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {origin && (
                <div className="text-center">
                  <p className="text-[10px] font-semibold tracking-[3px] uppercase mb-1" style={{ color: '#C8A45B' }}>Origem</p>
                  <p className="text-sm font-medium text-white">{origin}</p>
                </div>
              )}
              {destination && (
                <div className="text-center">
                  <p className="text-[10px] font-semibold tracking-[3px] uppercase mb-1" style={{ color: '#C8A45B' }}>Destino</p>
                  <p className="text-sm font-medium text-white">{destination}</p>
                </div>
              )}
              {passengersCount > 0 && (
                <div className="text-center">
                  <p className="text-[10px] font-semibold tracking-[3px] uppercase mb-1" style={{ color: '#C8A45B' }}>Passageiros</p>
                  <p className="text-sm font-medium text-white">{passengersCount}</p>
                </div>
              )}
              {nights > 0 && (
                <div className="text-center">
                  <p className="text-[10px] font-semibold tracking-[3px] uppercase mb-1" style={{ color: '#C8A45B' }}>Noites</p>
                  <p className="text-sm font-medium text-white">{nights}</p>
                </div>
              )}
            </div>
          </div>
          {/* Gold bottom accent */}
          <div className="h-[2px]" style={{ background: 'linear-gradient(90deg, transparent, #C8A45B, transparent)' }} />
        </div>
      )}

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-12 space-y-14">

        {/* Services with Images */}
        {items.length > 0 && (
          <section>
            <SectionTitle>O que está incluso</SectionTitle>
            <div className="mt-6 space-y-6">
              {items.map((item, idx) => {
                const name = item.service_catalog_id ? catalogNames[item.service_catalog_id] || item.description : item.description;
                return (
                  <ServiceCard
                    key={idx}
                    name={name || `Serviço ${idx + 1}`}
                    description={item.description}
                    catalogName={item.service_catalog_id ? catalogNames[item.service_catalog_id] : null}
                    value={item.total_value}
                    images={item.images}
                  />
                );
              })}
            </div>
          </section>
        )}

        {/* Financial */}
        <section>
          <SectionTitle>Investimento</SectionTitle>
          <div className="mt-6 rounded-2xl overflow-hidden shadow-lg" style={{ border: '1px solid #e8e4dc' }}>
            {items.map((item, idx) => {
              const name = item.service_catalog_id ? catalogNames[item.service_catalog_id] || item.description : item.description;
              return (
                <div key={idx} className="flex justify-between py-3.5 px-6" style={{
                  background: idx % 2 === 0 ? '#fff' : '#faf9f7',
                  borderBottom: '1px solid #f0ede8'
                }}>
                  <span className="text-sm" style={{ color: '#2d2d2d' }}>{name || `Serviço ${idx + 1}`}</span>
                  <span className="text-sm font-medium" style={{ color: '#2d2d2d' }}>{fmt(item.total_value)}</span>
                </div>
              );
            })}
            <div className="flex justify-between py-5 px-6 items-center" style={{
              background: 'linear-gradient(135deg, #0D1B2A, #1B3A4B)',
            }}>
              <span className="text-base font-bold text-white" style={{ fontFamily: "'Georgia', serif" }}>
                Total da viagem
              </span>
              <span className="text-2xl font-bold" style={{ color: '#C8A45B', fontFamily: "'Georgia', serif" }}>
                {fmt(totalSale)}
              </span>
            </div>
          </div>
        </section>

        {/* Payment */}
        <section>
          <SectionTitle>Forma de pagamento</SectionTitle>
          <div className="mt-6 p-6 rounded-2xl shadow-sm" style={{ background: '#fff', border: '1px solid #e8e4dc' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#0D1B2A' }}>
                <span className="text-white text-sm font-bold">$</span>
              </div>
              <div>
                <p className="font-semibold text-sm" style={{ color: '#0D1B2A' }}>
                  {methodLabels[sale.payment_method || ''] || sale.payment_method}
                </p>
                {sale.installments > 1 && (
                  <p className="text-xs" style={{ color: '#999' }}>{sale.installments}x parcelas</p>
                )}
              </div>
            </div>
            {receivables.length > 0 && (
              <div className="space-y-2 pt-3" style={{ borderTop: '1px solid #f0ede8' }}>
                {receivables.map((r, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm py-1.5">
                    <span style={{ color: '#666' }}>Parcela {r.installment_number}</span>
                    <span className="font-medium" style={{ color: '#2d2d2d' }}>{fmt(r.amount)}</span>
                    <span className="text-xs" style={{ color: '#999' }}>Venc: {formatDateBR(r.due_date)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Notes */}
        {sale.notes && (
          <section>
            <SectionTitle>Observações</SectionTitle>
            <div className="mt-6 p-6 rounded-2xl text-sm leading-relaxed shadow-sm" style={{
              background: '#fff',
              border: '1px solid #e8e4dc',
              color: '#666',
              whiteSpace: 'pre-wrap'
            }}>
              {sale.notes}
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="py-10 px-6" style={{ background: '#0D1B2A' }}>
        <div className="max-w-3xl mx-auto text-center">
          <div className="w-16 h-[2px] mx-auto mb-6" style={{ background: 'linear-gradient(90deg, transparent, #C8A45B, transparent)' }} />
          {agency?.logo_url && (
            <img src={agency.logo_url} alt={agency.name} className="h-8 mx-auto mb-4 brightness-0 invert opacity-60" />
          )}
          {agency && (
            <div className="text-xs text-white/30 space-y-1">
              <p>{agency.name}</p>
              <p>{[agency.whatsapp, agency.email, agency.website].filter(Boolean).join('  ·  ')}</p>
            </div>
          )}
          <p className="text-[10px] mt-4 text-white/15">
            Valores sujeitos a disponibilidade e alterações sem aviso prévio.
          </p>
        </div>
      </footer>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.6s ease-out; }
      `}</style>
    </div>
  );
}

// ─── Components ──────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-1 h-7 rounded-full" style={{ background: 'linear-gradient(to bottom, #C8A45B, #E8D5A3)' }} />
      <h2 className="text-xl font-bold" style={{ color: '#0D1B2A', fontFamily: "'Georgia', serif" }}>
        {children}
      </h2>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 rounded-xl shadow-sm" style={{ background: '#fff', border: '1px solid #e8e4dc' }}>
      <p className="text-[10px] font-semibold tracking-wider uppercase mb-1" style={{ color: '#C8A45B' }}>{label}</p>
      <p className="text-sm font-bold" style={{ color: '#0D1B2A' }}>{value}</p>
    </div>
  );
}

function ServiceCard({
  name,
  description,
  catalogName,
  value,
  images,
}: {
  name: string;
  description: string;
  catalogName: string | null;
  value: number;
  images: string[];
}) {
  const [currentImg, setCurrentImg] = useState(0);

  const nextImg = () => setCurrentImg(prev => (prev + 1) % images.length);
  const prevImg = () => setCurrentImg(prev => (prev - 1 + images.length) % images.length);

  return (
    <div className="rounded-2xl overflow-hidden shadow-sm" style={{ background: '#fff', border: '1px solid #e8e4dc' }}>
      {/* Image Carousel */}
      {images.length > 0 && (
        <div className="relative" style={{ height: 240 }}>
          <img
            src={images[currentImg]}
            alt={name}
            className="w-full h-full object-cover transition-opacity duration-300"
          />
          {/* Gradient overlay at bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-20" style={{
            background: 'linear-gradient(to top, rgba(0,0,0,0.4), transparent)'
          }} />
          {/* Navigation arrows */}
          {images.length > 1 && (
            <>
              <button
                onClick={prevImg}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-sm transition-all hover:scale-110"
                style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={nextImg}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-sm transition-all hover:scale-110"
                style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              {/* Dots */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {images.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImg(idx)}
                    className="w-2 h-2 rounded-full transition-all"
                    style={{
                      background: idx === currentImg ? '#C8A45B' : 'rgba(255,255,255,0.4)',
                      transform: idx === currentImg ? 'scale(1.2)' : 'scale(1)',
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Content */}
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-bold text-base" style={{ color: '#0D1B2A', fontFamily: "'Georgia', serif" }}>
              {catalogName || name}
            </h3>
            {catalogName && description !== catalogName && description && (
              <p className="text-xs mt-1" style={{ color: '#999' }}>{description}</p>
            )}
          </div>
          {value > 0 && (
            <span className="text-base font-bold whitespace-nowrap ml-4" style={{ color: '#C8A45B' }}>
              {fmt(value)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
