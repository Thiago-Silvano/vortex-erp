import { useEffect } from 'react';
import { DS160StepProps } from './types';
import { maskPhone } from '@/lib/masks';
import { SectionTitle, SubTitle, TextField, DateField, CountryField, UfField, AreaField, YesNo, NACheckbox, Repeatable } from './fields';

export default function DS160Step12({ data, onChange, errors }: DS160StepProps) {
  useEffect(() => {
    if (data.tem_empregos_anteriores === undefined) onChange('tem_empregos_anteriores', false);
    if (data.educacao_adicional === undefined) onChange('educacao_adicional', false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <SectionTitle>12. Trabalho e Educação Anteriores</SectionTitle>

      <SubTitle>Empregos anteriores</SubTitle>
      <YesNo label="Você já trabalhou antes (empregos anteriores)?" value={data.tem_empregos_anteriores ?? false} onChange={v => { onChange('tem_empregos_anteriores', v); if (!v) onChange('empregos_anteriores', []); }} />
      {data.tem_empregos_anteriores && (
        <Repeatable
          items={data.empregos_anteriores || []}
          onChange={v => onChange('empregos_anteriores', v)}
          blank={() => ({ empresa: '', endereco: '', telefone: '', cargo: '', supervisor_sobrenome: '', supervisor_nome: '', data_inicio: '', data_fim: '', descricao: '' })}
          addLabel="Adicionar emprego"
          error={errors?.empregos_anteriores}
          renderItem={(it: any, update) => (
            <div className="space-y-3">
              <TextField label="Empresa" value={it.empresa} onChange={v => update({ ...it, empresa: v })} />
              <TextField label="Endereço" value={it.endereco} onChange={v => update({ ...it, endereco: v })} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <TextField label="Telefone" value={it.telefone} onChange={v => update({ ...it, telefone: maskPhone(v) })} inputMode="numeric" />
                <TextField label="Cargo" value={it.cargo} onChange={v => update({ ...it, cargo: v })} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <TextField label="Sobrenome do supervisor" value={it.supervisor_sobrenome} onChange={v => update({ ...it, supervisor_sobrenome: v })} />
                <TextField label="Nome do supervisor" value={it.supervisor_nome} onChange={v => update({ ...it, supervisor_nome: v })} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <DateField label="Data de início" value={it.data_inicio} onChange={v => update({ ...it, data_inicio: v })} />
                <DateField label="Data de fim" value={it.data_fim} onChange={v => update({ ...it, data_fim: v })} />
              </div>
              <AreaField label="Descrição das funções" value={it.descricao} onChange={v => update({ ...it, descricao: v })} />
            </div>
          )}
        />
      )}

      <SubTitle>Educação</SubTitle>
      <YesNo label="Você estudou além do ensino fundamental (médio, técnico, superior, pós)?" value={data.educacao_adicional ?? false} onChange={v => { onChange('educacao_adicional', v); if (!v) onChange('instituicoes', []); }} />
      {data.educacao_adicional && (
        <>
          <TextField label="Nível de educação" error={errors?.nivel_educacao} value={data.nivel_educacao} onChange={v => onChange('nivel_educacao', v)} placeholder="Ex: Superior, Médio, Pós" />
          <Repeatable
            label="Instituições de ensino"
            items={data.instituicoes || []}
            onChange={v => onChange('instituicoes', v)}
            blank={() => ({ nome: '', endereco: '', cidade: '', estado: '', estado_na: false, cep: '', cep_na: false, pais: 'Brasil', curso: '', data_inicio: '', data_fim: '' })}
            addLabel="Adicionar instituição"
            error={errors?.instituicoes}
            renderItem={(it: any, update) => (
              <div className="space-y-3">
                <TextField label="Nome" value={it.nome} onChange={v => update({ ...it, nome: v })} />
                <TextField label="Endereço" value={it.endereco} onChange={v => update({ ...it, endereco: v })} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <TextField label="Cidade" value={it.cidade} onChange={v => update({ ...it, cidade: v })} />
                  <CountryField label="País" value={it.pais || 'Brasil'} onChange={v => update({ ...it, pais: v })} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <UfField label="UF / Estado" value={it.estado} onChange={v => update({ ...it, estado: v })} country={it.pais || 'Brasil'} disabled={!!it.estado_na} />
                    <NACheckbox checked={!!it.estado_na} onChange={c => update({ ...it, estado_na: c, estado: c ? '' : it.estado })} />
                  </div>
                  <div>
                    <TextField label="CEP" value={it.cep} onChange={v => update({ ...it, cep: v })} inputMode="numeric" disabled={!!it.cep_na} />
                    <NACheckbox checked={!!it.cep_na} onChange={c => update({ ...it, cep_na: c, cep: c ? '' : it.cep })} />
                  </div>
                </div>
                <TextField label="Curso" value={it.curso} onChange={v => update({ ...it, curso: v })} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <DateField label="Data de início" value={it.data_inicio} onChange={v => update({ ...it, data_inicio: v })} />
                  <DateField label="Data de fim" value={it.data_fim} onChange={v => update({ ...it, data_fim: v })} />
                </div>
              </div>
            )}
          />
        </>
      )}
    </div>
  );
}
