import AppLayout from '@/components/AppLayout';
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Send, Paperclip, UserPlus, Phone, MessageSquarePlus, X, Smile, Mic, ArrowLeft, MoreVertical, Archive, BellOff, Pin, MailOpen, Heart, Tag, Trash2, LogOut, ChevronDown, Check, Link2, Star, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { sendMessage, sendMedia, getServerUrl, connectSession, getProfilePic } from '@/lib/whatsappApi';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import MessageBubble from '@/components/whatsapp/MessageBubble';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';

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
  const navigate = useNavigate();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgText, setMsgText] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [serverUrl, setServerUrl] = useState('');
  const [showCrmLink, setShowCrmLink] = useState(false);
  const [crmStep, setCrmStep] = useState<'ask' | 'select' | 'confirm_phone'>('ask');
  const [crmClients, setCrmClients] = useState<any[]>([]);
  const [crmSearch, setCrmSearch] = useState('');
  const [crmSelectedClient, setCrmSelectedClient] = useState<any>(null);
  const [crmConv, setCrmConv] = useState<Conversation | null>(null);
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [newMsgForm, setNewMsgForm] = useState({ phone: '', name: '', message: '' });
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [sendingFile, setSendingFile] = useState(false);
  const [initialScroll, setInitialScroll] = useState(false);
  const [agentName, setAgentName] = useState('');
  const [profilePics, setProfilePics] = useState<Record<string, string | null>>({});
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch current user display name
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        const displayName = data.user.user_metadata?.display_name || '';
        const name = displayName || (data.user.email?.split('@')[0] || '').replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        setAgentName(name);
      }
    });
  }, []);

  useEffect(() => {
    if (!empresaId) return;
    loadConversations();
  }, [empresaId]);

  // Fetch profile pictures via proxy to avoid CORS
  useEffect(() => {
    if (!serverUrl || !conversations.length || serverUrl.includes('localhost')) return;
    conversations.forEach((conv) => {
      const phone = conv.phone?.replace(/\D/g, '') || '';
      if (!phone || profilePics[phone] !== undefined) return;
      setProfilePics(prev => ({ ...prev, [phone]: null }));
      getProfilePic(serverUrl, empresaId, phone).then(async (url) => {
        if (!url) return;
        try {
          // Proxy the WhatsApp profile pic URL to get a data URL (avoids CORS)
          const { data } = await supabase.functions.invoke('proxy-image', { body: { url } });
          if (data?.dataUrl) {
            setProfilePics(prev => ({ ...prev, [phone]: data.dataUrl }));
          } else {
            setProfilePics(prev => ({ ...prev, [phone]: url }));
          }
        } catch {
          setProfilePics(prev => ({ ...prev, [phone]: url }));
        }
      });
    });
  }, [conversations, serverUrl, empresaId]);

  // Realtime
  useEffect(() => {
    if (!empresaId) return;
    const channel = supabase
      .channel(`whatsapp-realtime-${empresaId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'whatsapp_messages', filter: `empresa_id=eq.${empresaId}` }, (payload: any) => {
        const newRow = payload.new;
        if (newRow.sender !== 'them') return;
        if (activeConv?.id === newRow.conversation_id) {
          setMessages(prev => {
            if (prev.some(m => m.id === newRow.id)) return prev;
            return [...prev, {
              id: newRow.id, sender: newRow.sender, content: newRow.content || '',
              message_type: newRow.message_type || 'chat', media_url: newRow.media_url || '',
              created_at: newRow.created_at, whatsapp_msg_id: newRow.whatsapp_msg_id || '',
            }];
          });
        }
        toast.info('Nova mensagem recebida');
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_conversations', filter: `empresa_id=eq.${empresaId}` }, (payload: any) => {
        const row = payload.new;
        if (payload.eventType === 'INSERT') {
          setConversations(prev => prev.some(c => c.id === row.id) ? prev : [row, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setConversations(prev => prev.map(c => c.id === row.id ? { ...c, ...row } : c).sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()));
        } else if (payload.eventType === 'DELETE') {
          setConversations(prev => prev.filter(c => c.id !== payload.old?.id));
        }
      })
      .subscribe();
    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [empresaId, activeConv]);

  useEffect(() => {
    if (!messages.length) return;
    // On initial load (opening conversation), scroll instantly without animation
    if (!initialScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'instant' as ScrollBehavior });
      setInitialScroll(true);
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
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

  const loadConversations = async () => {
    if (!empresaId) return;
    try {
      const url = await getServerUrl(empresaId);
      setServerUrl(url);
      const { data: dbConvs } = await (supabase.from('whatsapp_conversations').select('*').eq('empresa_id', empresaId).order('last_message_at', { ascending: false }) as any);
      if (dbConvs?.length) setConversations(dbConvs);
      try { await connectSession(url, empresaId); } catch {}
    } catch (err) { console.error('Error loading conversations:', err); }
  };

  const openConversation = async (conv: Conversation) => {
    setActiveConv(conv);
    setInitialScroll(false);
    setLoading(true);
    setReplyTo(null);
    await (supabase.from('whatsapp_conversations').update({ unread_count: 0 }).eq('id', conv.id) as any);
    setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unread_count: 0 } : c));
    const { data: dbMsgs } = await (supabase.from('whatsapp_messages').select('*').eq('conversation_id', conv.id).order('created_at', { ascending: true }) as any);
    setMessages(dbMsgs || []);
    setLoading(false);
  };

  const handleSend = async () => {
    if (!msgText.trim() || !activeConv) return;
    const text = msgText.trim();
    setMsgText('');
    const newMsg: Message = {
      id: crypto.randomUUID(), sender: 'me', content: text, message_type: 'chat',
      media_url: '', created_at: new Date().toISOString(),
      reply_to_content: replyTo?.content || undefined, reply_to_id: replyTo?.id || undefined,
    };
    setMessages(prev => [...prev, newMsg]);
    const quotedMsgId = replyTo?.whatsapp_msg_id;
    setReplyTo(null);
    try {
      const targetId = activeConv.whatsapp_id || activeConv.phone;
      const whatsappText = agentName ? `*${agentName}:*\n${text}` : text;
      await sendMessage(serverUrl, empresaId, targetId, whatsappText);
      await (supabase.from('whatsapp_messages').insert({ conversation_id: activeConv.id, empresa_id: empresaId, sender: 'me', content: text, message_type: 'chat', reply_to_content: newMsg.reply_to_content || null, reply_to_id: newMsg.reply_to_id || null }) as any);
      await (supabase.from('whatsapp_conversations').update({ last_message: text, last_message_at: new Date().toISOString() }).eq('id', activeConv.id) as any);
      setConversations(prev => prev.map(c => c.id === activeConv.id ? { ...c, last_message: text, last_message_at: new Date().toISOString() } : c));
    } catch (err) {
      console.error('Error sending message:', err);
      toast.error('Erro ao enviar mensagem.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeConv) return;
    setSendingFile(true);
    const newMsg: Message = {
      id: crypto.randomUUID(), sender: 'me', content: file.name,
      message_type: file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'audio' : 'document',
      media_url: URL.createObjectURL(file), created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, newMsg]);
    try {
      const targetId = activeConv.whatsapp_id || activeConv.phone;
      await sendMedia(serverUrl, empresaId, targetId, file);
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const ext = file.name.split('.').pop() || 'bin';
        const storagePath = `${empresaId}/${newMsg.id}.${ext}`;
        const binaryStr = atob(base64);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
        const { error: uploadError } = await supabase.storage.from('whatsapp-media').upload(storagePath, bytes, { contentType: file.type, upsert: true });
        let finalUrl = '';
        if (!uploadError) { const { data } = supabase.storage.from('whatsapp-media').getPublicUrl(storagePath); finalUrl = data.publicUrl; }
        await (supabase.from('whatsapp_messages').insert({ conversation_id: activeConv.id, empresa_id: empresaId, sender: 'me', content: file.name, message_type: newMsg.message_type, media_url: finalUrl, media_type: file.type }) as any);
      };
      reader.readAsDataURL(file);
      const label = getMsgTypeLabel(newMsg.message_type) || file.name;
      await (supabase.from('whatsapp_conversations').update({ last_message: label, last_message_at: new Date().toISOString() }).eq('id', activeConv.id) as any);
      toast.success('Arquivo enviado!');
    } catch (err) {
      console.error('Error sending file:', err);
      toast.error('Erro ao enviar arquivo.');
    }
    setSendingFile(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleNewMessage = async () => {
    if (!newMsgForm.phone.trim() || !newMsgForm.message.trim()) { toast.error('Telefone e mensagem são obrigatórios'); return; }
    const phone = normalizePhoneForSend(newMsgForm.phone);
    if (phone.length < 8) { toast.error('Número de telefone inválido'); return; }
    const messageText = newMsgForm.message.trim();
    const contactName = newMsgForm.name || phone;
    try {
      const { data: convId } = await (supabase.rpc('find_or_create_conversation', { p_empresa_id: empresaId, p_phone: phone, p_client_name: contactName, p_last_message: messageText }) as any);
      if (convId) await (supabase.from('whatsapp_messages').insert({ conversation_id: convId, empresa_id: empresaId, sender: 'me', content: messageText, message_type: 'chat' }) as any);
      setShowNewMessage(false);
      setNewMsgForm({ phone: '', name: '', message: '' });
      const { data: updated } = await (supabase.from('whatsapp_conversations').select('*').eq('empresa_id', empresaId).order('last_message_at', { ascending: false }) as any);
      if (updated) { setConversations(updated); const newConv = updated.find((c: any) => normalizePhone(c.phone) === phone); if (newConv) openConversation(newConv); }
      try { await sendMessage(serverUrl, empresaId, phone, messageText); toast.success('Mensagem enviada!'); } catch { toast.warning('Conversa criada, mas houve erro ao enviar.'); }
    } catch (err) { console.error('Error:', err); toast.error('Erro ao criar conversa.'); }
  };

  const openCrmLinkDialog = async (conv: Conversation) => {
    setCrmConv(conv);
    setCrmStep('ask');
    setCrmSearch('');
    setCrmSelectedClient(null);
    setShowCrmLink(true);
    // Pre-load clients
    const { data } = await (supabase.from('clients').select('id, full_name, phone, email, cpf').eq('empresa_id', empresaId).order('full_name') as any);
    setCrmClients(data || []);
  };

  const filteredCrmClients = useMemo(() => {
    if (!crmSearch.trim()) return crmClients;
    const s = crmSearch.toLowerCase();
    return crmClients.filter((c: any) => c.full_name?.toLowerCase().includes(s) || c.phone?.includes(crmSearch) || c.cpf?.includes(crmSearch));
  }, [crmClients, crmSearch]);

  const handleLinkClient = async (client: any) => {
    if (!crmConv) return;
    const convPhone = crmConv.phone?.replace(/\D/g, '') || '';
    const clientPhone = (client.phone || '').replace(/\D/g, '');

    // Check phone match
    if (clientPhone && convPhone && clientPhone !== convPhone && !convPhone.endsWith(clientPhone) && !clientPhone.endsWith(convPhone)) {
      // Phones differ — ask to update
      setCrmSelectedClient(client);
      setCrmStep('confirm_phone');
      return;
    }

    // If client has no phone, update automatically
    if (!clientPhone && convPhone) {
      await (supabase.from('clients').update({ phone: crmConv.phone }).eq('id', client.id) as any);
    }

    await finalizeLinkClient(client);
  };

  const finalizeLinkClient = async (client: any, updatePhone = false) => {
    if (!crmConv) return;
    if (updatePhone) {
      await (supabase.from('clients').update({ phone: crmConv.phone }).eq('id', client.id) as any);
    }

    // Update conversation with client link
    await (supabase.from('whatsapp_conversations').update({ contact_id: client.id, contact_name: client.full_name }).eq('id', crmConv.id) as any);
    setActiveConv(prev => prev?.id === crmConv.id ? { ...prev!, contact_name: client.full_name, contact_id: client.id } : prev);
    setConversations(prev => prev.map(c => c.id === crmConv.id ? { ...c, contact_name: client.full_name, contact_id: client.id } : c));

    toast.success('Cliente vinculado com sucesso!');
    setShowCrmLink(false);
  };

  const handleGoToNewClient = () => {
    setShowCrmLink(false);
    // Navigate to clients page with return info
    navigate('/clients', {
      state: {
        returnTo: '/whatsapp',
        prefill: { full_name: crmConv?.contact_name || '', phone: crmConv?.phone || '' },
        linkConversationId: crmConv?.id,
      }
    });
  };

  const getDisplayName = (conv: Conversation) => conv.contact_name || conv.phone;

  const filteredConvs = conversations.filter(c => {
    if (!search) return true;
    const s = search.toLowerCase();
    return getDisplayName(c).toLowerCase().includes(s) || c.phone?.includes(search);
  });

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      const now = new Date();
      if (d.toDateString() === now.toDateString()) return format(d, 'HH:mm');
      const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
      if (d.toDateString() === yesterday.toDateString()) return 'Ontem';
      return format(d, 'dd/MM/yyyy', { locale: ptBR });
    } catch { return ''; }
  };

  const getLastMsgPreview = (conv: Conversation) => conv.last_message || 'Sem mensagens';

  // Group messages by date
  const groupedMessages = messages.reduce<{ date: string; msgs: Message[] }[]>((acc, msg) => {
    const d = new Date(msg.created_at);
    const today = new Date();
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    let dateLabel = format(d, 'dd/MM/yyyy', { locale: ptBR });
    if (d.toDateString() === today.toDateString()) dateLabel = 'HOJE';
    else if (d.toDateString() === yesterday.toDateString()) dateLabel = 'ONTEM';

    const last = acc[acc.length - 1];
    if (last && last.date === dateLabel) {
      last.msgs.push(msg);
    } else {
      acc.push({ date: dateLabel, msgs: [msg] });
    }
    return acc;
  }, []);

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden" style={{ backgroundColor: '#eae6df' }}>
        {/* ==================== LEFT PANEL ==================== */}
        <div className="w-[400px] flex flex-col shrink-0 border-r" style={{ backgroundColor: '#ffffff', borderColor: '#e9edef' }}>
          {/* Header */}
          <div className="h-[59px] flex items-center justify-between px-4 shrink-0" style={{ backgroundColor: '#f0f2f5' }}>
            <Avatar className="h-10 w-10 cursor-pointer">
              <AvatarFallback style={{ backgroundColor: '#dfe5e7', color: '#54656f' }} className="text-sm font-medium">
                {agentName?.slice(0, 2).toUpperCase() || 'EU'}
              </AvatarFallback>
            </Avatar>
            <div className="flex items-center gap-2">
              <button
                className="p-2 rounded-full hover:bg-black/5 transition-colors"
                onClick={() => setShowNewMessage(true)}
                title="Nova conversa"
              >
                <MessageSquarePlus className="h-5 w-5" style={{ color: '#54656f' }} />
              </button>
              <button className="p-2 rounded-full hover:bg-black/5 transition-colors">
                <MoreVertical className="h-5 w-5" style={{ color: '#54656f' }} />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="px-2 py-[5px] shrink-0" style={{ backgroundColor: '#ffffff' }}>
            <div
              className="flex items-center gap-3 rounded-lg px-3 py-[6px] transition-all"
              style={{ backgroundColor: searchFocused ? '#ffffff' : '#f0f2f5', border: searchFocused ? '1px solid #00a884' : '1px solid transparent' }}
            >
              <Search className="h-[18px] w-[18px] shrink-0" style={{ color: searchFocused ? '#00a884' : '#54656f' }} />
              <input
                type="text"
                placeholder="Pesquisar ou começar uma nova conversa"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-[#667781]"
                style={{ color: '#111b21' }}
              />
            </div>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
            {filteredConvs.map(conv => {
              const displayName = getDisplayName(conv);
              const phone = conv.phone?.replace(/\D/g, '') || '';
              const isActive = activeConv?.id === conv.id;
              return (
                <ContextMenu key={conv.id}>
                  <ContextMenuTrigger asChild>
                    <div
                      onClick={() => openConversation(conv)}
                      className="group flex items-center gap-3 px-3 py-[10px] cursor-pointer transition-colors relative"
                      style={{ backgroundColor: isActive ? '#f0f2f5' : 'transparent' }}
                      onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.backgroundColor = '#f5f6f6'; }}
                      onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent'; }}
                    >
                      <Avatar className="h-[49px] w-[49px] shrink-0">
                        {profilePics[phone] && <AvatarImage src={profilePics[phone]!} alt={displayName} />}
                        <AvatarFallback style={{ backgroundColor: '#dfe5e7', color: '#ffffff' }} className="text-lg font-light">
                          {displayName.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0 border-b py-[2px]" style={{ borderColor: '#e9edef' }}>
                        <div className="flex items-center justify-between mb-[2px]">
                          <span className="flex items-center gap-1 text-[17px] truncate" style={{ color: '#111b21' }}>
                            {displayName}
                            {conv.contact_id && <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />}
                          </span>
                          <div className="flex items-center gap-1 shrink-0 ml-2">
                            <span className="text-[12px]" style={{ color: conv.unread_count > 0 ? '#25d366' : '#667781' }}>
                              {formatTime(conv.last_message_at)}
                            </span>
                            <ChevronDown className="h-[18px] w-[18px] opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#54656f' }} />
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-[14px] truncate pr-2" style={{ color: '#667781' }}>
                            {getLastMsgPreview(conv)}
                          </p>
                          {conv.unread_count > 0 && (
                            <span
                              className="h-[20px] min-w-[20px] flex items-center justify-center rounded-full text-[11px] font-medium px-[6px] shrink-0"
                              style={{ backgroundColor: '#25d366', color: '#ffffff' }}
                            >
                              {conv.unread_count}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </ContextMenuTrigger>
                  <ContextMenuContent className="w-[220px] rounded-lg shadow-lg border-0 py-2" style={{ backgroundColor: '#ffffff' }}>
                    <ContextMenuItem
                      className="flex items-center gap-3 px-6 py-2.5 text-[14px] cursor-pointer hover:bg-[#f5f6f6] focus:bg-[#f5f6f6]"
                      style={{ color: '#3b4a54' }}
                      onClick={() => toast.info('Conversa arquivada')}
                    >
                      <Archive className="h-[18px] w-[18px]" style={{ color: '#54656f' }} />
                      Arquivar conversa
                    </ContextMenuItem>
                    <ContextMenuItem
                      className="flex items-center gap-3 px-6 py-2.5 text-[14px] cursor-pointer hover:bg-[#f5f6f6] focus:bg-[#f5f6f6]"
                      style={{ color: '#3b4a54' }}
                      onClick={() => toast.info('Notificações silenciadas')}
                    >
                      <BellOff className="h-[18px] w-[18px]" style={{ color: '#54656f' }} />
                      Silenciar notificações
                    </ContextMenuItem>
                    <ContextMenuItem
                      className="flex items-center gap-3 px-6 py-2.5 text-[14px] cursor-pointer hover:bg-[#f5f6f6] focus:bg-[#f5f6f6]"
                      style={{ color: '#3b4a54' }}
                      onClick={() => toast.info('Conversa fixada')}
                    >
                      <Pin className="h-[18px] w-[18px]" style={{ color: '#54656f' }} />
                      Fixar conversa
                    </ContextMenuItem>
                    <ContextMenuItem
                      className="flex items-center gap-3 px-6 py-2.5 text-[14px] cursor-pointer hover:bg-[#f5f6f6] focus:bg-[#f5f6f6]"
                      style={{ color: '#3b4a54' }}
                      onClick={async () => {
                        await (supabase.from('whatsapp_conversations').update({ unread_count: 1 }).eq('id', conv.id) as any);
                        setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unread_count: 1 } : c));
                        toast.info('Marcada como não lida');
                      }}
                    >
                      <MailOpen className="h-[18px] w-[18px]" style={{ color: '#54656f' }} />
                      Marcar como não lida
                    </ContextMenuItem>
                    <ContextMenuSeparator className="my-1" style={{ backgroundColor: '#e9edef' }} />
                    <ContextMenuItem
                      className="flex items-center gap-3 px-6 py-2.5 text-[14px] cursor-pointer hover:bg-[#f5f6f6] focus:bg-[#f5f6f6]"
                      style={{ color: '#3b4a54' }}
                      onClick={() => openCrmLinkDialog(conv)}
                    >
                      <UserPlus className="h-[18px] w-[18px]" style={{ color: '#54656f' }} />
                      {conv.contact_id ? 'Ver cliente' : 'Vincular ao CRM'}
                    </ContextMenuItem>
                    <ContextMenuSeparator className="my-1" style={{ backgroundColor: '#e9edef' }} />
                    <ContextMenuItem
                      className="flex items-center gap-3 px-6 py-2.5 text-[14px] cursor-pointer hover:bg-[#f5f6f6] focus:bg-[#f5f6f6]"
                      style={{ color: '#3b4a54' }}
                      onClick={async () => {
                        await (supabase.from('whatsapp_messages').delete().eq('conversation_id', conv.id) as any);
                        await (supabase.from('whatsapp_conversations').update({ last_message: '' }).eq('id', conv.id) as any);
                        if (activeConv?.id === conv.id) setMessages([]);
                        setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, last_message: '' } : c));
                        toast.info('Conversa limpa');
                      }}
                    >
                      <Trash2 className="h-[18px] w-[18px]" style={{ color: '#54656f' }} />
                      Limpar conversa
                    </ContextMenuItem>
                    <ContextMenuItem
                      className="flex items-center gap-3 px-6 py-2.5 text-[14px] cursor-pointer hover:bg-[#f5f6f6] focus:bg-[#f5f6f6]"
                      style={{ color: '#e53935' }}
                      onClick={async () => {
                        await (supabase.from('whatsapp_messages').delete().eq('conversation_id', conv.id) as any);
                        await (supabase.from('whatsapp_conversations').delete().eq('id', conv.id) as any);
                        if (activeConv?.id === conv.id) { setActiveConv(null); setMessages([]); }
                        setConversations(prev => prev.filter(c => c.id !== conv.id));
                        toast.info('Conversa excluída');
                      }}
                    >
                      <LogOut className="h-[18px] w-[18px]" style={{ color: '#e53935' }} />
                      Excluir conversa
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              );
            })}
            {filteredConvs.length === 0 && (
              <div className="p-8 text-center text-[14px]" style={{ color: '#667781' }}>
                Nenhuma conversa encontrada
              </div>
            )}
          </div>
        </div>

        {/* ==================== RIGHT PANEL (CHAT) ==================== */}
        <div className="flex-1 flex flex-col min-w-0">
          {activeConv ? (
            <>
              {/* Chat header */}
              <div className="h-[59px] flex items-center gap-3 px-4 shrink-0" style={{ backgroundColor: '#f0f2f5', borderBottom: '1px solid #e9edef' }}>
                <Avatar
                  className="h-10 w-10 cursor-pointer"
                  onClick={() => setShowContactInfo(!showContactInfo)}
                >
                  {profilePics[activeConv.phone?.replace(/\D/g, '')] && (
                    <AvatarImage src={profilePics[activeConv.phone?.replace(/\D/g, '')]!} alt={getDisplayName(activeConv)} />
                  )}
                  <AvatarFallback style={{ backgroundColor: '#dfe5e7', color: '#ffffff' }} className="text-sm font-light">
                    {getDisplayName(activeConv).slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => setShowContactInfo(!showContactInfo)}
                >
                  <p className="text-[16px] font-normal flex items-center gap-1.5" style={{ color: '#111b21' }}>
                    {getDisplayName(activeConv)}
                    {activeConv.contact_id && <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />}
                  </p>
                  <p className="text-[13px]" style={{ color: '#667781' }}>{activeConv.phone}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button className="p-2 rounded-full hover:bg-black/5 transition-colors">
                    <Search className="h-5 w-5" style={{ color: '#54656f' }} />
                  </button>
                  <button className="p-2 rounded-full hover:bg-black/5 transition-colors">
                    <MoreVertical className="h-5 w-5" style={{ color: '#54656f' }} />
                  </button>
                </div>
              </div>

              {/* Messages area with WhatsApp wallpaper */}
              <div
                className="flex-1 overflow-y-auto px-[63px] py-2 relative"
                style={{
                  backgroundColor: '#efeae2',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='300' height='300' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='p' width='60' height='60' patternUnits='userSpaceOnUse'%3E%3Ccircle cx='10' cy='10' r='1.5' fill='%23d1cdc7' opacity='0.4'/%3E%3Ccircle cx='30' cy='30' r='1' fill='%23d1cdc7' opacity='0.3'/%3E%3Ccircle cx='50' cy='50' r='1.5' fill='%23d1cdc7' opacity='0.4'/%3E%3Ccircle cx='50' cy='10' r='1' fill='%23d1cdc7' opacity='0.3'/%3E%3Ccircle cx='10' cy='50' r='1' fill='%23d1cdc7' opacity='0.3'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='300' height='300' fill='url(%23p)'/%3E%3C/svg%3E")`,
                }}
              >
                {loading && (
                  <div className="flex justify-center py-8">
                    <span className="text-[13px]" style={{ color: '#667781' }}>Carregando mensagens...</span>
                  </div>
                )}

                {groupedMessages.map((group) => (
                  <div key={group.date}>
                    {/* Date separator */}
                    <div className="flex justify-center my-3">
                      <span
                        className="px-3 py-[5px] rounded-lg text-[12.5px] shadow-sm"
                        style={{ backgroundColor: '#ffffff', color: '#54656f' }}
                      >
                        {group.date}
                      </span>
                    </div>
                    {/* Messages */}
                    {group.msgs.map(msg => (
                      <MessageBubble
                        key={msg.id}
                        msg={msg}
                        serverUrl={serverUrl}
                        empresaId={empresaId}
                        onReply={(m) => setReplyTo(m as Message)}
                      />
                    ))}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply preview */}
              {replyTo && (
                <div className="px-[63px] pt-1 shrink-0" style={{ backgroundColor: '#f0f2f5' }}>
                  <div className="flex items-center rounded-t-lg overflow-hidden" style={{ backgroundColor: '#f0f0f0' }}>
                    <div className="flex-1 px-4 py-2 border-l-[4px] min-w-0" style={{ borderColor: '#06cf9c' }}>
                      <p className="text-[12.8px] font-medium" style={{ color: '#06cf9c' }}>
                        {replyTo.sender === 'me' ? 'Você' : getDisplayName(activeConv)}
                      </p>
                      <p className="text-[13px] truncate" style={{ color: '#667781' }}>
                        {replyTo.content || getMsgTypeLabel(replyTo.message_type) || 'Mídia'}
                      </p>
                    </div>
                    <button className="p-2 hover:bg-black/5 transition-colors" onClick={() => setReplyTo(null)}>
                      <X className="h-5 w-5" style={{ color: '#8696a0' }} />
                    </button>
                  </div>
                </div>
              )}

              {/* Input area */}
              <div className="flex items-center gap-1 px-[10px] py-[5px] shrink-0" style={{ backgroundColor: '#f0f2f5' }}>
                <button className="p-2 rounded-full hover:bg-black/5 transition-colors">
                  <Smile className="h-[26px] w-[26px]" style={{ color: '#54656f' }} />
                </button>
                <button
                  className="p-2 rounded-full hover:bg-black/5 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={sendingFile}
                >
                  <Paperclip className="h-[26px] w-[26px] rotate-45" style={{ color: '#54656f' }} />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar"
                  onChange={handleFileUpload}
                />
                <div className="flex-1 mx-1">
                  <input
                    type="text"
                    placeholder="Digite uma mensagem"
                    value={msgText}
                    onChange={e => setMsgText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                    className="w-full rounded-lg px-3 py-[9px] text-[15px] outline-none"
                    style={{ backgroundColor: '#ffffff', color: '#111b21', border: '1px solid #e9edef' }}
                  />
                </div>
                {msgText.trim() ? (
                  <button onClick={handleSend} className="p-2 rounded-full hover:bg-black/5 transition-colors">
                    <Send className="h-[26px] w-[26px]" style={{ color: '#54656f' }} />
                  </button>
                ) : (
                  <button className="p-2 rounded-full hover:bg-black/5 transition-colors">
                    <Mic className="h-[26px] w-[26px]" style={{ color: '#54656f' }} />
                  </button>
                )}
              </div>
            </>
          ) : (
            /* Empty state */
            <div className="flex-1 flex flex-col items-center justify-center" style={{ backgroundColor: '#f0f2f5' }}>
              <div className="text-center max-w-[560px]">
                <div className="w-[250px] h-[250px] mx-auto mb-6 rounded-full flex items-center justify-center" style={{ backgroundColor: '#e8e8e8' }}>
                  <svg viewBox="0 0 303 172" width="250" className="opacity-20">
                    <path fill="#364147" d="M229.565 160.229c32.647-12.996 51.515-30.525 51.515-49.702C281.08 62.32 218.134 24.46 140.54 24.46S0 62.32 0 110.527c0 19.177 18.868 36.706 51.515 49.702A254.118 254.118 0 0 0 140.54 172a254.118 254.118 0 0 0 89.025-11.771z" />
                    <path fill="#DCE3E5" d="M229.565 160.229c32.647-12.996 51.515-30.525 51.515-49.702C281.08 62.32 218.134 24.46 140.54 24.46S0 62.32 0 110.527c0 19.177 18.868 36.706 51.515 49.702" />
                  </svg>
                </div>
                <h1 className="text-[32px] font-light mb-3" style={{ color: '#41525d' }}>WhatsApp Web</h1>
                <p className="text-[14px] leading-[20px]" style={{ color: '#667781' }}>
                  Envie e receba mensagens sem precisar manter seu celular conectado.<br />
                  Use o WhatsApp em até 4 aparelhos conectados e 1 celular ao mesmo tempo.
                </p>
                <div className="mt-10 pt-8" style={{ borderTop: '1px solid #e9edef' }}>
                  <Button
                    className="gap-2 rounded-full px-6"
                    style={{ backgroundColor: '#008069', color: '#ffffff' }}
                    onClick={() => setShowNewMessage(true)}
                  >
                    <MessageSquarePlus className="h-4 w-4" />
                    Nova Mensagem
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ==================== RIGHT PANEL (CONTACT INFO) ==================== */}
        {showContactInfo && activeConv && (
          <div className="w-[340px] flex flex-col shrink-0 border-l" style={{ backgroundColor: '#ffffff', borderColor: '#e9edef' }}>
            {/* Header */}
            <div className="h-[59px] flex items-center gap-6 px-6 shrink-0" style={{ backgroundColor: '#f0f2f5' }}>
              <button onClick={() => setShowContactInfo(false)} className="p-1 hover:bg-black/5 rounded-full transition-colors">
                <X className="h-5 w-5" style={{ color: '#54656f' }} />
              </button>
              <span className="text-[16px]" style={{ color: '#111b21' }}>Dados do contato</span>
            </div>

            {/* Contact details */}
            <div className="flex-1 overflow-y-auto">
              <div className="flex flex-col items-center py-7" style={{ backgroundColor: '#ffffff' }}>
                <Avatar className="h-[200px] w-[200px] mb-4">
                  {profilePics[activeConv.phone?.replace(/\D/g, '')] && (
                    <AvatarImage src={profilePics[activeConv.phone?.replace(/\D/g, '')]!} alt={getDisplayName(activeConv)} />
                  )}
                  <AvatarFallback style={{ backgroundColor: '#dfe5e7', color: '#ffffff' }} className="text-6xl font-light">
                    {getDisplayName(activeConv).slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <p className="text-[22px] flex items-center gap-2" style={{ color: '#111b21' }}>
                  {getDisplayName(activeConv)}
                  {activeConv.contact_id && <Star className="h-5 w-5 shrink-0 fill-amber-400 text-amber-400" />}
                </p>
                <p className="text-[14px] mt-1" style={{ color: '#667781' }}>{activeConv.phone}</p>
              </div>

              <div className="h-[8px]" style={{ backgroundColor: '#f0f2f5' }} />

              <div className="px-[30px] py-4">
                <p className="text-[14px] mb-3" style={{ color: '#008069' }}>Telefone</p>
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5" style={{ color: '#54656f' }} />
                  <span className="text-[14px]" style={{ color: '#111b21' }}>{activeConv.phone}</span>
                </div>
              </div>

              <div className="h-[8px]" style={{ backgroundColor: '#f0f2f5' }} />

              <div className="px-[30px] py-4">
                {!activeConv.contact_id ? (
                  <button
                    className="flex items-center gap-3 w-full py-2 text-[14px] hover:bg-black/5 rounded transition-colors"
                    style={{ color: '#008069' }}
                    onClick={() => openCrmLinkDialog(activeConv)}
                  >
                    <UserPlus className="h-5 w-5" />
                    <span>Vincular ao CRM</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] px-3 py-1 rounded-full" style={{ backgroundColor: '#e7f8e9', color: '#008069' }}>
                      ✓ Cliente vinculado
                    </span>
                  </div>
                )}
              </div>
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
              <Input value={newMsgForm.phone} onChange={e => setNewMsgForm(prev => ({ ...prev, phone: e.target.value }))} placeholder="5548991234567" />
              <p className="text-xs text-muted-foreground mt-1">Ex: 5548991234567</p>
            </div>
            <div>
              <Label>Nome do contato (opcional)</Label>
              <Input value={newMsgForm.name} onChange={e => setNewMsgForm(prev => ({ ...prev, name: e.target.value }))} placeholder="João Silva" />
            </div>
            <div>
              <Label>Mensagem</Label>
              <Input value={newMsgForm.message} onChange={e => setNewMsgForm(prev => ({ ...prev, message: e.target.value }))} placeholder="Olá!" onKeyDown={e => e.key === 'Enter' && handleNewMessage()} />
            </div>
            <Button onClick={handleNewMessage} className="w-full gap-2">
              <Send className="h-4 w-4" />
              Enviar Mensagem
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* CRM Link Dialog */}
      <Dialog open={showCrmLink} onOpenChange={setShowCrmLink}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Vincular ao CRM
            </DialogTitle>
          </DialogHeader>

          {crmStep === 'ask' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                O contato <strong>{crmConv?.contact_name || crmConv?.phone}</strong> já é um cliente cadastrado?
              </p>
              <div className="flex gap-3">
                <Button className="flex-1" onClick={() => setCrmStep('select')}>
                  <Check className="h-4 w-4 mr-2" /> Sim, vincular existente
                </Button>
                <Button variant="outline" className="flex-1" onClick={handleGoToNewClient}>
                  <UserPlus className="h-4 w-4 mr-2" /> Não, cadastrar novo
                </Button>
              </div>
            </div>
          )}

          {crmStep === 'select' && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, telefone ou CPF..."
                  value={crmSearch}
                  onChange={e => setCrmSearch(e.target.value)}
                  className="pl-9"
                  autoFocus
                />
              </div>
              <div className="max-h-[300px] overflow-y-auto border rounded-md">
                {filteredCrmClients.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Nenhum cliente encontrado</p>
                ) : (
                  filteredCrmClients.map((client: any) => (
                    <button
                      key={client.id}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent text-left border-b last:border-b-0 transition-colors"
                      onClick={() => handleLinkClient(client)}
                    >
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="text-xs">{(client.full_name || '?').slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{client.full_name}</p>
                        <p className="text-xs text-muted-foreground">{client.phone || 'Sem telefone'} {client.cpf ? `· ${client.cpf}` : ''}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
              <Button variant="ghost" className="w-full" onClick={() => setCrmStep('ask')}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
              </Button>
            </div>
          )}

          {crmStep === 'confirm_phone' && crmSelectedClient && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                O telefone do contato WhatsApp (<strong>{crmConv?.phone}</strong>) é diferente do cadastrado no cliente (<strong>{crmSelectedClient.phone || 'vazio'}</strong>).
              </p>
              <p className="text-sm font-medium">Deseja atualizar o telefone do cliente?</p>
              <div className="flex gap-3">
                <Button className="flex-1" onClick={() => finalizeLinkClient(crmSelectedClient, true)}>
                  Sim, atualizar
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => finalizeLinkClient(crmSelectedClient, false)}>
                  Não, manter
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
