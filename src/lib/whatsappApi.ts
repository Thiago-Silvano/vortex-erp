import { supabase } from '@/integrations/supabase/client';

let _serverUrl = '';

export async function getServerUrl(empresaId: string): Promise<string> {
  if (_serverUrl) return _serverUrl;
  
  const { data } = await supabase
    .from('whatsapp_settings')
    .select('server_url')
    .eq('empresa_id', empresaId)
    .maybeSingle() as any;
  
  _serverUrl = data?.server_url || 'http://localhost:3000';
  return _serverUrl;
}

export function resetServerUrl() {
  _serverUrl = '';
}

async function proxyRequest(serverUrl: string, endpoint: string, method = 'GET', payload?: any) {
  const { data, error } = await supabase.functions.invoke('whatsapp-proxy', {
    body: { server_url: serverUrl, endpoint, method, payload },
  });
  if (error) {
    throw new Error(error.message || 'Erro ao comunicar com servidor WhatsApp');
  }
  // Check if the response itself contains an error (e.g. connection timeout)
  if (data && typeof data === 'object' && data.error) {
    const msg = String(data.error);
    if (msg.includes('timed out') || msg.includes('Connection') || msg.includes('connect error')) {
      throw new Error(`Servidor WhatsApp indisponível. Verifique se o servidor em ${serverUrl} está online e com a porta aberta para conexões externas.`);
    }
    throw new Error(msg);
  }
  return data;
}

export async function fetchChats(serverUrl: string) {
  return proxyRequest(serverUrl, '/chats');
}

export async function fetchMessages(serverUrl: string, number: string) {
  const chatId = formatChatId(number);
  return proxyRequest(serverUrl, `/messages/${encodeURIComponent(chatId)}`);
}

export async function sendMessage(serverUrl: string, number: string, message: string, quotedMsgId?: string) {
  const chatId = formatChatId(number);
  const payload: any = { number: chatId, message };
  if (quotedMsgId) {
    payload.quotedMsgId = quotedMsgId;
  }
  return proxyRequest(serverUrl, '/send', 'POST', payload);
}

export async function sendMedia(serverUrl: string, number: string, file: File, caption?: string) {
  const base64 = await fileToBase64(file);
  const chatId = formatChatId(number);
  return proxyRequest(serverUrl, '/send-media', 'POST', {
    number: chatId,
    file_base64: base64,
    file_name: file.name,
    mime_type: file.type,
    caption,
  });
}

export async function fetchMedia(serverUrl: string, msgId: string): Promise<{ data: string; mimetype: string } | null> {
  try {
    const result = await proxyRequest(serverUrl, `/media/${encodeURIComponent(msgId)}`);
    if (result && result.data && result.mimetype) {
      return { data: result.data, mimetype: result.mimetype };
    }
    return null;
  } catch {
    return null;
  }
}

export async function checkStatus(serverUrl: string) {
  return proxyRequest(serverUrl, '/status');
}

export async function disconnectSession(serverUrl: string) {
  return proxyRequest(serverUrl, '/disconnect', 'POST');
}

export async function getQrCode(serverUrl: string) {
  return proxyRequest(serverUrl, '/qr');
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

    // Convert base64 to Uint8Array
    const binaryStr = atob(base64Data);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    const { error } = await supabase.storage
      .from('whatsapp-media')
      .upload(fileName, bytes, {
        contentType: mimetype,
        upsert: true,
      });

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
 * Normalize outbound number for WhatsApp send.
 */
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
