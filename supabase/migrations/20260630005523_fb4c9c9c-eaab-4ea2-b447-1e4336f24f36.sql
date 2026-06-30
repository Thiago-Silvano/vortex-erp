-- Campos de integração com o robô DS-160 (preenchimento automático)
ALTER TABLE public.ds160_forms ADD COLUMN IF NOT EXISTS robot_status TEXT NOT NULL DEFAULT 'pendente';
ALTER TABLE public.ds160_forms ADD COLUMN IF NOT EXISTS robot_application_id TEXT;
ALTER TABLE public.ds160_forms ADD COLUMN IF NOT EXISTS robot_filled_at TIMESTAMPTZ;
ALTER TABLE public.ds160_forms ADD COLUMN IF NOT EXISTS robot_machine TEXT;

-- Realtime: garante payloads completos no UPDATE e adiciona a tabela à publicação
ALTER TABLE public.ds160_forms REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'ds160_forms'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ds160_forms;
  END IF;
END $$;