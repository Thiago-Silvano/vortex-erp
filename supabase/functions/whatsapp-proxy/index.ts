import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const jsonHeaders = {
  ...corsHeaders,
  "Content-Type": "application/json",
};

function extractUpstreamErrorMessage(text: string, parsed: unknown) {
  if (parsed && typeof parsed === "object" && "error" in parsed && typeof parsed.error === "string") {
    return parsed.error;
  }

  const match = text.match(/Cannot\s+(GET|POST|PUT|PATCH|DELETE)\s+([^\s<]+)/i);
  if (match) {
    return `O servidor WhatsApp não suporta o endpoint ${match[2]} (${match[1]}).`;
  }

  const sanitized = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return sanitized || "Erro ao comunicar com o servidor WhatsApp.";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: jsonHeaders,
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
        headers: jsonHeaders,
      });
    }

    const body = await req.json();
    const { server_url, endpoint, method = "GET", payload } = body;

    if (!server_url || !endpoint) {
      return new Response(
        JSON.stringify({ error: "server_url and endpoint are required" }),
        { status: 400, headers: jsonHeaders }
      );
    }

    const targetUrl = `${server_url.replace(/\/$/, "")}${endpoint}`;
    const normalizedMethod = String(method || "GET").toUpperCase();

    const doFetch = async (fetchPayload?: unknown) => {
      const opts: RequestInit = {
        method: normalizedMethod,
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(15000),
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
          const timeoutMessage = `Servidor WhatsApp indisponível (timeout ao conectar em ${server_url}). Verifique se o servidor está online e acessível.`;
          return { status: 503, parsed: { error: timeoutMessage }, text: timeoutMessage };
        }

        const connectionMessage = `Servidor WhatsApp indisponível ao conectar em ${server_url}. Verifique se o servidor está online e acessível.`;
        return { status: 503, parsed: { error: connectionMessage }, text: connectionMessage };
      }

      const text = await res.text();
      let parsed: unknown;
      try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }
      return { status: res.status, parsed, text };
    };

    const result = await doFetch(payload);

    if (result.status >= 400) {
      return new Response(
        JSON.stringify({
          error: extractUpstreamErrorMessage(result.text, result.parsed),
          upstream_status: result.status,
        }),
        { status: 200, headers: jsonHeaders }
      );
    }

    return new Response(JSON.stringify(result.parsed), {
      status: result.status,
      headers: jsonHeaders,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Proxy error" }),
      { status: 500, headers: jsonHeaders }
    );
  }
});
