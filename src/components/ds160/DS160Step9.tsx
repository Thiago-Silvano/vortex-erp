import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X } from 'lucide-react';
import { DS160StepProps, COUNTRIES } from './types';

export default function DS160Step9({ data, onChange }: DS160StepProps) {
  const countries: string[] = data.paises_visitados || [];
  const [selectedCountry, setSelectedCountry] = useState('');

  const addCountry = () => {
    if (!selectedCountry || countries.includes(selectedCountry)) return;
    onChange('paises_visitados', [...countries, selectedCountry]);
    setSelectedCountry('');
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-800 border-b border-slate-200 pb-3">9. Viagens e Outras Atividades</h2>
      <div>
        <Label>Países visitados nos últimos 5 anos</Label>
        <div className="flex gap-2 mt-1">
          <Select value={selectedCountry} onValueChange={setSelectedCountry}>
            <SelectTrigger className="flex-1"><SelectValue placeholder="Selecione um país" /></SelectTrigger>
            <SelectContent>{COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
          <Button type="button" onClick={addCountry} size="sm" variant="outline"><Plus className="h-4 w-4" /></Button>
        </div>
        {countries.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {countries.map((c, i) => (
              <span key={i} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-sm px-3 py-1 rounded-full border border-blue-200">
                {c}
                <button onClick={() => onChange('paises_visitados', countries.filter((_, j) => j !== i))}><X className="h-3 w-3" /></button>
              </span>
            ))}
          </div>
        )}
        {countries.length === 0 && <p className="text-xs text-slate-400 mt-1">Nenhum país adicionado ainda.</p>}
      </div>
      <div><Label>Participa de organizações de caridade, militares ou profissionais? (Liste-as)</Label><Textarea value={data.organizacoes || ''} onChange={e => onChange('organizacoes', e.target.value)} rows={3} /></div>
    </div>
  );
}
