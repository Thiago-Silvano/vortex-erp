import { useState, useEffect, useCallback } from 'react';
import { getImageStyle, type ImagePositionConfig } from '@/components/ImagePositionEditor';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ChevronLeft, ChevronRight, X, MapPin, Moon, Users, Plane, Check, Send } from 'lucide-react';

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

export default function PropostaClienteBuildsPage() {
  const { shortId } = useParams<{ shortId: string }>();
  const [sale, setSale] = useState<SaleData | null>(null);
  const [items, setItems] = useState<SaleItemData[]>([]);
  const [agency, setAgency] = useState<AgencyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [catalogNames, setCatalogNames] = useState<Record<string, string>>({});
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [previousChoices, setPreviousChoices] = useState<string[] | null>(null);
  const [quoteData, setQuoteData] = useState<any>(null);

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

    const [itemsRes, agencyRes, catalogRes] = await Promise.all([
      supabase.from('sale_items').select('*').eq('sale_id', saleId).order('sort_order'),
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
    // Deduplicate
    const seen = new Set<string>();
    const dedupedItems = loadedItems.filter(item => {
      const fp = `${item.description}|${item.total_value}|${item.service_catalog_id || ''}|${JSON.stringify(item.metadata || {})}`;
      if (seen.has(fp)) return false;
      seen.add(fp);
      return true;
    });
    setItems(dedupedItems);

    if (agencyRes.data && agencyRes.data.length > 0) setAgency(agencyRes.data[0] as any);

    if ((saleData as any).quote_id) {
      const { data: qData } = await supabase.from('quotes').select('*').eq('id', (saleData as any).quote_id).single();
      if (qData) setQuoteData(qData);
    }

    // Load previous choices
    const { data: prevChoices } = await (supabase.from('client_proposal_choices' as any) as any)
      .select('*')
      .eq('sale_id', saleId)
      .order('submitted_at', { ascending: false })
      .limit(1);

    if (prevChoices && prevChoices.length > 0) {
      const ids = prevChoices[0].selected_item_ids as string[];
      if (ids && ids.length > 0) {
        setSelectedIds(new Set(ids));
        setPreviousChoices(ids);
      }
    }

    setLoading(false);
  };

  const toggleItem = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setSubmitted(false);
  };

  const selectedTotal = items.filter(i => selectedIds.has(i.id)).reduce((s, i) => s + i.total_value, 0);

  const handleSubmit = async () => {
    if (selectedIds.size === 0 || !sale) return;
    setSubmitting(true);
    try {
      await (supabase.from('client_proposal_choices' as any) as any).insert({
        sale_id: sale.id,
        client_name: sale.client_name,
        selected_item_ids: Array.from(selectedIds),
        total_value: selectedTotal,
      });
      setSubmitted(true);
      setPreviousChoices(Array.from(selectedIds));
    } catch (e) {
      console.error(e);
    }
    setSubmitting(false);
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

  const destination = (sale as any).destination_name || quoteData?.trip_destination || '';
  const departureDate = quoteData?.trip_departure_date || (sale as any).trip_start_date;
  const returnDate = quoteData?.trip_return_date || (sale as any).trip_end_date;
  const nights = (sale as any).trip_nights || quoteData?.trip_nights || 0;
  const passengersCount = (sale as any).passengers_count || quoteData?.client_passengers || 1;
  const heroImage = sale.destination_image_url || quoteData?.destination_image_url;
  const heroImageConfig: ImagePositionConfig | null = (sale as any).destination_image_config || null;
  const proposalOptions: ProposalPaymentOption[] = ((sale as any).proposal_payment_options || []).filter((opt: any) => opt.enabled !== false);
  const showPerPassenger = (sale as any).show_per_passenger === true && passengersCount > 1;

  const getOptTotal = (opt: ProposalPaymentOption) => {
    if (opt.fixedValue && opt.fixedValue > 0) return opt.fixedValue;
    const discount = opt.discountPercent || 0;
    return Math.round(selectedTotal * (1 - discount / 100) * 100) / 100;
  };
  const getOptInstallment = (opt: ProposalPaymentOption) => {
    const optTotal = getOptTotal(opt);
    return opt.installments > 0 ? Math.round((optTotal / opt.installments) * 100) / 100 : optTotal;
  };

  const infoItems = [
    destination && { icon: MapPin, label: 'Destino', value: destination },
    passengersCount > 0 && { icon: Users, label: 'Passageiros', value: String(passengersCount) },
    nights > 0 && { icon: Moon, label: 'Noites', value: String(nights) },
  ].filter(Boolean) as { icon: any; label: string; value: string }[];

  return (
    <div className="min-h-screen" style={{ background: '#F5F0E8', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      {lightbox && <ImageLightbox images={lightbox.images} initialIndex={lightbox.index} onClose={() => setLightbox(null)} />}

      {/* Hero */}
      <div className="relative" style={{ minHeight: heroImage ? 420 : 280 }}>
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

        <div className="relative z-10 w-full max-w-5xl mx-auto px-6 md:px-10 pt-6 pb-10 flex flex-col" style={{ minHeight: heroImage ? 420 : 280 }}>
          <div className="text-center my-auto py-10">
            <p className="text-xs font-semibold tracking-[6px] uppercase mb-4" style={{ color: '#C8A45B' }}>
              Monte sua viagem
            </p>
            <h1 className="text-3xl md:text-5xl font-bold mb-5 text-white" style={{ fontFamily: "'Georgia', serif", textShadow: '0 4px 30px rgba(0,0,0,0.4)' }}>
              {(sale as any).quote_title || sale.client_name}
            </h1>
            <div className="w-20 h-[2px] mx-auto mb-5" style={{ background: 'linear-gradient(90deg, transparent, #C8A45B, transparent)' }} />
            <p className="text-sm text-white/60 max-w-lg mx-auto">
              Selecione os serviços que mais lhe agradam para montar a viagem ideal. Os valores serão calculados automaticamente.
            </p>
            {departureDate && returnDate && (
              <p className="text-sm text-white/40 tracking-wide mt-3">
                {formatDateLong(departureDate)} — {formatDateLong(returnDate)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Info Bar */}
      {infoItems.length > 0 && (
        <div style={{ background: '#0D1B2A' }}>
          <div className="w-full max-w-5xl mx-auto px-6 md:px-10 py-5">
            <div className="flex justify-center gap-10">
              {infoItems.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(200,164,91,0.15)' }}>
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

      {/* Main Content */}
      <main className="w-full max-w-5xl mx-auto px-6 md:px-10 py-14 space-y-12">

        {/* Instructions */}
        <div className="rounded-2xl p-6 text-center" style={{ background: 'linear-gradient(135deg, #0D1B2A, #1B3A4B)', boxShadow: '0 4px 24px rgba(0,0,0,0.1)' }}>
          <p className="text-xs font-semibold tracking-[4px] uppercase mb-2" style={{ color: '#C8A45B' }}>
            Como funciona
          </p>
          <p className="text-white/70 text-sm max-w-xl mx-auto">
            Toque nos serviços que deseja incluir na sua viagem. Os selecionados ficarão destacados em verde. 
            Ao final, clique em <strong className="text-white">"Informar minhas escolhas"</strong> para enviar sua seleção.
          </p>
        </div>

        {previousChoices && !submitted && (
          <div className="rounded-xl p-4 text-center text-sm" style={{ background: '#e8f5e9', color: '#2e7d32', border: '1px solid #a5d6a7' }}>
            ✅ Você já enviou uma seleção anteriormente. Pode modificar suas escolhas e enviar novamente.
          </div>
        )}

        {/* Services Selection */}
        <section>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-1 h-8 rounded-full" style={{ background: 'linear-gradient(to bottom, #C8A45B, #E8D5A3)' }} />
            <h2 className="text-2xl font-bold" style={{ color: '#0D1B2A', fontFamily: "'Georgia', serif" }}>Selecione seus serviços</h2>
          </div>

          <div className="space-y-4">
            {[...items].sort((a, b) => {
              const rank = (it: any) => {
                const t = it.metadata?.type || '';
                if (t === 'aereo') return 0;
                if (t === 'hotel') return 1;
                const catName = (it.service_catalog_id ? catalogNames[it.service_catalog_id] : '') || '';
                const s = ((it.description || '') + ' ' + catName).toLowerCase();
                if (/(aére|aere|passage|voo|flight|airline)/.test(s)) return 0;
                if (/(hosped|hotel|pousad|resort|acomoda)/.test(s)) return 1;
                if (/(servi|experi|passei|tour|traslado|transfer|seguro|aluguel|ingresso)/.test(s)) return 2;
                return 3;
              };
              return rank(a) - rank(b);
            }).map((item, idx) => {
              const isSelected = selectedIds.has(item.id);
              const name = item.metadata?.hotel?.hotelName || item.metadata?.hotelName || item.description || (item.service_catalog_id ? catalogNames[item.service_catalog_id] : null) || `Serviço ${idx + 1}`;
              const hasImages = item.images.length > 0;
              const meta = item.metadata as any;
              const isAereo = meta?.type === 'aereo';
              const isHotel = meta?.type === 'hotel';
              const typeEmoji: Record<string, string> = { aereo: '✈️', hotel: '🏨', carro: '🚗', seguro: '🛡️', experiencia: '🎟️', adicional: '📋' };

              const supplierName = meta?.supplier || meta?.hotel?.supplier || '';
              const location = meta?.location || meta?.hotel?.city || meta?.hotel?.address || '';
              const startDate = meta?.startDate || meta?.hotel?.checkInDate || '';
              const endDate = meta?.endDate || meta?.hotel?.checkOutDate || '';
              const roomType = meta?.hotel?.roomType || meta?.hotel?.accommodation || '';
              const boardType = meta?.hotel?.boardType || meta?.hotel?.regime || '';
              const flightCode = meta?.flightCode || '';
              const baggageInfo = meta?.baggage;

              return (
                <div
                  key={item.id}
                  className="rounded-2xl overflow-hidden transition-all duration-300"
                  style={{
                    background: '#fff',
                    boxShadow: isSelected ? '0 4px 24px rgba(34,197,94,0.2)' : '0 4px 24px rgba(0,0,0,0.06)',
                    border: isSelected ? '3px solid #22c55e' : '3px solid transparent',
                    transform: isSelected ? 'scale(1.01)' : 'scale(1)',
                  }}
                >
                  <div className="flex flex-col md:flex-row">
                    {/* Image */}
                    {hasImages && (
                      <div
                        className="relative w-full md:w-64 h-52 md:h-auto flex-shrink-0 overflow-hidden cursor-pointer group"
                        onClick={() => setLightbox({ images: item.images, index: 0 })}
                      >
                        <img
                          src={item.images[0]}
                          alt={name}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 w-10 h-10 rounded-full bg-white/80 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0D1B2A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="M11 8v6"/><path d="M8 11h6"/></svg>
                          </div>
                        </div>
                        {item.images.length > 1 && (
                          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white" style={{ background: 'rgba(0,0,0,0.5)' }}>
                            📷 {item.images.length} fotos
                          </div>
                        )}
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 p-5 md:p-6 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {meta?.type && <span className="text-lg">{typeEmoji[meta.type] || ''}</span>}
                              <h3 className="font-bold text-lg" style={{ color: '#0D1B2A', fontFamily: "'Georgia', serif" }}>
                                {name}
                              </h3>
                            </div>

                            {/* Detail tags */}
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {location && (
                                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full" style={{ background: '#f5f0e8', color: '#666' }}>
                                  <MapPin className="h-3 w-3" style={{ color: '#C8A45B' }} /> {location}
                                </span>
                              )}
                              {startDate && (
                                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full" style={{ background: '#f5f0e8', color: '#666' }}>
                                  📅 {formatDateBR(startDate)}{endDate ? ` - ${formatDateBR(endDate)}` : ''}
                                </span>
                              )}
                              {supplierName && (
                                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full" style={{ background: '#f5f0e8', color: '#666' }}>
                                  🏢 {supplierName}
                                </span>
                              )}
                              {roomType && (
                                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full" style={{ background: '#f5f0e8', color: '#666' }}>
                                  🛏️ {roomType}
                                </span>
                              )}
                              {boardType && (
                                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full" style={{ background: '#f5f0e8', color: '#666' }}>
                                  🍽️ {boardType}
                                </span>
                              )}
                              {isHotel && meta.hotel?.stars > 0 && (
                                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full" style={{ background: '#f5f0e8', color: '#666' }}>
                                  {'⭐'.repeat(meta.hotel.stars)}
                                </span>
                              )}
                              {flightCode && (
                                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full" style={{ background: '#f5f0e8', color: '#666' }}>
                                  🎫 {flightCode}
                                </span>
                              )}
                            </div>

                            {/* Description */}
                            {meta?.detailedDescription && (
                              <div className="text-sm leading-relaxed mt-3 line-clamp-3" style={{ color: '#777' }}
                                dangerouslySetInnerHTML={{ __html: meta.detailedDescription }} />
                            )}
                            {!meta?.detailedDescription && item.description && (
                              <p className="text-sm leading-relaxed mt-3 line-clamp-3" style={{ color: '#777' }}>
                                {item.description}
                              </p>
                            )}
                          </div>

                          {/* Price + Add button */}
                          <div className="flex-shrink-0 flex flex-col items-end gap-2">
                            <span className="text-lg font-bold whitespace-nowrap" style={{ color: isSelected ? '#22c55e' : '#C8A45B' }}>
                              {fmt(item.total_value)}
                            </span>
                            {showPerPassenger && passengersCount > 1 && (
                              <span className="text-[10px] whitespace-nowrap" style={{ color: '#999' }}>
                                {fmt(item.total_value / passengersCount)}/pessoa
                              </span>
                            )}
                            <button
                              onClick={() => toggleItem(item.id)}
                              className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110"
                              style={{
                                background: isSelected ? '#22c55e' : 'linear-gradient(135deg, #C8A45B, #E8D5A3)',
                                boxShadow: isSelected ? '0 4px 12px rgba(34,197,94,0.3)' : '0 4px 12px rgba(200,164,91,0.3)',
                              }}
                              title={isSelected ? 'Remover seleção' : 'Adicionar à viagem'}
                            >
                              {isSelected ? (
                                <Check className="h-5 w-5 text-white" />
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Flight legs */}
                        {isAereo && meta.flightLegs && meta.flightLegs.length > 0 && (() => {
                          const legs = meta.flightLegs as any[];
                          const outbound = legs.filter((l: any) => l.direction === 'ida' || l.direction !== 'volta');
                          const returnLegs = legs.filter((l: any) => l.direction === 'volta');
                          const groups: { label: string; color: string; legs: any[] }[] = [];
                          if (outbound.length > 0) groups.push({ label: 'IDA', color: '#0D1B2A', legs: outbound });
                          if (returnLegs.length > 0) groups.push({ label: 'VOLTA', color: '#C8A45B', legs: returnLegs });
                          if (groups.length === 0) groups.push({ label: 'IDA', color: '#0D1B2A', legs });

                          const extractCode = (s: string) => {
                            if (!s) return { code: '', name: '' };
                            const m = s.match(/^\s*([A-Z]{3})\b\s*[-–]?\s*(.*)$/);
                            if (m) return { code: m[1], name: m[2].trim() };
                            return { code: s.trim().slice(0, 3).toUpperCase(), name: s.trim() };
                          };

                          return (
                            <div className="mt-4 rounded-xl p-3 space-y-3" style={{ background: '#faf8f3', border: '1px solid #f0ebe0' }}>
                              {groups.map((group, gIdx) => (
                                <div key={gIdx} className="space-y-1.5">
                                  <div className="flex items-center gap-2 mb-1.5">
                                    <span
                                      className="text-[9px] font-bold tracking-[1.5px] uppercase px-2 py-0.5 rounded"
                                      style={{ background: group.color, color: '#fff' }}
                                    >
                                      {group.label}
                                    </span>
                                    <div className="flex-1 h-px" style={{ background: '#ece5d4' }} />
                                  </div>
                                  {group.legs.map((leg: any, i: number) => {
                                    const o = extractCode(leg.origin || '');
                                    const d = extractCode(leg.destination || '');
                                    return (
                                      <div
                                        key={i}
                                        className="flex items-center gap-3 px-3 py-2 rounded-lg"
                                        style={{ background: '#fff', border: '1px solid #f3ecdc' }}
                                      >
                                        <Plane className="h-3.5 w-3.5 flex-shrink-0" style={{ color: '#C8A45B' }} />

                                        {/* Origin */}
                                        <div className="flex flex-col items-start min-w-[58px]">
                                          <span className="text-sm font-bold leading-none" style={{ color: '#0D1B2A' }}>{o.code}</span>
                                          {leg.departureTime && (
                                            <span className="text-[10px] mt-0.5" style={{ color: '#888' }}>{leg.departureTime}</span>
                                          )}
                                        </div>

                                        {/* Route line */}
                                        <div className="flex-1 flex items-center gap-1 min-w-[40px]">
                                          <span className="h-px flex-1" style={{ background: '#e5dcc4' }} />
                                          <span className="text-[10px]" style={{ color: '#C8A45B' }}>→</span>
                                          <span className="h-px flex-1" style={{ background: '#e5dcc4' }} />
                                        </div>

                                        {/* Destination — fixed width */}
                                        <div className="flex flex-col items-end flex-shrink-0" style={{ width: 58 }}>
                                          <span className="text-sm font-bold leading-none" style={{ color: '#0D1B2A' }}>{d.code}</span>
                                          {leg.arrivalTime && (
                                            <span className="text-[10px] mt-0.5" style={{ color: '#888' }}>{leg.arrivalTime}</span>
                                          )}
                                        </div>

                                        {/* Date — fixed width */}
                                        <div className="flex-shrink-0 flex justify-center" style={{ width: 76 }}>
                                          {leg.departureDate && (
                                            <span className="hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap" style={{ background: '#f5f0e8', color: '#7a6a4a' }}>
                                              {formatDateBR(leg.departureDate)}
                                            </span>
                                          )}
                                        </div>

                                        {/* Flight code — fixed right column */}
                                        <div className="flex-shrink-0 flex justify-end" style={{ width: 150 }}>
                                          {leg.flightCode && (
                                            <span className="text-[10px] px-2 py-0.5 rounded font-bold tracking-wide whitespace-nowrap truncate max-w-full" style={{ background: '#0D1B2A', color: '#E8D5A3' }}>
                                              {leg.flightCode}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ))}
                            </div>
                          );
                        })()}

                        {/* Baggage info */}
                        {baggageInfo && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {baggageInfo.personalItem > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: '#e8f5e9', color: '#2e7d32' }}>👜 Item pessoal</span>}
                            {baggageInfo.carryOn > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: '#e8f5e9', color: '#2e7d32' }}>🧳 Bagagem de mão</span>}
                            {baggageInfo.checkedBag > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: '#e8f5e9', color: '#2e7d32' }}>🛄 {baggageInfo.checkedBag} despachada(s)</span>}
                          </div>
                        )}

                        {/* Hotel TripAdvisor + reservation block */}
                        {isHotel && meta?.hotel && (
                          <HotelDetailsBlock hotel={meta.hotel} />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Dynamic total + payment options */}
        {selectedIds.size > 0 && (
          <section className="animate-fadeIn">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-1 h-8 rounded-full" style={{ background: 'linear-gradient(to bottom, #22c55e, #86efac)' }} />
              <h2 className="text-2xl font-bold" style={{ color: '#0D1B2A', fontFamily: "'Georgia', serif" }}>Sua seleção</h2>
            </div>

            {/* Selected items summary */}
            <div className="rounded-2xl overflow-hidden mb-6" style={{ background: '#fff', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
              <div className="py-6 px-6 text-center" style={{ background: 'linear-gradient(135deg, #0D1B2A, #1B3A4B)' }}>
                <p className="text-xs font-semibold tracking-[4px] uppercase mb-3" style={{ color: '#22c55e' }}>
                  {selectedIds.size} {selectedIds.size === 1 ? 'serviço selecionado' : 'serviços selecionados'}
                </p>
                <span className="text-4xl md:text-6xl font-bold text-white" style={{ fontFamily: "'Georgia', serif" }}>
                  {fmt(selectedTotal)}
                </span>
                {showPerPassenger && passengersCount > 1 && (
                  <p className="text-sm text-white/40 mt-2">{fmt(selectedTotal / passengersCount)} por pessoa</p>
                )}
              </div>

              {/* Items breakdown */}
              {[...items].sort((a, b) => {
                const rank = (it: any) => {
                  const t = it.metadata?.type || '';
                  if (t === 'aereo') return 0;
                  if (t === 'hotel') return 1;
                  const catName = (it.service_catalog_id ? catalogNames[it.service_catalog_id] : '') || '';
                  const s = ((it.description || '') + ' ' + catName).toLowerCase();
                  if (/(aére|aere|passage|voo|flight|airline)/.test(s)) return 0;
                  if (/(hosped|hotel|pousad|resort|acomoda)/.test(s)) return 1;
                  if (/(servi|experi|passei|tour|traslado|transfer|seguro|aluguel|ingresso)/.test(s)) return 2;
                  return 3;
                };
                return rank(a) - rank(b);
              }).filter(i => selectedIds.has(i.id)).map((item, idx) => {
                const title = item.metadata?.hotel?.hotelName || item.metadata?.hotelName || item.description || (item.service_catalog_id ? catalogNames[item.service_catalog_id] : null) || `Serviço ${idx + 1}`;
                return (
                  <div key={idx} className="py-3 px-6 flex justify-between items-center" style={{ background: idx % 2 === 0 ? '#fff' : '#faf9f6', borderBottom: '1px solid #f0ede8' }}>
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: '#22c55e' }}>
                        <Check className="h-3 w-3 text-white" />
                      </div>
                      <span className="text-sm font-medium" style={{ color: '#2d2d2d' }}>{title}</span>
                    </div>
                    <span className="text-sm font-semibold tabular-nums" style={{ color: '#22c55e' }}>{fmt(item.total_value)}</span>
                  </div>
                );
              })}
            </div>

            {/* Payment options dynamic */}
            {proposalOptions.length > 0 && (
              <div className="mb-8">
                <p className="text-xs font-semibold tracking-[3px] uppercase mb-4" style={{ color: '#999' }}>Opções de pagamento</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {proposalOptions.map((opt, idx) => {
                    const isHighlighted = opt.highlighted === true;
                    const optTotal = getOptTotal(opt);
                    const optInstallment = getOptInstallment(opt);
                    const optPerPerson = (opt.showPerPerson && passengersCount > 1) || showPerPassenger;
                    const displayTotal = optPerPerson ? optTotal / passengersCount : optTotal;
                    const displayInstallment = optPerPerson ? optInstallment / passengersCount : optInstallment;

                    return (
                      <div key={idx} className="rounded-2xl overflow-hidden" style={{
                        background: '#fff',
                        boxShadow: isHighlighted ? '0 8px 32px rgba(34,197,94,0.15)' : '0 4px 24px rgba(0,0,0,0.06)',
                        border: isHighlighted ? '2px solid #22c55e' : 'none',
                      }}>
                        {isHighlighted && (
                          <div className="text-center py-1.5 text-[10px] font-bold tracking-[2px] uppercase text-white" style={{ background: 'linear-gradient(90deg, #22c55e, #86efac, #22c55e)' }}>
                            Mais popular
                          </div>
                        )}
                        <div className="py-5 px-5 text-center" style={{ background: isHighlighted ? 'linear-gradient(135deg, #0D1B2A, #1B3A4B)' : '#fff' }}>
                          <p className="text-xs font-semibold tracking-[2px] uppercase mb-2" style={{ color: isHighlighted ? '#22c55e' : '#999' }}>
                            {opt.label}
                            {(opt.discountPercent || 0) > 0 && <span className="block text-[10px] mt-0.5" style={{ color: isHighlighted ? 'rgba(255,255,255,0.5)' : '#bbb' }}>({opt.discountPercent}% desc.)</span>}
                            {(opt.discountPercent || 0) < 0 && <span className="block text-[10px] mt-0.5" style={{ color: isHighlighted ? 'rgba(255,255,255,0.5)' : '#bbb' }}>({Math.abs(opt.discountPercent)}% acrés.)</span>}
                          </p>
                          {opt.installments > 1 ? (
                            <div className="flex items-baseline justify-center gap-1.5">
                              <span className="text-2xl font-bold" style={{ color: isHighlighted ? '#22c55e' : '#0D1B2A', fontFamily: "'Georgia', serif" }}>{opt.installments}x</span>
                              <span className="text-xs" style={{ color: isHighlighted ? 'rgba(255,255,255,0.5)' : '#999' }}>de</span>
                              <span className="text-xl font-bold" style={{ color: isHighlighted ? '#fff' : '#0D1B2A', fontFamily: "'Georgia', serif" }}>{fmt(displayInstallment)}</span>
                            </div>
                          ) : (
                            <span className="text-2xl font-bold" style={{ color: isHighlighted ? '#fff' : '#0D1B2A', fontFamily: "'Georgia', serif" }}>{fmt(displayTotal)}</span>
                          )}
                          {optPerPerson && passengersCount > 1 && <p className="text-xs mt-1" style={{ color: isHighlighted ? 'rgba(255,255,255,0.4)' : '#bbb' }}>por pessoa</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Submit button */}
            {!submitted ? (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full py-4 rounded-2xl text-white font-bold text-lg flex items-center justify-center gap-3 transition-all hover:brightness-110 hover:scale-[1.01] disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', boxShadow: '0 8px 24px rgba(34,197,94,0.3)' }}
              >
                {submitting ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="h-5 w-5" />
                    Informar minhas escolhas
                  </>
                )}
              </button>
            ) : (
              <div className="rounded-2xl p-8 text-center" style={{ background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', border: '2px solid #86efac' }}>
                <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: '#22c55e' }}>
                  <Check className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2" style={{ color: '#166534', fontFamily: "'Georgia', serif" }}>
                  Escolhas enviadas com sucesso!
                </h3>
                <p className="text-sm" style={{ color: '#15803d' }}>
                  Suas preferências foram enviadas para a agência. Entraremos em contato em breve para finalizar sua viagem!
                </p>
                <p className="text-xs mt-4" style={{ color: '#22c55e' }}>
                  Você pode modificar suas escolhas e enviar novamente se desejar.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="mt-4 px-6 py-2 rounded-xl text-sm font-semibold transition-all hover:brightness-110"
                  style={{ background: '#22c55e', color: '#fff' }}
                >
                  Modificar escolhas
                </button>
              </div>
            )}
          </section>
        )}

        {selectedIds.size === 0 && (
          <div className="text-center py-12">
            <p className="text-lg" style={{ color: '#999' }}>
              Selecione pelo menos um serviço acima para ver o resumo e as opções de pagamento.
            </p>
          </div>
        )}
      </main>

      {/* Floating total bar */}
      {selectedIds.size > 0 && !submitted && (
        <div className="fixed bottom-0 left-0 right-0 z-50 py-3 px-6" style={{ background: 'linear-gradient(135deg, #0D1B2A, #1B3A4B)', borderTop: '2px solid #22c55e', boxShadow: '0 -4px 20px rgba(0,0,0,0.2)' }}>
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div>
              <p className="text-xs text-white/50">{selectedIds.size} {selectedIds.size === 1 ? 'serviço' : 'serviços'}</p>
              <p className="text-xl font-bold text-white" style={{ fontFamily: "'Georgia', serif" }}>{fmt(selectedTotal)}</p>
            </div>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-3 rounded-xl font-bold text-white flex items-center gap-2 transition-all hover:brightness-110 disabled:opacity-60"
              style={{ background: '#22c55e' }}
            >
              <Send className="h-4 w-4" />
              Enviar escolhas
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="py-12 px-6" style={{ background: '#0D1B2A', marginBottom: selectedIds.size > 0 && !submitted ? 72 : 0 }}>
        <div className="max-w-5xl mx-auto text-center">
          <div className="w-20 h-[2px] mx-auto mb-8" style={{ background: 'linear-gradient(90deg, transparent, #C8A45B, transparent)' }} />
          {agency && (
            <div className="text-xs text-white/25 space-y-1">
              <p>{[agency.whatsapp, agency.email, agency.website].filter(Boolean).join('  ·  ')}</p>
            </div>
          )}
          <p className="text-[10px] mt-6 text-white/10">Valores sujeitos a disponibilidade e alterações sem aviso prévio.</p>
        </div>
      </footer>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.6s ease-out; }
      `}</style>
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
  const hasReservation = !!(hotel.checkInDate || hotel.checkOutDate || hotel.roomType || hotel.guestCount || hotel.nightsCount);
  if (!hasTA && !hasReservation && !hotel.amenities?.length && !hotel.description) return null;

  return (
    <div className="mt-4 pt-4 space-y-4" style={{ borderTop: '1px solid #f0ede8' }}>
      {hotel.description && (
        <p className="text-sm leading-relaxed" style={{ color: '#555' }}>{hotel.description}</p>
      )}

      {hotel.amenities && hotel.amenities.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {hotel.amenities.map((a: string, i: number) => (
            <span key={i} className="px-2.5 py-1 rounded-full text-[11px] font-medium"
              style={{ background: '#ede9fe', color: '#6d28d9' }}>{a}</span>
          ))}
        </div>
      )}

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

      {hasReservation && (
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
