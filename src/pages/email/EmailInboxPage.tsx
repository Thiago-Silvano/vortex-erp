import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Inbox, Send, FileEdit, Archive, FileText, Search, Plus, Star,
  StarOff, Mail, MailOpen, Reply, Forward, Users, Paperclip, RefreshCw,
  ChevronLeft, Trash2, MoreHorizontal, AlertTriangle,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import EmailComposeModal from '@/components/email/EmailComposeModal';
import { cn } from '@/lib/utils';

type EmailFolder = 'inbox' | 'sent' | 'drafts' | 'archived';

interface EmailRow {
  id: string;
  from_name: string;
  from_email: string;
  to_emails: string[];
  cc_emails: string[];
  subject: string;
  body_html: string;
  body_text: string;
  folder: string;
  status: string;
  is_read: boolean;
  is_starred: boolean;
  sent_at: string | null;
  created_at: string;
  client_id: string | null;
  tracking_opened_at: string | null;
}

interface EmailAttachment {
  id: string;
  file_name: string;
  mime_type: string;
  file_url: string;
  file_size: number | null;
}

const FOLDERS = [
  { key: 'inbox' as EmailFolder, label: 'Inbox', icon: Inbox },
  { key: 'sent' as EmailFolder, label: 'Enviados', icon: Send },
  { key: 'drafts' as EmailFolder, label: 'Rascunhos', icon: FileEdit },
  { key: 'archived' as EmailFolder, label: 'Arquivados', icon: Archive },
];

