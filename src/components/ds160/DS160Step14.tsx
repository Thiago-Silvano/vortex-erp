import { useState } from 'react';
import { DS160StepProps } from './types';
import { ChevronDown, ShieldAlert } from 'lucide-react';
import { SectionTitle, YesNo } from './fields';

const PERGUNTAS: { key: string; label: string }[] = [
  { key: 'crime', label: 'Você já foi preso ou condenado por algum crime?' },
  { key: 'lavagem_dinheiro', label: 'Você já se envolveu em lavagem de dinheiro?' },
  { key: 'trafico_pessoas', label: 'Você já se envolveu em tráfico de pessoas?' },
  { key: 'terrorismo', label: 'Você já se envolveu em atividades terroristas?' },
  { key: 'genocidio', label: 'Você já participou de genocídio?' },
  { key: 'tortura', label: 'Você já cometeu ou ordenou atos de tortura?' },
  { key: 'deportado', label: 'Você já foi deportado de algum país?' },
];

export default function DS160Step14({ data, onChange }: DS160StepProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-6">
      <SectionTitle>14. Antecedentes / Declarações</SectionTitle>
      <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800 flex gap-2">
        <ShieldAlert className="h-5 w-5 shrink-0" />
        <span>Esta seção é opcional. Marque <strong>Sim</strong> apenas se algum item se aplicar a você. Em caso de dúvida, fale com o consultor antes de responder.</span>
      </div>

      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-between w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
      >
        {open ? 'Ocultar declarações' : 'Abrir declarações (todas marcadas como "Não")'}
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="space-y-5">
          {PERGUNTAS.map(p => (
            <YesNo key={p.key} label={p.label} value={data[p.key] ?? false} onChange={v => onChange(p.key, v)} />
          ))}
        </div>
      )}
    </div>
  );
}
