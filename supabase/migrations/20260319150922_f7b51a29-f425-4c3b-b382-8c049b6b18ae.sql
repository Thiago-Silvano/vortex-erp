ALTER TABLE public.itineraries 
  ADD COLUMN IF NOT EXISTS thank_you_title_font_color text DEFAULT '#d97706',
  ADD COLUMN IF NOT EXISTS thank_you_title_font_size integer DEFAULT 12,
  ADD COLUMN IF NOT EXISTS thank_you_title_font_style text DEFAULT 'bold',
  ADD COLUMN IF NOT EXISTS thank_you_title_font_effect text DEFAULT 'spaced';