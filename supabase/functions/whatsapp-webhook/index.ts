import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-whatsapp-secret',
};

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

async function addLog(supabase: any, empresaId: string | null, eventType: string, message: string, details: any = {}) {
  if (!empresaId) return;
  try {
    await supabase.from('whatsapp_logs').insert({
      empresa_id: empresaId,
      event_type: eventType,
      message,
      details,
    });
  } catch (e) {
    console.error('Failed to insert log:', e);
  }
}

function normalizeName(value: string | null | undefined): string {
  return (value || '').trim().toLowerCase();
}

function isLikelyLidNumeric(value: string): boolean {
  return /^\d{14,20}$/.test(value);
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

    if (event === 'qr_code') {
      const { empresa_id, qr_code } = data;
      await supabase.from('whatsapp_sessions').upsert({
        empresa_id,
        qr_code,
        status: 'waiting_qr',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'empresa_id' });

      await addLog(supabase, empresa_id, 'qr_generated', 'QR-Code gerado pelo servidor');

      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (event === 'session_update') {
      const { empresa_id, status, phone_number } = data;
      const updateData: any = { status, updated_at: new Date().toISOString() };
      if (phone_number) updateData.phone_number = phone_number;
      if (status === 'connected') {
        updateData.connected_at = new Date().toISOString();
        updateData.qr_code = '';
        updateData.webhook_status = 'active';
      }
      if (status === 'disconnected') {
        updateData.connected_at = null;
        updateData.qr_code = '';
      }

      await supabase.from('whatsapp_sessions').upsert({
        empresa_id,
        ...updateData,
      }, { onConflict: 'empresa_id' });

      if (status === 'connected') {
        await addLog(supabase, empresa_id, 'session_connected', `WhatsApp conectado com sucesso. Número detectado: ${phone_number || 'não informado'}`, { phone_number });
      } else if (status === 'disconnected') {
        await addLog(supabase, empresa_id, 'session_disconnected', 'Sessão do WhatsApp desconectada');
      } else {
        await addLog(supabase, empresa_id, 'session_update', `Status da sessão atualizado: ${status}`, { status });
      }

      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (event === 'message_received') {
      const {
        empresa_id: incomingEmpresaId,
        phone,
        original_from,
        sender_name,
        content,
        message_type,
        media_url,
        media,
        media_filename,
        media_mimetype,
        reply_to,
      } = data;

      let empresaId: string | null = incomingEmpresaId || null;

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

      // Update last_message_received_at and webhook_status
      await supabase.from('whatsapp_sessions').update({
        last_message_received_at: new Date().toISOString(),
        webhook_status: 'active',
      }).eq('empresa_id', empresaId);

      // Handle media upload
      let finalMediaUrl: string | null = media_url || null;
      let finalMimetype: string | null = media_mimetype || null;

      if (media && typeof media === 'string' && media.length > 0) {
        try {
          const mimeType = media_mimetype || guessMimeType(message_type || 'document');
          const ext = getExtension(message_type || 'document');
          const fileName = `${empresaId}/${phone}/${Date.now()}.${ext}`;

          const binaryString = atob(media);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }

          const { error: uploadError } = await supabase.storage
            .from('whatsapp-media')
            .upload(fileName, bytes, { contentType: mimeType, upsert: false });

          if (uploadError) {
            console.error('Storage upload error:', uploadError);
          } else {
            const { data: urlData } = supabase.storage.from('whatsapp-media').getPublicUrl(fileName);
            finalMediaUrl = urlData.publicUrl;
            finalMimetype = mimeType;
          }
        } catch (uploadErr) {
          console.error('Media upload failed:', uploadErr);
        }
      }

      let displayContent = content || '';
      if (!displayContent && finalMediaUrl) {
        const typeLabel: Record<string, string> = {
          image: '📷 Imagem', video: '🎥 Vídeo', audio: '🎵 Áudio',
          ptt: '🎤 Áudio', sticker: '🏷️ Figurinha', document: '📄 Documento',
        };
        displayContent = typeLabel[message_type || 'document'] || '📎 Arquivo';
      }

      // Normalize phone: strip @lid, @c.us, @s.whatsapp.net suffixes
      const cleanPhone = String(phone || '').replace(/@.*$/, '').replace(/\D/g, '');
      const looksLikeLid = isLikelyLidNumeric(cleanPhone);

      // Find or create conversation atomically (prevents duplicates)
      let clientName = sender_name || 'Cliente desconhecido';
      let clientId: string | null = null;
      let phoneForConversation = cleanPhone;

      // Try to find client
      const { data: clientData } = await supabase
        .from('clients')
        .select('id, full_name')
        .eq('empresa_id', empresaId)
        .or(`phone.ilike.%${cleanPhone.slice(-8)}%`)
        .limit(1)
        .maybeSingle();

      if (clientData) {
        clientName = clientData.full_name || clientName;
        clientId = clientData.id;
      }

      // Fallback for legacy payloads (without original_from):
      // if incoming phone looks like LID, try to map by unique active conversation with same client name.
      const normalizedIncomingName = normalizeName(clientName);
      const hasReliableName = normalizedIncomingName !== '' && normalizedIncomingName !== 'cliente' && normalizedIncomingName !== 'cliente desconhecido';

      if (looksLikeLid && !original_from && hasReliableName) {
        const { data: recentConversations } = await supabase
          .from('whatsapp_conversations')
          .select('id, phone, client_name, last_message_at, created_at')
          .eq('empresa_id', empresaId)
          .neq('status', 'finished')
          .order('last_message_at', { ascending: false })
          .limit(50);

        const matchingConversations = (recentConversations || []).filter((conv: any) => {
          const convName = normalizeName(conv.client_name);
          const convPhone = String(conv.phone || '').replace(/\D/g, '');
          return convName === normalizedIncomingName && /^\d{10,13}$/.test(convPhone);
        });

        if (matchingConversations.length === 1) {
          phoneForConversation = String(matchingConversations[0].phone || '').replace(/\D/g, '');
          await addLog(
            supabase,
            empresaId,
            'lid_fallback_match',
            `LID legado (${cleanPhone}) associado por nome à conversa existente de ${clientName}`,
            {
              incoming_lid_phone: cleanPhone,
              mapped_phone: phoneForConversation,
              matched_conversation_id: matchingConversations[0].id,
            }
          );
        }
      }

      // Determine the whatsapp_id (original sender ID for reliable sending)
      const whatsappId = original_from || (looksLikeLid ? `${cleanPhone}@lid` : null);

      const { data: convResult, error: convError } = await supabase.rpc('find_or_create_conversation', {
        p_empresa_id: empresaId,
        p_phone: phoneForConversation,
        p_client_name: clientName,
        p_client_id: clientId,
        p_last_message: displayContent.substring(0, 200) || '',
        p_last_message_at: new Date().toISOString(),
        p_whatsapp_id: whatsappId,
      });

      if (convError || !convResult) {
        console.error('find_or_create_conversation error:', convError);
        return new Response(JSON.stringify({ error: convError?.message || 'Failed to find/create conversation' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const conversationId: string = convResult;

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

      await addLog(supabase, empresaId, 'message_received', `Mensagem recebida de ${phone}`, { phone, message_type: message_type || 'text' });

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
