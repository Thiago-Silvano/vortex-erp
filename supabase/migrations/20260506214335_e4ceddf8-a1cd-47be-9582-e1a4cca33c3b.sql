CREATE TABLE public.payment_fees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID,
  name TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'maquininha',
  installments INTEGER NOT NULL DEFAULT 1,
  fee_percent NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_fees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view fees of their company"
ON public.payment_fees FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert fees"
ON public.payment_fees FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update fees"
ON public.payment_fees FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete fees"
ON public.payment_fees FOR DELETE
TO authenticated
USING (true);

CREATE TRIGGER update_payment_fees_updated_at
BEFORE UPDATE ON public.payment_fees
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_payment_fees_empresa ON public.payment_fees(empresa_id);
CREATE INDEX idx_payment_fees_method_installments ON public.payment_fees(method, installments);