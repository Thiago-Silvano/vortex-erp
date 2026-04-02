
INSERT INTO storage.buckets (id, name, public) VALUES ('promotion-images', 'promotion-images', true);

CREATE POLICY "Anyone can view promotion images" ON storage.objects
  FOR SELECT USING (bucket_id = 'promotion-images');

CREATE POLICY "Authenticated users can upload promotion images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'promotion-images');

CREATE POLICY "Authenticated users can update promotion images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'promotion-images');

CREATE POLICY "Authenticated users can delete promotion images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'promotion-images');
