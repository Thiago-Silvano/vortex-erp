import React, { useMemo, useState } from 'react';
import { ExternalLink, MapPin, Navigation } from 'lucide-react';

interface Destination {
  id: string;
  name: string;
}

interface AttractionMarker {
  name: string;
  location?: string;
  city?: string;
}

interface Props {
  destinations: Destination[];
  attractions?: AttractionMarker[];
  googleMapsApiKey?: string;
  interactive?: boolean;
}

type MapFocus = { type: 'overview' } | { type: 'place'; query: string; label: string };

function buildPlaceQuery(a: AttractionMarker): string {
  const city = (a.city || '').trim();
  const name = (a.name || '').trim();
  if (city && !name.toLowerCase().includes(city.toLowerCase())) {
    return `${name}, ${city}`;
  }
  return name;
}

function buildStaticUrl(destNames: string[], attrLocs: string[], apiKey: string): string {
  const allMarkers: string[] = [];
  destNames.forEach((d, i) => {
    allMarkers.push(`markers=color:blue%7Clabel:${i + 1}%7C${encodeURIComponent(d)}`);
  });
  attrLocs.forEach((loc) => {
    allMarkers.push(`markers=color:red%7Csize:small%7C${encodeURIComponent(loc)}`);
  });
  const markersStr = allMarkers.join('&');
  const pathPlaces = destNames.length >= 2
    ? `&path=color:0x0000ff80|weight:3|${destNames.map(d => encodeURIComponent(d)).join('|')}`
    : '';
  return `https://maps.googleapis.com/maps/api/staticmap?size=800x500&scale=2&maptype=roadmap&${markersStr}${pathPlaces}&key=${apiKey}`;
}

export default function ItineraryMapSection({ destinations, attractions = [], googleMapsApiKey, interactive = true }: Props) {
  const destNames = destinations.map(d => d.name).filter(Boolean);
  const attractionQueries = useMemo(() => {
    return attractions.map(a => ({ name: a.name, query: buildPlaceQuery(a) })).filter(a => a.query);
  }, [attractions]);

  const [focus, setFocus] = useState<MapFocus>({ type: 'overview' });

  const overviewUrl = useMemo(() => {
    if (!googleMapsApiKey) return null;
    if (destNames.length === 0 && attractionQueries.length === 0) return null;

    if (destNames.length >= 2) {
      const origin = encodeURIComponent(destNames[0]);
      const destination = encodeURIComponent(destNames[destNames.length - 1]);
      const waypoints = destNames.slice(1, -1).map(d => encodeURIComponent(d)).join('|');
      let url = `https://www.google.com/maps/embed/v1/directions?key=${googleMapsApiKey}&origin=${origin}&destination=${destination}&mode=flying`;
      if (waypoints) url += `&waypoints=${waypoints}`;
      return url;
    }

    const q = encodeURIComponent(destNames[0] || attractionQueries[0]?.query || '');
    return `https://www.google.com/maps/embed/v1/place?key=${googleMapsApiKey}&q=${q}&zoom=10`;
  }, [destNames, attractionQueries, googleMapsApiKey]);

  const currentMapUrl = useMemo(() => {
    if (!googleMapsApiKey) return null;
    if (focus.type === 'overview') return overviewUrl;
    return `https://www.google.com/maps/embed/v1/place?key=${googleMapsApiKey}&q=${encodeURIComponent(focus.query)}&zoom=14`;
  }, [focus, googleMapsApiKey, overviewUrl]);

  if (!googleMapsApiKey || (destNames.length === 0 && attractionQueries.length === 0)) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12">
        <p className="text-xs tracking-[0.3em] uppercase text-amber-600 font-semibold mb-2">Rota</p>
        <h2 className="text-2xl font-bold text-gray-900 mb-8">Mapa da Viagem</h2>
        <div className="h-64 bg-gray-50 rounded-xl flex items-center justify-center">
          <p className="text-gray-400 text-sm">Configure a Google Maps API Key nas configurações para exibir o mapa</p>
        </div>
      </div>
    );
  }

  if (!interactive) {
    // PDF: static map with all markers
    const attrLocs = attractionQueries.map(a => a.query);
    const staticUrl = buildStaticUrl(destNames, attrLocs, googleMapsApiKey!);
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12">
        <p className="text-xs tracking-[0.3em] uppercase text-amber-600 font-semibold mb-2">Rota</p>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Mapa da Viagem</h2>
        <img src={staticUrl} alt="Mapa da viagem" className="w-full rounded-xl shadow-md" />
      </div>
    );
  }

  const isOverview = focus.type === 'overview';

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12">
      <p className="text-xs tracking-[0.3em] uppercase text-amber-600 font-semibold mb-2">Rota</p>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Mapa da Viagem</h2>

      {/* Map */}
      <div className="rounded-xl overflow-hidden shadow-md">
        {currentMapUrl && (
          <iframe
            key={currentMapUrl}
            src={currentMapUrl}
            width="100%"
            height="450"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        )}
      </div>

      {/* Legends */}
      <div className="mt-5 space-y-3">
        {/* Overview button */}
        <button
          onClick={() => setFocus({ type: 'overview' })}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-all ${
            isOverview
              ? 'bg-gray-900 text-white shadow-md'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Navigation className="w-3.5 h-3.5" />
          Visão Geral
        </button>

        {/* Destinations */}
        {destNames.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {destNames.map((name, i) => {
              const isActive = focus.type === 'place' && focus.label === `dest-${i}`;
              return (
                <button
                  key={`dest-${i}`}
                  onClick={() => setFocus({ type: 'place', query: name, label: `dest-${i}` })}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isActive ? 'bg-white text-blue-600' : 'bg-blue-500 text-white'
                  }`}>{i + 1}</span>
                  {name}
                </button>
              );
            })}
          </div>
        )}

        {/* Attractions */}
        {attractionQueries.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {attractionQueries.map((attr, i) => {
              const isActive = focus.type === 'place' && focus.label === `attr-${i}`;
              return (
                <button
                  key={`attr-${i}`}
                  onClick={() => setFocus({ type: 'place', query: attr.query, label: `attr-${i}` })}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-red-600 text-white shadow-md'
                      : 'bg-red-50 text-red-700 hover:bg-red-100'
                  }`}
                >
                  <MapPin className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-red-500'}`} />
                  {attr.name}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function getStaticMapUrl(destinations: { name: string }[], attractions: { name: string; location?: string; city?: string }[], googleMapsApiKey: string): string | null {
  const destNames = destinations.map(d => d.name).filter(Boolean);
  const attrLocs = attractions.map(a => buildPlaceQuery(a)).filter(Boolean);
  if (!googleMapsApiKey || (destNames.length === 0 && attrLocs.length === 0)) return null;
  return buildStaticUrl(destNames, attrLocs, googleMapsApiKey);
}
