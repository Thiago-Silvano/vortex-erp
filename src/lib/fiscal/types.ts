// ============================================================
// NFS-e Fiscal Module — Types & Contracts
// All types for frontend ↔ external backend communication
// ============================================================

// ──────────────────────────────────────────────
// A) Document Status
// ──────────────────────────────────────────────
export type NfseDocumentStatus =
  | 'draft'
  | 'validating'
  | 'validation_failed'
  | 'waiting_backend'
  | 'queued'
  | 'signing'
  | 'transmitting'
  | 'awaiting_status'
  | 'authorized'
  | 'rejected'
  | 'cancel_requested'
  | 'canceled'
  | 'internal_error';

// B) Certificate Status
export type CertificateStatus =
  | 'not_uploaded'
  | 'uploaded'
  | 'valid'
  | 'expiring'
  | 'expired'
  | 'invalid'
  | 'password_error';

// C) Queue Status
export type QueueItemStatus =
  | 'pending'
  | 'processing'
  | 'retry_scheduled'
  | 'failed_temporary'
  | 'failed_permanent'
  | 'completed'
  | 'canceled';

// D) Notification Status
export type NotificationStatus =
  | 'not_sent'
  | 'email_sent'
  | 'whatsapp_sent'
  | 'both_sent'
  | 'send_failed';

// ──────────────────────────────────────────────
// Error Codes
// ──────────────────────────────────────────────
export type FiscalErrorCode =
  | 'CERTIFICATE_EXPIRED'
  | 'CERTIFICATE_INVALID_PASSWORD'
  | 'CERTIFICATE_NOT_FOUND'
  | 'COMPANY_SETTINGS_MISSING'
  | 'SERVICE_MAPPING_MISSING'
  | 'INVALID_TAXPAYER_DOCUMENT'
  | 'XML_BUILD_FAILED'
  | 'XML_SIGN_FAILED'
  | 'NATIONAL_API_TIMEOUT'
  | 'NATIONAL_API_REJECTED'
  | 'NATIONAL_API_UNAVAILABLE'
  | 'DOCUMENT_NOT_FOUND'
  | 'UNAUTHORIZED_COMPANY_ACCESS'
  | 'VALIDATION_ERROR'
  | 'CANCEL_NOT_ALLOWED'
  | 'CANCEL_FAILED'
  | 'BACKEND_UNAVAILABLE'
  | 'UNKNOWN_ERROR';

// ──────────────────────────────────────────────
// API Response Wrappers
// ──────────────────────────────────────────────
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
  request_id?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: FiscalErrorCode;
    message: string;
    details?: string;
    field_errors?: Record<string, string>;
  };
  request_id?: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// ──────────────────────────────────────────────
// Fiscal Settings
// ──────────────────────────────────────────────
export interface FiscalSettings {
  id: string;
  empresa_id: string;
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  inscricao_municipal: string;
  cnae: string;
  regime_tributario: string;
  municipio: string;
  uf: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  telefone: string;
  email_fiscal: string;
  codigo_servico: string;
  item_lista_servico: string;
  aliquota_padrao: number;
  natureza_operacao: string;
  serie_nfse: string;
  ambiente: 'homologacao' | 'producao';
  exigibilidade_iss: string;
  optante_simples: boolean;
  retencao_iss_padrao: boolean;
  observacoes_padrao: string;
  codigo_tributacao: string;
  incidencia_tributaria: string;
  /** Whether the backend connection has been tested and is reachable */
  backend_connected?: boolean;
  backend_url?: string;
}

export interface TestConnectionResponse {
  connected: boolean;
  latency_ms: number;
  certificate_status: CertificateStatus;
  api_ambiente: string;
  message: string;
}

// ──────────────────────────────────────────────
// Certificate
// ──────────────────────────────────────────────
export interface CertificateInfo {
  id: string;
  empresa_id: string;
  status: CertificateStatus;
  titular: string;
  cnpj_certificado: string;
  emissor: string;
  validade_inicio: string | null;
  validade_fim: string | null;
  uploaded_at: string;
  uploaded_by: string;
  validated_at: string | null;
  arquivo_hash: string | null;
}

export interface CertificateUploadRequest {
  empresa_id: string;
  arquivo_base64: string;
  senha: string;
  file_name: string;
}

export interface CertificateValidateResponse {
  valid: boolean;
  status: CertificateStatus;
  titular: string;
  cnpj_certificado: string;
  emissor: string;
  validade_inicio: string;
  validade_fim: string;
  days_to_expiry: number;
  message: string;
}

// ──────────────────────────────────────────────
// Fiscal Service Mapping
// ──────────────────────────────────────────────
export interface FiscalServiceMapping {
  id: string;
  empresa_id: string;
  nome_interno: string;
  categoria: string;
  codigo_servico: string;
  item_lista_lc116: string;
  descricao_fiscal: string;
  aliquota: number;
  retencao_iss: boolean;
  tributacao: string;
  municipio_incidencia: string;
  observacoes: string;
  is_active: boolean;
  service_catalog_id?: string;
}

