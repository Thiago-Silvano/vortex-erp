// ============================================================
// Error Mapper — converts backend error codes to UX messages
// ============================================================
import type { FiscalErrorCode, ApiErrorResponse } from './types';

interface ErrorDisplay {
  title: string;
  message: string;
  action?: string;
  severity: 'warning' | 'error' | 'info';
}

const ERROR_DISPLAY_MAP: Record<FiscalErrorCode, ErrorDisplay> = {
  CERTIFICATE_EXPIRED: {
    title: 'Certificado vencido',
    message: 'O certificado digital está expirado. Envie um novo certificado válido para continuar emitindo notas.',
    action: 'Ir para Certificados',
    severity: 'error',
  },
  CERTIFICATE_INVALID_PASSWORD: {
    title: 'Senha do certificado inválida',
    message: 'A senha informada para o certificado digital está incorreta. Envie novamente com a senha correta.',
    action: 'Ir para Certificados',
    severity: 'error',
  },
  CERTIFICATE_NOT_FOUND: {
    title: 'Certificado não encontrado',
    message: 'Nenhum certificado digital ativo foi encontrado. Envie um certificado A1 para emitir notas fiscais.',
    action: 'Ir para Certificados',
    severity: 'error',
  },
  COMPANY_SETTINGS_MISSING: {
    title: 'Configurações fiscais incompletas',
    message: 'Os dados fiscais da empresa não estão configurados. Preencha CNPJ, inscrição municipal e demais campos obrigatórios.',
    action: 'Ir para Configurações',
    severity: 'error',
  },
  SERVICE_MAPPING_MISSING: {
    title: 'Serviço fiscal não mapeado',
    message: 'O serviço selecionado não possui mapeamento fiscal. Cadastre o serviço na seção de Serviços Fiscais.',
    action: 'Ir para Serviços',
    severity: 'error',
  },
  INVALID_TAXPAYER_DOCUMENT: {
    title: 'CPF/CNPJ inválido',
    message: 'O CPF ou CNPJ do tomador é inválido. Verifique os dados e tente novamente.',
    severity: 'warning',
  },
  XML_BUILD_FAILED: {
    title: 'Erro ao montar XML',
    message: 'Ocorreu um erro ao montar o XML da nota fiscal. Verifique os dados e tente novamente.',
    severity: 'error',
  },
  XML_SIGN_FAILED: {
    title: 'Erro ao assinar XML',
    message: 'Não foi possível assinar digitalmente o XML. Verifique se o certificado digital está válido.',
    action: 'Ir para Certificados',
    severity: 'error',
  },
  NATIONAL_API_TIMEOUT: {
    title: 'Timeout na API Nacional',
    message: 'A API Nacional da NFS-e não respondeu a tempo. A nota permanecerá na fila e será reenviada automaticamente.',
    severity: 'warning',
  },
  NATIONAL_API_REJECTED: {
    title: 'Nota rejeitada pela API Nacional',
    message: 'A API Nacional rejeitou a nota fiscal. Verifique os detalhes técnicos da rejeição para corrigir.',
    severity: 'error',
  },
  NATIONAL_API_UNAVAILABLE: {
    title: 'API Nacional indisponível',
    message: 'A API Nacional da NFS-e está temporariamente indisponível. A nota será processada quando o serviço retornar.',
    severity: 'warning',
  },
  DOCUMENT_NOT_FOUND: {
    title: 'Documento não encontrado',
    message: 'A nota fiscal solicitada não foi encontrada no sistema.',
    severity: 'error',
  },
  UNAUTHORIZED_COMPANY_ACCESS: {
    title: 'Acesso não autorizado',
    message: 'Você não tem permissão para acessar os dados fiscais desta empresa.',
    severity: 'error',
  },
  VALIDATION_ERROR: {
    title: 'Erro de validação',
    message: 'Um ou mais campos da nota possuem erros. Verifique os dados e tente novamente.',
    severity: 'warning',
  },
  CANCEL_NOT_ALLOWED: {
    title: 'Cancelamento não permitido',
    message: 'Esta nota não pode ser cancelada no estado atual. Apenas notas autorizadas podem ser canceladas.',
    severity: 'warning',
  },
  CANCEL_FAILED: {
    title: 'Falha no cancelamento',
    message: 'Não foi possível cancelar a nota fiscal. Tente novamente ou contate o suporte.',
    severity: 'error',
  },
  BACKEND_UNAVAILABLE: {
    title: 'Backend fiscal indisponível',
    message: 'O servidor fiscal externo não está respondendo. Verifique a configuração de conexão ou tente novamente mais tarde.',
    severity: 'error',
  },
  UNKNOWN_ERROR: {
    title: 'Erro inesperado',
    message: 'Ocorreu um erro inesperado. Tente novamente ou contate o suporte técnico.',
    severity: 'error',
  },
};

/**
 * Converts an API error response to a user-friendly display object.
 */
export function mapErrorToDisplay(error: ApiErrorResponse['error']): ErrorDisplay {
  const mapped = ERROR_DISPLAY_MAP[error.code];
  if (mapped) {
    return {
      ...mapped,
      // Append backend details if available
      message: error.details ? `${mapped.message}\n\nDetalhe: ${error.details}` : mapped.message,
    };
  }
  return {
    title: 'Erro',
    message: error.message || 'Erro desconhecido.',
    severity: 'error',
  };
}

/**
 * Converts a raw error (catch block) to a user-friendly message.
 */
export function mapRawErrorToMessage(err: unknown): string {
  if (err instanceof Error) {
    if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
      return ERROR_DISPLAY_MAP.BACKEND_UNAVAILABLE.message;
    }
    return err.message;
  }
  return ERROR_DISPLAY_MAP.UNKNOWN_ERROR.message;
}
