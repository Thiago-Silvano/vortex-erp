
-- Create client_photos table
CREATE TABLE public.client_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES public.companies(id),
  file_name TEXT NOT NULL DEFAULT '',
  file_url TEXT NOT NULL,
  uploaded_by TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_photos ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "client_photos_select" ON public.client_photos FOR SELECT TO public USING (true);
CREATE POLICY "client_photos_insert" ON public.client_photos FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "client_photos_delete" ON public.client_photos FOR DELETE TO public USING (true);

-- Create storage bucket for client photos
INSERT INTO storage.buckets (id, name, public) VALUES ('client-photos', 'client-photos', true);

-- Storage RLS policies
CREATE POLICY "client_photos_storage_select" ON storage.objects FOR SELECT TO public USING (bucket_id = 'client-photos');
CREATE POLICY "client_photos_storage_insert" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'client-photos');
CREATE POLICY "client_photos_storage_delete" ON storage.objects FOR DELETE TO public USING (bucket_id = 'client-photos');
