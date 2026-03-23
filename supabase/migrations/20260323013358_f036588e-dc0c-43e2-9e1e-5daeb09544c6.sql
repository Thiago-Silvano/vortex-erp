CREATE POLICY "contract_audit_log_delete" ON public.contract_audit_log FOR DELETE TO public USING (true);

CREATE POLICY "contract_signatures_delete" ON public.contract_signatures FOR DELETE TO public USING (true);