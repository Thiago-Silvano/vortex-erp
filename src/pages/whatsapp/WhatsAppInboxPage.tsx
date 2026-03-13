import AppLayout from '@/components/AppLayout';
import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Search, Send, Paperclip, Image, FileText, Mic, UserPlus, Phone, Mail, X } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { fetchChats, fetchMessages, sendMessage, getServerUrl } from '@/lib/whatsappApi';
import { io, Socket } from 'socket.io-client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface Conversation {
  id: string;
  phone: string;
  contact_name: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  contact_id: string | null;
}

interface Message {
  id: string;
  sender: string;
  content: string;
  message_type: string;
  media_url: string;
  created_at: string;
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
  const [clientForm, setClientForm] = useState({ full_name: '', phone: '', email: '' });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load server URL and conversations
  useEffect(() => {
    if (!empresaId) return;
    loadConversations();
  }, [empresaId]);

  // Socket.IO connection
  useEffect(() => {
    if (!serverUrl) return;
    const socket = io(serverUrl, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('nova_mensagem', async (data: any) => {
      const phone = data.from || data.number || '';
      const content = data.body || data.message || '';

      // Save to DB
      const conv = conversations.find(c => c.phone === phone);
      if (conv) {
        await (supabase.from('whatsapp_messages').insert({
          conversation_id: conv.id,
          empresa_id: empresaId,
          sender: 'them',
          content,
          message_type: 'text',
        }) as any);

        await (supabase.from('whatsapp_conversations').update({
          last_message: content,
          last_message_at: new Date().toISOString(),
          unread_count: (conv.unread_count || 0) + 1,
        }).eq('id', conv.id) as any);

        if (activeConv?.id === conv.id) {
          setMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            sender: 'them',
            content,
            message_type: 'text',
            media_url: '',
            created_at: new Date().toISOString(),
          }]);
        }

        setConversations(prev => prev.map(c =>
          c.id === conv.id
            ? { ...c, last_message: content, last_message_at: new Date().toISOString(), unread_count: c.id === activeConv?.id ? 0 : c.unread_count + 1 }
            : c
        ));
      } else {
        // New conversation
        loadConversations();
      }

      toast.info(`Nova mensagem de ${data.name || phone}`);
    });

