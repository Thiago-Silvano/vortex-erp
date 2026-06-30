import { useEffect } from 'react';
import { DS160StepProps, PROPOSITO_OPTIONS, PAGADOR_OPTIONS } from './types';
import { maskPhone } from '@/lib/masks';
import { SectionTitle, SubTitle, TextField, SelectField, DateField, YesNo, UsStateField } from './fields';

export default function DS160Step3({ data, onChange, errors }: DS160StepProps) {
  useEffect(() => {
    if (!data.proposito) onChange('proposito', 'B1/B2');
    if (data.planos_especificos === undefined) onChange('planos_especificos', false);
    if (!data.viagem_pago_por) onChange('viagem_pago_por', 'S');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pago = data.viagem_pago_por || 'S';

  return (
    <div className="space-y-6">
      <SectionTitle>3. Viagem</SectionTitle>
      <SelectField label="Propósito da viagem" options={PROPOSITO_OPTIONS} error={errors?.proposito} value={data.proposito || 'B1/B2'} onChange={v => onChange('proposito', v)} />

      <YesNo label="Você já tem planos específicos de viagem (passagem/data marcada)?" value={data.planos_especificos ?? false} onChange={v => onChange('planos_especificos', v)} />
      {data.planos_especificos ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DateField label="Data de chegada" error={errors?.viagem_data_chegada} value={data.viagem_data_chegada} onChange={v => onChange('viagem_data_chegada', v)} />
          <TextField label="Voo / meio de chegada" value={data.viagem_voo} onChange={v => onChange('viagem_voo', v)} placeholder="Ex: AA950" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DateField label="Data pretendida de chegada" error={errors?.viagem_data_chegada} value={data.viagem_data_chegada} onChange={v => onChange('viagem_data_chegada', v)} />
          <TextField label="Duração pretendida (dias)" error={errors?.viagem_duracao_dias} value={data.viagem_duracao_dias} onChange={v => onChange('viagem_duracao_dias', v)} inputMode="numeric" placeholder="Ex: 10" />
        </div>
      )}

      <SubTitle>Onde você vai ficar nos EUA</SubTitle>
      <TextField label="Endereço / Hotel" error={errors?.viagem_endereco_eua} value={data.viagem_endereco_eua} onChange={v => onChange('viagem_endereco_eua', v)} placeholder="Ex: 1601 Collins Ave" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <TextField label="Cidade de destino" error={errors?.viagem_cidade_destino} value={data.viagem_cidade_destino} onChange={v => onChange('viagem_cidade_destino', v)} placeholder="Ex: Miami" />
        <UsStateField label="Estado (EUA)" error={errors?.viagem_estado_eua} value={data.viagem_estado_eua} onChange={v => onChange('viagem_estado_eua', v)} />
        <TextField label="ZIP (se souber)" value={data.viagem_cep_eua} onChange={v => onChange('viagem_cep_eua', v)} inputMode="numeric" />
      </div>
      <TextField label="Nome do hotel / anfitrião" value={data.viagem_hospedagem} onChange={v => onChange('viagem_hospedagem', v)} />

      <SubTitle>Quem está pagando a viagem?</SubTitle>
      <SelectField label="Pagador" options={PAGADOR_OPTIONS} error={errors?.viagem_pago_por} value={pago} onChange={v => onChange('viagem_pago_por', v)} />
      {(pago === 'O' || pago === 'C') && (
        <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50/60 p-4">
          <TextField label={pago === 'C' ? 'Nome da empresa' : 'Nome do pagador'} error={errors?.pagador_nome} value={data.pagador_nome} onChange={v => onChange('pagador_nome', v)} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField label="Telefone" value={data.pagador_telefone} onChange={v => onChange('pagador_telefone', maskPhone(v))} inputMode="numeric" />
            {pago === 'O' && <TextField label="Email" value={data.pagador_email} onChange={v => onChange('pagador_email', v)} type="email" />}
          </div>
          <TextField label="Relação com você" value={data.pagador_relacao} onChange={v => onChange('pagador_relacao', v)} placeholder={pago === 'C' ? 'Ex: Empregador' : 'Ex: Pai, amigo'} />
          <TextField label="Endereço" value={data.pagador_endereco} onChange={v => onChange('pagador_endereco', v)} />
        </div>
      )}
    </div>
  );
}
