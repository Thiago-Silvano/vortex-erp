import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { DS160StepProps, COUNTRIES } from './types';
import { maskCpf } from '@/lib/masks';
import { FieldError, errClass } from './fieldError';

export default function DS160Step1({ data, onChange, errors }: DS160StepProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-600 border-b border-slate-200 pb-3">1. Dados Pessoais</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><Label>Sobrenome</Label><Input className={errClass(errors?.sobrenome)} value={data.sobrenome || ''} onChange={e => onChange('sobrenome', e.target.value)} placeholder="Seu Sobrenome" /><FieldError msg={errors?.sobrenome} /></div>
        <div><Label>Nome</Label><Input className={errClass(errors?.nome)} value={data.nome || ''} onChange={e => onChange('nome', e.target.value)} placeholder="Seu Nome" /><FieldError msg={errors?.nome} /></div>
      </div>
      <div><Label>Nome Completo (como no passaporte)</Label><Input className={errClass(errors?.nome_completo_passaporte)} value={data.nome_completo_passaporte || ''} onChange={e => onChange('nome_completo_passaporte', e.target.value)} placeholder="Ex: SILVA, JOSÉ DA" /><FieldError msg={errors?.nome_completo_passaporte} /></div>
      <div>
        <Label>Já usou outro nome? (nome de solteira, religioso, profissional ou apelido)</Label>
        <RadioGroup value={data.usou_outro_nome || 'Não'} onValueChange={v => onChange('usou_outro_nome', v)} className="flex gap-4 mt-1">
          <div className="flex items-center gap-2"><RadioGroupItem value="Não" id="outro_nome_nao" /><Label htmlFor="outro_nome_nao">Não</Label></div>
          <div className="flex items-center gap-2"><RadioGroupItem value="Sim" id="outro_nome_sim" /><Label htmlFor="outro_nome_sim">Sim</Label></div>
        </RadioGroup>
      </div>
      {data.usou_outro_nome === 'Sim' && (
        <div><Label>Qual outro nome?</Label><Input className={errClass(errors?.outro_nome)} value={data.outro_nome || ''} onChange={e => onChange('outro_nome', e.target.value)} placeholder="Informe o outro nome utilizado" /><FieldError msg={errors?.outro_nome} /></div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><Label>CPF</Label><Input className={errClass(errors?.cpf)} value={data.cpf || ''} onChange={e => onChange('cpf', maskCpf(e.target.value))} placeholder="000.000.000-00" /><FieldError msg={errors?.cpf} /></div>
        <div>
          <Label>Sexo</Label>
          <Select value={data.sexo || undefined} onValueChange={v => onChange('sexo', v)}>
            <SelectTrigger className={errClass(errors?.sexo)}><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent><SelectItem value="Masculino">Masculino</SelectItem><SelectItem value="Feminino">Feminino</SelectItem></SelectContent>
          </Select>
          <FieldError msg={errors?.sexo} />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Estado Civil</Label>
          <Select value={data.estado_civil || undefined} onValueChange={v => onChange('estado_civil', v)}>
            <SelectTrigger className={errClass(errors?.estado_civil)}><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {['Solteiro','Casado','União Estável','Divorciado','Viúvo'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <FieldError msg={errors?.estado_civil} />
        </div>
        <div><Label>Data de Nascimento</Label><Input type="date" className={errClass(errors?.data_nascimento)} value={data.data_nascimento || ''} onChange={e => onChange('data_nascimento', e.target.value)} /><FieldError msg={errors?.data_nascimento} /></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><Label>Cidade de Nascimento</Label><Input className={errClass(errors?.cidade_nascimento)} value={data.cidade_nascimento || ''} onChange={e => onChange('cidade_nascimento', e.target.value)} placeholder="Ex: São Paulo" /><FieldError msg={errors?.cidade_nascimento} /></div>
        <div><Label>Estado de Nascimento (UF/Província)</Label><Input className={errClass(errors?.estado_nascimento)} value={data.estado_nascimento || ''} onChange={e => onChange('estado_nascimento', e.target.value)} placeholder="Ex: SP" /><FieldError msg={errors?.estado_nascimento} /></div>
      </div>
      <div><Label>País de Nascimento</Label><Input className={errClass(errors?.pais_nascimento)} value={data.pais_nascimento || ''} onChange={e => onChange('pais_nascimento', e.target.value)} placeholder="Ex: Brasil" /><FieldError msg={errors?.pais_nascimento} /></div>
      <div>
        <Label>Nacionalidade</Label>
        <Input value={data.nacionalidade ?? 'Brasil'} onChange={e => onChange('nacionalidade', e.target.value)} placeholder="Ex: Brasil" />
        <p className="text-xs text-slate-400 mt-1">Informe sua nacionalidade atual conforme consta no passaporte.</p>
      </div>
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
            <Select value={data.pais_outra_nacionalidade || undefined} onValueChange={v => onChange('pais_outra_nacionalidade', v)}>
              <SelectTrigger className={errClass(errors?.pais_outra_nacionalidade)}><SelectValue placeholder="Selecione o país" /></SelectTrigger>
              <SelectContent>{COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
            <FieldError msg={errors?.pais_outra_nacionalidade} />
          </div>
          <div><Label>Número de identificação (Passaporte, identidade)</Label><Input value={data.id_outra_nacionalidade || ''} onChange={e => onChange('id_outra_nacionalidade', e.target.value)} /></div>
        </>
      )}
    </div>
  );
}
