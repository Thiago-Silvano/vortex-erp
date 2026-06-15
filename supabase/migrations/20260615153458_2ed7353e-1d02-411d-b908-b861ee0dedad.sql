
-- =========================================================================
-- 1. PUBLIC FLOW FUNCTIONS (SECURITY DEFINER, token / short_id scoped)
-- =========================================================================

-- ---- PROPOSAL ----
CREATE OR REPLACE FUNCTION public.get_public_proposal(p_short_id text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sale public.sales;
  v_result jsonb;
BEGIN
  SELECT * INTO v_sale FROM public.sales WHERE short_id = p_short_id LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT jsonb_build_object(
    'sale', jsonb_build_object(
      'id', v_sale.id,
      'short_id', v_sale.short_id,
      'client_name', v_sale.client_name,
      'destination_image_url', v_sale.destination_image_url,
      'installments', v_sale.installments,
      'notes', v_sale.notes,
      'payment_method', v_sale.payment_method,
      'empresa_id', v_sale.empresa_id,
      'quote_id', v_sale.quote_id
    ),
    'items', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', si.id,
        'description', si.description,
        'total_value', si.total_value,
        'service_catalog_id', si.service_catalog_id,
        'metadata', si.metadata,
        'quote_option_id', si.quote_option_id,
        'images', (
          SELECT COALESCE(jsonb_agg(img.image_url ORDER BY img.sort_order), '[]'::jsonb)
          FROM public.sale_item_images img WHERE img.sale_item_id = si.id
        )
      ) ORDER BY si.sort_order), '[]'::jsonb)
      FROM public.sale_items si WHERE si.sale_id = v_sale.id
    ),
    'passengers', (
      SELECT COALESCE(jsonb_agg(to_jsonb(sp) ORDER BY sp.sort_order), '[]'::jsonb)
      FROM public.sale_passengers sp WHERE sp.sale_id = v_sale.id
    ),
    'receivables', (
      SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.installment_number), '[]'::jsonb)
      FROM public.receivables r WHERE r.sale_id = v_sale.id
    ),
    'agency', (
      SELECT to_jsonb(a) FROM public.agency_settings a
      WHERE a.empresa_id = v_sale.empresa_id LIMIT 1
    ),
    'catalog', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name)), '[]'::jsonb)
      FROM public.services_catalog c
    ),
    'options', (
      SELECT COALESCE(jsonb_agg(to_jsonb(o) ORDER BY o.order_index), '[]'::jsonb)
      FROM public.sale_quote_options o WHERE o.sale_id = v_sale.id
    ),
    'quote', (
      SELECT jsonb_build_object(
        'client_passengers', q.client_passengers,
        'destination_image_url', q.destination_image_url,
        'trip_departure_date', q.trip_departure_date,
        'trip_destination', q.trip_destination,
        'trip_nights', q.trip_nights,
        'trip_origin', q.trip_origin,
        'trip_return_date', q.trip_return_date
      )
      FROM public.quotes q WHERE q.id = v_sale.quote_id
    ),
    'previous_choices', (
      SELECT pc.selected_item_ids FROM public.client_proposal_choices pc
      WHERE pc.sale_id = v_sale.id ORDER BY pc.submitted_at DESC LIMIT 1
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_proposal_choice(
  p_short_id text,
  p_selected_item_ids text[],
  p_total numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sale public.sales;
BEGIN
  SELECT * INTO v_sale FROM public.sales WHERE short_id = p_short_id LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'not found'; END IF;

  INSERT INTO public.client_proposal_choices (sale_id, client_name, selected_item_ids, total_value)
  VALUES (v_sale.id, v_sale.client_name, p_selected_item_ids, p_total);
END;
$$;

-- ---- CONTRACT (single) ----
CREATE OR REPLACE FUNCTION public.get_public_contract(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_c public.contracts;
  v_agency jsonb;
BEGIN
  SELECT * INTO v_c FROM public.contracts WHERE token = p_token LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT jsonb_build_object('name', a.name, 'logo_url', a.logo_url)
  INTO v_agency FROM public.agency_settings a WHERE a.empresa_id = v_c.empresa_id LIMIT 1;
  IF v_agency IS NULL THEN
    SELECT jsonb_build_object('name', a.name, 'logo_url', a.logo_url)
    INTO v_agency FROM public.agency_settings a LIMIT 1;
  END IF;
  IF v_agency IS NULL THEN
    SELECT jsonb_build_object('name', co.name, 'logo_url', '')
    INTO v_agency FROM public.companies co WHERE co.id = v_c.empresa_id LIMIT 1;
  END IF;

  RETURN jsonb_build_object(
    'contract', jsonb_build_object(
      'id', v_c.id,
      'title', v_c.title,
      'body_html', v_c.body_html,
      'client_name', v_c.client_name,
      'client_email', v_c.client_email,
      'client_phone', v_c.client_phone,
      'client_cpf', v_c.client_cpf,
      'status', v_c.status,
      'expires_at', v_c.expires_at,
      'viewed_at', v_c.viewed_at,
      'signed_at', v_c.signed_at,
      'empresa_id', v_c.empresa_id
    ),
    'agency', v_agency
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.log_contract_view(
  p_token text, p_ip text, p_user_agent text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_c public.contracts;
BEGIN
  SELECT * INTO v_c FROM public.contracts WHERE token = p_token LIMIT 1;
  IF NOT FOUND THEN RETURN; END IF;

  IF v_c.status <> 'viewed' AND v_c.status <> 'signed' THEN
    UPDATE public.contracts SET status = 'viewed', viewed_at = now() WHERE id = v_c.id;
  END IF;

  INSERT INTO public.contract_audit_log (contract_id, action, actor, actor_type, ip_address, details)
  VALUES (v_c.id, 'viewed', COALESCE(v_c.client_name, 'Cliente'), 'client', COALESCE(p_ip, ''),
          jsonb_build_object('user_agent', p_user_agent));
END;
$$;

CREATE OR REPLACE FUNCTION public.start_contract_signature(
  p_token text, p_signer_name text, p_user_agent text, p_ip text,
  p_geo_city text, p_geo_state text, p_geo_country text, p_geolocation jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_c public.contracts;
  v_id uuid;
BEGIN
  SELECT * INTO v_c FROM public.contracts WHERE token = p_token LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'not found'; END IF;

  INSERT INTO public.contract_signatures (
    contract_id, signer_name, signer_email, signer_phone, signer_cpf,
    verification_method, status, user_agent, ip_address,
    geo_city, geo_state, geo_country, geolocation
  ) VALUES (
    v_c.id, COALESCE(NULLIF(p_signer_name, ''), v_c.client_name), v_c.client_email, v_c.client_phone, v_c.client_cpf,
    'email_otp', 'pending', COALESCE(p_user_agent, ''), COALESCE(p_ip, ''),
    COALESCE(p_geo_city, ''), COALESCE(p_geo_state, ''), COALESCE(p_geo_country, ''), COALESCE(p_geolocation, '{}'::jsonb)
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_contract_signature(
  p_token text, p_signature_id uuid, p_signature_type text, p_signature_data text,
  p_document_hash text, p_device_info text, p_ip text, p_selfie_url text,
  p_geo_city text, p_geo_state text, p_geo_country text, p_geolocation jsonb, p_signer_name text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_c public.contracts;
BEGIN
  SELECT * INTO v_c FROM public.contracts WHERE token = p_token LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'not found'; END IF;

  IF NOT EXISTS (SELECT 1 FROM public.contract_signatures s WHERE s.id = p_signature_id AND s.contract_id = v_c.id) THEN
    RAISE EXCEPTION 'invalid signature';
  END IF;

  UPDATE public.contract_signatures SET
    signature_type = p_signature_type,
    signature_data = p_signature_data,
    document_hash = p_document_hash,
    status = 'signed',
    signed_at = now(),
    device_info = COALESCE(p_device_info, ''),
    ip_address = COALESCE(p_ip, ''),
    selfie_url = COALESCE(p_selfie_url, ''),
    geo_city = COALESCE(p_geo_city, ''),
    geo_state = COALESCE(p_geo_state, ''),
    geo_country = COALESCE(p_geo_country, ''),
    geolocation = COALESCE(p_geolocation, '{}'::jsonb)
  WHERE id = p_signature_id;

  UPDATE public.contracts SET status = 'signed', signed_at = now() WHERE id = v_c.id;

  INSERT INTO public.contract_audit_log (contract_id, action, actor, actor_type, ip_address, details)
  VALUES (v_c.id, 'signed', COALESCE(NULLIF(p_signer_name, ''), v_c.client_name), 'client', COALESCE(p_ip, ''),
    jsonb_build_object('signature_type', p_signature_type, 'document_hash', p_document_hash,
      'verification_method', 'email_otp', 'selfie_url', p_selfie_url,
      'geo_city', p_geo_city, 'geo_state', p_geo_state, 'geo_country', p_geo_country));
END;
$$;

-- ---- CONTRACT BUNDLE ----
CREATE OR REPLACE FUNCTION public.get_public_bundle(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_b public.contract_bundles;
  v_agency jsonb;
BEGIN
  SELECT * INTO v_b FROM public.contract_bundles WHERE token = p_token LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT jsonb_build_object('name', a.name, 'email', a.email, 'whatsapp', a.whatsapp, 'logo_url', a.logo_url)
  INTO v_agency FROM public.agency_settings a WHERE a.empresa_id = v_b.empresa_id LIMIT 1;
  IF v_agency IS NULL THEN
    SELECT jsonb_build_object('name', a.name, 'email', a.email, 'whatsapp', a.whatsapp, 'logo_url', a.logo_url)
    INTO v_agency FROM public.agency_settings a LIMIT 1;
  END IF;
  IF v_agency IS NULL THEN
    SELECT jsonb_build_object('name', co.name, 'email', '', 'whatsapp', '', 'logo_url', '')
    INTO v_agency FROM public.companies co WHERE co.id = v_b.empresa_id LIMIT 1;
  END IF;

  RETURN jsonb_build_object(
    'bundle', jsonb_build_object(
      'id', v_b.id, 'client_name', v_b.client_name, 'client_email', v_b.client_email,
      'client_phone', v_b.client_phone, 'client_cpf', v_b.client_cpf,
      'status', v_b.status, 'signed_at', v_b.signed_at, 'empresa_id', v_b.empresa_id
    ),
    'contracts', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', c.id, 'title', c.title, 'body_html', c.body_html, 'status', c.status, 'signed_at', c.signed_at
      ) ORDER BY c.created_at), '[]'::jsonb)
      FROM public.contracts c WHERE c.bundle_id = v_b.id
    ),
    'agency', v_agency
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.log_bundle_view(
  p_token text, p_ip text, p_user_agent text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_b public.contract_bundles;
  v_c record;
BEGIN
  SELECT * INTO v_b FROM public.contract_bundles WHERE token = p_token LIMIT 1;
  IF NOT FOUND THEN RETURN; END IF;

  IF v_b.status <> 'viewed' THEN
    UPDATE public.contract_bundles SET status = 'viewed', viewed_at = now() WHERE id = v_b.id;
  END IF;

  FOR v_c IN SELECT * FROM public.contracts WHERE bundle_id = v_b.id LOOP
    IF v_c.status <> 'viewed' AND v_c.status <> 'signed' THEN
      UPDATE public.contracts SET status = 'viewed', viewed_at = now() WHERE id = v_c.id;
    END IF;
    INSERT INTO public.contract_audit_log (contract_id, action, actor, actor_type, ip_address, details)
    VALUES (v_c.id, 'viewed', COALESCE(v_b.client_name, 'Cliente'), 'client', COALESCE(p_ip, ''),
      jsonb_build_object('user_agent', p_user_agent, 'bundle_id', v_b.id));
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.start_bundle_signatures(
  p_token text, p_signer_name text, p_user_agent text, p_ip text,
  p_geo_city text, p_geo_state text, p_geo_country text, p_geolocation jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_b public.contract_bundles;
  v_c record;
  v_sig uuid;
  v_map jsonb := '{}'::jsonb;
BEGIN
  SELECT * INTO v_b FROM public.contract_bundles WHERE token = p_token LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'not found'; END IF;

  FOR v_c IN SELECT * FROM public.contracts WHERE bundle_id = v_b.id ORDER BY created_at LOOP
    INSERT INTO public.contract_signatures (
      contract_id, signer_name, signer_email, signer_phone, signer_cpf,
      verification_method, status, user_agent, ip_address,
      geo_city, geo_state, geo_country, geolocation
    ) VALUES (
      v_c.id, COALESCE(NULLIF(p_signer_name, ''), v_b.client_name), v_b.client_email, v_b.client_phone, v_b.client_cpf,
      'email_otp', 'pending', COALESCE(p_user_agent, ''), COALESCE(p_ip, ''),
      COALESCE(p_geo_city, ''), COALESCE(p_geo_state, ''), COALESCE(p_geo_country, ''), COALESCE(p_geolocation, '{}'::jsonb)
    ) RETURNING id INTO v_sig;
    v_map := v_map || jsonb_build_object(v_c.id::text, v_sig::text);
  END LOOP;

  RETURN v_map;
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_bundle_signatures(
  p_token text, p_signature_type text, p_signature_data text, p_device_info text,
  p_ip text, p_selfie_url text, p_geo_city text, p_geo_state text, p_geo_country text,
  p_geolocation jsonb, p_signer_name text, p_docs jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_b public.contract_bundles;
  v_doc jsonb;
  v_contract_id uuid;
  v_signature_id uuid;
  v_hash text;
BEGIN
  SELECT * INTO v_b FROM public.contract_bundles WHERE token = p_token LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'not found'; END IF;

  FOR v_doc IN SELECT * FROM jsonb_array_elements(p_docs) LOOP
    v_contract_id := (v_doc->>'contract_id')::uuid;
    v_signature_id := (v_doc->>'signature_id')::uuid;
    v_hash := v_doc->>'document_hash';

    IF NOT EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = v_contract_id AND c.bundle_id = v_b.id) THEN
      CONTINUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.contract_signatures s WHERE s.id = v_signature_id AND s.contract_id = v_contract_id) THEN
      CONTINUE;
    END IF;

    UPDATE public.contract_signatures SET
      signature_type = p_signature_type,
      signature_data = p_signature_data,
      document_hash = v_hash,
      status = 'signed',
      signed_at = now(),
      verification_confirmed_at = COALESCE(verification_confirmed_at, now()),
      device_info = COALESCE(p_device_info, ''),
      ip_address = COALESCE(p_ip, ''),
      selfie_url = COALESCE(p_selfie_url, ''),
      geo_city = COALESCE(p_geo_city, ''),
      geo_state = COALESCE(p_geo_state, ''),
      geo_country = COALESCE(p_geo_country, ''),
      geolocation = COALESCE(p_geolocation, '{}'::jsonb)
    WHERE id = v_signature_id;

    UPDATE public.contracts SET status = 'signed', signed_at = now() WHERE id = v_contract_id;

    INSERT INTO public.contract_audit_log (contract_id, action, actor, actor_type, ip_address, details)
    VALUES (v_contract_id, 'signed', COALESCE(NULLIF(p_signer_name, ''), v_b.client_name), 'client', COALESCE(p_ip, ''),
      jsonb_build_object('signature_type', p_signature_type, 'document_hash', v_hash,
        'verification_method', 'email_otp', 'bundle_id', v_b.id, 'selfie_url', p_selfie_url,
        'geo_city', p_geo_city, 'geo_state', p_geo_state, 'geo_country', p_geo_country));
  END LOOP;

  UPDATE public.contract_bundles SET status = 'signed', signed_at = now() WHERE id = v_b.id;
END;
$$;

-- ---- DS-160 (single) ----
CREATE OR REPLACE FUNCTION public.get_public_ds160(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_f public.ds160_forms;
  v_name text;
BEGIN
  SELECT * INTO v_f FROM public.ds160_forms WHERE token = p_token LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT full_name INTO v_name FROM public.clients WHERE id = v_f.client_id LIMIT 1;

  RETURN jsonb_build_object(
    'form', jsonb_build_object(
      'id', v_f.id, 'status', v_f.status, 'current_step', v_f.current_step,
      'form_data', v_f.form_data, 'empresa_id', v_f.empresa_id, 'client_id', v_f.client_id
    ),
    'client_name', COALESCE(v_name, '')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.save_public_ds160(
  p_token text, p_form_data jsonb, p_current_step int
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.ds160_forms SET
    form_data = p_form_data,
    current_step = p_current_step,
    status = 'in_progress',
    last_saved_at = now()
  WHERE token = p_token AND status NOT IN ('submitted', 'deleted');
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_public_ds160(
  p_token text, p_form_data jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_f public.ds160_forms;
  v_name text;
BEGIN
  SELECT * INTO v_f FROM public.ds160_forms WHERE token = p_token LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'not found'; END IF;

  UPDATE public.ds160_forms SET
    form_data = p_form_data, current_step = 10, status = 'submitted',
    submitted_at = now(), last_saved_at = now()
  WHERE id = v_f.id;

  SELECT full_name INTO v_name FROM public.clients WHERE id = v_f.client_id LIMIT 1;

  IF v_name IS NOT NULL THEN
    UPDATE public.visa_processes SET status = 'produzindo'
    WHERE (v_f.empresa_id IS NULL OR empresa_id = v_f.empresa_id)
      AND (client_name = v_name OR applicant_name = v_name)
      AND status IN ('falta_passaporte', 'produzindo');
  END IF;

  INSERT INTO public.notifications (empresa_id, user_id, type, title, message, reference_id, reference_type)
  SELECT v_f.empresa_id, up.user_id, 'ds160_submitted', 'DS-160 preenchido',
         COALESCE(v_name, 'Cliente') || ' concluiu o formulário DS-160', v_f.id::text, 'ds160_form'
  FROM public.user_permissions up
  WHERE v_f.empresa_id = ANY(COALESCE(up.empresa_ids, ARRAY[]::uuid[]))
    AND up.user_id IS NOT NULL;
END;
$$;

-- ---- DS-160 (group) ----
CREATE OR REPLACE FUNCTION public.get_public_ds160_group(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_g public.ds160_group_forms;
BEGIN
  SELECT * INTO v_g FROM public.ds160_group_forms WHERE token = p_token LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;

  RETURN jsonb_build_object(
    'group', jsonb_build_object('id', v_g.id, 'status', v_g.status),
    'forms', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'formId', f.id,
        'clientName', COALESCE((SELECT full_name FROM public.clients WHERE id = f.client_id), 'Aplicante'),
        'status', f.status,
        'currentStep', f.current_step,
        'formData', f.form_data
      ) ORDER BY f.created_at), '[]'::jsonb)
      FROM public.ds160_forms f WHERE f.group_id = v_g.id
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.save_public_ds160_group_form(
  p_token text, p_form_id uuid, p_form_data jsonb, p_current_step int, p_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_g public.ds160_group_forms;
BEGIN
  SELECT * INTO v_g FROM public.ds160_group_forms WHERE token = p_token LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'not found'; END IF;

  UPDATE public.ds160_forms SET
    form_data = p_form_data,
    current_step = p_current_step,
    status = CASE WHEN status = 'submitted' THEN 'submitted' ELSE COALESCE(p_status, 'in_progress') END,
    last_saved_at = now()
  WHERE id = p_form_id AND group_id = v_g.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_public_ds160_group_form(
  p_token text, p_form_id uuid, p_form_data jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_g public.ds160_group_forms;
  v_all_done boolean;
BEGIN
  SELECT * INTO v_g FROM public.ds160_group_forms WHERE token = p_token LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'not found'; END IF;

  UPDATE public.ds160_forms SET
    form_data = p_form_data, current_step = 10, status = 'submitted',
    submitted_at = now(), last_saved_at = now()
  WHERE id = p_form_id AND group_id = v_g.id;

  SELECT bool_and(status = 'submitted') INTO v_all_done
  FROM public.ds160_forms WHERE group_id = v_g.id;

  UPDATE public.ds160_group_forms
  SET status = CASE WHEN v_all_done THEN 'submitted' ELSE 'in_progress' END, updated_at = now()
  WHERE id = v_g.id;
END;
$$;

-- Grant execute on public-flow functions to anonymous + authenticated visitors
GRANT EXECUTE ON FUNCTION public.get_public_proposal(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_proposal_choice(text, text[], numeric) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_contract(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_contract_view(text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.start_contract_signature(text, text, text, text, text, text, text, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_contract_signature(text, uuid, text, text, text, text, text, text, text, text, text, jsonb, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_bundle(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_bundle_view(text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.start_bundle_signatures(text, text, text, text, text, text, text, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_bundle_signatures(text, text, text, text, text, text, text, text, text, jsonb, text, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_ds160(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_public_ds160(text, jsonb, int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_public_ds160(text, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_ds160_group(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_public_ds160_group_form(text, uuid, jsonb, int, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_public_ds160_group_form(text, uuid, jsonb) TO anon, authenticated;

-- =========================================================================
-- 2. LOCK DOWN FLAGGED TABLES TO COMPANY-SCOPED AUTHENTICATED ACCESS
-- =========================================================================

-- SALES
DROP POLICY IF EXISTS "Sales are publicly readable" ON public.sales;
DROP POLICY IF EXISTS "Sales are publicly writable" ON public.sales;
DROP POLICY IF EXISTS "Sales are publicly updatable" ON public.sales;
DROP POLICY IF EXISTS "Sales are publicly deletable" ON public.sales;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales TO authenticated;
GRANT ALL ON public.sales TO service_role;
CREATE POLICY "sales_company_select" ON public.sales FOR SELECT TO authenticated USING (public.has_company_access(empresa_id));
CREATE POLICY "sales_company_insert" ON public.sales FOR INSERT TO authenticated WITH CHECK (public.has_company_access(empresa_id));
CREATE POLICY "sales_company_update" ON public.sales FOR UPDATE TO authenticated USING (public.has_company_access(empresa_id)) WITH CHECK (public.has_company_access(empresa_id));
CREATE POLICY "sales_company_delete" ON public.sales FOR DELETE TO authenticated USING (public.has_company_access(empresa_id));

-- RECEIVABLES
DROP POLICY IF EXISTS "Receivables are publicly readable" ON public.receivables;
DROP POLICY IF EXISTS "Receivables are publicly writable" ON public.receivables;
DROP POLICY IF EXISTS "Receivables are publicly updatable" ON public.receivables;
DROP POLICY IF EXISTS "Receivables are publicly deletable" ON public.receivables;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.receivables TO authenticated;
GRANT ALL ON public.receivables TO service_role;
CREATE POLICY "receivables_company_select" ON public.receivables FOR SELECT TO authenticated USING (public.has_company_access(empresa_id));
CREATE POLICY "receivables_company_insert" ON public.receivables FOR INSERT TO authenticated WITH CHECK (public.has_company_access(empresa_id));
CREATE POLICY "receivables_company_update" ON public.receivables FOR UPDATE TO authenticated USING (public.has_company_access(empresa_id)) WITH CHECK (public.has_company_access(empresa_id));
CREATE POLICY "receivables_company_delete" ON public.receivables FOR DELETE TO authenticated USING (public.has_company_access(empresa_id));

-- QUOTES
DROP POLICY IF EXISTS "Quotes are publicly readable" ON public.quotes;
DROP POLICY IF EXISTS "Quotes are publicly writable" ON public.quotes;
DROP POLICY IF EXISTS "Quotes are publicly updatable" ON public.quotes;
DROP POLICY IF EXISTS "Quotes are publicly deletable" ON public.quotes;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotes TO authenticated;
GRANT ALL ON public.quotes TO service_role;
CREATE POLICY "quotes_company_select" ON public.quotes FOR SELECT TO authenticated USING (public.has_company_access(empresa_id));
CREATE POLICY "quotes_company_insert" ON public.quotes FOR INSERT TO authenticated WITH CHECK (public.has_company_access(empresa_id));
CREATE POLICY "quotes_company_update" ON public.quotes FOR UPDATE TO authenticated USING (public.has_company_access(empresa_id)) WITH CHECK (public.has_company_access(empresa_id));
CREATE POLICY "quotes_company_delete" ON public.quotes FOR DELETE TO authenticated USING (public.has_company_access(empresa_id));

-- CLIENTS
DROP POLICY IF EXISTS "Clients are publicly readable" ON public.clients;
DROP POLICY IF EXISTS "Clients are publicly writable" ON public.clients;
DROP POLICY IF EXISTS "Clients are publicly updatable" ON public.clients;
DROP POLICY IF EXISTS "Clients are publicly deletable" ON public.clients;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;
CREATE POLICY "clients_company_select" ON public.clients FOR SELECT TO authenticated USING (public.has_company_access(empresa_id));
CREATE POLICY "clients_company_insert" ON public.clients FOR INSERT TO authenticated WITH CHECK (public.has_company_access(empresa_id));
CREATE POLICY "clients_company_update" ON public.clients FOR UPDATE TO authenticated USING (public.has_company_access(empresa_id)) WITH CHECK (public.has_company_access(empresa_id));
CREATE POLICY "clients_company_delete" ON public.clients FOR DELETE TO authenticated USING (public.has_company_access(empresa_id));

-- VISA_PROCESSES
DROP POLICY IF EXISTS "visa_processes_select" ON public.visa_processes;
DROP POLICY IF EXISTS "visa_processes_insert" ON public.visa_processes;
DROP POLICY IF EXISTS "visa_processes_update" ON public.visa_processes;
DROP POLICY IF EXISTS "visa_processes_delete" ON public.visa_processes;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.visa_processes TO authenticated;
GRANT ALL ON public.visa_processes TO service_role;
CREATE POLICY "visa_processes_company_select" ON public.visa_processes FOR SELECT TO authenticated USING (public.has_company_access(empresa_id));
CREATE POLICY "visa_processes_company_insert" ON public.visa_processes FOR INSERT TO authenticated WITH CHECK (public.has_company_access(empresa_id));
CREATE POLICY "visa_processes_company_update" ON public.visa_processes FOR UPDATE TO authenticated USING (public.has_company_access(empresa_id)) WITH CHECK (public.has_company_access(empresa_id));
CREATE POLICY "visa_processes_company_delete" ON public.visa_processes FOR DELETE TO authenticated USING (public.has_company_access(empresa_id));

-- CONTRACTS
DROP POLICY IF EXISTS "contracts_select" ON public.contracts;
DROP POLICY IF EXISTS "contracts_insert" ON public.contracts;
DROP POLICY IF EXISTS "contracts_update" ON public.contracts;
DROP POLICY IF EXISTS "contracts_delete" ON public.contracts;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contracts TO authenticated;
GRANT ALL ON public.contracts TO service_role;
CREATE POLICY "contracts_company_select" ON public.contracts FOR SELECT TO authenticated USING (public.has_company_access(empresa_id));
CREATE POLICY "contracts_company_insert" ON public.contracts FOR INSERT TO authenticated WITH CHECK (public.has_company_access(empresa_id));
CREATE POLICY "contracts_company_update" ON public.contracts FOR UPDATE TO authenticated USING (public.has_company_access(empresa_id)) WITH CHECK (public.has_company_access(empresa_id));
CREATE POLICY "contracts_company_delete" ON public.contracts FOR DELETE TO authenticated USING (public.has_company_access(empresa_id));

-- CONTRACT_BUNDLES
DROP POLICY IF EXISTS "contract_bundles_select" ON public.contract_bundles;
DROP POLICY IF EXISTS "contract_bundles_insert" ON public.contract_bundles;
DROP POLICY IF EXISTS "contract_bundles_update" ON public.contract_bundles;
DROP POLICY IF EXISTS "contract_bundles_delete" ON public.contract_bundles;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contract_bundles TO authenticated;
GRANT ALL ON public.contract_bundles TO service_role;
CREATE POLICY "contract_bundles_company_select" ON public.contract_bundles FOR SELECT TO authenticated USING (public.has_company_access(empresa_id));
CREATE POLICY "contract_bundles_company_insert" ON public.contract_bundles FOR INSERT TO authenticated WITH CHECK (public.has_company_access(empresa_id));
CREATE POLICY "contract_bundles_company_update" ON public.contract_bundles FOR UPDATE TO authenticated USING (public.has_company_access(empresa_id)) WITH CHECK (public.has_company_access(empresa_id));
CREATE POLICY "contract_bundles_company_delete" ON public.contract_bundles FOR DELETE TO authenticated USING (public.has_company_access(empresa_id));

-- CONTRACT_SIGNATURES (scoped via parent contract)
DROP POLICY IF EXISTS "contract_signatures_select" ON public.contract_signatures;
DROP POLICY IF EXISTS "contract_signatures_insert" ON public.contract_signatures;
DROP POLICY IF EXISTS "contract_signatures_update" ON public.contract_signatures;
DROP POLICY IF EXISTS "contract_signatures_delete" ON public.contract_signatures;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contract_signatures TO authenticated;
GRANT ALL ON public.contract_signatures TO service_role;
CREATE POLICY "contract_signatures_company_select" ON public.contract_signatures FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = contract_signatures.contract_id AND public.has_company_access(c.empresa_id)));
CREATE POLICY "contract_signatures_company_update" ON public.contract_signatures FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = contract_signatures.contract_id AND public.has_company_access(c.empresa_id)));
CREATE POLICY "contract_signatures_company_delete" ON public.contract_signatures FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = contract_signatures.contract_id AND public.has_company_access(c.empresa_id)));

-- CONTRACT_AUDIT_LOG (scoped via parent contract; read only for company, no client read)
DROP POLICY IF EXISTS "contract_audit_log_select" ON public.contract_audit_log;
DROP POLICY IF EXISTS "contract_audit_log_insert" ON public.contract_audit_log;
DROP POLICY IF EXISTS "contract_audit_log_delete" ON public.contract_audit_log;
GRANT SELECT ON public.contract_audit_log TO authenticated;
GRANT ALL ON public.contract_audit_log TO service_role;
CREATE POLICY "contract_audit_log_company_select" ON public.contract_audit_log FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = contract_audit_log.contract_id AND public.has_company_access(c.empresa_id)));

-- DS160_FORMS
DROP POLICY IF EXISTS "ds160_forms_select" ON public.ds160_forms;
DROP POLICY IF EXISTS "ds160_forms_insert" ON public.ds160_forms;
DROP POLICY IF EXISTS "ds160_forms_update" ON public.ds160_forms;
DROP POLICY IF EXISTS "ds160_forms_delete" ON public.ds160_forms;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ds160_forms TO authenticated;
GRANT ALL ON public.ds160_forms TO service_role;
CREATE POLICY "ds160_forms_company_select" ON public.ds160_forms FOR SELECT TO authenticated USING (public.has_company_access(empresa_id));
CREATE POLICY "ds160_forms_company_insert" ON public.ds160_forms FOR INSERT TO authenticated WITH CHECK (public.has_company_access(empresa_id));
CREATE POLICY "ds160_forms_company_update" ON public.ds160_forms FOR UPDATE TO authenticated USING (public.has_company_access(empresa_id)) WITH CHECK (public.has_company_access(empresa_id));
CREATE POLICY "ds160_forms_company_delete" ON public.ds160_forms FOR DELETE TO authenticated USING (public.has_company_access(empresa_id));

-- DS160_GROUP_FORMS
DROP POLICY IF EXISTS "ds160_group_forms_select" ON public.ds160_group_forms;
DROP POLICY IF EXISTS "ds160_group_forms_insert" ON public.ds160_group_forms;
DROP POLICY IF EXISTS "ds160_group_forms_update" ON public.ds160_group_forms;
DROP POLICY IF EXISTS "ds160_group_forms_delete" ON public.ds160_group_forms;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ds160_group_forms TO authenticated;
GRANT ALL ON public.ds160_group_forms TO service_role;
CREATE POLICY "ds160_group_forms_company_select" ON public.ds160_group_forms FOR SELECT TO authenticated USING (public.has_company_access(empresa_id));
CREATE POLICY "ds160_group_forms_company_insert" ON public.ds160_group_forms FOR INSERT TO authenticated WITH CHECK (public.has_company_access(empresa_id));
CREATE POLICY "ds160_group_forms_company_update" ON public.ds160_group_forms FOR UPDATE TO authenticated USING (public.has_company_access(empresa_id)) WITH CHECK (public.has_company_access(empresa_id));
CREATE POLICY "ds160_group_forms_company_delete" ON public.ds160_group_forms FOR DELETE TO authenticated USING (public.has_company_access(empresa_id));

-- =========================================================================
-- 3. TIGHTEN INTERNAL HELPER FUNCTIONS (no anonymous execute)
-- =========================================================================
REVOKE EXECUTE ON FUNCTION public.has_company_access(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_admin_user() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_company_admin(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.find_or_create_conversation(uuid, text, text, uuid, text, timestamptz, text) FROM anon, public;
