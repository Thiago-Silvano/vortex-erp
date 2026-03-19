import React from 'react';

interface Attraction {
  id: string;
  name: string;
  location: string;
  city: string;
  description: string;
  image_url: string;
  time: string;
  duration: string;
  category: string;
  sort_order: number;
}

interface Day {
  id: string;
  day_number: number;
  title: string;
  subtitle: string;
  description: string;
  attractions: Attraction[];
}

interface Destination {
  id: string;
  name: string;
  image_url: string;
}

interface Itinerary {
  title: string;
  subtitle: string;
  client_name: string;
  travel_date: string;
  cover_image_url: string;
  thank_you_text: string;
  thank_you_image_url: string;
}

interface ChecklistItem {
  id: string;
  category: string;
  item: string;
}

interface Props {
  itinerary: Itinerary;
  destinations: Destination[];
  days: Day[];
  checklist?: ChecklistItem[];
}

const CATEGORY_LABELS: Record<string, string> = {
  attraction: 'Atração',
  experience: 'Experiência',
  tour: 'Passeio',
  gastronomy: 'Gastronomia',
  landmark: 'Ponto Turístico',
  recommendation: 'Recomendação',
};

// Paginate attractions: max 3 per page
function paginateAttractions(attractions: Attraction[]): Attraction[][] {
  const pages: Attraction[][] = [];
  for (let i = 0; i < attractions.length; i += 3) {
    pages.push(attractions.slice(i, i + 3));
  }
  return pages.length > 0 ? pages : [[]];
}

