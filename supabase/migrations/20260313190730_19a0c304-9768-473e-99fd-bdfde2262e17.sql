CREATE TABLE public.destination_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL DEFAULT '',
  autor text DEFAULT '',
  fonte text DEFAULT '',
  url_original text DEFAULT '',
  url_local text NOT NULL DEFAULT '',
  largura integer DEFAULT 0,
  altura integer DEFAULT 0,
  data_importacao timestamp with time zone DEFAULT now(),
  empresa_id uuid REFERENCES public.companies(id),
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.destination_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dest_images_select" ON public.destination_images FOR SELECT TO public USING (true);
CREATE POLICY "dest_images_insert" ON public.destination_images FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "dest_images_delete" ON public.destination_images FOR DELETE TO public USING (true);

ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS unsplash_api_key text DEFAULT '';
ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS pexels_api_key text DEFAULT '';