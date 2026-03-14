
-- Bank accounts table
CREATE TABLE public.bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.companies(id) NOT NULL,
  bank_name text NOT NULL DEFAULT '',
  bank_code text DEFAULT '',
  agency text DEFAULT '',
  account_number text DEFAULT '',
  account_digit text DEFAULT '',
  account_type text NOT NULL DEFAULT 'corrente',
  holder_name text DEFAULT '',
  holder_document text DEFAULT '',
  initial_balance numeric NOT NULL DEFAULT 0,
  initial_balance_date date DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'active',
  color text DEFAULT '#3b82f6',
  is_default boolean NOT NULL DEFAULT false,
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bank_accounts_select" ON public.bank_accounts FOR SELECT TO public USING (true);
CREATE POLICY "bank_accounts_insert" ON public.bank_accounts FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "bank_accounts_update" ON public.bank_accounts FOR UPDATE TO public USING (true);
CREATE POLICY "bank_accounts_delete" ON public.bank_accounts FOR DELETE TO public USING (true);

-- Bank transactions table (OFX imported + manual)
CREATE TABLE public.bank_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.companies(id) NOT NULL,
  bank_account_id uuid REFERENCES public.bank_accounts(id) ON DELETE CASCADE NOT NULL,
  transaction_date date NOT NULL,
  posting_date date,
  description text NOT NULL DEFAULT '',
  reference_number text DEFAULT '',
  amount numeric NOT NULL DEFAULT 0,
  transaction_type text NOT NULL DEFAULT 'debit',
  balance_after numeric,
  import_batch text DEFAULT '',
  unique_hash text NOT NULL DEFAULT '',
  reconciliation_status text NOT NULL DEFAULT 'pending',
  reconciled_with_type text,
  reconciled_with_id uuid,
  reconciliation_note text DEFAULT '',
  origin text NOT NULL DEFAULT 'ofx',
  cost_center_id uuid REFERENCES public.cost_centers(id),
  supplier_id uuid REFERENCES public.suppliers(id),
  client_name text DEFAULT '',
  payment_method text DEFAULT '',
  category text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX bank_transactions_unique_hash_idx ON public.bank_transactions(unique_hash) WHERE unique_hash != '';

ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bank_transactions_select" ON public.bank_transactions FOR SELECT TO public USING (true);
CREATE POLICY "bank_transactions_insert" ON public.bank_transactions FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "bank_transactions_update" ON public.bank_transactions FOR UPDATE TO public USING (true);
CREATE POLICY "bank_transactions_delete" ON public.bank_transactions FOR DELETE TO public USING (true);

-- Reconciliation audit log
CREATE TABLE public.reconciliation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.companies(id) NOT NULL,
  bank_transaction_id uuid REFERENCES public.bank_transactions(id) ON DELETE CASCADE NOT NULL,
  action text NOT NULL DEFAULT '',
  reconciled_with_type text,
  reconciled_with_id uuid,
  user_email text DEFAULT '',
  details text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reconciliation_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reconciliation_log_select" ON public.reconciliation_log FOR SELECT TO public USING (true);
CREATE POLICY "reconciliation_log_insert" ON public.reconciliation_log FOR INSERT TO public WITH CHECK (true);

-- OFX import batches
CREATE TABLE public.ofx_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.companies(id) NOT NULL,
  bank_account_id uuid REFERENCES public.bank_accounts(id) ON DELETE CASCADE NOT NULL,
  file_name text DEFAULT '',
  import_date timestamptz NOT NULL DEFAULT now(),
  period_start date,
  period_end date,
  balance_start numeric,
  balance_end numeric,
  total_transactions integer DEFAULT 0,
  total_credits numeric DEFAULT 0,
  total_debits numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'completed',
  imported_by text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ofx_imports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ofx_imports_select" ON public.ofx_imports FOR SELECT TO public USING (true);
CREATE POLICY "ofx_imports_insert" ON public.ofx_imports FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "ofx_imports_delete" ON public.ofx_imports FOR DELETE TO public USING (true);
