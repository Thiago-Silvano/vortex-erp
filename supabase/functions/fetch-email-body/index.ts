import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Minimal IMAP client for fetching email body
class MiniIMAP {
  private conn!: Deno.TlsConn | Deno.Conn;
  private buffer = new Uint8Array(0);
  private tagCounter = 0;
  private encoder = new TextEncoder();
  private decoder = new TextDecoder();

  async connect(host: string, port: number, tls: boolean) {
    const connectPromise = tls
      ? Deno.connectTls({ hostname: host, port })
      : Deno.connect({ hostname: host, port });
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Connection timeout (10s)")), 10000)
    );
    this.conn = await Promise.race([connectPromise, timeoutPromise]);
    await this.readUntilLine(); // greeting
  }

  private async readChunk(): Promise<Uint8Array> {
    const buf = new Uint8Array(65536);
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
    const maxSize = 5 * 1024 * 1024; // 5MB limit
    while (true) {
      const line = await this.readUntilLine();
      response += line + "\r\n";
      if (response.length > maxSize) throw new Error("Response too large");
      if (line.startsWith(tag + " ")) return response;
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
    const escapedPass = pass.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    const resp = await this.send(`LOGIN "${user}" "${escapedPass}"`);
    return resp.includes(" OK ");
  }

  async select(mailbox: string): Promise<number> {
    const resp = await this.send(`SELECT "${mailbox}"`);
    const m = resp.match(/\*\s+(\d+)\s+EXISTS/i);
    return m ? parseInt(m[1]) : 0;
  }

  async searchByMessageId(messageId: string): Promise<number[]> {
    const resp = await this.send(`SEARCH HEADER Message-ID "<${messageId}>"`);
    const match = resp.match(/\*\s+SEARCH\s+([\d\s]+)/);
    if (!match) return [];
    return match[1].trim().split(/\s+/).map(Number).filter(n => !isNaN(n));
  }

  async fetchBody(seq: number): Promise<string> {
    const resp = await this.send(`FETCH ${seq} BODY[]`);
    return resp;
  }

  async logout() {
    try { await this.send("LOGOUT"); } catch { /* ignore */ }
    try { this.conn.close(); } catch { /* ignore */ }
  }
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

function decodeQuotedPrintable(str: string, charset = "utf-8"): string {
  const decoded = str
    .replace(/=\r?\n/g, "")
    .replace(/=([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
  try {
    const bytes = Uint8Array.from(decoded, (c) => c.charCodeAt(0));
    return new TextDecoder(charset).decode(bytes);
  } catch {
    return decoded;
  }
}

function decodeBase64(str: string, charset = "utf-8"): string {
  try {
    const cleaned = str.replace(/\r?\n/g, "");
    const bytes = Uint8Array.from(atob(cleaned), (c) => c.charCodeAt(0));
    return new TextDecoder(charset).decode(bytes);
  } catch {
    return str;
  }
}

interface MimePart {
  contentType: string;
  charset: string;
  encoding: string;
  body: string;
  fileName: string;
  disposition: string;
}

function parseMimeMessage(raw: string): { bodyHtml: string; bodyText: string; attachments: Array<{ fileName: string; contentType: string; data: string }> } {
  // Extract body from IMAP FETCH response - find the literal content
  let body = raw;
  const literalMatch = raw.match(/\{(\d+)\}\r\n/);
  if (literalMatch) {
    const startIdx = raw.indexOf(literalMatch[0]) + literalMatch[0].length;
    const literalLen = parseInt(literalMatch[1]);
    body = raw.substring(startIdx, startIdx + literalLen);
  }

  // Parse headers
  const headerEnd = body.indexOf("\r\n\r\n");
  if (headerEnd < 0) return { bodyHtml: "", bodyText: body, attachments: [] };

  const headerSection = body.substring(0, headerEnd);
  const bodySection = body.substring(headerEnd + 4);

  const contentType = extractHeader(headerSection, "content-type") || "text/plain";
  const encoding = extractHeader(headerSection, "content-transfer-encoding") || "7bit";
  const charset = extractCharset(contentType) || "utf-8";

  // Check if multipart
  const boundaryMatch = contentType.match(/boundary="?([^";\s]+)"?/i);
  if (boundaryMatch) {
    const boundary = boundaryMatch[1];
    const parts = parseMimeParts(bodySection, boundary);
    return extractContent(parts);
  }

  // Single part
  const decodedBody = decodeContent(bodySection, encoding, charset);
  if (contentType.toLowerCase().includes("text/html")) {
    return { bodyHtml: decodedBody, bodyText: "", attachments: [] };
  }
  return { bodyHtml: "", bodyText: decodedBody, attachments: [] };
}

function extractHeader(headers: string, name: string): string {
  // Unfold headers first
  const unfolded = headers.replace(/\r?\n[ \t]+/g, " ");
  const regex = new RegExp(`^${name}:\\s*(.+)$`, "mi");
  const match = unfolded.match(regex);
  return match ? match[1].trim() : "";
}

function extractCharset(contentType: string): string {
  const m = contentType.match(/charset="?([^";\s]+)"?/i);
  return m ? m[1].toLowerCase() : "utf-8";
}

function parseMimeParts(body: string, boundary: string): MimePart[] {
  const parts: MimePart[] = [];
  const delimiter = "--" + boundary;
  const endDelimiter = delimiter + "--";

  const sections = body.split(delimiter);
  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed || trimmed.startsWith("--") || trimmed === "") continue;

    const headerEnd = trimmed.indexOf("\r\n\r\n");
    if (headerEnd < 0) continue;

    const partHeaders = trimmed.substring(0, headerEnd);
    let partBody = trimmed.substring(headerEnd + 4);

    // Remove trailing end delimiter
    const endIdx = partBody.indexOf(endDelimiter);
    if (endIdx >= 0) partBody = partBody.substring(0, endIdx);

    const ct = extractHeader(partHeaders, "content-type") || "text/plain";
    const cte = extractHeader(partHeaders, "content-transfer-encoding") || "7bit";
    const cd = extractHeader(partHeaders, "content-disposition") || "";
    const charset = extractCharset(ct);

    // Check for nested multipart
    const nestedBoundary = ct.match(/boundary="?([^";\s]+)"?/i);
    if (nestedBoundary) {
      const nestedParts = parseMimeParts(partBody, nestedBoundary[1]);
      parts.push(...nestedParts);
      continue;
    }

    // Extract filename
    let fileName = "";
    const fnMatch = cd.match(/filename="?([^";\r\n]+)"?/i) || ct.match(/name="?([^";\r\n]+)"?/i);
    if (fnMatch) fileName = decodeMimeWords(fnMatch[1].trim());

    parts.push({
      contentType: ct.split(";")[0].trim().toLowerCase(),
      charset,
      encoding: cte.toLowerCase(),
      body: partBody.trim(),
      fileName,
      disposition: cd.toLowerCase(),
    });
  }
  return parts;
}

