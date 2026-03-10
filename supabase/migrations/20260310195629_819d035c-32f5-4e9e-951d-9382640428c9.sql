ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS passengers_count integer DEFAULT 1;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS trip_nights integer DEFAULT 0;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS trip_start_date date;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS trip_end_date date;