CREATE TABLE public.contract_email_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.companies(id),
  smtp_host text NOT NULL DEFAULT '',
  smtp_port integer NOT NULL DEFAULT 587,
  smtp_user text NOT NULL DEFAULT '',
  smtp_password text NOT NULL DEFAULT '',
  smtp_ssl boolean NOT NULL DEFAULT false,
  from_name text NOT NULL DEFAULT '',
  from_email text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(empresa_id)
);

ALTER TABLE public.contract_email_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contract_email_settings_select" ON public.contract_email_settings FOR SELECT TO public USING (true);
CREATE POLICY "contract_email_settings_insert" ON public.contract_email_settings FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "contract_email_settings_update" ON public.contract_email_settings FOR UPDATE TO public USING (true);
CREATE POLICY "contract_email_settings_delete" ON public.contract_email_settings FOR DELETE TO public USING (true);