import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    // Auth check
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

    const token = authHeader.replace("Bearer ", "");
    const { data, error: authError } = await supabase.auth.getClaims(token);
    if (authError || !data?.claims) {
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

    const executeProxyCall = async (requestPayload?: unknown) => {
      const fetchOptions: RequestInit = {
        method: normalizedMethod,
        headers: { "Content-Type": "application/json" },
      };

      if (normalizedMethod !== "GET" && requestPayload !== undefined) {
        fetchOptions.body = JSON.stringify(requestPayload);
      }

      const response = await fetch(targetUrl, fetchOptions);
      const responseText = await response.text();

      let parsed: unknown;
      try {
        parsed = JSON.parse(responseText);
      } catch {
        parsed = { raw: responseText };
      }

      return { response, parsed, responseText };
    };

    let { response, parsed, responseText } = await executeProxyCall(payload);

    // Some WhatsApp server implementations throw "No LID for user" with certain id formats.
    // Retry with alternative number formats for compatibility.
    const originalNumber = (payload as { number?: unknown } | null)?.number;
    const shouldRetryNoLid =
      response.status >= 400 &&
      typeof originalNumber === "string" &&
      responseText.toLowerCase().includes("no lid for user");

    if (shouldRetryNoLid) {
      const digits = originalNumber.replace(/@.*/, "").replace(/\D/g, "");
      const candidates = [digits];

      if (!digits.startsWith("55") && (digits.length === 10 || digits.length === 11)) {
        candidates.push(`55${digits}`);
      }

      for (const candidate of candidates) {
        if (!candidate || candidate.length < 8) continue;

        const retryPayload = {
          ...(typeof payload === "object" && payload !== null ? payload as Record<string, unknown> : {}),
          number: candidate,
        };

        const retryResult = await executeProxyCall(retryPayload);
        response = retryResult.response;
        parsed = retryResult.parsed;

        if (response.status < 400) break;
      }
    }

    return new Response(JSON.stringify(parsed), {
      status: response.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || "Proxy error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
