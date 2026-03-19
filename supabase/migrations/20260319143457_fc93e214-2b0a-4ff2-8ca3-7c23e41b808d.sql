ALTER TABLE public.itineraries 
  ADD COLUMN IF NOT EXISTS thank_you_font_color text DEFAULT '#374151',
  ADD COLUMN IF NOT EXISTS thank_you_font_size integer DEFAULT 16,
  ADD COLUMN IF NOT EXISTS thank_you_font_style text DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS thank_you_font_effect text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS thank_you_image_size integer DEFAULT 100;