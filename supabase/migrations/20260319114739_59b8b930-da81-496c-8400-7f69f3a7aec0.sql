
-- Itineraries main table
CREATE TABLE public.itineraries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID REFERENCES public.companies(id),
  title TEXT NOT NULL DEFAULT '',
  subtitle TEXT DEFAULT '',
  client_name TEXT DEFAULT '',
  travel_date TEXT DEFAULT '',
  cover_image_url TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  short_id TEXT NOT NULL DEFAULT substr(md5((random())::text), 1, 8),
  token TEXT NOT NULL DEFAULT substr(md5(((random())::text || (clock_timestamp())::text)), 1, 32),
  thank_you_text TEXT DEFAULT 'Obrigado por escolher viajar conosco! Desejamos uma viagem inesquecível.',
  thank_you_image_url TEXT DEFAULT '',
  created_by TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.itineraries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "itineraries_select" ON public.itineraries FOR SELECT TO public USING (true);
CREATE POLICY "itineraries_insert" ON public.itineraries FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "itineraries_update" ON public.itineraries FOR UPDATE TO public USING (true);
CREATE POLICY "itineraries_delete" ON public.itineraries FOR DELETE TO public USING (true);

-- Destinations within an itinerary
CREATE TABLE public.itinerary_destinations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  itinerary_id UUID NOT NULL REFERENCES public.itineraries(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  image_url TEXT DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.itinerary_destinations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "itin_dest_select" ON public.itinerary_destinations FOR SELECT TO public USING (true);
CREATE POLICY "itin_dest_insert" ON public.itinerary_destinations FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "itin_dest_update" ON public.itinerary_destinations FOR UPDATE TO public USING (true);
CREATE POLICY "itin_dest_delete" ON public.itinerary_destinations FOR DELETE TO public USING (true);

-- Days within an itinerary
CREATE TABLE public.itinerary_days (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  itinerary_id UUID NOT NULL REFERENCES public.itineraries(id) ON DELETE CASCADE,
  destination_id UUID REFERENCES public.itinerary_destinations(id) ON DELETE SET NULL,
  day_number INTEGER NOT NULL DEFAULT 1,
  title TEXT DEFAULT '',
  subtitle TEXT DEFAULT '',
  description TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.itinerary_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "itin_days_select" ON public.itinerary_days FOR SELECT TO public USING (true);
CREATE POLICY "itin_days_insert" ON public.itinerary_days FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "itin_days_update" ON public.itinerary_days FOR UPDATE TO public USING (true);
CREATE POLICY "itin_days_delete" ON public.itinerary_days FOR DELETE TO public USING (true);

-- Attractions within a day
CREATE TABLE public.itinerary_attractions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  day_id UUID NOT NULL REFERENCES public.itinerary_days(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  location TEXT DEFAULT '',
  address TEXT DEFAULT '',
  city TEXT DEFAULT '',
  description TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  time TEXT DEFAULT '',
  duration TEXT DEFAULT '',
  observation TEXT DEFAULT '',
  category TEXT NOT NULL DEFAULT 'attraction',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.itinerary_attractions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "itin_attr_select" ON public.itinerary_attractions FOR SELECT TO public USING (true);
CREATE POLICY "itin_attr_insert" ON public.itinerary_attractions FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "itin_attr_update" ON public.itinerary_attractions FOR UPDATE TO public USING (true);
CREATE POLICY "itin_attr_delete" ON public.itinerary_attractions FOR DELETE TO public USING (true);

-- Checklist items for an itinerary
CREATE TABLE public.itinerary_checklist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  itinerary_id UUID NOT NULL REFERENCES public.itineraries(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'geral',
  item TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.itinerary_checklist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "itin_check_select" ON public.itinerary_checklist FOR SELECT TO public USING (true);
CREATE POLICY "itin_check_insert" ON public.itinerary_checklist FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "itin_check_update" ON public.itinerary_checklist FOR UPDATE TO public USING (true);
CREATE POLICY "itin_check_delete" ON public.itinerary_checklist FOR DELETE TO public USING (true);
