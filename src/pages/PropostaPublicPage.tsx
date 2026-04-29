import React, { useState, useEffect, useCallback } from 'react';
import { getImageStyle, type ImagePositionConfig } from '@/components/ImagePositionEditor';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ChevronLeft, ChevronRight, X, MapPin, Calendar, Moon, Users, Plane } from 'lucide-react';

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
  passengers_count?: number;
  trip_nights?: number;
  trip_start_date?: string;
  trip_end_date?: string;
  proposal_payment_options?: ProposalPaymentOption[];
  show_individual_values?: boolean;
}

interface ProposalPaymentOption {
  method: string;
  label: string;
  installments: number;
  discountPercent: number;
  enabled: boolean;
  fixedValue?: number;
  showPerPerson?: boolean;
  highlighted?: boolean;
}

interface SaleItemData {
  id: string;
  description: string;
  total_value: number;
  service_catalog_id: string | null;
  images: string[];
  metadata?: any;
  quote_option_id?: string | null;
}

interface QuoteOptionData {
  id: string;
  name: string;
  order_index: number;
}

interface PassengerData { first_name: string; last_name: string; is_main: boolean; }
interface ReceivableData { installment_number: number; amount: number; due_date: string | null; }
interface AgencyData { name: string; whatsapp: string; email: string; website: string; logo_url: string | null; }

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

