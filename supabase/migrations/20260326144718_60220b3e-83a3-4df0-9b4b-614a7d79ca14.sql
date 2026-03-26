
-- Fiscal company settings
CREATE TABLE public.fiscal_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  razao_social text NOT NULL DEFAULT '',
  nome_fantasia text NOT NULL DEFAULT '',
  cnpj text NOT NULL DEFAULT '',
  inscricao_municipal text DEFAULT '',
  cnae text DEFAULT '',
  regime_tributario text DEFAULT 'simples_nacional',
  municipio text DEFAULT 'Criciúma',
  uf text DEFAULT 'SC',
  cep text DEFAULT '',
  logradouro text DEFAULT '',
  numero text DEFAULT '',
  complemento text DEFAULT '',
  bairro text DEFAULT '',
  telefone text DEFAULT '',
  email_fiscal text DEFAULT '',
  codigo_servico text DEFAULT '',
  item_lista_servico text DEFAULT '',
  aliquota_padrao numeric DEFAULT 0,
  natureza_operacao text DEFAULT '1',
  serie_nfse text DEFAULT '1',
  ambiente text DEFAULT 'homologacao',
  exigibilidade_iss text DEFAULT '1',
  optante_simples boolean DEFAULT true,
  retencao_iss_padrao boolean DEFAULT false,
  observacoes_padrao text DEFAULT '',
  codigo_tributacao text DEFAULT '',
  incidencia_tributaria text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(empresa_id)
);

ALTER TABLE public.fiscal_companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fiscal_companies_select" ON public.fiscal_companies FOR SELECT USING (true);
CREATE POLICY "fiscal_companies_insert" ON public.fiscal_companies FOR INSERT WITH CHECK (true);
CREATE POLICY "fiscal_companies_update" ON public.fiscal_companies FOR UPDATE USING (true);
CREATE POLICY "fiscal_companies_delete" ON public.fiscal_companies FOR DELETE USING (true);

-- Fiscal certificates
CREATE TABLE public.fiscal_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  titular text DEFAULT '',
  cnpj_certificado text DEFAULT '',
  emissor text DEFAULT '',
  validade_inicio timestamptz,
  validade_fim timestamptz,
  arquivo_hash text DEFAULT '',
  arquivo_encrypted text DEFAULT '',
  senha_encrypted text DEFAULT '',
  status text DEFAULT 'active',
  uploaded_by text DEFAULT '',
  uploaded_at timestamptz DEFAULT now(),
  validated_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.fiscal_certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fiscal_certificates_select" ON public.fiscal_certificates FOR SELECT USING (true);
CREATE POLICY "fiscal_certificates_insert" ON public.fiscal_certificates FOR INSERT WITH CHECK (true);
CREATE POLICY "fiscal_certificates_update" ON public.fiscal_certificates FOR UPDATE USING (true);
CREATE POLICY "fiscal_certificates_delete" ON public.fiscal_certificates FOR DELETE USING (true);

-- Fiscal service mappings
CREATE TABLE public.fiscal_service_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  nome_interno text NOT NULL DEFAULT '',
  categoria text DEFAULT '',
  codigo_servico text DEFAULT '',
  item_lista_lc116 text DEFAULT '',
  descricao_fiscal text DEFAULT '',
  aliquota numeric DEFAULT 0,
  retencao_iss boolean DEFAULT false,
  tributacao text DEFAULT '',
  municipio_incidencia text DEFAULT '',
  observacoes text DEFAULT '',
  is_active boolean DEFAULT true,
  service_catalog_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.fiscal_service_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fiscal_service_mappings_select" ON public.fiscal_service_mappings FOR SELECT USING (true);
CREATE POLICY "fiscal_service_mappings_insert" ON public.fiscal_service_mappings FOR INSERT WITH CHECK (true);
CREATE POLICY "fiscal_service_mappings_update" ON public.fiscal_service_mappings FOR UPDATE USING (true);
CREATE POLICY "fiscal_service_mappings_delete" ON public.fiscal_service_mappings FOR DELETE USING (true);

-- NFS-e documents
CREATE TABLE public.nfse_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  sale_id uuid,
  client_id uuid,
  numero_nfse text,
  chave_nfse text,
  protocolo text,
  serie text DEFAULT '1',
  status text DEFAULT 'rascunho',
  ambiente text DEFAULT 'homologacao',
  data_emissao timestamptz,
  data_competencia date,
  valor_servicos numeric DEFAULT 0,
  valor_deducoes numeric DEFAULT 0,
  valor_descontos numeric DEFAULT 0,
  base_calculo numeric DEFAULT 0,
  aliquota numeric DEFAULT 0,
  valor_iss numeric DEFAULT 0,
  valor_liquido numeric DEFAULT 0,
  iss_retido boolean DEFAULT false,
  exigibilidade_iss text DEFAULT '1',
  municipio_incidencia text DEFAULT '',
  codigo_servico text DEFAULT '',
  item_lista_servico text DEFAULT '',
  descricao_servico text DEFAULT '',
  natureza_operacao text DEFAULT '1',
  tomador_cnpj_cpf text DEFAULT '',
  tomador_razao_social text DEFAULT '',
  tomador_email text DEFAULT '',
  tomador_telefone text DEFAULT '',
  tomador_logradouro text DEFAULT '',
  tomador_numero text DEFAULT '',
  tomador_complemento text DEFAULT '',
  tomador_bairro text DEFAULT '',
  tomador_municipio text DEFAULT '',
  tomador_uf text DEFAULT '',
  tomador_cep text DEFAULT '',
  observacoes text DEFAULT '',
  xml_dps text,
  xml_nfse_autorizada text,
  pdf_url text,
  motivo_rejeicao text,
  motivo_rejeicao_tecnico text,
  motivo_cancelamento text,
  cancelado_por text,
  cancelado_em timestamptz,
  protocolo_cancelamento text,
  emitido_por text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.nfse_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nfse_documents_select" ON public.nfse_documents FOR SELECT USING (true);
