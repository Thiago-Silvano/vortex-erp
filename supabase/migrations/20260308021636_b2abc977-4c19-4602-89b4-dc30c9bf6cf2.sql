
-- Add razao_social to suppliers
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS razao_social text DEFAULT '';

-- Add payment rate fields to agency_settings
ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS card_rate_simple_ec numeric DEFAULT 0;
ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS card_rate_antecipado_ec numeric DEFAULT 0;
ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS card_rate_simple_link numeric DEFAULT 0;
ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS card_rate_antecipado_link numeric DEFAULT 0;

-- Add card_payment_type to sales (EC or Link)
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS card_payment_type text DEFAULT '';

-- Add cost_center_id to receivables and accounts_payable
ALTER TABLE public.receivables ADD COLUMN IF NOT EXISTS cost_center_id uuid;
ALTER TABLE public.receivables ADD COLUMN IF NOT EXISTS client_name text DEFAULT '';
ALTER TABLE public.receivables ADD COLUMN IF NOT EXISTS payment_date date;
ALTER TABLE public.receivables ADD COLUMN IF NOT EXISTS payment_method text DEFAULT '';
ALTER TABLE public.receivables ADD COLUMN IF NOT EXISTS notes text DEFAULT '';
ALTER TABLE public.receivables ADD COLUMN IF NOT EXISTS description text DEFAULT '';
ALTER TABLE public.receivables ADD COLUMN IF NOT EXISTS origin_type text DEFAULT 'sale';

-- Create cost_centers table
CREATE TABLE IF NOT EXISTS public.cost_centers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  description text DEFAULT '',
  status text NOT NULL DEFAULT 'active',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.cost_centers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cost centers are publicly readable" ON public.cost_centers FOR SELECT USING (true);
CREATE POLICY "Cost centers are publicly writable" ON public.cost_centers FOR INSERT WITH CHECK (true);
CREATE POLICY "Cost centers are publicly updatable" ON public.cost_centers FOR UPDATE USING (true);
CREATE POLICY "Cost centers are publicly deletable" ON public.cost_centers FOR DELETE USING (true);

-- Create accounts_payable table
CREATE TABLE IF NOT EXISTS public.accounts_payable (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid REFERENCES public.suppliers(id),
  sale_id uuid REFERENCES public.sales(id),
  cost_center_id uuid REFERENCES public.cost_centers(id),
  description text DEFAULT '',
  amount numeric DEFAULT 0,
  due_date date,
  payment_date date,
  status text NOT NULL DEFAULT 'open',
  notes text DEFAULT '',
  installment_number integer DEFAULT 1,
  total_installments integer DEFAULT 1,
  origin_type text DEFAULT 'sale',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.accounts_payable ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Accounts payable are publicly readable" ON public.accounts_payable FOR SELECT USING (true);
CREATE POLICY "Accounts payable are publicly writable" ON public.accounts_payable FOR INSERT WITH CHECK (true);
CREATE POLICY "Accounts payable are publicly updatable" ON public.accounts_payable FOR UPDATE USING (true);
CREATE POLICY "Accounts payable are publicly deletable" ON public.accounts_payable FOR DELETE USING (true);

-- Add foreign key for receivables cost_center_id
ALTER TABLE public.receivables ADD CONSTRAINT receivables_cost_center_id_fkey FOREIGN KEY (cost_center_id) REFERENCES public.cost_centers(id);
