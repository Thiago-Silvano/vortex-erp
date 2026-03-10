import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Paperclip, Send, X, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

interface EmailComposeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSent: () => void;
  replyTo?: {
    id: string;
    from_email: string;
    to_emails: string[];
    subject: string;
    body_html: string;
  } | null;
  prefillTo?: string;
  prefillSubject?: string;
  prefillBody?: string;
  attachmentUrls?: { name: string; url: string }[];
}

export default function EmailComposeModal({
  open, onOpenChange, onSent, replyTo,
  prefillTo, prefillSubject, prefillBody, attachmentUrls,
}: EmailComposeModalProps) {
  const { activeCompany } = useCompany();
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);

  useEffect(() => {
    if (!open) return;
    if (replyTo) {
      setTo(replyTo.from_email || '');
      setSubject(replyTo.subject ? `Re: ${replyTo.subject.replace(/^Re: /i, '')}` : '');
      setBody(`\n\n---\n${replyTo.body_html?.replace(/<[^>]+>/g, '') || ''}`);
    } else {
      setTo(prefillTo || '');
      setSubject(prefillSubject || '');
      setBody(prefillBody || '');
    }
    setCc('');
    setBcc('');
    setShowCcBcc(false);
  }, [open, replyTo, prefillTo, prefillSubject, prefillBody]);

  useEffect(() => {
    if (!activeCompany || !open) return;
    supabase.from('email_templates').select('*').eq('empresa_id', activeCompany.id)
      .then(({ data }) => setTemplates((data as any[]) || []));
  }, [activeCompany, open]);

  const handleTemplateSelect = (templateId: string) => {
    const tpl = templates.find(t => t.id === templateId);
    if (tpl) {
      setSubject(tpl.subject);
      setBody(tpl.body_html?.replace(/<[^>]+>/g, '') || '');
    }
  };

  const handleSend = async () => {
    if (!to.trim()) { toast.error('Informe o destinatário'); return; }
    if (!activeCompany) { toast.error('Selecione uma empresa'); return; }

    setSending(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const currentUserId = userData?.user?.id;
      if (!currentUserId) throw new Error('Usuário não autenticado');

      const toEmails = to.split(',').map(e => e.trim()).filter(Boolean);
      const ccEmails = cc ? cc.split(',').map(e => e.trim()).filter(Boolean) : [];
      const bccEmails = bcc ? bcc.split(',').map(e => e.trim()).filter(Boolean) : [];

      // Get email settings for this user
      const { data: settings } = await supabase
        .from('email_settings')
        .select('from_name, from_email')
        .eq('user_id', currentUserId as any)
        .single();

      const fromEmail = (settings as any)?.from_email || userData?.user?.email || '';
      const fromName = (settings as any)?.from_name || '';

      // Look up client by email
      let clientId = null;
      const { data: clientData } = await supabase
        .from('clients')
        .select('id')
        .eq('empresa_id', activeCompany.id)
        .eq('email', toEmails[0])
        .maybeSingle();
      if (clientData) clientId = (clientData as any).id;

      // Save email record
      const emailRecord = {
        empresa_id: activeCompany.id,
        user_id: currentUserId,
        client_id: clientId,
        from_name: fromName,
        from_email: fromEmail,
        to_emails: toEmails,
        cc_emails: ccEmails,
        bcc_emails: bccEmails,
        subject: subject,
        body_html: body.replace(/\n/g, '<br>'),
        body_text: body,
        folder: 'sent',
        status: 'sending',
        is_read: true,
        sent_at: new Date().toISOString(),
        sent_by: currentUserId,
        reply_to_email_id: replyTo?.id || null,
        tracking_id: crypto.randomUUID(),
      };

      const { data: savedEmail, error: saveErr } = await supabase
        .from('emails')
        .insert(emailRecord as any)
        .select()
        .single();

      if (saveErr) throw saveErr;

      // Save attachments if provided
      if (attachmentUrls?.length && savedEmail) {
        for (const att of attachmentUrls) {
          await supabase.from('email_attachments').insert({
            email_id: (savedEmail as any).id,
            file_url: att.url,
            file_name: att.name,
            mime_type: 'application/octet-stream',
          } as any);
        }
      }

      // Call Edge Function to send via SMTP — now using user_id
      const { error: sendErr } = await supabase.functions.invoke('send-email', {
        body: {
          email_id: (savedEmail as any).id,
          user_id: currentUserId,
        },
      });

      if (sendErr) {
        await supabase.from('emails').update({ status: 'failed' } as any).eq('id', (savedEmail as any).id);
        throw sendErr;
      }

      await supabase.from('emails').update({ status: 'sent' } as any).eq('id', (savedEmail as any).id);

      toast.success('Email enviado com sucesso!');
      onSent();
    } catch (err: any) {
      console.error('Error sending email:', err);
      toast.error('Erro ao enviar email: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{replyTo ? 'Responder Email' : 'Novo Email'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 flex-1 overflow-auto">
          <div className="flex items-center gap-2">
            <Label className="w-12 text-right text-sm text-muted-foreground shrink-0">Para</Label>
            <Input
              value={to}
              onChange={e => setTo(e.target.value)}
              placeholder="email@exemplo.com"
              className="flex-1"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCcBcc(!showCcBcc)}
              className="text-xs text-muted-foreground shrink-0"
            >
              Cc/Cco {showCcBcc ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
            </Button>
          </div>

          {showCcBcc && (
            <>
              <div className="flex items-center gap-2">
                <Label className="w-12 text-right text-sm text-muted-foreground shrink-0">Cc</Label>
                <Input value={cc} onChange={e => setCc(e.target.value)} placeholder="cc@exemplo.com" className="flex-1" />
              </div>
              <div className="flex items-center gap-2">
                <Label className="w-12 text-right text-sm text-muted-foreground shrink-0">Cco</Label>
                <Input value={bcc} onChange={e => setBcc(e.target.value)} placeholder="cco@exemplo.com" className="flex-1" />
              </div>
            </>
          )}

          <div className="flex items-center gap-2">
            <Label className="w-12 text-right text-sm text-muted-foreground shrink-0">Assunto</Label>
            <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Assunto do email" className="flex-1" />
          </div>

          {templates.length > 0 && (
            <div className="flex items-center gap-2">
              <Label className="w-12 text-right text-sm text-muted-foreground shrink-0">Template</Label>
              <Select onValueChange={handleTemplateSelect}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Usar template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Escreva sua mensagem..."
            className="min-h-[250px] resize-none"
          />

          {attachmentUrls && attachmentUrls.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {attachmentUrls.map((att, i) => (
                <Badge key={i} variant="secondary" className="gap-1">
                  <Paperclip className="h-3 w-3" />
                  {att.name}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancelar
          </Button>
          <Button onClick={handleSend} disabled={sending} className="gap-2">
            <Send className="h-4 w-4" />
            {sending ? 'Enviando...' : 'Enviar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
