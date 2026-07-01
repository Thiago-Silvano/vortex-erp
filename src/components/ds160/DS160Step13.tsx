import { useEffect } from 'react';
import { DS160StepProps } from './types';
import { SectionTitle, TextField, CountryField, DateField, AreaField, YesNo, Repeatable } from './fields';

export default function DS160Step13({ data, onChange, errors }: DS160StepProps) {
  useEffect(() => {
    ['clan_tribo', 'tem_paises_visitados', 'pertence_organizacao', 'habilidades_especiais', 'servico_militar', 'paramilitar'].forEach(k => {
      if (data[k] === undefined) onChange(k, false);
    });
    if (!data.idiomas) onChange('idiomas', ['Português']);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <SectionTitle>13. Informações Adicionais</SectionTitle>

      <YesNo label="Você pertence a algum clã ou tribo?" value={data.clan_tribo ?? false} onChange={v => onChange('clan_tribo', v)} />
      {data.clan_tribo && <TextField label="Nome do clã/tribo" error={errors?.clan_tribo_nome} value={data.clan_tribo_nome} onChange={v => onChange('clan_tribo_nome', v)} />}

      <Repeatable
        label="Idiomas que você fala"
        items={data.idiomas || []}
        onChange={v => onChange('idiomas', v)}
        blank={() => ''}
        addLabel="Adicionar idioma"
        renderItem={(it: any, update) => <TextField label="Idioma" value={it} onChange={v => update(v)} />}
      />

      <YesNo label="Você viajou a outros países nos últimos 5 anos?" value={data.tem_paises_visitados ?? false} onChange={v => { onChange('tem_paises_visitados', v); if (!v) onChange('paises_visitados', []); }} />
      {data.tem_paises_visitados && (
        <Repeatable
          label="Países visitados"
          items={data.paises_visitados || []}
          onChange={v => onChange('paises_visitados', v)}
          blank={() => ''}
          addLabel="Adicionar país"
          error={errors?.paises_visitados}
          renderItem={(it: any, update) => <CountryField label="País" value={it} onChange={v => update(v)} />}
        />
      )}

      <YesNo label="Você pertence/contribui com alguma organização profissional, social ou de caridade?" value={data.pertence_organizacao ?? false} onChange={v => { onChange('pertence_organizacao', v); if (!v) onChange('organizacoes', []); }} />
      {data.pertence_organizacao && (
        <Repeatable
          label="Organizações"
          items={data.organizacoes || []}
          onChange={v => onChange('organizacoes', v)}
          blank={() => ''}
          addLabel="Adicionar organização"
          error={errors?.organizacoes}
          renderItem={(it: any, update) => <TextField label="Organização" value={it} onChange={v => update(v)} />}
        />
      )}

      <YesNo label="Você tem habilidades ou treinamento especializado (armas, explosivos, nuclear, biológico, químico)?" value={data.habilidades_especiais ?? false} onChange={v => onChange('habilidades_especiais', v)} />
      {data.habilidades_especiais && <AreaField label="Explicação" error={errors?.habilidades_especiais_explicacao} value={data.habilidades_especiais_explicacao} onChange={v => onChange('habilidades_especiais_explicacao', v)} />}

      <YesNo label="Você já serviu em forças armadas?" value={data.servico_militar ?? false} onChange={v => onChange('servico_militar', v)} />
      {data.servico_militar && (
        <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/60 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <CountryField label="País" error={errors?.militar_pais} value={data.militar_pais || 'Brasil'} onChange={v => onChange('militar_pais', v)} />
            <TextField label="Ramo" error={errors?.militar_ramo} value={data.militar_ramo} onChange={v => onChange('militar_ramo', v)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <TextField label="Posto" value={data.militar_posto} onChange={v => onChange('militar_posto', v)} />
            <TextField label="Especialidade" value={data.militar_especialidade} onChange={v => onChange('militar_especialidade', v)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <DateField label="Data de início" error={errors?.militar_data_inicio} value={data.militar_data_inicio} onChange={v => onChange('militar_data_inicio', v)} />
            <DateField label="Data de fim" value={data.militar_data_fim} onChange={v => onChange('militar_data_fim', v)} />
          </div>
        </div>
      )}

      <YesNo label="Você já pertenceu a um grupo paramilitar, guerrilha ou unidade rebelde?" value={data.paramilitar ?? false} onChange={v => onChange('paramilitar', v)} />
      {data.paramilitar && <AreaField label="Explicação" error={errors?.paramilitar_explicacao} value={data.paramilitar_explicacao} onChange={v => onChange('paramilitar_explicacao', v)} />}
    </div>
  );
}
