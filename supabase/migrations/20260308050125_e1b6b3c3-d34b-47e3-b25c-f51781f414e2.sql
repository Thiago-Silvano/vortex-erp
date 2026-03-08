
-- Visa products table
CREATE TABLE public.visa_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID REFERENCES public.companies(id),
  name TEXT NOT NULL DEFAULT '',
  description TEXT DEFAULT '',
  price NUMERIC NOT NULL DEFAULT 0,
  average_days INTEGER DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.visa_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "visa_products_select" ON public.visa_products FOR SELECT USING (true);
CREATE POLICY "visa_products_insert" ON public.visa_products FOR INSERT WITH CHECK (true);
CREATE POLICY "visa_products_update" ON public.visa_products FOR UPDATE USING (true);
CREATE POLICY "visa_products_delete" ON public.visa_products FOR DELETE USING (true);

-- Visa sales table
CREATE TABLE public.visa_sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID REFERENCES public.companies(id),
  client_name TEXT NOT NULL DEFAULT '',
  client_phone TEXT DEFAULT '',
  client_email TEXT DEFAULT '',
  product_id UUID REFERENCES public.visa_products(id),
  total_value NUMERIC DEFAULT 0,
  payment_method TEXT DEFAULT 'pix',
  installments INTEGER DEFAULT 1,
  notes TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.visa_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "visa_sales_select" ON public.visa_sales FOR SELECT USING (true);
CREATE POLICY "visa_sales_insert" ON public.visa_sales FOR INSERT WITH CHECK (true);
CREATE POLICY "visa_sales_update" ON public.visa_sales FOR UPDATE USING (true);
CREATE POLICY "visa_sales_delete" ON public.visa_sales FOR DELETE USING (true);

-- Visa applicants (like passengers for travel)
CREATE TABLE public.visa_applicants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visa_sale_id UUID NOT NULL REFERENCES public.visa_sales(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  birth_date DATE,
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  passport_number TEXT DEFAULT '',
  is_main BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.visa_applicants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "visa_applicants_select" ON public.visa_applicants FOR SELECT USING (true);
CREATE POLICY "visa_applicants_insert" ON public.visa_applicants FOR INSERT WITH CHECK (true);
CREATE POLICY "visa_applicants_update" ON public.visa_applicants FOR UPDATE USING (true);
CREATE POLICY "visa_applicants_delete" ON public.visa_applicants FOR DELETE USING (true);

-- Visa processes (production) - one per applicant
CREATE TYPE public.visa_process_status AS ENUM (
  'falta_passaporte',
  'produzindo',
  'agendado',
  'aguardando_renovacao',
  'aprovado',
  'negado'
);

CREATE TABLE public.visa_processes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID REFERENCES public.companies(id),
  visa_sale_id UUID NOT NULL REFERENCES public.visa_sales(id) ON DELETE CASCADE,
  applicant_id UUID NOT NULL REFERENCES public.visa_applicants(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.visa_products(id),
  client_name TEXT NOT NULL DEFAULT '',
  applicant_name TEXT NOT NULL DEFAULT '',
  status visa_process_status NOT NULL DEFAULT 'falta_passaporte',
  describe_duties TEXT DEFAULT '',
  photo_url TEXT DEFAULT '',
  documents JSONB DEFAULT '[]'::jsonb,
  consulate TEXT DEFAULT '',
  interview_date DATE,
  interview_time TIME,
  interview_notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.visa_processes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "visa_processes_select" ON public.visa_processes FOR SELECT USING (true);
CREATE POLICY "visa_processes_insert" ON public.visa_processes FOR INSERT WITH CHECK (true);
CREATE POLICY "visa_processes_update" ON public.visa_processes FOR UPDATE USING (true);
CREATE POLICY "visa_processes_delete" ON public.visa_processes FOR DELETE USING (true);

-- Storage bucket for visa documents
INSERT INTO storage.buckets (id, name, public) VALUES ('visa-documents', 'visa-documents', true);
CREATE POLICY "visa_docs_select" ON storage.objects FOR SELECT USING (bucket_id = 'visa-documents');
CREATE POLICY "visa_docs_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'visa-documents');
CREATE POLICY "visa_docs_delete" ON storage.objects FOR DELETE USING (bucket_id = 'visa-documents');
