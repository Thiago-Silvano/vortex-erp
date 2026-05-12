
ALTER TABLE public.whatsapp_settings
  ADD COLUMN IF NOT EXISTS reminder_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_phone text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS reminder_template_48h text NOT NULL DEFAULT '📅 Lembrete: Check-in em 2 dias\n\n*{{descricao}}*\nLocalizador: {{localizador}}\nCheck-in: {{checkin}}\n\nFaltam 2 dias. Acompanhe a reserva.',
  ADD COLUMN IF NOT EXISTS reminder_template_24h text NOT NULL DEFAULT '⏰ Lembrete: Check-in amanhã\n\n*{{descricao}}*\nLocalizador: {{localizador}}\nCheck-in: {{checkin}}\n\nFaltam menos de 24h. Confirme o status da reserva.',
  ADD COLUMN IF NOT EXISTS reminder_template_10h text NOT NULL DEFAULT '⏰ Lembrete: Check-in em menos de 10h\n\n*{{descricao}}*\nLocalizador: {{localizador}}\nCheck-in: {{checkin}}\n\nVerifique se tudo está em ordem.',
  ADD COLUMN IF NOT EXISTS reminder_template_urgent text NOT NULL DEFAULT '🚨 URGENTE - Check-in em menos de 2h\n\n*{{descricao}}*\nLocalizador: {{localizador}}\nCheck-in: {{checkin}}\n\nAtualize o status da reserva o quanto antes!',
  ADD COLUMN IF NOT EXISTS reminder_template_missed text NOT NULL DEFAULT '⚠️ Check-in NÃO realizado\n\n*{{descricao}}*\nLocalizador: {{localizador}}\nCheck-in previsto: {{checkin}}\n\nO status ainda não foi atualizado para Confirmada. Verifique urgentemente.';
