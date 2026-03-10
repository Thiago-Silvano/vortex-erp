
-- WhatsApp Conversations
CREATE TABLE public.whatsapp_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.companies(id),
  phone text NOT NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  client_name text NOT NULL DEFAULT '',
  assigned_user_id uuid,
  assigned_user_name text DEFAULT '',
  status text NOT NULL DEFAULT 'new_lead',
  priority text NOT NULL DEFAULT 'normal',
  last_message text DEFAULT '',
  last_message_at timestamptz DEFAULT now(),
  unread_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wa_conv_select" ON public.whatsapp_conversations FOR SELECT TO public USING (true);
CREATE POLICY "wa_conv_insert" ON public.whatsapp_conversations FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "wa_conv_update" ON public.whatsapp_conversations FOR UPDATE TO public USING (true);
CREATE POLICY "wa_conv_delete" ON public.whatsapp_conversations FOR DELETE TO public USING (true);

-- WhatsApp Messages
CREATE TABLE public.whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  sender_type text NOT NULL DEFAULT 'client', -- 'client' | 'agent'
  sender_user_id uuid,
  sender_name text DEFAULT '',
  content text NOT NULL DEFAULT '',
  message_type text NOT NULL DEFAULT 'text', -- 'text' | 'image' | 'document' | 'audio'
  media_url text,
  media_filename text,
  delivery_status text DEFAULT 'sent', -- 'sent' | 'delivered' | 'read' | 'failed'
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wa_msg_select" ON public.whatsapp_messages FOR SELECT TO public USING (true);
CREATE POLICY "wa_msg_insert" ON public.whatsapp_messages FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "wa_msg_update" ON public.whatsapp_messages FOR UPDATE TO public USING (true);
CREATE POLICY "wa_msg_delete" ON public.whatsapp_messages FOR DELETE TO public USING (true);

-- WhatsApp Quick Replies
CREATE TABLE public.whatsapp_quick_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.companies(id),
  shortcut text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_quick_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wa_qr_select" ON public.whatsapp_quick_replies FOR SELECT TO public USING (true);
CREATE POLICY "wa_qr_insert" ON public.whatsapp_quick_replies FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "wa_qr_update" ON public.whatsapp_quick_replies FOR UPDATE TO public USING (true);
CREATE POLICY "wa_qr_delete" ON public.whatsapp_quick_replies FOR DELETE TO public USING (true);

-- WhatsApp Automations
CREATE TABLE public.whatsapp_automations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.companies(id),
  trigger_keyword text NOT NULL DEFAULT '',
  response_message text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_automations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wa_auto_select" ON public.whatsapp_automations FOR SELECT TO public USING (true);
CREATE POLICY "wa_auto_insert" ON public.whatsapp_automations FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "wa_auto_update" ON public.whatsapp_automations FOR UPDATE TO public USING (true);
CREATE POLICY "wa_auto_delete" ON public.whatsapp_automations FOR DELETE TO public USING (true);

-- Enable realtime for conversations and messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages;
