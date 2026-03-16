
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.companies(id),
  user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'ds160_submitted',
  title text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  reference_id uuid,
  reference_type text DEFAULT '',
  is_read boolean NOT NULL DEFAULT false,
  dismissed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select" ON public.notifications FOR SELECT TO public USING (true);
CREATE POLICY "notifications_insert" ON public.notifications FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "notifications_update" ON public.notifications FOR UPDATE TO public USING (true);
CREATE POLICY "notifications_delete" ON public.notifications FOR DELETE TO public USING (true);
