
ALTER TABLE public.accounts_payable ADD COLUMN IF NOT EXISTS group_id text;
ALTER TABLE public.receivables ADD COLUMN IF NOT EXISTS group_id text;
