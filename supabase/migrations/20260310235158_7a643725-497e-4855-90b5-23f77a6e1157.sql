
-- Add user_id to email_settings (per-user config)
ALTER TABLE public.email_settings ADD COLUMN IF NOT EXISTS user_id uuid;

-- Add user_id to emails (which user's mailbox)
ALTER TABLE public.emails ADD COLUMN IF NOT EXISTS user_id uuid;

-- Create unique constraint: one email config per user
-- (drop old empresa_id unique if exists, add user_id unique)
ALTER TABLE public.email_settings DROP CONSTRAINT IF EXISTS email_settings_empresa_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS email_settings_user_id_key ON public.email_settings (user_id) WHERE user_id IS NOT NULL;
