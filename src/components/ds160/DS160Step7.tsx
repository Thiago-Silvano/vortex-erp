import { useEffect } from 'react';
import { DS160StepProps, PASSAPORTE_TIPO_OPTIONS } from './types';
import { SectionTitle, TextField, SelectField, DateField, CountryField, UfField, CityField, YesNo, NACheckbox, AreaField } from './fields';

export default function DS160Step7({ data, onChange, errors }: DS160StepProps) {
  useEffect(() => {
    if (!data.passaporte_tipo) onChange('passaporte_tipo', 'Regular');
    if (!data.passaporte_pais_emissor) onChange('passaporte_pais_emissor', 'Brasil');
    if (!data.passaporte_pais_emissao) onChange('passaporte_pais_emissao', 'Brasil');
    if (data.passaporte_livro_numero_na === undefined) onChange('passaporte_livro_numero_na', true);
    if (data.passaporte_perdido === undefined) onChange('passaporte_perdido', false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const paisEmissao = data.passaporte_pais_emissao || 'Brasil';
  const naEstado = !!data.passaporte_estado_emissao_na;

  return (
    <div className="space-y-6">
      <SectionTitle>7. Passaporte</SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SelectField label="Tipo de passaporte" options={PASSAPORTE_TIPO_OPTIONS} error={errors?.passaporte_tipo} value={data.passaporte_tipo || 'Regular'} onChange={v => onChange('passaporte_tipo', v)} />
        <TextField label="Número do passaporte" error={errors?.passaporte_numero} value={data.passaporte_numero} onChange={v => onChange('passaporte_numero', v)} />
      </div>

      <div>
        <TextField label="Número do livro do passaporte" value={data.passaporte_livro_numero} onChange={v => onChange('passaporte_livro_numero', v)} disabled={data.passaporte_livro_numero_na ?? true} />
        <NACheckbox checked={data.passaporte_livro_numero_na ?? true} onChange={c => { onChange('passaporte_livro_numero_na', c); if (c) onChange('passaporte_livro_numero', ''); }} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CountryField label="País que emitiu" value={data.passaporte_pais_emissor || 'Brasil'} onChange={v => onChange('passaporte_pais_emissor', v)} />
        <CountryField label="País de emissão" value={paisEmissao} onChange={v => onChange('passaporte_pais_emissao', v)} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CityField label="Cidade de emissão" value={data.passaporte_cidade_emissao} onChange={v => onChange('passaporte_cidade_emissao', v)} uf={data.passaporte_estado_emissao || ''} country={paisEmissao} />
        <div>
          <UfField label="UF de emissão" value={data.passaporte_estado_emissao} onChange={v => onChange('passaporte_estado_emissao', v)} country={paisEmissao} disabled={naEstado} />
          <NACheckbox checked={naEstado} onChange={c => { onChange('passaporte_estado_emissao_na', c); if (c) onChange('passaporte_estado_emissao', ''); }} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DateField label="Data de emissão" error={errors?.passaporte_data_emissao} value={data.passaporte_data_emissao} onChange={v => onChange('passaporte_data_emissao', v)} />
        <DateField label="Data de validade" error={errors?.passaporte_data_validade} value={data.passaporte_data_validade} onChange={v => onChange('passaporte_data_validade', v)} />
      </div>

      <YesNo label="Você já teve um passaporte perdido ou roubado?" value={data.passaporte_perdido ?? false} onChange={v => onChange('passaporte_perdido', v)} />
      {data.passaporte_perdido && (
        <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/60 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <TextField label="Número" error={errors?.passaporte_perdido_numero} value={data.passaporte_perdido_numero} onChange={v => onChange('passaporte_perdido_numero', v)} />
            <CountryField label="País" error={errors?.passaporte_perdido_pais} value={data.passaporte_perdido_pais || 'Brasil'} onChange={v => onChange('passaporte_perdido_pais', v)} />
          </div>
          <AreaField label="Explicação" error={errors?.passaporte_perdido_explicacao} value={data.passaporte_perdido_explicacao} onChange={v => onChange('passaporte_perdido_explicacao', v)} />
        </div>
      )}
    </div>
  );
}
