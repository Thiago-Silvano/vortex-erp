import { useState, useMemo, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Plane, X } from 'lucide-react';
import { searchAirports, findAirport, type Airport } from '@/data/airports';
import { cn } from '@/lib/utils';

interface AirportComboboxProps {
  value?: string; // IATA code
  onChange: (iata: string | undefined, airport?: Airport) => void;
  placeholder?: string;
  className?: string;
}

export function AirportCombobox({ value, onChange, placeholder = 'Buscar aeroporto…', className }: AirportComboboxProps) {
  const selected = useMemo(() => findAirport(value), [value]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => searchAirports(query, 12), [query]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  function pick(a: Airport) {
    onChange(a.iata, a);
    setQuery('');
    setOpen(false);
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange(undefined);
    setQuery('');
  }

  return (
    <div ref={wrapRef} className={cn('relative', className)}>
      {selected && !open ? (
        <button
          type="button"
          onClick={() => { setOpen(true); setTimeout(() => wrapRef.current?.querySelector('input')?.focus(), 0); }}
          className="w-full h-8 px-2 text-xs flex items-center gap-1.5 border border-input rounded-md bg-background hover:bg-accent text-left"
        >
          <Plane className="h-3 w-3 text-primary shrink-0" />
          <span className="font-semibold">{selected.iata}</span>
          <span className="truncate text-muted-foreground">· {selected.city} ({selected.country})</span>
          <X className="h-3 w-3 ml-auto opacity-50 hover:opacity-100" onClick={clear} />
        </button>
      ) : (
        <Input
          autoFocus={open}
          className="h-8 text-xs"
          placeholder={placeholder}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
        />
      )}

      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-64 overflow-auto rounded-md border bg-popover shadow-lg">
          {results.length === 0 ? (
            <div className="p-2 text-xs text-muted-foreground">Nenhum aeroporto encontrado</div>
          ) : (
            results.map(a => (
              <button
                key={a.iata}
                type="button"
                onClick={() => pick(a)}
                className="w-full text-left px-2 py-1.5 text-xs hover:bg-accent flex items-center gap-2 border-b last:border-b-0"
              >
                <span className="font-mono font-bold text-primary w-10">{a.iata}</span>
                <span className="flex-1 truncate">
                  <span className="font-medium">{a.city}</span>
                  <span className="text-muted-foreground"> · {a.name}</span>
                </span>
                <span className="text-[10px] text-muted-foreground">{a.country}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}