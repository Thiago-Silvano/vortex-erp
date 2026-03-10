import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
    const { user_id, empresa_id, email_id, test, to } = body;

    // Support both user_id (new) and empresa_id (legacy) lookups
    let settings: any = null;

    if (user_id) {
      const { data, error } = await supabase
        .from("email_settings")
        .select("*")
        .eq("user_id", user_id)
        .single();
      if (!error && data) settings = data;
    }

    // Fallback to empresa_id lookup for backwards compat
    if (!settings && empresa_id) {
      const { data, error } = await supabase
        .from("email_settings")
        .select("*")
        .eq("empresa_id", empresa_id)
        .maybeSingle();
      if (!error && data) settings = data;
    }

    if (!settings) {
      return new Response(
        JSON.stringify({ error: "Configurações SMTP não encontradas. Configure seu email em Configurações → Email." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const {
      smtp_host, smtp_port, smtp_user, smtp_password, smtp_ssl,
      from_name, from_email,
    } = settings;

    if (!smtp_host || !smtp_user || !smtp_password) {
      return new Response(
        JSON.stringify({ error: "Configurações SMTP incompletas" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const port = smtp_port || 587;
    const transporter = nodemailer.createTransport({
      host: smtp_host,
      port,
      secure: port === 465,
      auth: {
        user: smtp_user,
        pass: smtp_password,
      },
    });

    const senderAddress = `${from_name || "ERP"} <${from_email || smtp_user}>`;

    // Test mode
    if (test) {
      await transporter.sendMail({
        from: senderAddress,
        to: to || from_email || smtp_user,
        subject: "✅ Teste de Email - ERP Vortex",
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
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normal send mode
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

    const mailOptions: any = {
      from: senderAddress,
      to: Array.isArray(email.to_emails) ? email.to_emails.join(", ") : email.to_emails,
      subject: email.subject || "(sem assunto)",
      html: htmlBody,
    };

    if (email.cc_emails?.length) mailOptions.cc = email.cc_emails.join(", ");
    if (email.bcc_emails?.length) mailOptions.bcc = email.bcc_emails.join(", ");

    // Get attachments
    const { data: attachments } = await supabase
      .from("email_attachments")
      .select("*")
      .eq("email_id", email_id);

    if (attachments && attachments.length > 0) {
      let attachmentHtml = '<hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;"><p style="font-size: 12px; color: #666;">Anexos:</p><ul>';
      for (const att of attachments as any[]) {
        attachmentHtml += `<li><a href="${att.file_url}" target="_blank">${att.file_name}</a></li>`;
      }
      attachmentHtml += "</ul>";
      mailOptions.html += attachmentHtml;
    }

    await transporter.sendMail(mailOptions);

    // Update email status
    await supabase.from("emails").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", email_id);

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
