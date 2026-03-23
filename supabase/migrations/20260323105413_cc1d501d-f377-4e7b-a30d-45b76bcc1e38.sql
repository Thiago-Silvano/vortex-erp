
-- Add selfie and geolocation columns to contract_signatures
ALTER TABLE public.contract_signatures
ADD COLUMN IF NOT EXISTS selfie_url text,
ADD COLUMN IF NOT EXISTS geolocation jsonb,
ADD COLUMN IF NOT EXISTS geo_city text,
ADD COLUMN IF NOT EXISTS geo_state text,
ADD COLUMN IF NOT EXISTS geo_country text;

-- Create storage bucket for contract selfies
INSERT INTO storage.buckets (id, name, public)
VALUES ('contract-selfies', 'contract-selfies', true)
ON CONFLICT (id) DO NOTHING;

-- RLS for contract-selfies bucket - allow anonymous uploads and reads
CREATE POLICY "Allow public upload to contract-selfies"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'contract-selfies');

CREATE POLICY "Allow public read from contract-selfies"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'contract-selfies');
