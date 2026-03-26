
-- Add proposal_type to sales table (normal = existing, client_builds = client picks services)
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS proposal_type text NOT NULL DEFAULT 'normal';

-- Create table to store client choices
CREATE TABLE public.client_proposal_choices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL,
  client_name text DEFAULT '',
  client_email text DEFAULT '',
  client_phone text DEFAULT '',
  selected_item_ids jsonb NOT NULL DEFAULT '[]',
  total_value numeric NOT NULL DEFAULT 0,
  notes text DEFAULT '',
  submitted_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.client_proposal_choices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client_proposal_choices_select" ON public.client_proposal_choices FOR SELECT TO public USING (true);
CREATE POLICY "client_proposal_choices_insert" ON public.client_proposal_choices FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "client_proposal_choices_update" ON public.client_proposal_choices FOR UPDATE TO public USING (true);
CREATE POLICY "client_proposal_choices_delete" ON public.client_proposal_choices FOR DELETE TO public USING (true);
