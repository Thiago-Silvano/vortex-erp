import { DS160StepProps, ESTADO_CIVIL_OPTIONS, SEXO_OPTIONS, OCUPACAO_OPTIONS } from './types';
import { SectionTitle } from './fields';
import { Checkbox } from '@/components/ui/checkbox';

const labelOf = (opts: { value: string; label: string }[], v: string) => opts.find(o => o.value === v)?.label || v || '—';
const ecLabel = (v: string) => ESTADO_CIVIL_OPTIONS.find(o => o.code === v)?.label || v || '—';
const val = (v: any) => (v === undefined || v === null || v === '' ? '—' : String(v));

interface Props extends DS160StepProps {
  onGoToStep?: (idx: number) => void;
}

function Row({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex justify-between gap-4 py-1 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-800 font-medium text-right">{val(value)}</span>
    </div>
  );
}

function Block({ title, idx, onGoToStep, children }: { title: string; idx: number; onGoToStep?: (i: number) => void; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-slate-700">{title}</h3>
        {onGoToStep && (
          <button type="button" onClick={() => onGoToStep(idx)} className="text-xs text-blue-600 hover:underline">Editar</button>
        )}
      </div>
      <div className="divide-y divide-slate-100">{children}</div>
    </div>
  );
}

export default function DS160Step15({ data, onChange, onGoToStep }: Props) {
  return (
    <div className="space-y-5">
      <SectionTitle>15. Revisão e Envio</SectionTitle>
      <p className="text-sm text-slate-500">Revise suas informações antes de enviar. Você pode editar qualquer seção.</p>

      <Block title="1. Dados Pessoais" idx={0} onGoToStep={onGoToStep}>
        <Row label="Nome completo" value={data.nome_completo || `${data.nome || ''} ${data.sobrenome || ''}`.trim()} />
        <Row label="Sexo" value={labelOf(SEXO_OPTIONS, data.sexo)} />
        <Row label="Estado civil" value={ecLabel(data.estado_civil)} />
        <Row label="Nascimento" value={`${val(data.data_nascimento)} — ${val(data.cidade_nascimento)}/${val(data.estado_nascimento)}`} />
      </Block>

      <Block title="2. Nacionalidade" idx={1} onGoToStep={onGoToStep}>
        <Row label="Nacionalidade" value={data.nacionalidade} />
        <Row label="CPF" value={data.cpf_na ? 'Não se aplica' : data.cpf} />
      </Block>

      <Block title="3. Viagem" idx={2} onGoToStep={onGoToStep}>
        <Row label="Propósito" value={data.proposito} />
        <Row label="Destino" value={`${val(data.viagem_cidade_destino)}/${val(data.viagem_estado_eua)}`} />
        <Row label="Data de chegada" value={data.viagem_data_chegada} />
      </Block>

      <Block title="6. Endereço e Contato" idx={5} onGoToStep={onGoToStep}>
        <Row label="Cidade/UF" value={`${val(data.cidade_residencia)}/${val(data.estado_residencia)}`} />
        <Row label="Telefone" value={data.telefone} />
        <Row label="Email" value={data.email} />
      </Block>

      <Block title="7. Passaporte" idx={6} onGoToStep={onGoToStep}>
        <Row label="Número" value={data.passaporte_numero} />
        <Row label="Validade" value={data.passaporte_data_validade} />
      </Block>

      <Block title="11. Trabalho Atual" idx={10} onGoToStep={onGoToStep}>
        <Row label="Ocupação" value={labelOf(OCUPACAO_OPTIONS, data.status_profissional)} />
        <Row label="Empregador" value={data.empresa_nome} />
      </Block>

      <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 cursor-pointer select-none">
        <Checkbox checked={!!data.declaracao_aceita} onCheckedChange={v => onChange('declaracao_aceita', !!v)} className="mt-0.5" />
        <span className="text-sm text-slate-600">Declaro que as informações fornecidas são verdadeiras e completas, da melhor forma do meu conhecimento.</span>
      </label>
    </div>
  );
}
