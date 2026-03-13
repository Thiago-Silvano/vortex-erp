CREATE TABLE public.hotels_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id text UNIQUE NOT NULL,
  nome text NOT NULL DEFAULT '',
  cidade text DEFAULT '',
  pais text DEFAULT '',
  endereco text DEFAULT '',
  telefone text DEFAULT '',
  website text DEFAULT '',
  rating numeric DEFAULT 0,
  reviews_total integer DEFAULT 0,
  latitude numeric DEFAULT 0,
  longitude numeric DEFAULT 0,
  fotos jsonb DEFAULT '[]'::jsonb,
  data_atualizacao timestamp with time zone DEFAULT now(),
  empresa_id uuid REFERENCES public.companies(id),
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.hotels_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hotels_cache_select" ON public.hotels_cache FOR SELECT TO public USING (true);
CREATE POLICY "hotels_cache_insert" ON public.hotels_cache FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "hotels_cache_update" ON public.hotels_cache FOR UPDATE TO public USING (true);
CREATE POLICY "hotels_cache_delete" ON public.hotels_cache FOR DELETE TO public USING (true);