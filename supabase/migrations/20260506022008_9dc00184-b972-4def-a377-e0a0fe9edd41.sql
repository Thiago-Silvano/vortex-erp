
-- Tabela de biblioteca de imagens de produtos
CREATE TABLE public.product_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL,
  product_type TEXT NOT NULL CHECK (product_type IN ('cidade','hospedagem','servico')),
  product_name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  storage_path TEXT,
  keywords TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, product_type, product_name, image_url)
);

CREATE INDEX idx_product_images_empresa_type ON public.product_images(empresa_id, product_type);
CREATE INDEX idx_product_images_name ON public.product_images(empresa_id, lower(product_name));

ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view product images"
ON public.product_images FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert product images"
ON public.product_images FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update product images"
ON public.product_images FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete product images"
ON public.product_images FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_product_images_updated_at
BEFORE UPDATE ON public.product_images
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Bucket público para imagens da biblioteca
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images-library','product-images-library', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can read product images library"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images-library');

CREATE POLICY "Authenticated can upload product images library"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'product-images-library');

CREATE POLICY "Authenticated can update product images library"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'product-images-library');

CREATE POLICY "Authenticated can delete product images library"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'product-images-library');
