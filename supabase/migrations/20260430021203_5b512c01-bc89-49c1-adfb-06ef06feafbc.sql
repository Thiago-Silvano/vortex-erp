CREATE TABLE public.roteiro_premium_drafts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Roteiro sem título',
  form_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  roteiro_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_roteiro_premium_drafts_empresa ON public.roteiro_premium_drafts(empresa_id);
CREATE INDEX idx_roteiro_premium_drafts_user ON public.roteiro_premium_drafts(user_id);

ALTER TABLE public.roteiro_premium_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rpd_select" ON public.roteiro_premium_drafts FOR SELECT TO public USING (true);
CREATE POLICY "rpd_insert" ON public.roteiro_premium_drafts FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "rpd_update" ON public.roteiro_premium_drafts FOR UPDATE TO public USING (true);
CREATE POLICY "rpd_delete" ON public.roteiro_premium_drafts FOR DELETE TO public USING (true);

CREATE TRIGGER update_roteiro_premium_drafts_updated_at
BEFORE UPDATE ON public.roteiro_premium_drafts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();