
CREATE TABLE public.client_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  empresa_id uuid REFERENCES public.companies(id),
  file_name text NOT NULL DEFAULT '',
  file_url text NOT NULL,
  file_size bigint DEFAULT 0,
  mime_type text DEFAULT '',
  uploaded_by text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view client files" ON public.client_files
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert client files" ON public.client_files
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can delete client files" ON public.client_files
  FOR DELETE TO authenticated USING (true);
