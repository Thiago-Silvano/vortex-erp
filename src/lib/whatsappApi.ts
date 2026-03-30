import { supabase } from '@/integrations/supabase/client';

const _serverUrlCache: Record<string, string> = {};

export async function getServerUrl(empresaId: string): Promise<string> {
  if (!empresaId) throw new Error('ID da empresa é obrigatório para buscar configurações do WhatsApp.');
  if (_serverUrlCache[empresaId]) return _serverUrlCache[empresaId];
  
  const { data } = await supabase
    .from('whatsapp_settings')
    .select('server_url')
    .eq('empresa_id', empresaId)
    .maybeSingle() as any;
  
  _serverUrlCache[empresaId] = data?.server_url || 'http://localhost:3000';
  return _serverUrlCache[empresaId];
}

export function resetServerUrl(empresaId?: string) {
  if (empresaId) {
    delete _serverUrlCache[empresaId];
  } else {
    Object.keys(_serverUrlCache).forEach(k => delete _serverUrlCache[k]);
  }
}

async function proxyRequest(serverUrl: string, endpoint: string, method = 'GET', payload?: any) {
  const { data, error } = await supabase.functions.invoke('whatsapp-proxy', {
    body: { server_url: serverUrl, endpoint, method, payload },
  });
  if (error) {
    const parsedMessage = extractEdgeFunctionErrorMessage(error.message || 'Erro ao comunicar com servidor WhatsApp');
    throw new Error(normalizeProxyError(parsedMessage, serverUrl, endpoint));
  }
  if (data && typeof data === 'object' && data.error) {
    throw new Error(normalizeProxyError(String(data.error), serverUrl, endpoint));
  }
  return data;
}

function extractEdgeFunctionErrorMessage(message: string): string {
  const msg = String(message || '');
  const start = msg.indexOf('{');
  const end = msg.lastIndexOf('}');

  if (start !== -1 && end > start) {
    try {
      const parsed = JSON.parse(msg.slice(start, end + 1));
      if (parsed && typeof parsed === 'object') {
        if ('error' in parsed && typeof parsed.error === 'string') {
          return parsed.error;
        }
        if ('raw' in parsed && typeof parsed.raw === 'string') {
          return parsed.raw;
        }
      }
    } catch {
      // fallback
    }
  }

  return msg;
}

function normalizeProxyError(message: string, serverUrl: string, endpoint: string): string {
  const msg = String(message || '');
  const endpointMatch = msg.match(/Cannot\s+(GET|POST|PUT|PATCH|DELETE)\s+([^\s<]+)/i);

  if (msg.includes('Servidor WhatsApp indisponível')) return msg;
  if (endpointMatch) return `O servidor WhatsApp em ${serverUrl} não suporta o endpoint ${endpointMatch[2]}.`;
  if (msg.includes('timed out') || msg.includes('Connection') || msg.includes('connect error')) {
    return `Servidor WhatsApp indisponível. Verifique se o servidor em ${serverUrl} está online e com a porta aberta para conexões externas.`;
  }
  if (msg.includes('não suporta o endpoint')) return msg;
  if (msg.includes('Edge function returned 404')) {
    return `O servidor WhatsApp em ${serverUrl} não suporta o endpoint ${endpoint}.`;
  }

  return msg;
}

// =============================
// Server endpoints (matching server.js)
// =============================

/**
 * Connect / initialize the WhatsApp client on the server
 */
export async function connectSession(serverUrl: string, empresaId: string) {
  return proxyRequest(serverUrl, `/connect?empresa_id=${encodeURIComponent(empresaId)}`);
}

/**
 * Check status - returns { connected: true } or { qr: "data:..." } or { status: "waiting" }
 */
export async function checkStatus(serverUrl: string, empresaId: string) {
  return proxyRequest(serverUrl, `/status?empresa_id=${encodeURIComponent(empresaId)}`);
}

/**
 * Get QR code - same as checkStatus, extracts qr from response
 */
