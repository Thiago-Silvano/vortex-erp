
-- Clients table
CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL DEFAULT '',
  birth_date date,
  cpf text NOT NULL DEFAULT '',
  passport_number text DEFAULT '',
  passport_issue_date date,
  passport_expiry_date date,
  email text DEFAULT '',
  phone text DEFAULT '',
  cep text DEFAULT '',
  address text DEFAULT '',
  address_number text DEFAULT '',
  complement text DEFAULT '',
  neighborhood text DEFAULT '',
  city text DEFAULT '',
  state text DEFAULT '',
  country text DEFAULT 'Brasil',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clients are publicly readable" ON public.clients FOR SELECT USING (true);
CREATE POLICY "Clients are publicly writable" ON public.clients FOR INSERT WITH CHECK (true);
CREATE POLICY "Clients are publicly updatable" ON public.clients FOR UPDATE USING (true);
CREATE POLICY "Clients are publicly deletable" ON public.clients FOR DELETE USING (true);

-- Suppliers table
CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  cnpj text DEFAULT '',
  email text DEFAULT '',
  phone text DEFAULT '',
  cep text DEFAULT '',
  address text DEFAULT '',
  address_number text DEFAULT '',
  complement text DEFAULT '',
  neighborhood text DEFAULT '',
  city text DEFAULT '',
  state text DEFAULT '',
  country text DEFAULT 'Brasil',
  sales_rep_name text DEFAULT '',
  sales_rep_phone text DEFAULT '',
  executive_name text DEFAULT '',
  executive_phone text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Suppliers are publicly readable" ON public.suppliers FOR SELECT USING (true);
CREATE POLICY "Suppliers are publicly writable" ON public.suppliers FOR INSERT WITH CHECK (true);
CREATE POLICY "Suppliers are publicly updatable" ON public.suppliers FOR UPDATE USING (true);
CREATE POLICY "Suppliers are publicly deletable" ON public.suppliers FOR DELETE USING (true);

-- Sales table
CREATE TABLE public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid REFERENCES public.quotes(id) ON DELETE SET NULL,
  client_name text NOT NULL DEFAULT '',
  sale_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_method text DEFAULT 'pix',
  installments integer DEFAULT 1,
  card_charge_type text DEFAULT '',
  card_fee_rate numeric DEFAULT 0,
  total_sale numeric DEFAULT 0,
  total_supplier_cost numeric DEFAULT 0,
  gross_profit numeric DEFAULT 0,
  commission_rate numeric DEFAULT 0,
  commission_value numeric DEFAULT 0,
  card_fee_value numeric DEFAULT 0,
  net_profit numeric DEFAULT 0,
  notes text DEFAULT '',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sales are publicly readable" ON public.sales FOR SELECT USING (true);
CREATE POLICY "Sales are publicly writable" ON public.sales FOR INSERT WITH CHECK (true);
CREATE POLICY "Sales are publicly updatable" ON public.sales FOR UPDATE USING (true);
CREATE POLICY "Sales are publicly deletable" ON public.sales FOR DELETE USING (true);

-- Sale suppliers (many-to-many)
CREATE TABLE public.sale_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid REFERENCES public.sales(id) ON DELETE CASCADE NOT NULL,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sale_suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sale suppliers are publicly readable" ON public.sale_suppliers FOR SELECT USING (true);
CREATE POLICY "Sale suppliers are publicly writable" ON public.sale_suppliers FOR INSERT WITH CHECK (true);
CREATE POLICY "Sale suppliers are publicly deletable" ON public.sale_suppliers FOR DELETE USING (true);

-- Sale items (from quote services)
CREATE TABLE public.sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid REFERENCES public.sales(id) ON DELETE CASCADE NOT NULL,
  description text NOT NULL DEFAULT '',
  cost_price numeric DEFAULT 0,
  rav numeric DEFAULT 0,
  total_value numeric DEFAULT 0,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sale items are publicly readable" ON public.sale_items FOR SELECT USING (true);
CREATE POLICY "Sale items are publicly writable" ON public.sale_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Sale items are publicly updatable" ON public.sale_items FOR UPDATE USING (true);
CREATE POLICY "Sale items are publicly deletable" ON public.sale_items FOR DELETE USING (true);

-- Receivables table
CREATE TABLE public.receivables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid REFERENCES public.sales(id) ON DELETE CASCADE NOT NULL,
  installment_number integer NOT NULL DEFAULT 1,
  due_date date,
  amount numeric DEFAULT 0,
  status text DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.receivables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Receivables are publicly readable" ON public.receivables FOR SELECT USING (true);
CREATE POLICY "Receivables are publicly writable" ON public.receivables FOR INSERT WITH CHECK (true);
CREATE POLICY "Receivables are publicly updatable" ON public.receivables FOR UPDATE USING (true);
CREATE POLICY "Receivables are publicly deletable" ON public.receivables FOR DELETE USING (true);

-- Reservations table
CREATE TABLE public.reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid REFERENCES public.sales(id) ON DELETE CASCADE NOT NULL,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  description text DEFAULT '',
  confirmation_code text DEFAULT '',
  status text DEFAULT 'pending',
  check_in date,
  check_out date,
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reservations are publicly readable" ON public.reservations FOR SELECT USING (true);
CREATE POLICY "Reservations are publicly writable" ON public.reservations FOR INSERT WITH CHECK (true);
CREATE POLICY "Reservations are publicly updatable" ON public.reservations FOR UPDATE USING (true);
CREATE POLICY "Reservations are publicly deletable" ON public.reservations FOR DELETE USING (true);
