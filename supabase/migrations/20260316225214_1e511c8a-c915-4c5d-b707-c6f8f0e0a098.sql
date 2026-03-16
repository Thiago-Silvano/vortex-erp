-- Drop the FK constraint on sale_id that references sales table
-- This allows accounts_payable.sale_id to store visa_sales IDs too
ALTER TABLE public.accounts_payable DROP CONSTRAINT IF EXISTS accounts_payable_sale_id_fkey;