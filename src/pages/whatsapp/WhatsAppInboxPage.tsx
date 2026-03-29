import AppLayout from '@/components/AppLayout';
import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Search, Send, Paperclip, UserPlus, Phone, MessageSquarePlus, X } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { fetchChats, fetchMessages, sendMessage, sendMedia, getServerUrl } from '@/lib/whatsappApi';
import { io, Socket } from 'socket.io-client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import MessageBubble from '@/components/whatsapp/MessageBubble';

interface Conversation {
  id: string;
  phone: string;
  contact_name: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  contact_id: string | null;
  whatsapp_id?: string;
}

interface Message {
  id: string;
  sender: string;
  content: string;
  message_type: string;
  media_url: string;
  created_at: string;
  whatsapp_msg_id?: string;
  reply_to_id?: string;
  reply_to_content?: string;
}

export default function WhatsAppInboxPage() {
  const { activeCompany } = useCompany();
  const empresaId = activeCompany?.id || '';

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgText, setMsgText] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [serverUrl, setServerUrl] = useState('');
  const [showCreateClient, setShowCreateClient] = useState(false);
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [newMsgForm, setNewMsgForm] = useState({ phone: '', name: '', message: '' });
  const [clientForm, setClientForm] = useState({ full_name: '', phone: '', email: '' });
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [sendingFile, setSendingFile] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!empresaId) return;
    loadConversations();
  }, [empresaId]);

  // Socket.IO connection
  useEffect(() => {
    if (!serverUrl) return;
    console.log('[WhatsApp Socket] Connecting to:', serverUrl);
    const socket = io(serverUrl, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[WhatsApp Socket] Connected! ID:', socket.id);
    });

    socket.on('connect_error', (err: any) => {
      console.error('[WhatsApp Socket] Connection error:', err?.message || err);
    });

    socket.on('disconnect', (reason: string) => {
      console.log('[WhatsApp Socket] Disconnected:', reason);
    });

    socket.onAny((eventName: string, ...args: any[]) => {
      console.log('[WhatsApp Socket] Event received:', eventName, args);
    });

    socket.on('nova_mensagem', async (data: any) => {
      console.log('[WhatsApp Socket] nova_mensagem data:', JSON.stringify(data));
      const phone = extractIncomingPhone(data);
      const content = data.body || data.message || '';
      if (!phone || phone.length < 8) {
        console.warn('[WhatsApp Socket] Ignoring message - invalid phone:', phone);
        return;
      }

      const whatsappId = extractWhatsappId(data);
      const msgType = data.type || 'chat';
      const hasMediaFlag = data.hasMedia || false;

      const { data: convId, error: rpcError } = await (supabase.rpc('find_or_create_conversation', {
        p_empresa_id: empresaId,
        p_phone: phone,
        p_client_name: data.name || data.pushname || phone,
        p_last_message: content || (hasMediaFlag ? getMsgTypeLabel(msgType) : ''),
        p_whatsapp_id: whatsappId || null,
      }) as any);

      if (convId) {
        const insertData: any = {
          conversation_id: convId,
          empresa_id: empresaId,
          sender: 'them',
          content,
          message_type: msgType,
          whatsapp_msg_id: data.id?._serialized || data.id || '',
        };

        await (supabase.from('whatsapp_messages').insert(insertData) as any);

        if (activeConv?.id === convId || (activeConv?.phone && normalizePhone(activeConv.phone) === phone)) {
          setMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            sender: 'them',
            content,
            message_type: msgType,
            media_url: '',
            created_at: new Date().toISOString(),
            whatsapp_msg_id: insertData.whatsapp_msg_id,
          }]);
        }

        const { data: updated } = await (supabase
          .from('whatsapp_conversations')
          .select('*')
          .eq('empresa_id', empresaId)
          .order('last_message_at', { ascending: false }) as any);
        if (updated) setConversations(updated);
      }

      toast.info(`Nova mensagem de ${data.name || phone}`);
    });

    return () => { socket.disconnect(); };
  }, [serverUrl, activeConv, empresaId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const normalizePhone = (phone: string) => phone?.replace(/\D/g, '') || '';
  const normalizePhoneForSend = (phone: string) => {
    const digits = normalizePhone(phone);
    if (!digits) return '';
    if (digits.startsWith('55')) return digits;
    if (digits.length === 10 || digits.length === 11) return `55${digits}`;
    return digits;
  };

  const getMsgTypeLabel = (type: string) => {
    switch (type) {
      case 'image': return '📷 Imagem';
      case 'video': return '🎥 Vídeo';
      case 'ptt': case 'audio': return '🎤 Áudio';
      case 'document': return '📎 Documento';
      case 'sticker': return '🏷️ Figurinha';
      default: return '';
    }
  };

  const extractIncomingPhone = (payload: any) => {
    const candidates = [
      payload?.number,
      payload?.phone,
      payload?.numero,
      payload?.from,
      payload?.chatId,
      typeof payload?.id === 'string' ? payload.id : payload?.id?.user,
    ];

    for (const candidate of candidates) {
      if (typeof candidate !== 'string') continue;
      const digits = normalizePhone(candidate);
      if (digits.length >= 8) return normalizePhoneForSend(digits);
    }

    return '';
  };

  const extractWhatsappId = (payload: any) => {
    if (typeof payload?.from === 'string' && payload.from.includes('@')) return payload.from;
    if (typeof payload?.id === 'string' && payload.id.includes('@')) return payload.id;
    if (typeof payload?.id?._serialized === 'string' && payload.id._serialized.includes('@')) return payload.id._serialized;

    const number = extractIncomingPhone(payload);
    return number ? `${number}@c.us` : null;
  };

  const loadConversations = async () => {
    if (!empresaId) return;
    try {
      const url = await getServerUrl(empresaId);
      setServerUrl(url);

      const { data: dbConvs } = await (supabase
        .from('whatsapp_conversations')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('last_message_at', { ascending: false }) as any);

      if (dbConvs?.length) {
        setConversations(dbConvs);
      }

      // Sync from server
      try {
        const chats = await fetchChats(url);
        if (Array.isArray(chats)) {
          const dbPhones = new Set((dbConvs || []).map((c: any) => normalizePhone(c.phone)));

          const newChats = chats.filter((chat: any) => {
            const chatId = extractWhatsappId(chat) || '';
            const phone = extractIncomingPhone(chat);
            if (typeof chatId === 'string' && chatId.includes('@g.us')) return false;
            return phone.length >= 8 && !dbPhones.has(normalizePhone(phone));
          });

          if (newChats.length > 0 && newChats.length < 200) {
            for (const chat of newChats) {
              const phone = extractIncomingPhone(chat);
              const name = chat.nome || chat.name || chat.pushname || phone;
              const whatsappId = extractWhatsappId(chat);

              await (supabase.rpc('find_or_create_conversation', {
                p_empresa_id: empresaId,
                p_phone: phone,
                p_client_name: name,
                p_last_message: '',
                p_last_message_at: chat.timestamp
                  ? new Date(chat.timestamp * 1000).toISOString()
                  : new Date().toISOString(),
                p_whatsapp_id: whatsappId,
              }) as any);
            }

            const { data: updated } = await (supabase
              .from('whatsapp_conversations')
              .select('*')
              .eq('empresa_id', empresaId)
              .order('last_message_at', { ascending: false }) as any);
            if (updated) setConversations(updated);
          }
        }
      } catch {
        // Server offline, use DB data
      }
    } catch (err) {
      console.error('Error loading conversations:', err);
    }
  };

  const openConversation = async (conv: Conversation) => {
    setActiveConv(conv);
    setLoading(true);
    setReplyTo(null);

    await (supabase.from('whatsapp_conversations').update({ unread_count: 0 }).eq('id', conv.id) as any);
    setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unread_count: 0 } : c));

    const { data: dbMsgs } = await (supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: true }) as any);

    if (dbMsgs?.length) {
      setMessages(dbMsgs);
    } else {
      // Fetch from server
      try {
        const queryId = conv.whatsapp_id || conv.phone;
        if (!queryId) throw new Error('No phone');
        const serverMsgs = await fetchMessages(serverUrl, queryId);
        if (Array.isArray(serverMsgs)) {
          const mapped = serverMsgs.map((m: any) => ({
            id: m.id || crypto.randomUUID(),
            sender: m.fromMe ? 'me' : 'them',
            content: m.body || '',
            message_type: m.type || 'chat',
            media_url: m.mediaUrl || '',
            created_at: m.timestamp ? new Date(m.timestamp * 1000).toISOString() : new Date().toISOString(),
            whatsapp_msg_id: typeof m.id === 'string' ? m.id : m.id?._serialized || '',
            reply_to_content: m.quotedMsg?.body || '',
          }));
          setMessages(mapped);

          const inserts = mapped.map((msg: any) => ({
            conversation_id: conv.id,
            empresa_id: empresaId,
            sender: msg.sender,
            content: msg.content,
            message_type: msg.message_type,
            media_url: msg.media_url,
            whatsapp_msg_id: msg.whatsapp_msg_id,
            reply_to_content: msg.reply_to_content || null,
          }));
          if (inserts.length > 0) {
            await (supabase.from('whatsapp_messages').insert(inserts) as any);
          }
        }
      } catch {
        setMessages([]);
      }
    }

    setLoading(false);
  };

  const handleSend = async () => {
    if (!msgText.trim() || !activeConv) return;
    const text = msgText.trim();
    setMsgText('');

    const newMsg: Message = {
      id: crypto.randomUUID(),
      sender: 'me',
      content: text,
      message_type: 'chat',
      media_url: '',
      created_at: new Date().toISOString(),
      reply_to_content: replyTo?.content || undefined,
      reply_to_id: replyTo?.id || undefined,
    };
    setMessages(prev => [...prev, newMsg]);

    const quotedMsgId = replyTo?.whatsapp_msg_id;
    setReplyTo(null);

    try {
      const targetId = activeConv.whatsapp_id || activeConv.phone;
      await sendMessage(serverUrl, targetId, text, quotedMsgId);

      await (supabase.from('whatsapp_messages').insert({
        conversation_id: activeConv.id,
        empresa_id: empresaId,
        sender: 'me',
        content: text,
        message_type: 'chat',
        reply_to_content: newMsg.reply_to_content || null,
        reply_to_id: newMsg.reply_to_id || null,
      }) as any);

      await (supabase.from('whatsapp_conversations').update({
        last_message: text,
        last_message_at: new Date().toISOString(),
      }).eq('id', activeConv.id) as any);

      setConversations(prev => prev.map(c =>
        c.id === activeConv.id ? { ...c, last_message: text, last_message_at: new Date().toISOString() } : c
      ));
    } catch (err) {
      console.error('Error sending message:', err);
      toast.error('Erro ao enviar mensagem. Verifique a conexão com o servidor.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeConv) return;

    setSendingFile(true);

    // Add optimistic message
    const newMsg: Message = {
      id: crypto.randomUUID(),
      sender: 'me',
      content: file.name,
      message_type: file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'audio' : 'document',
      media_url: URL.createObjectURL(file),
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, newMsg]);

    try {
      const targetId = activeConv.whatsapp_id || activeConv.phone;
      await sendMedia(serverUrl, targetId, file);

      // Upload to storage
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const ext = file.name.split('.').pop() || 'bin';
        const storagePath = `${empresaId}/${newMsg.id}.${ext}`;

        const binaryStr = atob(base64);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }

        const { error: uploadError } = await supabase.storage
          .from('whatsapp-media')
          .upload(storagePath, bytes, { contentType: file.type, upsert: true });

        let finalUrl = '';
        if (!uploadError) {
          const { data } = supabase.storage.from('whatsapp-media').getPublicUrl(storagePath);
          finalUrl = data.publicUrl;
        }

        await (supabase.from('whatsapp_messages').insert({
          conversation_id: activeConv.id,
          empresa_id: empresaId,
          sender: 'me',
          content: file.name,
          message_type: newMsg.message_type,
          media_url: finalUrl,
          media_type: file.type,
        }) as any);
      };
      reader.readAsDataURL(file);

      const label = getMsgTypeLabel(newMsg.message_type) || file.name;
      await (supabase.from('whatsapp_conversations').update({
        last_message: label,
        last_message_at: new Date().toISOString(),
      }).eq('id', activeConv.id) as any);

      toast.success('Arquivo enviado!');
    } catch (err) {
      console.error('Error sending file:', err);
      toast.error('Erro ao enviar arquivo.');
    }

    setSendingFile(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleNewMessage = async () => {
    if (!newMsgForm.phone.trim() || !newMsgForm.message.trim()) {
      toast.error('Telefone e mensagem são obrigatórios');
      return;
    }

    const phone = normalizePhoneForSend(newMsgForm.phone);
    if (phone.length < 8) {
      toast.error('Número de telefone inválido');
      return;
    }

    const messageText = newMsgForm.message.trim();
    const contactName = newMsgForm.name || phone;

    try {
      const { data: convId, error: rpcError } = await (supabase.rpc('find_or_create_conversation', {
        p_empresa_id: empresaId,
        p_phone: phone,
        p_client_name: contactName,
        p_last_message: messageText,
      }) as any);

      if (convId) {
        await (supabase.from('whatsapp_messages').insert({
          conversation_id: convId,
          empresa_id: empresaId,
          sender: 'me',
          content: messageText,
          message_type: 'chat',
        }) as any);
      }

      setShowNewMessage(false);
      setNewMsgForm({ phone: '', name: '', message: '' });

      const { data: updated } = await (supabase
        .from('whatsapp_conversations')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('last_message_at', { ascending: false }) as any);
      if (updated) {
        setConversations(updated);
        const newConv = updated.find((c: any) => normalizePhone(c.phone) === phone);
        if (newConv) openConversation(newConv);
      }

      try {
        await sendMessage(serverUrl, phone, messageText);
        toast.success('Mensagem enviada!');
      } catch (sendErr) {
        console.error('Error sending via server:', sendErr);
        toast.warning('Conversa criada, mas houve erro ao enviar pelo servidor. Tente reenviar.');
      }
    } catch (err) {
      console.error('Error creating conversation:', err);
      toast.error('Erro ao criar conversa.');
    }
  };

  const handleCreateClient = async () => {
    if (!clientForm.full_name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    const { data, error } = await (supabase.from('clients').insert({
      full_name: clientForm.full_name,
      phone: clientForm.phone,
      email: clientForm.email,
      empresa_id: empresaId,
    }).select().single() as any);

    if (error) {
      toast.error('Erro ao criar cliente');
      return;
    }

    await (supabase.from('whatsapp_contacts').insert({
      empresa_id: empresaId,
      client_id: data.id,
      name: clientForm.full_name,
      phone: clientForm.phone,
      email: clientForm.email,
    }) as any);

    if (activeConv) {
      const { data: contact } = await (supabase.from('whatsapp_contacts')
        .select('id')
        .eq('client_id', data.id)
        .eq('empresa_id', empresaId)
        .single() as any);

      if (contact) {
        await (supabase.from('whatsapp_conversations')
          .update({ contact_id: contact.id, contact_name: clientForm.full_name })
          .eq('id', activeConv.id) as any);

        setActiveConv(prev => prev ? { ...prev, contact_name: clientForm.full_name, contact_id: contact.id } : null);
        setConversations(prev => prev.map(c =>
          c.id === activeConv.id ? { ...c, contact_name: clientForm.full_name, contact_id: contact.id } : c
        ));
      }
    }

    toast.success('Cliente criado com sucesso!');
    setShowCreateClient(false);
  };

  const getDisplayName = (conv: Conversation) => conv.contact_name || conv.phone;

  const filteredConvs = conversations.filter(c => {
    if (!search) return true;
    const s = search.toLowerCase();
    const name = getDisplayName(c).toLowerCase();
    return name.includes(s) || c.phone?.includes(search);
  });

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      const now = new Date();
      if (d.toDateString() === now.toDateString()) return format(d, 'HH:mm');
      return format(d, 'dd/MM', { locale: ptBR });
    } catch { return ''; }
  };

  const getLastMsgPreview = (conv: Conversation) => {
    const msg = conv.last_message || '';
    if (!msg) return 'Sem mensagens';
    return msg;
  };

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-3.5rem)] bg-background">
        {/* Column 1: Conversations */}
        <div className="w-[340px] border-r flex flex-col bg-card shrink-0">
          <div className="p-3 border-b space-y-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar conversa..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              <Button
                size="icon"
                variant="outline"
                className="shrink-0 h-9 w-9"
                title="Nova mensagem"
                onClick={() => setShowNewMessage(true)}
              >
                <MessageSquarePlus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <ScrollArea className="flex-1">
            {filteredConvs.map((conv) => {
              const displayName = getDisplayName(conv);
              return (
                <div
                  key={conv.id}
                  onClick={() => openConversation(conv)}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors border-b border-border/30 ${activeConv?.id === conv.id ? 'bg-muted' : ''}`}
                >
                  <Avatar className="h-11 w-11 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                      {displayName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm truncate">{displayName}</span>
                      <span className="text-xs text-muted-foreground shrink-0">{formatTime(conv.last_message_at)}</span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-xs text-muted-foreground truncate pr-2">{getLastMsgPreview(conv)}</p>
                      {conv.unread_count > 0 && (
                        <Badge className="h-5 min-w-5 flex items-center justify-center rounded-full text-[10px] bg-primary text-primary-foreground shrink-0">
                          {conv.unread_count}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredConvs.length === 0 && (
              <div className="p-8 text-center text-muted-foreground text-sm">
                Nenhuma conversa encontrada
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Column 2: Chat */}
        <div className="flex-1 flex flex-col min-w-0">
          {activeConv ? (
            <>
              <div className="h-14 flex items-center gap-3 px-4 border-b bg-card shrink-0">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                    {getDisplayName(activeConv).slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{getDisplayName(activeConv)}</p>
                  <p className="text-xs text-muted-foreground">{activeConv.phone}</p>
                </div>
              </div>

              <ScrollArea className="flex-1 p-4">
                <div className="max-w-3xl mx-auto space-y-2">
                  {loading && <p className="text-center text-muted-foreground text-sm py-8">Carregando...</p>}
                  {messages.map((msg) => (
                    <MessageBubble
                      key={msg.id}
                      msg={msg}
                      serverUrl={serverUrl}
                      empresaId={empresaId}
                      onReply={(m) => setReplyTo(m as Message)}
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Reply preview bar */}
              {replyTo && (
                <div className="px-3 pt-2 border-t bg-muted/50 flex items-center gap-2">
                  <div className="flex-1 bg-card border-l-2 border-primary rounded px-3 py-1.5 min-w-0">
                    <p className="text-[11px] font-medium text-primary">
                      {replyTo.sender === 'me' ? 'Você' : getDisplayName(activeConv)}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {replyTo.content || getMsgTypeLabel(replyTo.message_type) || 'Mídia'}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" className="shrink-0 h-7 w-7" onClick={() => setReplyTo(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              <div className="p-3 border-t bg-card flex items-center gap-2 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={sendingFile}
                >
                  <Paperclip className="h-5 w-5 text-muted-foreground" />
                </Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar"
                  onChange={handleFileUpload}
                />
                <Input
                  placeholder="Digite uma mensagem..."
                  value={msgText}
                  onChange={(e) => setMsgText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  className="flex-1"
                />
                <Button onClick={handleSend} size="icon" className="shrink-0">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Send className="h-7 w-7" />
                </div>
                <p className="text-lg font-medium">WhatsApp Inbox</p>
                <p className="text-sm mt-1">Selecione uma conversa ou inicie uma nova</p>
                <Button className="mt-4 gap-2" onClick={() => setShowNewMessage(true)}>
                  <MessageSquarePlus className="h-4 w-4" />
                  Nova Mensagem
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Column 3: Contact info */}
        {activeConv && (
          <div className="w-[280px] border-l bg-card flex flex-col shrink-0">
            <div className="p-4 border-b">
              <h3 className="font-semibold text-sm">Informações do Contato</h3>
            </div>
            <div className="p-4 flex flex-col items-center">
              <Avatar className="h-20 w-20 mb-3">
                <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                  {getDisplayName(activeConv).slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <p className="font-semibold text-base">{getDisplayName(activeConv)}</p>

              <div className="w-full mt-4 space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{activeConv.phone}</span>
                </div>
              </div>

              {!activeConv.contact_id && (
                <Button
                  variant="outline"
                  className="w-full mt-6 gap-2"
                  onClick={() => {
                    setClientForm({
                      full_name: getDisplayName(activeConv),
                      phone: activeConv.phone,
                      email: '',
                    });
                    setShowCreateClient(true);
                  }}
                >
                  <UserPlus className="h-4 w-4" />
                  Criar Cliente
                </Button>
              )}
              {activeConv.contact_id && (
                <Badge variant="secondary" className="mt-4">
                  Cliente vinculado
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>

      {/* New Message Dialog */}
      <Dialog open={showNewMessage} onOpenChange={setShowNewMessage}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquarePlus className="h-5 w-5" />
              Nova Mensagem
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Telefone (com DDD e código do país)</Label>
              <Input
                value={newMsgForm.phone}
                onChange={(e) => setNewMsgForm(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="5548991234567"
              />
              <p className="text-xs text-muted-foreground mt-1">Ex: 5548991234567 (55 = Brasil, 48 = DDD)</p>
            </div>
            <div>
              <Label>Nome do contato (opcional)</Label>
              <Input
                value={newMsgForm.name}
                onChange={(e) => setNewMsgForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="João Silva"
              />
            </div>
            <div>
              <Label>Mensagem</Label>
              <Input
                value={newMsgForm.message}
                onChange={(e) => setNewMsgForm(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Olá! Tudo bem?"
                onKeyDown={(e) => e.key === 'Enter' && handleNewMessage()}
              />
            </div>
            <Button onClick={handleNewMessage} className="w-full gap-2">
              <Send className="h-4 w-4" />
              Enviar Mensagem
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Client Dialog */}
      <Dialog open={showCreateClient} onOpenChange={setShowCreateClient}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome completo</Label>
              <Input value={clientForm.full_name} onChange={(e) => setClientForm(prev => ({ ...prev, full_name: e.target.value }))} />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input value={clientForm.phone} onChange={(e) => setClientForm(prev => ({ ...prev, phone: e.target.value }))} />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={clientForm.email} onChange={(e) => setClientForm(prev => ({ ...prev, email: e.target.value }))} />
            </div>
            <Button onClick={handleCreateClient} className="w-full">Salvar Cliente</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
