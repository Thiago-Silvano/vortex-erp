ALTER TABLE public.itineraries 
  ADD COLUMN IF NOT EXISTS thank_you_title text DEFAULT 'Obrigado',
  ADD COLUMN IF NOT EXISTS thank_you_text_align text DEFAULT 'center',
  ADD COLUMN IF NOT EXISTS thank_you_image_position jsonb DEFAULT NULL;