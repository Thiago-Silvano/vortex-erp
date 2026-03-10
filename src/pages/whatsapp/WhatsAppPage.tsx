import { useState, useEffect, useRef } from 'react';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Send, Paperclip, Search, Plus, User, Phone, ShoppingCart, Clock, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

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
  delivery_status: string;
  created_at: string;
}

const statusLabels: Record<string, string> = {
  new_lead: 'Novo Lead',
  in_progress: 'Em Atendimento',
  waiting_client: 'Aguardando Cliente',
  waiting_quote: 'Aguardando Orçamento',
  finished: 'Finalizado',
};

const statusColors: Record<string, string> = {
  new_lead: 'bg-blue-500',
  in_progress: 'bg-green-500',
  waiting_client: 'bg-yellow-500',
  waiting_quote: 'bg-orange-500',
  finished: 'bg-muted-foreground',
};

export default function WhatsAppPage() {
  const { activeCompany } = useCompany();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [search, setSearch] = useState('');
  const [quickReplies, setQuickReplies] = useState<{ shortcut: string; content: string }[]>([]);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email || ''));
  }, []);

  const fetchConversations = async () => {
    let q = supabase.from('whatsapp_conversations').select('*').order('last_message_at', { ascending: false });
    if (activeCompany?.id) q = q.eq('empresa_id', activeCompany.id);
    const { data } = await q;
    if (data) setConversations(data as Conversation[]);
  };

  const fetchMessages = async (convId: string) => {
    const { data } = await supabase.from('whatsapp_messages').select('*').eq('conversation_id', convId).order('created_at');
    if (data) setMessages(data as Message[]);
  };

  const fetchQuickReplies = async () => {
    let q = supabase.from('whatsapp_quick_replies').select('shortcut, content');
    if (activeCompany?.id) q = q.eq('empresa_id', activeCompany.id);
    const { data } = await q;
    if (data) setQuickReplies(data);
  };

  useEffect(() => { fetchConversations(); fetchQuickReplies(); }, [activeCompany?.id]);

  useEffect(() => {
    if (selectedConv) fetchMessages(selectedConv.id);
  }, [selectedConv?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('whatsapp-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_messages' }, (payload) => {
        if (selectedConv && (payload.new as any)?.conversation_id === selectedConv.id) {
          fetchMessages(selectedConv.id);
        }
        fetchConversations();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_conversations' }, () => {
        fetchConversations();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedConv?.id, activeCompany?.id]);

  // Polling fallback: refresh conversations every 5s and messages every 3s
  useEffect(() => {
    const convInterval = setInterval(() => {
      fetchConversations();
    }, 5000);
    return () => clearInterval(convInterval);
  }, [activeCompany?.id]);

  useEffect(() => {
    if (!selectedConv) return;
    const msgInterval = setInterval(() => {
      fetchMessages(selectedConv.id);
    }, 3000);
    return () => clearInterval(msgInterval);
  }, [selectedConv?.id]);

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedConv) return;
    const senderName = userEmail.split('@')[0] || 'Agente';

    try {
      const { data: { session } } = await supabase.auth.getSession();
      await supabase.functions.invoke('whatsapp-send', {
        body: {
          conversation_id: selectedConv.id,
          content: newMessage.trim(),
          message_type: 'text',
          sender_name: senderName,
          empresa_id: activeCompany?.id,
        },
      });
    } catch {
      // Fallback: save locally if edge function fails
      await supabase.from('whatsapp_messages').insert({
        conversation_id: selectedConv.id,
        sender_type: 'agent',
        sender_name: senderName,
        content: newMessage.trim(),
        message_type: 'text',
      });
      await supabase.from('whatsapp_conversations').update({
        last_message: newMessage.trim(),
        last_message_at: new Date().toISOString(),
      }).eq('id', selectedConv.id);
    }

    setNewMessage('');
    fetchMessages(selectedConv.id);
    fetchConversations();
  };

  const handleMessageChange = (val: string) => {
    setNewMessage(val);
    if (val.startsWith('/')) {
      setShowQuickReplies(true);
    } else {
      setShowQuickReplies(false);
    }
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

  const filteredConversations = conversations.filter(c =>
    c.client_name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search) ||
    c.last_message.toLowerCase().includes(search.toLowerCase())
  );

  const filteredQuickReplies = quickReplies.filter(qr =>
    qr.shortcut.toLowerCase().includes(newMessage.toLowerCase().replace('/', ''))
  );

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
        {/* Column 1: Conversation List */}
        <div className="w-80 border-r flex flex-col bg-background">
          <div className="p-3 border-b space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <MessageSquare className="h-5 w-5" /> Conversas
              </h2>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-8 h-8 text-sm" placeholder="Buscar conversa..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>

          <ScrollArea className="flex-1">
            {filteredConversations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhuma conversa</p>
            ) : filteredConversations.map(conv => (
              <div
                key={conv.id}
                className={`p-3 border-b cursor-pointer hover:bg-muted/50 transition-colors ${selectedConv?.id === conv.id ? 'bg-muted' : ''}`}
                onClick={() => setSelectedConv(conv)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-foreground truncate">
                        {conv.client_name || 'Cliente desconhecido'}
                      </span>
                      {conv.unread_count > 0 && (
                        <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4">{conv.unread_count}</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{conv.phone}</p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{conv.last_message}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[10px] text-muted-foreground">
                      {conv.last_message_at ? format(new Date(conv.last_message_at), 'HH:mm', { locale: ptBR }) : ''}
                    </span>
                    <div className={`w-2 h-2 rounded-full ${statusColors[conv.status] || 'bg-muted'}`} />
                  </div>
                </div>
                {conv.assigned_user_name && (
                  <p className="text-[10px] text-muted-foreground mt-1">👤 {conv.assigned_user_name}</p>
                )}
              </div>
            ))}
          </ScrollArea>
        </div>

        {/* Column 2: Chat Area */}
        <div className="flex-1 flex flex-col bg-background">
          {!selectedConv ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center space-y-2">
                <MessageSquare className="h-12 w-12 mx-auto opacity-30" />
                <p className="text-sm">Selecione uma conversa para começar</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="p-3 border-b flex items-center justify-between bg-muted/30">
                <div>
                  <h3 className="font-semibold text-foreground">{selectedConv.client_name || 'Cliente desconhecido'}</h3>
                  <p className="text-xs text-muted-foreground">{selectedConv.phone}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={selectedConv.status} onValueChange={updateConvStatus}>
                    <SelectTrigger className="h-8 text-xs w-44"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusLabels).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-3 max-w-3xl mx-auto">
                  {messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.sender_type === 'agent' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-lg px-3 py-2 ${
                        msg.sender_type === 'agent'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-foreground'
                      }`}>
                        {msg.sender_type === 'agent' && (
                          <p className="text-[10px] font-semibold opacity-80 mb-0.5">[{msg.sender_name}]</p>
                        )}
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        {msg.media_url && (
                          <a href={msg.media_url} target="_blank" rel="noopener" className="text-xs underline mt-1 block">
                            📎 {msg.message_type === 'image' ? 'Ver imagem' : 'Ver arquivo'}
                          </a>
                        )}
                        <div className="flex items-center justify-end gap-1 mt-1">
                          <span className="text-[10px] opacity-60">{format(new Date(msg.created_at), 'HH:mm')}</span>
                          {msg.sender_type === 'agent' && (
                            <span className="text-[10px] opacity-60">
                              {msg.delivery_status === 'read' ? '✓✓' : msg.delivery_status === 'delivered' ? '✓✓' : '✓'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Quick replies dropdown */}
              {showQuickReplies && filteredQuickReplies.length > 0 && (
                <div className="border-t bg-muted/50 max-h-40 overflow-y-auto">
                  {filteredQuickReplies.map(qr => (
                    <div key={qr.shortcut} className="px-4 py-2 hover:bg-muted cursor-pointer text-sm" onClick={() => applyQuickReply(qr.content)}>
                      <span className="font-mono text-primary">/{qr.shortcut}</span>
                      <span className="text-muted-foreground ml-2 truncate">{qr.content.substring(0, 60)}...</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Message input */}
              <div className="p-3 border-t flex gap-2">
                <Button size="icon" variant="ghost" className="shrink-0" title="Anexar arquivo">
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Input
                  value={newMessage}
                  onChange={e => handleMessageChange(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Digite uma mensagem... (use / para respostas rápidas)"
                  className="flex-1"
                />
                <Button size="icon" onClick={handleSend} disabled={!newMessage.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Column 3: Client Info */}
        {selectedConv && (
          <div className="w-72 border-l bg-muted/20 p-4 space-y-4 hidden lg:block">
            <div className="text-center space-y-2">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <User className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">{selectedConv.client_name || 'Desconhecido'}</h3>
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <Phone className="h-3 w-3" /> {selectedConv.phone}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <Badge variant="outline" className="text-xs">{statusLabels[selectedConv.status]}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Responsável</span>
                <span className="text-foreground text-xs">{selectedConv.assigned_user_name || '—'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Prioridade</span>
                <Badge variant="outline" className="text-xs capitalize">{selectedConv.priority}</Badge>
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t">
              {!selectedConv.client_id && (
                <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => toast.info('Cadastrar cliente com telefone: ' + selectedConv.phone)}>
                  <UserPlus className="h-3 w-3 mr-1" /> Criar Cliente
                </Button>
              )}
              <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => navigate('/sales/new', { state: { quoteData: { clientName: selectedConv.client_name } } })}>
                <ShoppingCart className="h-3 w-3 mr-1" /> Criar Venda
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
