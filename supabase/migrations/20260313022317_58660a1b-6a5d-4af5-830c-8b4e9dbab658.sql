
CREATE TABLE public.visa_sale_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visa_sale_id UUID NOT NULL REFERENCES public.visa_sales(id) ON DELETE CASCADE,
  payment_type TEXT NOT NULL DEFAULT 'pix',
  value NUMERIC NOT NULL DEFAULT 0,
  payment_date DATE,
  is_received BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.visa_sale_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "visa_sale_payments_select" ON public.visa_sale_payments FOR SELECT TO public USING (true);
CREATE POLICY "visa_sale_payments_insert" ON public.visa_sale_payments FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "visa_sale_payments_update" ON public.visa_sale_payments FOR UPDATE TO public USING (true);
CREATE POLICY "visa_sale_payments_delete" ON public.visa_sale_payments FOR DELETE TO public USING (true);
