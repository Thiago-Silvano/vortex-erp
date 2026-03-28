
CREATE TABLE public.airlines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  logo_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.airlines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view airlines" ON public.airlines FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert airlines" ON public.airlines FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update airlines" ON public.airlines FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Users can delete airlines" ON public.airlines FOR DELETE TO authenticated USING (true);

INSERT INTO storage.buckets (id, name, public) VALUES ('airline-logos', 'airline-logos', true);

CREATE POLICY "Anyone can view airline logos" ON storage.objects FOR SELECT USING (bucket_id = 'airline-logos');
CREATE POLICY "Auth users can upload airline logos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'airline-logos');
CREATE POLICY "Auth users can update airline logos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'airline-logos');
CREATE POLICY "Auth users can delete airline logos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'airline-logos');
