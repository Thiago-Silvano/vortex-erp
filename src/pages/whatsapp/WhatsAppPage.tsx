import { useState, useEffect, useRef, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MessageSquare, Send, Paperclip, Search, User, Phone, ShoppingCart, UserPlus, ExternalLink, Reply, Trash2, ChevronDown, X, Check, CheckCheck } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate, useLocation } from 'react-router-dom';

interface Conversation {
  id: string;
  phone: string;
  client_name: string;
  client_id: string | null;
  assigned_user_name: string;
  status: string;
  priority: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
}

interface Message {
  id: string;
  sender_type: string;
  sender_name: string;
  content: string;
  message_type: string;
  media_url: string | null;
  media_filename: string | null;
  media_mimetype: string | null;
  delivery_status: string;
  created_at: string;
  reply_to_message_id: string | null;
}

const statusLabels: Record<string, string> = {
  new_lead: 'Novo Lead',
  contato_inicial: 'Contato Inicial',
  proposta_enviada: 'Proposta Enviada',
  negociacao: 'Negociação',
  in_progress: 'Em Atendimento',
  waiting_client: 'Aguardando Cliente',
  waiting_quote: 'Aguardando Orçamento',
  venda_concluida: 'Venda Concluída',
  perdido: 'Perdido',
  finished: 'Finalizado',
};

const statusColors: Record<string, string> = {
  new_lead: 'bg-blue-500',
  contato_inicial: 'bg-cyan-500',
  proposta_enviada: 'bg-purple-500',
  negociacao: 'bg-amber-500',
  in_progress: 'bg-green-500',
  waiting_client: 'bg-yellow-500',
  waiting_quote: 'bg-orange-500',
  venda_concluida: 'bg-emerald-600',
  perdido: 'bg-red-500',
  finished: 'bg-muted-foreground',
};

const priorityLabels: Record<string, string> = {
  low: 'Baixa',
  normal: 'Normal',
  high: 'Alta',
};

