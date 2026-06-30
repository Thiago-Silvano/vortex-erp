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