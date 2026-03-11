import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, clientName, formLink, user_id, empresa_id } = await req.json();

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

    // Find email settings - try user_id first, then empresa_id, then any
    let settings: any = null;

    if (user_id) {
      const { data } = await supabase.from('email_settings').select('*').eq('user_id', user_id).single();
      if (data) settings = data;
    }

    if (!settings && empresa_id) {
      const { data } = await supabase.from('email_settings').select('*').eq('empresa_id', empresa_id).maybeSingle();
      if (data) settings = data;
    }

    if (!settings) {
      const { data } = await supabase.from('email_settings').select('*').limit(1).single();
      if (data) settings = data;
    }

    if (!settings || !settings.smtp_host || !settings.smtp_user || !settings.smtp_password) {
      console.log(`DS-160 link email - no SMTP settings. To: ${to}, Link: ${formLink}`);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Configurações SMTP não encontradas. Configure o email em Configurações → Email.',
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const port = settings.smtp_port || 587;
    const transporter = nodemailer.createTransport({
      host: settings.smtp_host,
      port,
      secure: port === 465,
      auth: {
        user: settings.smtp_user,
        pass: settings.smtp_password,
      },
    });

    const senderAddress = `${settings.from_name || 'Vortex Vistos'} <${settings.from_email || settings.smtp_user}>`;

    await transporter.sendMail({
      from: senderAddress,
      to,
      subject: '📋 Formulário DS-160 — Preencha seus dados',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #0D1B2A 0%, #1B2D45 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Formulário DS-160</h1>
            <p style="color: #94a3b8; margin: 8px 0 0 0; font-size: 14px;">Vortex Vistos</p>
          </div>
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-top: none;">
            <p style="font-size: 16px; color: #334155;">Olá${clientName ? ` <strong>${clientName}</strong>` : ''},</p>
            <p style="font-size: 14px; color: #475569; line-height: 1.6;">
              Precisamos que você preencha o formulário DS-160 para dar continuidade ao seu processo de visto americano.
            </p>
            <p style="font-size: 14px; color: #475569; line-height: 1.6;">
              Clique no botão abaixo para acessar o formulário. Você pode salvar e continuar a qualquer momento.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${formLink}" style="background: #0D1B2A; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;">
                Preencher Formulário
              </a>
            </div>
            <p style="font-size: 12px; color: #94a3b8; text-align: center;">
              Ou copie e cole este link no navegador:<br/>
              <a href="${formLink}" style="color: #3b82f6; word-break: break-all;">${formLink}</a>
            </p>
          </div>
          <div style="background: #f8fafc; padding: 16px; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none; text-align: center;">
            <p style="font-size: 11px; color: #94a3b8; margin: 0;">Este é um email automático. Em caso de dúvidas, entre em contato com a agência.</p>
          </div>
        </div>
      `,
    });

    console.log(`DS-160 email sent successfully to: ${to}`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('DS-160 email error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Erro ao enviar email' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
