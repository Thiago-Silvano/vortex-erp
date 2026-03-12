
-- Create ds160_group_forms table for multi-applicant DS-160 groups
CREATE TABLE public.ds160_group_forms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL DEFAULT substr(md5(((random())::text || (clock_timestamp())::text)), 1, 32),
  empresa_id UUID REFERENCES public.companies(id),
  status TEXT NOT NULL DEFAULT 'sent',
  sent_at TIMESTAMP WITH TIME ZONE,
  sent_by TEXT DEFAULT '',
  sent_to_email TEXT DEFAULT '',
  sent_to_name TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add group_id to ds160_forms
ALTER TABLE public.ds160_forms ADD COLUMN group_id UUID REFERENCES public.ds160_group_forms(id);

-- Enable RLS
ALTER TABLE public.ds160_group_forms ENABLE ROW LEVEL SECURITY;

-- Public RLS policies
CREATE POLICY "ds160_group_forms_select" ON public.ds160_group_forms FOR SELECT TO public USING (true);
CREATE POLICY "ds160_group_forms_insert" ON public.ds160_group_forms FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "ds160_group_forms_update" ON public.ds160_group_forms FOR UPDATE TO public USING (true);
CREATE POLICY "ds160_group_forms_delete" ON public.ds160_group_forms FOR DELETE TO public USING (true);
