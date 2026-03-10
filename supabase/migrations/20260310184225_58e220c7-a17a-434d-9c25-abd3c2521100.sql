
-- Email settings per company (IMAP/SMTP credentials)
CREATE TABLE public.email_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  smtp_host TEXT NOT NULL DEFAULT '',
  smtp_port INTEGER NOT NULL DEFAULT 587,
  smtp_user TEXT NOT NULL DEFAULT '',
  smtp_password TEXT NOT NULL DEFAULT '',
  smtp_ssl BOOLEAN NOT NULL DEFAULT true,
  imap_host TEXT NOT NULL DEFAULT '',
  imap_port INTEGER NOT NULL DEFAULT 993,
  imap_user TEXT NOT NULL DEFAULT '',
  imap_password TEXT NOT NULL DEFAULT '',
  imap_ssl BOOLEAN NOT NULL DEFAULT true,
  from_name TEXT NOT NULL DEFAULT '',
  from_email TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(empresa_id)
);

ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "email_settings_select" ON public.email_settings FOR SELECT TO public USING (true);
CREATE POLICY "email_settings_insert" ON public.email_settings FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "email_settings_update" ON public.email_settings FOR UPDATE TO public USING (true);
CREATE POLICY "email_settings_delete" ON public.email_settings FOR DELETE TO public USING (true);

-- Emails table
CREATE TABLE public.emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID REFERENCES public.companies(id),
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  message_id TEXT,
  from_name TEXT NOT NULL DEFAULT '',
  from_email TEXT NOT NULL DEFAULT '',
  to_emails TEXT[] NOT NULL DEFAULT '{}',
  cc_emails TEXT[] DEFAULT '{}',
  bcc_emails TEXT[] DEFAULT '{}',
  subject TEXT NOT NULL DEFAULT '',
  body_html TEXT NOT NULL DEFAULT '',
  body_text TEXT NOT NULL DEFAULT '',
  folder TEXT NOT NULL DEFAULT 'inbox',
  status TEXT NOT NULL DEFAULT 'received',
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_starred BOOLEAN NOT NULL DEFAULT false,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sent_by UUID,
  reply_to_email_id UUID REFERENCES public.emails(id) ON DELETE SET NULL,
  tracking_id TEXT,
  tracking_opened_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "emails_select" ON public.emails FOR SELECT TO public USING (true);
CREATE POLICY "emails_insert" ON public.emails FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "emails_update" ON public.emails FOR UPDATE TO public USING (true);
CREATE POLICY "emails_delete" ON public.emails FOR DELETE TO public USING (true);

-- Email attachments
CREATE TABLE public.email_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email_id UUID NOT NULL REFERENCES public.emails(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL DEFAULT '',
  file_name TEXT NOT NULL DEFAULT '',
  mime_type TEXT NOT NULL DEFAULT '',
  file_size INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.email_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "email_attachments_select" ON public.email_attachments FOR SELECT TO public USING (true);
CREATE POLICY "email_attachments_insert" ON public.email_attachments FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "email_attachments_delete" ON public.email_attachments FOR DELETE TO public USING (true);

-- Email templates
CREATE TABLE public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID REFERENCES public.companies(id),
  name TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL DEFAULT '',
  body_html TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'geral',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "email_templates_select" ON public.email_templates FOR SELECT TO public USING (true);
CREATE POLICY "email_templates_insert" ON public.email_templates FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "email_templates_update" ON public.email_templates FOR UPDATE TO public USING (true);
CREATE POLICY "email_templates_delete" ON public.email_templates FOR DELETE TO public USING (true);

-- Storage bucket for email attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('email-attachments', 'email-attachments', true);

CREATE POLICY "email_attachments_storage_select" ON storage.objects FOR SELECT TO public USING (bucket_id = 'email-attachments');
CREATE POLICY "email_attachments_storage_insert" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'email-attachments');
CREATE POLICY "email_attachments_storage_delete" ON storage.objects FOR DELETE TO public USING (bucket_id = 'email-attachments');
