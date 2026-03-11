import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DS160StepProps } from './types';

export default function DS160Step7({ data, onChange }: DS160StepProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-800 border-b border-slate-200 pb-3">7. Histórico Profissional Atual</h2>
      <div>
        <Label>Status Profissional Atual</Label>
        <Select value={data.status_profissional || ''} onValueChange={v => onChange('status_profissional', v)}>
          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
          <SelectContent>
            {['Empregado Atualmente','Estudante','Autônomo','Desempregado','Aposentado','Outro'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div><Label>Nome da Empresa / Instituição de Ensino Atual</Label><Input value={data.empresa_atual || ''} onChange={e => onChange('empresa_atual', e.target.value)} /></div>
      <div><Label>Cargo / Função / Curso</Label><Input value={data.cargo_atual || ''} onChange={e => onChange('cargo_atual', e.target.value)} /></div>
      <div><Label>Renda Mensal Estimada (BRL)</Label><Input value={data.renda_mensal || ''} onChange={e => onChange('renda_mensal', e.target.value)} /></div>
      <div><Label>Endereço Completo</Label><Input value={data.empresa_endereco || ''} onChange={e => onChange('empresa_endereco', e.target.value)} /></div>
      <div><Label>Data de Início</Label><Input type="date" value={data.empresa_data_inicio || ''} onChange={e => onChange('empresa_data_inicio', e.target.value)} /></div>
      <div><Label>Idiomas que fala fluentemente</Label><Input value={data.idiomas || ''} onChange={e => onChange('idiomas', e.target.value)} /></div>
      <div><Label>Descrição Detalhada das Funções Atuais</Label><Textarea value={data.descricao_funcoes || ''} onChange={e => onChange('descricao_funcoes', e.target.value)} rows={3} /></div>

      {[1, 2].map(n => (
        <div key={n} className="bg-slate-50 rounded-xl p-4 space-y-4 border border-slate-200">
          <h3 className="font-semibold text-sm text-slate-700">Emprego Anterior #{n}</h3>
          <div><Label>Nome da Empresa</Label><Input value={data[`emprego_anterior_${n}_empresa`] || ''} onChange={e => onChange(`emprego_anterior_${n}_empresa`, e.target.value)} /></div>
          <div><Label>Endereço Completo</Label><Input value={data[`emprego_anterior_${n}_endereco`] || ''} onChange={e => onChange(`emprego_anterior_${n}_endereco`, e.target.value)} /></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Telefone</Label><Input value={data[`emprego_anterior_${n}_telefone`] || ''} onChange={e => onChange(`emprego_anterior_${n}_telefone`, e.target.value)} /></div>
            <div><Label>Nome do Supervisor</Label><Input value={data[`emprego_anterior_${n}_supervisor`] || ''} onChange={e => onChange(`emprego_anterior_${n}_supervisor`, e.target.value)} /></div>
          </div>
          <div><Label>Cargo que Ocupava</Label><Input value={data[`emprego_anterior_${n}_cargo`] || ''} onChange={e => onChange(`emprego_anterior_${n}_cargo`, e.target.value)} /></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Data de Início</Label><Input type="date" value={data[`emprego_anterior_${n}_inicio`] || ''} onChange={e => onChange(`emprego_anterior_${n}_inicio`, e.target.value)} /></div>
            <div><Label>Data de Término</Label><Input type="date" value={data[`emprego_anterior_${n}_termino`] || ''} onChange={e => onChange(`emprego_anterior_${n}_termino`, e.target.value)} /></div>
          </div>
        </div>
      ))}
    </div>
  );
}
