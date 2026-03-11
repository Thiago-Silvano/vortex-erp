
-- Create a function to find or create conversation atomically to prevent duplicates
CREATE OR REPLACE FUNCTION public.find_or_create_conversation(
  p_empresa_id uuid,
  p_phone text,
  p_client_name text,
  p_client_id uuid DEFAULT NULL,
  p_last_message text DEFAULT '',
  p_last_message_at timestamptz DEFAULT now()
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_conv_id uuid;
BEGIN
  -- Try to find existing active conversation
  SELECT id INTO v_conv_id
  FROM public.whatsapp_conversations
  WHERE empresa_id = p_empresa_id
    AND phone = p_phone
    AND status != 'finished'
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_conv_id IS NOT NULL THEN
    -- Update existing conversation
    UPDATE public.whatsapp_conversations
    SET last_message = LEFT(p_last_message, 200),
        last_message_at = p_last_message_at,
        unread_count = COALESCE(unread_count, 0) + 1
    WHERE id = v_conv_id;
    RETURN v_conv_id;
  END IF;

  -- Double-check without lock (race condition safety)
  SELECT id INTO v_conv_id
  FROM public.whatsapp_conversations
  WHERE empresa_id = p_empresa_id
    AND phone = p_phone
    AND status != 'finished'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_conv_id IS NOT NULL THEN
    UPDATE public.whatsapp_conversations
    SET last_message = LEFT(p_last_message, 200),
        last_message_at = p_last_message_at,
        unread_count = COALESCE(unread_count, 0) + 1
    WHERE id = v_conv_id;
    RETURN v_conv_id;
  END IF;

  -- Create new conversation
  INSERT INTO public.whatsapp_conversations (
    empresa_id, phone, client_name, client_id, status,
    last_message, last_message_at, unread_count
  ) VALUES (
    p_empresa_id, p_phone, p_client_name, p_client_id, 'new_lead',
    LEFT(p_last_message, 200), p_last_message_at, 1
  )
  RETURNING id INTO v_conv_id;

  RETURN v_conv_id;
END;
$$;

-- Clean up duplicate conversations: merge messages into the oldest one and delete the rest
DO $$
DECLARE
  dup RECORD;
  keep_id uuid;
BEGIN
  FOR dup IN
    SELECT empresa_id, phone
    FROM public.whatsapp_conversations
    WHERE status != 'finished'
    GROUP BY empresa_id, phone
    HAVING COUNT(*) > 1
  LOOP
    -- Keep the oldest conversation
    SELECT id INTO keep_id
    FROM public.whatsapp_conversations
    WHERE empresa_id = dup.empresa_id AND phone = dup.phone AND status != 'finished'
    ORDER BY created_at ASC
    LIMIT 1;

    -- Move messages from duplicates to the kept conversation
    UPDATE public.whatsapp_messages
    SET conversation_id = keep_id
    WHERE conversation_id IN (
      SELECT id FROM public.whatsapp_conversations
      WHERE empresa_id = dup.empresa_id AND phone = dup.phone AND status != 'finished' AND id != keep_id
    );

    -- Delete duplicate conversations
    DELETE FROM public.whatsapp_conversations
    WHERE empresa_id = dup.empresa_id AND phone = dup.phone AND status != 'finished' AND id != keep_id;
  END LOOP;
END;
$$;
