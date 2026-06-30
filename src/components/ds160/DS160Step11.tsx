import { DS160StepProps, OCUPACAO_OPTIONS, OCUPACAO_SEM_EMPREGADOR } from './types';
import { maskPhone } from '@/lib/masks';
import { SectionTitle, TextField, SelectField, DateField, AreaField } from './fields';

export default function DS160Step11({ data, onChange, errors }: DS160StepProps) {
  const occ = data.status_profissional;
  const isEstudante = occ === 'S';
  const isOutro = occ === 'O';
  const semEmpregador = OCUPACAO_SEM_EMPREGADOR.includes(occ);
  const mostraEmpregador = occ && !isEstudante && !isOutro && !semEmpregador;

  return (
    <div className="space-y-6">
      <SectionTitle>11. Trabalho Atual</SectionTitle>
      <SelectField label="Ocupação principal" options={OCUPACAO_OPTIONS} error={errors?.status_profissional} value={occ} onChange={v => onChange('status_profissional', v)} />

      {isOutro && (
        <TextField label="Especifique a ocupação" error={errors?.status_profissional_outro} value={data.status_profissional_outro} onChange={v => onChange('status_profissional_outro', v)} />
      )}

      {mostraEmpregador && (
        <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50/60 p-4">
          <TextField label="Cargo" value={data.cargo} onChange={v => onChange('cargo', v)} />
          <TextField label="Nome do empregador" value={data.empresa_nome} onChange={v => onChange('empresa_nome', v)} />
          <TextField label="Endereço do empregador" value={data.empresa_endereco} onChange={v => onChange('empresa_endereco', v)} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField label="Cidade" value={data.empresa_cidade} onChange={v => onChange('empresa_cidade', v)} />
            <TextField label="Telefone" value={data.empresa_telefone} onChange={v => onChange('empresa_telefone', maskPhone(v))} inputMode="numeric" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DateField label="Data de admissão" value={data.data_admissao} onChange={v => onChange('data_admissao', v)} />
            <TextField label="Renda mensal (R$)" value={data.renda_mensal} onChange={v => onChange('renda_mensal', v)} inputMode="numeric" />
          </div>
          <AreaField label="Descrição das funções" value={data.descricao_funcoes} onChange={v => onChange('descricao_funcoes', v)} />
        </div>
      )}

      {isEstudante && (
        <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50/60 p-4">
          <TextField label="Nome da escola/faculdade" value={data.empresa_nome} onChange={v => onChange('empresa_nome', v)} />
          <TextField label="Endereço" value={data.empresa_endereco} onChange={v => onChange('empresa_endereco', v)} />
          <TextField label="Telefone" value={data.empresa_telefone} onChange={v => onChange('empresa_telefone', maskPhone(v))} inputMode="numeric" />
        </div>
      )}

      {semEmpregador && (
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800">
          Para esta ocupação não é necessário informar dados de empregador.
        </div>
      )}
    </div>
  );
}
