import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DS160StepProps, COUNTRIES } from './types';
import { FieldError, errClass } from './fieldError';
import { BRAZIL_STATES, isBrasil } from '@/data/brazil-states';
import BrazilCitySelect from './BrazilCitySelect';

const US_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'U.S. CITIZEN', label: 'Cidadão americano' },
  { value: 'LPR', label: 'Residente permanente (Green Card)' },
  { value: 'NONIMMIGRANT', label: 'Não-imigrante (visto temporário)' },
  { value: "OTHER/I DON'T KNOW", label: 'Outro / Não sei' },
];

export default function DS160Step6({ data, onChange, errors }: DS160StepProps) {
  const conjugePais = data.conjuge_pais_nascimento ?? 'Brasil';
  const conjugeBrasil = isBrasil(conjugePais);
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-600 border-b border-slate-200 pb-3">6. Informações de Família</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><Label>Nome Completo do Pai</Label><Input className={errClass(errors?.pai_nome)} value={data.pai_nome || ''} onChange={e => onChange('pai_nome', e.target.value)} /><FieldError msg={errors?.pai_nome} /></div>
        <div><Label>Data de Nascimento do Pai</Label><Input type="date" value={data.pai_nascimento || ''} onChange={e => onChange('pai_nascimento', e.target.value)} /></div>
      </div>
      <div>
        <Label>O seu pai mora nos EUA?</Label>
        <RadioGroup value={data.pai_mora_eua || 'Não'} onValueChange={v => onChange('pai_mora_eua', v)} className="flex gap-4 mt-1">
          <div className="flex items-center gap-2"><RadioGroupItem value="Não" id="pai_eua_nao" /><Label htmlFor="pai_eua_nao">Não</Label></div>
          <div className="flex items-center gap-2"><RadioGroupItem value="Sim" id="pai_eua_sim" /><Label htmlFor="pai_eua_sim">Sim</Label></div>
        </RadioGroup>
      </div>
      {data.pai_mora_eua === 'Sim' && (
        <div><Label>Status do Pai nos EUA</Label>
          <Select value={data.pai_status_eua || undefined} onValueChange={v => onChange('pai_status_eua', v)}>
            <SelectTrigger className={errClass(errors?.pai_status_eua)}><SelectValue placeholder="Selecione o status" /></SelectTrigger>
            <SelectContent>{US_STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
          </Select>
          <FieldError msg={errors?.pai_status_eua} />
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><Label>Nome Completo da Mãe</Label><Input className={errClass(errors?.mae_nome)} value={data.mae_nome || ''} onChange={e => onChange('mae_nome', e.target.value)} /><FieldError msg={errors?.mae_nome} /></div>
        <div><Label>Data de Nascimento da Mãe</Label><Input type="date" value={data.mae_nascimento || ''} onChange={e => onChange('mae_nascimento', e.target.value)} /></div>
      </div>
      <div>
        <Label>A sua mãe mora nos EUA?</Label>
        <RadioGroup value={data.mae_mora_eua || 'Não'} onValueChange={v => onChange('mae_mora_eua', v)} className="flex gap-4 mt-1">
          <div className="flex items-center gap-2"><RadioGroupItem value="Não" id="mae_eua_nao" /><Label htmlFor="mae_eua_nao">Não</Label></div>
          <div className="flex items-center gap-2"><RadioGroupItem value="Sim" id="mae_eua_sim" /><Label htmlFor="mae_eua_sim">Sim</Label></div>
        </RadioGroup>
      </div>
      {data.mae_mora_eua === 'Sim' && (
        <div><Label>Status da Mãe nos EUA</Label>
          <Select value={data.mae_status_eua || undefined} onValueChange={v => onChange('mae_status_eua', v)}>
            <SelectTrigger className={errClass(errors?.mae_status_eua)}><SelectValue placeholder="Selecione o status" /></SelectTrigger>
            <SelectContent>{US_STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
          </Select>
          <FieldError msg={errors?.mae_status_eua} />
        </div>
      )}
      <div><Label>Parentes imediatos nos EUA? (Explique a relação e o status migratório)</Label><Textarea value={data.parentes_eua || ''} onChange={e => onChange('parentes_eua', e.target.value)} rows={3} /></div>
      
      <div className="bg-slate-50 rounded-xl p-4 space-y-4 border border-slate-200">
        <h3 className="font-semibold text-sm text-slate-700">Dados do Cônjuge</h3>
        <div><Label>Nome Completo do Cônjuge</Label><Input className={errClass(errors?.conjuge_nome)} value={data.conjuge_nome || ''} onChange={e => onChange('conjuge_nome', e.target.value)} /><FieldError msg={errors?.conjuge_nome} /></div>
        <div><Label>Data de Nascimento</Label><Input type="date" className={errClass(errors?.conjuge_nascimento)} value={data.conjuge_nascimento || ''} onChange={e => onChange('conjuge_nascimento', e.target.value)} /><FieldError msg={errors?.conjuge_nascimento} /></div>
        <div><Label>País de Nascimento do Cônjuge</Label>
          <Select value={conjugePais} onValueChange={v => { onChange('conjuge_pais_nascimento', v); onChange('conjuge_estado_nascimento', ''); onChange('conjuge_cidade_nascimento', ''); }}>
            <SelectTrigger><SelectValue placeholder="Selecione o país" /></SelectTrigger>
            <SelectContent>{COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><Label>Estado de Nascimento (UF/Província)</Label>
            {conjugeBrasil ? (
              <Select value={data.conjuge_estado_nascimento || undefined} onValueChange={v => { onChange('conjuge_estado_nascimento', v); onChange('conjuge_cidade_nascimento', ''); }}>
                <SelectTrigger><SelectValue placeholder="Selecione o estado" /></SelectTrigger>
                <SelectContent>{BRAZIL_STATES.map(s => <SelectItem key={s.uf} value={s.uf}>{s.nome} ({s.uf})</SelectItem>)}</SelectContent>
              </Select>
            ) : (
              <Input value={data.conjuge_estado_nascimento || ''} onChange={e => onChange('conjuge_estado_nascimento', e.target.value)} placeholder="Estado / Província" />
            )}
          </div>
          <div><Label>Cidade de Nascimento</Label>
            {conjugeBrasil ? (
              <BrazilCitySelect uf={data.conjuge_estado_nascimento || ''} value={data.conjuge_cidade_nascimento || ''} onChange={v => onChange('conjuge_cidade_nascimento', v)} />
            ) : (
              <Input value={data.conjuge_cidade_nascimento || ''} onChange={e => onChange('conjuge_cidade_nascimento', e.target.value)} placeholder="Ex: São Paulo" />
            )}
          </div>
        </div>
        <div><Label>Detalhes do Divórcio</Label><Input value={data.conjuge_divorcio || ''} onChange={e => onChange('conjuge_divorcio', e.target.value)} /></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><Label>Data de Início do Casamento</Label><Input type="date" className={errClass(errors?.conjuge_casamento_inicio)} value={data.conjuge_casamento_inicio || ''} onChange={e => onChange('conjuge_casamento_inicio', e.target.value)} /><FieldError msg={errors?.conjuge_casamento_inicio} /></div>
          <div><Label>Data de Fim do Casamento/Divórcio</Label><Input type="date" className={errClass(errors?.conjuge_casamento_fim)} value={data.conjuge_casamento_fim || ''} onChange={e => onChange('conjuge_casamento_fim', e.target.value)} /><FieldError msg={errors?.conjuge_casamento_fim} /></div>
        </div>
        <div><Label>Detalhes do Falecimento</Label><Input value={data.conjuge_falecimento || ''} onChange={e => onChange('conjuge_falecimento', e.target.value)} /></div>
        <div><Label>Data de Falecimento do Cônjuge</Label><Input type="date" className={errClass(errors?.conjuge_falecimento_data)} value={data.conjuge_falecimento_data || ''} onChange={e => onChange('conjuge_falecimento_data', e.target.value)} /><FieldError msg={errors?.conjuge_falecimento_data} /></div>
      </div>
    </div>
  );
}
