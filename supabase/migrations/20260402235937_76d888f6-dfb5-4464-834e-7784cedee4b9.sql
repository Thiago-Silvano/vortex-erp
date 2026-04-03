
CREATE TABLE public.promotion_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.companies(id),
  title TEXT NOT NULL DEFAULT 'Catálogo de Promoções',
  layout_style TEXT NOT NULL DEFAULT 'lateral',
  promotion_ids UUID[] NOT NULL DEFAULT '{}',
  token TEXT NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  show_logo BOOLEAN NOT NULL DEFAULT true,
  show_legal_text BOOLEAN NOT NULL DEFAULT false,
  legal_text TEXT,
  background_color TEXT DEFAULT '#ffffff',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.promotion_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company promotion pages"
  ON public.promotion_pages FOR SELECT
  TO authenticated
  USING (empresa_id IN (
    SELECT unnest(empresa_ids) FROM public.user_permissions WHERE user_id = auth.uid()
    UNION
    SELECT id FROM public.companies WHERE EXISTS (
      SELECT 1 FROM public.user_permissions WHERE user_id = auth.uid() AND user_role = 'master'
    )
  ));

CREATE POLICY "Users can insert promotion pages for their company"
  ON public.promotion_pages FOR INSERT
  TO authenticated
  WITH CHECK (empresa_id IN (
    SELECT unnest(empresa_ids) FROM public.user_permissions WHERE user_id = auth.uid()
    UNION
    SELECT id FROM public.companies WHERE EXISTS (
      SELECT 1 FROM public.user_permissions WHERE user_id = auth.uid() AND user_role = 'master'
    )
  ));

CREATE POLICY "Users can update own company promotion pages"
  ON public.promotion_pages FOR UPDATE
  TO authenticated
  USING (empresa_id IN (
    SELECT unnest(empresa_ids) FROM public.user_permissions WHERE user_id = auth.uid()
    UNION
    SELECT id FROM public.companies WHERE EXISTS (
      SELECT 1 FROM public.user_permissions WHERE user_id = auth.uid() AND user_role = 'master'
    )
  ));

CREATE POLICY "Users can delete own company promotion pages"
  ON public.promotion_pages FOR DELETE
  TO authenticated
  USING (empresa_id IN (
    SELECT unnest(empresa_ids) FROM public.user_permissions WHERE user_id = auth.uid()
    UNION
    SELECT id FROM public.companies WHERE EXISTS (
      SELECT 1 FROM public.user_permissions WHERE user_id = auth.uid() AND user_role = 'master'
    )
  ));

CREATE POLICY "Public can view promotion pages by token"
  ON public.promotion_pages FOR SELECT
  TO anon
  USING (true);
