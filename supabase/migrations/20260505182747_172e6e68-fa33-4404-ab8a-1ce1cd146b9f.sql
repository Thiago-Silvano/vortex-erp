ALTER TABLE public.sale_passengers
  ADD COLUMN IF NOT EXISTS baggage_personal_item integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS baggage_carry_on integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS baggage_checked integer NOT NULL DEFAULT 1;