    return () => { socket.disconnect(); };
  }, [serverUrl, conversations, activeConv, empresaId]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = async () => {
    try {
      const url = await getServerUrl(empresaId);
      setServerUrl(url);

      // Load from DB first
      const { data: dbConvs } = await (supabase
        .from('whatsapp_conversations')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('last_message_at', { ascending: false }) as any);

      if (dbConvs?.length) {
        setConversations(dbConvs);
      }

      // Sync from WhatsApp server
      try {
        const chats = await fetchChats(url);
        if (Array.isArray(chats)) {
          for (const chat of chats) {
            const phone = chat.id?.user || chat.number || '';
            const name = chat.name || chat.pushname || phone;
            const existing = dbConvs?.find((c: any) => c.phone === phone);

            if (!existing) {
              await (supabase.from('whatsapp_conversations').insert({
                empresa_id: empresaId,
                phone,
                contact_name: name,
                last_message: chat.lastMessage?.body || '',
                last_message_at: chat.lastMessage?.timestamp ? new Date(chat.lastMessage.timestamp * 1000).toISOString() : new Date().toISOString(),
                unread_count: chat.unreadCount || 0,
              }) as any);
            }
          }

          // Reload
          const { data: updated } = await (supabase
            .from('whatsapp_conversations')
            .select('*')
            .eq('empresa_id', empresaId)
            .order('last_message_at', { ascending: false }) as any);
          if (updated) setConversations(updated);
        }
      } catch {
        // Server might be offline, use DB data
      }
    } catch (err) {
      console.error('Error loading conversations:', err);
    }
  };

  const openConversation = async (conv: Conversation) => {
    setActiveConv(conv);
    setLoading(true);

    // Mark as read
    await (supabase.from('whatsapp_conversations').update({ unread_count: 0 }).eq('id', conv.id) as any);
    setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unread_count: 0 } : c));

    // Load messages from DB
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
        const serverMsgs = await fetchMessages(serverUrl, conv.phone);
        if (Array.isArray(serverMsgs)) {
          const mapped = serverMsgs.map((m: any) => ({
            id: m.id || crypto.randomUUID(),
            sender: m.fromMe ? 'me' : 'them',
            content: m.body || '',
            message_type: m.type || 'text',
            media_url: m.mediaUrl || '',
            created_at: m.timestamp ? new Date(m.timestamp * 1000).toISOString() : new Date().toISOString(),
          }));
          setMessages(mapped);

          // Save to DB
          for (const msg of mapped) {
            await (supabase.from('whatsapp_messages').insert({
              conversation_id: conv.id,
              empresa_id: empresaId,
              sender: msg.sender,
              content: msg.content,
              message_type: msg.message_type,
              media_url: msg.media_url,
            }) as any);
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

    // Optimistic update
    const newMsg: Message = {
      id: crypto.randomUUID(),
      sender: 'me',
      content: text,
      message_type: 'text',
      media_url: '',
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, newMsg]);

    try {
      await sendMessage(serverUrl, activeConv.phone, text);

      await (supabase.from('whatsapp_messages').insert({
        conversation_id: activeConv.id,
        empresa_id: empresaId,
        sender: 'me',
        content: text,
        message_type: 'text',
      }) as any);

      await (supabase.from('whatsapp_conversations').update({
        last_message: text,
        last_message_at: new Date().toISOString(),
      }).eq('id', activeConv.id) as any);

      setConversations(prev => prev.map(c =>
        c.id === activeConv.id ? { ...c, last_message: text, last_message_at: new Date().toISOString() } : c
      ));
    } catch {
      toast.error('Erro ao enviar mensagem');
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

    // Create whatsapp contact linked to client
    await (supabase.from('whatsapp_contacts').insert({
      empresa_id: empresaId,
      client_id: data.id,
      name: clientForm.full_name,
      phone: clientForm.phone,
      email: clientForm.email,
    }) as any);

    // Link conversation to contact
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

  const filteredConvs = conversations.filter(c =>
    !search || c.contact_name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)
  );

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      const now = new Date();
      if (d.toDateString() === now.toDateString()) return format(d, 'HH:mm');
      return format(d, 'dd/MM', { locale: ptBR });
    } catch { return ''; }
  };

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-3.5rem)] bg-background">
        {/* Column 1: Conversations */}
        <div className="w-[340px] border-r flex flex-col bg-card shrink-0">
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar conversa..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>
          <ScrollArea className="flex-1">
            {filteredConvs.map((conv) => (
              <div
                key={conv.id}
                onClick={() => openConversation(conv)}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors border-b border-border/30 ${activeConv?.id === conv.id ? 'bg-muted' : ''}`}
              >
                <Avatar className="h-11 w-11 shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                    {conv.contact_name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm truncate">{conv.contact_name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{formatTime(conv.last_message_at)}</span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-xs text-muted-foreground truncate pr-2">{conv.last_message || 'Sem mensagens'}</p>
                    {conv.unread_count > 0 && (
                      <Badge className="h-5 min-w-5 flex items-center justify-center rounded-full text-[10px] bg-primary text-primary-foreground shrink-0">
                        {conv.unread_count}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
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
              {/* Chat header */}
              <div className="h-14 flex items-center gap-3 px-4 border-b bg-card shrink-0">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                    {activeConv.contact_name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{activeConv.contact_name}</p>
                  <p className="text-xs text-muted-foreground">{activeConv.phone}</p>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="max-w-3xl mx-auto space-y-2">
                  {loading && <p className="text-center text-muted-foreground text-sm py-8">Carregando...</p>}
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                        msg.sender === 'me'
                          ? 'bg-primary text-primary-foreground rounded-br-md'
                          : 'bg-muted rounded-bl-md'
                      }`}>
                        {msg.media_url && (
                          <div className="mb-1">
                            {msg.message_type === 'image' ? (
                              <img src={msg.media_url} alt="" className="rounded-lg max-w-full" />
                            ) : (
                              <a href={msg.media_url} target="_blank" rel="noopener noreferrer" className="underline text-xs">
                                📎 Anexo
                              </a>
                            )}
                          </div>
                        )}
                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                        <p className={`text-[10px] mt-1 ${msg.sender === 'me' ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                          {formatTime(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Send bar */}
              <div className="p-3 border-t bg-card flex items-center gap-2 shrink-0">
                <Button variant="ghost" size="icon" className="shrink-0" onClick={() => fileInputRef.current?.click()}>
                  <Paperclip className="h-5 w-5 text-muted-foreground" />
                </Button>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*,.pdf" />
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
                <p className="text-sm mt-1">Selecione uma conversa para começar</p>
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
                  {activeConv.contact_name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <p className="font-semibold text-base">{activeConv.contact_name}</p>

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
                      full_name: activeConv.contact_name,
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
