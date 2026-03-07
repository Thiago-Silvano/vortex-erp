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

    // Verify caller is admin
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller || caller.email !== "thiago@vortexviagens.com.br") {
      throw new Error("Apenas o administrador pode gerenciar usuários");
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { action, userId, email, password, displayName } = await req.json();

    switch (action) {
      case "list": {
        const { data, error } = await adminClient.auth.admin.listUsers();
        if (error) throw error;
        const users = data.users.map(u => ({
          id: u.id,
          email: u.email,
          displayName: u.user_metadata?.display_name || u.user_metadata?.full_name || '',
          createdAt: u.created_at,
          lastSignIn: u.last_sign_in_at,
        }));
        return new Response(JSON.stringify({ users }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "delete": {
        if (!userId) throw new Error("userId é obrigatório");
        // Don't allow deleting admin
        const { data: targetUser } = await adminClient.auth.admin.getUserById(userId);
        if (targetUser?.user?.email === "thiago@vortexviagens.com.br") {
          throw new Error("Não é possível excluir o administrador");
        }
        const { error } = await adminClient.auth.admin.deleteUser(userId);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "update": {
        if (!userId) throw new Error("userId é obrigatório");
        const updates: any = {};
        if (password) updates.password = password;
        if (displayName !== undefined) updates.user_metadata = { display_name: displayName };
        const { error } = await adminClient.auth.admin.updateUserById(userId, updates);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        throw new Error("Ação inválida");
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
