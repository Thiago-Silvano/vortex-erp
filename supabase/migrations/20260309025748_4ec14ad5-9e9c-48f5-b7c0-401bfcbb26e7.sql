
CREATE TABLE public.services_catalog (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  cost_center_id UUID REFERENCES public.cost_centers(id),
  empresa_id UUID REFERENCES public.companies(id),
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.services_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "services_catalog_select" ON public.services_catalog FOR SELECT USING (true);
CREATE POLICY "services_catalog_insert" ON public.services_catalog FOR INSERT WITH CHECK (true);
CREATE POLICY "services_catalog_update" ON public.services_catalog FOR UPDATE USING (true);
CREATE POLICY "services_catalog_delete" ON public.services_catalog FOR DELETE USING (true);