// ──────────────────────────────────────────────
// NFS-e Document
// ──────────────────────────────────────────────
export interface NfseDocument {
  id: string;
  empresa_id: string;
  sale_id: string | null;
  client_id: string | null;
  fiscal_service_id: string | null;
  numero_nfse: string | null;
  chave_nfse: string | null;
  protocolo: string | null;
  serie: string;
  status: NfseDocumentStatus;
  ambiente: 'homologacao' | 'producao';
  data_emissao: string | null;
  data_competencia: string | null;
  // Values
  valor_servicos: number;
  valor_deducoes: number;
  valor_descontos: number;
  base_calculo: number;
  aliquota: number;
  valor_iss: number;
  valor_liquido: number;
  iss_retido: boolean;
  exigibilidade_iss: string;
  municipio_incidencia: string;
  codigo_servico: string;
  item_lista_servico: string;
  descricao_servico: string;
  natureza_operacao: string;
  // Tomador
  tomador_cnpj_cpf: string;
  tomador_razao_social: string;
  tomador_email: string;
  tomador_telefone: string;
  tomador_logradouro: string;
  tomador_numero: string;
  tomador_complemento: string;
  tomador_bairro: string;
  tomador_municipio: string;
  tomador_uf: string;
  tomador_cep: string;
  // Extras
  observacoes: string;
  xml_dps: string | null;
  xml_nfse_autorizada: string | null;
  pdf_url: string | null;
  xml_storage_path: string | null;
  pdf_storage_path: string | null;
  motivo_rejeicao: string | null;
  motivo_rejeicao_tecnico: string | null;
  motivo_cancelamento: string | null;
  cancelado_por: string | null;
  cancelado_em: string | null;
  protocolo_cancelamento: string | null;
  notification_status: NotificationStatus;
  emitido_por: string;
  request_id: string | null;
  correlation_id: string | null;
  backend_raw_response: string | null;
  created_at: string;
  updated_at: string;
}

// ──────────────────────────────────────────────
// NFS-e Emit Request / Response
// ──────────────────────────────────────────────
export interface NfseEmitRequest {
  empresa_id: string;
  nfse_id: string;
  /** If true, only validates without emitting */
  dry_run?: boolean;
}

export interface NfseEmitResponse {
  nfse_id: string;
  status: NfseDocumentStatus;
  numero_nfse?: string;
  chave_nfse?: string;
  protocolo?: string;
  data_emissao?: string;
  xml_storage_path?: string;
  pdf_storage_path?: string;
  pdf_url?: string;
  queue_id?: string;
  message: string;
}

export interface NfseValidateRequest {
  empresa_id: string;
  nfse_id: string;
}

export interface NfseValidateResponse {
  valid: boolean;
  errors: Array<{ field: string; message: string }>;
  warnings: Array<{ field: string; message: string }>;
}

export interface NfseStatusResponse {
  nfse_id: string;
  status: NfseDocumentStatus;
  numero_nfse?: string;
  chave_nfse?: string;
  protocolo?: string;
  data_emissao?: string;
  motivo_rejeicao?: string;
  xml_storage_path?: string;
  pdf_storage_path?: string;
  pdf_url?: string;
  message: string;
}

export interface NfseCancelRequest {
  empresa_id: string;
  nfse_id: string;
  motivo: string;
}

export interface NfseCancelResponse {
  nfse_id: string;
  status: NfseDocumentStatus;
  protocolo_cancelamento?: string;
  message: string;
}

export interface NfseResendRequest {
  empresa_id: string;
  nfse_id: string;
  channel: 'email' | 'whatsapp';
  to?: string; // override email/phone
}

export interface NfseResendResponse {
  sent: boolean;
  channel: 'email' | 'whatsapp';
  message: string;
}

// ──────────────────────────────────────────────
// Queue
// ──────────────────────────────────────────────
export interface NfseQueueItem {
  id: string;
  nfse_id: string;
  empresa_id: string;
  action: string;
  status: QueueItemStatus;
  attempts: number;
  max_attempts: number;
  next_attempt_at: string;
  last_error: string | null;
  correlation_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined from nfse_documents for display
  tomador_razao_social?: string;
  valor_servicos?: number;
  numero_nfse?: string;
}

// ──────────────────────────────────────────────
// Events & Logs
// ──────────────────────────────────────────────
export interface NfseEvent {
  id: string;
  nfse_id: string;
  event_type: string;
  description: string;
  details: Record<string, unknown>;
  user_email: string;
  source: 'frontend' | 'backend' | 'national_api';
  previous_status: string | null;
  new_status: string | null;
  created_at: string;
}

export interface NfseApiLog {
  id: string;
  nfse_id: string | null;
  empresa_id: string | null;
  endpoint: string;
  method: string;
  request_payload: string | null;
  response_payload: string | null;
  response_status: number | null;
  response_time_ms: number | null;
  ambiente: string;
  error_message: string | null;
  request_id: string | null;
  correlation_id: string | null;
  source: 'frontend' | 'backend' | 'national_api';
  created_at: string;
}

export interface NfseAuditLog {
  id: string;
  empresa_id: string | null;
  nfse_id: string | null;
  action: string;
  description: string;
  user_id: string;
  user_email: string;
  ip_address: string;
  details: Record<string, unknown>;
  previous_status: string | null;
  new_status: string | null;
  request_id: string | null;
  created_at: string;
}

// ──────────────────────────────────────────────
// Notification Log
// ──────────────────────────────────────────────
export interface NfseNotificationLog {
  id: string;
  nfse_id: string;
  empresa_id: string;
  channel: 'email' | 'whatsapp';
  recipient: string;
  status: 'sent' | 'failed' | 'pending';
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
}
