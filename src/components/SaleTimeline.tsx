import { CheckCircle2, Circle, Clock, FileText, Send, Eye, PenTool, CreditCard, DollarSign, Rocket, Flag } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface TimelineStep {
  key: string;
  label: string;
  icon: any;
  date?: string | null;
  actor?: string;
  completed: boolean;
  active?: boolean;
}

interface SaleTimelineProps {
  saleStatus: string;
  workflowStatus: string;
  createdAt?: string;
  contractStatus?: string;
  contractSentAt?: string | null;
  contractViewedAt?: string | null;
  contractSignedAt?: string | null;
  hasReceivables?: boolean;
  isPaid?: boolean;
}

export default function SaleTimeline({
  saleStatus,
  workflowStatus,
  createdAt,
  contractStatus,
  contractSentAt,
  contractViewedAt,
  contractSignedAt,
  hasReceivables,
  isPaid,
}: SaleTimelineProps) {
  const isActive = saleStatus === 'active';
  const isDraft = saleStatus === 'draft';

  const steps: TimelineStep[] = [
    {
      key: 'created',
      label: 'Cotação Criada',
      icon: FileText,
      date: createdAt,
      completed: true,
    },
    {
      key: 'proposal_sent',
      label: 'Proposta Enviada',
      icon: Send,
      completed: ['proposta_enviada', 'negociacao', 'emitido'].includes(workflowStatus) || isActive,
    },
    {
      key: 'approved',
      label: 'Cotação Aprovada',
      icon: CheckCircle2,
      completed: workflowStatus === 'emitido' || isActive,
    },
    {
      key: 'sale_created',
      label: 'Venda Criada',
      icon: DollarSign,
      completed: isActive,
    },
    {
      key: 'contract_generated',
      label: 'Contrato Gerado',
      icon: FileText,
      completed: !!contractStatus && contractStatus !== 'none',
    },
    {
      key: 'contract_sent',
      label: 'Contrato Enviado',
      icon: Send,
      date: contractSentAt,
      completed: !!contractSentAt,
    },
    {
      key: 'contract_viewed',
      label: 'Contrato Visualizado',
      icon: Eye,
      date: contractViewedAt,
      completed: !!contractViewedAt,
    },
    {
      key: 'contract_signed',
      label: 'Contrato Assinado',
      icon: PenTool,
      date: contractSignedAt,
      completed: !!contractSignedAt,
    },
    {
      key: 'payment',
      label: 'Cobrança Gerada',
      icon: CreditCard,
      completed: !!hasReceivables,
    },
    {
      key: 'paid',
      label: 'Pagamento Realizado',
      icon: DollarSign,
      completed: !!isPaid,
    },
    {
      key: 'completed',
      label: 'Processo Concluído',
      icon: Flag,
      completed: !!isPaid && !!contractSignedAt,
    },
  ];

  // Find the first incomplete step to mark as active
  const activeIdx = steps.findIndex(s => !s.completed);

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-center gap-0 min-w-[700px] py-2">
        {steps.map((step, idx) => {
          const isCompleted = step.completed;
          const isActiveStep = idx === activeIdx;
          const Icon = step.icon;

          return (
            <div key={step.key} className="flex items-center flex-1 min-w-0">
              <div className="flex flex-col items-center relative group">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all shrink-0',
                    isCompleted
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : isActiveStep
                        ? 'bg-primary/10 border-primary text-primary animate-pulse'
                        : 'bg-muted border-muted-foreground/30 text-muted-foreground/50'
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : isActiveStep ? (
                    <Clock className="h-4 w-4" />
                  ) : (
                    <Circle className="h-4 w-4" />
                  )}
                </div>
                <p
                  className={cn(
                    'text-[10px] text-center mt-1 leading-tight max-w-[80px]',
                    isCompleted ? 'text-emerald-600 font-medium' : isActiveStep ? 'text-primary font-medium' : 'text-muted-foreground/60'
                  )}
                >
                  {step.label}
                </p>
                {step.date && (
                  <p className="text-[9px] text-muted-foreground">
                    {format(new Date(step.date), 'dd/MM HH:mm')}
                  </p>
                )}
              </div>
              {idx < steps.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mx-1',
                    isCompleted ? 'bg-emerald-500' : 'bg-muted-foreground/20'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
