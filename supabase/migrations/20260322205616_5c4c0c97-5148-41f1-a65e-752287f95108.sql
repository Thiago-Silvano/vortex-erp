
-- Contract templates per company
CREATE TABLE public.contract_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.companies(id),
  name text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'servicos',
  body_html text NOT NULL DEFAULT '',
  variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by text DEFAULT ''
);

-- Generated contracts linked to sales
CREATE TABLE public.contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.companies(id),
  sale_id uuid,
  template_id uuid REFERENCES public.contract_templates(id),
  short_id text NOT NULL DEFAULT substr(md5(random()::text), 1, 10),
  token text NOT NULL DEFAULT gen_random_uuid()::text,
  title text NOT NULL DEFAULT '',
  body_html text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft',
  sent_at timestamptz,
  sent_via text,
  viewed_at timestamptz,
  signed_at timestamptz,
  expires_at timestamptz,
  client_name text DEFAULT '',
  client_email text DEFAULT '',
  client_phone text DEFAULT '',
  client_cpf text DEFAULT '',
  metadata jsonb DEFAULT '{}'::jsonb,
  pdf_url text,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by text DEFAULT ''
);

-- Contract signatures with full evidence
CREATE TABLE public.contract_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  signer_name text NOT NULL DEFAULT '',
  signer_email text DEFAULT '',
  signer_phone text DEFAULT '',
  signer_cpf text DEFAULT '',
  signature_type text NOT NULL DEFAULT 'typed',
  signature_data text DEFAULT '',
  ip_address text DEFAULT '',
  user_agent text DEFAULT '',
  device_info text DEFAULT '',
  document_hash text DEFAULT '',
  verification_method text DEFAULT 'email_otp',
  verification_code text DEFAULT '',
  verification_sent_at timestamptz,
  verification_confirmed_at timestamptz,
  status text NOT NULL DEFAULT 'pending',
  signed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Contract audit log
CREATE TABLE public.contract_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  action text NOT NULL DEFAULT '',
  actor text DEFAULT '',
  actor_type text DEFAULT 'system',
  ip_address text DEFAULT '',
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contract_templates_select" ON public.contract_templates FOR SELECT TO public USING (true);
CREATE POLICY "contract_templates_insert" ON public.contract_templates FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "contract_templates_update" ON public.contract_templates FOR UPDATE TO public USING (true);
CREATE POLICY "contract_templates_delete" ON public.contract_templates FOR DELETE TO public USING (true);

CREATE POLICY "contracts_select" ON public.contracts FOR SELECT TO public USING (true);
CREATE POLICY "contracts_insert" ON public.contracts FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "contracts_update" ON public.contracts FOR UPDATE TO public USING (true);
CREATE POLICY "contracts_delete" ON public.contracts FOR DELETE TO public USING (true);

CREATE POLICY "contract_signatures_select" ON public.contract_signatures FOR SELECT TO public USING (true);
CREATE POLICY "contract_signatures_insert" ON public.contract_signatures FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "contract_signatures_update" ON public.contract_signatures FOR UPDATE TO public USING (true);

CREATE POLICY "contract_audit_log_select" ON public.contract_audit_log FOR SELECT TO public USING (true);
CREATE POLICY "contract_audit_log_insert" ON public.contract_audit_log FOR INSERT TO public WITH CHECK (true);
