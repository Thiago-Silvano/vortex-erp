import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DS160StepProps, COUNTRIES } from './types';

export default function DS160Step2({ data, onChange }: DS160StepProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-800 border-b border-slate-200 pb-3">2. Informações de Passaporte</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><Label>Nº Passaporte</Label><Input value={data.passaporte_numero || ''} onChange={e => onChange('passaporte_numero', e.target.value)} placeholder="Número do Passaporte" /></div>
        <div>
          <Label>País Emissor</Label>
          <Select value={data.passaporte_pais_emissor || ''} onValueChange={v => onChange('passaporte_pais_emissor', v)}>
            <SelectTrigger><SelectValue placeholder="Selecione o país" /></SelectTrigger>
            <SelectContent>{COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div><Label>Cidade Onde o Passaporte Foi Emitido</Label><Input value={data.passaporte_cidade_emissao || ''} onChange={e => onChange('passaporte_cidade_emissao', e.target.value)} /></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><Label>Data de Emissão</Label><Input type="date" value={data.passaporte_data_emissao || ''} onChange={e => onChange('passaporte_data_emissao', e.target.value)} /></div>
        <div><Label>Data de Expiração</Label><Input type="date" value={data.passaporte_data_expiracao || ''} onChange={e => onChange('passaporte_data_expiracao', e.target.value)} /></div>
      </div>
      <div><Label>Já teve um passaporte perdido/roubado? (Explique brevemente)</Label><Textarea value={data.passaporte_perdido_roubado || ''} onChange={e => onChange('passaporte_perdido_roubado', e.target.value)} rows={3} /></div>
    </div>
  );
}
