// ============================================================
// Fiscal API Client Layer
// All communication with the external fiscal backend goes here.
// The base URL is configurable — defaults to '' (not connected).
// ============================================================
import type {
  ApiResponse,
  FiscalSettings,
  TestConnectionResponse,
  CertificateInfo,
  CertificateUploadRequest,
  CertificateValidateResponse,
  FiscalServiceMapping,
  NfseDocument,
  NfseEmitRequest,
  NfseEmitResponse,
  NfseValidateRequest,
  NfseValidateResponse,
  NfseStatusResponse,
  NfseCancelRequest,
  NfseCancelResponse,
  NfseResendRequest,
  NfseResendResponse,
  NfseQueueItem,
  NfseEvent,
  NfseApiLog,
  NfseAuditLog,
  FiscalErrorCode,
} from './types';

// ──────────────────────────────────────────────
// Configuration
// ──────────────────────────────────────────────

let _backendBaseUrl = '';
let _authToken = '';

/**
 * Configure the fiscal backend base URL (e.g. https://fiscal.minhaempresa.com.br).
 * Must be called before any API function.
 */
export function configureFiscalBackend(baseUrl: string, authToken?: string) {
  _backendBaseUrl = baseUrl.replace(/\/+$/, '');
  if (authToken) _authToken = authToken;
}

export function getFiscalBackendUrl(): string {
  return _backendBaseUrl;
}

export function isFiscalBackendConfigured(): boolean {
  return _backendBaseUrl.length > 0;
}

// ──────────────────────────────────────────────
// Internal fetch wrapper
// ──────────────────────────────────────────────

async function fiscalFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  if (!_backendBaseUrl) {
    return {
      success: false,
      error: {
        code: 'BACKEND_UNAVAILABLE' as FiscalErrorCode,
        message: 'Backend fiscal não configurado. Configure a URL do backend nas configurações fiscais.',
      },
    };
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (_authToken) {
    headers['Authorization'] = `Bearer ${_authToken}`;
  }

  try {
    const response = await fetch(`${_backendBaseUrl}${path}`, {
      ...options,
      headers,
    });

    const data = await response.json();
    return data as ApiResponse<T>;
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'BACKEND_UNAVAILABLE' as FiscalErrorCode,
        message: err instanceof Error ? err.message : 'Erro de conexão com o backend fiscal.',
      },
    };
  }
}

// ══════════════════════════════════════════════
// FISCAL SETTINGS API
// ══════════════════════════════════════════════