function decodeContent(body: string, encoding: string, charset: string): string {
  switch (encoding.toLowerCase()) {
    case "base64": return decodeBase64(body, charset);
    case "quoted-printable": return decodeQuotedPrintable(body, charset);
    default: {
      try {
        const bytes = Uint8Array.from(body, (c) => c.charCodeAt(0));
        return new TextDecoder(charset).decode(bytes);
      } catch {
        return body;
      }
    }
  }
}

function extractContent(parts: MimePart[]): { bodyHtml: string; bodyText: string; attachments: Array<{ fileName: string; contentType: string; data: string }> } {
  let bodyHtml = "";
  let bodyText = "";
  const attachments: Array<{ fileName: string; contentType: string; data: string }> = [];

  for (const part of parts) {
    const isAttachment = part.disposition.includes("attachment") || (part.fileName && !part.disposition.includes("inline"));

    if (isAttachment && part.fileName) {
      attachments.push({
        fileName: part.fileName,
        contentType: part.contentType,
        data: part.body,
      });
    } else if (part.contentType === "text/html" && !bodyHtml) {
      bodyHtml = decodeContent(part.body, part.encoding, part.charset);
    } else if (part.contentType === "text/plain" && !bodyText) {
      bodyText = decodeContent(part.body, part.encoding, part.charset);
    }
  }

  return { bodyHtml, bodyText, attachments };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { email_id, user_id } = await req.json();
    if (!email_id || !user_id) {
      return new Response(JSON.stringify({ error: "email_id and user_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get the email record
    const { data: email, error: emailErr } = await supabase
      .from("emails").select("*").eq("id", email_id).eq("user_id", user_id).single();
    if (emailErr || !email) {
      return new Response(JSON.stringify({ error: "Email não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // If body already fetched, return it
    if (email.body_html || email.body_text) {
      // Also fetch attachments
      const { data: attachments } = await supabase
        .from("email_attachments").select("*").eq("email_id", email_id);
      return new Response(JSON.stringify({
        body_html: email.body_html,
        body_text: email.body_text,
        attachments: attachments || [],
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Need to fetch from IMAP
    const { data: settings } = await supabase
      .from("email_settings").select("*").eq("user_id", user_id).single();
    if (!settings) {
      return new Response(JSON.stringify({ error: "Configurações IMAP não encontradas" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const s = settings as any;
    const port = s.imap_port || 993;
    const useTls = s.imap_ssl !== false;

    console.log(`Fetching body for email ${email_id}, message_id=${email.message_id}`);

    const imap = new MiniIMAP();
    await imap.connect(s.imap_host, port, useTls);

    const loginOk = await imap.login(s.imap_user, s.imap_password);
    if (!loginOk) {
      await imap.logout();
      return new Response(JSON.stringify({ error: "Falha na autenticação IMAP" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    await imap.select("INBOX");

    // Search by Message-ID
    const seqs = await imap.searchByMessageId(email.message_id);
    if (seqs.length === 0) {
      await imap.logout();
      console.log("Message not found on IMAP server");
      return new Response(JSON.stringify({
        body_html: "",
        body_text: "(Conteúdo não encontrado no servidor de email)",
        attachments: [],
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const rawBody = await imap.fetchBody(seqs[0]);
    await imap.logout();

    const parsed = parseMimeMessage(rawBody);

    // Update email in database
    await supabase.from("emails").update({
      body_html: parsed.bodyHtml || "",
      body_text: parsed.bodyText || "",
    } as any).eq("id", email_id);

    // Store attachments
    const savedAttachments: any[] = [];
    for (const att of parsed.attachments) {
      // Store attachment metadata (without large data for now)
      const { data: inserted } = await supabase.from("email_attachments").insert({
        email_id,
        file_name: att.fileName,
        mime_type: att.contentType,
        file_url: "", // placeholder
        file_size: att.data.length,
      } as any).select("*").single();
      if (inserted) savedAttachments.push(inserted);
    }

    console.log(`Body fetched: html=${parsed.bodyHtml.length}b, text=${parsed.bodyText.length}b, attachments=${parsed.attachments.length}`);

    return new Response(JSON.stringify({
      body_html: parsed.bodyHtml,
      body_text: parsed.bodyText,
      attachments: savedAttachments,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error("Fetch body error:", error.message, error.stack);
    return new Response(JSON.stringify({ error: error.message || "Erro ao buscar corpo do email" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