export default function ItineraryPreview({ itinerary, destinations, days, checklist = [] }: Props) {
  const destinationNames = destinations.map(d => d.name).filter(Boolean);

  return (
    <div className="space-y-8">
      {/* ===== COVER PAGE ===== */}
      <div
        className="relative rounded-2xl overflow-hidden shadow-2xl"
        style={{ aspectRatio: '16/10' }}
      >
        {itinerary.cover_image_url ? (
          <img src={itinerary.cover_image_url} alt="Cover" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-12">
          <div className="space-y-3">
            {itinerary.subtitle && (
              <p className="text-white/70 text-sm tracking-[0.3em] uppercase font-light">{itinerary.subtitle}</p>
            )}
            <h1 className="text-white text-3xl md:text-5xl font-bold leading-tight tracking-tight">
              {itinerary.title || 'Seu Roteiro'}
            </h1>
            {destinationNames.length > 0 && (
              <p className="text-white/80 text-lg font-light">{destinationNames.join(' · ')}</p>
            )}
            <div className="flex items-center gap-4 pt-3">
              {itinerary.client_name && (
                <span className="text-white/60 text-sm">{itinerary.client_name}</span>
              )}
              {itinerary.travel_date && (
                <span className="text-white/60 text-sm">{itinerary.travel_date}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ===== INDEX PAGE ===== */}
      <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12">
        <p className="text-xs tracking-[0.3em] uppercase text-amber-600 font-semibold mb-2">Índice</p>
        <h2 className="text-2xl font-bold text-gray-900 mb-8">Conteúdo do Roteiro</h2>
        <div className="space-y-4">
          {destinations.length > 0 && (
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <span className="text-gray-700 font-medium">Destinos</span>
              <span className="text-gray-400 text-sm">{destinationNames.join(', ')}</span>
            </div>
          )}
          {days.map((day, idx) => (
            <div key={day.id} className="flex items-center justify-between py-3 border-b border-gray-100">
              <span className="text-gray-700 font-medium">{day.title || `Dia ${day.day_number}`}</span>
              <span className="text-gray-400 text-sm">{day.attractions.length} atração(ões)</span>
            </div>
          ))}
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <span className="text-gray-700 font-medium">Checklist de Viagem</span>
            <span className="text-gray-400 text-sm">✓</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <span className="text-gray-700 font-medium">Mapa da Viagem</span>
            <span className="text-gray-400 text-sm">🗺</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-gray-700 font-medium">Agradecimento</span>
            <span className="text-gray-400 text-sm">♥</span>
          </div>
        </div>
      </div>

      {/* ===== DAY PAGES ===== */}
      {days.map(day => {
        const pages = paginateAttractions(day.attractions);
        return pages.map((pageAttractions, pageIdx) => (
          <div key={`${day.id}-page-${pageIdx}`} className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* Day header (only on first page) */}
            {pageIdx === 0 && (
              <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-8 py-6">
                <p className="text-amber-400 text-xs tracking-[0.3em] uppercase font-semibold mb-1">
                  {day.title || `Dia ${String(day.day_number).padStart(2, '0')}`}
                </p>
                {day.subtitle && <p className="text-white/70 text-sm font-light">{day.subtitle}</p>}
                {day.description && <p className="text-white/50 text-xs mt-2 max-w-lg">{day.description}</p>}
              </div>
            )}

            {/* Attractions */}
            <div className="p-6 md:p-8 space-y-8">
              {pageAttractions.length === 0 && pageIdx === 0 && (
                <p className="text-gray-400 text-center py-12 text-sm italic">Adicione atrações a este dia</p>
              )}
              {pageAttractions.map((attr, attrIdx) => {
                const globalIdx = pageIdx * 3 + attrIdx;
                const isEven = globalIdx % 2 === 0;

                return (
                  <div key={attr.id} className={`flex flex-col md:flex-row gap-6 items-stretch ${!isEven ? 'md:flex-row-reverse' : ''}`}>
                    {/* Image */}
                    <div className="md:w-1/2 shrink-0">
                      {attr.image_url ? (
                        <img
                          src={attr.image_url}
                          alt={attr.name}
                          className="w-full h-48 md:h-56 object-cover rounded-xl"
                        />
                      ) : (
                        <div className="w-full h-48 md:h-56 rounded-xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center">
                          <span className="text-gray-300 text-4xl">📷</span>
                        </div>
                      )}
                    </div>

                    {/* Text */}
                    <div className="md:w-1/2 flex flex-col justify-center">
                      {attr.category && (
                        <span className="text-[10px] tracking-[0.2em] uppercase text-amber-600 font-semibold mb-1">
                          {CATEGORY_LABELS[attr.category] || attr.category}
                        </span>
                      )}
                      <h3 className="text-xl font-bold text-gray-900 mb-1">{attr.name || 'Nome da Atração'}</h3>
                      {(attr.location || attr.city) && (
                        <p className="text-sm text-gray-500 mb-3 flex items-center gap-1">
                          📍 {[attr.location, attr.city].filter(Boolean).join(', ')}
                        </p>
                      )}
                      {attr.description && (
                        <p className="text-sm text-gray-600 leading-relaxed">{attr.description}</p>
                      )}
                      {(attr.time || attr.duration) && (
                        <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
                          {attr.time && <span>🕐 {attr.time}</span>}
                          {attr.duration && <span>⏱ {attr.duration}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Page indicator */}
            {pages.length > 1 && (
              <div className="px-8 pb-4">
                <p className="text-xs text-gray-300 text-right">
                  {day.title} · Página {pageIdx + 1} de {pages.length}
                </p>
              </div>
            )}
          </div>
        ));
      })}

      {/* ===== CHECKLIST PAGE ===== */}
      {checklist.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12">
          <p className="text-xs tracking-[0.3em] uppercase text-amber-600 font-semibold mb-2">Preparação</p>
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Checklist de Viagem</h2>
          {(() => {
            const cats = Array.from(new Set(checklist.map(c => c.category)));
            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {cats.map(cat => (
                  <div key={cat}>
                    <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-3 pb-2 border-b border-gray-100">{cat}</h3>
                    <div className="space-y-2">
                      {checklist.filter(c => c.category === cat).map(item => (
                        <div key={item.id} className="flex items-center gap-3">
                          <div className="h-4 w-4 rounded border-2 border-gray-300 shrink-0" />
                          <span className="text-sm text-gray-600">{item.item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* ===== THANK YOU PAGE ===== */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="relative" style={{ aspectRatio: '16/8' }}>
          {itinerary.thank_you_image_url ? (
            <img src={itinerary.thank_you_image_url} alt="Thank you" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-white to-blue-50" />
          )}
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
            <div className="text-center max-w-md px-6">
              <p className="text-xs tracking-[0.3em] uppercase text-amber-600 font-semibold mb-4">Obrigado</p>
              <p className="text-gray-700 leading-relaxed">{itinerary.thank_you_text || 'Obrigado por escolher viajar conosco!'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
