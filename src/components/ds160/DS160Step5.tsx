import { useEffect } from 'react';
import { DS160StepProps } from './types';
import { SectionTitle, TextField, DateField, AreaField, YesNo, Repeatable } from './fields';

export default function DS160Step5({ data, onChange, errors }: DS160StepProps) {
  useEffect(() => {
    ['viagens_anteriores_eua', 'carteira_motorista_eua', 'visto_anterior', 'visto_negado', 'peticao_imigrante'].forEach(k => {
      if (data[k] === undefined) onChange(k, false);
    });
    if (data.visto_dez_digitais === undefined) onChange('visto_dez_digitais', true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <SectionTitle>5. Viagens Anteriores aos EUA</SectionTitle>

      <YesNo label="Você já esteve nos Estados Unidos?" value={data.viagens_anteriores_eua ?? false} onChange={v => onChange('viagens_anteriores_eua', v)} />
      {data.viagens_anteriores_eua && (
        <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50/60 p-4">
          <Repeatable
            label="Visitas anteriores"
            items={data.visitas_anteriores || []}
            onChange={v => onChange('visitas_anteriores', v)}
            blank={() => ({ data_chegada: '', duracao_dias: '' })}
            addLabel="Adicionar visita"
            renderItem={(it: any, update) => (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <DateField label="Data de chegada" value={it.data_chegada} onChange={v => update({ ...it, data_chegada: v })} />
                <TextField label="Duração (dias)" value={it.duracao_dias} onChange={v => update({ ...it, duracao_dias: v })} inputMode="numeric" />
              </div>
            )}
          />
          <YesNo label="Tem ou já teve carteira de motorista dos EUA?" value={data.carteira_motorista_eua ?? false} onChange={v => onChange('carteira_motorista_eua', v)} />
          {data.carteira_motorista_eua && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <TextField label="Número da carteira" value={data.carteira_motorista_numero} onChange={v => onChange('carteira_motorista_numero', v)} />
              <TextField label="Estado emissor" value={data.carteira_motorista_estado} onChange={v => onChange('carteira_motorista_estado', v)} />
            </div>
          )}
        </div>
      )}

      <YesNo label="Você já teve um visto americano?" value={data.visto_anterior ?? false} onChange={v => onChange('visto_anterior', v)} />
      {data.visto_anterior && (
        <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50/60 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <DateField label="Data de emissão" value={data.visto_data_emissao} onChange={v => onChange('visto_data_emissao', v)} />
            <TextField label="Número do visto" value={data.visto_numero} onChange={v => onChange('visto_numero', v)} />
          </div>
          <YesNo label="Está solicitando o mesmo tipo de visto?" value={data.visto_mesmo_tipo ?? false} onChange={v => onChange('visto_mesmo_tipo', v)} />
          <YesNo label="No mesmo local/país?" value={data.visto_mesmo_local ?? false} onChange={v => onChange('visto_mesmo_local', v)} />
          <YesNo label="Forneceu as 10 digitais?" value={data.visto_dez_digitais ?? true} onChange={v => onChange('visto_dez_digitais', v)} />
          <YesNo label="Visto perdido ou roubado?" value={data.visto_perdido_roubado ?? false} onChange={v => onChange('visto_perdido_roubado', v)} />
          {data.visto_perdido_roubado && (
            <div className="space-y-3">
              <TextField label="Ano" value={data.visto_perdido_ano} onChange={v => onChange('visto_perdido_ano', v)} inputMode="numeric" />
              <AreaField label="Explicação" value={data.visto_perdido_explicacao} onChange={v => onChange('visto_perdido_explicacao', v)} />
            </div>
          )}
          <YesNo label="Visto já foi cancelado/revogado?" value={data.visto_cancelado ?? false} onChange={v => onChange('visto_cancelado', v)} />
          {data.visto_cancelado && (
            <AreaField label="Explicação" value={data.visto_cancelado_explicacao} onChange={v => onChange('visto_cancelado_explicacao', v)} />
          )}
        </div>
      )}

      <YesNo label="Algum visto americano já foi recusado/negado a você?" value={data.visto_negado ?? false} onChange={v => onChange('visto_negado', v)} />
      {data.visto_negado && (
        <AreaField label="Explicação" value={data.visto_negado_explicacao} onChange={v => onChange('visto_negado_explicacao', v)} />
      )}

      <YesNo label="Alguém já entrou com uma petição de imigração em seu nome?" value={data.peticao_imigrante ?? false} onChange={v => onChange('peticao_imigrante', v)} />
      {data.peticao_imigrante && (
        <AreaField label="Explicação" value={data.peticao_imigrante_explicacao} onChange={v => onChange('peticao_imigrante_explicacao', v)} />
      )}
    </div>
  );
}
