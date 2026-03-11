import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { conversation_id, content, message_type, media_url, media_filename, media_mimetype, sender_name, empresa_id, reply_to_message_id } = body;

    if (!conversation_id || !content) {
      return new Response(JSON.stringify({ error: 'Missing conversation_id or content' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get conversation details
    const { data: conv } = await supabase
      .from('whatsapp_conversations')
      .select('phone, empresa_id')
      .eq('id', conversation_id)
      .single();

    if (!conv) {
      return new Response(JSON.stringify({ error: 'Conversation not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get session/server URL for this company
    const { data: session } = await supabase
      .from('whatsapp_sessions')
      .select('server_url, status')
      .eq('empresa_id', conv.empresa_id)
      .single();

    if (!session || session.status !== 'connected') {
      return new Response(JSON.stringify({ error: 'WhatsApp not connected for this company' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Insert message in DB
    const { data: msgData } = await supabase.from('whatsapp_messages').insert({
      conversation_id,
      sender_type: 'agent',
      sender_name: sender_name || user.email?.split('@')[0] || 'Agente',
      content,
      message_type: message_type || 'text',
      media_url: media_url || null,
      media_filename: media_filename || null,
      media_mimetype: media_mimetype || null,
      reply_to_message_id: reply_to_message_id || null,
      delivery_status: 'pending',
    }).select('id').single();

    // Update conversation
    await supabase.from('whatsapp_conversations').update({
      last_message: content.substring(0, 200),
      last_message_at: new Date().toISOString(),
      unread_count: 0,
    }).eq('id', conversation_id);

    // Forward to Node.js server for actual WhatsApp delivery
    let deliveryError: string | null = null;

    if (session.server_url) {
      try {
        const agentLabel = `[${sender_name || user.email?.split('@')[0] || 'Agente'}]`;
        const fullMessage = `${agentLabel}\n${content}`;
        const targetUrl = `${session.server_url.replace(/\/+$/, '')}/send-message?empresa_id=${conv.empresa_id}`;

        console.log(`Sending to ${targetUrl} for phone ${conv.phone}`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const deliveryResponse = await fetch(targetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            empresa_id: conv.empresa_id,
            number: conv.phone,
            phone: conv.phone,
            message: fullMessage,
            message_type: message_type || 'text',
            media_url,
            message_id: msgData?.id,
          }),
        });

        clearTimeout(timeoutId);

        const responseText = await deliveryResponse.text();
        console.log(`Node.js response: ${deliveryResponse.status} - ${responseText}`);

        if (!deliveryResponse.ok) {
          let errorDetail = responseText;
          try {
            const parsed = JSON.parse(responseText);
            errorDetail = parsed.error || responseText;
          } catch {}
          deliveryError = errorDetail;
          throw new Error(`Delivery failed (${deliveryResponse.status}): ${responseText}`);
        }

        if (msgData?.id) {
          await supabase.from('whatsapp_messages').update({ delivery_status: 'sent' }).eq('id', msgData.id);
        }
        // Update last_message_sent_at
        await supabase.from('whatsapp_sessions').update({
          last_message_sent_at: new Date().toISOString(),
        }).eq('empresa_id', conv.empresa_id);
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : String(e);
        console.error('Failed to forward to Node.js server:', errMsg);
        if (msgData?.id) {
          await supabase.from('whatsapp_messages').update({ delivery_status: 'failed' }).eq('id', msgData.id);
        }
        if (!deliveryError) {
          deliveryError = errMsg.includes('abort') ? 'Servidor inacessível (timeout)' : errMsg;
        }
      }
    } else {
      console.error('No server_url configured for session');
      deliveryError = 'URL do servidor não configurada';
    }

    if (deliveryError) {
      return new Response(JSON.stringify({ ok: false, error: deliveryError, message_id: msgData?.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true, message_id: msgData?.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
