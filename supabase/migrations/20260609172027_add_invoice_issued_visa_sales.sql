ALTER TABLE public.visa_sales
  ADD COLUMN IF NOT EXISTS invoice_issued boolean NOT NULL DEFAULT false;
