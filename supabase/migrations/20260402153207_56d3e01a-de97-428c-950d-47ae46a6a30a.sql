
-- Promotions table
CREATE TABLE public.promotions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID REFERENCES public.companies(id) NOT NULL,
  destination_name TEXT NOT NULL DEFAULT '',
  destination_country TEXT NOT NULL DEFAULT '',
  accommodation_type TEXT NOT NULL DEFAULT '',
  nights INTEGER NOT NULL DEFAULT 1,
  period_text TEXT NOT NULL DEFAULT '',
  departure_date DATE,
  return_date DATE,
  airport_origin TEXT NOT NULL DEFAULT '',
  airport_destination TEXT NOT NULL DEFAULT '',
  included_tickets BOOLEAN NOT NULL DEFAULT false,
  included_tours BOOLEAN NOT NULL DEFAULT false,
  included_guide BOOLEAN NOT NULL DEFAULT false,
  included_transfer BOOLEAN NOT NULL DEFAULT false,
  included_train BOOLEAN NOT NULL DEFAULT false,
  installments INTEGER NOT NULL DEFAULT 1,
  installment_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  main_image_url TEXT,
  gallery_urls JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Marketing templates table
CREATE TABLE public.marketing_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID REFERENCES public.companies(id) NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'feed',
  tags TEXT[] DEFAULT '{}',
  template_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  preview_url TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view promotions of their company" ON public.promotions
  FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT empresa_id FROM public.user_permissions WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert promotions for their company" ON public.promotions
  FOR INSERT TO authenticated
  WITH CHECK (empresa_id IN (SELECT empresa_id FROM public.user_permissions WHERE user_id = auth.uid()));

CREATE POLICY "Users can update promotions of their company" ON public.promotions
  FOR UPDATE TO authenticated
  USING (empresa_id IN (SELECT empresa_id FROM public.user_permissions WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete promotions of their company" ON public.promotions
  FOR DELETE TO authenticated
  USING (empresa_id IN (SELECT empresa_id FROM public.user_permissions WHERE user_id = auth.uid()));

CREATE POLICY "Users can view marketing_templates of their company" ON public.marketing_templates
  FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT empresa_id FROM public.user_permissions WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert marketing_templates for their company" ON public.marketing_templates
  FOR INSERT TO authenticated
  WITH CHECK (empresa_id IN (SELECT empresa_id FROM public.user_permissions WHERE user_id = auth.uid()));

CREATE POLICY "Users can update marketing_templates of their company" ON public.marketing_templates
  FOR UPDATE TO authenticated
  USING (empresa_id IN (SELECT empresa_id FROM public.user_permissions WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete marketing_templates of their company" ON public.marketing_templates
  FOR DELETE TO authenticated
  USING (empresa_id IN (SELECT empresa_id FROM public.user_permissions WHERE user_id = auth.uid()));
