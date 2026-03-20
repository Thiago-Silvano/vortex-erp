
CREATE TABLE public.promo_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  template_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid DEFAULT NULL
);

ALTER TABLE public.promo_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "promo_templates_select" ON public.promo_templates FOR SELECT USING (true);
CREATE POLICY "promo_templates_insert" ON public.promo_templates FOR INSERT WITH CHECK (true);
CREATE POLICY "promo_templates_delete" ON public.promo_templates FOR DELETE USING (true);
