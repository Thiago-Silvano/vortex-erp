import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';

/**
 * Floating WhatsApp access button, present on every page except the WhatsApp
 * screens themselves. Shows a live unread-messages badge (sum of unread_count
 * across conversations of the active company) via a Supabase realtime
 * subscription. Clicking navigates to the WhatsApp inbox while storing the
 * current route so the inbox "Voltar" button can return to it.
 */
export default function WhatsAppFab() {
  const location = useLocation();
  const navigate = useNavigate();
  const { activeCompany } = useCompany();
  const [unread, setUnread] = useState(0);

  const isOnWhatsApp = location.pathname.startsWith('/whatsapp');

  useEffect(() => {
    if (!activeCompany?.id) return;
    let cancelled = false;

    const fetchUnread = async () => {
      const { data } = await supabase
        .from('whatsapp_conversations')
        .select('unread_count')
        .eq('empresa_id', activeCompany.id);
      if (cancelled) return;
      const total = (data || []).reduce(
        (sum: number, c: any) => sum + (c.unread_count || 0),
        0,
      );
      setUnread(total);
    };

    fetchUnread();

    const channel = supabase
      .channel('whatsapp-fab-unread')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_conversations',
          filter: `empresa_id=eq.${activeCompany.id}`,
        },
        () => fetchUnread(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [activeCompany?.id]);

  if (isOnWhatsApp) return null;

  const handleClick = () => {
    navigate('/whatsapp', { state: { from: location.pathname } });
  };

  const badgeLabel = unread > 99 ? '99+' : String(unread);

  return (
    <button
      onClick={handleClick}
      aria-label="Abrir WhatsApp"
      title="Abrir WhatsApp"
      className="fixed bottom-6 right-6 z-40 flex h-[84px] w-[84px] items-center justify-center rounded-full shadow-lg transition-transform duration-200 hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
      style={{ backgroundColor: '#25D366' }}
    >
      {/* WhatsApp glyph */}
      <svg
        viewBox="0 0 32 32"
        className="h-[42px] w-[42px]"
        fill="#ffffff"
        aria-hidden="true"
      >
        <path d="M16.004 3.2c-7.06 0-12.8 5.74-12.8 12.8 0 2.26.6 4.46 1.73 6.4L3.2 28.8l6.57-1.72a12.74 12.74 0 0 0 6.23 1.6h.01c7.06 0 12.8-5.74 12.8-12.8s-5.75-12.68-12.81-12.68zm0 23.04h-.01a10.6 10.6 0 0 1-5.4-1.48l-.39-.23-3.9 1.02 1.04-3.8-.25-.4a10.58 10.58 0 0 1-1.62-5.65c0-5.86 4.77-10.63 10.64-10.63 2.84 0 5.51 1.11 7.52 3.12a10.56 10.56 0 0 1 3.11 7.52c0 5.87-4.77 10.63-10.64 10.63zm5.83-7.96c-.32-.16-1.89-.93-2.18-1.04-.29-.11-.5-.16-.71.16-.21.32-.82 1.04-1 1.25-.18.21-.37.24-.69.08-.32-.16-1.35-.5-2.57-1.58-.95-.85-1.59-1.9-1.78-2.22-.18-.32-.02-.49.14-.65.14-.14.32-.37.48-.55.16-.19.21-.32.32-.53.11-.21.05-.4-.03-.56-.08-.16-.71-1.72-.98-2.35-.26-.62-.52-.54-.71-.55l-.61-.01c-.21 0-.55.08-.84.4-.29.32-1.1 1.08-1.1 2.63s1.13 3.05 1.29 3.26c.16.21 2.22 3.39 5.38 4.76.75.32 1.34.51 1.8.66.76.24 1.45.21 1.99.13.61-.09 1.89-.77 2.16-1.52.27-.74.27-1.38.19-1.51-.08-.13-.29-.21-.61-.37z" />
      </svg>

      {unread > 0 && (
        <span className="absolute -top-1 -right-1 flex min-w-[30px] h-[30px] items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white shadow">
          {badgeLabel}
        </span>
      )}
    </button>
  );
}