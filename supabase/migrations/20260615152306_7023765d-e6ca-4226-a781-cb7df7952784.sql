
-- ============ Security helper functions ============
CREATE OR REPLACE FUNCTION public.has_company_access(_empresa_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_permissions up
    WHERE up.user_id = auth.uid()
      AND (up.user_role = 'master' OR _empresa_id = ANY(COALESCE(up.empresa_ids, ARRAY[]::uuid[])))
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_permissions up
    WHERE up.user_id = auth.uid() AND up.user_role IN ('master','admin','administrator')
  );
$$;

-- ============ Company-scoped tables (have empresa_id) ============
DO $$
DECLARE
  t text;
  p record;
  tables text[] := ARRAY[
    'accounts_payable','bank_accounts','bank_transactions','commission_closings',
    'contract_email_settings','email_settings','emails','fiscal_certificates',
    'fiscal_companies','fiscal_service_mappings','nfse_api_logs','nfse_audit_logs',
    'nfse_documents','nfse_status_queue','ofx_imports','quote_status_log',
    'reconciliation_log','seller_commissions','sellers','visa_sales',
    'whatsapp_contacts','whatsapp_conversations','whatsapp_messages',
    'whatsapp_sessions','whatsapp_settings','marketing_templates','promotions',
    'whatsapp_conversation_labels'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p.policyname, t);
    END LOOP;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.has_company_access(empresa_id)) WITH CHECK (public.has_company_access(empresa_id))',
      t || '_company_access', t
    );
  END LOOP;
END $$;

-- ============ sale_passengers (scope via parent sale) ============
DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='sale_passengers' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.sale_passengers', p.policyname);
  END LOOP;
END $$;
ALTER TABLE public.sale_passengers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sale_passengers_company_access" ON public.sale_passengers
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.sales s WHERE s.id = sale_passengers.sale_id AND public.has_company_access(s.empresa_id)))
WITH CHECK (EXISTS (SELECT 1 FROM public.sales s WHERE s.id = sale_passengers.sale_id AND public.has_company_access(s.empresa_id)));

-- ============ visa_applicants (scope via parent visa_sale) ============
DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='visa_applicants' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.visa_applicants', p.policyname);
  END LOOP;
END $$;
ALTER TABLE public.visa_applicants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "visa_applicants_company_access" ON public.visa_applicants
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.visa_sales vs WHERE vs.id = visa_applicants.visa_sale_id AND public.has_company_access(vs.empresa_id)))
WITH CHECK (EXISTS (SELECT 1 FROM public.visa_sales vs WHERE vs.id = visa_applicants.visa_sale_id AND public.has_company_access(vs.empresa_id)));

-- ============ user_permissions (privilege escalation fix) ============
DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='user_permissions' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_permissions', p.policyname);
  END LOOP;
END $$;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_permissions_select_own_or_admin" ON public.user_permissions
FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin_user());
CREATE POLICY "user_permissions_admin_insert" ON public.user_permissions
FOR INSERT TO authenticated WITH CHECK (public.is_admin_user());
CREATE POLICY "user_permissions_admin_update" ON public.user_permissions
FOR UPDATE TO authenticated USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());
CREATE POLICY "user_permissions_admin_delete" ON public.user_permissions
FOR DELETE TO authenticated USING (public.is_admin_user());

-- ============ notifications (scope to owning user) ============
DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='notifications' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.notifications', p.policyname);
  END LOOP;
END $$;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_select_own" ON public.notifications
FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notifications_update_own" ON public.notifications
FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "notifications_delete_own" ON public.notifications
FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ============ roteiro_premium_drafts (scope to owning user) ============
DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='roteiro_premium_drafts' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.roteiro_premium_drafts', p.policyname);
  END LOOP;
END $$;
ALTER TABLE public.roteiro_premium_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "roteiro_drafts_own_access" ON public.roteiro_premium_drafts
FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============ SECURITY DEFINER view -> invoker ============
ALTER VIEW public.vw_ds160_status SET (security_invoker = on);
