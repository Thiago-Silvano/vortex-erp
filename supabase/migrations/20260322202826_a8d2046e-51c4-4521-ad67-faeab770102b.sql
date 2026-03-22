
-- Kanban columns for quote management
CREATE TABLE public.kanban_columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.companies(id),
  name text NOT NULL DEFAULT '',
  color text NOT NULL DEFAULT '#3b82f6',
  sort_order integer NOT NULL DEFAULT 0,
  status_key text NOT NULL DEFAULT '',
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.kanban_columns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kanban_columns_select" ON public.kanban_columns FOR SELECT TO public USING (true);
CREATE POLICY "kanban_columns_insert" ON public.kanban_columns FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "kanban_columns_update" ON public.kanban_columns FOR UPDATE TO public USING (true);
CREATE POLICY "kanban_columns_delete" ON public.kanban_columns FOR DELETE TO public USING (true);

-- Quote status change log
CREATE TABLE public.quote_status_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL,
  empresa_id uuid REFERENCES public.companies(id),
  from_status text NOT NULL DEFAULT '',
  to_status text NOT NULL DEFAULT '',
  changed_by text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.quote_status_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quote_status_log_select" ON public.quote_status_log FOR SELECT TO public USING (true);
CREATE POLICY "quote_status_log_insert" ON public.quote_status_log FOR INSERT TO public WITH CHECK (true);
