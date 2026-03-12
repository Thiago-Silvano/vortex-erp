import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Check, ChevronLeft, ChevronRight, Save, Send, Shield, Loader2, Users, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
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

interface Applicant {
  formId: string;
  clientName: string;
  status: string;
  currentStep: number;
  formData: Record<string, any>;
}

export default function DS160GroupPublicPage() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [activeApplicantIdx, setActiveApplicantIdx] = useState<number | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [groupId, setGroupId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    loadGroup();
  }, [token]);

  const loadGroup = async () => {
    // Find group by token
    const { data: group, error } = await supabase
      .from('ds160_group_forms')
      .select('*')
      .eq('token', token!)
      .single();

    if (error || !group) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    if ((group as any).status === 'deleted') {
      setDeleted(true);
      setLoading(false);
      return;
    }

    setGroupId((group as any).id);

    // Load all forms in this group
    const { data: forms } = await supabase
      .from('ds160_forms')
      .select('*, clients(full_name)')
      .eq('group_id', (group as any).id)
      .order('created_at');

    if (!forms || forms.length === 0) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setApplicants(forms.map((f: any) => ({
      formId: f.id,
      clientName: f.clients?.full_name || 'Aplicante',
      status: f.status,
      currentStep: f.current_step || 0,
      formData: (f.form_data as Record<string, any>) || {},
    })));

    setLoading(false);
  };

  const selectApplicant = (idx: number) => {
    const app = applicants[idx];
    if (app.status === 'submitted') return; // Already done
    setActiveApplicantIdx(idx);
    setFormData(app.formData);
    setCurrentStep(app.currentStep);
    setShowConfirmSubmit(false);
  };

  const backToList = async () => {
    // Save current progress before going back
    if (activeApplicantIdx !== null) {
      await saveProgress();
      // Update local state
      setApplicants(prev => prev.map((a, i) =>
        i === activeApplicantIdx
          ? { ...a, formData, currentStep, status: a.status === 'sent' ? 'in_progress' : a.status }
          : a
      ));
    }
    setActiveApplicantIdx(null);
    setShowConfirmSubmit(false);
  };

  const updateField = useCallback((key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  }, []);

  const saveProgress = async () => {
    if (activeApplicantIdx === null) return;
    const app = applicants[activeApplicantIdx];
    setSaving(true);
    await supabase.from('ds160_forms').update({
      form_data: formData as any,
      current_step: currentStep,
      status: app.status === 'submitted' ? 'submitted' : 'in_progress',
      last_saved_at: new Date().toISOString(),
    }).eq('id', app.formId);
    setSaving(false);
  };

  const handleSave = async () => {
    await saveProgress();
    toast.success('Progresso salvo!');
  };

  const handleSubmitApplicant = async () => {
    if (activeApplicantIdx === null) return;
    setSubmitting(true);
    const app = applicants[activeApplicantIdx];

    await supabase.from('ds160_forms').update({
      form_data: formData as any,
      current_step: 10,
      status: 'submitted',
      submitted_at: new Date().toISOString(),
      last_saved_at: new Date().toISOString(),
    }).eq('id', app.formId);

    // Update local state
    const newApplicants = applicants.map((a, i) =>
      i === activeApplicantIdx ? { ...a, status: 'submitted', formData, currentStep: 10 } : a
    );
    setApplicants(newApplicants);

    // Check if all are submitted
    const allDone = newApplicants.every(a => a.status === 'submitted');
    if (allDone && groupId) {
      await supabase.from('ds160_group_forms').update({
        status: 'submitted',
        updated_at: new Date().toISOString(),
      } as any).eq('id', groupId);
    } else if (groupId) {
      await supabase.from('ds160_group_forms').update({
        status: 'in_progress',
        updated_at: new Date().toISOString(),
      } as any).eq('id', groupId);
    }

    setSubmitting(false);
    setActiveApplicantIdx(null);
    setShowConfirmSubmit(false);
    toast.success(`Formulário de ${app.clientName} enviado!`);
  };

  const goNext = async () => {
    if (currentStep < 10) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (activeApplicantIdx !== null) {
        const app = applicants[activeApplicantIdx];
        await supabase.from('ds160_forms').update({
          form_data: formData as any,
          current_step: currentStep + 1,
          status: 'in_progress',
          last_saved_at: new Date().toISOString(),
        }).eq('id', app.formId);
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
  const allSubmitted = applicants.length > 0 && applicants.every(a => a.status === 'submitted');

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
          <p className="text-slate-500">Este link não existe ou já expirou.</p>
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
          <p className="text-slate-500">Este formulário foi excluído pela equipe.</p>
        </div>
      </div>
    );
  }

  // All done screen
  if (allSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Todos os formulários enviados!</h1>
          <p className="text-slate-500 mb-4">
            Os formulários de {applicants.length} aplicante(s) foram recebidos com sucesso pela equipe Vortex Vistos.
          </p>
          <div className="flex flex-wrap gap-2 justify-center mt-4">
            {applicants.map((a, i) => (
              <Badge key={i} className="bg-emerald-100 text-emerald-700 border-emerald-200">
                ✓ {a.clientName}
              </Badge>
            ))}
          </div>
          <p className="text-sm text-slate-400 mt-6">Você pode fechar esta página.</p>
        </div>
      </div>
    );
  }

  // Applicant selector (no form active)
  if (activeApplicantIdx === null) {
    const doneCount = applicants.filter(a => a.status === 'submitted').length;
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
          <div className="max-w-2xl mx-auto px-4 py-4">
            <h1 className="text-lg font-bold text-slate-800 tracking-tight">VORTEX VISTOS</h1>
            <p className="text-xs text-slate-500">Formulário DS-160 — Preenchimento em Grupo</p>
          </div>
        </header>

        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <p className="text-sm text-blue-800">
              <strong>Olá!</strong> Preencha o formulário DS-160 para cada aplicante abaixo. 
              Você pode preencher um de cada vez e o progresso é salvo automaticamente.
            </p>
          </div>

          <div className="mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-slate-600" />
            <h2 className="text-lg font-semibold text-slate-800">
              Aplicantes ({doneCount}/{applicants.length} preenchidos)
            </h2>
          </div>

          <Progress value={(doneCount / applicants.length) * 100} className="h-2 mb-6" />

          <div className="space-y-3">
            {applicants.map((app, idx) => (
              <button
                key={app.formId}
                onClick={() => selectApplicant(idx)}
                disabled={app.status === 'submitted'}
                className={`w-full text-left border rounded-xl p-4 transition-all ${
                  app.status === 'submitted'
                    ? 'bg-emerald-50 border-emerald-200 cursor-default'
                    : 'bg-white hover:border-blue-300 hover:shadow-md cursor-pointer'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-800">{app.clientName}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {app.status === 'submitted'
                        ? '✓ Formulário preenchido'
                        : app.status === 'in_progress'
                        ? `Em andamento — Etapa ${app.currentStep + 1}/11`
                        : 'Pendente — Clique para preencher'}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      app.status === 'submitted'
                        ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                        : app.status === 'in_progress'
                        ? 'bg-blue-100 text-blue-700 border-blue-200'
                        : 'bg-slate-100 text-slate-500'
                    }
                  >
                    {app.status === 'submitted' ? 'Preenchido' : app.status === 'in_progress' ? 'Em andamento' : 'Pendente'}
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Active form view
  const activeApplicant = applicants[activeApplicantIdx];

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
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={backToList} className="gap-1.5 rounded-full">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
            <div>
              <h1 className="text-sm font-bold text-slate-800">{activeApplicant.clientName}</h1>
              <p className="text-xs text-slate-500">DS-160 — Etapa {currentStep + 1}/11</p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 rounded-full">
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

      {/* Step indicators */}
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

      {/* Form content */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-5 md:p-8">
          {stepComponents[currentStep]}
        </div>
      </div>

      {/* Navigation */}
      <div className="max-w-3xl mx-auto px-4 pb-10">
        <div className="flex items-center justify-between gap-4">
          <Button onClick={goBack} disabled={currentStep === 0} variant="outline" className="rounded-full gap-1.5">
            <ChevronLeft className="h-4 w-4" /> Voltar
          </Button>

          {currentStep < 10 ? (
            <Button onClick={goNext} className="rounded-full gap-1.5 bg-blue-600 hover:bg-blue-700">
              Próximo <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <>
              {!showConfirmSubmit ? (
                <Button onClick={() => setShowConfirmSubmit(true)} className="rounded-full gap-1.5 bg-emerald-600 hover:bg-emerald-700">
                  <Send className="h-4 w-4" /> Enviar Formulário de {activeApplicant.clientName}
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Button variant="outline" className="rounded-full" onClick={() => setShowConfirmSubmit(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSubmitApplicant} disabled={submitting} className="rounded-full gap-1.5 bg-emerald-600 hover:bg-emerald-700">
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
