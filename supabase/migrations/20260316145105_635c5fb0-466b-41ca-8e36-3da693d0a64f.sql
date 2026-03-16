
-- Create table for quote options
CREATE TABLE public.sale_quote_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Opção 1',
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sale_quote_options ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "sale_quote_options_select" ON public.sale_quote_options FOR SELECT TO public USING (true);
CREATE POLICY "sale_quote_options_insert" ON public.sale_quote_options FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "sale_quote_options_update" ON public.sale_quote_options FOR UPDATE TO public USING (true);
CREATE POLICY "sale_quote_options_delete" ON public.sale_quote_options FOR DELETE TO public USING (true);

-- Add quote_option_id to sale_items
ALTER TABLE public.sale_items ADD COLUMN quote_option_id uuid REFERENCES public.sale_quote_options(id) ON DELETE SET NULL;
