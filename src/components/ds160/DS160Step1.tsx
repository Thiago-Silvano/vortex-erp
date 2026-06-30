import { useEffect } from 'react';
import { DS160StepProps, SEXO_OPTIONS, ESTADO_CIVIL_OPTIONS } from './types';
import {
  SectionTitle, TextField, SelectField, DateField, CountryField,
  UfField, CityField, YesNo, NACheckbox, Repeatable,
} from './fields';

const EC_OPTS = ESTADO_CIVIL_OPTIONS.map(o => ({ value: o.code, label: `${o.label}` }));

export default function DS160Step1({ data, onChange, errors }: DS160StepProps) {
  useEffect(() => {
    if (!data.pais_nascimento) onChange('pais_nascimento', 'Brasil');
    if (data.nome_nativo_na === undefined) onChange('nome_nativo_na', true);
    if (data.outros_nomes === undefined) onChange('outros_nomes', false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const paisNasc = data.pais_nascimento || 'Brasil';
  const naBornState = !!data.estado_nascimento_na;

  return (
    <div className="space-y-6">
      <SectionTitle>1. Dados Pessoais</SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TextField label="Sobrenome(s)" help="Nome de família, exatamente como aparece no passaporte." error={errors?.sobrenome} value={data.sobrenome} onChange={v => onChange('sobrenome', v)} placeholder="Ex: SILVA SANTOS" />
        <TextField label="Nome(s)" help="Seus prenomes, como no passaporte." error={errors?.nome} value={data.nome} onChange={v => onChange('nome', v)} placeholder="Ex: JOÃO PEDRO" />
      </div>
      <TextField label="Nome completo (como no passaporte)" error={errors?.nome_completo} value={data.nome_completo} onChange={v => onChange('nome_completo', v)} placeholder="Ex: JOÃO PEDRO DA SILVA SANTOS" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SelectField label="Sexo" options={SEXO_OPTIONS} error={errors?.sexo} value={data.sexo} onChange={v => onChange('sexo', v)} />
        <DateField label="Data de nascimento" error={errors?.data_nascimento} value={data.data_nascimento} onChange={v => onChange('data_nascimento', v)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <SelectField label="Estado civil" options={EC_OPTS} error={errors?.estado_civil} value={data.estado_civil} onChange={v => onChange('estado_civil', v)} />
          {data.estado_civil === 'O' && (
            <div className="mt-3"><TextField label="Especifique" error={errors?.estado_civil_outro} value={data.estado_civil_outro} onChange={v => onChange('estado_civil_outro', v)} /></div>
          )}
        </div>
        <CountryField label="País de nascimento" error={errors?.pais_nascimento} value={paisNasc} onChange={v => onChange('pais_nascimento', v)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <UfField label="Estado/Província de nascimento" error={errors?.estado_nascimento} value={data.estado_nascimento} onChange={v => { onChange('estado_nascimento', v); onChange('cidade_nascimento', ''); }} country={paisNasc} disabled={naBornState} />
          <NACheckbox checked={naBornState} onChange={c => { onChange('estado_nascimento_na', c); if (c) onChange('estado_nascimento', ''); }} />
        </div>
        <CityField label="Cidade de nascimento" error={errors?.cidade_nascimento} value={data.cidade_nascimento} onChange={v => onChange('cidade_nascimento', v)} uf={data.estado_nascimento || ''} country={paisNasc} />
      </div>

      <YesNo label="Já usou outros nomes? (nome de solteira, religioso, profissional ou apelido)" value={data.outros_nomes ?? false} onChange={v => onChange('outros_nomes', v)} />
      {data.outros_nomes && (
        <Repeatable
          items={data.outros_nomes_lista || []}
          onChange={v => onChange('outros_nomes_lista', v)}
          blank={() => ({ sobrenome: '', nome: '' })}
          addLabel="Adicionar nome"
          emptyHint="Adicione cada nome alternativo que você já usou."
          renderItem={(it: any, update) => (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <TextField label="Sobrenome" value={it.sobrenome} onChange={v => update({ ...it, sobrenome: v })} />
              <TextField label="Nome" value={it.nome} onChange={v => update({ ...it, nome: v })} />
            </div>
          )}
        />
      )}

      <div>
        <TextField label="Nome no alfabeto nativo (avançado)" help="Só preencha se seu nome usa outro alfabeto (ex.: árabe, cirílico). Para nomes em português, deixe marcado 'Não se aplica'." value={data.nome_nativo} onChange={v => onChange('nome_nativo', v)} disabled={data.nome_nativo_na ?? true} />
        <NACheckbox checked={data.nome_nativo_na ?? true} onChange={c => { onChange('nome_nativo_na', c); if (c) onChange('nome_nativo', ''); }} />
      </div>
    </div>
  );
}
