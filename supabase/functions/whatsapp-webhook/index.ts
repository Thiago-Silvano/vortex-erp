import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: jsonHeaders,
    });
  }

  try {
    const raw = await req.json();
    console.log("[whatsapp-webhook] Received:", JSON.stringify(raw));

    // Support both flat payload and { event, data } wrapper from server.js
    const body = raw.data ? raw.data : raw;
    const event = raw.event || "message_received";

    // Skip messages sent by us (from_me)
    if (body.from_me === true) {
      return new Response(
        JSON.stringify({ success: true, skipped: "from_me" }),
        { status: 200, headers: jsonHeaders }
      );
    }

    const empresaId = body.empresa_id;
    if (!empresaId) {
      return new Response(JSON.stringify({ error: "empresa_id is required" }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    // Extract phone - support multiple field names
    const rawPhone =
      body.phone ||
      body.from?.replace("@c.us", "").replace("@s.whatsapp.net", "") ||
      body.number ||
      "";
    const phone = rawPhone.replace(/\D/g, "");

    if (!phone || phone.length < 8) {
      return new Response(JSON.stringify({ error: "Invalid phone number" }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const content = body.content || body.body || body.message || "";
    const msgType = body.message_type || body.type || "chat";
    const pushname = body.sender_name || body.pushname || body.name || body.notifyName || "";
    const whatsappMsgId =
      body.id?._serialized || body.id?.id || body.messageId || body.id || "";
    const hasMedia = !!(body.media || body.hasMedia);
    const replyToMessageId = body.reply_to_message_id || null;

    // Use service role for database operations
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // If server sent base64 media, upload to storage
    let mediaUrl = body.media_url || body.mediaUrl || "";
    let mediaType = body.media_mimetype || body.media_type || body.mimetype || "";

    if (body.media && body.media_mimetype) {
      try {
        const ext = body.media_mimetype.split("/")[1]?.split(";")[0] || "bin";
        const fileName = `${empresaId}/${crypto.randomUUID()}.${ext}`;

        const binaryStr = atob(body.media);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }

        const { error: uploadError } = await supabase.storage
          .from("whatsapp-media")
          .upload(fileName, bytes, {
            contentType: body.media_mimetype,
            upsert: true,
          });

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from("whatsapp-media")
            .getPublicUrl(fileName);
          mediaUrl = urlData.publicUrl;
          mediaType = body.media_mimetype;
          console.log("[whatsapp-webhook] Media uploaded:", mediaUrl);
        } else {
          console.error("[whatsapp-webhook] Media upload error:", uploadError);
        }
      } catch (e) {
        console.error("[whatsapp-webhook] Media processing error:", e);
      }
    }

    const timestamp = body.timestamp
      ? new Date(body.timestamp * 1000).toISOString()
      : new Date().toISOString();

    // Build display message for conversation preview
    const displayMessage =
      content ||
      (hasMedia
        ? msgType === "image"
          ? "📷 Imagem"
          : msgType === "video"
            ? "🎥 Vídeo"
            : msgType === "ptt" || msgType === "audio"
              ? "🎤 Áudio"
              : msgType === "sticker"
                ? "🏷️ Figurinha"
                : "📎 Arquivo"
        : "");

    // Find or create conversation
    const { data: convId, error: rpcError } = await supabase.rpc(
      "find_or_create_conversation",
      {
        p_empresa_id: empresaId,
        p_phone: phone,
        p_client_name: pushname || phone,
        p_last_message: displayMessage,
        p_last_message_at: timestamp,
        p_whatsapp_id: null,
      }
    );

    if (rpcError) {
      console.error("[whatsapp-webhook] RPC error:", rpcError);
      return new Response(JSON.stringify({ error: rpcError.message }), {
        status: 500,
        headers: jsonHeaders,
      });
    }

    if (!convId) {
      return new Response(
        JSON.stringify({ error: "Could not find or create conversation" }),
        { status: 500, headers: jsonHeaders }
      );
    }

    // Insert message
    const insertData: Record<string, unknown> = {
      conversation_id: convId,
      empresa_id: empresaId,
      sender: "them",
      content,
      message_type: msgType,
      whatsapp_msg_id: whatsappMsgId,
      media_url: mediaUrl,
      media_type: mediaType,
      created_at: timestamp,
    };

    // Add reply reference if present
    if (replyToMessageId) {
      insertData.reply_to_message_id = replyToMessageId;
    }

    const { error: insertError } = await supabase
      .from("whatsapp_messages")
      .insert(insertData);

    if (insertError) {
      console.error("[whatsapp-webhook] Insert error:", insertError);
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: jsonHeaders,
      });
    }

    console.log(
      `[whatsapp-webhook] Message saved: conv=${convId}, phone=${phone}, type=${msgType}`
    );

    return new Response(
      JSON.stringify({ success: true, conversation_id: convId }),
      { status: 200, headers: jsonHeaders }
    );
  } catch (error) {
    console.error("[whatsapp-webhook] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal error",
      }),
      { status: 500, headers: jsonHeaders }
    );
  }
});
