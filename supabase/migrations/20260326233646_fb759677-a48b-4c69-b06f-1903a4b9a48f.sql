
DROP POLICY IF EXISTS "nfse_notification_logs_select" ON public.nfse_notification_logs;
DROP POLICY IF EXISTS "nfse_notification_logs_insert" ON public.nfse_notification_logs;
CREATE POLICY "nfse_notification_logs_select" ON public.nfse_notification_logs FOR SELECT USING (true);
CREATE POLICY "nfse_notification_logs_insert" ON public.nfse_notification_logs FOR INSERT WITH CHECK (true);
