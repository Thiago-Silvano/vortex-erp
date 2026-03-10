import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify auth
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { endpoint, method, payload, empresa_id } = body;

    // Validate endpoint
    const allowedEndpoints = ['/connect', '/disconnect', '/send-message', '/status'];
    if (!endpoint || !allowedEndpoints.some(e => endpoint.startsWith(e))) {
      return new Response(JSON.stringify({ error: 'Invalid endpoint' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get server URL from whatsapp_sessions
    let serverUrl: string | null = null;

    if (empresa_id) {
      const { data: session } = await supabase
        .from('whatsapp_sessions')
        .select('server_url')
        .eq('empresa_id', empresa_id)
        .single();
      serverUrl = session?.server_url || null;
    }

    if (!serverUrl) {
      return new Response(JSON.stringify({ error: 'URL do servidor não configurada' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Clean server URL: remove trailing slashes and any accidental endpoint suffixes
    serverUrl = serverUrl.replace(/\/+$/, '');
    serverUrl = serverUrl.replace(/\/(connect|disconnect|send-message|status)\/?$/i, '');

    // Clean endpoint: ensure single leading slash
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const targetUrl = `${serverUrl}${cleanEndpoint}`;
    const fetchMethod = method || 'GET';

    console.log(`Proxying ${fetchMethod} ${targetUrl}`);

    // Longer timeout for /connect (30s), shorter for others (15s)
    const timeoutMs = cleanEndpoint === '/connect' ? 30000 : 15000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const fetchOptions: RequestInit = {
        method: fetchMethod,
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      };

      if (fetchMethod !== 'GET' && payload) {
        fetchOptions.body = JSON.stringify(payload);
      }

      const response = await fetch(targetUrl, fetchOptions);
      clearTimeout(timeoutId);

      let data: any;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = { message: text };
      }

      return new Response(JSON.stringify({
        ok: response.ok,
        status: response.status,
        data,
      }), {
        status: 200, // Always return 200 from proxy, let client check data.ok
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      const errorMsg = fetchError instanceof Error ? fetchError.message : String(fetchError);
      const isTimeout = errorMsg.includes('abort');
      console.error(`Proxy fetch error: ${errorMsg}`);

      return new Response(JSON.stringify({
        ok: false,
        error: isTimeout ? 'Servidor inacessível (timeout)' : `Servidor inacessível: ${errorMsg}`,
      }), {
        status: 200, // Return 200 so client can read the error JSON
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (err) {
    console.error('Proxy error:', err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
