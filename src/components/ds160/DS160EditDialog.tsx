import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DS160_STEPS } from './steps';
import { DS160_STEP_LABELS } from './types';

const STEPS = DS160_STEP_LABELS;

interface Props {
  formId: string;
  initialData: Record<string, any>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (formData: Record<string, any>) => void;
}

export default function DS160EditDialog({ formId, initialData, open, onOpenChange, onSaved }: Props) {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, any>>(initialData || {});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setFormData(initialData || {});
      setStep(0);
    }
  }, [open, initialData]);

  const updateField = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const noErrors: Record<string, string> = {};
  const CurrentStep = DS160_STEPS[step].Component;

  const handleSave = async () => {
    setSaving(true);
    // Remove o json_override antigo: as respostas editadas passam a ser a
    // fonte da verdade (senão o override travado continuaria sendo enviado
    // ao robô e exibido, ignorando as edições).
    const { json_override, ...cleaned } = formData as Record<string, any>;
    const { error } = await supabase
      .from('ds160_forms')
      .update({ form_data: cleaned as any, last_saved_at: new Date().toISOString() } as any)
      .eq('id', formId);
    setSaving(false);
    if (error) {
      toast.error('Erro ao salvar alterações');
      return;
    }
    toast.success('Respostas atualizadas com sucesso!');
    onSaved(cleaned);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-3 border-b">
          <DialogTitle>Editar respostas do DS-160</DialogTitle>
          <DialogDescription>
            Etapa {step + 1} de {STEPS.length} — {STEPS[step]}
          </DialogDescription>
          <div className="flex flex-wrap gap-1 pt-2">
            {STEPS.map((label, idx) => (
              <button
                key={label}
                onClick={() => setStep(idx)}
                className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                  idx === step
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted text-muted-foreground border-transparent hover:bg-muted/70'
                }`}
              >
                {idx + 1}. {label}
              </button>
            ))}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <CurrentStep data={formData} onChange={updateField} errors={noErrors} onGoToStep={setStep} />
        </div>

        <div className="flex items-center justify-between gap-2 border-t px-6 py-3">
          <Button
            variant="outline"
            onClick={() => setStep(s => Math.max(0, s - 1))}
            disabled={step === 0}
            className="gap-1.5"
          >
            <ChevronLeft className="h-4 w-4" /> Anterior
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gap-1.5">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar
          </Button>
          {step < STEPS.length - 1 ? (
            <Button
              variant="outline"
              onClick={() => setStep(s => Math.min(STEPS.length - 1, s + 1))}
              className="gap-1.5"
            >
              Próximo <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <div className="w-[92px]" />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
