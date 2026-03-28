import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { server_url, endpoint, method = "GET", payload } = body;

    if (!server_url || !endpoint) {
      return new Response(
        JSON.stringify({ error: "server_url and endpoint are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const targetUrl = `${server_url.replace(/\/$/, "")}${endpoint}`;
    const normalizedMethod = String(method || "GET").toUpperCase();

    const doFetch = async (fetchPayload?: unknown) => {
      const opts: RequestInit = {
        method: normalizedMethod,
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(10000),
      };

      if (normalizedMethod !== "GET" && fetchPayload !== undefined) {
        opts.body = JSON.stringify(fetchPayload);
      }

      let res: Response;
      try {
        res = await fetch(targetUrl, opts);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("timed out") || msg.includes("aborted")) {
          throw new Error(`Servidor WhatsApp indisponível (timeout ao conectar em ${server_url}). Verifique se o servidor está online e acessível.`);
        }
        throw e;
      }

      const text = await res.text();
      let parsed: unknown;
      try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }
      return { status: res.status, parsed, text };
    };

    let result = await doFetch(payload);

    // Retry with alternative number formats for "No LID for user" errors
    const originalNumber = (payload as { number?: unknown } | null)?.number;
    if (
      result.status >= 400 &&
      typeof originalNumber === "string" &&
      result.text.toLowerCase().includes("no lid for user")
    ) {
      const digits = originalNumber.replace(/@.*/, "").replace(/\D/g, "");
      const candidates: string[] = [];
      if (!digits.startsWith("55") && (digits.length === 10 || digits.length === 11)) {
        candidates.push(`55${digits}`);
      }
      candidates.push(digits);

      for (const candidate of candidates) {
        if (!candidate || candidate.length < 8) continue;
        const retryPayload = {
          ...(typeof payload === "object" && payload !== null ? payload as Record<string, unknown> : {}),
          number: candidate,
        };
        result = await doFetch(retryPayload);
        if (result.status < 400) break;
      }
    }

    return new Response(JSON.stringify(result.parsed), {
      status: result.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Proxy error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
