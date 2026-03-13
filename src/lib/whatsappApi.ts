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
  if (error) throw new Error(error.message || 'Erro ao comunicar com servidor WhatsApp');
  return data;
}

export async function fetchChats(serverUrl: string) {
  return proxyRequest(serverUrl, '/chats');
}

export async function fetchMessages(serverUrl: string, number: string) {
  return proxyRequest(serverUrl, `/messages/${encodeURIComponent(number)}`);
}

export async function sendMessage(serverUrl: string, number: string, message: string) {
  return proxyRequest(serverUrl, '/send', 'POST', { number, message });
}

export async function sendMedia(serverUrl: string, number: string, file: File, caption?: string) {
  // Media needs special handling - convert to base64 and send through proxy
  const base64 = await fileToBase64(file);
  return proxyRequest(serverUrl, '/send-media', 'POST', {
    number,
    file_base64: base64,
    file_name: file.name,
    mime_type: file.type,
    caption,
  });
}

export async function checkStatus(serverUrl: string) {
  return proxyRequest(serverUrl, '/status');
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
