import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { DS160StepProps } from './types';

export default function DS160Step6({ data, onChange }: DS160StepProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-600 border-b border-slate-200 pb-3">6. Informações de Família</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><Label>Nome Completo do Pai</Label><Input value={data.pai_nome || ''} onChange={e => onChange('pai_nome', e.target.value)} /></div>
        <div><Label>Data de Nascimento do Pai</Label><Input type="date" value={data.pai_nascimento || ''} onChange={e => onChange('pai_nascimento', e.target.value)} /></div>
      </div>
      <div>
        <Label>O seu pai mora nos EUA?</Label>
        <RadioGroup value={data.pai_mora_eua || 'Não'} onValueChange={v => onChange('pai_mora_eua', v)} className="flex gap-4 mt-1">
          <div className="flex items-center gap-2"><RadioGroupItem value="Não" id="pai_eua_nao" /><Label htmlFor="pai_eua_nao">Não</Label></div>
          <div className="flex items-center gap-2"><RadioGroupItem value="Sim" id="pai_eua_sim" /><Label htmlFor="pai_eua_sim">Sim</Label></div>
        </RadioGroup>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><Label>Nome Completo da Mãe</Label><Input value={data.mae_nome || ''} onChange={e => onChange('mae_nome', e.target.value)} /></div>
        <div><Label>Data de Nascimento da Mãe</Label><Input type="date" value={data.mae_nascimento || ''} onChange={e => onChange('mae_nascimento', e.target.value)} /></div>
      </div>
      <div>
        <Label>A sua mãe mora nos EUA?</Label>
        <RadioGroup value={data.mae_mora_eua || 'Não'} onValueChange={v => onChange('mae_mora_eua', v)} className="flex gap-4 mt-1">
          <div className="flex items-center gap-2"><RadioGroupItem value="Não" id="mae_eua_nao" /><Label htmlFor="mae_eua_nao">Não</Label></div>
          <div className="flex items-center gap-2"><RadioGroupItem value="Sim" id="mae_eua_sim" /><Label htmlFor="mae_eua_sim">Sim</Label></div>
        </RadioGroup>
      </div>
      <div><Label>Parentes imediatos nos EUA? (Explique a relação e o status migratório)</Label><Textarea value={data.parentes_eua || ''} onChange={e => onChange('parentes_eua', e.target.value)} rows={3} /></div>
      
      <div className="bg-slate-50 rounded-xl p-4 space-y-4 border border-slate-200">
        <h3 className="font-semibold text-sm text-slate-700">Dados do Cônjuge</h3>
        <div><Label>Nome Completo do Cônjuge</Label><Input value={data.conjuge_nome || ''} onChange={e => onChange('conjuge_nome', e.target.value)} /></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><Label>Data de Nascimento</Label><Input type="date" value={data.conjuge_nascimento || ''} onChange={e => onChange('conjuge_nascimento', e.target.value)} /></div>
          <div><Label>Cidade e Estado de Nascimento</Label><Input value={data.conjuge_cidade_nascimento || ''} onChange={e => onChange('conjuge_cidade_nascimento', e.target.value)} /></div>
        </div>
        <div><Label>País de Nascimento do Cônjuge</Label><Input value={data.conjuge_pais_nascimento ?? 'Brasil'} onChange={e => onChange('conjuge_pais_nascimento', e.target.value)} placeholder="Ex: Brasil" /></div>
        <div><Label>Detalhes do Divórcio</Label><Input value={data.conjuge_divorcio || ''} onChange={e => onChange('conjuge_divorcio', e.target.value)} /></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><Label>Data de Início do Casamento</Label><Input type="date" value={data.conjuge_casamento_inicio || ''} onChange={e => onChange('conjuge_casamento_inicio', e.target.value)} /></div>
          <div><Label>Data de Fim do Casamento/Divórcio</Label><Input type="date" value={data.conjuge_casamento_fim || ''} onChange={e => onChange('conjuge_casamento_fim', e.target.value)} /></div>
        </div>
        <div><Label>Detalhes do Falecimento</Label><Input value={data.conjuge_falecimento || ''} onChange={e => onChange('conjuge_falecimento', e.target.value)} /></div>
        <div><Label>Data de Falecimento do Cônjuge</Label><Input type="date" value={data.conjuge_falecimento_data || ''} onChange={e => onChange('conjuge_falecimento_data', e.target.value)} /></div>
      </div>
    </div>
  );
}
