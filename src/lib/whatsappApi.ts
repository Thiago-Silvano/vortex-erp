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

export async function fetchChats(serverUrl: string) {
  const res = await fetch(`${serverUrl}/chats`);
  if (!res.ok) throw new Error('Falha ao carregar conversas');
  return res.json();
}

export async function fetchMessages(serverUrl: string, number: string) {
  const res = await fetch(`${serverUrl}/messages/${encodeURIComponent(number)}`);
  if (!res.ok) throw new Error('Falha ao carregar mensagens');
  return res.json();
}

export async function sendMessage(serverUrl: string, number: string, message: string) {
  const res = await fetch(`${serverUrl}/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ number, message }),
  });
  if (!res.ok) throw new Error('Falha ao enviar mensagem');
  return res.json();
}

export async function sendMedia(serverUrl: string, number: string, file: File, caption?: string) {
  const formData = new FormData();
  formData.append('number', number);
  formData.append('file', file);
  if (caption) formData.append('caption', caption);
  
  const res = await fetch(`${serverUrl}/send-media`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Falha ao enviar mídia');
  return res.json();
}
