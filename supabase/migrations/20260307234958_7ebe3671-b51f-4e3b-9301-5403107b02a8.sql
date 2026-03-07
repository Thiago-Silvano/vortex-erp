
CREATE TABLE public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  event_date date NOT NULL,
  event_time time NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Calendar events are publicly readable" ON public.calendar_events FOR SELECT USING (true);
CREATE POLICY "Calendar events are publicly writable" ON public.calendar_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Calendar events are publicly updatable" ON public.calendar_events FOR UPDATE USING (true);
CREATE POLICY "Calendar events are publicly deletable" ON public.calendar_events FOR DELETE USING (true);
