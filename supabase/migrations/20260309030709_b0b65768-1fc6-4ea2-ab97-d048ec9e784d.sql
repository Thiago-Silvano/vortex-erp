
-- Add category and description columns to services_catalog
ALTER TABLE public.services_catalog ADD COLUMN IF NOT EXISTS category text DEFAULT '';
ALTER TABLE public.services_catalog ADD COLUMN IF NOT EXISTS description text DEFAULT '';

-- Add service_catalog_id to sale_items for linking
ALTER TABLE public.sale_items ADD COLUMN IF NOT EXISTS service_catalog_id uuid REFERENCES public.services_catalog(id);
ALTER TABLE public.sale_items ADD COLUMN IF NOT EXISTS cost_center_id uuid REFERENCES public.cost_centers(id);
