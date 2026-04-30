import { useState, useEffect, useRef, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { MapPin, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CityResult {
  label: string;       // "Paris, Île-de-France, França"
  city: string;
  region?: string;
  country?: string;
}

interface CityComboboxProps {
  value?: string;
  onChange: (label: string) => void;
  placeholder?: string;
  className?: string;
}

// Cache simples em memória por query
const cache = new Map<string, CityResult[]>();

async function searchCities(q: string, signal?: AbortSignal): Promise<CityResult[]> {
  const key = q.toLowerCase().trim();
  if (cache.has(key)) return cache.get(key)!;
  // Nominatim (OpenStreetMap) — gratuito, sem chave. featuretype=city para filtrar.
  const url = `https://nominatim.openstreetmap.org/search?format=json&accept-language=pt-BR&addressdetails=1&limit=10&featuretype=city&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { signal, headers: { 'Accept': 'application/json' } });
  if (!res.ok) return [];
  const data = await res.json();
  const results: CityResult[] = (data || [])
    .filter((d: any) => {
      const cls = d.class;
      const type = d.type;
      // aceita cidades, vilas, municípios, capitais
      return cls === 'place' || cls === 'boundary' || type === 'city' || type === 'town' || type === 'village' || type === 'administrative';
    })
    .map((d: any) => {
      const a = d.address || {};
      const city = a.city || a.town || a.village || a.municipality || a.hamlet || d.name || '';
      const region = a.state || a.region || a.province || '';
      const country = a.country || '';
      const label = [city, region, country].filter(Boolean).join(', ');
      return { label, city, region, country };
    })
    .filter((r: CityResult) => r.city && r.label);
  // dedupe por label
  const seen = new Set<string>();
  const unique = results.filter(r => {
    if (seen.has(r.label)) return false;
    seen.add(r.label);
    return true;
  });
  cache.set(key, unique);
  return unique;
}

export function CityCombobox({ value, onChange, placeholder = 'Buscar cidade…', className }: CityComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CityResult[]>([]);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const display = useMemo(() => value || '', [value]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) { setResults([]); return; }
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await searchCities(q, ctrl.signal);
        setResults(r);
      } catch (e: any) {
        if (e?.name !== 'AbortError') setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [query, open]);

  function pick(r: CityResult) {
    onChange(r.label);
    setQuery('');
    setOpen(false);
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange('');
    setQuery('');
  }

  return (
    <div ref={wrapRef} className={cn('relative', className)}>
      {display && !open ? (
        <button
          type="button"
          onClick={() => { setOpen(true); setTimeout(() => wrapRef.current?.querySelector('input')?.focus(), 0); }}
          className="w-full h-7 px-2 text-xs flex items-center gap-1.5 border border-input rounded-md bg-background hover:bg-accent text-left"
        >
          <MapPin className="h-3 w-3 text-primary shrink-0" />
          <span className="truncate">{display}</span>
          <X className="h-3 w-3 ml-auto opacity-50 hover:opacity-100" onClick={clear} />
        </button>
      ) : (
        <Input
          autoFocus={open}
          className="h-7 text-xs"
          placeholder={placeholder}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
        />
      )}

      {open && (query.trim().length >= 2 || loading) && (
        <div className="absolute z-50 mt-1 w-full max-h-64 overflow-auto rounded-md border bg-popover shadow-lg">
          {loading ? (
            <div className="p-2 text-xs text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" /> Buscando cidades…
            </div>
          ) : results.length === 0 ? (
            <div className="p-2 text-xs text-muted-foreground">
              Nenhuma cidade encontrada. Você pode digitar manualmente — pressione Enter.
              <button
                type="button"
                className="block mt-1 text-primary hover:underline"
                onClick={() => { onChange(query.trim()); setQuery(''); setOpen(false); }}
              >
                Usar “{query.trim()}”
              </button>
            </div>
          ) : (
            results.map((r, i) => (
              <button
                key={i}
                type="button"
                onClick={() => pick(r)}
                className="w-full text-left px-2 py-1.5 text-xs hover:bg-accent flex items-center gap-2 border-b last:border-b-0"
              >
                <MapPin className="h-3 w-3 text-primary shrink-0" />
                <span className="flex-1 truncate">
                  <span className="font-medium">{r.city}</span>
                  {r.region && <span className="text-muted-foreground"> · {r.region}</span>}
                  {r.country && <span className="text-muted-foreground"> · {r.country}</span>}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}