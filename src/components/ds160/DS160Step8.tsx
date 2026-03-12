import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DS160StepProps } from './types';

export default function DS160Step8({ data, onChange }: DS160StepProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-800 border-b border-slate-200 pb-3">8. Histórico Acadêmico</h2>
      {[1, 2, 3].map(n => (
        <div key={n} className="bg-slate-50 rounded-xl p-4 space-y-4 border border-slate-200">
          <h3 className="font-semibold text-sm text-slate-700">Formação Acadêmica #{n}</h3>
          <div><Label>Nome da Instituição</Label><Input value={data[`formacao_${n}_instituicao`] || ''} onChange={e => onChange(`formacao_${n}_instituicao`, e.target.value)} /></div>
          <div><Label>CEP</Label><Input value={data[`formacao_${n}_cep`] || ''} onChange={e => onChange(`formacao_${n}_cep`, e.target.value)} placeholder="00000-000" maxLength={9} /></div>
          <div><Label>Endereço Completo</Label><Input value={data[`formacao_${n}_endereco`] || ''} onChange={e => onChange(`formacao_${n}_endereco`, e.target.value)} /></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Telefone</Label><Input value={data[`formacao_${n}_telefone`] || ''} onChange={e => onChange(`formacao_${n}_telefone`, e.target.value)} /></div>
            <div><Label>Curso</Label><Input value={data[`formacao_${n}_curso`] || ''} onChange={e => onChange(`formacao_${n}_curso`, e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Data de Início</Label><Input type="date" value={data[`formacao_${n}_inicio`] || ''} onChange={e => onChange(`formacao_${n}_inicio`, e.target.value)} /></div>
            <div><Label>Data de Término</Label><Input type="date" value={data[`formacao_${n}_termino`] || ''} onChange={e => onChange(`formacao_${n}_termino`, e.target.value)} /></div>
          </div>
        </div>
      ))}
    </div>
  );
}
