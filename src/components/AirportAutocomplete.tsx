import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { searchAirports, formatAirport, Airport } from '@/data/airports';

interface AirportAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function AirportAutocomplete({ value, onChange, placeholder, className }: AirportAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Airport[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setResults(searchAirports(value));
  }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <Input
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder || "Buscar aeroporto..."}
        className={className}
      />
      {open && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-48 overflow-y-auto">
          {results.map((airport) => (
            <button
              key={airport.code}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
              onClick={() => { onChange(formatAirport(airport)); setOpen(false); }}
            >
              <span className="font-semibold text-primary">{airport.code}</span>
              <span className="ml-2">{airport.city} - {airport.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
