import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, X, FileText, DollarSign, RefreshCw, Paperclip, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { sendMessage, getServerUrl } from '@/lib/whatsappApi';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { CrmLead } from './CrmKanbanCard';
import MessageBubble from '@/components/whatsapp/MessageBubble';

interface Message {
  id: string;
  sender: string;
  content: string;
  message_type: string;
  media_url: string;
  created_at: string;
  whatsapp_msg_id?: string;
  reply_to_content?: string;
  reply_to_id?: string;
}

interface CrmWhatsAppDrawerProps {
  open: boolean;
  onClose: () => void;
  lead: CrmLead | null;
  empresaId: string;
  onSendQuote: (lead: CrmLead) => void;
  onConvert: (lead: CrmLead) => void;
  onFollowUp: (lead: CrmLead) => void;
}

export default function CrmWhatsAppDrawer({ open, onClose, lead, empresaId, onSendQuote, onConvert, onFollowUp }: CrmWhatsAppDrawerProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgText, setMsgText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [serverUrl, setServerUrl] = useState('');
  const [agentName, setAgentName] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get agent name
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        const displayName = data.user.user_metadata?.display_name || '';
        setAgentName(displayName || (data.user.email?.split('@')[0] || '').replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
      }
    });
  }, []);

  // Load server URL
  useEffect(() => {
    if (!empresaId) return;
    getServerUrl(empresaId).then(setServerUrl);
  }, [empresaId]);

  // Load messages when lead changes
  useEffect(() => {
    if (!open || !lead?.client_phone || !empresaId) {
      setMessages([]);
      return;
    }
    loadMessages();
  }, [open, lead?.id]);

  // Realtime messages
  useEffect(() => {
    if (!open || !lead?.client_phone || !empresaId) return;
    const phone = lead.client_phone.replace(/\D/g, '');
    
    const channel = supabase
      .channel(`crm-chat-${lead.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'whatsapp_messages',
        filter: `empresa_id=eq.${empresaId}`,
      }, (payload: any) => {
        const newRow = payload.new;
        // Check if this message belongs to the current conversation
        if (newRow.sender !== 'them') return;
        // Match by conversation_id (we need to check)
        setMessages(prev => {
          if (prev.some(m => m.id === newRow.id)) return prev;
          return [...prev, {
            id: newRow.id,
            sender: newRow.sender,
            content: newRow.content || '',
            message_type: newRow.message_type || 'chat',
            media_url: newRow.media_url || '',
            created_at: newRow.created_at,
            whatsapp_msg_id: newRow.whatsapp_msg_id || '',
          }];
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [open, lead?.id, empresaId]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when drawer opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 300);
  }, [open]);

  const loadMessages = async () => {
    if (!lead || !empresaId) return;
    setLoading(true);
    const phone = (lead.client_phone || '').replace(/\D/g, '');

    let convId: string | null = null;

    // Try matching by phone first
    if (phone && phone.length >= 8) {
      const { data: convs } = await (supabase
        .from('whatsapp_conversations')
        .select('id')
        .eq('empresa_id', empresaId)
        .or(`phone.eq.${phone},phone.ilike.%${phone.slice(-8)}%`)
        .order('last_message_at', { ascending: false })
        .limit(1) as any);
      if (convs?.[0]) convId = convs[0].id;
    }

    // Fallback: match by contact_name
    if (!convId && lead.client_name) {
      const { data: convs } = await (supabase
        .from('whatsapp_conversations')
        .select('id')
        .eq('empresa_id', empresaId)
        .ilike('contact_name', lead.client_name)
        .order('last_message_at', { ascending: false })
        .limit(1) as any);
      if (convs?.[0]) convId = convs[0].id;
    }

    if (convId) {
      const { data: msgs } = await (supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true })
        .limit(100) as any);
      setMessages(msgs || []);
    } else {
      setMessages([]);
    }
    setLoading(false);
  };

  const handleSend = async () => {
    if (!msgText.trim() || !lead?.client_phone || !serverUrl) return;
    const text = msgText.trim();
    setMsgText('');
    setSending(true);

    // Optimistic
    const optimistic: Message = {
      id: crypto.randomUUID(),
      sender: 'me',
      content: text,
      message_type: 'chat',
      media_url: '',
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);

    try {
      const targetPhone = lead.client_phone.replace(/\D/g, '');
      const whatsappText = agentName ? `*${agentName}:*\n${text}` : text;
      await sendMessage(serverUrl, empresaId, targetPhone, whatsappText);

      // Find or create conversation and persist message
      const phone = targetPhone;
      const { data: convs } = await (supabase
        .from('whatsapp_conversations')
        .select('id')
        .eq('empresa_id', empresaId)
        .or(`phone.eq.${phone},phone.ilike.%${phone.slice(-8)}%`)
        .limit(1) as any);

      if (convs?.[0]) {
        await (supabase.from('whatsapp_messages').insert({
          conversation_id: convs[0].id,
          empresa_id: empresaId,
          sender: 'me',
          content: text,
          message_type: 'chat',
        }) as any);
        await (supabase.from('whatsapp_conversations').update({
          last_message: text,
          last_message_at: new Date().toISOString(),
        }).eq('id', convs[0].id) as any);
      }
    } catch (err) {
      toast.error('Erro ao enviar mensagem');
    }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!lead) return null;

  const initials = lead.client_name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent className="w-[420px] sm:w-[460px] p-0 flex flex-col" side="right">
        {/* Header */}
        <div className="flex items-center gap-3 p-3 border-b bg-card shrink-0 pr-12">
          <Avatar className="h-9 w-9">
            {lead.profile_pic && <AvatarImage src={lead.profile_pic} />}
            <AvatarFallback className="text-xs font-bold">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-foreground truncate">{lead.client_name}</h3>
            <p className="text-[10px] text-muted-foreground">{lead.client_phone}</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 p-2 border-b bg-muted/30 shrink-0 flex-wrap">
          <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1" onClick={() => onSendQuote(lead)}>
            <FileText className="h-3 w-3" />
            {lead.has_quote ? 'Ver Cotação' : 'Criar Cotação'}
          </Button>
          {lead.status === 'draft' && (
            <Button size="sm" variant="default" className="h-6 text-[10px] gap-1" onClick={() => onConvert(lead)}>
              <DollarSign className="h-3 w-3" />
              Converter
            </Button>
          )}
          <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1" onClick={() => lead && onFollowUp(lead)}>
            <RefreshCw className="h-3 w-3" />
            Follow-up
          </Button>
          <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1" onClick={() => {
            setMsgText('Olá! Gostaria de confirmar seu interesse na viagem. Podemos conversar?');
            setTimeout(() => inputRef.current?.focus(), 100);
          }}>
            <MessageCircle className="h-3 w-3" />
            Confirmar Interesse
          </Button>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 px-3 py-2">
          <div
            className="space-y-1 min-h-full"
            style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'200\' height=\'200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cdefs%3E%3Cpattern id=\'a\' patternUnits=\'userSpaceOnUse\' width=\'40\' height=\'40\'%3E%3Cpath d=\'M0 20h40M20 0v40\' stroke=\'%23f0f0f0\' stroke-width=\'.5\' fill=\'none\' opacity=\'.3\'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width=\'200\' height=\'200\' fill=\'url(%23a)\'/%3E%3C/svg%3E")' }}
          >
            {loading ? (
              <div className="flex items-center justify-center py-12 text-xs text-muted-foreground">
                Carregando mensagens...
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-xs text-muted-foreground gap-2">
                <MessageCircle className="h-8 w-8 opacity-30" />
                <span>Nenhuma conversa encontrada</span>
                <span className="text-[10px]">Envie a primeira mensagem abaixo</span>
              </div>
            ) : (
              messages.map(msg => (
                <MessageBubble
                  key={msg.id}
                  msg={msg}
                  serverUrl={serverUrl}
                  empresaId={empresaId}
                  onReply={() => {}}
                />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="flex items-center gap-2 p-2 border-t bg-card shrink-0">
          <Input
            ref={inputRef}
            value={msgText}
            onChange={e => setMsgText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite uma mensagem..."
            className="text-xs h-8"
            disabled={sending}
          />
          <Button size="icon" className="h-8 w-8 shrink-0 bg-emerald-600 hover:bg-emerald-700" onClick={handleSend} disabled={!msgText.trim() || sending}>
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
