import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getQuoteByShortId, getAgencySettingsFromDB, FullQuote } from '@/lib/supabase-storage';
import { AgencySettings, SERVICE_TYPE_CONFIG, ServiceItem, FlightLeg, PaymentData } from '@/types/quote';
import { MessageCircle, Plane, Hotel, Car, Shield, Ticket, FileText, MapPin, Calendar, Users, Moon, ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react';

function formatDate(d: string) {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

function formatCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function calcNights(dep: string, ret: string): number {
  if (!dep || !ret) return 0;
  const d1 = new Date(dep);
  const d2 = new Date(ret);
  return Math.max(0, Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)));
}

const SERVICE_ICONS: Record<string, React.ReactNode> = {
  aereo: <Plane className="h-5 w-5" />,
  hotel: <Hotel className="h-5 w-5" />,
  carro: <Car className="h-5 w-5" />,
  seguro: <Shield className="h-5 w-5" />,
  experiencia: <Ticket className="h-5 w-5" />,
  adicional: <FileText className="h-5 w-5" />,
};

// Image Lightbox Component
function ImageLightbox({ images, initialIndex, onClose }: { images: string[]; initialIndex: number; onClose: () => void }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') setCurrentIndex(i => (i > 0 ? i - 1 : images.length - 1));
      if (e.key === 'ArrowRight') setCurrentIndex(i => (i < images.length - 1 ? i + 1 : 0));
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', handleKey); document.body.style.overflow = ''; };
  }, [images.length, onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 text-white/80 hover:text-white z-50">
        <X className="h-8 w-8" />
      </button>
      <div className="relative w-full h-full flex items-center justify-center px-16" onClick={e => e.stopPropagation()}>
        {images.length > 1 && (
          <button
            onClick={() => setCurrentIndex(i => (i > 0 ? i - 1 : images.length - 1))}
            className="absolute left-4 bg-white/20 hover:bg-white/40 rounded-full p-2 text-white transition-colors z-50"
          >
            <ChevronLeft className="h-8 w-8" />
          </button>
        )}
        <img
          src={images[currentIndex]}
          alt=""
          className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg"
        />
        {images.length > 1 && (
          <button
            onClick={() => setCurrentIndex(i => (i < images.length - 1 ? i + 1 : 0))}
            className="absolute right-4 bg-white/20 hover:bg-white/40 rounded-full p-2 text-white transition-colors z-50"
          >
            <ChevronRight className="h-8 w-8" />
          </button>
        )}
      </div>
      {images.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
          {images.map((_, idx) => (
            <button
              key={idx}
              onClick={e => { e.stopPropagation(); setCurrentIndex(idx); }}
              className={`w-3 h-3 rounded-full transition-all ${idx === currentIndex ? 'bg-white scale-110' : 'bg-white/40'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FlightCard({ item }: { item: ServiceItem }) {
  const idaLegs = (item.flightLegs || []).filter(l => l.direction !== 'volta');
  const voltaLegs = (item.flightLegs || []).filter(l => l.direction === 'volta');

  const renderLegs = (legs: FlightLeg[], label: string) => {
    if (legs.length === 0) return null;
    return (
      <div className="space-y-3">
        <span className="bg-[#1a2744] text-white text-xs font-bold px-3 py-1 rounded">{label}</span>
        {legs.map((leg, idx) => (
          <div key={idx}>
            {idx > 0 && leg.direction === legs[idx-1]?.direction && legs[idx-1]?.connectionDuration && (
              <div className="text-center py-1">
                <span className="text-xs bg-[#c8a951]/20 text-[#c8a951] px-3 py-1 rounded-full font-medium">
                  ⏱️ Conexão: {legs[idx-1].connectionDuration}
                </span>
              </div>
            )}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <div className="flex items-center gap-4">
                <div className="flex-1 text-center">
                  <p className="text-xs text-gray-500 uppercase">Origem</p>
                  <p className="font-bold text-[#1a2744] text-sm">{leg.origin}</p>
                  {leg.departureDate && (
                    <p className="text-xs text-gray-500 mt-1">{formatDate(leg.departureDate)}{leg.departureTime ? ` às ${leg.departureTime}` : ''}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-px bg-[#c8a951]"></div>
                  <Plane className="h-4 w-4 text-[#c8a951]" />
                  <div className="w-8 h-px bg-[#c8a951]"></div>
                </div>
                <div className="flex-1 text-center">
                  <p className="text-xs text-gray-500 uppercase">Destino</p>
                  <p className="font-bold text-[#1a2744] text-sm">{leg.destination}</p>
                  {leg.arrivalDate && (
                    <p className="text-xs text-gray-500 mt-1">{formatDate(leg.arrivalDate)}{leg.arrivalTime ? ` às ${leg.arrivalTime}` : ''}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
      {item.imageBase64 && (
        <div className="w-full h-48 bg-gray-50">
          <img src={item.imageBase64} alt={item.title} className="w-full h-full object-contain" />
        </div>
      )}
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-[#1a2744]">{item.title}</h3>
            {item.supplier && (
              <p className="text-sm text-gray-500 mt-1">Cia Aérea: <span className="font-semibold text-[#1a2744]">{item.supplier}</span></p>
            )}
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-[#c8a951]">{formatCurrency(item.value)}</p>
          </div>
        </div>
        
        <div className="space-y-4">
          {renderLegs(idaLegs, '✈️ Voo de Ida')}
          {renderLegs(voltaLegs, '🔙 Voo de Volta')}
        </div>
      </div>
    </div>
  );
}

function ServiceCard({ item, isHotel }: { item: ServiceItem; isHotel?: boolean }) {
  const images = [item.imageBase64, ...(item.imagesBase64 || [])].filter(Boolean) as string[];
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  
  return (
    <>
      {lightboxIndex !== null && (
        <ImageLightbox images={images} initialIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />
      )}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
        {images.length > 0 && (
          <div
            className={`w-full ${isHotel ? 'h-72 md:h-96' : 'h-52'} overflow-hidden cursor-pointer`}
            onClick={() => setLightboxIndex(0)}
          >
            <img src={images[0]} alt={item.title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
          </div>
        )}
        <div className="p-6">
          <h3 className="text-lg font-bold text-[#1a2744] mb-2">{item.title}</h3>
          {item.description && (
            <p className="text-gray-600 text-sm mb-4 leading-relaxed">{item.description}</p>
          )}
          <div className="space-y-2 text-sm">
            {item.location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-[#c8a951]" />
                <span className="text-gray-600">{item.location}</span>
              </div>
            )}
            {item.startDate && (
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-[#c8a951]" />
                <span className="text-gray-600">{formatDate(item.startDate)}{item.endDate ? ` a ${formatDate(item.endDate)}` : ''}</span>
              </div>
            )}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
            <div>
              {item.quantity > 1 && (
                <p className="text-xs text-gray-500">{item.quantity}x {formatCurrency(item.value)}</p>
              )}
            </div>
            <p className="text-xl font-bold text-[#c8a951]">{formatCurrency(item.value * item.quantity)}</p>
          </div>
        </div>
        {images.length > 1 && (
          <div className="px-6 pb-6 flex gap-2 overflow-x-auto">
            {images.slice(1).map((img, idx) => (
              <img
                key={idx}
                src={img}
                alt=""
                className={`${isHotel ? 'h-28 w-40' : 'h-20 w-28'} rounded-lg object-cover flex-shrink-0 border border-gray-100 cursor-pointer hover:opacity-80 transition-opacity`}
                onClick={() => setLightboxIndex(idx + 1)}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

const SERVICE_ORDER = ['aereo', 'hotel', 'carro', 'seguro', 'experiencia', 'adicional'] as const;

export default function ClientQuote() {
  const { shortId } = useParams<{ shortId: string }>();
  const [quote, setQuote] = useState<FullQuote | null>(null);
  const [agency, setAgency] = useState<AgencySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      if (!shortId) { setNotFound(true); setLoading(false); return; }
      const [q, a] = await Promise.all([
        getQuoteByShortId(shortId),
        getAgencySettingsFromDB(),
      ]);
      if (!q) { setNotFound(true); setLoading(false); return; }
      setQuote(q);
      setAgency(a);
      setLoading(false);
    }
    load();
  }, [shortId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f7f4]">
        <div className="animate-pulse text-center">
          <Plane className="h-12 w-12 text-[#c8a951] mx-auto mb-4 animate-bounce" />
          <p className="text-[#1a2744] font-semibold">Carregando seu orçamento...</p>
        </div>
      </div>
    );
  }

  if (notFound || !quote || !agency) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f7f4]">
        <div className="text-center">
          <p className="text-6xl mb-4">🗺️</p>
          <h1 className="text-2xl font-bold text-[#1a2744] mb-2">Orçamento não encontrado</h1>
          <p className="text-gray-500">Este link pode ter expirado ou não existe.</p>
        </div>
      </div>
    );
  }

  const nights = quote.trip.nights || calcNights(quote.trip.departureDate, quote.trip.returnDate);
  const whatsappUrl = 'https://wa.me/554835000975';
  const payment = quote.payment;

  const grouped = SERVICE_ORDER.map(type => ({
    type,
    items: quote.services.filter(s => s.type === type),
  })).filter(g => g.items.length > 0);

  const categoryTotals = grouped.map(g => ({
    label: SERVICE_TYPE_CONFIG[g.type].label,
    icon: SERVICE_ICONS[g.type],
    total: g.items.reduce((sum, i) => sum + i.value * i.quantity, 0),
  }));

  const grandTotal = categoryTotals.reduce((sum, c) => sum + c.total, 0);

  const heroImage = quote.destinationImageUrl || quote.services.find(s => s.type === 'hotel')?.imageBase64;

  return (
    <div className="min-h-screen bg-[#f8f7f4]">
      {/* Hero Section */}
      <section className="relative h-[85vh] min-h-[500px] flex items-end overflow-hidden">
        {heroImage ? (
          <img src={heroImage} alt={quote.trip.destination} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a2744] via-[#243656] to-[#1a2744]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#1a2744]/90 via-[#1a2744]/40 to-transparent" />
        
        <div className="relative z-10 w-full px-6 pb-12 md:px-12 lg:px-20">
          {agency.logoBase64 && (
            <img src={agency.logoBase64} alt={agency.name} className="h-12 mb-6 object-contain" />
          )}
          <p className="text-[#c8a951] text-sm font-semibold tracking-[3px] uppercase mb-3">
            Viagem personalizada para
          </p>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-4">
            {quote.client.name}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-white/90 text-lg mb-8">
            <span className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-[#c8a951]" />
              {quote.trip.destination}
            </span>
            <span className="w-px h-5 bg-white/30 hidden md:block" />
            <span className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-[#c8a951]" />
              {formatDate(quote.trip.departureDate)} a {formatDate(quote.trip.returnDate)}
            </span>
          </div>
          
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 bg-[#25D366] hover:bg-[#20bd5a] text-white font-semibold px-8 py-4 rounded-full transition-all shadow-lg hover:shadow-xl text-lg"
          >
            <MessageCircle className="h-5 w-5" />
            Falar com consultor no WhatsApp
          </a>
        </div>

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 animate-bounce z-10">
          <ChevronDown className="h-6 w-6 text-white/60" />
        </div>
      </section>

      {/* Trip Overview */}
      <section className="relative -mt-1 bg-white rounded-t-3xl pt-12 pb-8 px-6 md:px-12 lg:px-20 shadow-xl">
        <h2 className="text-2xl font-bold text-[#1a2744] mb-8 text-center">Visão Geral da Viagem</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6 max-w-4xl mx-auto">
          <div className="text-center">
            <div className="w-12 h-12 bg-[#1a2744] rounded-full flex items-center justify-center mx-auto mb-3">
              <MapPin className="h-5 w-5 text-[#c8a951]" />
            </div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Origem</p>
            <p className="font-bold text-[#1a2744]">{quote.trip.origin}</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-[#1a2744] rounded-full flex items-center justify-center mx-auto mb-3">
              <MapPin className="h-5 w-5 text-[#c8a951]" />
            </div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Destino</p>
            <p className="font-bold text-[#1a2744]">{quote.trip.destination}</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-[#1a2744] rounded-full flex items-center justify-center mx-auto mb-3">
              <Calendar className="h-5 w-5 text-[#c8a951]" />
            </div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Período</p>
            <p className="font-bold text-[#1a2744]">{formatDate(quote.trip.departureDate)}</p>
            <p className="font-bold text-[#1a2744]">a {formatDate(quote.trip.returnDate)}</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-[#1a2744] rounded-full flex items-center justify-center mx-auto mb-3">
              <Users className="h-5 w-5 text-[#c8a951]" />
            </div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Passageiros</p>
            <p className="font-bold text-[#1a2744]">{quote.client.passengers}</p>
          </div>
          {nights > 0 && (
            <div className="text-center">
              <div className="w-12 h-12 bg-[#1a2744] rounded-full flex items-center justify-center mx-auto mb-3">
                <Moon className="h-5 w-5 text-[#c8a951]" />
              </div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Noites</p>
              <p className="font-bold text-[#1a2744]">{nights}</p>
            </div>
          )}
        </div>
      </section>

      {/* Service Sections */}
      {grouped.map(({ type, items }) => (
        <section key={type} className="py-12 px-6 md:px-12 lg:px-20">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-[#c8a951] rounded-full flex items-center justify-center text-white">
                {SERVICE_ICONS[type]}
              </div>
              <h2 className="text-2xl font-bold text-[#1a2744]">{SERVICE_TYPE_CONFIG[type].label}</h2>
            </div>
            <div className="space-y-6">
              {items.map(item => (
                type === 'aereo'
                  ? <FlightCard key={item.id} item={item} />
                  : <ServiceCard key={item.id} item={item} isHotel={type === 'hotel'} />
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* Financial Summary */}
      <section className="py-12 px-6 md:px-12 lg:px-20 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-[#1a2744] mb-8 text-center">Resumo Financeiro</h2>
          <div className="bg-gray-50 rounded-2xl p-6 md:p-8">
            {categoryTotals.map((c, idx) => (
              <div key={idx} className="flex items-center justify-between py-4 border-b border-gray-200 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-[#c8a951]">{c.icon}</span>
                  <span className="text-gray-700 font-medium">{c.label}</span>
                </div>
                <span className="font-bold text-[#1a2744] text-lg">{formatCurrency(c.total)}</span>
              </div>
            ))}
            <div className="mt-6 bg-[#1a2744] rounded-xl p-6 flex items-center justify-between">
              <span className="text-[#c8a951] font-bold text-xl">TOTAL DA VIAGEM</span>
              <span className="text-white font-bold text-3xl">{formatCurrency(grandTotal)}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Payment Conditions */}
      {payment && (payment.pixValue > 0 || payment.installmentsNoInterest > 0 || payment.installmentsWithInterest > 0) && (
        <section className="py-12 px-6 md:px-12 lg:px-20">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-[#1a2744] mb-8 text-center">Condições de Pagamento</h2>
            <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 space-y-6">
              {payment.pixValue > 0 && (
                <div className="flex items-center justify-between p-5 bg-green-50 rounded-xl border border-green-200">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">💰</span>
                    <div>
                      <p className="font-bold text-green-700 text-lg">Pix à vista</p>
                      <p className="text-green-600 text-sm">Pagamento instantâneo com desconto</p>
                    </div>
                  </div>
                  <span className="font-bold text-green-700 text-2xl">{formatCurrency(payment.pixValue)}</span>
                </div>
              )}
              
              {payment.installmentsNoInterest > 0 && payment.installmentValueNoInterest > 0 && (
                <div className="flex items-center justify-between p-5 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">💳</span>
                    <div>
                      <p className="font-bold text-[#1a2744] text-lg">Cartão sem juros</p>
                      <p className="text-gray-600 text-sm">{payment.installmentsNoInterest}x de {formatCurrency(payment.installmentValueNoInterest)}</p>
                    </div>
                  </div>
                  <span className="font-bold text-[#1a2744] text-2xl">
                    {formatCurrency(payment.installmentsNoInterest * payment.installmentValueNoInterest)}
                  </span>
                </div>
              )}
              
              {payment.installmentsWithInterest > 0 && payment.installmentValueWithInterest > 0 && (
                <div className="flex items-center justify-between p-5 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">💳</span>
                    <div>
                      <p className="font-bold text-[#1a2744] text-lg">Cartão com juros</p>
                      <p className="text-gray-600 text-sm">{payment.installmentsWithInterest}x de {formatCurrency(payment.installmentValueWithInterest)}</p>
                    </div>
                  </div>
                  <span className="font-bold text-[#1a2744] text-2xl">
                    {formatCurrency(payment.installmentsWithInterest * payment.installmentValueWithInterest)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-16 px-6 md:px-12 lg:px-20 bg-gradient-to-br from-[#1a2744] to-[#243656] text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Pronto para embarcar?</h2>
        <p className="text-white/70 text-lg mb-10 max-w-xl mx-auto">
          Garanta já a sua viagem dos sonhos. Entre em contato com nosso consultor e reserve agora mesmo.
        </p>
        <div className="flex justify-center">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-3 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold px-10 py-5 rounded-full transition-all shadow-xl hover:shadow-2xl text-lg"
          >
            <MessageCircle className="h-6 w-6" />
            Quero reservar agora
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#111b2e] py-10 px-6 md:px-12 lg:px-20">
        <div className="max-w-4xl mx-auto text-center">
          {agency.logoBase64 && (
            <img src={agency.logoBase64} alt={agency.name} className="h-10 mx-auto mb-4 object-contain opacity-70" />
          )}
          <p className="text-white/50 text-sm mb-2">{agency.name}</p>
          {agency.website && <p className="text-white/40 text-xs mb-6">{agency.website}</p>}
          
          <div className="border-t border-white/10 pt-6 space-y-2">
            <p className="text-white/40 text-xs">
              Valores sujeitos à disponibilidade no momento da reserva.
            </p>
            <p className="text-white/40 text-xs">
              Tarifas podem sofrer alteração sem aviso prévio.
            </p>
            <p className="text-white/40 text-xs">
              Valores por pessoa, salvo indicação contrária.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
