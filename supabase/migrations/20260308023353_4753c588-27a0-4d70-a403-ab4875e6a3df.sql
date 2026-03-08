
-- Card rates per installment table
CREATE TABLE public.card_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_type TEXT NOT NULL DEFAULT 'ec',
  installments INTEGER NOT NULL DEFAULT 1,
  rate NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(payment_type, installments)
);

ALTER TABLE public.card_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Card rates are publicly readable" ON public.card_rates FOR SELECT USING (true);
CREATE POLICY "Card rates are publicly writable" ON public.card_rates FOR INSERT WITH CHECK (true);
CREATE POLICY "Card rates are publicly updatable" ON public.card_rates FOR UPDATE USING (true);
CREATE POLICY "Card rates are publicly deletable" ON public.card_rates FOR DELETE USING (true);

-- User permissions table
CREATE TABLE public.user_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_role TEXT NOT NULL DEFAULT 'vendedor',
  permissions JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User permissions are publicly readable" ON public.user_permissions FOR SELECT USING (true);
CREATE POLICY "User permissions are publicly writable" ON public.user_permissions FOR INSERT WITH CHECK (true);
CREATE POLICY "User permissions are publicly updatable" ON public.user_permissions FOR UPDATE USING (true);
CREATE POLICY "User permissions are publicly deletable" ON public.user_permissions FOR DELETE USING (true);

-- Add created_by to sales for audit
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS created_by TEXT DEFAULT '';
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS updated_by TEXT DEFAULT '';
