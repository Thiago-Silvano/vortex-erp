
CREATE TABLE public.system_theme_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  theme_name text NOT NULL DEFAULT 'custom',
  primary_color text NOT NULL DEFAULT '#5B2EFF',
  secondary_color text NOT NULL DEFAULT '#e8e4f0',
  background_color text NOT NULL DEFAULT '#f5f6fa',
  header_color text NOT NULL DEFAULT '#1b1430',
  tab_active_color text NOT NULL DEFAULT '#5B2EFF',
  tab_inactive_color text NOT NULL DEFAULT '#9ca3af',
  button_primary_color text NOT NULL DEFAULT '#5B2EFF',
  button_secondary_color text NOT NULL DEFAULT '#e8e4f0',
  hover_color text NOT NULL DEFAULT '#4920cc',
  border_color text NOT NULL DEFAULT '#e2e0ea',
  field_color text NOT NULL DEFAULT '#ffffff',
  table_color text NOT NULL DEFAULT '#ffffff',
  table_alt_color text NOT NULL DEFAULT '#f9f9fb',
  font_family text NOT NULL DEFAULT 'Inter',
  font_family_titles text NOT NULL DEFAULT 'Inter',
  font_family_tables text NOT NULL DEFAULT 'Inter',
  font_size_title text NOT NULL DEFAULT '24px',
  font_size_tab text NOT NULL DEFAULT '14px',
  font_size_body text NOT NULL DEFAULT '14px',
  font_size_table text NOT NULL DEFAULT '13px',
  font_size_button text NOT NULL DEFAULT '14px',
  line_height text NOT NULL DEFAULT '1.5',
  layout_density text NOT NULL DEFAULT 'default',
  field_layout text NOT NULL DEFAULT 'side-by-side',
  field_columns integer NOT NULL DEFAULT 2,
  button_style text NOT NULL DEFAULT 'rounded',
  button_size text NOT NULL DEFAULT 'medium',
  button_position text NOT NULL DEFAULT 'right',
  button_order text NOT NULL DEFAULT 'save-cancel',
  tab_style text NOT NULL DEFAULT 'modern',
  tab_border text NOT NULL DEFAULT 'underline',
  table_style text NOT NULL DEFAULT 'striped',
  table_row_height text NOT NULL DEFAULT '40px',
  table_borders text NOT NULL DEFAULT 'horizontal',
  row_height text NOT NULL DEFAULT '40px',
  field_height text NOT NULL DEFAULT '40px',
  element_spacing text NOT NULL DEFAULT '16px',
  inner_padding text NOT NULL DEFAULT '16px',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(empresa_id)
);

ALTER TABLE public.system_theme_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "theme_settings_select" ON public.system_theme_settings FOR SELECT TO public USING (true);
CREATE POLICY "theme_settings_insert" ON public.system_theme_settings FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "theme_settings_update" ON public.system_theme_settings FOR UPDATE TO public USING (true);
CREATE POLICY "theme_settings_delete" ON public.system_theme_settings FOR DELETE TO public USING (true);
