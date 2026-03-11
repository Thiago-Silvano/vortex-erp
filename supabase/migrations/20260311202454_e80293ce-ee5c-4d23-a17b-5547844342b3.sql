-- Remove overloaded function signature causing RPC ambiguity in PostgREST
DROP FUNCTION IF EXISTS public.find_or_create_conversation(uuid, text, text, uuid, text, timestamptz);

-- Keep a single canonical signature with whatsapp_id support
CREATE OR REPLACE FUNCTION public.find_or_create_conversation(
  p_empresa_id uuid,
  p_phone text,
  p_client_name text DEFAULT 'Cliente',
  p_client_id uuid DEFAULT NULL,
  p_last_message text DEFAULT '',
  p_last_message_at timestamptz DEFAULT now(),
  p_whatsapp_id text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conv_id uuid;
  v_clean_phone text;
BEGIN
  v_clean_phone := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');

  SELECT id INTO v_conv_id
  FROM public.whatsapp_conversations
  WHERE empresa_id = p_empresa_id
    AND status != 'finished'
    AND (
      (p_whatsapp_id IS NOT NULL AND whatsapp_id = p_whatsapp_id)
      OR
      (v_clean_phone != '' AND length(v_clean_phone) >= 8 AND (
        regexp_replace(coalesce(phone, ''), '\D', '', 'g') = v_clean_phone
        OR RIGHT(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), 8) = RIGHT(v_clean_phone, 8)
      ))
    )
  ORDER BY last_message_at DESC NULLS LAST
  LIMIT 1
  FOR UPDATE;

  IF v_conv_id IS NOT NULL THEN
    UPDATE public.whatsapp_conversations
    SET last_message = COALESCE(NULLIF(p_last_message, ''), last_message),
        last_message_at = p_last_message_at,
        unread_count = COALESCE(unread_count, 0) + 1,
        client_name = CASE
          WHEN p_client_name != 'Cliente' AND p_client_name != 'Cliente desconhecido' THEN p_client_name
          ELSE client_name
        END,
        client_id = COALESCE(p_client_id, client_id),
        phone = CASE WHEN length(v_clean_phone) BETWEEN 8 AND 15 THEN v_clean_phone ELSE phone END,
        whatsapp_id = COALESCE(p_whatsapp_id, whatsapp_id)
    WHERE id = v_conv_id;

    RETURN v_conv_id;
  END IF;

  INSERT INTO public.whatsapp_conversations (
    empresa_id, phone, client_name, client_id, last_message, last_message_at, unread_count, status, priority, whatsapp_id
  )
  VALUES (
    p_empresa_id, v_clean_phone, p_client_name, p_client_id, p_last_message, p_last_message_at, 1, 'new_lead', 'normal', p_whatsapp_id
  )
  RETURNING id INTO v_conv_id;

  RETURN v_conv_id;
END;
$$;