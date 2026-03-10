-- Add destination image to sales
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS destination_image_url text;

-- Create sale_item_images table for carousel images per service item
CREATE TABLE IF NOT EXISTS public.sale_item_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_item_id uuid NOT NULL REFERENCES public.sale_items(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sale_item_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sale_item_images_select" ON public.sale_item_images FOR SELECT TO public USING (true);
CREATE POLICY "sale_item_images_insert" ON public.sale_item_images FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "sale_item_images_delete" ON public.sale_item_images FOR DELETE TO public USING (true);