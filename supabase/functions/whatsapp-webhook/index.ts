import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

function isTruthy(value: unknown) {
  if (value === true) return true;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1";
  }
  return false;
}

function candidateToStrings(value: unknown): string[] {
  if (typeof value === "string" && value.trim()) return [value];
  if (typeof value === "number") return [String(value)];

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return [record._serialized, record.id, record.user, record.number, record.phone, record.value]
      .filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  }

  return [];
}

function extractMessageId(body: Record<string, unknown>) {
  return candidateToStrings(body.id)[0]
    || (typeof body.messageId === "string" ? body.messageId : "")
    || (typeof body.message_id === "string" ? body.message_id : "");
}

function isOutgoingMessage(body: Record<string, unknown>, whatsappMsgId: string) {
  const idRecord = body.id && typeof body.id === "object"
    ? body.id as Record<string, unknown>
    : null;

  return isTruthy(body.from_me)
    || isTruthy(body.fromMe)
    || isTruthy(body.isFromMe)
    || isTruthy(idRecord?.fromMe)
    || whatsappMsgId.startsWith("true_");
}

function scorePhoneCandidate(raw: string, source: string) {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;

  let score = 0;

  if (["number", "phone_number", "real_phone", "realPhone", "contact.number", "contact.phone", "contactNumber", "contactPhone", "sender.number", "sender.phone"].includes(source)) {
    score += 70;
  }

  if (source === "phone") score += 40;

  if (["from", "author", "participant", "chat_id", "chatId", "sender.id"].includes(source)) {
    score += 15;
  }

  if (raw.includes("@c.us") || raw.includes("@s.whatsapp.net")) score += 100;
  if (raw.includes("@lid")) score -= 40;

  if (digits.length >= 8 && digits.length <= 15) {
    score += 60;
  } else if (digits.length > 15) {
    score -= Math.min(50, digits.length - 15);
  }

  return { digits, raw, score, source };
}

function extractPhone(body: Record<string, unknown>) {
  const contact = body.contact && typeof body.contact === "object"
    ? body.contact as Record<string, unknown>
    : {};
  const sender = body.sender && typeof body.sender === "object"
    ? body.sender as Record<string, unknown>
    : {};

  const candidates: Array<[string, unknown]> = [
    ["number", body.number],
    ["phone_number", body.phone_number],
    ["real_phone", body.real_phone],
    ["realPhone", body.realPhone],
    ["contact.number", contact.number],
    ["contact.phone", contact.phone],
    ["contactNumber", body.contactNumber],
    ["contactPhone", body.contactPhone],
    ["sender.number", sender.number],
    ["sender.phone", sender.phone],
    ["phone", body.phone],
    ["author", body.author],
    ["from", body.from],
    ["participant", body.participant],
    ["chat_id", body.chat_id],
    ["chatId", body.chatId],
    ["sender.id", sender.id],
  ];

  let bestMatch: { digits: string; raw: string; score: number; source: string } | null = null;

  for (const [source, value] of candidates) {
    for (const raw of candidateToStrings(value)) {
      const scored = scorePhoneCandidate(raw, source);
      if (!scored) continue;

      if (!bestMatch || scored.score > bestMatch.score) {
        bestMatch = scored;
      }
    }
  }

  return bestMatch?.digits || "";
}

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
    const body = (raw.data ? raw.data : raw) as Record<string, any>;
    const event = raw.event || "message_received";
    const whatsappMsgId = extractMessageId(body);

    // Skip messages sent by us (from_me/fromMe) to avoid echoing our own outbound messages as incoming
    if (isOutgoingMessage(body, whatsappMsgId)) {
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

    // Use service role for database operations
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (whatsappMsgId) {
      const { data: existingMessage } = await supabase
        .from("whatsapp_messages")
        .select("id, conversation_id")
        .eq("empresa_id", empresaId)
        .eq("whatsapp_msg_id", whatsappMsgId)
        .maybeSingle();

      if (existingMessage) {
        return new Response(
          JSON.stringify({
            success: true,
            skipped: "duplicate",
            conversation_id: existingMessage.conversation_id,
          }),
          { status: 200, headers: jsonHeaders }
        );
      }
    }

    // Extract phone with preference for real numbers over @lid identifiers
    const phone = extractPhone(body);

    if (!phone || phone.length < 8) {
      return new Response(JSON.stringify({ error: "Invalid phone number" }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const content = body.content || body.body || body.message || "";
    const msgType = body.message_type || body.type || "chat";
    const pushname = body.sender_name || body.pushname || body.name || body.notifyName || "";
    const hasMedia = !!(body.media || body.hasMedia);
    const replyToMessageId = body.reply_to_message_id || null;

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
