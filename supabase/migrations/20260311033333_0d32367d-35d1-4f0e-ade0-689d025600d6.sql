
CREATE TABLE public.ds160_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  empresa_id uuid REFERENCES public.companies(id),
  token text NOT NULL UNIQUE DEFAULT substr(md5(random()::text || clock_timestamp()::text), 1, 32),
  status text NOT NULL DEFAULT 'not_sent',
  form_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  current_step integer NOT NULL DEFAULT 0,
  sent_at timestamp with time zone,
  last_saved_at timestamp with time zone,
  submitted_at timestamp with time zone,
  pdf_url text,
  sent_by text DEFAULT '',
  expires_at timestamp with time zone,
  ip_address text DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.ds160_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ds160_forms_select" ON public.ds160_forms FOR SELECT TO public USING (true);
CREATE POLICY "ds160_forms_insert" ON public.ds160_forms FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "ds160_forms_update" ON public.ds160_forms FOR UPDATE TO public USING (true);
CREATE POLICY "ds160_forms_delete" ON public.ds160_forms FOR DELETE TO public USING (true);