CREATE POLICY "nfse_documents_insert" ON public.nfse_documents FOR INSERT WITH CHECK (true);
CREATE POLICY "nfse_documents_update" ON public.nfse_documents FOR UPDATE USING (true);
CREATE POLICY "nfse_documents_delete" ON public.nfse_documents FOR DELETE USING (true);

-- NFS-e items
CREATE TABLE public.nfse_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nfse_id uuid REFERENCES public.nfse_documents(id) ON DELETE CASCADE NOT NULL,
  descricao text DEFAULT '',
  valor numeric DEFAULT 0,
  quantidade numeric DEFAULT 1,
  valor_unitario numeric DEFAULT 0,
  codigo_servico text DEFAULT '',
  aliquota numeric DEFAULT 0,
  valor_iss numeric DEFAULT 0,
  sale_item_id uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.nfse_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nfse_items_select" ON public.nfse_items FOR SELECT USING (true);
CREATE POLICY "nfse_items_insert" ON public.nfse_items FOR INSERT WITH CHECK (true);
CREATE POLICY "nfse_items_update" ON public.nfse_items FOR UPDATE USING (true);
CREATE POLICY "nfse_items_delete" ON public.nfse_items FOR DELETE USING (true);

-- NFS-e events (timeline)
CREATE TABLE public.nfse_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nfse_id uuid REFERENCES public.nfse_documents(id) ON DELETE CASCADE NOT NULL,
  event_type text NOT NULL DEFAULT '',
  description text DEFAULT '',
  details jsonb DEFAULT '{}',
  user_id text DEFAULT '',
  user_email text DEFAULT '',
  ip_address text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.nfse_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nfse_events_select" ON public.nfse_events FOR SELECT USING (true);
CREATE POLICY "nfse_events_insert" ON public.nfse_events FOR INSERT WITH CHECK (true);

-- NFS-e API logs (technical)
CREATE TABLE public.nfse_api_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nfse_id uuid REFERENCES public.nfse_documents(id) ON DELETE SET NULL,
  empresa_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  endpoint text DEFAULT '',
  method text DEFAULT 'POST',
  request_payload text,
  response_payload text,
  response_status integer,
  response_time_ms integer,
  ambiente text DEFAULT 'homologacao',
  error_message text,
  xml_hash text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.nfse_api_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nfse_api_logs_select" ON public.nfse_api_logs FOR SELECT USING (true);
CREATE POLICY "nfse_api_logs_insert" ON public.nfse_api_logs FOR INSERT WITH CHECK (true);

-- NFS-e audit logs
CREATE TABLE public.nfse_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  nfse_id uuid REFERENCES public.nfse_documents(id) ON DELETE SET NULL,
  action text NOT NULL DEFAULT '',
  description text DEFAULT '',
  user_id text DEFAULT '',
  user_email text DEFAULT '',
  ip_address text DEFAULT '',
  details jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.nfse_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nfse_audit_logs_select" ON public.nfse_audit_logs FOR SELECT USING (true);
CREATE POLICY "nfse_audit_logs_insert" ON public.nfse_audit_logs FOR INSERT WITH CHECK (true);

-- NFS-e notification logs
CREATE TABLE public.nfse_notification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nfse_id uuid REFERENCES public.nfse_documents(id) ON DELETE CASCADE NOT NULL,
  channel text DEFAULT 'email',
  recipient text DEFAULT '',
  status text DEFAULT 'sent',
  error_message text,
  sent_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.nfse_notification_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nfse_notification_logs_select" ON public.nfse_notification_logs FOR SELECT USING (true);
CREATE POLICY "nfse_notification_logs_insert" ON public.nfse_notification_logs FOR INSERT WITH CHECK (true);

-- NFS-e status queue (for retry/reprocessing)
CREATE TABLE public.nfse_status_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nfse_id uuid REFERENCES public.nfse_documents(id) ON DELETE CASCADE NOT NULL,
  empresa_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  action text DEFAULT 'check_status',
  attempts integer DEFAULT 0,
  max_attempts integer DEFAULT 5,
  next_attempt_at timestamptz DEFAULT now(),
  last_error text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.nfse_status_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nfse_status_queue_select" ON public.nfse_status_queue FOR SELECT USING (true);
CREATE POLICY "nfse_status_queue_insert" ON public.nfse_status_queue FOR INSERT WITH CHECK (true);
CREATE POLICY "nfse_status_queue_update" ON public.nfse_status_queue FOR UPDATE USING (true);
CREATE POLICY "nfse_status_queue_delete" ON public.nfse_status_queue FOR DELETE USING (true);

-- Add fiscal status to sales table
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS fiscal_status text DEFAULT 'nao_emitida';
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS nfse_id uuid;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS nfse_number text;
