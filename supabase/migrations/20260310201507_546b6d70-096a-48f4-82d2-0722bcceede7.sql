
-- Add metadata JSONB column to sale_items for structured service data (flights, hotels, etc.)
ALTER TABLE public.sale_items ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Create table for internal sale files
CREATE TABLE IF NOT EXISTS public.sale_internal_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  file_name text NOT NULL DEFAULT '',
  file_url text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.sale_internal_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sale_internal_files_select" ON public.sale_internal_files FOR SELECT TO public USING (true);
CREATE POLICY "sale_internal_files_insert" ON public.sale_internal_files FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "sale_internal_files_delete" ON public.sale_internal_files FOR DELETE TO public USING (true);
