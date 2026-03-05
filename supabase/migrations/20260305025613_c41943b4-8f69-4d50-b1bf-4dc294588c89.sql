
ALTER TABLE public.flight_legs ADD COLUMN direction text DEFAULT 'ida';

ALTER TABLE public.quotes 
  ADD COLUMN payment_pix_value numeric DEFAULT 0,
  ADD COLUMN payment_installments_no_interest integer DEFAULT 0,
  ADD COLUMN payment_installments_with_interest integer DEFAULT 0,
  ADD COLUMN payment_installment_value_no_interest numeric DEFAULT 0,
  ADD COLUMN payment_installment_value_with_interest numeric DEFAULT 0;
