
CREATE TABLE public.quote_internal_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.quote_internal_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Internal files are publicly readable" ON public.quote_internal_files FOR SELECT USING (true);
CREATE POLICY "Internal files are publicly writable" ON public.quote_internal_files FOR INSERT WITH CHECK (true);
CREATE POLICY "Internal files are publicly deletable" ON public.quote_internal_files FOR DELETE USING (true);
