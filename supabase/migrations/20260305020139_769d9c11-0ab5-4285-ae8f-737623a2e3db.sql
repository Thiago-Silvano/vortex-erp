
-- Create enum for service types
CREATE TYPE public.service_type AS ENUM ('aereo', 'hotel', 'carro', 'seguro', 'experiencia', 'adicional');

-- Create enum for trip types
CREATE TYPE public.trip_type AS ENUM ('Lazer', 'Lua de mel', 'Família', 'Negócios', 'Experiência Premium');

-- Agency settings table
CREATE TABLE public.agency_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Minha Agência de Viagens',
  logo_url TEXT,
  whatsapp TEXT DEFAULT '',
  email TEXT DEFAULT '',
  website TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.agency_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agency settings are publicly readable" ON public.agency_settings FOR SELECT USING (true);
CREATE POLICY "Agency settings are publicly writable" ON public.agency_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Agency settings are publicly updatable" ON public.agency_settings FOR UPDATE USING (true);

-- Quotes table
CREATE TABLE public.quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  short_id TEXT NOT NULL UNIQUE DEFAULT substr(md5(random()::text), 1, 8),
  client_name TEXT NOT NULL DEFAULT '',
  client_phone TEXT DEFAULT '',
  client_email TEXT DEFAULT '',
  client_passengers INTEGER NOT NULL DEFAULT 1,
  client_notes TEXT DEFAULT '',
  trip_origin TEXT DEFAULT '',
  trip_destination TEXT DEFAULT '',
  trip_departure_date DATE,
  trip_return_date DATE,
  trip_type trip_type NOT NULL DEFAULT 'Lazer',
  trip_nights INTEGER DEFAULT 0,
  destination_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Quotes are publicly readable" ON public.quotes FOR SELECT USING (true);
CREATE POLICY "Quotes are publicly writable" ON public.quotes FOR INSERT WITH CHECK (true);
CREATE POLICY "Quotes are publicly updatable" ON public.quotes FOR UPDATE USING (true);
CREATE POLICY "Quotes are publicly deletable" ON public.quotes FOR DELETE USING (true);

-- Services table
CREATE TABLE public.services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  type service_type NOT NULL DEFAULT 'adicional',
  title TEXT NOT NULL DEFAULT '',
  description TEXT DEFAULT '',
  supplier TEXT DEFAULT '',
  start_date DATE,
  end_date DATE,
  location TEXT DEFAULT '',
  value NUMERIC(12,2) NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 1,
  image_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Services are publicly readable" ON public.services FOR SELECT USING (true);
CREATE POLICY "Services are publicly writable" ON public.services FOR INSERT WITH CHECK (true);
CREATE POLICY "Services are publicly updatable" ON public.services FOR UPDATE USING (true);
CREATE POLICY "Services are publicly deletable" ON public.services FOR DELETE USING (true);

-- Service images table
CREATE TABLE public.service_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.service_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service images are publicly readable" ON public.service_images FOR SELECT USING (true);
CREATE POLICY "Service images are publicly writable" ON public.service_images FOR INSERT WITH CHECK (true);
CREATE POLICY "Service images are publicly deletable" ON public.service_images FOR DELETE USING (true);

-- Flight legs table
CREATE TABLE public.flight_legs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  origin TEXT NOT NULL DEFAULT '',
  destination TEXT NOT NULL DEFAULT '',
  departure_date DATE,
  departure_time TEXT DEFAULT '',
  arrival_date DATE,
  arrival_time TEXT DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.flight_legs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Flight legs are publicly readable" ON public.flight_legs FOR SELECT USING (true);
CREATE POLICY "Flight legs are publicly writable" ON public.flight_legs FOR INSERT WITH CHECK (true);
CREATE POLICY "Flight legs are publicly updatable" ON public.flight_legs FOR UPDATE USING (true);
CREATE POLICY "Flight legs are publicly deletable" ON public.flight_legs FOR DELETE USING (true);

-- Storage bucket for images
INSERT INTO storage.buckets (id, name, public) VALUES ('quote-images', 'quote-images', true);

CREATE POLICY "Quote images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'quote-images');
CREATE POLICY "Anyone can upload quote images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'quote-images');
CREATE POLICY "Anyone can delete quote images" ON storage.objects FOR DELETE USING (bucket_id = 'quote-images');

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_agency_settings_updated_at BEFORE UPDATE ON public.agency_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
