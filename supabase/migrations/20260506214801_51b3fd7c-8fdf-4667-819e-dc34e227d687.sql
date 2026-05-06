ALTER TABLE public.payment_fees
  ADD COLUMN IF NOT EXISTS institution TEXT,
  ADD COLUMN IF NOT EXISTS fees_by_installment JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.payment_fees
  ALTER COLUMN installments DROP NOT NULL,
  ALTER COLUMN fee_percent DROP NOT NULL;