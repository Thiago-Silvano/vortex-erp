import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { DS160StepProps, COUNTRIES } from './types';

export default function DS160Step2({ data, onChange }: DS160StepProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-600 border-b border-slate-200 pb-3">2. Informações de Passaporte</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><Label>Nº Passaporte</Label><Input value={data.passaporte_numero || ''} onChange={e => onChange('passaporte_numero', e.target.value)} placeholder="Número do Passaporte" /></div>
        <div>
          <Label>País Emissor</Label>
          <Select value={data.passaporte_pais_emissor || undefined} onValueChange={v => onChange('passaporte_pais_emissor', v)}>
            <SelectTrigger><SelectValue placeholder="Selecione o país" /></SelectTrigger>
            <SelectContent>{COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div><Label>Cidade Onde o Passaporte Foi Emitido</Label><Input value={data.passaporte_cidade_emissao || ''} onChange={e => onChange('passaporte_cidade_emissao', e.target.value)} /></div>
      <div><Label>Estado/Província de Emissão do Passaporte (opcional)</Label><Input value={data.passaporte_estado_emissao || ''} onChange={e => onChange('passaporte_estado_emissao', e.target.value)} /></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><Label>Data de Emissão</Label><Input type="date" value={data.passaporte_data_emissao || ''} onChange={e => onChange('passaporte_data_emissao', e.target.value)} /></div>
        <div><Label>Data de Expiração</Label><Input type="date" value={data.passaporte_data_expiracao || ''} onChange={e => onChange('passaporte_data_expiracao', e.target.value)} /></div>
      </div>
      <div>
        <Label>Já teve um passaporte perdido ou roubado?</Label>
        <RadioGroup value={data.passaporte_perdido || 'Não'} onValueChange={v => onChange('passaporte_perdido', v)} className="flex gap-4 mt-1">
          <div className="flex items-center gap-2"><RadioGroupItem value="Não" id="pass_perdido_nao" /><Label htmlFor="pass_perdido_nao">Não</Label></div>
          <div className="flex items-center gap-2"><RadioGroupItem value="Sim" id="pass_perdido_sim" /><Label htmlFor="pass_perdido_sim">Sim</Label></div>
        </RadioGroup>
      </div>
      {data.passaporte_perdido === 'Sim' && (
        <div className="bg-slate-50 rounded-xl p-4 space-y-4 border border-slate-200">
          <div><Label>Número do passaporte perdido/roubado</Label><Input value={data.passaporte_perdido_numero || ''} onChange={e => onChange('passaporte_perdido_numero', e.target.value)} /></div>
          <div><Label>País emissor do passaporte perdido/roubado</Label><Input value={data.passaporte_perdido_pais || ''} onChange={e => onChange('passaporte_perdido_pais', e.target.value)} /></div>
        </div>
      )}
    </div>
  );
}
