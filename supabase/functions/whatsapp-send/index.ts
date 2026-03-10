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
    const { conversation_id, content, message_type, media_url, media_filename, sender_name, empresa_id } = body;

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
      delivery_status: 'pending',
    }).select('id').single();

    // Update conversation
    await supabase.from('whatsapp_conversations').update({
      last_message: content.substring(0, 200),
      last_message_at: new Date().toISOString(),
      unread_count: 0,
    }).eq('id', conversation_id);

    // Forward to Node.js server for actual WhatsApp delivery
    if (session.server_url) {
      try {
        const agentLabel = `[${sender_name || user.email?.split('@')[0] || 'Agente'}]`;
        const fullMessage = `${agentLabel}\n${content}`;

        const deliveryResponse = await fetch(`${session.server_url}/send-message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            number: conv.phone, // expected by VPS server.js
            phone: conv.phone,  // backwards compatibility
            message: fullMessage,
            message_type: message_type || 'text',
            media_url,
            message_id: msgData?.id,
          }),
        });

        if (!deliveryResponse.ok) {
          const errText = await deliveryResponse.text();
          throw new Error(`Delivery failed (${deliveryResponse.status}): ${errText}`);
        }

        if (msgData?.id) {
          await supabase.from('whatsapp_messages').update({ delivery_status: 'sent' }).eq('id', msgData.id);
        }
      } catch (e) {
        console.error('Failed to forward to Node.js server:', e);
        // Message is saved, but delivery failed - mark accordingly
        if (msgData?.id) {
          await supabase.from('whatsapp_messages').update({ delivery_status: 'failed' }).eq('id', msgData.id);
        }
      }
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
