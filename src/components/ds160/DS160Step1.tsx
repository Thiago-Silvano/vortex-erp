import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { DS160StepProps, COUNTRIES } from './types';
import { maskCpf } from '@/lib/masks';

export default function DS160Step1({ data, onChange }: DS160StepProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-800 border-b border-slate-200 pb-3">1. Dados Pessoais</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><Label>Sobrenome</Label><Input value={data.sobrenome || ''} onChange={e => onChange('sobrenome', e.target.value)} placeholder="Seu Sobrenome" /></div>
        <div><Label>Nome</Label><Input value={data.nome || ''} onChange={e => onChange('nome', e.target.value)} placeholder="Seu Nome" /></div>
      </div>
      <div><Label>Nome Completo (como no passaporte)</Label><Input value={data.nome_completo_passaporte || ''} onChange={e => onChange('nome_completo_passaporte', e.target.value)} placeholder="Ex: SILVA, JOSÉ DA" /></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><Label>CPF</Label><Input value={data.cpf || ''} onChange={e => onChange('cpf', maskCpf(e.target.value))} placeholder="000.000.000-00" /></div>
        <div>
          <Label>Sexo</Label>
          <Select value={data.sexo || undefined} onValueChange={v => onChange('sexo', v)}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent><SelectItem value="Masculino">Masculino</SelectItem><SelectItem value="Feminino">Feminino</SelectItem></SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Estado Civil</Label>
          <Select value={data.estado_civil || undefined} onValueChange={v => onChange('estado_civil', v)}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {['Solteiro','Casado','União Estável','Divorciado','Viúvo'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div><Label>Data de Nascimento</Label><Input type="date" value={data.data_nascimento || ''} onChange={e => onChange('data_nascimento', e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><Label>Cidade de Nascimento</Label><Input value={data.cidade_nascimento || ''} onChange={e => onChange('cidade_nascimento', e.target.value)} placeholder="Ex: São Paulo" /></div>
        <div><Label>Estado de Nascimento (UF/Província)</Label><Input value={data.estado_nascimento || ''} onChange={e => onChange('estado_nascimento', e.target.value)} placeholder="Ex: SP" /></div>
      </div>
      <div><Label>País de Nascimento</Label><Input value={data.pais_nascimento || ''} onChange={e => onChange('pais_nascimento', e.target.value)} placeholder="Ex: Brasil" /></div>
      <div>
        <Label>Possui outra nacionalidade?</Label>
        <RadioGroup value={data.outra_nacionalidade || 'Não'} onValueChange={v => onChange('outra_nacionalidade', v)} className="flex gap-4 mt-1">
          <div className="flex items-center gap-2"><RadioGroupItem value="Não" id="nat_nao" /><Label htmlFor="nat_nao">Não</Label></div>
          <div className="flex items-center gap-2"><RadioGroupItem value="Sim" id="nat_sim" /><Label htmlFor="nat_sim">Sim</Label></div>
        </RadioGroup>
      </div>
      {data.outra_nacionalidade === 'Sim' && (
        <>
          <div>
            <Label>País da Outra Nacionalidade</Label>
            <Select value={data.pais_outra_nacionalidade || ''} onValueChange={v => onChange('pais_outra_nacionalidade', v)}>
              <SelectTrigger><SelectValue placeholder="Selecione o país" /></SelectTrigger>
              <SelectContent>{COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Número de identificação (Passaporte, identidade)</Label><Input value={data.id_outra_nacionalidade || ''} onChange={e => onChange('id_outra_nacionalidade', e.target.value)} /></div>
        </>
      )}
    </div>
  );
}
