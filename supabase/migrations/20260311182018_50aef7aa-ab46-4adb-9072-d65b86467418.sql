
DROP FUNCTION IF EXISTS public.find_or_create_conversation(uuid, text, text, uuid, text, timestamptz);

CREATE OR REPLACE FUNCTION public.find_or_create_conversation(
  p_empresa_id uuid,
  p_phone text,
  p_client_name text,
  p_client_id uuid,
  p_last_message text,
  p_last_message_at timestamptz
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
  v_clean_phone := regexp_replace(p_phone, '@.*$', '');
  v_clean_phone := regexp_replace(v_clean_phone, '\D', '', 'g');

  SELECT id INTO v_conv_id
  FROM public.whatsapp_conversations
  WHERE empresa_id = p_empresa_id
    AND status != 'finished'
    AND (
      regexp_replace(regexp_replace(phone, '@.*$', ''), '\D', '', 'g') = v_clean_phone
      OR RIGHT(regexp_replace(regexp_replace(phone, '@.*$', ''), '\D', '', 'g'), 8) = RIGHT(v_clean_phone, 8)
    )
  ORDER BY last_message_at DESC NULLS LAST
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_conv_id IS NOT NULL THEN
    UPDATE public.whatsapp_conversations
    SET last_message = LEFT(p_last_message, 200),
        last_message_at = p_last_message_at,
        unread_count = COALESCE(unread_count, 0) + 1
    WHERE id = v_conv_id;
    RETURN v_conv_id;
  END IF;

  SELECT id INTO v_conv_id
  FROM public.whatsapp_conversations
  WHERE empresa_id = p_empresa_id
    AND status != 'finished'
    AND (
      regexp_replace(regexp_replace(phone, '@.*$', ''), '\D', '', 'g') = v_clean_phone
      OR RIGHT(regexp_replace(regexp_replace(phone, '@.*$', ''), '\D', '', 'g'), 8) = RIGHT(v_clean_phone, 8)
    )
  ORDER BY last_message_at DESC NULLS LAST
  LIMIT 1;

  IF v_conv_id IS NOT NULL THEN
    UPDATE public.whatsapp_conversations
    SET last_message = LEFT(p_last_message, 200),
        last_message_at = p_last_message_at,
        unread_count = COALESCE(unread_count, 0) + 1
    WHERE id = v_conv_id;
    RETURN v_conv_id;
  END IF;

  INSERT INTO public.whatsapp_conversations (
    empresa_id, phone, client_name, client_id, status,
    last_message, last_message_at, unread_count
  ) VALUES (
    p_empresa_id, v_clean_phone, p_client_name, p_client_id, 'new_lead',
    LEFT(p_last_message, 200), p_last_message_at, 1
  )
  RETURNING id INTO v_conv_id;

  RETURN v_conv_id;
END;
$$;
