import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Minimal IMAP client using Deno native APIs
class MiniIMAP {
  private conn!: Deno.TlsConn | Deno.Conn;
  private buffer = new Uint8Array(0);
  private tagCounter = 0;
  private encoder = new TextEncoder();
  private decoder = new TextDecoder();

  async connect(host: string, port: number, tls: boolean) {
    console.log(`Connecting to ${host}:${port} tls=${tls}...`);
    
    const connectPromise = tls
      ? Deno.connectTls({ hostname: host, port })
      : Deno.connect({ hostname: host, port });
    
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Connection timeout (10s)")), 10000)
    );
    
    this.conn = await Promise.race([connectPromise, timeoutPromise]);
    console.log("Connected successfully");
    
    const greeting = await this.readUntilLine();
    console.log("IMAP Greeting:", greeting.substring(0, 100));
  }

  private async readChunk(): Promise<Uint8Array> {
    const buf = new Uint8Array(8192);
    const n = await this.conn.read(buf);
    if (n === null) throw new Error("Connection closed");
    return buf.subarray(0, n);
  }

  private async readUntilLine(): Promise<string> {
    while (true) {
      const text = this.decoder.decode(this.buffer);
      const lineEnd = text.indexOf("\r\n");
      if (lineEnd >= 0) {
        const line = text.substring(0, lineEnd);
        this.buffer = this.encoder.encode(text.substring(lineEnd + 2));
        return line;
      }
      
      const chunk = await this.readChunk();
      const newBuf = new Uint8Array(this.buffer.length + chunk.length);
      newBuf.set(this.buffer);
      newBuf.set(chunk, this.buffer.length);
      this.buffer = newBuf;
    }
  }

  private async readUntilTag(tag: string): Promise<string> {
    let response = "";
    while (true) {
      const line = await this.readUntilLine();
      response += line + "\r\n";
      if (line.startsWith(tag + " ")) {
        return response;
      }
    }
  }

  private async send(cmd: string): Promise<string> {
    this.tagCounter++;
    const tag = `A${String(this.tagCounter).padStart(4, "0")}`;
    const fullCmd = `${tag} ${cmd}\r\n`;
    await this.conn.write(this.encoder.encode(fullCmd));
    return await this.readUntilTag(tag);
  }

  async login(user: string, pass: string): Promise<boolean> {
    console.log("IMAP LOGIN...");
    const escapedPass = pass.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    const resp = await this.send(`LOGIN "${user}" "${escapedPass}"`);
    const ok = resp.includes(" OK ");
    console.log("LOGIN:", ok ? "OK" : "FAILED");
    return ok;
  }

  async select(mailbox: string): Promise<number> {
    console.log("IMAP SELECT", mailbox);
    const resp = await this.send(`SELECT "${mailbox}"`);
    const m = resp.match(/\*\s+(\d+)\s+EXISTS/i);
    const count = m ? parseInt(m[1]) : 0;
    console.log("EXISTS:", count);
    return count;
  }

  async fetchHeadersBatch(seqRange: string): Promise<Array<{
    seq: number; messageId: string; from: string; fromName: string;
    to: string[]; cc: string[]; subject: string; date: string;
  }>> {
    console.log("FETCH headers", seqRange);
    const resp = await this.send(
      `FETCH ${seqRange} (BODY.PEEK[HEADER.FIELDS (FROM TO CC SUBJECT DATE MESSAGE-ID)])`
    );

    const messages: Array<any> = [];
    const blocks = resp.split(/\*\s+(\d+)\s+FETCH/);

    for (let i = 1; i < blocks.length; i += 2) {
      const seq = parseInt(blocks[i]);
      const block = blocks[i + 1] || "";
      const headers = parseHeaders(block);

      const fromRaw = headers["from"] || "";
      let fromEmail = "", fromName = "";
      const fm = fromRaw.match(/<([^>]+)>/);
      if (fm) {
        fromEmail = fm[1];
        fromName = fromRaw.replace(/<[^>]+>/, "").replace(/"/g, "").trim();
      } else {
        fromEmail = fromRaw.trim();
      }

      fromName = decodeMimeWords(fromName) || fromEmail.split("@")[0];
      const subject = decodeMimeWords(headers["subject"] || "(sem assunto)");
      const to = extractEmails(headers["to"] || "");
      const cc = extractEmails(headers["cc"] || "");
      const messageId = (headers["message-id"] || "").replace(/[<>]/g, "") || `seq-${seq}-${Date.now()}`;
      const date = headers["date"] || new Date().toISOString();

      messages.push({ seq, messageId, from: fromEmail, fromName, to, cc, subject, date });
    }

    console.log(`Parsed ${messages.length} message headers`);
    return messages;
  }

  async logout() {
    try { await this.send("LOGOUT"); } catch { /* ignore */ }
    try { this.conn.close(); } catch { /* ignore */ }
  }
}

