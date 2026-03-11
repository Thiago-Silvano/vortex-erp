import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { DS160StepProps } from './types';

export default function DS160Step11({ data, onChange }: DS160StepProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-800 border-b border-slate-200 pb-3">11. Declaração Final</h2>
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
        <p className="text-sm text-slate-700 leading-relaxed">
          Declaro que li e entendi todas as perguntas deste formulário e que as respostas fornecidas são verdadeiras e corretas.
        </p>
      </div>
      <div className="flex items-start gap-3 pt-2">
        <Checkbox
          id="declaracao_aceita"
          checked={data.declaracao_aceita || false}
          onCheckedChange={v => onChange('declaracao_aceita', v)}
        />
        <Label htmlFor="declaracao_aceita" className="text-sm text-slate-700 leading-relaxed cursor-pointer">
          Li, entendi e confirmo que todas as informações fornecidas neste formulário são verdadeiras e corretas ao meu melhor conhecimento.
        </Label>
      </div>
    </div>
  );
}
