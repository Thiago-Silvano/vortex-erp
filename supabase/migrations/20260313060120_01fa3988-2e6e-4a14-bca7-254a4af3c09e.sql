CREATE OR REPLACE FUNCTION public.find_or_create_conversation(
  p_empresa_id uuid,
  p_phone text,
  p_client_name text DEFAULT 'Cliente'::text,
  p_client_id uuid DEFAULT NULL::uuid,
  p_last_message text DEFAULT ''::text,
  p_last_message_at timestamp with time zone DEFAULT now(),
  p_whatsapp_id text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_conv_id uuid;
  v_clean_phone text;
BEGIN
  v_clean_phone := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');

  SELECT id INTO v_conv_id
  FROM public.whatsapp_conversations
  WHERE empresa_id = p_empresa_id
    AND status != 'finished'
    AND v_clean_phone != ''
    AND length(v_clean_phone) >= 8
    AND (
      regexp_replace(coalesce(phone, ''), '\D', '', 'g') = v_clean_phone
      OR RIGHT(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), 8) = RIGHT(v_clean_phone, 8)
    )
  ORDER BY last_message_at DESC NULLS LAST
  LIMIT 1
  FOR UPDATE;

  IF v_conv_id IS NOT NULL THEN
    UPDATE public.whatsapp_conversations
    SET last_message = COALESCE(NULLIF(p_last_message, ''), last_message),
        last_message_at = p_last_message_at,
        unread_count = COALESCE(unread_count, 0) + 1,
        contact_name = CASE
          WHEN p_client_name != '' AND p_client_name != 'Cliente' AND p_client_name != 'Cliente desconhecido' THEN p_client_name
          ELSE contact_name
        END,
        contact_id = COALESCE(p_client_id, contact_id),
        phone = CASE WHEN length(v_clean_phone) BETWEEN 8 AND 15 THEN v_clean_phone ELSE phone END
    WHERE id = v_conv_id;

    RETURN v_conv_id;
  END IF;

  INSERT INTO public.whatsapp_conversations (
    empresa_id,
    phone,
    contact_name,
    contact_id,
    last_message,
    last_message_at,
    unread_count,
    status
  )
  VALUES (
    p_empresa_id,
    v_clean_phone,
    p_client_name,
    p_client_id,
    p_last_message,
    p_last_message_at,
    1,
    'new_lead'
  )
  RETURNING id INTO v_conv_id;

  RETURN v_conv_id;
END;
$function$;