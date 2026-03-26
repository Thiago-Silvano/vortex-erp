// ============================================================
// Status & Badge mapping for NFS-e module UI
// ============================================================
import type { NfseDocumentStatus, CertificateStatus, QueueItemStatus, NotificationStatus } from './types';

export interface StatusDisplay {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  color?: string; // tailwind class for icon/text
  description: string;
}

// ──────────────────────────────────────────────
// Document Status
// ──────────────────────────────────────────────
export const DOCUMENT_STATUS_MAP: Record<NfseDocumentStatus, StatusDisplay> = {
  draft:              { label: 'Rascunho',                variant: 'secondary',    color: 'text-muted-foreground', description: 'Nota salva como rascunho, ainda não enviada.' },
  validating:         { label: 'Validando',               variant: 'outline',      color: 'text-amber-500',        description: 'Os dados estão sendo validados pelo backend fiscal.' },
  validation_failed:  { label: 'Validação falhou',        variant: 'destructive',  color: 'text-destructive',      description: 'Os dados da nota possuem erros. Corrija e tente novamente.' },
  waiting_backend:    { label: 'Aguardando backend',      variant: 'outline',      color: 'text-amber-500',        description: 'A nota foi enviada e aguarda processamento pelo backend fiscal.' },
  queued:             { label: 'Em fila',                  variant: 'outline',      color: 'text-blue-500',         description: 'A nota está na fila de processamento do backend.' },
  signing:            { label: 'Assinando XML',           variant: 'outline',      color: 'text-blue-500',         description: 'O XML está sendo assinado digitalmente no backend.' },
  transmitting:       { label: 'Transmitindo',            variant: 'outline',      color: 'text-blue-500',         description: 'A nota está sendo transmitida para a API Nacional.' },
  awaiting_status:    { label: 'Aguardando retorno',      variant: 'outline',      color: 'text-amber-500',        description: 'A nota foi transmitida e aguarda confirmação da API Nacional.' },
  authorized:         { label: 'Autorizada',              variant: 'default',      color: 'text-emerald-500',      description: 'Nota fiscal autorizada com sucesso pelo governo.' },
  rejected:           { label: 'Rejeitada',               variant: 'destructive',  color: 'text-destructive',      description: 'A nota foi rejeitada pela API Nacional.' },
  cancel_requested:   { label: 'Cancelamento solicitado', variant: 'outline',      color: 'text-orange-500',       description: 'O cancelamento foi solicitado e está sendo processado.' },
  canceled:           { label: 'Cancelada',               variant: 'destructive',  color: 'text-destructive',      description: 'Nota fiscal cancelada.' },
  internal_error:     { label: 'Erro interno',            variant: 'destructive',  color: 'text-destructive',      description: 'Ocorreu um erro inesperado. Contate o suporte.' },
};

// Legacy status mapping (old DB values → new)
export const LEGACY_STATUS_MAP: Record<string, NfseDocumentStatus> = {
  rascunho: 'draft',
  processando: 'waiting_backend',
  transmitindo: 'transmitting',
  autorizada: 'authorized',
  rejeitada: 'rejected',
  cancelada: 'canceled',
};

export function normalizeDocumentStatus(raw: string): NfseDocumentStatus {
  if (raw in DOCUMENT_STATUS_MAP) return raw as NfseDocumentStatus;
  if (raw in LEGACY_STATUS_MAP) return LEGACY_STATUS_MAP[raw];
  return 'internal_error';
}

// ──────────────────────────────────────────────
// Certificate Status
// ──────────────────────────────────────────────
export const CERTIFICATE_STATUS_MAP: Record<CertificateStatus, StatusDisplay> = {
  not_uploaded:   { label: 'Não enviado',       variant: 'secondary',   color: 'text-muted-foreground', description: 'Nenhum certificado enviado.' },
  uploaded:       { label: 'Enviado',           variant: 'outline',     color: 'text-blue-500',         description: 'Certificado enviado, aguardando validação.' },
  valid:          { label: 'Válido',            variant: 'default',     color: 'text-emerald-500',      description: 'Certificado válido e pronto para uso.' },
  expiring:       { label: 'Expirando',         variant: 'outline',     color: 'text-amber-500',        description: 'Certificado próximo do vencimento.' },
  expired:        { label: 'Expirado',          variant: 'destructive', color: 'text-destructive',      description: 'Certificado vencido. Envie um novo.' },
  invalid:        { label: 'Inválido',          variant: 'destructive', color: 'text-destructive',      description: 'Certificado inválido ou corrompido.' },
  password_error: { label: 'Senha incorreta',   variant: 'destructive', color: 'text-destructive',      description: 'Senha do certificado está incorreta.' },
};

// ──────────────────────────────────────────────
// Queue Status
// ──────────────────────────────────────────────
export const QUEUE_STATUS_MAP: Record<QueueItemStatus, StatusDisplay> = {
  pending:          { label: 'Pendente',             variant: 'outline',     color: 'text-amber-500',        description: 'Item aguardando processamento.' },
  processing:       { label: 'Processando',          variant: 'outline',     color: 'text-blue-500',         description: 'Item sendo processado agora.' },
  retry_scheduled:  { label: 'Retry agendado',       variant: 'outline',     color: 'text-amber-500',        description: 'Nova tentativa será feita em breve.' },
  failed_temporary: { label: 'Falha temporária',     variant: 'outline',     color: 'text-orange-500',       description: 'Falha temporária, será tentado novamente.' },
  failed_permanent: { label: 'Falha permanente',     variant: 'destructive', color: 'text-destructive',      description: 'Falhou após todas as tentativas.' },
  completed:        { label: 'Concluído',            variant: 'default',     color: 'text-emerald-500',      description: 'Processamento concluído com sucesso.' },
  canceled:         { label: 'Cancelado',            variant: 'secondary',   color: 'text-muted-foreground', description: 'Item removido da fila.' },
};

// ──────────────────────────────────────────────
// Notification Status
// ──────────────────────────────────────────────
export const NOTIFICATION_STATUS_MAP: Record<NotificationStatus, StatusDisplay> = {
  not_sent:       { label: 'Não enviado',       variant: 'secondary',   color: 'text-muted-foreground', description: 'Nota ainda não foi enviada ao cliente.' },
  email_sent:     { label: 'E-mail enviado',    variant: 'default',     color: 'text-emerald-500',      description: 'Enviada por e-mail.' },
  whatsapp_sent:  { label: 'WhatsApp enviado',  variant: 'default',     color: 'text-emerald-500',      description: 'Enviada por WhatsApp.' },
  both_sent:      { label: 'Ambos enviados',    variant: 'default',     color: 'text-emerald-500',      description: 'Enviada por e-mail e WhatsApp.' },
  send_failed:    { label: 'Falha no envio',    variant: 'destructive', color: 'text-destructive',      description: 'Falha ao enviar ao cliente.' },
};

// All status values for filter dropdowns
export const DOCUMENT_STATUS_OPTIONS = Object.entries(DOCUMENT_STATUS_MAP).map(([value, display]) => ({
  value,
  label: display.label,
}));
