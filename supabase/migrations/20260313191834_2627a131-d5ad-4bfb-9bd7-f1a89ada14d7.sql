
-- Add is_supplier_fee to visa_products
ALTER TABLE public.visa_products ADD COLUMN IF NOT EXISTS is_supplier_fee boolean NOT NULL DEFAULT false;

-- Create visa_sale_items table for multi-service per sale
CREATE TABLE public.visa_sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visa_sale_id uuid NOT NULL REFERENCES public.visa_sales(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.visa_products(id) ON DELETE SET NULL,
  product_name text NOT NULL DEFAULT '',
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  total_value numeric NOT NULL DEFAULT 0,
  is_supplier_fee boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.visa_sale_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "visa_sale_items_select" ON public.visa_sale_items FOR SELECT TO public USING (true);
CREATE POLICY "visa_sale_items_insert" ON public.visa_sale_items FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "visa_sale_items_update" ON public.visa_sale_items FOR UPDATE TO public USING (true);
CREATE POLICY "visa_sale_items_delete" ON public.visa_sale_items FOR DELETE TO public USING (true);