// ─── Lightbox Carousel ─────────────────────────────────────
function ImageLightbox({ images, initialIndex, onClose }: { images: string[]; initialIndex: number; onClose: () => void }) {
  const [idx, setIdx] = useState(initialIndex);
  const next = useCallback(() => setIdx(p => (p + 1) % images.length), [images.length]);
  const prev = useCallback(() => setIdx(p => (p - 1 + images.length) % images.length), [images.length]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, next, prev]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" />
      <button onClick={onClose} className="absolute top-5 right-5 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
        <X className="h-5 w-5" />
      </button>
      {images.length > 1 && (
        <>
          <button onClick={e => { e.stopPropagation(); prev(); }} className="absolute left-4 z-10 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all hover:scale-110">
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button onClick={e => { e.stopPropagation(); next(); }} className="absolute right-4 z-10 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all hover:scale-110">
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}
      <img src={images[idx]} alt="" onClick={e => e.stopPropagation()} className="relative z-10 max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl" />
      {images.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex gap-2">
          {images.map((_, i) => (
            <button key={i} onClick={e => { e.stopPropagation(); setIdx(i); }}
              className="w-2.5 h-2.5 rounded-full transition-all"
              style={{ background: i === idx ? '#C8A45B' : 'rgba(255,255,255,0.3)', transform: i === idx ? 'scale(1.3)' : 'scale(1)' }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

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
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);
  const [quoteOptions, setQuoteOptions] = useState<QuoteOptionData[]>([]);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);

  useEffect(() => {
    if (!shortId) return;
    loadProposal();
  }, [shortId]);

  const loadProposal = async () => {
    setLoading(true);
    const { data: saleData, error } = await (supabase.from('sales').select('*') as any).eq('short_id', shortId).single();
    if (error || !saleData) { setNotFound(true); setLoading(false); return; }
    setSale(saleData as any);

    const saleId = saleData.id;
    const empresaId = (saleData as any).empresa_id;

    const [itemsRes, passengersRes, receivablesRes, agencyRes, catalogRes] = await Promise.all([
      supabase.from('sale_items').select('*').eq('sale_id', saleId).order('sort_order'),
      supabase.from('sale_passengers' as any).select('*').eq('sale_id', saleId).order('sort_order') as any,
      supabase.from('receivables').select('*').eq('sale_id', saleId).order('installment_number'),
      empresaId ? supabase.from('agency_settings').select('*').eq('empresa_id', empresaId).limit(1) : supabase.from('agency_settings').select('*').limit(1),
      supabase.from('services_catalog').select('id, name'),
    ]);

    const nameMap: Record<string, string> = {};
    if (catalogRes.data) catalogRes.data.forEach((c: any) => { nameMap[c.id] = c.name; });
    setCatalogNames(nameMap);

    const loadedItems: SaleItemData[] = [];
    if (itemsRes.data) {
      for (const item of itemsRes.data) {
        const { data: imgs } = await (supabase.from('sale_item_images' as any) as any).select('image_url').eq('sale_item_id', item.id).order('sort_order');
        loadedItems.push({
          id: item.id, description: item.description, total_value: Number(item.total_value),
          service_catalog_id: item.service_catalog_id, images: imgs?.map((i: any) => i.image_url) || [],
          metadata: (item as any).metadata || {},
          quote_option_id: (item as any).quote_option_id || null,
        });
      }
    }
    setItems(loadedItems);

    // Load quote options
    const { data: optionsData } = await (supabase.from('sale_quote_options' as any) as any).select('*').eq('sale_id', saleId).order('order_index');
    if (optionsData && optionsData.length > 1) {
      setQuoteOptions(optionsData);
      setSelectedOptionId(optionsData[0].id);
    }

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
          <p className="text-white/60 text-sm">Carregando sua proposta...</p>
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

  // Filter items by selected option if options exist, then deduplicate by description+metadata fingerprint
  const rawFilteredItems = quoteOptions.length > 1 && selectedOptionId
    ? items.filter(i => i.quote_option_id === selectedOptionId)
    : items;
  
  // Deduplicate items that may have been saved multiple times for the same option
  const filteredItems = (() => {
    const seen = new Set<string>();
    const deduped = rawFilteredItems.filter(item => {
      const fp = `${item.description}|${item.total_value}|${item.service_catalog_id || ''}|${JSON.stringify(item.metadata || {})}`;
      if (seen.has(fp)) return false;
      seen.add(fp);
      return true;
    });
    // Sort by category: Aéreo → Hospedagem → Serviços/Experiências/Passeios → Outros
    const categoryRank = (item: any): number => {
      const catName = (item.service_catalog_id ? catalogNames[item.service_catalog_id] : '') || '';
      const desc = (item.description || '') + ' ' + catName;
      const s = desc.toLowerCase();
      if (/(aére|aere|passage|voo|flight|airline|air\b)/.test(s)) return 0;
      if (/(hosped|hotel|pousad|resort|acomoda|lodging)/.test(s)) return 1;
      if (/(servi|experi|passei|tour|traslado|transfer|seguro|aluguel|car\b|ingresso)/.test(s)) return 2;
      return 3;
    };
    return deduped
      .map((item, idx) => ({ item, idx, rank: categoryRank(item) }))
      .sort((a, b) => a.rank - b.rank || a.idx - b.idx)
      .map(x => x.item);
  })();

  const totalSale = filteredItems.reduce((s, i) => s + i.total_value, 0);
  const destination = (sale as any).destination_name || quoteData?.trip_destination || '';
  const origin = quoteData?.trip_origin || '';
  const departureDate = quoteData?.trip_departure_date || (sale as any).trip_start_date;
  const returnDate = quoteData?.trip_return_date || (sale as any).trip_end_date;
  const nights = (sale as any).trip_nights || quoteData?.trip_nights || 0;
  const passengersCount = (sale as any).passengers_count || quoteData?.client_passengers || passengers.length || 1;
  const heroImage = sale.destination_image_url || quoteData?.destination_image_url;
  const heroImageConfig: ImagePositionConfig | null = (sale as any).destination_image_config || null;
  const proposalOptions: ProposalPaymentOption[] = ((sale as any).proposal_payment_options || []).filter((opt: any) => opt.enabled !== false);
  const showPerPassenger = (sale as any).show_per_passenger === true && passengersCount > 1;
  const showOnlyTotal = (sale as any).show_only_total === true;

  // Helper to compute option total/installment from discount
  const getOptTotal = (opt: ProposalPaymentOption) => {
    if (opt.fixedValue && opt.fixedValue > 0) return opt.fixedValue;
    const discount = opt.discountPercent || 0;
    return Math.round(totalSale * (1 - discount / 100) * 100) / 100;
  };
  const getOptInstallment = (opt: ProposalPaymentOption) => {
    const optTotal = getOptTotal(opt);
    return opt.installments > 0 ? Math.round((optTotal / opt.installments) * 100) / 100 : optTotal;
  };

  const methodLabels: Record<string, string> = {
    pix: 'PIX', credito: 'Cartão de Crédito', boleto: 'Boleto Bancário', dinheiro: 'Dinheiro',
  };

  const infoItems = [
    origin && { icon: MapPin, label: 'Origem', value: origin },
    destination && { icon: MapPin, label: 'Destino', value: destination },
    passengersCount > 0 && { icon: Users, label: 'Passageiros', value: String(passengersCount) },
    nights > 0 && { icon: Moon, label: 'Noites', value: String(nights) },
  ].filter(Boolean) as { icon: any; label: string; value: string }[];

  const perPersonTotal = passengersCount > 1 ? totalSale / passengersCount : totalSale;

  return (
    <div className="min-h-screen" style={{ background: '#F5F0E8', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      {lightbox && <ImageLightbox images={lightbox.images} initialIndex={lightbox.index} onClose={() => setLightbox(null)} />}

      {/* ── Hero ── */}
      <div className="relative" style={{ minHeight: heroImage ? 520 : 340 }}>
        {heroImage && (
          <div className="absolute inset-0 overflow-hidden" style={{ border: '4px solid #C8A45B' }}>
            <img src={heroImage} alt={destination || 'Destino'} className="w-full h-full" style={getImageStyle(heroImageConfig)} />
          </div>
        )}
        <div className="absolute inset-0" style={{
          background: heroImage
            ? 'linear-gradient(to bottom, rgba(13,27,42,0.2) 0%, rgba(13,27,42,0.55) 40%, rgba(13,27,42,0.95) 100%)'
            : 'linear-gradient(135deg, #0D1B2A 0%, #1B3A4B 100%)',
        }} />
        <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(90deg, #C8A45B, #E8D5A3, #C8A45B)' }} />

        <div className="relative z-10 w-full max-w-5xl mx-auto px-6 md:px-10 pt-6 pb-10 flex flex-col" style={{ minHeight: heroImage ? 520 : 340 }}>
          <div className="flex items-start justify-between">
            <div>
              {/* Logo tripled */}
              <img src="/images/vortex-logo-white.png" alt="Vortex" className="h-[252px] opacity-90" />
            </div>
            <div className="text-right text-xs text-white/40">
              {agency && (
                <>
                  {agency.whatsapp && <p>{agency.whatsapp}</p>}
                  {agency.email && <p>{agency.email}</p>}
                </>
              )}
            </div>
          </div>

          <div className="text-center my-auto py-10">
            <p className="text-xs font-semibold tracking-[6px] uppercase mb-4" style={{ color: '#C8A45B' }}>
              Viagem personalizada para
            </p>
            <h1 className="text-4xl md:text-6xl font-bold mb-5 text-white" style={{ fontFamily: "'Georgia', serif", textShadow: '0 4px 30px rgba(0,0,0,0.4)', letterSpacing: '-0.02em' }}>
              {(sale as any).quote_title || sale.client_name}
            </h1>
            <div className="w-20 h-[2px] mx-auto mb-5" style={{ background: 'linear-gradient(90deg, transparent, #C8A45B, transparent)' }} />
            {destination && (
              <p className="text-xl md:text-2xl font-medium text-white/90 mb-3" style={{ fontFamily: "'Georgia', serif" }}>
                {destination}
              </p>
            )}
            {departureDate && returnDate && (
              <p className="text-sm text-white/50 tracking-wide">
                {formatDateLong(departureDate)} — {formatDateLong(returnDate)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Info Bar ── */}
      {infoItems.length > 0 && (
        <div style={{ background: '#0D1B2A' }}>
          <div className="w-full max-w-5xl mx-auto px-6 md:px-10 py-6">
            <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${infoItems.length}, 1fr)` }}>
              {infoItems.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(200,164,91,0.15)' }}>
                    <item.icon className="h-4 w-4" style={{ color: '#C8A45B' }} />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold tracking-[2px] uppercase" style={{ color: '#C8A45B' }}>{item.label}</p>
                    <p className="text-sm font-semibold text-white">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="h-[2px]" style={{ background: 'linear-gradient(90deg, transparent, #C8A45B 30%, #C8A45B 70%, transparent)' }} />
        </div>
      )}

      {/* ── Main Content ── */}
      <main className="w-full max-w-5xl mx-auto px-6 md:px-10 py-14 space-y-16">

        {/* Option Selector */}
        {quoteOptions.length > 1 && (
          <section>
            <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
              <div className="px-6 py-4" style={{ background: 'linear-gradient(135deg, #0D1B2A, #1B3A4B)' }}>
                <p className="text-xs font-semibold tracking-[3px] uppercase mb-3" style={{ color: '#C8A45B' }}>
                  Selecione uma opção
                </p>
                <div className="flex flex-wrap gap-2">
                  {quoteOptions.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setSelectedOptionId(opt.id)}
                      className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
                      style={{
                        background: selectedOptionId === opt.id
                          ? 'linear-gradient(135deg, #C8A45B, #E8D5A3)'
                          : 'rgba(255,255,255,0.08)',
                        color: selectedOptionId === opt.id ? '#0D1B2A' : 'rgba(255,255,255,0.6)',
                        border: selectedOptionId === opt.id ? 'none' : '1px solid rgba(255,255,255,0.15)',
                      }}
                    >
                      {opt.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Services */}
        {filteredItems.length > 0 && (
          <section>
            <SectionTitle>O que está incluso</SectionTitle>
            <div className="mt-8 space-y-5">
              {filteredItems.map((item, idx) => {
                const name = item.description || (item.service_catalog_id ? catalogNames[item.service_catalog_id] : null) || `Serviço ${idx + 1}`;
                return (
                  <ServiceCard
                    key={idx}
                    name={name || `Serviço ${idx + 1}`}
                    description={item.metadata?.detailedDescription || item.description}
                    catalogName={item.service_catalog_id ? catalogNames[item.service_catalog_id] : null}
                    value={item.total_value}
                    images={item.images}
                    metadata={item.metadata}
                    passengersCount={passengersCount}
                    showValue={(sale as any).show_individual_values !== false}
                    onImageClick={(imgIdx) => setLightbox({ images: item.images, index: imgIdx })}
                  />
                );
              })}
            </div>
          </section>
        )}

        {/* Financial */}
        <section>
          <SectionTitle>Investimento</SectionTitle>
          <div className="mt-8 rounded-2xl overflow-hidden" style={{ background: '#fff', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>

            {/* Prominent per-person installment hero */}
            {sale.installments > 1 && receivables.length > 0 && !((sale as any).show_individual_values === true) && (
              <div className="text-center py-10 px-8" style={{ background: 'linear-gradient(135deg, #0D1B2A, #1B3A4B)' }}>
                <p className="text-xs font-semibold tracking-[4px] uppercase mb-4" style={{ color: '#C8A45B' }}>
                  {showPerPassenger ? 'Investimento por pessoa' : 'Investimento total'}
                </p>
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-5xl md:text-7xl font-bold" style={{ color: '#C8A45B', fontFamily: "'Georgia', serif" }}>
                    {sale.installments}x
                  </span>
                  <span className="text-lg md:text-xl text-white/60 font-medium">de</span>
                  <span className="text-4xl md:text-6xl font-bold text-white" style={{ fontFamily: "'Georgia', serif" }}>
                    {fmt(showPerPassenger
                      ? (receivables[0]?.amount || (totalSale / sale.installments)) / passengersCount
                      : (receivables[0]?.amount || (totalSale / sale.installments))
                    )}
                  </span>
                </div>
                {showPerPassenger && <p className="text-sm text-white/40 mt-2">por pessoa</p>}
                <div className="w-16 h-[1px] mx-auto my-5" style={{ background: 'rgba(200,164,91,0.3)' }} />
                <p className="text-sm text-white/30">
                  Valor total da viagem: <span className="font-semibold text-white/50">{fmt(totalSale)}</span>
                </p>
                {showPerPassenger && passengersCount > 1 && (
                  <p className="text-xs text-white/20 mt-1">
                    {fmt(perPersonTotal)} por pessoa à vista · {passengersCount} passageiros
                  </p>
                )}
              </div>
            )}

            {/* Single payment (no installments) hero */}
            {(sale.installments <= 1 || receivables.length === 0) && !((sale as any).show_individual_values === true) && (
              <div className="text-center py-10 px-8" style={{ background: 'linear-gradient(135deg, #0D1B2A, #1B3A4B)' }}>
                <p className="text-xs font-semibold tracking-[4px] uppercase mb-4" style={{ color: '#C8A45B' }}>
                  {showPerPassenger ? 'Investimento por pessoa' : 'Investimento total'}
                </p>
                <span className="text-5xl md:text-7xl font-bold text-white" style={{ fontFamily: "'Georgia', serif" }}>
                  {fmt(showPerPassenger ? perPersonTotal : totalSale)}
                </span>
                {showPerPassenger && passengersCount > 1 && (
                  <>
                    <p className="text-sm text-white/40 mt-2">por pessoa</p>
                    <div className="w-16 h-[1px] mx-auto my-5" style={{ background: 'rgba(200,164,91,0.3)' }} />
                    <p className="text-sm text-white/30">
                      Valor total: <span className="font-semibold text-white/50">{fmt(totalSale)}</span> · {passengersCount} passageiros
                    </p>
                  </>
                )}
              </div>
            )}

            {/* Items breakdown - show service names when show_individual_values is true */}
            {(sale as any).show_individual_values === true && filteredItems.map((item, idx) => {
              const meta = item.metadata as any;
              const title = meta?.hotelName || meta?.name || item.description || (item.service_catalog_id ? catalogNames[item.service_catalog_id] : null) || `Serviço ${idx + 1}`;
              const subtitle = meta?.detailedDescription || null;
              return (
                <div key={idx} className="py-4 px-8" style={{
                  background: idx % 2 === 0 ? '#fff' : '#faf9f6', borderBottom: '1px solid #f0ede8'
                }}>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium" style={{ color: '#2d2d2d' }}>{title}</span>
                    <span className="text-sm font-semibold tabular-nums" style={{ color: '#C8A45B' }}>{fmt(item.total_value)}</span>
                  </div>
                  {subtitle && (
                    <p className="text-xs mt-1 leading-relaxed line-clamp-2" style={{ color: '#999' }} dangerouslySetInnerHTML={{ __html: subtitle }} />
                  )}
                </div>
              );
            })}
          </div>

          {/* WhatsApp CTA after investment */}
          <a
            href="https://wa.me/554835000975?text=Ol%C3%A1!%20Tenho%20interesse%20na%20proposta%20de%20viagem."
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 w-full py-4 mt-6 rounded-xl text-white font-semibold text-base transition-all hover:brightness-110 hover:scale-[1.01]"
            style={{ background: 'linear-gradient(135deg, #25D366, #128C7E)' }}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            Fale conosco pelo WhatsApp
          </a>
        </section>

        {/* Payment Options + Notes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {showOnlyTotal ? (
            <section className="md:col-span-2">
              <SectionTitle>Investimento</SectionTitle>
              <div className="mt-8 p-8 rounded-2xl text-center" style={{ background: '#fff', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
                <p className="text-xs font-semibold tracking-[3px] uppercase mb-3" style={{ color: '#999' }}>Valor Total</p>
                <span className="text-4xl font-bold" style={{ color: '#0D1B2A', fontFamily: "'Georgia', serif" }}>
                  {fmt(totalSale)}
                </span>
                {showPerPassenger && passengersCount > 1 && (
                  <p className="text-sm mt-2" style={{ color: '#888' }}>
                    {fmt(totalSale / passengersCount)} por pessoa
                  </p>
                )}
              </div>
            </section>
          ) : (
          <section className={proposalOptions.length > 0 ? 'md:col-span-2' : ''}>
            <SectionTitle>Opções de pagamento</SectionTitle>
            {proposalOptions.length > 0 ? (() => {
              return (
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {proposalOptions.map((opt, idx) => {
                  const isHighlighted = opt.highlighted === true;
                  return (
                  <div key={idx} className="rounded-2xl overflow-hidden relative" style={{ background: '#fff', boxShadow: isHighlighted ? '0 8px 32px rgba(200,164,91,0.25)' : '0 4px 24px rgba(0,0,0,0.06)', border: isHighlighted ? '2px solid #C8A45B' : 'none' }}>
                    {isHighlighted && (
                      <div className="text-center py-1.5 text-[10px] font-bold tracking-[2px] uppercase text-white" style={{ background: 'linear-gradient(90deg, #C8A45B, #E8D5A3, #C8A45B)' }}>
                        Mais popular
                      </div>
                    )}
                    <div className="py-6 px-6 text-center" style={{ background: isHighlighted ? 'linear-gradient(135deg, #0D1B2A, #1B3A4B)' : '#fff' }}>
                      <p className="text-xs font-semibold tracking-[3px] uppercase mb-3" style={{ color: isHighlighted ? '#C8A45B' : '#999' }}>
                        {opt.label}
                        {(opt.discountPercent || 0) > 0 && (
                          <span className="block text-[10px] mt-1" style={{ color: isHighlighted ? 'rgba(255,255,255,0.5)' : '#bbb' }}>
                            ({opt.discountPercent}% de desconto)
                          </span>
                        )}
                        {(opt.discountPercent || 0) < 0 && (
                          <span className="block text-[10px] mt-1" style={{ color: isHighlighted ? 'rgba(255,255,255,0.5)' : '#bbb' }}>
                            ({Math.abs(opt.discountPercent)}% de acréscimo)
                          </span>
                        )}
                      </p>
                      {(() => {
                        const optTotal = getOptTotal(opt);
                        const optInstallment = getOptInstallment(opt);
                        const optPerPerson = (opt.showPerPerson && passengersCount > 1) || showPerPassenger;
                        const displayTotal = optPerPerson ? optTotal / passengersCount : optTotal;
                        const displayInstallment = optPerPerson ? optInstallment / passengersCount : optInstallment;
                        return (
                          <>
                            {opt.installments > 1 ? (
                              <div className="flex items-baseline justify-center gap-1.5">
                                <span className="text-3xl font-bold" style={{ color: isHighlighted ? '#C8A45B' : '#0D1B2A', fontFamily: "'Georgia', serif" }}>
                                  {opt.installments}x
                                </span>
                                <span className="text-sm" style={{ color: isHighlighted ? 'rgba(255,255,255,0.5)' : '#999' }}>de</span>
                                <span className="text-2xl font-bold" style={{ color: isHighlighted ? '#fff' : '#0D1B2A', fontFamily: "'Georgia', serif" }}>
                                  {fmt(displayInstallment)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-3xl font-bold" style={{ color: isHighlighted ? '#fff' : '#0D1B2A', fontFamily: "'Georgia', serif" }}>
                                {fmt(displayTotal)}
                              </span>
                            )}
                            {optPerPerson && passengersCount > 1 && (
                              <p className="text-xs mt-1" style={{ color: isHighlighted ? 'rgba(255,255,255,0.4)' : '#bbb' }}>
                                por pessoa
                              </p>
                            )}
                            {optPerPerson && passengersCount > 1 && opt.installments > 1 && (
                              <p className="text-sm font-semibold mt-2" style={{ color: isHighlighted ? 'rgba(255,255,255,0.7)' : '#555' }}>
                                {fmt(displayTotal)} por pessoa
                              </p>
                            )}
                            {optPerPerson && passengersCount > 1 && (
                              <p className="text-xs mt-1" style={{ color: isHighlighted ? 'rgba(255,255,255,0.25)' : '#ccc' }}>
                                Total geral: {fmt(optTotal)}
                              </p>
                            )}
                          </>
                        );
                      })()}
                    </div>
                    {isHighlighted && (
                      <div className="h-1" style={{ background: 'linear-gradient(90deg, #C8A45B, #E8D5A3, #C8A45B)' }} />
                    )}
                  </div>
                  );
                })}
              </div>
              );
            })() : (
              <div className="mt-8 p-6 rounded-2xl" style={{ background: '#fff', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0D1B2A, #1B3A4B)' }}>
                    <span className="text-white text-sm font-bold">$</span>
                  </div>
                  <div>
                    <p className="font-bold text-sm" style={{ color: '#0D1B2A' }}>{methodLabels[sale.payment_method || ''] || sale.payment_method}</p>
                  </div>
                </div>

                {receivables.length > 0 && (
                  <div className="space-y-1.5 pt-4" style={{ borderTop: '1px solid #f0ede8' }}>
                    {receivables.map((r, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm py-2 px-3 rounded-lg" style={{ background: idx % 2 === 0 ? '#faf9f6' : 'transparent' }}>
                        <span className="font-medium" style={{ color: '#555' }}>Parcela {r.installment_number}</span>
                        <span className="font-bold tabular-nums" style={{ color: '#2d2d2d' }}>{fmt(r.amount)}</span>
                        {r.due_date && <span className="text-xs" style={{ color: '#aaa' }}>{formatDateBR(r.due_date)}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
          )}

          {sale.notes && (
            <section>
              <SectionTitle>Observações</SectionTitle>
              <div className="mt-8 p-6 rounded-2xl text-sm leading-relaxed" style={{ background: '#fff', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', color: '#666', whiteSpace: 'pre-wrap' }}>
                {sale.notes}
              </div>
            </section>
          )}
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="py-12 px-6" style={{ background: '#0D1B2A' }}>
        <div className="max-w-5xl mx-auto text-center">
          <div className="w-20 h-[2px] mx-auto mb-8" style={{ background: 'linear-gradient(90deg, transparent, #C8A45B, transparent)' }} />
          <img src="/images/vortex-logo-white.png" alt="Vortex" className="h-48 mx-auto mb-5 opacity-50" />
          {agency && (
            <div className="text-xs text-white/25 space-y-1">
              <p>{[agency.whatsapp, agency.email, agency.website].filter(Boolean).join('  ·  ')}</p>
            </div>
          )}
          <p className="text-[10px] mt-6 text-white/10">Valores sujeitos a disponibilidade e alterações sem aviso prévio.</p>
        </div>
      </footer>

      {/* Floating WhatsApp button */}
      <a
        href="https://wa.me/554835000975?text=Ol%C3%A1!%20Tenho%20interesse%20na%20proposta%20de%20viagem."
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 flex items-center justify-center h-14 w-14 rounded-full text-white shadow-lg transition-transform hover:scale-110"
        style={{ background: '#25D366' }}
        title="Fale pelo WhatsApp"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
      </a>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.6s ease-out; }
      `}</style>
    </div>
  );
}

// ─── Sub-Components ──────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-1 h-8 rounded-full" style={{ background: 'linear-gradient(to bottom, #C8A45B, #E8D5A3)' }} />
      <h2 className="text-2xl font-bold" style={{ color: '#0D1B2A', fontFamily: "'Georgia', serif" }}>{children}</h2>
    </div>
  );
}

function ExpandableText({ text, maxLines = 4 }: { text: string; maxLines?: number }) {
  const [expanded, setExpanded] = useState(false);
  const isHtml = /<[a-z][\s\S]*>/i.test(text);
  const lines = text.split('\n');
  const needsTruncate = isHtml ? text.length > 300 : lines.length > maxLines;

  return (
    <div className="mt-2">
      {isHtml ? (
        <div
          className="text-sm leading-relaxed [&_b]:font-bold [&_strong]:font-bold [&_i]:italic [&_em]:italic"
          style={{
            color: '#888',
            ...(needsTruncate && !expanded ? {
              display: '-webkit-box',
              WebkitLineClamp: maxLines,
              WebkitBoxOrient: 'vertical' as const,
              overflow: 'hidden',
            } : {}),
          }}
          dangerouslySetInnerHTML={{ __html: text }}
        />
      ) : (
        <p
          className="text-sm leading-relaxed whitespace-pre-line"
          style={{
            color: '#888',
            ...(needsTruncate && !expanded ? {
              display: '-webkit-box',
              WebkitLineClamp: maxLines,
              WebkitBoxOrient: 'vertical' as const,
              overflow: 'hidden',
            } : {}),
          }}
        >
          {text}
        </p>
      )}
      {needsTruncate && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-base font-bold mt-2 hover:underline tracking-wide"
          style={{ color: '#C8A45B' }}
        >
          {expanded ? '▲ Ver menos' : '▼ Ver mais'}
        </button>
      )}
    </div>
  );
}

function ServiceCard({
  name, description, catalogName, value, images, metadata, passengersCount, showValue = true, onImageClick,
}: {
  name: string;
  description: string;
  catalogName: string | null;
  value: number;
  images: string[];
  metadata?: any;
  passengersCount: number;
  showValue?: boolean;
  onImageClick: (idx: number) => void;
}) {
  const [currentImg, setCurrentImg] = useState(0);
  const nextImg = (e: React.MouseEvent) => { e.stopPropagation(); setCurrentImg(prev => (prev + 1) % images.length); };
  const prevImg = (e: React.MouseEvent) => { e.stopPropagation(); setCurrentImg(prev => (prev - 1 + images.length) % images.length); };
  const hasImages = images.length > 0;

  const isAereo = metadata?.type === 'aereo';
  const isHotel = metadata?.type === 'hotel';

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
      {/* Image area */}
      {hasImages && (
        <div className="relative cursor-pointer group" onClick={() => onImageClick(currentImg)}>
          <div className="relative overflow-hidden" style={{ height: 280 }}>
            <img src={images[currentImg]} alt={name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
            {images.length > 1 && (
              <>
                <button onClick={prevImg} className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'rgba(0,0,0,0.5)', color: '#fff' }}>
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button onClick={nextImg} className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'rgba(0,0,0,0.5)', color: '#fff' }}>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </>
            )}
            {images.length > 1 && (
              <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white" style={{ background: 'rgba(0,0,0,0.5)' }}>
                {currentImg + 1}/{images.length}
              </div>
            )}
          </div>
          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-2 p-3 overflow-x-auto" style={{ background: '#faf9f6' }}>
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={e => { e.stopPropagation(); setCurrentImg(idx); }}
                  className="flex-shrink-0 rounded-lg overflow-hidden transition-all"
                  style={{
                    width: 64, height: 48,
                    border: idx === currentImg ? '2px solid #C8A45B' : '2px solid transparent',
                    opacity: idx === currentImg ? 1 : 0.6,
                  }}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="p-6 md:p-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-1" style={{ color: '#0D1B2A', fontFamily: "'Georgia', serif" }}>
              {metadata?.hotel?.hotelName || name}
            </h3>
            {/* Detailed description with expand/collapse */}
            {metadata?.detailedDescription && (
              <ExpandableText text={metadata.detailedDescription} />
            )}
            {!metadata?.detailedDescription && catalogName && description !== catalogName && description && (
              <ExpandableText text={description} />
            )}
          </div>
          {showValue && (
            <div className="text-right flex-shrink-0">
              {value > 0 && (
                <>
                  <span className="text-lg font-bold whitespace-nowrap" style={{ color: '#C8A45B' }}>{fmt(value)}</span>
                  {passengersCount > 1 && <p className="text-[11px] mt-0.5" style={{ color: '#aaa' }}>{fmt(value / passengersCount)} /pessoa</p>}
                </>
              )}
            </div>
          )}
        </div>

        {/* Flight details */}
        {isAereo && metadata.flightLegs && metadata.flightLegs.length > 0 && (
          <div className="mt-5 pt-5" style={{ borderTop: '1px solid #f0ede8' }}>
            <div className="flex items-center gap-2 mb-4">
              <Plane className="h-4 w-4" style={{ color: '#C8A45B' }} />
              <span className="text-xs font-semibold tracking-[2px] uppercase" style={{ color: '#C8A45B' }}>Itinerário</span>
            </div>
            <div className="space-y-3">
              {(() => {
                const legs = metadata.flightLegs as any[];
                const outbound = legs.filter((l: any) => l.direction === 'ida' || l.direction !== 'volta');
                const returnLegs = legs.filter((l: any) => l.direction === 'volta');
                const groups: { label: string; legs: any[]; duration?: string }[] = [];
                if (outbound.length > 0) groups.push({ label: 'IDA', legs: outbound, duration: metadata.totalTravelDurationOutbound });
                if (returnLegs.length > 0) groups.push({ label: 'VOLTA', legs: returnLegs, duration: metadata.totalTravelDurationReturn });
                if (groups.length === 0) groups.push({ label: 'IDA', legs, duration: metadata.totalTravelDurationOutbound });

                return groups.map((group, gIdx) => {
                  // Auto-compute stopover from leg times
                  let groupStopoverMinutes = 0;
                  group.legs.forEach((leg: any, idx: number) => {
                    const nextLeg = group.legs[idx + 1];
                    if (!nextLeg) return;
                    const sameCity = leg.destination && nextLeg.origin && leg.destination.trim().toUpperCase() === nextLeg.origin.trim().toUpperCase();
                    if (!sameCity || !leg.arrivalDate || !leg.arrivalTime || !nextLeg.departureDate || !nextLeg.departureTime) return;
                    const arrival = new Date(`${leg.arrivalDate}T${leg.arrivalTime}:00`);
                    const departure = new Date(`${nextLeg.departureDate}T${nextLeg.departureTime}:00`);
                    if (isNaN(arrival.getTime()) || isNaN(departure.getTime())) return;
                    const diff = Math.round((departure.getTime() - arrival.getTime()) / 60000);
                    if (diff > 720) groupStopoverMinutes += diff;
                  });
                  // Also check stored stopover flag as fallback
                  if (groupStopoverMinutes === 0) {
                    groupStopoverMinutes = group.legs.reduce((sum: number, l: any) => sum + ((l.stopover && l.stopoverDays) ? l.stopoverDays * 1440 : 0), 0);
                  }
                  const stopDays = Math.floor(groupStopoverMinutes / 1440);
                  const stopHours = Math.floor((groupStopoverMinutes % 1440) / 60);
                  const stopMins = groupStopoverMinutes % 60;
                  const stopParts: string[] = [];
                  if (stopDays > 0) stopParts.push(`${stopDays} dia${stopDays > 1 ? 's' : ''}`);
                  if (stopHours > 0) stopParts.push(`${stopHours}h`);
                  if (stopMins > 0) stopParts.push(`${stopMins}min`);
                  const stopLabel = stopParts.join(' ');
                  return (
                  <div key={gIdx}>
                    {(group.duration || groupStopoverMinutes > 0) && (
                      <div className="flex items-center gap-2 mb-2 mt-1 flex-wrap">
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded" style={{ background: group.label === 'IDA' ? '#0D1B2A' : '#C8A45B', color: '#fff' }}>
                          {group.label}
                        </span>
                        {group.duration && <span className="text-xs" style={{ color: '#999' }}>⏱ Tempo total: <strong style={{ color: '#0D1B2A' }}>{group.duration}</strong></span>}
                        {groupStopoverMinutes > 0 && (
                          <span className="text-xs font-bold" style={{ color: '#DC2626' }}>
                            🛑 STOPOVER DE {stopLabel}
                          </span>
                        )}
                      </div>
                    )}
                    {group.legs.map((leg: any, idx: number) => (
                      <React.Fragment key={idx}>
                        <div className="flex items-center gap-4 p-3 rounded-xl mb-2" style={{ background: '#faf9f6' }}>
                          <div className="px-2 py-1 rounded text-[10px] font-bold uppercase" style={{ background: leg.direction === 'ida' ? '#0D1B2A' : '#C8A45B', color: '#fff' }}>
                            {leg.direction === 'ida' ? 'IDA' : 'VOLTA'}
                          </div>
                          <div className="flex-1 flex items-center gap-3 text-sm">
                            <div className="text-center">
                              <p className="font-bold" style={{ color: '#0D1B2A' }}>{leg.origin}</p>
                              {leg.departureTime && <p className="text-xs" style={{ color: '#999' }}>{leg.departureTime}</p>}
                              {leg.departureDate && <p className="text-[10px]" style={{ color: '#bbb' }}>{formatDateBR(leg.departureDate)}</p>}
                            </div>
                            <div className="flex-1 flex items-center gap-1">
                              <div className="flex-1 h-[1px]" style={{ background: '#ddd' }} />
                              {leg.flightCode && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: '#f0ede8', color: '#999' }}>{leg.flightCode}</span>}
                              <div className="flex-1 h-[1px]" style={{ background: '#ddd' }} />
                            </div>
                            <div className="text-center">
                              <p className="font-bold" style={{ color: '#0D1B2A' }}>{leg.destination}</p>
                              {leg.arrivalTime && <p className="text-xs" style={{ color: '#999' }}>{leg.arrivalTime}</p>}
                              {leg.arrivalDate && <p className="text-[10px]" style={{ color: '#bbb' }}>{formatDateBR(leg.arrivalDate)}</p>}
                            </div>
                          </div>
                          {leg.connectionDuration && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: '#fff3cd', color: '#856404' }}>
                              Conexão: {leg.connectionDuration}
                            </span>
                          )}
                        </div>
                        {(() => {
                          const nextLeg = group.legs[idx + 1];
                          if (!nextLeg) return null;
                          const sameCity = leg.destination && nextLeg.origin && leg.destination.trim().toUpperCase() === nextLeg.origin.trim().toUpperCase();
                          if (!sameCity || !leg.arrivalDate || !leg.arrivalTime || !nextLeg.departureDate || !nextLeg.departureTime) {
                            // Fallback to stored flag
                            if (leg.stopover && (leg.stopoverDays || 0) > 0) {
                              return (
                                <div className="flex items-center justify-center py-1">
                                  <span className="text-[10px] font-bold px-3 py-1 rounded-full" style={{ background: '#fee2e2', color: '#DC2626', border: '1px solid #DC2626' }}>
                                    🛑 STOPOVER DE {leg.stopoverDays} DIA{leg.stopoverDays > 1 ? 'S' : ''} em {leg.destination}
                                  </span>
                                </div>
                              );
                            }
                            return null;
                          }
                          const arrival = new Date(`${leg.arrivalDate}T${leg.arrivalTime}:00`);
                          const departure = new Date(`${nextLeg.departureDate}T${nextLeg.departureTime}:00`);
                          if (isNaN(arrival.getTime()) || isNaN(departure.getTime())) return null;
                          const diffMin = Math.round((departure.getTime() - arrival.getTime()) / 60000);
                          if (diffMin <= 720) return null;
                          const d = Math.floor(diffMin / 1440);
                          const h = Math.floor((diffMin % 1440) / 60);
                          const mi = diffMin % 60;
                          const ps: string[] = [];
                          if (d > 0) ps.push(`${d} DIA${d > 1 ? 'S' : ''}`);
                          if (h > 0) ps.push(`${h}H`);
                          if (mi > 0) ps.push(`${mi}MIN`);
                          return (
                            <div className="flex items-center justify-center py-1">
                              <span className="text-[10px] font-bold px-3 py-1 rounded-full" style={{ background: '#fee2e2', color: '#DC2626', border: '1px solid #DC2626' }}>
                                🛑 STOPOVER DE {ps.join(' ')} em {leg.destination}
                              </span>
                            </div>
                          );
                        })()}
                      </React.Fragment>
                    ))}
                  </div>
                  );
                });
              })()}
            </div>
            {/* Baggage info */}
            {metadata.baggage && (
              <div className="flex gap-4 mt-3 text-xs" style={{ color: '#999' }}>
                {metadata.baggage.personalItem > 0 && <span>🎒 Item pessoal: {metadata.baggage.personalItem}</span>}
                {metadata.baggage.carryOn > 0 && <span>💼 Bagagem de mão: {metadata.baggage.carryOn}</span>}
                {metadata.baggage.checkedBag > 0 && <span>🧳 Despachada: {metadata.baggage.checkedBag}</span>}
              </div>
            )}
          </div>
        )}

        {/* Hotel details */}
        {isHotel && metadata.hotel && (
          <HotelDetailsBlock hotel={metadata.hotel} />
        )}
      </div>
    </div>
  );
}

