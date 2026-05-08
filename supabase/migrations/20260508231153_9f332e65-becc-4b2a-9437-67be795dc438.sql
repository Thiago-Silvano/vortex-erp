UPDATE public.sale_passengers
SET
  baggage_personal_item = 1,
  baggage_carry_on = 0,
  baggage_checked = 0
WHERE sale_id = 'f433b425-596e-42dc-ac73-3bba43adab82';

ALTER TABLE public.sale_passengers
  ALTER COLUMN baggage_personal_item SET DEFAULT 0,
  ALTER COLUMN baggage_carry_on SET DEFAULT 0,
  ALTER COLUMN baggage_checked SET DEFAULT 0;