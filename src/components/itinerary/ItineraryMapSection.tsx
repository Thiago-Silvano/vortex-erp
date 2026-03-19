import React, { useMemo } from 'react';

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

export default function ItineraryMapSection({ destinations, attractions = [], googleMapsApiKey, interactive = true }: Props) {
  const destNames = destinations.map(d => d.name).filter(Boolean);

  // Build attraction location strings for markers
  const attractionLocations = useMemo(() => {
    return attractions
      .map(a => {
        const parts = [a.name, a.location, a.city].filter(Boolean);
        return parts.join(', ');
      })
      .filter(Boolean);
  }, [attractions]);

  const mapUrl = useMemo(() => {
    if (!googleMapsApiKey || (destNames.length === 0 && attractionLocations.length === 0)) return null;

    if (interactive) {
      // Embed API - interactive map
      if (destNames.length === 1 && attractionLocations.length === 0) {
        const q = encodeURIComponent(destNames[0]);
        return `https://www.google.com/maps/embed/v1/place?key=${googleMapsApiKey}&q=${q}&zoom=10`;
      }
      // Multiple destinations: use directions
      if (destNames.length >= 2) {
        const origin = encodeURIComponent(destNames[0]);
        const destination = encodeURIComponent(destNames[destNames.length - 1]);
        const waypoints = destNames.slice(1, -1).map(d => encodeURIComponent(d)).join('|');
        let url = `https://www.google.com/maps/embed/v1/directions?key=${googleMapsApiKey}&origin=${origin}&destination=${destination}&mode=driving`;
        if (waypoints) url += `&waypoints=${waypoints}`;
        return url;
      }
      // Only attractions, no destinations with route
      if (destNames.length <= 1) {
        const q = encodeURIComponent(destNames[0] || attractionLocations[0] || '');
        return `https://www.google.com/maps/embed/v1/place?key=${googleMapsApiKey}&q=${q}&zoom=10`;
      }
      return null;
    } else {
      // Static Map API - for PDF - includes both destinations and attractions
      const allMarkers: string[] = [];

      // Destination markers (blue)
      destNames.forEach((d, i) => {
        allMarkers.push(`markers=color:blue%7Clabel:${i + 1}%7C${encodeURIComponent(d)}`);
      });

      // Attraction markers (red)
      attractionLocations.forEach((loc) => {
        allMarkers.push(`markers=color:red%7Csize:small%7C${encodeURIComponent(loc)}`);
      });

      const markersStr = allMarkers.join('&');
      const pathPlaces = destNames.length >= 2
        ? `&path=color:0x0000ff80|weight:3|${destNames.map(d => encodeURIComponent(d)).join('|')}`
        : '';
      return `https://maps.googleapis.com/maps/api/staticmap?size=800x500&maptype=roadmap&${markersStr}${pathPlaces}&key=${googleMapsApiKey}`;
    }
  }, [destNames, attractionLocations, googleMapsApiKey, interactive]);

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

  if (interactive && mapUrl) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12">
        <p className="text-xs tracking-[0.3em] uppercase text-amber-600 font-semibold mb-2">Rota</p>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Mapa da Viagem</h2>
        <div className="rounded-xl overflow-hidden shadow-md">
          <iframe
            src={mapUrl}
            width="100%"
            height="450"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {destNames.map((name, i) => (
            <span key={`dest-${i}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-full text-xs text-gray-600">
              <span className="w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold">{i + 1}</span>
              {name}
            </span>
          ))}
          {attractions.filter(a => a.name).map((attr, i) => (
            <span key={`attr-${i}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 rounded-full text-xs text-gray-600">
              <span className="w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[9px]">📍</span>
              {attr.name}
            </span>
          ))}
        </div>
      </div>
    );
  }

  // Static image fallback
  return (
    <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12">
      <p className="text-xs tracking-[0.3em] uppercase text-amber-600 font-semibold mb-2">Rota</p>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Mapa da Viagem</h2>
      {mapUrl && (
        <img src={mapUrl} alt="Mapa da viagem" className="w-full rounded-xl shadow-md" />
      )}
    </div>
  );
}

export function getStaticMapUrl(destinations: { name: string }[], attractions: { name: string; location?: string; city?: string }[], googleMapsApiKey: string): string | null {
  const destNames = destinations.map(d => d.name).filter(Boolean);
  const attrLocs = attractions.map(a => [a.name, a.location, a.city].filter(Boolean).join(', ')).filter(Boolean);
  if (!googleMapsApiKey || (destNames.length === 0 && attrLocs.length === 0)) return null;

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
  return `https://maps.googleapis.com/maps/api/staticmap?size=800x500&maptype=roadmap&${markersStr}${pathPlaces}&key=${googleMapsApiKey}`;
}
