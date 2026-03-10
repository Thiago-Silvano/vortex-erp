import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Minimal IMAP client using Deno native TLS
class MiniIMAP {
  private conn!: Deno.TlsConn | Deno.Conn;
  private reader!: ReadableStreamDefaultReader<Uint8Array>;
  private buffer = "";
  private tagCounter = 0;
  private encoder = new TextEncoder();
  private decoder = new TextDecoder();

  async connect(host: string, port: number, tls: boolean) {
    if (tls) {
      this.conn = await Deno.connectTls({ hostname: host, port });
    } else {
      this.conn = await Deno.connect({ hostname: host, port });
    }
    this.reader = this.conn.readable.getReader();
    // Read greeting
    await this.readResponse("*");
  }

  private async readMore(): Promise<string> {
    const { value, done } = await this.reader.read();
    if (done) throw new Error("Connection closed");
    return this.decoder.decode(value);
  }

  private async readResponse(tag: string): Promise<string> {
    let response = "";
    while (true) {
      // Read more data if buffer doesn't have complete lines
      while (!this.buffer.includes("\r\n")) {
        this.buffer += await this.readMore();
      }

      // Process complete lines
      const lines = this.buffer.split("\r\n");
      this.buffer = lines.pop() || ""; // Keep incomplete line in buffer

      for (const line of lines) {
        response += line + "\r\n";
        // Check if this is the tagged response (completion)
        if (line.startsWith(tag + " ")) {
          return response;
        }
      }
    }
  }

  private async readLiteralResponse(tag: string): Promise<string> {
    let response = "";
    while (true) {
      while (!this.buffer.includes("\r\n")) {
        this.buffer += await this.readMore();
      }

      const lines = this.buffer.split("\r\n");
      this.buffer = lines.pop() || "";

      for (const line of lines) {
        response += line + "\r\n";

        // Check for literal continuation {size}
        const literalMatch = line.match(/\{(\d+)\}$/);
        if (literalMatch) {
          const size = parseInt(literalMatch[1]);
          // Read exactly 'size' bytes of literal data
          let literalData = "";
          while (literalData.length < size) {
            if (this.buffer.length > 0) {
              const take = Math.min(this.buffer.length, size - literalData.length);
              literalData += this.buffer.substring(0, take);
              this.buffer = this.buffer.substring(take);
            } else {
              this.buffer += await this.readMore();
            }
          }
          response += literalData;
        }

        if (line.startsWith(tag + " ")) {
          return response;
        }
      }
    }
  }

  private async command(cmd: string, literal = false): Promise<string> {
    this.tagCounter++;
    const tag = `A${this.tagCounter}`;
    const fullCmd = `${tag} ${cmd}\r\n`;
    await this.conn.write(this.encoder.encode(fullCmd));
    if (literal) {
      return await this.readLiteralResponse(tag);
    }
    return await this.readResponse(tag);
  }

  async login(user: string, pass: string): Promise<boolean> {
    // Escape password (double-quote special chars)
    const escapedPass = pass.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    const resp = await this.command(`LOGIN "${user}" "${escapedPass}"`);
    return resp.includes("OK");
  }

  async select(mailbox: string): Promise<number> {
    const resp = await this.command(`SELECT "${mailbox}"`);
    const existsMatch = resp.match(/\*\s+(\d+)\s+EXISTS/i);
    return existsMatch ? parseInt(existsMatch[1]) : 0;
  }

