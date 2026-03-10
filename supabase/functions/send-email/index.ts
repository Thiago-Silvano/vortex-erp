import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const { empresa_id, email_id, test, to } = body;

    // Get SMTP settings for the company
    const { data: settings, error: settErr } = await supabase
      .from("email_settings")
      .select("*")
      .eq("empresa_id", empresa_id)
      .single();

    if (settErr || !settings) {
      return new Response(
        JSON.stringify({ error: "Configurações SMTP não encontradas" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const {
      smtp_host, smtp_port, smtp_user, smtp_password, smtp_ssl,
      from_name, from_email,
    } = settings as any;

    if (!smtp_host || !smtp_user || !smtp_password) {
      return new Response(
        JSON.stringify({ error: "Configurações SMTP incompletas" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize SMTP client
    const client = new SMTPClient({
      connection: {
        hostname: smtp_host,
        port: smtp_port || 587,
        tls: smtp_ssl !== false,
        auth: {
          username: smtp_user,
          password: smtp_password,
        },
      },
    });

    // Test mode
    if (test) {
      await client.send({
        from: `${from_name} <${from_email || smtp_user}>`,
        to: to || from_email || smtp_user,
        subject: "✅ Teste de Email - ERP Vortex",
        content: "auto",
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2 style="color: #0D1B2A;">Teste de Email</h2>
            <p>Este é um email de teste enviado pelo ERP da Vortex.</p>
            <p>Se você recebeu esta mensagem, a configuração SMTP está funcionando corretamente! ✅</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 12px;">Enviado automaticamente pelo sistema.</p>
          </div>
        `,
      });
      await client.close();
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normal send mode - get email from database
    if (!email_id) {
      return new Response(
        JSON.stringify({ error: "email_id obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: emailData, error: emailErr } = await supabase
      .from("emails")
      .select("*")
      .eq("id", email_id)
      .single();

    if (emailErr || !emailData) {
      return new Response(
        JSON.stringify({ error: "Email não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const email = emailData as any;

    // Build tracking pixel
    const trackingPixel = email.tracking_id
      ? `<img src="${supabaseUrl}/functions/v1/email-tracking?id=${email.tracking_id}" width="1" height="1" style="display:none;" />`
      : "";

    const htmlBody = (email.body_html || email.body_text?.replace(/\n/g, "<br>") || "") + trackingPixel;

    const sendOpts: any = {
      from: `${from_name || "ERP"} <${from_email || smtp_user}>`,
      to: email.to_emails || [],
      subject: email.subject || "(sem assunto)",
      content: "auto",
      html: htmlBody,
    };

    if (email.cc_emails?.length) sendOpts.cc = email.cc_emails;
    if (email.bcc_emails?.length) sendOpts.bcc = email.bcc_emails;

    // Get attachments
    const { data: attachments } = await supabase
      .from("email_attachments")
      .select("*")
      .eq("email_id", email_id);

    // Note: denomailer supports attachments but we'd need to download them first
    // For now, we include attachment links in the email body
    if (attachments && attachments.length > 0) {
      let attachmentHtml = '<hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;"><p style="font-size: 12px; color: #666;">Anexos:</p><ul>';
      for (const att of attachments as any[]) {
        attachmentHtml += `<li><a href="${att.file_url}" target="_blank">${att.file_name}</a></li>`;
      }
      attachmentHtml += "</ul>";
      sendOpts.html += attachmentHtml;
    }

    await client.send(sendOpts);
    await client.close();

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("SMTP Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro ao enviar email" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