function parseHeaders(block: string): Record<string, string> {
  const headers: Record<string, string> = {};
  let currentKey = "";
  for (const line of block.split(/\r?\n/)) {
    if (line.startsWith(" ") || line.startsWith("\t")) {
      if (currentKey) headers[currentKey] = (headers[currentKey] || "") + " " + line.trim();
    } else {
      const m = line.match(/^([A-Za-z-]+):\s*(.*)/i);
      if (m) { currentKey = m[1].toLowerCase(); headers[currentKey] = m[2].trim(); }
    }
  }
  return headers;
}

function decodeMimeWords(str: string): string {
  return str.replace(/=\?([^?]+)\?([BbQq])\?([^?]+)\?=/g, (_, charset, enc, data) => {
    try {
      if (enc.toUpperCase() === "B") {
        const bytes = Uint8Array.from(atob(data), (c: string) => c.charCodeAt(0));
        return new TextDecoder(charset).decode(bytes);
      }
      const decoded = data.replace(/_/g, " ").replace(/=([0-9A-Fa-f]{2})/g, (_: string, h: string) =>
        String.fromCharCode(parseInt(h, 16))
      );
      const bytes = Uint8Array.from(decoded, (c: string) => c.charCodeAt(0));
      return new TextDecoder(charset).decode(bytes);
    } catch { return data; }
  });
}

function extractEmails(raw: string): string[] {
  return (raw.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || []);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { user_id, empresa_id } = await req.json();

    // Look up settings by user_id (new) or empresa_id (legacy)
    let settings: any = null;
    let effectiveUserId = user_id;
    let effectiveEmpresaId = empresa_id;

    if (user_id) {
      const { data, error } = await supabase
        .from("email_settings").select("*").eq("user_id", user_id).single();
      if (!error && data) {
        settings = data;
        effectiveEmpresaId = effectiveEmpresaId || settings.empresa_id;
      }
    }

    if (!settings && empresa_id) {
      const { data, error } = await supabase
        .from("email_settings").select("*").eq("empresa_id", empresa_id).maybeSingle();
      if (!error && data) {
        settings = data;
        effectiveUserId = effectiveUserId || settings.user_id;
      }
    }

    if (!settings) {
      return new Response(JSON.stringify({ error: "Configurações IMAP não encontradas. Configure seu email." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const s = settings;
    if (!s.imap_host || !s.imap_user || !s.imap_password) {
      return new Response(JSON.stringify({ error: "Configurações IMAP incompletas" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const port = s.imap_port || 993;
    const useTls = s.imap_ssl !== false;

    console.log(`Starting IMAP sync for ${s.imap_host}:${port} user=${s.imap_user}`);

    const imap = new MiniIMAP();
    await imap.connect(s.imap_host, port, useTls);
    
    const loginOk = await imap.login(s.imap_user, s.imap_password);
    if (!loginOk) {
      await imap.logout();
      return new Response(JSON.stringify({ error: "Falha na autenticação IMAP" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const total = await imap.select("INBOX");
    if (total === 0) {
      await imap.logout();
      return new Response(JSON.stringify({ success: true, fetched: 0, message: "Caixa vazia" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const startSeq = Math.max(1, total - 19);
    const headers = await imap.fetchHeadersBatch(`${startSeq}:${total}`);

    // Deduplicate: check by message_id + user_id
    let newCount = 0;
    for (const msg of headers) {
      let existingQuery = supabase
        .from("emails").select("id")
        .eq("message_id", msg.messageId);

      if (effectiveUserId) {
        existingQuery = existingQuery.eq("user_id", effectiveUserId);
      } else if (effectiveEmpresaId) {
        existingQuery = existingQuery.eq("empresa_id", effectiveEmpresaId);
      }

      const { data: existing } = await existingQuery.maybeSingle();
      if (existing) continue;

      let clientId: string | null = null;
      if (msg.from && effectiveEmpresaId) {
        const { data: cd } = await supabase.from("clients").select("id")
          .eq("empresa_id", effectiveEmpresaId).eq("email", msg.from).maybeSingle();
        if (cd) clientId = cd.id;
      }

      let sentAt: string;
      try { sentAt = new Date(msg.date).toISOString(); } catch { sentAt = new Date().toISOString(); }

      const insertRecord: any = {
        message_id: msg.messageId,
        from_email: msg.from, from_name: msg.fromName,
        to_emails: msg.to.length > 0 ? msg.to : [s.imap_user],
        cc_emails: msg.cc.length > 0 ? msg.cc : null,
        subject: msg.subject, body_text: "", body_html: "",
        folder: "inbox", status: "received",
        is_read: false, is_starred: false,
        sent_at: sentAt, client_id: clientId,
      };

      if (effectiveUserId) insertRecord.user_id = effectiveUserId;
      if (effectiveEmpresaId) insertRecord.empresa_id = effectiveEmpresaId;

      await supabase.from("emails").insert(insertRecord);
      newCount++;
    }

    await imap.logout();
    console.log(`Sync complete: ${newCount} new emails`);

    return new Response(
      JSON.stringify({ success: true, fetched: newCount, message: `${newCount} novos emails sincronizados` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("IMAP Error:", error.message, error.stack);
    return new Response(
      JSON.stringify({ error: error.message || "Erro ao sincronizar emails" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
