import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-whatsapp-secret',
};

// Map whatsapp-web.js message types to mime type prefixes
function guessMimeType(messageType: string): string {
  switch (messageType) {
    case 'image': return 'image/jpeg';
    case 'video': return 'video/mp4';
    case 'audio':
    case 'ptt': return 'audio/ogg';
    case 'document': return 'application/octet-stream';
    case 'sticker': return 'image/webp';
    default: return 'application/octet-stream';
  }
}

function getExtension(messageType: string): string {
  switch (messageType) {
    case 'image': return 'jpg';
    case 'video': return 'mp4';
    case 'audio':
    case 'ptt': return 'ogg';
    case 'sticker': return 'webp';
    case 'document': return 'bin';
    default: return 'bin';
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body = await req.json();
    const { event, data } = body;

    // event types: message_received, status_update, session_update, qr_code
    if (event === 'qr_code') {
      const { empresa_id, qr_code } = data;
      await supabase.from('whatsapp_sessions').upsert({
        empresa_id,
        qr_code,
        status: 'waiting_qr',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'empresa_id' });

      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (event === 'session_update') {
      const { empresa_id, status, phone_number } = data;
      const updateData: any = { status, updated_at: new Date().toISOString() };
      if (phone_number) updateData.phone_number = phone_number;
      if (status === 'connected') {
        updateData.connected_at = new Date().toISOString();
        updateData.qr_code = '';
      }
      if (status === 'disconnected') {
        updateData.connected_at = null;
        updateData.qr_code = '';
      }

      await supabase.from('whatsapp_sessions').upsert({
        empresa_id,
        ...updateData,
      }, { onConflict: 'empresa_id' });

      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (event === 'message_received') {
      const {
        empresa_id: incomingEmpresaId,
        phone,
        sender_name,
        content,
        message_type,
        media_url,       // legacy: direct URL
        media,           // NEW: base64 data from Node.js
        media_filename,
        media_mimetype,  // optional mimetype from Node.js
        reply_to,        // NEW: quoted message serialized id
      } = data;

      let empresaId: string | null = incomingEmpresaId || null;

      // Fallback: infer company from connected session
      if (!empresaId) {
        const { data: connectedSessions } = await supabase
          .from('whatsapp_sessions')
          .select('empresa_id')
          .eq('status', 'connected')
          .not('empresa_id', 'is', null)
          .order('updated_at', { ascending: false })
          .limit(1);

        empresaId = connectedSessions?.[0]?.empresa_id ?? null;
      }

      if (!empresaId) {
        return new Response(JSON.stringify({ error: 'Missing empresa_id in webhook payload' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Handle media: upload base64 to storage if provided
      let finalMediaUrl: string | null = media_url || null;
      let finalMimetype: string | null = media_mimetype || null;

      if (media && typeof media === 'string' && media.length > 0) {
        try {
          const mimeType = media_mimetype || guessMimeType(message_type || 'document');
          const ext = getExtension(message_type || 'document');
          const fileName = `${empresaId}/${phone}/${Date.now()}.${ext}`;

          // Decode base64 to Uint8Array
          const binaryString = atob(media);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }

          const { error: uploadError } = await supabase.storage
            .from('whatsapp-media')
            .upload(fileName, bytes, {
              contentType: mimeType,
              upsert: false,
            });

          if (uploadError) {
            console.error('Storage upload error:', uploadError);
          } else {
            const { data: urlData } = supabase.storage
              .from('whatsapp-media')
              .getPublicUrl(fileName);
            finalMediaUrl = urlData.publicUrl;
            finalMimetype = mimeType;
          }
        } catch (uploadErr) {
          console.error('Media upload failed:', uploadErr);
        }
      }

      // Determine display content
      let displayContent = content || '';
      if (!displayContent && finalMediaUrl) {
        const typeLabel: Record<string, string> = {
          image: '📷 Imagem',
          video: '🎥 Vídeo',
          audio: '🎵 Áudio',
          ptt: '🎤 Áudio',
          sticker: '🏷️ Figurinha',
          document: '📄 Documento',
        };
        displayContent = typeLabel[message_type || 'document'] || '📎 Arquivo';
      }

      // Find or create conversation
      const { data: existingConv } = await supabase
        .from('whatsapp_conversations')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('phone', phone)
        .neq('status', 'finished')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let conversationId: string;

      if (existingConv) {
        conversationId = existingConv.id;
        await supabase.from('whatsapp_conversations').update({
          last_message: displayContent.substring(0, 200) || '',
          last_message_at: new Date().toISOString(),
          unread_count: (existingConv.unread_count || 0) + 1,
        }).eq('id', conversationId);
      } else {
        const normalizedPhone = phone.replace(/\D/g, '');
        const { data: clientData } = await supabase
          .from('clients')
          .select('id, full_name')
          .eq('empresa_id', empresaId)
          .or(`phone.ilike.%${normalizedPhone.slice(-8)}%`)
          .limit(1)
          .maybeSingle();

        const clientName = clientData?.full_name || sender_name || 'Cliente desconhecido';

        const { data: newConv, error: convError } = await supabase.from('whatsapp_conversations').insert({
          empresa_id: empresaId,
          phone,
          client_name: clientName,
          client_id: clientData?.id || null,
          status: 'new_lead',
          last_message: displayContent.substring(0, 200) || '',
          last_message_at: new Date().toISOString(),
          unread_count: 1,
        }).select('id').single();

        if (convError || !newConv?.id) {
          return new Response(JSON.stringify({ error: convError?.message || 'Failed to create conversation' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        conversationId = newConv.id;
      }

      // Insert message
      await supabase.from('whatsapp_messages').insert({
        conversation_id: conversationId,
        sender_type: 'client',
        sender_name: sender_name || '',
        content: displayContent,
        message_type: message_type || 'text',
        media_url: finalMediaUrl,
        media_filename: media_filename || null,
        media_mimetype: finalMimetype,
        reply_to_message_id: reply_to || null,
      });

      // Check automations
      const { data: automations } = await supabase
        .from('whatsapp_automations')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('is_active', true);

      if (automations && displayContent) {
        const lowerContent = displayContent.toLowerCase();
        for (const auto of automations) {
          if (lowerContent.includes(auto.trigger_keyword.toLowerCase())) {
            await supabase.from('whatsapp_messages').insert({
              conversation_id: conversationId,
              sender_type: 'agent',
              sender_name: 'Automação',
              content: auto.response_message,
              message_type: 'text',
            });
            await supabase.from('whatsapp_conversations').update({
              last_message: auto.response_message.substring(0, 200),
              last_message_at: new Date().toISOString(),
            }).eq('id', conversationId);
            break;
          }
        }
      }

      return new Response(JSON.stringify({ ok: true, conversation_id: conversationId, empresa_id: empresaId }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (event === 'status_update') {
      const { message_id, status } = data;
      if (message_id) {
        await supabase.from('whatsapp_messages').update({ delivery_status: status }).eq('id', message_id);
      }
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Unknown event' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Webhook error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
