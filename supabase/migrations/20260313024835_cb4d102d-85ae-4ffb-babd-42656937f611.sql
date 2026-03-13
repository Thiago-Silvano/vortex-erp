
-- Make sale_id nullable so visa sales can use receivables without a sales FK
ALTER TABLE public.receivables ALTER COLUMN sale_id DROP NOT NULL;

-- Add visa_sale_id column for visa sale receivables
ALTER TABLE public.receivables ADD COLUMN visa_sale_id uuid REFERENCES public.visa_sales(id) ON DELETE CASCADE;
