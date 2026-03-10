import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ImapFlow } from "npm:imapflow";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { empresa_id } = await req.json();

    if (!empresa_id) {
      return new Response(
        JSON.stringify({ error: "empresa_id obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get IMAP settings
    const { data: settings, error: settErr } = await supabase
      .from("email_settings")
      .select("*")
      .eq("empresa_id", empresa_id)
      .single();

    if (settErr || !settings) {
      return new Response(
        JSON.stringify({ error: "Configurações IMAP não encontradas" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const s = settings as any;
    if (!s.imap_host || !s.imap_user || !s.imap_password) {
      return new Response(
        JSON.stringify({ error: "Configurações IMAP incompletas" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const client = new ImapFlow({
      host: s.imap_host,
      port: s.imap_port || 993,
      secure: s.imap_ssl !== false,
      auth: {
        user: s.imap_user,
        pass: s.imap_password,
      },
      logger: false,
    });

    await client.connect();

    const lock = await client.getMailboxLock("INBOX");
    let newCount = 0;

    try {
      // Fetch last 50 messages
      const totalMessages = client.mailbox.exists;
      if (totalMessages === 0) {
        await lock.release();
        await client.logout();
        return new Response(
          JSON.stringify({ success: true, fetched: 0, message: "Caixa de entrada vazia" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const startSeq = Math.max(1, totalMessages - 49);
      const range = `${startSeq}:*`;

      for await (const message of client.fetch(range, {
        envelope: true,
        source: true,
        bodyStructure: true,
        uid: true,
      })) {
        const env = message.envelope;
        if (!env) continue;

        const messageId = env.messageId || `${message.uid}-${s.imap_user}`;

        // Check if already exists
        const { data: existing } = await supabase
          .from("emails")
          .select("id")
          .eq("message_id", messageId)
          .eq("empresa_id", empresa_id)
          .maybeSingle();

        if (existing) continue;

        // Parse from
        const fromAddr = env.from?.[0];
        const fromEmail = fromAddr?.address || "";
        const fromName = fromAddr?.name || fromEmail.split("@")[0] || "";

        // Parse to
        const toEmails = (env.to || []).map((a: any) => a.address).filter(Boolean);

        // Parse cc
        const ccEmails = (env.cc || []).map((a: any) => a.address).filter(Boolean);

        // Get body text from source
        let bodyText = "";
        let bodyHtml = "";
        if (message.source) {
          const rawSource = new TextDecoder().decode(message.source);
          
          // Simple extraction of text content
          // Try to find HTML body
          const htmlMatch = rawSource.match(/Content-Type:\s*text\/html[\s\S]*?\r\n\r\n([\s\S]*?)(?:\r\n--|\r\n\.\r\n|$)/i);
          if (htmlMatch) {
            bodyHtml = decodeBody(htmlMatch[1]);
          }
          
          // Try to find plain text body
          const textMatch = rawSource.match(/Content-Type:\s*text\/plain[\s\S]*?\r\n\r\n([\s\S]*?)(?:\r\n--|\r\n\.\r\n|$)/i);
          if (textMatch) {
            bodyText = decodeBody(textMatch[1]);
          }

          // If no multipart, try to get body directly
          if (!bodyHtml && !bodyText) {
            const bodyStart = rawSource.indexOf("\r\n\r\n");
            if (bodyStart > -1) {
              const body = rawSource.substring(bodyStart + 4);
              if (rawSource.includes("text/html")) {
                bodyHtml = decodeBody(body);
              } else {
                bodyText = decodeBody(body);
              }
            }
          }
        }

        // Try to link to existing client by email
        let clientId: string | null = null;
        if (fromEmail) {
          const { data: clientData } = await supabase
            .from("clients")
            .select("id")
            .eq("empresa_id", empresa_id)
            .eq("email", fromEmail)
            .maybeSingle();
          if (clientData) clientId = clientData.id;
        }

        const sentAt = env.date ? new Date(env.date).toISOString() : new Date().toISOString();

        await supabase.from("emails").insert({
          empresa_id,
          message_id: messageId,
          from_email: fromEmail,
          from_name: fromName,
          to_emails: toEmails,
          cc_emails: ccEmails.length > 0 ? ccEmails : null,
          subject: env.subject || "(sem assunto)",
          body_text: bodyText || "",
          body_html: bodyHtml || bodyText?.replace(/\n/g, "<br>") || "",
          folder: "inbox",
          status: "received",
          is_read: false,
          is_starred: false,
          sent_at: sentAt,
          client_id: clientId,
        } as any);

        newCount++;
      }
    } finally {
      await lock.release();
    }

    await client.logout();

    return new Response(
      JSON.stringify({ success: true, fetched: newCount, message: `${newCount} novos emails sincronizados` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("IMAP Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro ao sincronizar emails" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function decodeBody(text: string): string {
  // Handle quoted-printable encoding
  if (text.includes("=\r\n") || text.match(/=[0-9A-Fa-f]{2}/)) {
    text = text
      .replace(/=\r\n/g, "")
      .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  }
  // Handle base64
  if (/^[A-Za-z0-9+/=\s]+$/.test(text.trim()) && text.trim().length > 20) {
    try {
      const cleaned = text.replace(/\s/g, "");
      return atob(cleaned);
    } catch {
      // Not base64
    }
  }
  return text.trim();
}