  async fetchHeaders(seqRange: string): Promise<Array<{
    seq: number;
    messageId: string;
    from: string;
    fromName: string;
    to: string[];
    cc: string[];
    subject: string;
    date: string;
  }>> {
    const resp = await this.command(
      `FETCH ${seqRange} (BODY.PEEK[HEADER.FIELDS (FROM TO CC SUBJECT DATE MESSAGE-ID)])`,
      true
    );

    const messages: Array<any> = [];
    // Parse each FETCH response
    const fetchBlocks = resp.split(/\*\s+(\d+)\s+FETCH/);

    for (let i = 1; i < fetchBlocks.length; i += 2) {
      const seq = parseInt(fetchBlocks[i]);
      const block = fetchBlocks[i + 1] || "";

      const headers: Record<string, string> = {};
      // Extract header block between the literal data
      const headerLines = block.split(/\r?\n/);
      let currentKey = "";

      for (const line of headerLines) {
        if (line.startsWith(" ") || line.startsWith("\t")) {
          // Continuation of previous header
          if (currentKey) {
            headers[currentKey] = (headers[currentKey] || "") + " " + line.trim();
          }
        } else {
          const match = line.match(/^([A-Za-z-]+):\s*(.*)/);
          if (match) {
            currentKey = match[1].toLowerCase();
            headers[currentKey] = match[2].trim();
          }
        }
      }

      // Parse from address
      const fromRaw = headers["from"] || "";
      let fromEmail = "";
      let fromName = "";
      const fromMatch = fromRaw.match(/<([^>]+)>/);
      if (fromMatch) {
        fromEmail = fromMatch[1];
        fromName = fromRaw.replace(/<[^>]+>/, "").replace(/"/g, "").trim();
      } else {
        fromEmail = fromRaw.trim();
        fromName = fromEmail.split("@")[0];
      }

      // Decode MIME encoded words in subject and fromName
      const subject = decodeMimeWords(headers["subject"] || "(sem assunto)");
      fromName = decodeMimeWords(fromName) || fromEmail.split("@")[0];

      // Parse to addresses
      const toRaw = headers["to"] || "";
      const to = parseAddresses(toRaw);

      // Parse cc
      const ccRaw = headers["cc"] || "";
      const cc = parseAddresses(ccRaw);

      const messageId = headers["message-id"] || `seq-${seq}-${Date.now()}`;
      const date = headers["date"] || new Date().toISOString();

      messages.push({ seq, messageId, from: fromEmail, fromName, to, cc, subject, date });
    }

    return messages;
  }

  async fetchBody(seq: number): Promise<{ html: string; text: string }> {
    const resp = await this.command(`FETCH ${seq} (BODY.PEEK[TEXT])`, true);

    // Extract body content
    let bodyContent = "";
    const literalMatch = resp.match(/\{(\d+)\}/);
    if (literalMatch) {
      const startIdx = resp.indexOf(literalMatch[0]) + literalMatch[0].length;
      bodyContent = resp.substring(startIdx).trim();
    } else {
      // Try to extract between BODY[TEXT] markers
      const bodyStart = resp.indexOf("BODY[TEXT]");
      if (bodyStart > -1) {
        bodyContent = resp.substring(bodyStart + 10).trim();
      }
    }

    // Remove trailing ")" and tag response
    const tagIdx = bodyContent.lastIndexOf("\r\nA");
    if (tagIdx > -1) {
      bodyContent = bodyContent.substring(0, tagIdx);
    }

    // Simple content type detection
    if (bodyContent.includes("<html") || bodyContent.includes("<div") || bodyContent.includes("<p>")) {
      return { html: bodyContent, text: stripHtml(bodyContent) };
    }

    return { html: bodyContent.replace(/\n/g, "<br>"), text: bodyContent };
  }

  async logout() {
    try {
      await this.command("LOGOUT");
    } catch {
      // ignore
    }
    try {
      this.conn.close();
    } catch {
      // ignore
    }
  }
}

function decodeMimeWords(str: string): string {
  return str.replace(/=\?([^?]+)\?([BbQq])\?([^?]+)\?=/g, (_, charset, encoding, data) => {
    try {
      if (encoding.toUpperCase() === "B") {
        const bytes = Uint8Array.from(atob(data), c => c.charCodeAt(0));
        return new TextDecoder(charset).decode(bytes);
      } else {
        // Quoted-printable
        const decoded = data.replace(/_/g, " ").replace(/=([0-9A-Fa-f]{2})/g, (_: any, hex: string) =>
          String.fromCharCode(parseInt(hex, 16))
        );
        const bytes = Uint8Array.from(decoded, (c: string) => c.charCodeAt(0));
        return new TextDecoder(charset).decode(bytes);
      }
    } catch {
      return data;
    }
  });
}

function parseAddresses(raw: string): string[] {
  if (!raw.trim()) return [];
  const addresses: string[] = [];
  const matches = raw.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
  if (matches) return matches;
  return addresses;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").trim();
}

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

    const imap = new MiniIMAP();
    await imap.connect(s.imap_host, port, useTls);

    const loginOk = await imap.login(s.imap_user, s.imap_password);
    if (!loginOk) {
      await imap.logout();
      return new Response(
        JSON.stringify({ error: "Falha na autenticação IMAP" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const totalMessages = await imap.select("INBOX");

    if (totalMessages === 0) {
      await imap.logout();
      return new Response(
        JSON.stringify({ success: true, fetched: 0, message: "Caixa vazia" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch last 20 messages headers
    const startSeq = Math.max(1, totalMessages - 19);
    const headers = await imap.fetchHeaders(`${startSeq}:${totalMessages}`);

    let newCount = 0;

    for (const msg of headers) {
      // Check if already exists
      const { data: existing } = await supabase
        .from("emails")
        .select("id")
        .eq("message_id", msg.messageId)
        .eq("empresa_id", empresa_id)
        .maybeSingle();

      if (existing) continue;

      // Try to link to client
      let clientId: string | null = null;
      if (msg.from) {
        const { data: clientData } = await supabase
          .from("clients")
          .select("id")
          .eq("empresa_id", empresa_id)
          .eq("email", msg.from)
          .maybeSingle();
        if (clientData) clientId = clientData.id;
      }

      let sentAt: string;
      try {
        sentAt = new Date(msg.date).toISOString();
      } catch {
        sentAt = new Date().toISOString();
      }

      // Insert with headers only (body fetched on demand or from subject preview)
      await supabase.from("emails").insert({
        empresa_id,
        message_id: msg.messageId,
        from_email: msg.from,
        from_name: msg.fromName,
        to_emails: msg.to.length > 0 ? msg.to : [s.imap_user],
        cc_emails: msg.cc.length > 0 ? msg.cc : null,
        subject: msg.subject,
        body_text: "",
        body_html: "",
        folder: "inbox",
        status: "received",
        is_read: false,
        is_starred: false,
        sent_at: sentAt,
        client_id: clientId,
      } as any);

      newCount++;
    }

    await imap.logout();

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
