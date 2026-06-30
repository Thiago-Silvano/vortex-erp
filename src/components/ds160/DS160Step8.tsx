import { useEffect } from 'react';
import { DS160StepProps, CONTATO_EUA_RELACAO_OPTIONS } from './types';
import { maskPhone } from '@/lib/masks';
import { SectionTitle, TextField, SelectField, UsStateField } from './fields';

const TIPO_OPTS = [
  { value: 'pessoa', label: 'Uma pessoa' },
  { value: 'organizacao', label: 'Uma organização (ex.: hotel)' },
  { value: 'nao_sei', label: 'Não sei ainda' },
];

export default function DS160Step8({ data, onChange, errors }: DS160StepProps) {
  useEffect(() => {
    if (!data.contato_eua_tipo) onChange('contato_eua_tipo', 'pessoa');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <SectionTitle>8. Contato nos EUA</SectionTitle>
      <SelectField label="Seu contato nos EUA é uma pessoa ou uma organização?" options={TIPO_OPTS} value={data.contato_eua_tipo || 'pessoa'} onChange={v => onChange('contato_eua_tipo', v)} />
      <TextField label="Nome (da pessoa ou da organização)" error={errors?.contato_eua_nome} value={data.contato_eua_nome} onChange={v => onChange('contato_eua_nome', v)} />
      <SelectField label="Relação com você" options={CONTATO_EUA_RELACAO_OPTIONS} value={data.contato_eua_relacao} onChange={v => onChange('contato_eua_relacao', v)} />
      <TextField label="Endereço nos EUA" value={data.contato_eua_endereco} onChange={v => onChange('contato_eua_endereco', v)} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <TextField label="Cidade" value={data.contato_eua_cidade} onChange={v => onChange('contato_eua_cidade', v)} />
        <UsStateField label="Estado (EUA)" value={data.contato_eua_estado} onChange={v => onChange('contato_eua_estado', v)} />
        <TextField label="ZIP" value={data.contato_eua_cep} onChange={v => onChange('contato_eua_cep', v)} inputMode="numeric" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TextField label="Telefone" value={data.contato_eua_telefone} onChange={v => onChange('contato_eua_telefone', maskPhone(v))} inputMode="numeric" />
        <TextField label="Email (opcional)" value={data.contato_eua_email} onChange={v => onChange('contato_eua_email', v)} type="email" />
      </div>
    </div>
  );
}
