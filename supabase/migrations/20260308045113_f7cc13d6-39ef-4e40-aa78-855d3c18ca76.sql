
-- 1. Create companies table
CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Companies are publicly readable" ON public.companies FOR SELECT USING (true);

-- 2. Insert the two companies
INSERT INTO public.companies (slug, name) VALUES
  ('vortex-viagens', 'Vortex Viagens'),
  ('vortex-vistos', 'Vortex Vistos');

-- 3. Add empresa_id to all top-level tables
ALTER TABLE public.quotes ADD COLUMN empresa_id uuid REFERENCES public.companies(id);
ALTER TABLE public.clients ADD COLUMN empresa_id uuid REFERENCES public.companies(id);
ALTER TABLE public.suppliers ADD COLUMN empresa_id uuid REFERENCES public.companies(id);
ALTER TABLE public.sales ADD COLUMN empresa_id uuid REFERENCES public.companies(id);
ALTER TABLE public.cost_centers ADD COLUMN empresa_id uuid REFERENCES public.companies(id);
ALTER TABLE public.calendar_events ADD COLUMN empresa_id uuid REFERENCES public.companies(id);
ALTER TABLE public.agency_settings ADD COLUMN empresa_id uuid REFERENCES public.companies(id);
ALTER TABLE public.card_rates ADD COLUMN empresa_id uuid REFERENCES public.companies(id);
ALTER TABLE public.receivables ADD COLUMN empresa_id uuid REFERENCES public.companies(id);
ALTER TABLE public.accounts_payable ADD COLUMN empresa_id uuid REFERENCES public.companies(id);
ALTER TABLE public.reservations ADD COLUMN empresa_id uuid REFERENCES public.companies(id);

-- 4. Migrate existing data to Vortex Viagens
UPDATE public.quotes SET empresa_id = (SELECT id FROM public.companies WHERE slug = 'vortex-viagens');
UPDATE public.clients SET empresa_id = (SELECT id FROM public.companies WHERE slug = 'vortex-viagens');
UPDATE public.suppliers SET empresa_id = (SELECT id FROM public.companies WHERE slug = 'vortex-viagens');
UPDATE public.sales SET empresa_id = (SELECT id FROM public.companies WHERE slug = 'vortex-viagens');
UPDATE public.cost_centers SET empresa_id = (SELECT id FROM public.companies WHERE slug = 'vortex-viagens');
UPDATE public.calendar_events SET empresa_id = (SELECT id FROM public.companies WHERE slug = 'vortex-viagens');
UPDATE public.agency_settings SET empresa_id = (SELECT id FROM public.companies WHERE slug = 'vortex-viagens');
UPDATE public.card_rates SET empresa_id = (SELECT id FROM public.companies WHERE slug = 'vortex-viagens');
UPDATE public.receivables SET empresa_id = (SELECT id FROM public.companies WHERE slug = 'vortex-viagens');
UPDATE public.accounts_payable SET empresa_id = (SELECT id FROM public.companies WHERE slug = 'vortex-viagens');
UPDATE public.reservations SET empresa_id = (SELECT id FROM public.companies WHERE slug = 'vortex-viagens');

-- 5. Add empresa access to user_permissions (JSON array of company IDs)
ALTER TABLE public.user_permissions ADD COLUMN empresa_ids uuid[] DEFAULT '{}';
