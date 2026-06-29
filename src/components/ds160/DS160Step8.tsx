import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Plus, X } from 'lucide-react';
import { DS160StepProps } from './types';
import { FieldError, errClass } from './fieldError';

interface Formacao {
  instituicao?: string; cep?: string; endereco?: string; telefone?: string;
  curso?: string; pais?: string; inicio?: string; termino?: string;
}

function seedFormacoes(data: Record<string, any>): Formacao[] {
  if (Array.isArray(data.formacoes)) return data.formacoes;
  const legacy: Formacao[] = [];
  for (const n of [1, 2, 3]) {
    if (data[`formacao_${n}_instituicao`] || data[`formacao_${n}_curso`] || data[`formacao_${n}_endereco`]) {
      legacy.push({
        instituicao: data[`formacao_${n}_instituicao`] || '',
        cep: data[`formacao_${n}_cep`] || '',
        endereco: data[`formacao_${n}_endereco`] || '',
        telefone: data[`formacao_${n}_telefone`] || '',
        curso: data[`formacao_${n}_curso`] || '',
        pais: 'Brasil',
        inicio: data[`formacao_${n}_inicio`] || '',
        termino: data[`formacao_${n}_termino`] || '',
      });
    }
  }
  return legacy.length ? legacy : [{}];
}

export default function DS160Step8({ data, onChange, errors }: DS160StepProps) {
  const formacoes = seedFormacoes(data);
  const update = (idx: number, key: keyof Formacao, value: string) => {
    onChange('formacoes', formacoes.map((f, i) => (i === idx ? { ...f, [key]: value } : f)));
  };
  const addFormacao = () => onChange('formacoes', [...formacoes, {}]);
  const removeFormacao = (idx: number) => onChange('formacoes', formacoes.filter((_, i) => i !== idx));

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-600 border-b border-slate-200 pb-3">8. Histórico Acadêmico</h2>
      {formacoes.map((f, i) => (
        <div key={i} className="bg-slate-50 rounded-xl p-4 space-y-4 border border-slate-200">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm text-slate-700">Formação Acadêmica #{i + 1}</h3>
            {formacoes.length > 1 && (
              <Button type="button" variant="outline" size="sm" onClick={() => removeFormacao(i)} className="gap-1.5"><X className="h-4 w-4" /> Remover</Button>
            )}
          </div>
          <div><Label>Nome da Instituição</Label><Input className={errClass(errors?.[`formacoes.${i}.instituicao`])} value={f.instituicao || ''} onChange={e => update(i, 'instituicao', e.target.value)} /><FieldError msg={errors?.[`formacoes.${i}.instituicao`]} /></div>
          <div><Label>País da Instituição</Label><Input value={f.pais ?? 'Brasil'} onChange={e => update(i, 'pais', e.target.value)} placeholder="Ex: Brasil" /></div>
          <div><Label>CEP</Label><Input value={f.cep || ''} onChange={e => update(i, 'cep', e.target.value)} placeholder="00000-000" maxLength={9} /></div>
          <div><Label>Endereço Completo</Label><Input value={f.endereco || ''} onChange={e => update(i, 'endereco', e.target.value)} /></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Telefone</Label><Input value={f.telefone || ''} onChange={e => update(i, 'telefone', e.target.value)} /></div>
            <div><Label>Curso</Label><Input className={errClass(errors?.[`formacoes.${i}.curso`])} value={f.curso || ''} onChange={e => update(i, 'curso', e.target.value)} /><FieldError msg={errors?.[`formacoes.${i}.curso`]} /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Data de Início</Label><Input type="date" value={f.inicio || ''} onChange={e => update(i, 'inicio', e.target.value)} /></div>
            <div><Label>Data de Término</Label><Input type="date" value={f.termino || ''} onChange={e => update(i, 'termino', e.target.value)} /></div>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addFormacao} className="gap-1.5"><Plus className="h-4 w-4" /> Adicionar formação</Button>
    </div>
  );
}