export default function EmailInboxPage() {
  const { activeCompany } = useCompany();
  const [userId, setUserId] = useState<string | null>(null);
  const [hasSettings, setHasSettings] = useState<boolean | null>(null);
  const [emails, setEmails] = useState<EmailRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeFolder, setActiveFolder] = useState<EmailFolder>('inbox');
  const [selectedEmail, setSelectedEmail] = useState<EmailRow | null>(null);
  const [search, setSearch] = useState('');
  const [composeOpen, setComposeOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<EmailRow | null>(null);
  const [folderCounts, setFolderCounts] = useState<Record<string, number>>({});
  const [loadingBody, setLoadingBody] = useState(false);
  const [emailBody, setEmailBody] = useState<{ html: string; text: string } | null>(null);
  const [emailAttachments, setEmailAttachments] = useState<EmailAttachment[]>([]);

  // Get current user and check settings
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id || null;
      setUserId(uid);
      if (uid) {
        supabase.from('email_settings').select('id').eq('user_id', uid as any).maybeSingle()
          .then(({ data: s }) => setHasSettings(!!s));
      }
    });
  }, []);

  const fetchEmails = async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase
      .from('emails')
      .select('*')
      .eq('user_id', userId as any)
      .eq('folder', activeFolder)
      .order('created_at', { ascending: false })
      .limit(100);
    setEmails((data as any[]) || []);
    setLoading(false);
  };

  const fetchCounts = async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('emails')
      .select('folder, is_read')
      .eq('user_id', userId as any)
      .eq('is_read', false);
    const counts: Record<string, number> = {};
    (data || []).forEach((e: any) => {
      counts[e.folder] = (counts[e.folder] || 0) + 1;
    });
    setFolderCounts(counts);
  };

  const syncEmails = async () => {
    if (!userId || syncing) return;
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-emails', {
        body: { user_id: userId, empresa_id: activeCompany?.id },
      });
      if (error) throw error;
      const fetched = data?.fetched || 0;
      if (fetched > 0) {
        toast.success(`${fetched} novos emails sincronizados`);
      } else {
        toast.info('Nenhum email novo encontrado');
      }
      fetchEmails();
      fetchCounts();
    } catch (err: any) {
      toast.error('Erro ao sincronizar: ' + (err.message || 'Erro'));
    }
    setSyncing(false);
  };

  useEffect(() => { fetchEmails(); }, [userId, activeFolder]);
  useEffect(() => {
    if (!userId) return;
    fetchCounts();
    if (hasSettings) syncEmails();
  }, [userId, hasSettings]);

  const filteredEmails = useMemo(() => {
    if (!search) return emails;
    const q = search.toLowerCase();
    return emails.filter(e =>
      e.subject.toLowerCase().includes(q) ||
      e.from_name.toLowerCase().includes(q) ||
      e.from_email.toLowerCase().includes(q) ||
      e.body_text.toLowerCase().includes(q)
    );
  }, [emails, search]);

  const handleSelectEmail = async (email: EmailRow) => {
    setSelectedEmail(email);
    if (!email.is_read) {
      await supabase.from('emails').update({ is_read: true } as any).eq('id', email.id);
      setEmails(prev => prev.map(e => e.id === email.id ? { ...e, is_read: true } : e));
      fetchCounts();
    }
  };

  const handleStar = async (email: EmailRow, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from('emails').update({ is_starred: !email.is_starred } as any).eq('id', email.id);
    setEmails(prev => prev.map(em => em.id === email.id ? { ...em, is_starred: !em.is_starred } : em));
  };

  const handleArchive = async (email: EmailRow) => {
    await supabase.from('emails').update({ folder: 'archived' } as any).eq('id', email.id);
    setSelectedEmail(null);
    fetchEmails();
    fetchCounts();
    toast.success('Email arquivado');
  };

  const handleDelete = async (email: EmailRow) => {
    await supabase.from('emails').delete().eq('id', email.id);
    setSelectedEmail(null);
    fetchEmails();
    fetchCounts();
    toast.success('Email excluído');
  };

  const handleReply = (email: EmailRow) => {
    setReplyTo(email);
    setComposeOpen(true);
  };

  const handleComposeDone = () => {
    setComposeOpen(false);
    setReplyTo(null);
    fetchEmails();
    fetchCounts();
  };

  const getTrackingBadge = (email: EmailRow) => {
    if (email.folder !== 'sent') return null;
    if (email.tracking_opened_at) return <Badge variant="outline" className="text-xs bg-accent/20 text-accent-foreground border-accent/30">Aberto</Badge>;
    if (email.status === 'sent') return <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">Enviado</Badge>;
    return null;
  };

  // Show setup prompt if no settings configured
  if (hasSettings === false) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]">
          <div className="text-center max-w-md space-y-4">
            <AlertTriangle className="h-16 w-16 mx-auto text-muted-foreground/40" />
            <h2 className="text-xl font-semibold">Configure seu email</h2>
            <p className="text-muted-foreground">
              Para usar o módulo de email, configure sua conta IMAP/SMTP pessoal nas configurações.
            </p>
            <Button onClick={() => window.location.href = '/email/settings'} className="gap-2">
              <Mail className="h-4 w-4" /> Configurar Email
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
        {/* Left sidebar - Folders */}
        <div className="w-56 border-r bg-muted/30 flex flex-col shrink-0">
          <div className="p-3">
            <Button onClick={() => { setReplyTo(null); setComposeOpen(true); }} className="w-full gap-2">
              <Plus className="h-4 w-4" /> Novo Email
            </Button>
          </div>
          <Separator />
          <nav className="flex-1 p-2 space-y-1">
            {FOLDERS.map(f => (
              <button
                key={f.key}
                onClick={() => { setActiveFolder(f.key); setSelectedEmail(null); }}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                  activeFolder === f.key
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-muted'
                )}
              >
                <f.icon className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-left">{f.label}</span>
                {(folderCounts[f.key] || 0) > 0 && (
                  <Badge variant="secondary" className="text-xs h-5 min-w-[20px] justify-center">
                    {folderCounts[f.key]}
                  </Badge>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Center - Email list */}
        <div className={cn(
          'flex flex-col border-r',
          selectedEmail ? 'w-80 shrink-0' : 'flex-1'
        )}>
          <div className="p-3 border-b flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar emails..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-8 border-0 shadow-none focus-visible:ring-0 bg-transparent"
            />
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={syncEmails} disabled={syncing}>
              <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
            </Button>
          </div>
          <ScrollArea className="flex-1">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Carregando...</div>
            ) : filteredEmails.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Mail className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Nenhum email encontrado</p>
              </div>
            ) : (
              filteredEmails.map(email => (
                <div
                  key={email.id}
                  onClick={() => handleSelectEmail(email)}
                  className={cn(
                    'flex items-start gap-3 p-3 cursor-pointer border-b transition-colors hover:bg-muted/50',
                    selectedEmail?.id === email.id && 'bg-primary/5',
                    !email.is_read && 'bg-primary/5'
                  )}
                >
                  <button onClick={e => handleStar(email, e)} className="mt-1 shrink-0">
                    {email.is_starred
                      ? <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      : <StarOff className="h-4 w-4 text-muted-foreground/40" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn('text-sm truncate', !email.is_read && 'font-semibold')}>
                        {activeFolder === 'sent' ? (email.to_emails?.[0] || 'Sem dest.') : (email.from_name || email.from_email)}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {email.sent_at
                          ? format(new Date(email.sent_at), 'dd/MM HH:mm', { locale: ptBR })
                          : format(new Date(email.created_at), 'dd/MM HH:mm', { locale: ptBR })}
                      </span>
                    </div>
                    <p className={cn('text-sm truncate', !email.is_read ? 'text-foreground' : 'text-muted-foreground')}>
                      {email.subject || '(sem assunto)'}
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-muted-foreground truncate flex-1">
                        {email.body_text?.substring(0, 80)}
                      </p>
                      {getTrackingBadge(email)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </ScrollArea>
        </div>

        {/* Right - Email detail */}
        {selectedEmail && (
          <div className="flex-1 flex flex-col min-w-0">
            <div className="p-3 border-b flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedEmail(null)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm truncate">{selectedEmail.subject || '(sem assunto)'}</h3>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleReply(selectedEmail)} title="Responder">
                  <Reply className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleArchive(selectedEmail)} title="Arquivar">
                  <Archive className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(selectedEmail)} title="Excluir">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <ScrollArea className="flex-1 p-4">
              <div className="max-w-3xl">
                <div className="flex items-start gap-3 mb-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                    {(selectedEmail.from_name || selectedEmail.from_email).charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{selectedEmail.from_name || selectedEmail.from_email}</span>
                      <span className="text-xs text-muted-foreground">&lt;{selectedEmail.from_email}&gt;</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Para: {selectedEmail.to_emails?.join(', ')}
                      {selectedEmail.cc_emails?.length > 0 && ` | Cc: ${selectedEmail.cc_emails.join(', ')}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedEmail.sent_at
                        ? format(new Date(selectedEmail.sent_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })
                        : format(new Date(selectedEmail.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>

                <Separator className="mb-4" />

                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: selectedEmail.body_html || selectedEmail.body_text?.replace(/\n/g, '<br>') || '' }}
                />
              </div>
            </ScrollArea>

            <div className="p-3 border-t flex gap-2">
              <Button variant="outline" size="sm" className="gap-2" onClick={() => handleReply(selectedEmail)}>
                <Reply className="h-4 w-4" /> Responder
              </Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => {
                setReplyTo({ ...selectedEmail, from_email: '', to_emails: [] });
                setComposeOpen(true);
              }}>
                <Forward className="h-4 w-4" /> Encaminhar
              </Button>
            </div>
          </div>
        )}

        {!selectedEmail && filteredEmails.length > 0 && (
          <div className="flex-1 hidden md:flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MailOpen className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <p>Selecione um email para visualizar</p>
            </div>
          </div>
        )}
      </div>

      <EmailComposeModal
        open={composeOpen}
        onOpenChange={setComposeOpen}
        onSent={handleComposeDone}
        replyTo={replyTo}
      />
    </AppLayout>
  );
}
