CREATE OR REPLACE FUNCTION public.ds160_text_value(p_data jsonb, VARIADIC p_keys text[])
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  k text;
  v text;
BEGIN
  FOREACH k IN ARRAY p_keys LOOP
    v := NULLIF(btrim(COALESCE(p_data ->> k, '')), '');
    IF v IS NOT NULL THEN
      RETURN v;
    END IF;
  END LOOP;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.ds160_date_value(p_value text)
RETURNS date
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  v text := NULLIF(btrim(COALESCE(p_value, '')), '');
BEGIN
  IF v IS NULL THEN
    RETURN NULL;
  END IF;

  IF v ~ '^\d{4}-\d{2}-\d{2}$' THEN
    RETURN v::date;
  END IF;

  IF v ~ '^\d{2}/\d{2}/\d{4}$' THEN
    RETURN to_date(v, 'DD/MM/YYYY');
  END IF;

  RETURN NULL;
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.autofill_client_from_ds160(p_client_id uuid, p_form_data jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_data jsonb := COALESCE(p_form_data, '{}'::jsonb);
  v_full_name text;
BEGIN
  IF p_client_id IS NULL THEN
    RETURN;
  END IF;

  v_full_name := NULLIF(btrim(COALESCE(
    public.ds160_text_value(v_data, 'nome_completo', 'nome_completo_passaporte'),
    concat_ws(' ', public.ds160_text_value(v_data, 'nome'), public.ds160_text_value(v_data, 'sobrenome'))
  )), '');

  UPDATE public.clients c
  SET
    full_name = CASE WHEN NULLIF(btrim(COALESCE(c.full_name, '')), '') IS NULL AND v_full_name IS NOT NULL THEN upper(v_full_name) ELSE c.full_name END,
    birth_date = COALESCE(c.birth_date, public.ds160_date_value(public.ds160_text_value(v_data, 'data_nascimento'))),
    cpf = COALESCE(NULLIF(btrim(c.cpf), ''), public.ds160_text_value(v_data, 'cpf')),
    passport_number = COALESCE(NULLIF(btrim(c.passport_number), ''), public.ds160_text_value(v_data, 'passaporte_numero')),
    passport_issue_date = COALESCE(c.passport_issue_date, public.ds160_date_value(public.ds160_text_value(v_data, 'passaporte_data_emissao'))),
    passport_expiry_date = COALESCE(c.passport_expiry_date, public.ds160_date_value(public.ds160_text_value(v_data, 'passaporte_data_expiracao', 'passaporte_data_validade'))),
    email = COALESCE(NULLIF(btrim(c.email), ''), public.ds160_text_value(v_data, 'contato_email', 'email')),
    phone = COALESCE(NULLIF(btrim(c.phone), ''), public.ds160_text_value(v_data, 'contato_telefone', 'telefone')),
    cep = COALESCE(NULLIF(btrim(c.cep), ''), public.ds160_text_value(v_data, 'contato_cep', 'cep')),
    address = COALESCE(NULLIF(btrim(c.address), ''), public.ds160_text_value(v_data, 'contato_endereco', 'endereco_linha1')),
    address_number = COALESCE(NULLIF(btrim(c.address_number), ''), public.ds160_text_value(v_data, 'contato_numero', 'numero')),
    neighborhood = COALESCE(NULLIF(btrim(c.neighborhood), ''), public.ds160_text_value(v_data, 'contato_bairro', 'bairro')),
    city = COALESCE(NULLIF(btrim(c.city), ''), public.ds160_text_value(v_data, 'contato_cidade', 'cidade_residencia')),
    state = COALESCE(NULLIF(btrim(c.state), ''), public.ds160_text_value(v_data, 'contato_estado', 'estado_residencia')),
    country = COALESCE(NULLIF(btrim(c.country), ''), public.ds160_text_value(v_data, 'contato_pais', 'pais_residencia')),
    updated_at = now()
  WHERE c.id = p_client_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_autofill_client_from_ds160()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'submitted' AND NEW.client_id IS NOT NULL THEN
    PERFORM public.autofill_client_from_ds160(NEW.client_id, NEW.form_data);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_autofill_client_from_ds160 ON public.ds160_forms;
CREATE TRIGGER trg_autofill_client_from_ds160
AFTER INSERT OR UPDATE OF status, form_data ON public.ds160_forms
FOR EACH ROW
WHEN (NEW.status = 'submitted')
EXECUTE FUNCTION public.trigger_autofill_client_from_ds160();

CREATE OR REPLACE FUNCTION public.submit_public_ds160(p_token text, p_form_data jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  PERFORM public.autofill_client_from_ds160(v_f.client_id, p_form_data);

  SELECT full_name INTO v_name FROM public.clients WHERE id = v_f.client_id LIMIT 1;

  IF v_name IS NOT NULL THEN
    UPDATE public.visa_processes SET status = 'produzindo'
    WHERE (v_f.empresa_id IS NULL OR empresa_id = v_f.empresa_id)
      AND (client_name = v_name OR applicant_name = v_name)
      AND status IN ('falta_passaporte', 'produzindo');
  END IF;

  INSERT INTO public.notifications (empresa_id, user_id, type, title, message, reference_id, reference_type)
  SELECT v_f.empresa_id, up.user_id, 'ds160_submitted', 'DS-160 preenchido',
         COALESCE(v_name, 'Cliente') || ' concluiu o formulário DS-160', v_f.id, 'ds160_form'
  FROM public.user_permissions up
  WHERE v_f.empresa_id = ANY(COALESCE(up.empresa_ids, ARRAY[]::uuid[]))
    AND up.user_id IS NOT NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.submit_public_ds160_group_form(p_token text, p_form_id uuid, p_form_data jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_g public.ds160_group_forms;
  v_form_client_id uuid;
  v_all_done boolean;
BEGIN
  SELECT * INTO v_g FROM public.ds160_group_forms WHERE token = p_token LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'not found'; END IF;

  UPDATE public.ds160_forms SET
    form_data = p_form_data, current_step = 10, status = 'submitted',
    submitted_at = now(), last_saved_at = now()
  WHERE id = p_form_id AND group_id = v_g.id
  RETURNING client_id INTO v_form_client_id;

  PERFORM public.autofill_client_from_ds160(v_form_client_id, p_form_data);

  SELECT bool_and(status = 'submitted') INTO v_all_done
  FROM public.ds160_forms WHERE group_id = v_g.id;

  UPDATE public.ds160_group_forms
  SET status = CASE WHEN v_all_done THEN 'submitted' ELSE 'in_progress' END, updated_at = now()
  WHERE id = v_g.id;
END;
$function$;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT DISTINCT ON (client_id) client_id, form_data
    FROM public.ds160_forms
    WHERE status = 'submitted' AND client_id IS NOT NULL
    ORDER BY client_id, submitted_at DESC NULLS LAST, created_at DESC
  LOOP
    PERFORM public.autofill_client_from_ds160(r.client_id, r.form_data);
  END LOOP;
END;
$$;