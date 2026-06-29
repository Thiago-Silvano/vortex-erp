import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Plus, X } from 'lucide-react';
import { DS160StepProps, COUNTRIES } from './types';
import { FieldError, errClass } from './fieldError';

export default function DS160Step9({ data, onChange, errors }: DS160StepProps) {
  const countries: string[] = data.paises_visitados || [];
  const [selectedCountry, setSelectedCountry] = useState('');

  const addCountry = () => {
    if (!selectedCountry || countries.includes(selectedCountry)) return;
    onChange('paises_visitados', [...countries, selectedCountry]);
    setSelectedCountry('');
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-600 border-b border-slate-200 pb-3">9. Viagens e Outras Atividades</h2>
      <div>
        <Label>Países visitados nos últimos 5 anos</Label>
        <div className="flex gap-2 mt-1">
          <Select value={selectedCountry || undefined} onValueChange={setSelectedCountry}>
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

      <div className="space-y-2">
        <Label>Já serviu nas Forças Armadas?</Label>
        <RadioGroup value={data.serviu_forcas_armadas || 'Não'} onValueChange={v => onChange('serviu_forcas_armadas', v)} className="flex gap-4">
          <div className="flex items-center gap-2"><RadioGroupItem value="Não" id="fa_nao" /><Label htmlFor="fa_nao">Não</Label></div>
          <div className="flex items-center gap-2"><RadioGroupItem value="Sim" id="fa_sim" /><Label htmlFor="fa_sim">Sim</Label></div>
        </RadioGroup>
      </div>
      {data.serviu_forcas_armadas === 'Sim' && (
        <div className="bg-slate-50 rounded-xl p-4 space-y-4 border border-slate-200">
          <div><Label>País das Forças Armadas</Label><Input className={errClass(errors?.militar_pais)} value={data.militar_pais || ''} onChange={e => onChange('militar_pais', e.target.value)} /><FieldError msg={errors?.militar_pais} /></div>
          <div><Label>Ramo (Exército, Marinha, Aeronáutica, etc.)</Label><Input className={errClass(errors?.militar_ramo)} value={data.militar_ramo || ''} onChange={e => onChange('militar_ramo', e.target.value)} /><FieldError msg={errors?.militar_ramo} /></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Posto/Graduação</Label><Input value={data.militar_posto || ''} onChange={e => onChange('militar_posto', e.target.value)} /></div>
            <div><Label>Especialidade/Função</Label><Input value={data.militar_especialidade || ''} onChange={e => onChange('militar_especialidade', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Data de início</Label><Input type="date" className={errClass(errors?.militar_inicio)} value={data.militar_inicio || ''} onChange={e => onChange('militar_inicio', e.target.value)} /><FieldError msg={errors?.militar_inicio} /></div>
            <div><Label>Data de saída</Label><Input type="date" className={errClass(errors?.militar_saida)} value={data.militar_saida || ''} onChange={e => onChange('militar_saida', e.target.value)} /><FieldError msg={errors?.militar_saida} /></div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label>Já serviu em organização paramilitar, guerrilha ou grupo rebelde?</Label>
        <RadioGroup value={data.serviu_paramilitar || 'Não'} onValueChange={v => onChange('serviu_paramilitar', v)} className="flex gap-4">
          <div className="flex items-center gap-2"><RadioGroupItem value="Não" id="param_nao" /><Label htmlFor="param_nao">Não</Label></div>
          <div className="flex items-center gap-2"><RadioGroupItem value="Sim" id="param_sim" /><Label htmlFor="param_sim">Sim</Label></div>
        </RadioGroup>
        {data.serviu_paramilitar === 'Sim' && (
          <Textarea value={data.serviu_paramilitar_explicacao || ''} onChange={e => onChange('serviu_paramilitar_explicacao', e.target.value)} placeholder="Explique brevemente" rows={2} className="border-amber-300 bg-amber-50/50" />
        )}
      </div>

      <div className="space-y-2">
        <Label>Possui habilidades especiais, treinamento ou experiência com armas de fogo, explosivos, materiais nucleares, biológicos ou químicos?</Label>
        <RadioGroup value={data.habilidades_armas || 'Não'} onValueChange={v => onChange('habilidades_armas', v)} className="flex gap-4">
          <div className="flex items-center gap-2"><RadioGroupItem value="Não" id="armas_nao" /><Label htmlFor="armas_nao">Não</Label></div>
          <div className="flex items-center gap-2"><RadioGroupItem value="Sim" id="armas_sim" /><Label htmlFor="armas_sim">Sim</Label></div>
        </RadioGroup>
        {data.habilidades_armas === 'Sim' && (
          <>
            <Textarea value={data.habilidades_armas_descricao || ''} onChange={e => onChange('habilidades_armas_descricao', e.target.value)} placeholder="Descreva brevemente" rows={2} className={errClass(errors?.habilidades_armas_descricao, 'border-amber-300 bg-amber-50/50')} />
            <FieldError msg={errors?.habilidades_armas_descricao} />
          </>
        )}
      </div>
    </div>
  );
}
