
CREATE TABLE public.reservation_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES public.companies(id),
  reminder_type TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reservation_reminders_reservation ON public.reservation_reminders(reservation_id);
CREATE INDEX idx_reservation_reminders_type ON public.reservation_reminders(reservation_id, reminder_type);

ALTER TABLE public.reservation_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON public.reservation_reminders FOR ALL USING (true) WITH CHECK (true);
