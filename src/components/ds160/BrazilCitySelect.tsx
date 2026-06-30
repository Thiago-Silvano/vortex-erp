import { useEffect, useRef, useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { MapPin, Loader2, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchCitiesByUf } from '@/data/brazil-states';

interface Props {
  uf: string;
  value?: string;
  onChange: (city: string) => void;
  placeholder?: string;
  className?: string;
}

export default function BrazilCitySelect({ uf, value, onChange, placeholder = 'Selecione a cidade', className }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [cities, setCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    let active = true;
    if (!uf) { setCities([]); return; }
    setLoading(true);
    fetchCitiesByUf(uf)
      .then(list => { if (active) setCities(list); })
      .catch(() => { if (active) setCities([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [uf]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cities;
    return cities.filter(c => c.toLowerCase().includes(q));
  }, [cities, query]);

  return (
    <div ref={wrapRef} className={cn('relative', className)}>
      {open ? (
        <Input
          autoFocus
          placeholder={loading ? 'Carregando cidades…' : 'Digite para buscar…'}
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      ) : (
        <button
          type="button"
          disabled={!uf}
          onClick={() => { setOpen(true); setQuery(''); }}
          className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className={cn('truncate', !value && 'text-muted-foreground')}>
            {value || (uf ? placeholder : 'Selecione o estado primeiro')}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
        </button>
      )}

      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-64 overflow-auto rounded-md border bg-popover shadow-lg">
          {loading ? (
            <div className="p-2 text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" /> Carregando cidades…
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-2 text-sm text-muted-foreground">
              Nenhuma cidade encontrada.
              {query.trim() && (
                <button
                  type="button"
                  className="block mt-1 text-primary hover:underline"
                  onClick={() => { onChange(query.trim()); setOpen(false); }}
                >
                  Usar “{query.trim()}”
                </button>
              )}
            </div>
          ) : (
            filtered.map((c, i) => (
              <button
                key={i}
                type="button"
                onClick={() => { onChange(c); setOpen(false); }}
                className="w-full text-left px-2 py-1.5 text-sm hover:bg-accent flex items-center gap-2 border-b last:border-b-0"
              >
                <MapPin className="h-3 w-3 text-primary shrink-0" />
                <span className="truncate">{c}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
