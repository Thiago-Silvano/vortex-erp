import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Bell, X, FileText, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  reference_id: string | null;
  reference_type: string;
  is_read: boolean;
  dismissed: boolean;
  created_at: string;
}

export default function NotificationBell() {
  const { activeCompany } = useCompany();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [seeded, setSeeded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id || null));
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Seed notifications for DS-160 forms submitted this month that don't have a notification yet
  useEffect(() => {
    if (!activeCompany?.id || !userId || seeded) return;

    const seedNotifications = async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      // Get DS-160 forms submitted this month
      const { data: forms } = await supabase
        .from('ds160_forms')
        .select('id, submitted_at, client_id')
        .eq('empresa_id', activeCompany.id)
        .eq('status', 'submitted')
        .gte('submitted_at', startOfMonth) as any;

      if (!forms || forms.length === 0) { setSeeded(true); return; }

      // Get existing notifications for these forms
      const formIds = forms.map((f: any) => f.id);
      const { data: existing } = await supabase
        .from('notifications' as any)
        .select('reference_id')
        .eq('empresa_id', activeCompany.id)
        .eq('type', 'ds160_submitted')
        .in('reference_id', formIds);

      const existingIds = new Set((existing || []).map((n: any) => n.reference_id));
      const toCreate = forms.filter((f: any) => !existingIds.has(f.id));

      if (toCreate.length > 0) {
        // Get client names
        const clientIds = [...new Set(toCreate.map((f: any) => f.client_id))];
        const { data: clients } = await supabase
          .from('clients')
          .select('id, full_name')
          .in('id', clientIds);

        const clientMap = new Map((clients || []).map((c: any) => [c.id, c.full_name]));

        const rows = toCreate.map((f: any) => ({
          empresa_id: activeCompany.id,
          user_id: userId,
          type: 'ds160_submitted',
          title: 'DS-160 preenchido',
          message: `${clientMap.get(f.client_id) || 'Cliente'} concluiu o formulário DS-160`,
          reference_id: f.id,
          reference_type: 'ds160_form',
          is_read: false,
          dismissed: false,
          created_at: f.submitted_at,
        }));

        await (supabase.from('notifications' as any).insert(rows) as any);
      }

      setSeeded(true);
    };

    seedNotifications();
  }, [activeCompany?.id, userId, seeded]);

  // Fetch notifications
  useEffect(() => {
    if (!activeCompany?.id || !seeded) return;

    const fetch = async () => {
      const { data } = await supabase
        .from('notifications' as any)
        .select('*')
        .eq('empresa_id', activeCompany.id)
        .eq('dismissed', false)
        .order('created_at', { ascending: false })
        .limit(50);

      if (data) setNotifications(data as unknown as Notification[]);
    };

    fetch();

    // Subscribe to realtime
    const channel = supabase
      .channel('notifications-bell')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `empresa_id=eq.${activeCompany.id}`,
      }, (payload) => {
        setNotifications(prev => [payload.new as unknown as Notification, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeCompany?.id, seeded]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAsRead = async (id: string) => {
    await (supabase.from('notifications' as any).update({ is_read: true } as any).eq('id', id) as any);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const dismiss = async (id: string) => {
    await (supabase.from('notifications' as any).update({ dismissed: true } as any).eq('id', id) as any);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleClick = (n: Notification) => {
    markAsRead(n.id);
    if (n.reference_type === 'ds160_form' && n.reference_id) {
      navigate('/clients');
    }
  };

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9 rounded-lg border-border/50 relative"
        onClick={() => {
          setOpen(!open);
          // Mark all as read when opening
          if (!open && unreadCount > 0) {
            const unread = notifications.filter(n => !n.is_read);
            unread.forEach(n => markAsRead(n.id));
          }
        }}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-11 w-80 max-h-96 bg-popover border border-border rounded-xl shadow-xl z-50 flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Notificações</h3>
            {notifications.length > 0 && (
              <button
                onClick={async () => {
                  for (const n of notifications) await dismiss(n.id);
                }}
                className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Limpar todas
              </button>
            )}
          </div>

          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Nenhuma notificação
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  className={`px-4 py-3 border-b border-border/50 flex gap-3 cursor-pointer hover:bg-accent/50 transition-colors ${!n.is_read ? 'bg-primary/5' : ''}`}
                  onClick={() => handleClick(n)}
                >
                  <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0 mt-0.5">
                    <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground leading-tight">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                      {format(new Date(n.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      dismiss(n.id);
                    }}
                    className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent shrink-0"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
