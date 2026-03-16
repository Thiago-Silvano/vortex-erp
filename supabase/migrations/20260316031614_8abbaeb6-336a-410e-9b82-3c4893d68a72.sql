ALTER TABLE public.whatsapp_messages 
ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES public.whatsapp_messages(id),
ADD COLUMN IF NOT EXISTS reply_to_content text;