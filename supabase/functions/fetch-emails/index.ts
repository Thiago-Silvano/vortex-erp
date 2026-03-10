import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Imap from "npm:imap@0.8.19";
import { simpleParser } from "npm:mailparser@3.7.2";

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

    const port = s.imap_port || 993;
    const useTls = s.imap_ssl !== false;

    // Fetch emails using node-imap
    const result = await new Promise<{ fetched: number; error?: string }>((resolve) => {
      const imap = new Imap({
        user: s.imap_user,
        password: s.imap_password,
        host: s.imap_host,
        port,
        tls: useTls,
        tlsOptions: { rejectUnauthorized: false },
        connTimeout: 15000,
        authTimeout: 10000,
      });

      let newCount = 0;
      let pendingInserts: Promise<void>[] = [];

      imap.once("ready", () => {
        imap.openBox("INBOX", true, (err: any, box: any) => {
          if (err) {
            imap.end();
            resolve({ fetched: 0, error: err.message });
            return;
          }

          const totalMessages = box.messages.total;
          if (totalMessages === 0) {
            imap.end();
            resolve({ fetched: 0 });
            return;
          }

          // Fetch last 30 messages (keep it small for edge function limits)
          const startSeq = Math.max(1, totalMessages - 29);
          const fetchRange = `${startSeq}:*`;

          const f = imap.seq.fetch(fetchRange, {
            bodies: "",
            struct: true,
          });

          f.on("message", (msg: any) => {
            let rawBuffer: Buffer[] = [];

            msg.on("body", (stream: any) => {
              stream.on("data", (chunk: Buffer) => {
                rawBuffer.push(chunk);
              });
            });

            msg.once("end", () => {
              const raw = Buffer.concat(rawBuffer);
              const insertPromise = (async () => {
                try {
                  const parsed = await simpleParser(raw);

                  const messageId = parsed.messageId || `uid-${Date.now()}-${Math.random().toString(36).slice(2)}`;

                  // Check if already exists
                  const { data: existing } = await supabase
                    .from("emails")
                    .select("id")
                    .eq("message_id", messageId)
                    .eq("empresa_id", empresa_id)
                    .maybeSingle();

                  if (existing) return;

                  const fromAddr = parsed.from?.value?.[0];
                  const fromEmail = fromAddr?.address || "";
                  const fromName = fromAddr?.name || fromEmail.split("@")[0] || "";

                  const toEmails = (parsed.to?.value || []).map((a: any) => a.address).filter(Boolean);
                  const ccEmails = (parsed.cc?.value || []).map((a: any) => a.address).filter(Boolean);

                  const bodyHtml = typeof parsed.html === "string" ? parsed.html : "";
                  const bodyText = parsed.text || "";

                  // Try to link to existing client
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

                  const sentAt = parsed.date ? parsed.date.toISOString() : new Date().toISOString();

                  await supabase.from("emails").insert({
                    empresa_id,
                    message_id: messageId,
                    from_email: fromEmail,
                    from_name: fromName,
                    to_emails: toEmails.length > 0 ? toEmails : [s.imap_user],
                    cc_emails: ccEmails.length > 0 ? ccEmails : null,
                    subject: parsed.subject || "(sem assunto)",
                    body_text: bodyText.substring(0, 50000),
                    body_html: bodyHtml.substring(0, 100000) || bodyText.replace(/\n/g, "<br>"),
                    folder: "inbox",
                    status: "received",
                    is_read: false,
                    is_starred: false,
                    sent_at: sentAt,
                    client_id: clientId,
                  } as any);

                  newCount++;
                } catch (parseErr: any) {
                  console.error("Parse error:", parseErr.message);
                }
              })();

              pendingInserts.push(insertPromise);
            });
          });

          f.once("error", (fetchErr: any) => {
            console.error("Fetch error:", fetchErr);
            imap.end();
            resolve({ fetched: newCount, error: fetchErr.message });
          });

          f.once("end", () => {
            // Wait for all inserts to complete before closing
            Promise.all(pendingInserts).then(() => {
              imap.end();
              resolve({ fetched: newCount });
            }).catch(() => {
              imap.end();
              resolve({ fetched: newCount });
            });
          });
        });
      });

      imap.once("error", (err: any) => {
        console.error("IMAP connection error:", err.message);
        resolve({ fetched: 0, error: err.message });
      });

      imap.once("end", () => {
        // connection ended
      });

      imap.connect();
    });

    if (result.error && result.fetched === 0) {
      return new Response(
        JSON.stringify({ error: result.error }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, fetched: result.fetched, message: `${result.fetched} novos emails sincronizados` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro ao sincronizar emails" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
