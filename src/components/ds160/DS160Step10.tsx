import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { DS160StepProps } from './types';

const SECURITY_QUESTIONS = [
  { key: 'doenca_contagiosa', label: '10.2. Possui doença contagiosa de importância para a saúde pública?', explLabel: 'Explicação OBRIGATÓRIA (Doença)' },
  { key: 'preso_condenado', label: '10.3. Já foi preso ou condenado por algum crime?', explLabel: 'Explicação OBRIGATÓRIA (Crime)' },
  { key: 'visto_cancelado', label: '10.4. Já teve seu Visto Americano Cancelado/Revogado?', explLabel: 'Explicação OBRIGATÓRIA (Visto Cancelado)' },
  { key: 'deportacao', label: '10.5. Esteve envolvido em deportação ou remoção dos EUA?', explLabel: 'Explicação OBRIGATÓRIA (Deportação)' },
  { key: 'fraude', label: '10.6. Cometeu fraude ou deturpou informações para obter visto ou entrada nos EUA?', explLabel: 'Explicação OBRIGATÓRIA (Fraude)' },
  { key: 'excedeu_prazo', label: '10.7. Já excedeu o prazo de permanência permitido nos EUA?', explLabel: 'Explicação OBRIGATÓRIA (Excedeu Prazo)' },
  { key: 'esta_negado', label: '10.8. Seu pedido ESTA (Visa Waiver Program) foi negado?', explLabel: 'Explicação OBRIGATÓRIA (ESTA Negado)' },
];

export default function DS160Step10({ data, onChange }: DS160StepProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-800 border-b border-slate-200 pb-3">10. Segurança e Antecedentes</h2>
      <p className="text-sm text-slate-500">Para as perguntas abaixo, selecione <strong>Não</strong> como padrão. Se selecionar <strong>Sim</strong>, um campo de texto será exibido para a explicação obrigatória.</p>
      {SECURITY_QUESTIONS.map(q => (
        <div key={q.key} className="space-y-2">
          <Label className="text-sm">{q.label}</Label>
          <RadioGroup value={data[`seg_${q.key}`] || 'Não'} onValueChange={v => onChange(`seg_${q.key}`, v)} className="flex gap-4">
            <div className="flex items-center gap-2"><RadioGroupItem value="Sim" id={`${q.key}_sim`} /><Label htmlFor={`${q.key}_sim`}>Sim</Label></div>
            <div className="flex items-center gap-2"><RadioGroupItem value="Não" id={`${q.key}_nao`} /><Label htmlFor={`${q.key}_nao`}>Não</Label></div>
          </RadioGroup>
          {data[`seg_${q.key}`] === 'Sim' && (
            <Textarea
              value={data[`seg_${q.key}_explicacao`] || ''}
              onChange={e => onChange(`seg_${q.key}_explicacao`, e.target.value)}
              placeholder={q.explLabel}
              rows={2}
              className="border-amber-300 bg-amber-50/50"
            />
          )}
        </div>
      ))}
    </div>
  );
}
