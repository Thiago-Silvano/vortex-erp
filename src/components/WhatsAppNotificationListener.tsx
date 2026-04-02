import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { MessageSquare, X } from 'lucide-react';

interface NotificationData {
  contactName: string;
  message: string;
  conversationId: string;
  phone: string;
}

export default function WhatsAppNotificationListener() {
  const location = useLocation();
  const navigate = useNavigate();
  const { activeCompany } = useCompany();
  const [notification, setNotification] = useState<NotificationData | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isOnWhatsApp = location.pathname.startsWith('/whatsapp');

  useEffect(() => {
    if (!activeCompany?.id) return;

    const channel = supabase
      .channel('whatsapp-global-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_messages',
        },
        async (payload: any) => {
          const msg = payload.new;
          // Only notify for incoming messages, not sent ones
          if (msg.direction !== 'incoming') return;
          // Don't notify if already on whatsapp
          if (isOnWhatsApp) return;

          // Get conversation info
          const { data: conv } = await supabase
            .from('whatsapp_conversations' as any)
            .select('id, contact_name, phone')
            .eq('id', msg.conversation_id)
            .single();

          if (!conv) return;

          const convData = conv as any;

          setNotification({
            contactName: convData.contact_name || convData.phone || 'Contato',
            message: msg.body?.substring(0, 80) || (msg.media_type ? '📎 Mídia' : 'Nova mensagem'),
            conversationId: convData.id,
            phone: convData.phone,
          });

          // Clear previous timer
          if (timerRef.current) clearTimeout(timerRef.current);
          // Auto-dismiss after 4 seconds
          timerRef.current = setTimeout(() => {
            setNotification(null);
          }, 4000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [activeCompany?.id, isOnWhatsApp]);

  // Reset when navigating to whatsapp
  useEffect(() => {
    if (isOnWhatsApp && notification) {
      setNotification(null);
    }
  }, [isOnWhatsApp]);

  const handleClick = () => {
    if (!notification) return;

    // Trigger form saves by dispatching a custom event that forms can listen to
    // Then navigate after a small delay to let saves complete
    const saveEvent = new CustomEvent('whatsapp-navigate-save');
    window.dispatchEvent(saveEvent);

    setTimeout(() => {
      navigate('/whatsapp', {
        state: { openConversationId: notification.conversationId, openPhone: notification.phone },
      });
      setNotification(null);
    }, 300);
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNotification(null);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  if (!notification) return null;

  return (
    <div
      onClick={handleClick}
      className="fixed bottom-6 right-6 z-[9999] flex items-start gap-3 max-w-sm w-full p-4 rounded-xl shadow-2xl cursor-pointer animate-in slide-in-from-bottom-5 fade-in duration-300"
      style={{
        background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
      }}
    >
      {/* WhatsApp icon */}
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
        <MessageSquare className="h-5 w-5 text-white" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-bold text-white truncate">
            {notification.contactName}
          </p>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-white/70 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs text-white/90 mt-0.5 line-clamp-2">
          {notification.message}
        </p>
        <p className="text-[10px] text-white/60 mt-1">
          Clique para abrir a conversa
        </p>
      </div>

      {/* Notification badge */}
      <div className="absolute -top-2 -left-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
        <span className="text-[10px] font-bold text-white">1</span>
      </div>
    </div>
  );
}
