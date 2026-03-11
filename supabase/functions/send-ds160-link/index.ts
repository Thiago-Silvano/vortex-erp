import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, clientName, formLink } = await req.json();

    if (!to || !formLink) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Try to get email settings to send via SMTP
    const { data: emailSettings } = await supabase
      .from('email_settings')
      .select('*')
      .limit(1)
      .single();

    // For now, just log the email - the actual sending depends on email infrastructure
    console.log(`DS-160 link email to: ${to}, client: ${clientName}, link: ${formLink}`);

    // If email settings exist, we could send via SMTP
    // For now, return success - the link is generated and can be copied
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Link generated successfully',
      formLink 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
