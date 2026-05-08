
CREATE TABLE IF NOT EXISTS public.financial_summary_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL UNIQUE,
  message_template text NOT NULL DEFAULT '',
  recipients jsonb NOT NULL DEFAULT '[]'::jsonb,
  sender_empresa_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.financial_summary_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view config"
ON public.financial_summary_config FOR SELECT
TO authenticated
USING (public.is_company_admin(auth.uid(), empresa_id));

CREATE POLICY "Admins can insert config"
ON public.financial_summary_config FOR INSERT
TO authenticated
WITH CHECK (public.is_company_admin(auth.uid(), empresa_id));

CREATE POLICY "Admins can update config"
ON public.financial_summary_config FOR UPDATE
TO authenticated
USING (public.is_company_admin(auth.uid(), empresa_id));

CREATE POLICY "Admins can delete config"
ON public.financial_summary_config FOR DELETE
TO authenticated
USING (public.is_company_admin(auth.uid(), empresa_id));

CREATE TRIGGER trg_financial_summary_config_updated
BEFORE UPDATE ON public.financial_summary_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
