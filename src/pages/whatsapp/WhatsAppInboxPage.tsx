import AppLayout from '@/components/AppLayout';
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Send, Paperclip, UserPlus, Phone, MessageSquarePlus, X, Smile, Mic, ArrowLeft, MoreVertical, Archive, BellOff, Pin, MailOpen, Heart, Tag, Trash2, LogOut, ChevronDown, Check, Link2, Star, FileText, Handshake } from 'lucide-react';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { sendMessage, sendMedia, getServerUrl, connectSession, getProfilePic } from '@/lib/whatsappApi';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import MessageBubble from '@/components/whatsapp/MessageBubble';
import LabelPickerModal from '@/components/whatsapp/LabelPickerModal';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Conversation {
  id: string;
  phone: string;
  contact_name: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  contact_id: string | null;
  supplier_id: string | null;
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
  const isMobile = useIsMobile();
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

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
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingCancelledRef = useRef(false);
  const [profilePics, setProfilePics] = useState<Record<string, string | null>>({});
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [msgSearch, setMsgSearch] = useState('');
  const [showMsgSearch, setShowMsgSearch] = useState(false);
  const msgSearchRef = useRef<HTMLInputElement>(null);
  const [labelConvId, setLabelConvId] = useState<string | null>(null);
  const [convLabelsMap, setConvLabelsMap] = useState<Record<string, { name: string; color: string }[]>>({});
  const [allLabels, setAllLabels] = useState<{ id: string; name: string; color: string }[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const msgInputRef = useRef<HTMLInputElement>(null);

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
    loadAllLabelsAndMappings();
  }, [empresaId]);

  const loadAllLabelsAndMappings = async () => {
    const [{ data: lbls }, { data: mappings }] = await Promise.all([
      supabase.from('whatsapp_labels').select('*').eq('empresa_id', empresaId).order('name') as any,
      supabase.from('whatsapp_conversation_labels').select('conversation_id, label_id').eq('empresa_id', empresaId) as any,
    ]);
    const labelsById: Record<string, { name: string; color: string }> = {};
    (lbls || []).forEach((l: any) => { labelsById[l.id] = { name: l.name, color: l.color }; });
    setAllLabels(lbls || []);
    const map: Record<string, { name: string; color: string }[]> = {};
    (mappings || []).forEach((m: any) => {
      if (labelsById[m.label_id]) {
        if (!map[m.conversation_id]) map[m.conversation_id] = [];
        map[m.conversation_id].push(labelsById[m.label_id]);
      }
    });
    setConvLabelsMap(map);
  };

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
    setShowMsgSearch(false);
    setMsgSearch('');
    if (isMobile) setMobileView('chat');
    await (supabase.from('whatsapp_conversations').update({ unread_count: 0 }).eq('id', conv.id) as any);
    setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unread_count: 0 } : c));
    const { data: dbMsgs } = await (supabase.from('whatsapp_messages').select('*').eq('conversation_id', conv.id).order('created_at', { ascending: true }) as any);
    setMessages(dbMsgs || []);
    setLoading(false);
    setTimeout(() => msgInputRef.current?.focus(), 300);
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
      const sendResult = await sendMessage(serverUrl, empresaId, targetId, whatsappText, quotedMsgId || undefined);
      const sentWaMsgId = sendResult?.message_id || sendResult?.id || sendResult?.messageId || null;
      await (supabase.from('whatsapp_messages').insert({ conversation_id: activeConv.id, empresa_id: empresaId, sender: 'me', content: text, message_type: 'chat', reply_to_content: newMsg.reply_to_content || null, reply_to_id: newMsg.reply_to_id || null, whatsapp_msg_id: sentWaMsgId }) as any);
      if (sentWaMsgId) {
        setMessages(prev => prev.map(m => m.id === newMsg.id ? { ...m, whatsapp_msg_id: sentWaMsgId } : m));
      }
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
      await (supabase.from('clients' as any).update({ phone: crmConv.phone }).eq('id', client.id));
    }

    // Find or create a whatsapp_contacts record linked to this CRM client
    const { data: existingContact } = await (supabase.from('whatsapp_contacts' as any)
      .select('id')
      .eq('empresa_id', empresaId)
      .eq('client_id', client.id)
      .maybeSingle()) as any;

    let contactId: string;
    if (existingContact?.id) {
      contactId = existingContact.id;
    } else {
      const { data: newContact, error: createErr } = await (supabase.from('whatsapp_contacts' as any)
        .insert({
          empresa_id: empresaId,
          client_id: client.id,
          name: client.full_name,
          phone: crmConv.phone || '',
        })
        .select('id')
        .single()) as any;
      if (createErr || !newContact) {
        console.error('Error creating whatsapp contact:', createErr);
        toast.error('Erro ao vincular cliente.');
        return;
      }
      contactId = newContact.id;
    }

    // Update conversation with the whatsapp_contacts id
    const { error: linkError } = await (supabase.from('whatsapp_conversations' as any).update({ contact_id: contactId, contact_name: client.full_name }).eq('id', crmConv.id));
    if (linkError) {
      console.error('Error linking client:', linkError);
      toast.error('Erro ao vincular cliente.');
      return;
    }
    setActiveConv(prev => prev?.id === crmConv.id ? { ...prev!, contact_name: client.full_name, contact_id: contactId } : prev);
    setConversations(prev => prev.map(c => c.id === crmConv.id ? { ...c, contact_name: client.full_name, contact_id: contactId } : c));

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

  const getLastMsgPreview = (conv: Conversation) => {
    const msg = conv.last_message || '';
    if (msg.includes('BEGIN:VCARD')) {
      const fnMatch = msg.match(/FN:(.+)/);
      return `👤 Contato: ${fnMatch?.[1]?.trim() || 'Contato'}`;
    }
    return msg || 'Sem mensagens';
  };

  // Filter messages by search term
  const filteredMessages = msgSearch.trim()
    ? messages.filter(m => m.content?.toLowerCase().includes(msgSearch.toLowerCase()))
    : messages;

  // Group messages by date
  const groupedMessages = filteredMessages.reduce<{ date: string; msgs: Message[] }[]>((acc, msg) => {
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

  const handleMobileBack = () => {
    setMobileView('list');
    setActiveConv(null);
    setShowContactInfo(false);
    stopRecording(true);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm' });
      recordingChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) recordingChunksRef.current.push(e.data); };
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
        const blob = new Blob(recordingChunksRef.current, { type: 'audio/webm' });
        if (blob.size > 0 && !recordingCancelledRef.current) {
          const file = new File([blob], `audio_${Date.now()}.webm`, { type: 'audio/webm' });
          await sendVoiceMessage(file);
        }
        recordingCancelledRef.current = false;
        setIsRecording(false);
        setRecordingDuration(0);
      };
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder as any;
      setIsRecording(true);
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => setRecordingDuration(prev => prev + 1), 1000);
    } catch {
      toast.error('Não foi possível acessar o microfone');
    }
  };

  const stopRecording = (cancel = false) => {
    recordingCancelledRef.current = cancel;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
  };

  const sendVoiceMessage = async (file: File) => {
    if (!activeConv) return;
    const newMsg: Message = {
      id: crypto.randomUUID(), sender: 'me', content: '🎤 Áudio',
      message_type: 'audio', media_url: URL.createObjectURL(file), created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, newMsg]);
    try {
      const targetId = activeConv.whatsapp_id || activeConv.phone;
      await sendMedia(serverUrl, empresaId, targetId, file);
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const storagePath = `${empresaId}/${newMsg.id}.webm`;
        const binaryStr = atob(base64);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
        const { error: uploadError } = await supabase.storage.from('whatsapp-media').upload(storagePath, bytes, { contentType: 'audio/webm', upsert: true });
        let finalUrl = '';
        if (!uploadError) { const { data } = supabase.storage.from('whatsapp-media').getPublicUrl(storagePath); finalUrl = data.publicUrl; }
        await (supabase.from('whatsapp_messages').insert({ conversation_id: activeConv.id, empresa_id: empresaId, sender: 'me', content: '🎤 Áudio', message_type: 'audio', media_url: finalUrl, media_type: 'audio/webm' }) as any);
      };
      reader.readAsDataURL(file);
      await (supabase.from('whatsapp_conversations').update({ last_message: '🎤 Áudio', last_message_at: new Date().toISOString() }).eq('id', activeConv.id) as any);
      toast.success('Áudio enviado!');
    } catch {
      toast.error('Erro ao enviar áudio');
    }
  };

  const formatRecordingTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // ===================== MOBILE LAYOUT =====================
  if (isMobile) {
    return (
      <AppLayout>
        <div className="fixed inset-0 flex flex-col overflow-hidden" style={{ backgroundColor: '#eae6df', top: '3.5rem', zIndex: 40 }}>
          {/* MOBILE: Conversation List */}
          <div
            className="flex flex-col h-full fixed inset-0 z-[41] transition-transform duration-300 ease-in-out"
            style={{
              backgroundColor: '#ffffff',
              transform: mobileView === 'list' ? 'translateX(0)' : 'translateX(-100%)',
              top: '3.5rem',
            }}
          >
            {/* Header */}
            <div className="h-[56px] flex items-center justify-between px-4 shrink-0" style={{ backgroundColor: '#008069' }}>
              <span className="text-[20px] font-semibold text-white">WhatsApp</span>
              <div className="flex items-center gap-1">
                <button className="p-2 rounded-full hover:bg-white/10 transition-colors" onClick={() => setShowNewMessage(true)}>
                  <MessageSquarePlus className="h-5 w-5 text-white" />
                </button>
                <button className="p-2 rounded-full hover:bg-white/10 transition-colors">
                  <MoreVertical className="h-5 w-5 text-white" />
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="px-2 py-[6px] shrink-0" style={{ backgroundColor: '#ffffff' }}>
              <div className="flex items-center gap-3 rounded-lg px-3 py-[8px]" style={{ backgroundColor: '#f0f2f5' }}>
                <Search className="h-[16px] w-[16px] shrink-0" style={{ color: '#54656f' }} />
                <input
                  type="text"
                  placeholder="Pesquisar..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-[#667781]"
                  style={{ color: '#111b21' }}
                />
                {search && (
                  <button onClick={() => setSearch('')}>
                    <X className="h-4 w-4" style={{ color: '#54656f' }} />
                  </button>
                )}
              </div>
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
              {filteredConvs.map(conv => {
                const displayName = getDisplayName(conv);
                const phone = conv.phone?.replace(/\D/g, '') || '';
                return (
                  <div
                    key={conv.id}
                    onClick={() => openConversation(conv)}
                    className="flex items-center gap-3 px-4 py-[12px] cursor-pointer active:bg-[#f0f2f5] transition-colors"
                  >
                    <Avatar className="h-[50px] w-[50px] shrink-0">
                      {profilePics[phone] && <AvatarImage src={profilePics[phone]!} alt={displayName} />}
                      <AvatarFallback style={{ backgroundColor: '#dfe5e7', color: '#ffffff' }} className="text-lg font-light">
                        {displayName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 border-b py-[2px]" style={{ borderColor: '#e9edef' }}>
                      <div className="flex items-center justify-between mb-[2px]">
                        <span className="text-[16px] truncate font-normal" style={{ color: '#111b21' }}>
                          {displayName}
                        </span>
                        <span className="text-[12px] shrink-0 ml-2" style={{ color: conv.unread_count > 0 ? '#25d366' : '#667781' }}>
                          {formatTime(conv.last_message_at)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-[13px] truncate pr-2" style={{ color: '#667781' }}>
                          {getLastMsgPreview(conv)}
                        </p>
                        {conv.unread_count > 0 && (
                          <span className="h-[20px] min-w-[20px] flex items-center justify-center rounded-full text-[11px] font-medium px-[6px] shrink-0" style={{ backgroundColor: '#25d366', color: '#ffffff' }}>
                            {conv.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {filteredConvs.length === 0 && (
                <div className="p-8 text-center text-[14px]" style={{ color: '#667781' }}>
                  Nenhuma conversa encontrada
                </div>
              )}
            </div>
          </div>

          {/* MOBILE: Chat View */}
          <div
            className="fixed left-0 right-0 bottom-0 z-[42] flex flex-col transition-transform duration-300 ease-in-out"
            style={{
              backgroundColor: '#efeae2',
              transform: mobileView === 'chat' ? 'translateX(0)' : 'translateX(100%)',
              top: '3.5rem',
            }}
          >
            {activeConv && (
              <>
                {/* Chat header */}
                <div className="h-[56px] flex items-center gap-2 px-2 shrink-0" style={{ backgroundColor: '#008069' }}>
                  <button className="p-2 rounded-full hover:bg-white/10" onClick={handleMobileBack}>
                    <ArrowLeft className="h-5 w-5 text-white" />
                  </button>
                  <Avatar className="h-[38px] w-[38px] shrink-0" onClick={() => setShowContactInfo(true)}>
                    {profilePics[activeConv.phone?.replace(/\D/g, '')] && (
                      <AvatarImage src={profilePics[activeConv.phone?.replace(/\D/g, '')]!} />
                    )}
                    <AvatarFallback style={{ backgroundColor: '#dfe5e7', color: '#ffffff' }} className="text-sm">
                      {getDisplayName(activeConv).slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 ml-1" onClick={() => setShowContactInfo(true)}>
                    <p className="text-[16px] font-normal text-white truncate">{getDisplayName(activeConv)}</p>
                    <p className="text-[12px] text-white/70 truncate">{activeConv.phone}</p>
                  </div>
                  <div className="flex items-center">
                    <button className="p-2 rounded-full hover:bg-white/10" onClick={() => { setShowMsgSearch(prev => !prev); setMsgSearch(''); }}>
                      <Search className="h-5 w-5 text-white" />
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-2 rounded-full hover:bg-white/10">
                          <MoreVertical className="h-5 w-5 text-white" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-[200px]">
                        {!activeConv.contact_id && (
                          <DropdownMenuItem onClick={() => {
                            const phone = activeConv.phone?.replace(/\D/g, '') || '';
                            const normalizedPhone = phone.startsWith('55') ? phone : `55${phone}`;
                            navigate('/clients', { state: { returnTo: '/whatsapp', prefill: { full_name: getDisplayName(activeConv), phone: normalizedPhone }, linkConversationPhone: normalizedPhone } });
                          }}>
                            <UserPlus className="h-4 w-4 mr-2" /> Cadastrar cliente
                          </DropdownMenuItem>
                        )}
                        {!activeConv.supplier_id && (
                          <DropdownMenuItem onClick={() => {
                            const phone = activeConv.phone?.replace(/\D/g, '') || '';
                            const normalizedPhone = phone.startsWith('55') ? phone : `55${phone}`;
                            navigate('/suppliers', { state: { returnTo: '/whatsapp', prefill: { name: getDisplayName(activeConv), phone: normalizedPhone }, linkConversationPhone: normalizedPhone } });
                          }}>
                            <Handshake className="h-4 w-4 mr-2" /> Cadastrar fornecedor
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => setShowContactInfo(true)}>
                          <Phone className="h-4 w-4 mr-2" /> Dados do contato
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Msg search mobile */}
                {showMsgSearch && (
                  <div className="flex items-center gap-2 px-3 py-2 shrink-0" style={{ backgroundColor: '#f0f2f5', borderBottom: '1px solid #e9edef' }}>
                    <Search className="h-4 w-4 shrink-0" style={{ color: '#54656f' }} />
                    <input
                      ref={msgSearchRef}
                      type="text"
                      placeholder="Buscar..."
                      value={msgSearch}
                      onChange={e => setMsgSearch(e.target.value)}
                      className="flex-1 text-[14px] outline-none bg-transparent"
                      style={{ color: '#111b21' }}
                      autoFocus
                    />
                    {msgSearch && <span className="text-[11px] shrink-0" style={{ color: '#667781' }}>{filteredMessages.length}</span>}
                    <button onClick={() => { setShowMsgSearch(false); setMsgSearch(''); }}>
                      <X className="h-4 w-4" style={{ color: '#54656f' }} />
                    </button>
                  </div>
                )}

                {/* Messages */}
                <div
                  className="flex-1 overflow-y-auto px-3 py-2"
                  style={{
                    backgroundColor: '#efeae2',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='300' height='300' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='p' width='60' height='60' patternUnits='userSpaceOnUse'%3E%3Ccircle cx='10' cy='10' r='1.5' fill='%23d1cdc7' opacity='0.4'/%3E%3Ccircle cx='30' cy='30' r='1' fill='%23d1cdc7' opacity='0.3'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='300' height='300' fill='url(%23p)'/%3E%3C/svg%3E")`,
                  }}
                >
                  {loading && (
                    <div className="flex justify-center py-8">
                      <span className="text-[13px]" style={{ color: '#667781' }}>Carregando...</span>
                    </div>
                  )}
                  {groupedMessages.map((group) => (
                    <div key={group.date}>
                      <div className="flex justify-center my-2">
                        <span className="px-3 py-[4px] rounded-lg text-[11px] shadow-sm" style={{ backgroundColor: '#ffffff', color: '#54656f' }}>
                          {group.date}
                        </span>
                      </div>
                      {group.msgs.map(msg => (
                        <MessageBubble
                          key={msg.id}
                          msg={msg}
                          serverUrl={serverUrl}
                          empresaId={empresaId}
                          onReply={(m) => { setReplyTo(m as Message); setTimeout(() => msgInputRef.current?.focus(), 50); }}
                          onDeleteForMe={async (m) => {
                            setMessages(prev => prev.filter(p => p.id !== m.id));
                            await (supabase.from('whatsapp_messages').delete().eq('id', m.id) as any);
                            toast.success('Mensagem apagada');
                          }}
                          onDeleteForAll={async (m) => {
                            try {
                              if (m.whatsapp_msg_id && activeConv) {
                                const targetId = activeConv.whatsapp_id || activeConv.phone;
                                await supabase.functions.invoke('whatsapp-proxy', {
                                  body: { server_url: serverUrl, endpoint: '/delete-message', method: 'POST', payload: { empresa_id: empresaId, phone: targetId, message_id: m.whatsapp_msg_id } },
                                });
                              }
                              setMessages(prev => prev.filter(p => p.id !== m.id));
                              await (supabase.from('whatsapp_messages').delete().eq('id', m.id) as any);
                              toast.success('Mensagem apagada para todos');
                            } catch { toast.error('Erro ao apagar'); }
                          }}
                          onStartChat={async (phone, name) => {
                            const normalizedPhone = phone.startsWith('55') ? phone : `55${phone}`;
                            try {
                              const { data: convId } = await (supabase.rpc('find_or_create_conversation', { p_empresa_id: empresaId, p_phone: normalizedPhone, p_client_name: name || normalizedPhone, p_last_message: '' }) as any);
                              const { data: updated } = await (supabase.from('whatsapp_conversations').select('*').eq('empresa_id', empresaId).order('last_message_at', { ascending: false }) as any);
                              if (updated) { setConversations(updated); const newConv = updated.find((c: any) => c.id === convId); if (newConv) openConversation(newConv); }
                            } catch { toast.error('Erro ao iniciar conversa'); }
                          }}
                          onSaveContact={(phone, name) => {
                            const normalizedPhone = phone.startsWith('55') ? phone : `55${phone}`;
                            navigate('/clients', { state: { returnTo: '/whatsapp', prefill: { full_name: name || '', phone: normalizedPhone }, linkConversationPhone: normalizedPhone } });
                          }}
                        />
                      ))}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Reply preview mobile */}
                {replyTo && (
                  <div className="px-3 pt-1 shrink-0" style={{ backgroundColor: '#f0f2f5' }}>
                    <div className="flex items-center rounded-t-lg overflow-hidden" style={{ backgroundColor: '#f0f0f0' }}>
                      <div className="flex-1 px-3 py-2 border-l-[4px] min-w-0" style={{ borderColor: '#06cf9c' }}>
                        <p className="text-[12px] font-medium" style={{ color: '#06cf9c' }}>
                          {replyTo.sender === 'me' ? 'Você' : getDisplayName(activeConv)}
                        </p>
                        <p className="text-[12px] truncate" style={{ color: '#667781' }}>
                          {replyTo.content || getMsgTypeLabel(replyTo.message_type) || 'Mídia'}
                        </p>
                      </div>
                      <button className="p-2" onClick={() => setReplyTo(null)}>
                        <X className="h-4 w-4" style={{ color: '#8696a0' }} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Input mobile */}
                <div className="flex items-center gap-1 px-2 py-[5px] shrink-0" style={{ backgroundColor: '#f0f2f5' }}>
                  {isRecording ? (
                    <>
                      <button
                        className="p-2 rounded-full"
                        style={{ backgroundColor: '#ea4335' }}
                        onClick={() => stopRecording(true)}
                      >
                        <Trash2 className="h-[20px] w-[20px] text-white" />
                      </button>
                      <div className="flex-1 flex items-center justify-center gap-2 mx-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-[15px] font-medium tabular-nums" style={{ color: '#111b21' }}>
                          {formatRecordingTime(recordingDuration)}
                        </span>
                      </div>
                      <button
                        className="p-2 rounded-full"
                        style={{ backgroundColor: '#008069' }}
                        onClick={() => stopRecording(false)}
                      >
                        <Send className="h-[20px] w-[20px] text-white" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="p-1.5 rounded-full hover:bg-black/5" onClick={() => fileInputRef.current?.click()} disabled={sendingFile}>
                        <Paperclip className="h-[22px] w-[22px] rotate-45" style={{ color: '#54656f' }} />
                      </button>
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar" onChange={handleFileUpload} />
                      <div className="flex-1 mx-1">
                        <input
                          type="text"
                          ref={msgInputRef}
                          placeholder="Mensagem"
                          value={msgText}
                          onChange={e => setMsgText(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                          className="w-full rounded-full px-4 py-[8px] text-[15px] outline-none"
                          style={{ backgroundColor: '#ffffff', color: '#111b21', border: '1px solid #e9edef' }}
                        />
                      </div>
                      {msgText.trim() ? (
                        <button onClick={handleSend} className="p-2 rounded-full" style={{ backgroundColor: '#008069' }}>
                          <Send className="h-[20px] w-[20px] text-white" />
                        </button>
                      ) : (
                        <button
                          className="p-2 rounded-full hover:bg-black/5 active:bg-black/10 transition-colors"
                          onClick={startRecording}
                        >
                          <Mic className="h-[22px] w-[22px]" style={{ color: '#54656f' }} />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Contact info dialog for mobile */}
        {showContactInfo && activeConv && (
          <Dialog open={showContactInfo} onOpenChange={setShowContactInfo}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Dados do contato</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col items-center gap-3 py-4">
                <Avatar className="h-[80px] w-[80px]">
                  {profilePics[activeConv.phone?.replace(/\D/g, '')] && (
                    <AvatarImage src={profilePics[activeConv.phone?.replace(/\D/g, '')]!} />
                  )}
                  <AvatarFallback style={{ backgroundColor: '#dfe5e7', color: '#ffffff' }} className="text-2xl">
                    {getDisplayName(activeConv).slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <p className="text-lg font-medium">{getDisplayName(activeConv)}</p>
                <p className="text-sm text-muted-foreground">{activeConv.phone}</p>
              </div>
              <div className="space-y-2">
                {!activeConv.contact_id && (
                  <Button variant="outline" className="w-full gap-2" onClick={() => { setShowContactInfo(false); openCrmLinkDialog(activeConv); }}>
                    <UserPlus className="h-4 w-4" /> Vincular ao CRM
                  </Button>
                )}
                {activeConv.contact_id && (
                  <span className="text-[13px] px-3 py-1 rounded-full inline-block" style={{ backgroundColor: '#e7f8e9', color: '#008069' }}>
                    ✓ Cliente vinculado
                  </span>
                )}
                {activeConv.supplier_id && (
                  <span className="text-[13px] px-3 py-1 rounded-full inline-block" style={{ backgroundColor: '#e7f8e9', color: '#008069' }}>
                    🤝 Fornecedor vinculado
                  </span>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* New Message Dialog */}
        <Dialog open={showNewMessage} onOpenChange={setShowNewMessage}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquarePlus className="h-5 w-5" /> Nova Mensagem
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Telefone</Label>
                <Input value={newMsgForm.phone} onChange={e => setNewMsgForm(prev => ({ ...prev, phone: e.target.value }))} placeholder="5548991234567" />
              </div>
              <div>
                <Label>Nome (opcional)</Label>
                <Input value={newMsgForm.name} onChange={e => setNewMsgForm(prev => ({ ...prev, name: e.target.value }))} placeholder="João Silva" />
              </div>
              <div>
                <Label>Mensagem</Label>
                <Input value={newMsgForm.message} onChange={e => setNewMsgForm(prev => ({ ...prev, message: e.target.value }))} placeholder="Olá!" onKeyDown={e => e.key === 'Enter' && handleNewMessage()} />
              </div>
              <Button onClick={handleNewMessage} className="w-full gap-2">
                <Send className="h-4 w-4" /> Enviar
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* CRM Link Dialog */}
        <Dialog open={showCrmLink} onOpenChange={setShowCrmLink}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Link2 className="h-5 w-5" /> Vincular ao CRM</DialogTitle>
            </DialogHeader>
            {crmStep === 'ask' && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">O contato <strong>{crmConv?.contact_name || crmConv?.phone}</strong> já é um cliente cadastrado?</p>
                <div className="flex gap-3">
                  <Button className="flex-1" onClick={() => setCrmStep('select')}><Check className="h-4 w-4 mr-2" /> Sim</Button>
                  <Button variant="outline" className="flex-1" onClick={handleGoToNewClient}><UserPlus className="h-4 w-4 mr-2" /> Não</Button>
                </div>
              </div>
            )}
            {crmStep === 'select' && (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar..." value={crmSearch} onChange={e => setCrmSearch(e.target.value)} className="pl-9" autoFocus />
                </div>
                <div className="max-h-[250px] overflow-y-auto border rounded-md">
                  {filteredCrmClients.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">Nenhum cliente encontrado</p>
                  ) : filteredCrmClients.map((client: any) => (
                    <button key={client.id} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent text-left border-b last:border-b-0" onClick={() => handleLinkClient(client)}>
                      <Avatar className="h-8 w-8 shrink-0"><AvatarFallback className="text-xs">{(client.full_name || '?').slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{client.full_name}</p>
                        <p className="text-xs text-muted-foreground">{client.phone || 'Sem telefone'}</p>
                      </div>
                    </button>
                  ))}
                </div>
                <Button variant="ghost" className="w-full" onClick={() => setCrmStep('ask')}><ArrowLeft className="h-4 w-4 mr-2" /> Voltar</Button>
              </div>
            )}
            {crmStep === 'confirm_phone' && crmSelectedClient && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Telefone diferente. Atualizar?</p>
                <div className="flex gap-3">
                  <Button className="flex-1" onClick={() => finalizeLinkClient(crmSelectedClient, true)}>Sim</Button>
                  <Button variant="outline" className="flex-1" onClick={() => finalizeLinkClient(crmSelectedClient, false)}>Não</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </AppLayout>
    );
  }

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
                            {conv.supplier_id && <Handshake className="h-3.5 w-3.5 shrink-0 text-[#00a884]" />}
                            {(convLabelsMap[conv.id] || []).map((lbl, i) => (
                              <span key={i} className="inline-block h-[10px] w-[10px] rounded-full shrink-0" style={{ backgroundColor: lbl.color }} title={lbl.name} />
                            ))}
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
                    <ContextMenuItem
                      className="flex items-center gap-3 px-6 py-2.5 text-[14px] cursor-pointer hover:bg-[#f5f6f6] focus:bg-[#f5f6f6]"
                      style={{ color: '#3b4a54' }}
                      onClick={() => setLabelConvId(conv.id)}
                    >
                      <Tag className="h-[18px] w-[18px]" style={{ color: '#54656f' }} />
                      Etiquetar conversa
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
                    {activeConv.supplier_id && <Handshake className="h-3.5 w-3.5 shrink-0 text-[#00a884]" />}
                  </p>
                  <p className="text-[13px]" style={{ color: '#667781' }}>{activeConv.phone}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-colors hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ backgroundColor: '#25d366', color: '#ffffff' }}
                    title={activeConv.supplier_id ? 'Contato vinculado a fornecedor' : 'Criar lead no Kanban CRM'}
                    disabled={!!activeConv.supplier_id}
                    onClick={async () => {
                      if (!empresaId || !activeConv) return;
                      try {
                        const { data: existing } = await supabase
                          .from('sales')
                          .select('id')
                          .eq('empresa_id', empresaId)
                          .eq('status', 'draft')
                          .eq('sale_workflow_status', 'em_aberto')
                          .ilike('client_name', getDisplayName(activeConv))
                          .limit(1) as any;
                        if (existing && existing.length > 0) {
                          toast.info('Este contato já possui um lead no Kanban');
                          return;
                        }
                        const { error } = await supabase.from('sales').insert({
                          empresa_id: empresaId,
                          client_name: getDisplayName(activeConv),
                          client_phone: activeConv.phone,
                          status: 'draft',
                          sale_workflow_status: 'em_aberto',
                          total_sale: 0,
                        } as any);
                        if (error) throw error;
                        toast.success('Lead criado no Kanban CRM!');
                      } catch (err) {
                        console.error(err);
                        toast.error('Erro ao criar lead');
                      }
                    }}
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Novo Lead
                  </button>
                  <button
                    className="p-2 rounded-full hover:bg-black/5 transition-colors"
                    onClick={() => {
                      setShowMsgSearch(prev => !prev);
                      setMsgSearch('');
                      setTimeout(() => msgSearchRef.current?.focus(), 100);
                    }}
                    title="Buscar mensagens"
                  >
                    <Search className="h-5 w-5" style={{ color: '#54656f' }} />
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-2 rounded-full hover:bg-black/5 transition-colors">
                        <MoreVertical className="h-5 w-5" style={{ color: '#54656f' }} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[200px] rounded-lg shadow-lg border-0 py-1" style={{ backgroundColor: '#ffffff' }}>
                      {!activeConv?.contact_id && (
                        <DropdownMenuItem
                          className="flex items-center gap-3 px-4 py-2 text-[14px] cursor-pointer"
                          style={{ color: '#3b4a54' }}
                          onClick={() => {
                            if (!activeConv) return;
                            const phone = activeConv.phone?.replace(/\D/g, '') || '';
                            const normalizedPhone = phone.startsWith('55') ? phone : `55${phone}`;
                            navigate('/clients', {
                              state: {
                                returnTo: '/whatsapp',
                                prefill: { full_name: getDisplayName(activeConv) || '', phone: normalizedPhone },
                                linkConversationPhone: normalizedPhone,
                              }
                            });
                          }}
                        >
                          <UserPlus className="h-4 w-4" style={{ color: '#54656f' }} />
                          Cadastrar cliente
                        </DropdownMenuItem>
                      )}
                      {activeConv?.contact_id && (
                        <DropdownMenuItem
                          className="flex items-center gap-3 px-4 py-2 text-[14px] cursor-pointer"
                          style={{ color: '#3b4a54' }}
                          onClick={() => setShowContactInfo(!showContactInfo)}
                        >
                          <FileText className="h-4 w-4" style={{ color: '#54656f' }} />
                          Ver cadastro
                        </DropdownMenuItem>
                      )}
                      {!activeConv?.supplier_id && (
                        <DropdownMenuItem
                          className="flex items-center gap-3 px-4 py-2 text-[14px] cursor-pointer"
                          style={{ color: '#3b4a54' }}
                          onClick={() => {
                            if (!activeConv) return;
                            const phone = activeConv.phone?.replace(/\D/g, '') || '';
                            const normalizedPhone = phone.startsWith('55') ? phone : `55${phone}`;
                            navigate('/suppliers', {
                              state: {
                                returnTo: '/whatsapp',
                                prefill: { name: getDisplayName(activeConv) || '', phone: normalizedPhone },
                                linkConversationPhone: normalizedPhone,
                              }
                            });
                          }}
                        >
                          <Handshake className="h-4 w-4" style={{ color: '#54656f' }} />
                          Cadastrar fornecedor
                        </DropdownMenuItem>
                      )}
                      {activeConv?.supplier_id && (
                        <DropdownMenuItem
                          className="flex items-center gap-3 px-4 py-2 text-[14px] cursor-pointer"
                          style={{ color: '#3b4a54' }}
                          onClick={() => setShowContactInfo(!showContactInfo)}
                        >
                          <Handshake className="h-4 w-4" style={{ color: '#54656f' }} />
                          Ver fornecedor
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Message search bar */}
              {showMsgSearch && (
                <div className="flex items-center gap-2 px-4 py-2 shrink-0" style={{ backgroundColor: '#f0f2f5', borderBottom: '1px solid #e9edef' }}>
                  <Search className="h-4 w-4 shrink-0" style={{ color: '#54656f' }} />
                  <input
                    ref={msgSearchRef}
                    type="text"
                    placeholder="Buscar mensagens nesta conversa..."
                    value={msgSearch}
                    onChange={e => setMsgSearch(e.target.value)}
                    className="flex-1 text-[14px] outline-none bg-transparent"
                    style={{ color: '#111b21' }}
                  />
                  {msgSearch && (
                    <span className="text-[12px] shrink-0" style={{ color: '#667781' }}>
                      {filteredMessages.length} resultado(s)
                    </span>
                  )}
                  <button
                    className="p-1 rounded-full hover:bg-black/5"
                    onClick={() => { setShowMsgSearch(false); setMsgSearch(''); }}
                  >
                    <X className="h-4 w-4" style={{ color: '#54656f' }} />
                  </button>
                </div>
              )}

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
                        onReply={(m) => { setReplyTo(m as Message); setTimeout(() => msgInputRef.current?.focus(), 50); }}
                        onDeleteForMe={async (m) => {
                          // Remove from local state
                          setMessages(prev => prev.filter(p => p.id !== m.id));
                          // Remove from database
                          await (supabase.from('whatsapp_messages').delete().eq('id', m.id) as any);
                          toast.success('Mensagem apagada para você');
                        }}
                        onDeleteForAll={async (m) => {
                          try {
                            // Delete on WhatsApp server if possible
                            if (m.whatsapp_msg_id && activeConv) {
                              const targetId = activeConv.whatsapp_id || activeConv.phone;
                              const { data: delResult } = await supabase.functions.invoke('whatsapp-proxy', {
                                body: {
                                  server_url: serverUrl,
                                  endpoint: '/delete-message',
                                  method: 'POST',
                                  payload: {
                                    empresa_id: empresaId,
                                    phone: targetId,
                                    message_id: m.whatsapp_msg_id,
                                  },
                                },
                              });
                              if (delResult?.error) {
                                throw new Error(delResult.error);
                              }
                            }
                            // Remove from local state and DB
                            setMessages(prev => prev.filter(p => p.id !== m.id));
                            await (supabase.from('whatsapp_messages').delete().eq('id', m.id) as any);
                            toast.success('Mensagem apagada para todos');
                          } catch (err) {
                            console.error('Error deleting for all:', err);
                            toast.error('Erro ao apagar mensagem para todos');
                          }
                        }}
                        onStartChat={async (phone, name) => {
                          // Find or create conversation with this phone
                          const normalizedPhone = phone.startsWith('55') ? phone : `55${phone}`;
                          try {
                            const { data: convId } = await (supabase.rpc('find_or_create_conversation', {
                              p_empresa_id: empresaId,
                              p_phone: normalizedPhone,
                              p_client_name: name || normalizedPhone,
                              p_last_message: '',
                            }) as any);
                            // Reload conversations and open the new one
                            const { data: updated } = await (supabase.from('whatsapp_conversations').select('*').eq('empresa_id', empresaId).order('last_message_at', { ascending: false }) as any);
                            if (updated) {
                              setConversations(updated);
                              const newConv = updated.find((c: any) => c.id === convId);
                              if (newConv) openConversation(newConv);
                            }
                          } catch (err) {
                            console.error('Error starting chat from vCard:', err);
                            toast.error('Erro ao iniciar conversa');
                          }
                        }}
                        onSaveContact={(phone, name) => {
                          const normalizedPhone = phone.startsWith('55') ? phone : `55${phone}`;
                          navigate('/clients', {
                            state: {
                              returnTo: '/whatsapp',
                              prefill: { full_name: name || '', phone: normalizedPhone },
                              linkConversationPhone: normalizedPhone,
                            }
                          });
                        }}
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
                     ref={msgInputRef}
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
                  {activeConv.supplier_id && <Handshake className="h-5 w-5 shrink-0 text-[#00a884]" />}
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
                {activeConv.supplier_id ? null : !activeConv.contact_id ? (
                  <button
                    className="flex items-center gap-3 w-full py-2 text-[14px] hover:bg-black/5 rounded transition-colors"
                    style={{ color: '#008069' }}
                    onClick={() => openCrmLinkDialog(activeConv)}
                  >
                    <UserPlus className="h-5 w-5" />
                    <span>Vincular ao CRM</span>
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] px-3 py-1 rounded-full" style={{ backgroundColor: '#e7f8e9', color: '#008069' }}>
                        ✓ Cliente vinculado
                      </span>
                    </div>
                    <button
                      className="flex items-center gap-3 w-full py-2 text-[14px] hover:bg-black/5 rounded transition-colors"
                      style={{ color: '#008069' }}
                      onClick={() => {
                        navigate('/sales/new', {
                          state: {
                            prefillClientId: activeConv.contact_id,
                            prefillClientName: activeConv.contact_name,
                            returnTo: '/whatsapp',
                          }
                        });
                      }}
                    >
                      <FileText className="h-5 w-5" />
                      <span>Criar Cotação</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="h-[8px]" style={{ backgroundColor: '#f0f2f5' }} />

              <div className="px-[30px] py-4">
                {!activeConv.supplier_id ? (
                  <button
                    className="flex items-center gap-3 w-full py-2 text-[14px] hover:bg-black/5 rounded transition-colors"
                    style={{ color: '#008069' }}
                    onClick={() => {
                      const phone = activeConv.phone?.replace(/\D/g, '') || '';
                      const normalizedPhone = phone.startsWith('55') ? phone : `55${phone}`;
                      navigate('/suppliers', {
                        state: {
                          returnTo: '/whatsapp',
                          prefill: { name: getDisplayName(activeConv) || '', phone: normalizedPhone },
                          linkConversationPhone: normalizedPhone,
                        }
                      });
                    }}
                  >
                    <Handshake className="h-5 w-5" />
                    <span>Vincular a Fornecedor</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] px-3 py-1 rounded-full" style={{ backgroundColor: '#e7f8e9', color: '#008069' }}>
                      🤝 Fornecedor vinculado
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

      <LabelPickerModal
        open={!!labelConvId}
        onOpenChange={(v) => { if (!v) { setLabelConvId(null); loadAllLabelsAndMappings(); } }}
        conversationId={labelConvId || ''}
        empresaId={empresaId}
      />
    </AppLayout>
  );
}
