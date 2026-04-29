CREATE TABLE public.api_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  nome text NOT NULL,
  provider_type text NOT NULL DEFAULT 'infotravel',
  base_url text,
  api_key text,
  client_id text,
  client_secret text,
  username text,
  password text,
  agency_code text,
  enabled_operators text[] DEFAULT ARRAY[]::text[],
  supported_types text[] DEFAULT ARRAY[]::text[],
  extra_config jsonb DEFAULT '{}'::jsonb,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  last_tested_at timestamptz,
  last_test_result jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_api_integrations_empresa ON public.api_integrations(empresa_id);
CREATE INDEX idx_api_integrations_provider ON public.api_integrations(provider_type);

ALTER TABLE public.api_integrations ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_company_admin(_user_id uuid, _empresa_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_permissions up
    WHERE up.user_id = _user_id
      AND (
        up.user_role = 'master'
        OR (
          up.user_role IN ('admin', 'administrator')
          AND _empresa_id = ANY(COALESCE(up.empresa_ids, ARRAY[]::uuid[]))
        )
      )
  );
$$;

CREATE POLICY "Admins can view api integrations of their company"
ON public.api_integrations
FOR SELECT
TO authenticated
USING (public.is_company_admin(auth.uid(), empresa_id));

CREATE POLICY "Admins can insert api integrations of their company"
ON public.api_integrations
FOR INSERT
TO authenticated
WITH CHECK (public.is_company_admin(auth.uid(), empresa_id));

CREATE POLICY "Admins can update api integrations of their company"
ON public.api_integrations
FOR UPDATE
TO authenticated
USING (public.is_company_admin(auth.uid(), empresa_id))
WITH CHECK (public.is_company_admin(auth.uid(), empresa_id));

CREATE POLICY "Admins can delete api integrations of their company"
ON public.api_integrations
FOR DELETE
TO authenticated
USING (public.is_company_admin(auth.uid(), empresa_id));

CREATE TRIGGER trg_api_integrations_updated_at
BEFORE UPDATE ON public.api_integrations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();