// ─────────── Hotel Details Block (TripAdvisor-style) ───────────
function HotelDetailsBlock({ hotel }: { hotel: any }) {
  const ta = {
    rating: hotel.tripadvisorRating,
    reviews: hotel.tripadvisorReviewsCount,
    ranking: hotel.tripadvisorRanking,
    badges: hotel.tripadvisorBadges as string[] | undefined,
    topReviews: hotel.tripadvisorTopReviews as string[] | undefined,
    breakdown: hotel.tripadvisorRatingBreakdown,
    mentions: hotel.tripadvisorPopularMentions as string[] | undefined,
  };
  const hasTA = !!(ta.rating || ta.ranking || ta.badges?.length || ta.topReviews?.length || ta.breakdown || ta.mentions?.length);

  return (
    <div className="mt-5 pt-5 space-y-4" style={{ borderTop: '1px solid #f0ede8' }}>
      {/* Header: stars + category + address */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          {hotel.stars > 0 && <span className="text-sm">{'⭐'.repeat(hotel.stars)}</span>}
          {hotel.category && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#f0ede8', color: '#666' }}>{hotel.category}</span>}
        </div>
        {(hotel.address || hotel.city) && (
          <p className="text-xs" style={{ color: '#888' }}>
            {hotel.address}{hotel.city ? (hotel.address ? ', ' : '') + hotel.city : ''}{hotel.country ? ', ' + hotel.country : ''}
          </p>
        )}
      </div>

      {hotel.description && (
        <p className="text-sm leading-relaxed" style={{ color: '#555' }}>{hotel.description}</p>
      )}

      {/* Amenities (badges roxas) */}
      {hotel.amenities && hotel.amenities.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {hotel.amenities.map((a: string, i: number) => (
            <span key={i} className="px-2.5 py-1 rounded-full text-[11px] font-medium"
              style={{ background: '#ede9fe', color: '#6d28d9' }}>{a}</span>
          ))}
        </div>
      )}

      {/* TripAdvisor block */}
      {hasTA && (
        <div className="pt-3 space-y-3" style={{ borderTop: '1px solid #f0ede8' }}>
          <div className="flex items-center gap-2 flex-wrap text-sm">
            <span aria-hidden style={{ fontSize: 16 }}>🦉</span>
            <span className="font-semibold" style={{ color: '#0D1B2A' }}>TripAdvisor</span>
            {ta.rating && (
              <>
                <span className="font-bold" style={{ color: '#10b981' }}>{ta.rating}</span>
                <span style={{ color: '#888', fontSize: 12 }}>/5</span>
                {ta.reviews && (
                  <span style={{ color: '#888', fontSize: 12 }}>({ta.reviews.toLocaleString('pt-BR')} avaliações)</span>
                )}
              </>
            )}
          </div>

          {ta.ranking && (
            <p className="text-xs flex items-center gap-1" style={{ color: '#666' }}>
              <span>🏆</span><span>{ta.ranking}</span>
            </p>
          )}

          {ta.badges && ta.badges.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {ta.badges.map((b, i) => (
                <span key={i} className="px-2.5 py-1 rounded-full text-[11px] font-medium inline-flex items-center gap-1"
                  style={{ background: '#d1fae5', color: '#047857' }}>🏅 {b}</span>
              ))}
            </div>
          )}

          {ta.breakdown && (
            <div className="grid grid-cols-5 gap-2 py-1">
              {[
                { label: 'Localização', value: ta.breakdown.location },
                { label: 'Limpeza', value: ta.breakdown.cleanliness },
                { label: 'Serviço', value: ta.breakdown.service },
                { label: 'Custo-benefício', value: ta.breakdown.value },
                { label: 'Quartos', value: ta.breakdown.rooms },
              ].map((it, i) => (
                <div key={i} className="text-center">
                  <div className="text-base font-bold" style={{ color: '#0D1B2A' }}>{it.value}</div>
                  <div className="text-[10px]" style={{ color: '#888' }}>{it.label}</div>
                </div>
              ))}
            </div>
          )}

          {ta.topReviews && ta.topReviews.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-semibold" style={{ color: '#0D1B2A' }}>Avaliações em destaque:</p>
              {ta.topReviews.map((r, i) => (
                <p key={i} className="text-xs italic" style={{ color: '#666' }}>"{r}"</p>
              ))}
            </div>
          )}

          {ta.mentions && ta.mentions.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {ta.mentions.map((m, i) => (
                <span key={i} className="px-2 py-0.5 rounded-full text-[10px]"
                  style={{ background: '#f1f5f9', color: '#64748b' }}>#{m}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Dados da reserva (cards) */}
      {(hotel.checkInDate || hotel.checkOutDate || hotel.roomType || hotel.guestCount || hotel.nightsCount) && (
        <div className="pt-3" style={{ borderTop: '1px solid #f0ede8' }}>
          <p className="text-xs font-semibold uppercase mb-2 tracking-wider" style={{ color: '#888' }}>Dados da Reserva</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {hotel.checkInDate && (
              <ResField label="Check-in" value={`${formatDateBR(hotel.checkInDate)}${hotel.checkInTime ? ' • ' + hotel.checkInTime : ''}`} />
            )}
            {hotel.checkOutDate && (
              <ResField label="Check-out" value={`${formatDateBR(hotel.checkOutDate)}${hotel.checkOutTime ? ' • ' + hotel.checkOutTime : ''}`} />
            )}
            {(hotel.nightsCount || 0) > 0 && (
              <ResField label="Noites" value={String(hotel.nightsCount)} />
            )}
            {hotel.roomType && (
              <ResField label="Tipo de Quarto" value={hotel.roomType} />
            )}
            {(hotel.roomCount || 0) > 0 && (
              <ResField label="Qtd. Quartos" value={String(hotel.roomCount)} />
            )}
            {(hotel.guestCount || 0) > 0 && (
              <ResField label="Hóspedes" value={String(hotel.guestCount)} />
            )}
          </div>
          {hotel.observations && (
            <p className="text-xs mt-3 italic" style={{ color: '#888' }}>📝 {hotel.observations}</p>
          )}
        </div>
      )}
    </div>
  );
}

function ResField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg px-3 py-2" style={{ background: '#faf9f6', border: '1px solid #f0ede8' }}>
      <div className="text-[10px] uppercase tracking-wider" style={{ color: '#999' }}>{label}</div>
      <div className="text-sm font-medium" style={{ color: '#0D1B2A' }}>{value}</div>
    </div>
  );
}
