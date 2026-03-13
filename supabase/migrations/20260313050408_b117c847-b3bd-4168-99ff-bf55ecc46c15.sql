
-- WhatsApp Contacts
CREATE TABLE public.whatsapp_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.companies(id),
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  email text DEFAULT '',
  avatar_url text DEFAULT '',
  label_ids uuid[] DEFAULT '{}',
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "whatsapp_contacts_select" ON public.whatsapp_contacts FOR SELECT USING (true);
CREATE POLICY "whatsapp_contacts_insert" ON public.whatsapp_contacts FOR INSERT WITH CHECK (true);
CREATE POLICY "whatsapp_contacts_update" ON public.whatsapp_contacts FOR UPDATE USING (true);
CREATE POLICY "whatsapp_contacts_delete" ON public.whatsapp_contacts FOR DELETE USING (true);

-- WhatsApp Conversations
CREATE TABLE public.whatsapp_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.companies(id),
  contact_id uuid REFERENCES public.whatsapp_contacts(id) ON DELETE CASCADE,
  phone text NOT NULL DEFAULT '',
  contact_name text NOT NULL DEFAULT 'Contato',
  last_message text DEFAULT '',
  last_message_at timestamptz DEFAULT now(),
  unread_count integer DEFAULT 0,
  status text NOT NULL DEFAULT 'open',
  assigned_to text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "whatsapp_conversations_select" ON public.whatsapp_conversations FOR SELECT USING (true);
CREATE POLICY "whatsapp_conversations_insert" ON public.whatsapp_conversations FOR INSERT WITH CHECK (true);
CREATE POLICY "whatsapp_conversations_update" ON public.whatsapp_conversations FOR UPDATE USING (true);
CREATE POLICY "whatsapp_conversations_delete" ON public.whatsapp_conversations FOR DELETE USING (true);

-- WhatsApp Messages
CREATE TABLE public.whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE NOT NULL,
  empresa_id uuid REFERENCES public.companies(id),
  sender text NOT NULL DEFAULT 'them',
  content text NOT NULL DEFAULT '',
  media_url text DEFAULT '',
  media_type text DEFAULT '',
  message_type text NOT NULL DEFAULT 'text',
  whatsapp_msg_id text DEFAULT '',
  is_read boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "whatsapp_messages_select" ON public.whatsapp_messages FOR SELECT USING (true);
CREATE POLICY "whatsapp_messages_insert" ON public.whatsapp_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "whatsapp_messages_update" ON public.whatsapp_messages FOR UPDATE USING (true);
CREATE POLICY "whatsapp_messages_delete" ON public.whatsapp_messages FOR DELETE USING (true);

-- WhatsApp Labels
CREATE TABLE public.whatsapp_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.companies(id),
  name text NOT NULL DEFAULT '',
  color text NOT NULL DEFAULT '#3B82F6',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_labels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "whatsapp_labels_select" ON public.whatsapp_labels FOR SELECT USING (true);
CREATE POLICY "whatsapp_labels_insert" ON public.whatsapp_labels FOR INSERT WITH CHECK (true);
CREATE POLICY "whatsapp_labels_update" ON public.whatsapp_labels FOR UPDATE USING (true);
CREATE POLICY "whatsapp_labels_delete" ON public.whatsapp_labels FOR DELETE USING (true);

-- WhatsApp Quick Replies
CREATE TABLE public.whatsapp_quick_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.companies(id),
  shortcut text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  category text DEFAULT 'geral',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_quick_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "whatsapp_quick_replies_select" ON public.whatsapp_quick_replies FOR SELECT USING (true);
CREATE POLICY "whatsapp_quick_replies_insert" ON public.whatsapp_quick_replies FOR INSERT WITH CHECK (true);
CREATE POLICY "whatsapp_quick_replies_update" ON public.whatsapp_quick_replies FOR UPDATE USING (true);
CREATE POLICY "whatsapp_quick_replies_delete" ON public.whatsapp_quick_replies FOR DELETE USING (true);

-- WhatsApp Settings
CREATE TABLE public.whatsapp_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.companies(id),
  server_url text NOT NULL DEFAULT 'http://localhost:3000',
  is_connected boolean DEFAULT false,
  qr_code text DEFAULT '',
  session_name text DEFAULT '',
  auto_reply_enabled boolean DEFAULT false,
  auto_reply_message text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "whatsapp_settings_select" ON public.whatsapp_settings FOR SELECT USING (true);
CREATE POLICY "whatsapp_settings_insert" ON public.whatsapp_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "whatsapp_settings_update" ON public.whatsapp_settings FOR UPDATE USING (true);
CREATE POLICY "whatsapp_settings_delete" ON public.whatsapp_settings FOR DELETE USING (true);

-- Enable realtime for messages and conversations
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_conversations;
