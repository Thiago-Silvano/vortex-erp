import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';

export interface ThemeSettings {
  id?: string;
  empresa_id?: string;
  theme_name: string;
  primary_color: string;
  secondary_color: string;
  background_color: string;
  header_color: string;
  tab_active_color: string;
  tab_inactive_color: string;
  button_primary_color: string;
  button_secondary_color: string;
  hover_color: string;
  border_color: string;
  field_color: string;
  table_color: string;
  table_alt_color: string;
  font_family: string;
  font_family_titles: string;
  font_family_tables: string;
  font_size_title: string;
  font_size_tab: string;
  font_size_body: string;
  font_size_table: string;
  font_size_button: string;
  line_height: string;
  layout_density: string;
  field_layout: string;
  field_columns: number;
  button_style: string;
  button_size: string;
  button_position: string;
  button_order: string;
  tab_style: string;
  tab_border: string;
  table_style: string;
  table_row_height: string;
  table_borders: string;
  row_height: string;
  field_height: string;
  element_spacing: string;
  inner_padding: string;
}

export const defaultTheme: ThemeSettings = {
  theme_name: 'custom',
  primary_color: '#5B2EFF',
  secondary_color: '#e8e4f0',
  background_color: '#f5f6fa',
  header_color: '#1b1430',
  tab_active_color: '#5B2EFF',
  tab_inactive_color: '#9ca3af',
  button_primary_color: '#5B2EFF',
  button_secondary_color: '#e8e4f0',
  hover_color: '#4920cc',
  border_color: '#e2e0ea',
  field_color: '#ffffff',
  table_color: '#ffffff',
  table_alt_color: '#f9f9fb',
  font_family: 'Inter',
  font_family_titles: 'Inter',
  font_family_tables: 'Inter',
  font_size_title: '24px',
  font_size_tab: '14px',
  font_size_body: '14px',
  font_size_table: '13px',
  font_size_button: '14px',
  line_height: '1.5',
  layout_density: 'default',
  field_layout: 'side-by-side',
  field_columns: 2,
  button_style: 'rounded',
  button_size: 'medium',
  button_position: 'right',
  button_order: 'save-cancel',
  tab_style: 'modern',
  tab_border: 'underline',
  table_style: 'striped',
  table_row_height: '40px',
  table_borders: 'horizontal',
  row_height: '40px',
  field_height: '40px',
  element_spacing: '16px',
  inner_padding: '16px',
};

export const themePresets: Record<string, Partial<ThemeSettings>> = {
  'erp-classico': {
    theme_name: 'ERP Clássico',
    primary_color: '#2563eb',
    secondary_color: '#e0e7ff',
    background_color: '#f0f0f0',
    header_color: '#1e3a5f',
    tab_active_color: '#2563eb',
    tab_inactive_color: '#6b7280',
    button_primary_color: '#2563eb',
    button_secondary_color: '#e0e7ff',
    hover_color: '#1d4ed8',
    border_color: '#d1d5db',
    field_color: '#ffffff',
    table_color: '#ffffff',
    table_alt_color: '#f3f4f6',
    font_family: 'Arial',
    font_family_titles: 'Arial',
    font_family_tables: 'Arial',
    button_style: 'square',
    tab_style: 'classic',
    tab_border: 'border',
    layout_density: 'compact',
  },
  'moderno': {
    theme_name: 'Moderno',
    primary_color: '#6366f1',
    secondary_color: '#eef2ff',
    background_color: '#fafbff',
    header_color: '#1e1b4b',
    tab_active_color: '#6366f1',
    tab_inactive_color: '#a5b4fc',
    button_primary_color: '#6366f1',
    button_secondary_color: '#e0e7ff',
    hover_color: '#4f46e5',
    border_color: '#e0e7ff',
    field_color: '#ffffff',
    table_color: '#ffffff',
    table_alt_color: '#f5f3ff',
    font_family: 'Inter',
    font_family_titles: 'Inter',
    font_family_tables: 'Inter',
    button_style: 'rounded',
    tab_style: 'modern',
    tab_border: 'underline',
    layout_density: 'default',
  },
  'minimalista': {
    theme_name: 'Minimalista',
    primary_color: '#18181b',
    secondary_color: '#f4f4f5',
    background_color: '#ffffff',
    header_color: '#18181b',
    tab_active_color: '#18181b',
    tab_inactive_color: '#a1a1aa',
    button_primary_color: '#18181b',
    button_secondary_color: '#f4f4f5',
    hover_color: '#27272a',
    border_color: '#e4e4e7',
    field_color: '#ffffff',
    table_color: '#ffffff',
    table_alt_color: '#fafafa',
    font_family: 'Inter',
    font_family_titles: 'Inter',
    font_family_tables: 'Inter',
    button_style: 'square',
    tab_style: 'minimal',
    tab_border: 'none',
    layout_density: 'spacious',
  },
  'premium': {
    theme_name: 'Premium',
    primary_color: '#5B2EFF',
    secondary_color: '#e8e4f0',
    background_color: '#f5f6fa',
    header_color: '#1b1430',
    tab_active_color: '#5B2EFF',
    tab_inactive_color: '#9ca3af',
    button_primary_color: '#5B2EFF',
    button_secondary_color: '#e8e4f0',
    hover_color: '#4920cc',
    border_color: '#e2e0ea',
    field_color: '#ffffff',
    table_color: '#ffffff',
    table_alt_color: '#f9f9fb',
    font_family: 'Inter',
    font_family_titles: 'Inter',
    font_family_tables: 'Inter',
    button_style: 'rounded',
    tab_style: 'modern',
    tab_border: 'underline',
    layout_density: 'default',
  },
  'dark-mode': {
    theme_name: 'Dark Mode',
    primary_color: '#818cf8',
    secondary_color: '#1e1b4b',
    background_color: '#0f0d1a',
    header_color: '#0a0812',
    tab_active_color: '#818cf8',
    tab_inactive_color: '#4b5563',
    button_primary_color: '#818cf8',
    button_secondary_color: '#1e1b4b',
    hover_color: '#6366f1',
    border_color: '#27243d',
    field_color: '#1a1730',
    table_color: '#13111f',
    table_alt_color: '#1a1730',
    font_family: 'Inter',
    font_family_titles: 'Inter',
    font_family_tables: 'Inter',
    button_style: 'rounded',
    tab_style: 'modern',
    tab_border: 'underline',
    layout_density: 'default',
  },
};

function hexToHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function applyThemeToDOM(theme: ThemeSettings) {
  const root = document.documentElement;
  root.style.setProperty('--theme-primary', theme.primary_color);
  root.style.setProperty('--theme-secondary', theme.secondary_color);
  root.style.setProperty('--theme-background', theme.background_color);
  root.style.setProperty('--theme-header', theme.header_color);
  root.style.setProperty('--theme-tab-active', theme.tab_active_color);
  root.style.setProperty('--theme-tab-inactive', theme.tab_inactive_color);
  root.style.setProperty('--theme-btn-primary', theme.button_primary_color);
  root.style.setProperty('--theme-btn-secondary', theme.button_secondary_color);
  root.style.setProperty('--theme-hover', theme.hover_color);
  root.style.setProperty('--theme-border', theme.border_color);
  root.style.setProperty('--theme-field', theme.field_color);
  root.style.setProperty('--theme-table', theme.table_color);
  root.style.setProperty('--theme-table-alt', theme.table_alt_color);
  root.style.setProperty('--theme-font-family', theme.font_family);
  root.style.setProperty('--theme-font-titles', theme.font_family_titles);
  root.style.setProperty('--theme-font-tables', theme.font_family_tables);
  root.style.setProperty('--theme-font-size-title', theme.font_size_title);
  root.style.setProperty('--theme-font-size-tab', theme.font_size_tab);
  root.style.setProperty('--theme-font-size-body', theme.font_size_body);
  root.style.setProperty('--theme-font-size-table', theme.font_size_table);
  root.style.setProperty('--theme-font-size-button', theme.font_size_button);
  root.style.setProperty('--theme-line-height', theme.line_height);
  root.style.setProperty('--theme-row-height', theme.row_height);
  root.style.setProperty('--theme-field-height', theme.field_height);
  root.style.setProperty('--theme-element-spacing', theme.element_spacing);
  root.style.setProperty('--theme-inner-padding', theme.inner_padding);
  root.style.setProperty('--theme-table-row-height', theme.table_row_height);

  // Apply button border-radius based on style
  const btnRadius = theme.button_style === 'rounded' ? '8px' : theme.button_style === 'square' ? '2px' : '6px';
  root.style.setProperty('--theme-button-radius', btnRadius);

  // Apply to CSS base variables for global effect
  root.style.setProperty('--primary', hexToHsl(theme.primary_color));
  root.style.setProperty('--background', hexToHsl(theme.background_color));
  root.style.setProperty('--border', hexToHsl(theme.border_color));
  root.style.setProperty('--input', hexToHsl(theme.border_color));
  root.style.setProperty('--ring', hexToHsl(theme.primary_color));
  root.style.setProperty('--secondary', hexToHsl(theme.secondary_color));

  // Font
  root.style.fontFamily = `'${theme.font_family}', ui-sans-serif, system-ui, sans-serif`;
}

interface ThemeContextType {
  theme: ThemeSettings;
  setTheme: (t: ThemeSettings) => void;
  saveTheme: (t: ThemeSettings) => Promise<void>;
  loading: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: defaultTheme,
  setTheme: () => {},
  saveTheme: async () => {},
  loading: true,
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeSettings>(defaultTheme);
  const [loading, setLoading] = useState(true);
  const { activeCompany } = useCompany();

  const loadTheme = useCallback(async () => {
    if (!activeCompany) { setLoading(false); return; }
    const { data } = await supabase
      .from('system_theme_settings')
      .select('*')
      .eq('empresa_id', activeCompany.id)
      .maybeSingle() as any;
    if (data) {
      const t = { ...defaultTheme, ...data } as ThemeSettings;
      setThemeState(t);
      applyThemeToDOM(t);
    } else {
      applyThemeToDOM(defaultTheme);
    }
    setLoading(false);
  }, [activeCompany]);

  useEffect(() => { loadTheme(); }, [loadTheme]);

  const setTheme = (t: ThemeSettings) => {
    setThemeState(t);
    applyThemeToDOM(t);
  };

  const saveTheme = async (t: ThemeSettings) => {
    if (!activeCompany) return;
    const payload: any = { ...t, empresa_id: activeCompany.id };
    delete payload.id;
    delete payload.created_at;
    delete payload.updated_at;

    const { data: existing } = await supabase
      .from('system_theme_settings')
      .select('id')
      .eq('empresa_id', activeCompany.id)
      .maybeSingle() as any;

    if (existing) {
      await supabase.from('system_theme_settings')
        .update(payload)
        .eq('id', existing.id) as any;
    } else {
      await supabase.from('system_theme_settings')
        .insert(payload) as any;
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, saveTheme, loading }}>
      {children}
    </ThemeContext.Provider>
  );
}