export const fiscalSettingsApi = {
  get: (companyId: string) =>
    fiscalFetch<FiscalSettings>(`/api/fiscal/settings/${companyId}`),

  update: (companyId: string, data: Partial<FiscalSettings>) =>
    fiscalFetch<FiscalSettings>(`/api/fiscal/settings/${companyId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  testConnection: (companyId: string) =>
    fiscalFetch<TestConnectionResponse>(`/api/fiscal/settings/${companyId}/test-connection`, {
      method: 'POST',
    }),
};

// ══════════════════════════════════════════════
// CERTIFICATES API
// ══════════════════════════════════════════════

export const certificatesApi = {
  get: (companyId: string) =>
    fiscalFetch<CertificateInfo>(`/api/fiscal/certificates/${companyId}`),

  upload: (data: CertificateUploadRequest) =>
    fiscalFetch<CertificateInfo>('/api/fiscal/certificates/upload', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  validate: (certificateId: string) =>
    fiscalFetch<CertificateValidateResponse>(`/api/fiscal/certificates/${certificateId}/validate`, {
      method: 'POST',
    }),

  testUsage: (certificateId: string) =>
    fiscalFetch<{ success: boolean; message: string }>(`/api/fiscal/certificates/${certificateId}/test-usage`, {
      method: 'POST',
    }),

  remove: (certificateId: string) =>
    fiscalFetch<{ deleted: boolean }>(`/api/fiscal/certificates/${certificateId}`, {
      method: 'DELETE',
    }),
};

// ══════════════════════════════════════════════
// FISCAL SERVICES API
// ══════════════════════════════════════════════

export const fiscalServicesApi = {
  list: (companyId: string) =>
    fiscalFetch<FiscalServiceMapping[]>(`/api/fiscal/services/${companyId}`),

  create: (data: Omit<FiscalServiceMapping, 'id'>) =>
    fiscalFetch<FiscalServiceMapping>('/api/fiscal/services', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<FiscalServiceMapping>) =>
    fiscalFetch<FiscalServiceMapping>(`/api/fiscal/services/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  remove: (id: string) =>
    fiscalFetch<{ deleted: boolean }>(`/api/fiscal/services/${id}`, {
      method: 'DELETE',
    }),
};

// ══════════════════════════════════════════════
// NFS-e API
// ══════════════════════════════════════════════

export const nfseApi = {
  /** Save as draft on backend (or create if not exists) */
  saveDraft: (data: Partial<NfseDocument>) =>
    fiscalFetch<NfseDocument>('/api/nfse/drafts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Validate document data before emitting */
  validate: (data: NfseValidateRequest) =>
    fiscalFetch<NfseValidateResponse>('/api/nfse/validate', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Emit NFS-e — triggers signing + transmission on backend */
  emit: (data: NfseEmitRequest) =>
    fiscalFetch<NfseEmitResponse>('/api/nfse/emit', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Get current status from backend (queries national API if needed) */
  getStatus: (nfseId: string) =>
    fiscalFetch<NfseStatusResponse>(`/api/nfse/${nfseId}/status`),

  /** Get full document data */
  get: (nfseId: string) =>
    fiscalFetch<NfseDocument>(`/api/nfse/${nfseId}`),

  /** Download authorized XML content */
  getXml: (nfseId: string) =>
    fiscalFetch<{ xml: string; storage_path: string }>(`/api/nfse/${nfseId}/xml`),

  /** Get PDF URL or content */
  getPdf: (nfseId: string) =>
    fiscalFetch<{ pdf_url: string; storage_path: string }>(`/api/nfse/${nfseId}/pdf`),

  /** Request cancellation */
  cancel: (data: NfseCancelRequest) =>
    fiscalFetch<NfseCancelResponse>(`/api/nfse/${data.nfse_id}/cancel`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Resend to client via email or whatsapp */
  resend: (data: NfseResendRequest) =>
    fiscalFetch<NfseResendResponse>(`/api/nfse/${data.nfse_id}/resend-${data.channel}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Get events/timeline for a document */
  getEvents: (nfseId: string) =>
    fiscalFetch<NfseEvent[]>(`/api/nfse/${nfseId}/events`),

  /** Get API logs for a document */
  getLogs: (nfseId: string) =>
    fiscalFetch<NfseApiLog[]>(`/api/nfse/${nfseId}/logs`),
};

// ══════════════════════════════════════════════
// QUEUE API
// ══════════════════════════════════════════════

export const queueApi = {
  list: (companyId: string) =>
    fiscalFetch<NfseQueueItem[]>(`/api/nfse/queue?empresa_id=${companyId}`),

  reprocess: (queueId: string) =>
    fiscalFetch<{ queued: boolean; message: string }>(`/api/nfse/queue/${queueId}/reprocess`, {
      method: 'POST',
    }),

  retryStatus: (queueId: string) =>
    fiscalFetch<NfseStatusResponse>(`/api/nfse/queue/${queueId}/retry-status`, {
      method: 'POST',
    }),

  remove: (queueId: string) =>
    fiscalFetch<{ deleted: boolean }>(`/api/nfse/queue/${queueId}`, {
      method: 'DELETE',
    }),
};

// ══════════════════════════════════════════════
// AUDIT API
// ══════════════════════════════════════════════

export const auditApi = {
  list: (companyId: string, filters?: { from?: string; to?: string; action?: string }) => {
    const params = new URLSearchParams({ empresa_id: companyId });
    if (filters?.from) params.set('from', filters.from);
    if (filters?.to) params.set('to', filters.to);
    if (filters?.action) params.set('action', filters.action);
    return fiscalFetch<NfseAuditLog[]>(`/api/nfse/audit?${params.toString()}`);
  },
};
