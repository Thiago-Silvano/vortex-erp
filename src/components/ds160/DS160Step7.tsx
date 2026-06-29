import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Plus, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DS160StepProps } from './types';
import { FieldError, errClass } from './fieldError';

interface EmpregoAnterior {
  empresa?: string; cep?: string; endereco?: string; telefone?: string;
  supervisor?: string; cargo?: string; inicio?: string; termino?: string; motivo_saida?: string;
}

function seedEmpregos(data: Record<string, any>): EmpregoAnterior[] {
  if (Array.isArray(data.empregos_anteriores)) return data.empregos_anteriores;
  const legacy: EmpregoAnterior[] = [];
  for (const n of [1, 2]) {
    const empresa = data[`emprego_anterior_${n}_empresa`];
    if (
      empresa || data[`emprego_anterior_${n}_endereco`] || data[`emprego_anterior_${n}_cargo`]
    ) {
      legacy.push({
        empresa: data[`emprego_anterior_${n}_empresa`] || '',
        cep: data[`emprego_anterior_${n}_cep`] || '',
        endereco: data[`emprego_anterior_${n}_endereco`] || '',
        telefone: data[`emprego_anterior_${n}_telefone`] || '',
        supervisor: data[`emprego_anterior_${n}_supervisor`] || '',
        cargo: data[`emprego_anterior_${n}_cargo`] || '',
        inicio: data[`emprego_anterior_${n}_inicio`] || '',
        termino: data[`emprego_anterior_${n}_termino`] || '',
        motivo_saida: '',
      });
    }
  }
  return legacy.length ? legacy : [{}];
}

export default function DS160Step7({ data, onChange, errors }: DS160StepProps) {
  const empregos = seedEmpregos(data);
  const update = (idx: number, key: keyof EmpregoAnterior, value: string) => {
    onChange('empregos_anteriores', empregos.map((e, i) => (i === idx ? { ...e, [key]: value } : e)));
  };
  const addEmprego = () => onChange('empregos_anteriores', [...empregos, {}]);
  const removeEmprego = (idx: number) => onChange('empregos_anteriores', empregos.filter((_, i) => i !== idx));

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-600 border-b border-slate-200 pb-3">7. Histórico Profissional Atual</h2>
      <div>
        <Label>Status Profissional Atual</Label>
        <Select value={data.status_profissional || undefined} onValueChange={v => onChange('status_profissional', v)}>
          <SelectTrigger className={errClass(errors?.status_profissional)}><SelectValue placeholder="Selecione" /></SelectTrigger>
          <SelectContent>
            {['Empregado Atualmente','Estudante','Autônomo','Empresário','Desempregado','Aposentado','Outro'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <FieldError msg={errors?.status_profissional} />
      </div>
      <div><Label>Nome da Empresa / Instituição de Ensino Atual</Label><Input className={errClass(errors?.empresa_atual)} value={data.empresa_atual || ''} onChange={e => onChange('empresa_atual', e.target.value)} /><FieldError msg={errors?.empresa_atual} /></div>
      <div><Label>Cargo / Função / Curso</Label><Input className={errClass(errors?.cargo_atual)} value={data.cargo_atual || ''} onChange={e => onChange('cargo_atual', e.target.value)} /><FieldError msg={errors?.cargo_atual} /></div>
      <div><Label>Renda Mensal Estimada (BRL)</Label><Input className={errClass(errors?.renda_mensal)} value={data.renda_mensal || ''} onChange={e => onChange('renda_mensal', e.target.value)} /><FieldError msg={errors?.renda_mensal} /></div>
      <div><Label>CEP</Label><Input value={data.empresa_cep || ''} onChange={e => onChange('empresa_cep', e.target.value)} placeholder="00000-000" maxLength={9} /></div>
      <div><Label>Endereço Completo</Label><Input className={errClass(errors?.empresa_endereco)} value={data.empresa_endereco || ''} onChange={e => onChange('empresa_endereco', e.target.value)} /><FieldError msg={errors?.empresa_endereco} /></div>
      <div><Label>Telefone da Empresa/Instituição Atual</Label><Input value={data.empresa_telefone || ''} onChange={e => onChange('empresa_telefone', e.target.value)} /></div>
      <div><Label>Data de Início</Label><Input type="date" className={errClass(errors?.empresa_data_inicio)} value={data.empresa_data_inicio || ''} onChange={e => onChange('empresa_data_inicio', e.target.value)} /><FieldError msg={errors?.empresa_data_inicio} /></div>
      <div><Label>Idiomas que fala fluentemente</Label><Input className={errClass(errors?.idiomas)} value={data.idiomas || ''} onChange={e => onChange('idiomas', e.target.value)} /><FieldError msg={errors?.idiomas} /></div>
      <div><Label>Descrição Detalhada das Funções Atuais</Label><Textarea value={data.descricao_funcoes || ''} onChange={e => onChange('descricao_funcoes', e.target.value)} rows={3} /></div>

      <div className="space-y-4">
        <h3 className="font-semibold text-sm text-slate-700">Empregos Anteriores</h3>
        {empregos.map((emp, i) => (
          <div key={i} className="bg-slate-50 rounded-xl p-4 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm text-slate-700">Emprego Anterior #{i + 1}</h4>
              {empregos.length > 1 && (
                <Button type="button" variant="outline" size="sm" onClick={() => removeEmprego(i)} className="gap-1.5"><X className="h-4 w-4" /> Remover</Button>
              )}
            </div>
            <div><Label>Nome da Empresa</Label><Input className={errClass(errors?.[`empregos_anteriores.${i}.empresa`])} value={emp.empresa || ''} onChange={e => update(i, 'empresa', e.target.value)} /><FieldError msg={errors?.[`empregos_anteriores.${i}.empresa`]} /></div>
            <div><Label>CEP</Label><Input value={emp.cep || ''} onChange={e => update(i, 'cep', e.target.value)} placeholder="00000-000" maxLength={9} /></div>
            <div><Label>Endereço Completo</Label><Input value={emp.endereco || ''} onChange={e => update(i, 'endereco', e.target.value)} /></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label>Telefone</Label><Input value={emp.telefone || ''} onChange={e => update(i, 'telefone', e.target.value)} /></div>
              <div><Label>Nome do Supervisor</Label><Input value={emp.supervisor || ''} onChange={e => update(i, 'supervisor', e.target.value)} /></div>
            </div>
            <div><Label>Cargo que Ocupava</Label><Input className={errClass(errors?.[`empregos_anteriores.${i}.cargo`])} value={emp.cargo || ''} onChange={e => update(i, 'cargo', e.target.value)} /><FieldError msg={errors?.[`empregos_anteriores.${i}.cargo`]} /></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label>Data de Início</Label><Input type="date" className={errClass(errors?.[`empregos_anteriores.${i}.inicio`])} value={emp.inicio || ''} onChange={e => update(i, 'inicio', e.target.value)} /><FieldError msg={errors?.[`empregos_anteriores.${i}.inicio`]} /></div>
              <div><Label>Data de Término</Label><Input type="date" className={errClass(errors?.[`empregos_anteriores.${i}.termino`])} value={emp.termino || ''} onChange={e => update(i, 'termino', e.target.value)} /><FieldError msg={errors?.[`empregos_anteriores.${i}.termino`]} /></div>
            </div>
            <div><Label>Motivo de Saída</Label><Input value={emp.motivo_saida || ''} onChange={e => update(i, 'motivo_saida', e.target.value)} /></div>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={addEmprego} className="gap-1.5"><Plus className="h-4 w-4" /> Adicionar emprego anterior</Button>
      </div>
    </div>
  );
}
