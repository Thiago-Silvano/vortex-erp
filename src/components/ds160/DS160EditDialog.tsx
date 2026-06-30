import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import DS160Step1 from './DS160Step1';
import DS160Step2 from './DS160Step2';
import DS160Step3 from './DS160Step3';
import DS160Step4 from './DS160Step4';
import DS160Step5 from './DS160Step5';
import DS160Step6 from './DS160Step6';
import DS160Step7 from './DS160Step7';
import DS160Step8 from './DS160Step8';
import DS160Step9 from './DS160Step9';
import DS160Step10 from './DS160Step10';
import DS160Step11 from './DS160Step11';

const STEPS = [
  'Dados Pessoais', 'Passaporte', 'Contatos', 'Viagem', 'Contato EUA',
  'Família', 'Profissional', 'Acadêmico', 'Viagens', 'Segurança', 'Declaração',
];

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
  const stepComponents = [
    <DS160Step1 data={formData} onChange={updateField} errors={noErrors} />,
    <DS160Step2 data={formData} onChange={updateField} errors={noErrors} />,
    <DS160Step3 data={formData} onChange={updateField} errors={noErrors} />,
    <DS160Step4 data={formData} onChange={updateField} errors={noErrors} />,
    <DS160Step5 data={formData} onChange={updateField} errors={noErrors} />,
    <DS160Step6 data={formData} onChange={updateField} errors={noErrors} />,
    <DS160Step7 data={formData} onChange={updateField} errors={noErrors} />,
    <DS160Step8 data={formData} onChange={updateField} errors={noErrors} />,
    <DS160Step9 data={formData} onChange={updateField} errors={noErrors} />,
    <DS160Step10 data={formData} onChange={updateField} errors={noErrors} />,
    <DS160Step11 data={formData} onChange={updateField} errors={noErrors} />,
  ];

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('ds160_forms')
      .update({ form_data: formData as any, last_saved_at: new Date().toISOString() } as any)
      .eq('id', formId);
    setSaving(false);
    if (error) {
      toast.error('Erro ao salvar alterações');
      return;
    }
    toast.success('Respostas atualizadas com sucesso!');
    onSaved(formData);
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
          {stepComponents[step]}
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
