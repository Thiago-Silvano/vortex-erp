import { useEffect } from 'react';
import { DS160StepProps } from './types';
import { maskCpf } from '@/lib/masks';
import { SectionTitle, TextField, CountryField, YesNo, NACheckbox } from './fields';

export default function DS160Step2({ data, onChange, errors }: DS160StepProps) {
  useEffect(() => {
    if (!data.nacionalidade) onChange('nacionalidade', 'Brasil');
    if (data.outra_nacionalidade === undefined) onChange('outra_nacionalidade', false);
    if (data.residente_outro_pais === undefined) onChange('residente_outro_pais', false);
    if (data.ssn_eua_na === undefined) onChange('ssn_eua_na', true);
    if (data.tax_id_eua_na === undefined) onChange('tax_id_eua_na', true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <SectionTitle>2. Nacionalidade e Documentos</SectionTitle>
      <CountryField label="Nacionalidade" error={errors?.nacionalidade} value={data.nacionalidade || 'Brasil'} onChange={v => onChange('nacionalidade', v)} />

      <YesNo label="Possui outra nacionalidade?" value={data.outra_nacionalidade ?? false} onChange={v => onChange('outra_nacionalidade', v)} />
      {data.outra_nacionalidade && (
        <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50/60 p-4">
          <CountryField label="País da outra nacionalidade" error={errors?.outra_nacionalidade_pais} value={data.outra_nacionalidade_pais} onChange={v => onChange('outra_nacionalidade_pais', v)} />
          <YesNo label="Tem passaporte desse país?" value={data.outra_nacionalidade_tem_passaporte ?? false} onChange={v => onChange('outra_nacionalidade_tem_passaporte', v)} />
          {data.outra_nacionalidade_tem_passaporte && (
            <TextField label="Número do passaporte dessa nacionalidade" error={errors?.outra_nacionalidade_passaporte} value={data.outra_nacionalidade_passaporte} onChange={v => onChange('outra_nacionalidade_passaporte', v)} />
          )}
        </div>
      )}

      <YesNo label="É residente permanente de outro país (diferente da sua nacionalidade)?" value={data.residente_outro_pais ?? false} onChange={v => onChange('residente_outro_pais', v)} />
      {data.residente_outro_pais && (
        <CountryField label="Qual país?" error={errors?.residente_outro_pais_qual} value={data.residente_outro_pais_qual} onChange={v => onChange('residente_outro_pais_qual', v)} />
      )}

      <div>
        <TextField label="CPF" help="O CPF é usado no campo 'National ID' do DS-160." error={errors?.cpf} value={data.cpf} onChange={v => onChange('cpf', maskCpf(v))} placeholder="000.000.000-00" disabled={!!data.cpf_na} inputMode="numeric" />
        <NACheckbox checked={!!data.cpf_na} onChange={c => { onChange('cpf_na', c); if (c) onChange('cpf', ''); }} />
      </div>

      <div>
        <TextField label="Número de Seguro Social dos EUA (SSN)" error={errors?.ssn_eua} value={data.ssn_eua} onChange={v => onChange('ssn_eua', v)} disabled={data.ssn_eua_na ?? true} />
        <NACheckbox checked={data.ssn_eua_na ?? true} onChange={c => { onChange('ssn_eua_na', c); if (c) onChange('ssn_eua', ''); }} />
      </div>

      <div>
        <TextField label="Número de contribuinte fiscal dos EUA (Tax ID)" error={errors?.tax_id_eua} value={data.tax_id_eua} onChange={v => onChange('tax_id_eua', v)} disabled={data.tax_id_eua_na ?? true} />
        <NACheckbox checked={data.tax_id_eua_na ?? true} onChange={c => { onChange('tax_id_eua_na', c); if (c) onChange('tax_id_eua', ''); }} />
      </div>
    </div>
  );
}
