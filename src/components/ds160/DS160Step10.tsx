import { useEffect } from 'react';
import { DS160StepProps } from './types';
import { SectionTitle, TextField, DateField, CountryField, SelectField } from './fields';

const END_TIPO = [
  { value: 'mesmo', label: 'Mesmo que o meu' },
  { value: 'outro', label: 'Outro endereço' },
];

export default function DS160Step10({ data, onChange, errors }: DS160StepProps) {
  const ec = data.estado_civil;
  const isCasado = ec === 'M' || ec === 'C' || ec === 'P';
  const isDivorciado = ec === 'D';
  const isViuvo = ec === 'W';

  useEffect(() => {
    if (isCasado && !data.conjuge_endereco_tipo) onChange('conjuge_endereco_tipo', 'mesmo');
    if (isCasado && !data.conjuge_nacionalidade) onChange('conjuge_nacionalidade', 'Brasil');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ec]);

  if (!isCasado && !isDivorciado && !isViuvo) {
    return (
      <div className="space-y-6">
        <SectionTitle>10. Cônjuge</SectionTitle>
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800">
          Esta etapa não se aplica ao seu estado civil. Você pode avançar.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionTitle>10. Cônjuge</SectionTitle>

      {isCasado && (
        <>
          <TextField label="Nome do cônjuge" error={errors?.conjuge_nome} value={data.conjuge_nome} onChange={v => onChange('conjuge_nome', v)} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DateField label="Data de nascimento" value={data.conjuge_nascimento} onChange={v => onChange('conjuge_nascimento', v)} />
            <CountryField label="Nacionalidade" value={data.conjuge_nacionalidade || 'Brasil'} onChange={v => onChange('conjuge_nacionalidade', v)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField label="Cidade de nascimento" value={data.conjuge_cidade_nascimento} onChange={v => onChange('conjuge_cidade_nascimento', v)} />
            <CountryField label="País de nascimento" value={data.conjuge_pais_nascimento || 'Brasil'} onChange={v => onChange('conjuge_pais_nascimento', v)} />
          </div>
          <SelectField label="Endereço do cônjuge" options={END_TIPO} value={data.conjuge_endereco_tipo || 'mesmo'} onChange={v => onChange('conjuge_endereco_tipo', v)} />
        </>
      )}

      {isViuvo && (
        <>
          <p className="text-sm text-slate-500">Informe os dados do cônjuge falecido.</p>
          <TextField label="Nome do cônjuge" error={errors?.conjuge_nome} value={data.conjuge_nome} onChange={v => onChange('conjuge_nome', v)} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DateField label="Data de nascimento" value={data.conjuge_nascimento} onChange={v => onChange('conjuge_nascimento', v)} />
            <CountryField label="Nacionalidade" value={data.conjuge_nacionalidade || 'Brasil'} onChange={v => onChange('conjuge_nacionalidade', v)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField label="Cidade de nascimento" value={data.conjuge_cidade_nascimento} onChange={v => onChange('conjuge_cidade_nascimento', v)} />
            <CountryField label="País de nascimento" value={data.conjuge_pais_nascimento || 'Brasil'} onChange={v => onChange('conjuge_pais_nascimento', v)} />
          </div>
        </>
      )}

      {isDivorciado && (
        <>
          <TextField label="Número de ex-cônjuges" value={data.num_ex_conjuges} onChange={v => onChange('num_ex_conjuges', v)} inputMode="numeric" />
          <TextField label="Nome do ex-cônjuge" error={errors?.ex_conjuge_nome} value={data.ex_conjuge_nome} onChange={v => onChange('ex_conjuge_nome', v)} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DateField label="Data de nascimento" value={data.ex_conjuge_nascimento} onChange={v => onChange('ex_conjuge_nascimento', v)} />
            <CountryField label="Nacionalidade" value={data.ex_conjuge_nacionalidade || 'Brasil'} onChange={v => onChange('ex_conjuge_nacionalidade', v)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField label="Cidade de nascimento" value={data.ex_conjuge_cidade_nascimento} onChange={v => onChange('ex_conjuge_cidade_nascimento', v)} />
            <CountryField label="País de nascimento" value={data.ex_conjuge_pais_nascimento || 'Brasil'} onChange={v => onChange('ex_conjuge_pais_nascimento', v)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DateField label="Início do casamento" value={data.casamento_inicio} onChange={v => onChange('casamento_inicio', v)} />
            <DateField label="Fim do casamento" value={data.casamento_fim} onChange={v => onChange('casamento_fim', v)} />
          </div>
          <TextField label="Como o casamento terminou" value={data.casamento_como_terminou} onChange={v => onChange('casamento_como_terminou', v)} placeholder="Ex: Divórcio" />
          <CountryField label="País onde terminou" value={data.casamento_pais_termino || 'Brasil'} onChange={v => onChange('casamento_pais_termino', v)} />
        </>
      )}
    </div>
  );
}
