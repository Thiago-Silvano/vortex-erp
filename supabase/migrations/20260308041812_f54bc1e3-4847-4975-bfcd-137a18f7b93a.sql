
CREATE TABLE public.sale_passengers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  birth_date date,
  document_type text NOT NULL DEFAULT 'cpf',
  document_number text NOT NULL DEFAULT '',
  document_expiry date,
  email text DEFAULT '',
  phone text DEFAULT '',
  is_main boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sale_passengers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sale passengers are publicly readable" ON public.sale_passengers FOR SELECT USING (true);
CREATE POLICY "Sale passengers are publicly writable" ON public.sale_passengers FOR INSERT WITH CHECK (true);
CREATE POLICY "Sale passengers are publicly updatable" ON public.sale_passengers FOR UPDATE USING (true);
CREATE POLICY "Sale passengers are publicly deletable" ON public.sale_passengers FOR DELETE USING (true);