export default function WhatsAppPage() {
  const { activeCompany } = useCompany();
  const navigate = useNavigate();
  const location = useLocation();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [search, setSearch] = useState('');
  const [quickReplies, setQuickReplies] = useState<{ shortcut: string; content: string }[]>([]);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email || ''));
  }, []);

  const fetchConversations = useCallback(async () => {
    let q = supabase.from('whatsapp_conversations').select('*').order('last_message_at', { ascending: false });
    if (activeCompany?.id) q = q.eq('empresa_id', activeCompany.id);
    const { data } = await q;
    if (data) {
      setConversations(data as Conversation[]);
      return data as Conversation[];
    }
    return [];
  }, [activeCompany?.id]);

  const markAsRead = useCallback(async (convId: string) => {
    // Update read_at on all unread client messages
    await supabase.from('whatsapp_messages')
      .update({ read_at: new Date().toISOString() } as any)
      .eq('conversation_id', convId)
      .eq('sender_type', 'client')
      .is('read_at', null);
    // Reset unread_count on the conversation
    await supabase.from('whatsapp_conversations')
      .update({ unread_count: 0 })
      .eq('id', convId);
  }, []);

  const fetchMessages = useCallback(async (convId: string) => {
    const { data } = await supabase.from('whatsapp_messages').select('*').eq('conversation_id', convId).order('created_at');
    if (data) setMessages(data as Message[]);
  }, []);

  const fetchQuickReplies = useCallback(async () => {
    let q = supabase.from('whatsapp_quick_replies').select('shortcut, content');
    if (activeCompany?.id) q = q.eq('empresa_id', activeCompany.id);
    const { data } = await q;
    if (data) setQuickReplies(data);
  }, [activeCompany?.id]);

  useEffect(() => { fetchConversations(); fetchQuickReplies(); setSelectedConv(null); setMessages([]); }, [fetchConversations, fetchQuickReplies]);

  useEffect(() => {
    const state = location.state as { openConversationId?: string } | null;
    if (state?.openConversationId) {
      fetchConversations().then(convs => {
        const conv = convs.find(c => c.id === state.openConversationId);
        if (conv) setSelectedConv(conv);
      });
      window.history.replaceState({}, document.title);
    }
  }, [location.state, fetchConversations]);

  useEffect(() => {
    if (selectedConv) {
      fetchMessages(selectedConv.id);
      markAsRead(selectedConv.id);
    }
  }, [selectedConv?.id, fetchMessages, markAsRead]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Realtime subscription - single source of truth for live updates
  useEffect(() => {
    if (!activeCompany?.id) return;

    // Debounce helpers to prevent multiple rapid fetches
    let convTimer: ReturnType<typeof setTimeout> | null = null;
    let msgTimer: ReturnType<typeof setTimeout> | null = null;
    const debouncedFetchConvs = () => {
      if (convTimer) clearTimeout(convTimer);
      convTimer = setTimeout(() => fetchConversations(), 300);
    };
    const debouncedFetchMsgs = (convId: string) => {
      if (msgTimer) clearTimeout(msgTimer);
      msgTimer = setTimeout(() => { fetchMessages(convId); markAsRead(convId); }, 300);
    };

    const channel = supabase
      .channel(`whatsapp-realtime-${activeCompany.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'whatsapp_messages' }, (payload) => {
        const newMsg = payload.new as any;
        if (selectedConv && newMsg?.conversation_id === selectedConv.id) {
          debouncedFetchMsgs(selectedConv.id);
        }
        debouncedFetchConvs();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'whatsapp_conversations', filter: `empresa_id=eq.${activeCompany.id}` }, () => {
        debouncedFetchConvs();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'whatsapp_conversations', filter: `empresa_id=eq.${activeCompany.id}` }, () => {
        debouncedFetchConvs();
      })
      .subscribe();
    return () => {
      if (convTimer) clearTimeout(convTimer);
      if (msgTimer) clearTimeout(msgTimer);
      supabase.removeChannel(channel);
    };
  }, [selectedConv?.id, activeCompany?.id, fetchConversations, fetchMessages, markAsRead]);

  // Single fallback polling interval (longer, just as safety net)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchConversations();
      if (selectedConv) fetchMessages(selectedConv.id);
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchConversations, fetchMessages, selectedConv?.id]);

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedConv) return;
    const senderName = userEmail.split('@')[0] || 'Agente';

    try {
      await supabase.functions.invoke('whatsapp-send', {
        body: {
          conversation_id: selectedConv.id,
          content: newMessage.trim(),
          message_type: 'text',
          sender_name: senderName,
          empresa_id: activeCompany?.id,
          reply_to_message_id: replyingTo?.id || null,
        },
      });
    } catch {
      await supabase.from('whatsapp_messages').insert({
        conversation_id: selectedConv.id,
        sender_type: 'agent',
        sender_name: senderName,
        content: newMessage.trim(),
        message_type: 'text',
        reply_to_message_id: replyingTo?.id || null,
      });
      await supabase.from('whatsapp_conversations').update({
        last_message: newMessage.trim(),
        last_message_at: new Date().toISOString(),
      }).eq('id', selectedConv.id);
    }

    setNewMessage('');
    setReplyingTo(null);
    fetchMessages(selectedConv.id);
    fetchConversations();
  };

  const handleMessageChange = (val: string) => {
    setNewMessage(val);
    setShowQuickReplies(val.startsWith('/'));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConv || !activeCompany?.id) return;

    const senderName = userEmail.split('@')[0] || 'Agente';
    const fileExt = file.name.split('.').pop();
    const filePath = `${activeCompany.id}/${selectedConv.id}/${Date.now()}.${fileExt}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('whatsapp-media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('whatsapp-media')
        .getPublicUrl(filePath);

      const mediaUrl = urlData.publicUrl;
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      const isAudio = file.type.startsWith('audio/');
      const messageType = isImage ? 'image' : isVideo ? 'video' : isAudio ? 'audio' : 'document';

      await supabase.functions.invoke('whatsapp-send', {
        body: {
          conversation_id: selectedConv.id,
          content: file.name,
          message_type: messageType,
          media_url: mediaUrl,
          media_filename: file.name,
          media_mimetype: file.type,
          sender_name: senderName,
          empresa_id: activeCompany.id,
        },
      });

      fetchMessages(selectedConv.id);
      fetchConversations();
      toast.success('Arquivo enviado!');
    } catch (err) {
      console.error('File upload error:', err);
      toast.error('Erro ao enviar arquivo');
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const applyQuickReply = (content: string) => {
    setNewMessage(content);
    setShowQuickReplies(false);
  };

  const updateConvStatus = async (status: string) => {
    if (!selectedConv) return;
    await supabase.from('whatsapp_conversations').update({ status }).eq('id', selectedConv.id);
    setSelectedConv({ ...selectedConv, status });
    fetchConversations();
  };

  const updateConvPriority = async (priority: string) => {
    if (!selectedConv) return;
    await supabase.from('whatsapp_conversations').update({ priority }).eq('id', selectedConv.id);
    setSelectedConv({ ...selectedConv, priority });
    fetchConversations();
  };

  const handleCreateClient = async () => {
    if (!selectedConv || !activeCompany?.id) return;
    try {
      const { error } = await supabase.from('clients').insert({
        full_name: selectedConv.client_name || 'Cliente WhatsApp',
        phone: selectedConv.phone,
        empresa_id: activeCompany.id,
        cpf: '',
      });
      if (error) throw error;
      toast.success('Cliente criado com sucesso!');
    } catch (err: any) {
      toast.error('Erro ao criar cliente: ' + (err.message || ''));
    }
  };

  const handleDeleteMessage = async (msgId: string, forEveryone: boolean) => {
    if (forEveryone) {
      // Mark as deleted for everyone
      await supabase.from('whatsapp_messages').update({
        content: '🚫 Mensagem apagada',
        media_url: null,
        message_type: 'text',
      }).eq('id', msgId);
    } else {
      // Delete locally only
      await supabase.from('whatsapp_messages').delete().eq('id', msgId);
    }
    if (selectedConv) fetchMessages(selectedConv.id);
  };

  const scrollToMessage = (msgId: string) => {
    const el = document.getElementById(`msg-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('animate-pulse');
      setTimeout(() => el.classList.remove('animate-pulse'), 1500);
    }
  };

  const getReplyPreview = (msgId: string | null): Message | undefined => {
    if (!msgId) return undefined;
    return messages.find(m => m.id === msgId);
  };

  const getWaLink = (phone: string) => `https://wa.me/${phone.replace(/\D/g, '')}`;

  const filteredConversations = conversations.filter(c =>
    c.client_name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search) ||
    (c.last_message || '').toLowerCase().includes(search.toLowerCase())
  );

  const filteredQuickReplies = quickReplies.filter(qr =>
    qr.shortcut.toLowerCase().includes(newMessage.toLowerCase().replace('/', ''))
  );

  const DeliveryIcon = ({ status }: { status: string }) => {
    if (status === 'read') return <CheckCheck className="h-3 w-3 text-blue-500" />;
    if (status === 'delivered') return <CheckCheck className="h-3 w-3 opacity-60" />;
    if (status === 'sent') return <Check className="h-3 w-3 opacity-60" />;
    if (status === 'failed') return <span className="text-[10px] text-red-500">!</span>;
    return <Check className="h-3 w-3 opacity-40" />;
  };

  const renderMedia = (msg: Message) => {
    if (!msg.media_url) return null;
    const type = msg.message_type;

    if (type === 'image' || type === 'sticker') {
      return (
        <img
          src={msg.media_url}
          alt={type === 'sticker' ? 'Figurinha' : 'Imagem'}
          className={`rounded cursor-pointer mb-1 ${type === 'sticker' ? 'max-w-[150px] max-h-[150px]' : 'max-w-full max-h-64'}`}
          loading="lazy"
          onClick={() => type === 'image' && setImagePreview(msg.media_url)}
        />
      );
    }
    if (type === 'video') {
      return (
        <video controls className="rounded max-w-full max-h-64 mb-1" preload="metadata">
          <source src={msg.media_url} />
        </video>
      );
    }
    if (type === 'audio' || type === 'ptt') {
      return (
        <audio controls className="mb-1 max-w-full min-w-[200px]" preload="metadata">
          <source src={msg.media_url} />
        </audio>
      );
    }
    if (type === 'document') {
      return (
        <a href={msg.media_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 rounded mb-1 text-xs hover:underline" style={{ background: 'rgba(0,0,0,0.05)' }}>
          📄 {msg.media_filename || 'Documento'}
          <span className="ml-auto text-[10px] opacity-60">Baixar</span>
        </a>
      );
    }
    return null;
  };

  const isMediaOnlyContent = (msg: Message) => {
    if (!msg.media_url) return false;
    const labels = ['📷 Imagem', '🎥 Vídeo', '🎵 Áudio', '🎤 Áudio', '🏷️ Figurinha', '📄 Documento', '📎 Arquivo'];
    return labels.includes(msg.content);
  };

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
        {/* Column 1: Conversation List */}
        <div className="w-80 border-r flex flex-col" style={{ background: '#fff' }}>
          <div className="p-3 border-b space-y-2" style={{ background: '#f0f2f5' }}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <MessageSquare className="h-5 w-5" /> Conversas
              </h2>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-8 h-8 text-sm rounded-full" placeholder="Buscar conversa..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>

          <ScrollArea className="flex-1">
            {filteredConversations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhuma conversa</p>
            ) : filteredConversations.map(conv => (
              <div
                key={conv.id}
                className={`px-3 py-3 border-b cursor-pointer hover:bg-gray-50 transition-colors ${selectedConv?.id === conv.id ? 'bg-gray-100' : ''}`}
                onClick={() => setSelectedConv(conv)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center shrink-0">
                      <User className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm truncate" style={{ color: '#111b21' }}>
                          {conv.client_name || 'Cliente desconhecido'}
                        </span>
                        <span className="text-[11px] shrink-0 ml-2" style={{ color: conv.unread_count > 0 ? '#25d366' : '#667781' }}>
                          {conv.last_message_at ? format(new Date(conv.last_message_at), 'HH:mm', { locale: ptBR }) : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs truncate flex-1 min-w-0" style={{ color: conv.unread_count > 0 ? '#111b21' : '#667781', fontWeight: conv.unread_count > 0 ? 500 : 400 }}>{conv.last_message}</p>
                        {conv.unread_count > 0 && (
                          <span
                            className="inline-flex items-center justify-center rounded-full text-[11px] font-bold shrink-0"
                            style={{
                              background: '#25d366',
                              color: '#fff',
                              minWidth: '20px',
                              height: '20px',
                              padding: '0 5px',
                              lineHeight: '20px',
                            }}
                          >
                            {conv.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </ScrollArea>
        </div>

        {/* Column 2: Chat Area */}
        <div className="flex-1 flex flex-col min-h-0">
          {!selectedConv ? (
            <div className="flex-1 flex items-center justify-center" style={{ background: '#f0f2f5' }}>
              <div className="text-center space-y-2">
                <MessageSquare className="h-12 w-12 mx-auto opacity-30" />
                <p className="text-sm" style={{ color: '#667781' }}>Selecione uma conversa para começar</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="px-4 py-2 border-b flex items-center justify-between" style={{ background: '#f0f2f5' }}>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                    <User className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm" style={{ color: '#111b21' }}>{selectedConv.client_name || 'Cliente desconhecido'}</h3>
                    <p className="text-xs" style={{ color: '#667781' }}>{selectedConv.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={selectedConv.status} onValueChange={updateConvStatus}>
                    <SelectTrigger className="h-8 text-xs w-44 border-none bg-white/80"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusLabels).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Messages area */}
              <div className="flex-1 overflow-y-auto" style={{ background: '#efeae2' }}>
                {/* WhatsApp wallpaper overlay */}
                <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'200\' height=\'200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cdefs%3E%3Cpattern id=\'a\' patternUnits=\'userSpaceOnUse\' width=\'40\' height=\'40\'%3E%3Cpath d=\'M0 20h40M20 0v40\' fill=\'none\' stroke=\'%23000\' stroke-width=\'.5\'/%3E%3C/pattern%3E%3C/defs%3E%3Crect fill=\'url(%23a)\' width=\'200\' height=\'200\'/%3E%3C/svg%3E")', pointerEvents: 'none' }} />
                <div className="relative space-y-1 max-w-3xl mx-auto px-4 py-3">
                  {messages.map(msg => {
                    const isAgent = msg.sender_type === 'agent';
                    const repliedMsg = getReplyPreview(msg.reply_to_message_id);

                    return (
                      <div key={msg.id} id={`msg-${msg.id}`} className={`flex ${isAgent ? 'justify-end' : 'justify-start'}`}>
                        <div className="relative group max-w-[75%]">
                          {/* Message action dropdown */}
                          <div className={`absolute top-1 ${isAgent ? 'left-0 -translate-x-full pr-1' : 'right-0 translate-x-full pl-1'} opacity-0 group-hover:opacity-100 transition-opacity z-10`}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="h-6 w-6 rounded-full flex items-center justify-center hover:bg-black/10">
                                  <ChevronDown className="h-4 w-4" style={{ color: '#667781' }} />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align={isAgent ? 'end' : 'start'} className="min-w-[160px]">
                                <DropdownMenuItem onClick={() => setReplyingTo(msg)}>
                                  <Reply className="h-4 w-4 mr-2" /> Responder
                                </DropdownMenuItem>
                                {isAgent && (
                                  <>
                                    <DropdownMenuItem onClick={() => handleDeleteMessage(msg.id, false)}>
                                      <Trash2 className="h-4 w-4 mr-2" /> Apagar para mim
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDeleteMessage(msg.id, true)} className="text-red-600">
                                      <Trash2 className="h-4 w-4 mr-2" /> Apagar para todos
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          <div
                            className="rounded-lg px-2.5 py-1.5 shadow-sm relative"
                            style={{
                              background: isAgent ? '#d9fdd3' : '#ffffff',
                              color: '#111b21',
                            }}
                          >
                            {/* Bubble tail */}
                            <div
                              className="absolute top-0 w-2 h-3"
                              style={{
                                [isAgent ? 'right' : 'left']: '-6px',
                                borderTop: `6px solid ${isAgent ? '#d9fdd3' : '#ffffff'}`,
                                [isAgent ? 'borderRight' : 'borderLeft']: '6px solid transparent',
                              }}
                            />

                            {/* Agent name for agent messages */}
                            {isAgent && msg.sender_name && (
                              <p className="text-[11px] font-semibold mb-0.5" style={{ color: '#1fa855' }}>
                                {msg.sender_name}
                              </p>
                            )}

                            {/* Reply preview */}
                            {repliedMsg && (
                              <div
                                className="rounded px-2 py-1 mb-1 cursor-pointer border-l-4"
                                style={{
                                  background: isAgent ? '#d1f4cc' : '#f5f6f6',
                                  borderLeftColor: repliedMsg.sender_type === 'agent' ? '#53bdeb' : '#06cf9c',
                                }}
                                onClick={() => scrollToMessage(repliedMsg.id)}
                              >
                                <p className="text-[11px] font-semibold" style={{ color: repliedMsg.sender_type === 'agent' ? '#53bdeb' : '#06cf9c' }}>
                                  {repliedMsg.sender_type === 'agent' ? repliedMsg.sender_name : (selectedConv?.client_name || 'Cliente')}
                                </p>
                                <p className="text-[11px] truncate" style={{ color: '#667781' }}>
                                  {repliedMsg.content?.substring(0, 80) || '📎 Mídia'}
                                </p>
                              </div>
                            )}

                            {/* Media */}
                            {renderMedia(msg)}

                            {/* Text */}
                            {msg.content && !isMediaOnlyContent(msg) && (
                              <p className="text-[13px] whitespace-pre-wrap leading-[19px]">{msg.content}</p>
                            )}

                            {/* Time + delivery status */}
                            <div className="flex items-center justify-end gap-1 -mb-0.5 mt-0.5">
                              <span className="text-[11px]" style={{ color: '#667781' }}>
                                {format(new Date(msg.created_at), 'HH:mm')}
                              </span>
                              {isAgent && <DeliveryIcon status={msg.delivery_status} />}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Reply preview bar */}
              {replyingTo && (
                <div className="px-4 py-2 border-t flex items-center gap-3" style={{ background: '#f0f2f5' }}>
                  <div className="flex-1 rounded px-3 py-2 border-l-4" style={{ background: '#fff', borderLeftColor: '#25d366' }}>
                    <p className="text-[11px] font-semibold" style={{ color: '#06cf9c' }}>
                      {replyingTo.sender_type === 'agent' ? replyingTo.sender_name : (selectedConv?.client_name || 'Cliente')}
                    </p>
                    <p className="text-xs truncate" style={{ color: '#667781' }}>
                      {replyingTo.content?.substring(0, 100) || '📎 Mídia'}
                    </p>
                  </div>
                  <button onClick={() => setReplyingTo(null)} className="shrink-0">
                    <X className="h-5 w-5" style={{ color: '#667781' }} />
                  </button>
                </div>
              )}

              {/* Quick replies dropdown */}
              {showQuickReplies && filteredQuickReplies.length > 0 && (
                <div className="border-t max-h-40 overflow-y-auto" style={{ background: '#f0f2f5' }}>
                  {filteredQuickReplies.map(qr => (
                    <div key={qr.shortcut} className="px-4 py-2 hover:bg-gray-200 cursor-pointer text-sm" onClick={() => applyQuickReply(qr.content)}>
                      <span className="font-mono" style={{ color: '#25d366' }}>/{qr.shortcut}</span>
                      <span className="ml-2 truncate" style={{ color: '#667781' }}>{qr.content.substring(0, 60)}...</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Message input */}
              <div className="px-4 py-2 flex items-center gap-2" style={{ background: '#f0f2f5' }}>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                />
                <button className="shrink-0 p-2 rounded-full hover:bg-gray-200" title="Anexar arquivo" onClick={() => fileInputRef.current?.click()}>
                  <Paperclip className="h-5 w-5" style={{ color: '#54656f' }} />
                </button>
                <Input
                  value={newMessage}
                  onChange={e => handleMessageChange(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Digite uma mensagem..."
                  className="flex-1 rounded-lg border-none text-sm"
                  style={{ background: '#fff', color: '#111b21' }}
                />
                <button className="shrink-0 p-2 rounded-full hover:bg-gray-200" onClick={handleSend} disabled={!newMessage.trim()}>
                  <Send className="h-5 w-5" style={{ color: newMessage.trim() ? '#25d366' : '#8696a0' }} />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Column 3: CRM Panel */}
        {selectedConv && (
          <div className="w-72 border-l p-4 space-y-4 hidden lg:block overflow-y-auto" style={{ background: '#f7f8fa' }}>
            <div className="text-center space-y-2">
              <div className="h-16 w-16 rounded-full bg-gray-300 flex items-center justify-center mx-auto">
                <User className="h-8 w-8 text-white" />
              </div>
              <h3 className="font-semibold" style={{ color: '#111b21' }}>{selectedConv.client_name || 'Desconhecido'}</h3>
              <p className="text-xs flex items-center justify-center gap-1" style={{ color: '#667781' }}>
                <Phone className="h-3 w-3" /> {selectedConv.phone}
              </p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <span className="text-xs font-medium" style={{ color: '#667781' }}>Status do Lead</span>
                <Select value={selectedConv.status} onValueChange={updateConvStatus}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span style={{ color: '#667781' }}>Responsável</span>
                <span className="text-xs" style={{ color: '#111b21' }}>{selectedConv.assigned_user_name || '—'}</span>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-medium" style={{ color: '#667781' }}>Prioridade</span>
                <Select value={selectedConv.priority} onValueChange={updateConvPriority}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(priorityLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t">
              <p className="text-xs font-medium mb-2" style={{ color: '#667781' }}>Ações Rápidas</p>

              {!selectedConv.client_id && (
                <Button variant="outline" size="sm" className="w-full text-xs" onClick={handleCreateClient}>
                  <UserPlus className="h-3 w-3 mr-1" /> Criar Cliente
                </Button>
              )}

              <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => navigate('/sales/new', { state: { quoteData: { clientName: selectedConv.client_name } } })}>
                <ShoppingCart className="h-3 w-3 mr-1" /> Criar Venda
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={() => window.open(getWaLink(selectedConv.phone), '_blank')}
              >
                <ExternalLink className="h-3 w-3 mr-1" /> Abrir no WhatsApp Web
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Image preview modal */}
      {imagePreview && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center" onClick={() => setImagePreview(null)}>
          <button className="absolute top-4 right-4 text-white" onClick={() => setImagePreview(null)}>
            <X className="h-8 w-8" />
          </button>
          <img src={imagePreview} alt="Preview" className="max-w-[90vw] max-h-[90vh] object-contain rounded" />
        </div>
      )}
    </AppLayout>
  );
}
