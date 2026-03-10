
ALTER TABLE public.whatsapp_messages 
ADD COLUMN IF NOT EXISTS reply_to_message_id text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS media_mimetype text DEFAULT NULL;
