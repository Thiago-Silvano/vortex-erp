import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * NFS-e Emit Edge Function — STUB
 *
 * This edge function has been intentionally gutted.
 * All fiscal emission logic (XML signing, transmission to the national API,
 * certificate handling, etc.) will be handled by an EXTERNAL backend
 * running on your VPS in Node.js/TypeScript.
 *
 * This stub remains deployed so existing frontend code that references it
 * doesn't break, but it always returns a clear message indicating that
 * the external backend must be used.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  return new Response(
    JSON.stringify({
      success: false,
      error: {
        code: "BACKEND_UNAVAILABLE",
        message:
          "A emissão de NFS-e deve ser processada pelo backend fiscal externo. " +
          "Configure a URL do backend nas configurações fiscais do ERP.",
      },
    }),
    {
      status: 501,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});
