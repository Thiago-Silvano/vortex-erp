import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Não autorizado");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller || caller.email !== "thiago@vortexviagens.com.br") {
      throw new Error("Apenas o administrador pode convidar usuários");
    }

    const { email } = await req.json();
    if (!email) throw new Error("Email é obrigatório");

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get the origin from the request headers for redirect URL
    const origin = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/$/, "") || "https://orcamentovortex.lovable.app";
    
    const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${origin}/reset-password`,
    });

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, message: `Convite enviado para ${email}` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
