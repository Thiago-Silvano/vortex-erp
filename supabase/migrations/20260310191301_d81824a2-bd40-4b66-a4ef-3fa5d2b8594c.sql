ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS short_id text NOT NULL DEFAULT substr(md5(random()::text), 1, 8);
CREATE UNIQUE INDEX IF NOT EXISTS sales_short_id_unique ON public.sales(short_id);