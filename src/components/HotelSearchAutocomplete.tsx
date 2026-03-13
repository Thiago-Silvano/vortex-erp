import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Search, MapPin, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export interface GooglePlaceResult {
  place_id: string;
  name: string;
  address: string;
  rating: number;
  user_ratings_total: number;
  thumbnail_url: string | null;
  location: { lat: number; lng: number } | null;
}

export interface HotelDetails {
  place_id: string;
  name: string;
  city: string;
  country: string;
  address: string;
  phone: string;
  website: string;
  rating: number;
  reviews_total: number;
  latitude: number;
  longitude: number;
  photos: string[];
}

interface Props {
  apiKey: string;
  onSelect: (hotel: HotelDetails) => void;
  placeholder?: string;
}

export default function HotelSearchAutocomplete({ apiKey, onSelect, placeholder }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GooglePlaceResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const searchHotels = useCallback(async (q: string) => {
    if (!q.trim() || q.trim().length < 3) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    setSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-places', {
        body: { action: 'search', query: q, apiKey },
      });
      if (error) throw error;
      if (data?.success && data.results) {
        setResults(data.results);
        setIsOpen(data.results.length > 0);
      }
    } catch (e) {
      console.error('Hotel search error:', e);
    } finally {
      setSearching(false);
    }
  }, [apiKey]);

  const handleInputChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchHotels(value), 500);
  };

  const handleSelect = async (place: GooglePlaceResult) => {
    setIsOpen(false);
    setQuery(place.name);
    setLoadingDetails(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-places', {
        body: { action: 'details', placeId: place.place_id, apiKey },
      });
      if (error) throw error;
      if (data?.success && data.data) {
        onSelect(data.data);
      }
    } catch (e) {
      console.error('Hotel details error:', e);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <Label className="text-xs font-medium">Buscar Hotel (Google Maps)</Label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={e => handleInputChange(e.target.value)}
          placeholder={placeholder || 'Digite o nome do hotel ou cidade...'}
          className="pl-9 pr-8"
          onFocus={() => results.length > 0 && setIsOpen(true)}
        />
        {(searching || loadingDetails) && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-80 overflow-y-auto">
          {results.map((place) => (
            <button
              key={place.place_id}
              onClick={() => handleSelect(place)}
              className="w-full flex items-center gap-3 p-3 hover:bg-accent transition-colors text-left border-b border-border/50 last:border-b-0"
            >
              {place.thumbnail_url ? (
                <img
                  src={place.thumbnail_url}
                  alt={place.name}
                  className="w-14 h-10 object-cover rounded flex-shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <div className="w-14 h-10 bg-muted rounded flex items-center justify-center flex-shrink-0">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{place.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {place.rating > 0 && (
                    <span className="flex items-center gap-0.5 text-xs text-amber-600">
                      <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                      {place.rating}
                      {place.user_ratings_total > 0 && (
                        <span className="text-muted-foreground">
                          ({place.user_ratings_total.toLocaleString('pt-BR')})
                        </span>
                      )}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{place.address}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {loadingDetails && (
        <div className="mt-2 p-3 bg-muted/50 rounded-md text-center text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mx-auto mb-1" />
          Carregando detalhes e fotos do hotel...
        </div>
      )}
    </div>
  );
}
