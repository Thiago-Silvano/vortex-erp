
INSERT INTO storage.buckets (id, name, public) VALUES ('whatsapp-media', 'whatsapp-media', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can upload whatsapp media" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'whatsapp-media');
CREATE POLICY "Anyone can read whatsapp media" ON storage.objects FOR SELECT TO public USING (bucket_id = 'whatsapp-media');
