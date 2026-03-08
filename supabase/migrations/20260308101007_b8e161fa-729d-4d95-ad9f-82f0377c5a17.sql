
-- Sellers table
CREATE TABLE public.sellers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.companies(id),
  full_name text NOT NULL DEFAULT '',
  cpf text DEFAULT '',
  rg text DEFAULT '',
  birth_date date,
  marital_status text DEFAULT '',
  phone text DEFAULT '',
  whatsapp text DEFAULT '',
  email text DEFAULT '',
  address text DEFAULT '',
  address_number text DEFAULT '',
  neighborhood text DEFAULT '',
  city text DEFAULT '',
  state text DEFAULT '',
  cep text DEFAULT '',
  complement text DEFAULT '',
  role_title text DEFAULT '',
  admission_date date,
  status text NOT NULL DEFAULT 'active',
  monthly_salary numeric DEFAULT 0,
  notes text DEFAULT '',
  -- Bank info
  bank_name text DEFAULT '',
  bank_agency text DEFAULT '',
  bank_account text DEFAULT '',
  account_type text DEFAULT '',
  pix_key text DEFAULT '',
  beneficiary_name text DEFAULT '',
  beneficiary_document text DEFAULT '',
  -- Commission config
  commission_type text NOT NULL DEFAULT 'none',
  commission_percentage numeric DEFAULT 0,
  commission_base text DEFAULT '',
  commission_trigger text DEFAULT 'sale_date',
  commission_include_card_fee boolean DEFAULT false,
  commission_include_discounts boolean DEFAULT false,
  commission_include_taxes boolean DEFAULT false,
  commission_include_operational boolean DEFAULT false,
  commission_revenue_scope text DEFAULT '',
  commission_mixed_config jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sellers_select" ON public.sellers FOR SELECT USING (true);
CREATE POLICY "sellers_insert" ON public.sellers FOR INSERT WITH CHECK (true);
CREATE POLICY "sellers_update" ON public.sellers FOR UPDATE USING (true);
CREATE POLICY "sellers_delete" ON public.sellers FOR DELETE USING (true);

-- Seller commissions table
CREATE TABLE public.seller_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.companies(id),
  seller_id uuid NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  sale_id uuid REFERENCES public.sales(id) ON DELETE SET NULL,
  visa_sale_id uuid REFERENCES public.visa_sales(id) ON DELETE SET NULL,
  client_name text DEFAULT '',
  sale_date date,
  payment_date date,
  sale_value numeric DEFAULT 0,
  received_value numeric DEFAULT 0,
  cost_value numeric DEFAULT 0,
  profit_value numeric DEFAULT 0,
  commission_percentage numeric DEFAULT 0,
  commission_value numeric DEFAULT 0,
  commission_type text DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  closing_id uuid,
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.seller_commissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "commissions_select" ON public.seller_commissions FOR SELECT USING (true);
CREATE POLICY "commissions_insert" ON public.seller_commissions FOR INSERT WITH CHECK (true);
CREATE POLICY "commissions_update" ON public.seller_commissions FOR UPDATE USING (true);
CREATE POLICY "commissions_delete" ON public.seller_commissions FOR DELETE USING (true);

-- Commission monthly closings
CREATE TABLE public.commission_closings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.companies(id),
  period_month integer NOT NULL,
  period_year integer NOT NULL,
  status text NOT NULL DEFAULT 'open',
  total_commission numeric DEFAULT 0,
  closed_at timestamptz,
  closed_by text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.commission_closings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "closings_select" ON public.commission_closings FOR SELECT USING (true);
CREATE POLICY "closings_insert" ON public.commission_closings FOR INSERT WITH CHECK (true);
CREATE POLICY "closings_update" ON public.commission_closings FOR UPDATE USING (true);
CREATE POLICY "closings_delete" ON public.commission_closings FOR DELETE USING (true);

-- Add seller_id to quotes and sales
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS seller_id uuid REFERENCES public.sellers(id) ON DELETE SET NULL;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS seller_id uuid REFERENCES public.sellers(id) ON DELETE SET NULL;

-- Add foreign key from commissions closing_id
ALTER TABLE public.seller_commissions ADD CONSTRAINT seller_commissions_closing_id_fkey FOREIGN KEY (closing_id) REFERENCES public.commission_closings(id) ON DELETE SET NULL;
