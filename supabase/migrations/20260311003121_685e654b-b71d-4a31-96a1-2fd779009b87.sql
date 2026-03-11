
-- Table for WhatsApp diagnostic logs
CREATE TABLE public.whatsapp_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  event_type text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "whatsapp_logs_select" ON public.whatsapp_logs FOR SELECT TO public USING (true);
CREATE POLICY "whatsapp_logs_insert" ON public.whatsapp_logs FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "whatsapp_logs_delete" ON public.whatsapp_logs FOR DELETE TO public USING (true);

-- Add diagnostic columns to whatsapp_sessions
ALTER TABLE public.whatsapp_sessions 
  ADD COLUMN IF NOT EXISTS last_message_sent_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS last_message_received_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS webhook_status text DEFAULT 'unknown';

-- Enable realtime for logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_logs;
