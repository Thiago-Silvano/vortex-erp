
-- Table for WhatsApp Web session management per company
CREATE TABLE public.whatsapp_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'disconnected',
  phone_number text DEFAULT '',
  qr_code text DEFAULT '',
  server_url text DEFAULT '',
  session_data jsonb DEFAULT '{}'::jsonb,
  connected_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(empresa_id)
);

ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wa_session_select" ON public.whatsapp_sessions FOR SELECT TO public USING (true);
CREATE POLICY "wa_session_insert" ON public.whatsapp_sessions FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "wa_session_update" ON public.whatsapp_sessions FOR UPDATE TO public USING (true);
CREATE POLICY "wa_session_delete" ON public.whatsapp_sessions FOR DELETE TO public USING (true);