export async function getQrCode(serverUrl: string, empresaId: string) {
  return proxyRequest(serverUrl, `/status?empresa_id=${encodeURIComponent(empresaId)}`);
}

/**
 * Disconnect the WhatsApp session (GET endpoint on the server)
 */
export async function disconnectSession(serverUrl: string, empresaId: string) {
  return proxyRequest(serverUrl, `/disconnect?empresa_id=${encodeURIComponent(empresaId)}`);
}

/**
 * Send a text message via /send-message (POST)
 */
export async function sendMessage(serverUrl: string, empresaId: string, number: string, message: string) {
  const phone = formatChatId(number);
  return proxyRequest(serverUrl, '/send-message', 'POST', {
    empresa_id: empresaId,
    phone,
    message,
  });
}

/**
 * Send media via /send-message with media_url (POST)
 * First uploads file to storage, then sends the public URL
 */
export async function sendMedia(serverUrl: string, empresaId: string, number: string, file: File, caption?: string) {
  // Upload file to storage first to get a public URL
  const base64 = await fileToBase64(file);
  const ext = file.name.split('.').pop() || 'bin';
  const fileName = `${empresaId}/${crypto.randomUUID()}.${ext}`;

  const binaryStr = atob(base64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }

  const { error: uploadError } = await supabase.storage
    .from('whatsapp-media')
    .upload(fileName, bytes, { contentType: file.type, upsert: true });

  if (uploadError) {
    throw new Error('Erro ao fazer upload da mídia: ' + uploadError.message);
  }

  const { data: urlData } = supabase.storage.from('whatsapp-media').getPublicUrl(fileName);

  const phone = formatChatId(number);
  return proxyRequest(serverUrl, '/send-message', 'POST', {
    empresa_id: empresaId,
    phone,
    message: caption || '',
    media_url: urlData.publicUrl,
  });
}

/**
 * Upload media to storage and return the public URL
 */
export async function uploadMediaToStorage(
  base64Data: string,
  mimetype: string,
  empresaId: string,
  msgId: string
): Promise<string | null> {
  try {
    const ext = mimetype.split('/')[1]?.split(';')[0] || 'bin';
    const fileName = `${empresaId}/${msgId}.${ext}`;

    const binaryStr = atob(base64Data);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    const { error } = await supabase.storage
      .from('whatsapp-media')
      .upload(fileName, bytes, { contentType: mimetype, upsert: true });

    if (error) {
      console.error('Error uploading media:', error);
      return null;
    }

    const { data } = supabase.storage.from('whatsapp-media').getPublicUrl(fileName);
    return data.publicUrl;
  } catch (err) {
    console.error('Error in uploadMediaToStorage:', err);
    return null;
  }
}

/**
 * Get profile picture URL for a contact
 */
const _profilePicCache: Record<string, { url: string | null; ts: number }> = {};

export async function getProfilePic(serverUrl: string, empresaId: string, phone: string): Promise<string | null> {
  const cacheKey = `${empresaId}:${phone}`;
  const cached = _profilePicCache[cacheKey];
  // Cache for 30 minutes
  if (cached && Date.now() - cached.ts < 30 * 60 * 1000) return cached.url;

  try {
    const normalized = (phone || '').replace(/\D/g, '');
    if (!normalized || normalized.length < 8) return null;
    const data = await proxyRequest(serverUrl, `/profile-pic?empresa_id=${encodeURIComponent(empresaId)}&phone=${encodeURIComponent(normalized)}`);
    const url = data?.url || null;
    _profilePicCache[cacheKey] = { url, ts: Date.now() };
    return url;
  } catch {
    _profilePicCache[cacheKey] = { url: null, ts: Date.now() };
    return null;
  }
}

// =============================
// Helpers
// =============================

function normalizeOutboundNumber(phone: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('55')) return digits;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
}

function formatChatId(phone: string): string {
  if (!phone) return '';
  if (phone.includes('@')) return phone;
  const normalized = normalizeOutboundNumber(phone);
  return normalized ? `${normalized}@c.us` : '';
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
