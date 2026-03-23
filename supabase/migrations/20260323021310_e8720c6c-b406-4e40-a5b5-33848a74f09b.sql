
CREATE TABLE public.contract_bundles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.companies(id),
  sale_id uuid,
  token text NOT NULL DEFAULT (gen_random_uuid())::text,
  short_id text NOT NULL DEFAULT substr(md5((random())::text), 1, 10),
  client_name text DEFAULT '',
  client_email text DEFAULT '',
  client_phone text DEFAULT '',
  client_cpf text DEFAULT '',
  status text NOT NULL DEFAULT 'draft',
  sent_at timestamptz,
  viewed_at timestamptz,
  signed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text DEFAULT ''
);

ALTER TABLE public.contract_bundles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contract_bundles_select" ON public.contract_bundles FOR SELECT USING (true);
CREATE POLICY "contract_bundles_insert" ON public.contract_bundles FOR INSERT WITH CHECK (true);
CREATE POLICY "contract_bundles_update" ON public.contract_bundles FOR UPDATE USING (true);
CREATE POLICY "contract_bundles_delete" ON public.contract_bundles FOR DELETE USING (true);

-- Add bundle_id to contracts table to link contracts to a bundle
ALTER TABLE public.contracts ADD COLUMN bundle_id uuid REFERENCES public.contract_bundles(id) ON DELETE SET NULL;

-- Enable realtime for bundles
ALTER PUBLICATION supabase_realtime ADD TABLE public.contract_bundles;
