import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const body = await req.json();
    const { action } = body;

    // VERIFY OTP
    if (action === 'verify') {
      const { signature_id, code } = body;
      if (!signature_id || !code) {
        return new Response(JSON.stringify({ error: 'Missing params' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { data: sig } = await supabase
        .from('contract_signatures')
        .select('*')
        .eq('id', signature_id)
        .single();

      if (!sig) {
        return new Response(JSON.stringify({ verified: false, error: 'Signature not found' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Check code and expiry (10 min)
      const sentAt = new Date(sig.verification_sent_at || 0);
      const now = new Date();
      const diffMin = (now.getTime() - sentAt.getTime()) / 60000;

      if (sig.verification_code !== code || diffMin > 10) {
        return new Response(JSON.stringify({ verified: false, error: 'Invalid or expired code' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Mark verified
      await supabase
        .from('contract_signatures')
        .update({ verification_confirmed_at: now.toISOString() })
        .eq('id', signature_id);

      return new Response(JSON.stringify({ verified: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // SEND OTP
    const { signature_id, contract_id, email, name } = body;
    if (!signature_id || !email) {
      return new Response(JSON.stringify({ error: 'Missing params' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Generate 6-digit code
    const code = String(Math.floor(100000 + Math.random() * 900000));

    // Save code
    await supabase
      .from('contract_signatures')
      .update({
        verification_code: code,
        verification_sent_at: new Date().toISOString(),
      })
      .eq('id', signature_id);

    // Get email settings for the contract's company
    const { data: contractData } = await supabase
      .from('contracts')
      .select('empresa_id')
      .eq('id', contract_id)
      .single();

    let emailSettings = null;
    if (contractData?.empresa_id) {
      const { data: settings } = await supabase
        .from('email_settings')
        .select('*')
        .eq('empresa_id', contractData.empresa_id)
        .limit(1)
        .single();
      emailSettings = settings;
    }

    if (!emailSettings) {
      // Fallback: find any email settings
      const { data: settings } = await supabase
        .from('email_settings')
        .select('*')
        .limit(1)
        .single();
      emailSettings = settings;
    }

    if (!emailSettings) {
      // Still save the code — user can see it in DB for testing
      console.log('No email settings found. OTP code:', code);
      return new Response(JSON.stringify({ sent: true, method: 'stored_only' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Send email via SMTP (using Deno's built-in fetch to the send-email function)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const emailBody = `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #1a1a2e; margin-bottom: 4px;">Código de Verificação</h2>
          <p style="color: #666; font-size: 14px;">Para assinar seu contrato</p>
        </div>
        <div style="background: #f4f4ff; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 20px;">
          <p style="color: #666; font-size: 13px; margin-bottom: 8px;">Seu código de verificação é:</p>
          <div style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #6c3ce9; font-family: monospace;">${code}</div>
          <p style="color: #999; font-size: 12px; margin-top: 12px;">Válido por 10 minutos</p>
        </div>
        <p style="color: #666; font-size: 13px; text-align: center;">
          Olá <strong>${name || 'Cliente'}</strong>, use o código acima para verificar sua identidade e assinar o contrato.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #999; font-size: 11px; text-align: center;">Se você não solicitou este código, ignore este email.</p>
      </div>
    `;

    await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        to: email,
        subject: `Código de Verificação: ${code}`,
        html: emailBody,
        empresa_id: contractData?.empresa_id,
      }),
    });

    // Audit log
    await supabase.from('contract_audit_log').insert({
      contract_id,
      action: 'otp_sent',
      actor: 'system',
      actor_type: 'system',
      details: { email, method: 'email' },
    });

    return new Response(JSON.stringify({ sent: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('Error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
