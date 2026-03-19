import React, { useMemo } from 'react';
import { ExternalLink } from 'lucide-react';

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

function buildAttractionLocation(a: AttractionMarker): string {
  return [a.name, a.location, a.city].filter(Boolean).join(', ');
}

function buildStaticUrl(destNames: string[], attrLocs: string[], apiKey: string, size = '800x500'): string {
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
  return `https://maps.googleapis.com/maps/api/staticmap?size=${size}&scale=2&maptype=roadmap&${markersStr}${pathPlaces}&key=${apiKey}`;
}

function buildGoogleMapsLink(destNames: string[], attrLocs: string[]): string {
  if (destNames.length >= 2) {
    const origin = encodeURIComponent(destNames[0]);
    const dest = encodeURIComponent(destNames[destNames.length - 1]);
    const waypoints = destNames.slice(1, -1).map(d => encodeURIComponent(d)).join('|');
    let url = `https://www.google.com/maps/dir/${destNames.map(d => encodeURIComponent(d)).join('/')}`;
    return url;
  }
  const all = [...destNames, ...attrLocs];
  if (all.length === 1) {
    return `https://www.google.com/maps/search/${encodeURIComponent(all[0])}`;
  }
  return `https://www.google.com/maps/search/${encodeURIComponent(all.join(', '))}`;
}

export default function ItineraryMapSection({ destinations, attractions = [], googleMapsApiKey, interactive = true }: Props) {
  const destNames = destinations.map(d => d.name).filter(Boolean);
  const attractionLocations = useMemo(() => {
    return attractions.map(a => buildAttractionLocation(a)).filter(Boolean);
  }, [attractions]);

  const staticMapUrl = useMemo(() => {
    if (!googleMapsApiKey || (destNames.length === 0 && attractionLocations.length === 0)) return null;
    return buildStaticUrl(destNames, attractionLocations, googleMapsApiKey, interactive ? '900x500' : '800x500');
  }, [destNames, attractionLocations, googleMapsApiKey, interactive]);

  const googleMapsLink = useMemo(() => {
    return buildGoogleMapsLink(destNames, attractionLocations);
  }, [destNames, attractionLocations]);

  if (!googleMapsApiKey || (destNames.length === 0 && attractionLocations.length === 0)) {
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

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12">
      <p className="text-xs tracking-[0.3em] uppercase text-amber-600 font-semibold mb-2">Rota</p>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Mapa da Viagem</h2>
        {interactive && (
          <a
            href={googleMapsLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 transition-colors"
          >
            Abrir no Google Maps <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
      {staticMapUrl && (
        <div className="rounded-xl overflow-hidden shadow-md">
          {interactive ? (
            <a href={googleMapsLink} target="_blank" rel="noopener noreferrer" className="block cursor-pointer">
              <img src={staticMapUrl} alt="Mapa da viagem" className="w-full" />
            </a>
          ) : (
            <img src={staticMapUrl} alt="Mapa da viagem" className="w-full" />
          )}
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        {destNames.map((name, i) => (
          <span key={`dest-${i}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-full text-xs text-gray-600">
            <span className="w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold">{i + 1}</span>
            {name}
          </span>
        ))}
        {attractions.filter(a => a.name).map((attr, i) => (
          <span key={`attr-${i}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 rounded-full text-xs text-gray-600">
            <span className="w-2 h-2 bg-red-500 rounded-full" />
            {attr.name}
          </span>
        ))}
      </div>
    </div>
  );
}

export function getStaticMapUrl(destinations: { name: string }[], attractions: { name: string; location?: string; city?: string }[], googleMapsApiKey: string): string | null {
  const destNames = destinations.map(d => d.name).filter(Boolean);
  const attrLocs = attractions.map(a => buildAttractionLocation(a)).filter(Boolean);
  if (!googleMapsApiKey || (destNames.length === 0 && attrLocs.length === 0)) return null;
  return buildStaticUrl(destNames, attrLocs, googleMapsApiKey);
}
