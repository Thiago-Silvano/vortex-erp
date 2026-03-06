
CREATE TABLE public.quote_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid REFERENCES public.quotes(id) ON DELETE CASCADE NOT NULL,
  action text NOT NULL,
  summary text NOT NULL,
  user_email text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.quote_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Audit log publicly readable" ON public.quote_audit_log FOR SELECT USING (true);
CREATE POLICY "Audit log publicly writable" ON public.quote_audit_log FOR INSERT WITH CHECK (true);

CREATE INDEX idx_audit_log_quote_id ON public.quote_audit_log(quote_id);
CREATE INDEX idx_audit_log_created_at ON public.quote_audit_log(created_at DESC);
