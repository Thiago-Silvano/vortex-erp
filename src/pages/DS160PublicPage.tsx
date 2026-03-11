import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Check, ChevronLeft, ChevronRight, Save, Send, Shield, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import DS160Step1 from '@/components/ds160/DS160Step1';
import DS160Step2 from '@/components/ds160/DS160Step2';
import DS160Step3 from '@/components/ds160/DS160Step3';
import DS160Step4 from '@/components/ds160/DS160Step4';
import DS160Step5 from '@/components/ds160/DS160Step5';
import DS160Step6 from '@/components/ds160/DS160Step6';
import DS160Step7 from '@/components/ds160/DS160Step7';
import DS160Step8 from '@/components/ds160/DS160Step8';
import DS160Step9 from '@/components/ds160/DS160Step9';
import DS160Step10 from '@/components/ds160/DS160Step10';
import DS160Step11 from '@/components/ds160/DS160Step11';

const STEPS = [
  { label: 'Dados Pessoais', num: 1 },
  { label: 'Passaporte', num: 2 },
  { label: 'Contatos', num: 3 },
  { label: 'Viagem', num: 4 },
  { label: 'Contato EUA', num: 5 },
  { label: 'Família', num: 6 },
  { label: 'Profissional', num: 7 },
  { label: 'Acadêmico', num: 8 },
  { label: 'Viagens', num: 9 },
  { label: 'Segurança', num: 10 },
  { label: 'Declaração', num: 11 },
];

export default function DS160PublicPage() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [formId, setFormId] = useState<string | null>(null);
  const [clientName, setClientName] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);

  useEffect(() => {
    if (!token) return;
    loadForm();
  }, [token]);

  const loadForm = async () => {
    const { data, error } = await supabase
      .from('ds160_forms')
      .select('*, clients(full_name)')
      .eq('token', token!)
      .single();

    if (error || !data) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    if (data.status === 'deleted') {
      setDeleted(true);
      setLoading(false);
      return;
    }

    if (data.status === 'submitted') {
      setSubmitted(true);
      setLoading(false);
      return;
    }

    setFormId(data.id);
    setClientName((data as any).clients?.full_name || '');
    setFormData((data.form_data as Record<string, any>) || {});
    setCurrentStep(data.current_step || 0);
    setLoading(false);
  };

  const updateField = useCallback((key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = async () => {
    if (!formId) return;
    setSaving(true);
    const { error } = await supabase.from('ds160_forms').update({
      form_data: formData as any,
      current_step: currentStep,
      status: 'in_progress',
      last_saved_at: new Date().toISOString(),
    }).eq('id', formId);
    setSaving(false);
    if (error) {
      toast.error('Erro ao salvar. Tente novamente.');
    } else {
      toast.success('Progresso salvo com sucesso!');
    }
  };

  const handleSubmit = async () => {
    if (!formId) return;
    setSubmitting(true);
    const { error } = await supabase.from('ds160_forms').update({
      form_data: formData as any,
      current_step: 10,
      status: 'submitted',
      submitted_at: new Date().toISOString(),
      last_saved_at: new Date().toISOString(),
    }).eq('id', formId);
    setSubmitting(false);
    if (error) {
      toast.error('Erro ao enviar formulário.');
    } else {
      setSubmitted(true);
    }
  };

  const goNext = async () => {
    if (currentStep < 10) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      // auto-save
      if (formId) {
        await supabase.from('ds160_forms').update({
          form_data: formData as any,
          current_step: currentStep + 1,
          status: 'in_progress',
          last_saved_at: new Date().toISOString(),
        }).eq('id', formId);
      }
    }
  };

  const goBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const progress = ((currentStep + 1) / 11) * 100;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <Shield className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Link inválido</h1>
          <p className="text-slate-500">Este link de formulário não existe ou já expirou. Entre em contato com a Vortex Vistos.</p>
        </div>
      </div>
    );
  }

  if (deleted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <Shield className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Formulário excluído</h1>
          <p className="text-slate-500">Este formulário foi excluído pela Vortex Vistos. Entre em contato com a equipe para mais informações.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Formulário enviado!</h1>
          <p className="text-slate-500 mb-4">Suas informações foram recebidas com sucesso pela equipe Vortex Vistos. Entraremos em contato em breve.</p>
          <p className="text-sm text-slate-400">Você pode fechar esta página.</p>
        </div>
      </div>
    );
  }

  const stepComponents = [
    <DS160Step1 data={formData} onChange={updateField} />,
    <DS160Step2 data={formData} onChange={updateField} />,
    <DS160Step3 data={formData} onChange={updateField} />,
    <DS160Step4 data={formData} onChange={updateField} />,
    <DS160Step5 data={formData} onChange={updateField} />,
    <DS160Step6 data={formData} onChange={updateField} />,
    <DS160Step7 data={formData} onChange={updateField} />,
    <DS160Step8 data={formData} onChange={updateField} />,
    <DS160Step9 data={formData} onChange={updateField} />,
    <DS160Step10 data={formData} onChange={updateField} />,
    <DS160Step11 data={formData} onChange={updateField} />,
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-800 tracking-tight">VORTEX VISTOS</h1>
            <p className="text-xs text-slate-500">Formulário DS-160</p>
          </div>
          <Button
            onClick={handleSave}
            disabled={saving}
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 rounded-full"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar
          </Button>
        </div>
        <div className="max-w-3xl mx-auto px-4 pb-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-slate-600">
              Etapa {currentStep + 1} de 11 — {STEPS[currentStep].label}
            </span>
            <span className="text-xs font-semibold text-blue-600">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </header>

      {/* Step indicators - horizontal scrollable on mobile */}
      <div className="bg-white/80 backdrop-blur border-b border-slate-100">
        <div className="max-w-3xl mx-auto px-4 py-2 overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            {STEPS.map((step, idx) => (
              <button
                key={idx}
                onClick={() => { setCurrentStep(idx); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  idx === currentStep
                    ? 'bg-blue-600 text-white shadow-sm'
                    : idx < currentStep
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {step.num}. {step.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Client greeting */}
      {clientName && currentStep === 0 && (
        <div className="max-w-3xl mx-auto px-4 pt-6">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-800">
              Olá <strong>{clientName}</strong>, preencha as informações abaixo com calma. 
              Você pode salvar o progresso e continuar depois.
            </p>
          </div>
        </div>
      )}

      {/* Form content */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-5 md:p-8">
          {stepComponents[currentStep]}
        </div>
      </div>

      {/* Navigation */}
      <div className="max-w-3xl mx-auto px-4 pb-10">
        <div className="flex items-center justify-between gap-4">
          <Button
            onClick={goBack}
            disabled={currentStep === 0}
            variant="outline"
            className="rounded-full gap-1.5"
          >
            <ChevronLeft className="h-4 w-4" />
            Voltar
          </Button>

          {currentStep < 10 ? (
            <Button
              onClick={goNext}
              className="rounded-full gap-1.5 bg-blue-600 hover:bg-blue-700"
            >
              Próximo
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <>
              {!showConfirmSubmit ? (
                <Button
                  onClick={() => setShowConfirmSubmit(true)}
                  className="rounded-full gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                >
                  <Send className="h-4 w-4" />
                  Enviar Formulário
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Button variant="outline" className="rounded-full" onClick={() => setShowConfirmSubmit(false)}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="rounded-full gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Confirmar Envio
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
