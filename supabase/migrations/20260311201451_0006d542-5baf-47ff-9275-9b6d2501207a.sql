
-- Add whatsapp_id column to store original WhatsApp sender ID (e.g., 107533314330705@lid or 5548991165568@c.us)
ALTER TABLE public.whatsapp_conversations ADD COLUMN IF NOT EXISTS whatsapp_id text;

-- Update find_or_create_conversation function to accept and store whatsapp_id
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
AS $$
DECLARE
  v_conv_id uuid;
  v_clean_phone text;
BEGIN
  -- Clean the phone number
  v_clean_phone := regexp_replace(p_phone, '\D', '', 'g');

  -- Try to find existing conversation by phone (last 8 digits match) or by whatsapp_id
  SELECT id INTO v_conv_id
  FROM public.whatsapp_conversations
  WHERE empresa_id = p_empresa_id
    AND status != 'finished'
    AND (
      -- Match by whatsapp_id if provided
      (p_whatsapp_id IS NOT NULL AND whatsapp_id = p_whatsapp_id)
      OR
      -- Match by phone number (last 8 digits)
      (v_clean_phone != '' AND length(v_clean_phone) >= 8 AND (
        regexp_replace(phone, '\D', '', 'g') = v_clean_phone
        OR RIGHT(regexp_replace(phone, '\D', '', 'g'), 8) = RIGHT(v_clean_phone, 8)
      ))
    )
  ORDER BY last_message_at DESC NULLS LAST
  LIMIT 1
  FOR UPDATE;

  IF v_conv_id IS NOT NULL THEN
    -- Update existing conversation
    UPDATE public.whatsapp_conversations
    SET last_message = COALESCE(NULLIF(p_last_message, ''), last_message),
        last_message_at = p_last_message_at,
        unread_count = unread_count + 1,
        client_name = CASE WHEN p_client_name != 'Cliente' AND p_client_name != 'Cliente desconhecido' THEN p_client_name ELSE client_name END,
        client_id = COALESCE(p_client_id, client_id),
        phone = CASE WHEN length(v_clean_phone) >= 8 AND length(v_clean_phone) <= 15 THEN v_clean_phone ELSE phone END,
        whatsapp_id = COALESCE(p_whatsapp_id, whatsapp_id)
    WHERE id = v_conv_id;

    RETURN v_conv_id;
  END IF;

  -- Create new conversation
  INSERT INTO public.whatsapp_conversations (empresa_id, phone, client_name, client_id, last_message, last_message_at, unread_count, status, priority, whatsapp_id)
  VALUES (p_empresa_id, v_clean_phone, p_client_name, p_client_id, p_last_message, p_last_message_at, 1, 'new_lead', 'normal', p_whatsapp_id)
  RETURNING id INTO v_conv_id;

  RETURN v_conv_id;
END;
$$;
