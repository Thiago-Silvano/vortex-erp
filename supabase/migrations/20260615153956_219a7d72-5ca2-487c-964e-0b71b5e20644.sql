
GRANT INSERT, DELETE ON public.contract_audit_log TO authenticated;

CREATE POLICY "contract_audit_log_company_insert" ON public.contract_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = contract_audit_log.contract_id AND public.has_company_access(c.empresa_id)));

CREATE POLICY "contract_audit_log_company_delete" ON public.contract_audit_log
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = contract_audit_log.contract_id AND public.has_company_access(c.empresa_id)));

CREATE POLICY "contract_signatures_company_insert" ON public.contract_signatures
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = contract_signatures.contract_id AND public.has_company_access(c.empresa_id)));
