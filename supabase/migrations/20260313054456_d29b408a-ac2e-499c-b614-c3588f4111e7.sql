ALTER TABLE public.whatsapp_settings 
ADD COLUMN IF NOT EXISTS connected_phone text DEFAULT '',
ADD COLUMN IF NOT EXISTS connected_name text DEFAULT '';