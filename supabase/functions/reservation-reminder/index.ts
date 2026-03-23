import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer";

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

    const now = new Date();
    let totalSent = 0;

    // Get all companies that have reservations
    const { data: companies } = await supabase
      .from("companies")
      .select("id");

    if (!companies || companies.length === 0) {
      return new Response(JSON.stringify({ message: "No companies found", sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    for (const company of companies) {
      const empresaId = company.id;

      // Get SMTP settings for this company (contract_email_settings first, then email_settings)
      let smtpSettings: any = null;
      const { data: contractSettings } = await supabase
        .from("contract_email_settings")
        .select("*")
        .eq("empresa_id", empresaId)
        .maybeSingle();

      if (contractSettings?.smtp_host && contractSettings?.smtp_user && contractSettings?.smtp_password) {
        smtpSettings = contractSettings;
      }

      if (!smtpSettings) {
        const { data: emailSettings } = await supabase
          .from("email_settings")
          .select("*")
          .eq("empresa_id", empresaId)
          .limit(1)
          .maybeSingle();
        if (emailSettings?.smtp_host && emailSettings?.smtp_user && emailSettings?.smtp_password) {
          smtpSettings = emailSettings;
        }
      }

      if (!smtpSettings) continue;

      // Get pending reservations with check_in within next 48 hours or already past
      const { data: reservations } = await supabase
        .from("reservations")
        .select("*")
        .eq("empresa_id", empresaId)
        .eq("status", "pending")
        .not("check_in", "is", null);

      if (!reservations || reservations.length === 0) continue;

      // Build transporter
      const port = smtpSettings.smtp_port || 587;
      const transporter = nodemailer.createTransport({
        host: smtpSettings.smtp_host,
        port,
        secure: port === 465,
        auth: { user: smtpSettings.smtp_user, pass: smtpSettings.smtp_password },
      });

      const senderAddress = `${smtpSettings.from_name || "ERP Vortex"} <${smtpSettings.from_email || smtpSettings.smtp_user}>`;
      const recipientEmail = smtpSettings.from_email || smtpSettings.smtp_user;

      for (const reservation of reservations) {
        // check_in is a date string (YYYY-MM-DD), assume check-in at 12:00 local
        const checkInDate = new Date(reservation.check_in + "T12:00:00");
        const hoursUntilCheckIn = (checkInDate.getTime() - now.getTime()) / (1000 * 60 * 60);

        // Get already sent reminders for this reservation
        const { data: sentReminders } = await supabase
          .from("reservation_reminders")
          .select("reminder_type")
          .eq("reservation_id", reservation.id);

        const sentTypes = new Set((sentReminders || []).map((r: any) => r.reminder_type));

        let reminderType: string | null = null;
        let subject = "";
        let bodyHtml = "";

        const desc = reservation.description || "Reserva";
        const code = reservation.confirmation_code || "N/A";
        const checkInFormatted = reservation.check_in
          ? new Date(reservation.check_in + "T12:00:00").toLocaleDateString("pt-BR")
          : "-";

        // Check-in already passed
        if (hoursUntilCheckIn <= 0) {
          if (!sentTypes.has("missed_checkin")) {
            reminderType = "missed_checkin";
            subject = `⚠️ Check-in NÃO realizado: ${desc}`;
            bodyHtml = buildEmail(
              "Check-in Não Realizado",
              `A reserva <strong>${desc}</strong> (Localizador: ${code}) tinha check-in previsto para <strong>${checkInFormatted}</strong> e o status ainda não foi atualizado para "Confirmada".`,
              "Por favor, verifique urgentemente o status desta reserva.",
              "#dc2626"
            );
          }
        }
        // Within 2 hours
        else if (hoursUntilCheckIn <= 2) {
          const urgentKey = `urgent_${Math.floor(hoursUntilCheckIn / 2)}`;
          // Send every 2 hours - check if any urgent was sent in last 1.5 hours
          const { data: recentUrgent } = await supabase
            .from("reservation_reminders")
            .select("sent_at")
            .eq("reservation_id", reservation.id)
            .like("reminder_type", "urgent_%")
            .order("sent_at", { ascending: false })
            .limit(1);

          const lastUrgentSent = recentUrgent?.[0]?.sent_at;
          const hoursSinceLastUrgent = lastUrgentSent
            ? (now.getTime() - new Date(lastUrgentSent).getTime()) / (1000 * 60 * 60)
            : 999;

          if (hoursSinceLastUrgent >= 1.5) {
            reminderType = `urgent_${now.getTime()}`;
            subject = `🚨 URGENTE - Check-in em menos de 2h: ${desc}`;
            bodyHtml = buildEmail(
              "Lembrete URGENTE de Check-in",
              `A reserva <strong>${desc}</strong> (Localizador: ${code}) tem check-in previsto para <strong>${checkInFormatted}</strong> e faltam menos de 2 horas!`,
              "Atualize o status da reserva para 'Confirmada' assim que possível.",
              "#dc2626"
            );
          }
        }
        // Within 10 hours
        else if (hoursUntilCheckIn <= 10 && !sentTypes.has("reminder_10h")) {
          reminderType = "reminder_10h";
          subject = `⏰ Lembrete: Check-in em menos de 10h - ${desc}`;
          bodyHtml = buildEmail(
            "Lembrete de Check-in - 10 horas",
            `A reserva <strong>${desc}</strong> (Localizador: ${code}) tem check-in previsto para <strong>${checkInFormatted}</strong>.`,
            "Faltam menos de 10 horas. Verifique se tudo está em ordem.",
            "#f59e0b"
          );
        }
        // Within 24 hours
        else if (hoursUntilCheckIn <= 24 && !sentTypes.has("reminder_24h")) {
          reminderType = "reminder_24h";
          subject = `📋 Lembrete: Check-in amanhã - ${desc}`;
          bodyHtml = buildEmail(
            "Lembrete de Check-in - 24 horas",
            `A reserva <strong>${desc}</strong> (Localizador: ${code}) tem check-in previsto para <strong>${checkInFormatted}</strong>.`,
            "Faltam menos de 24 horas para o check-in. Confirme o status da reserva.",
            "#f59e0b"
          );
        }
        // Within 48 hours
        else if (hoursUntilCheckIn <= 48 && !sentTypes.has("reminder_48h")) {
          reminderType = "reminder_48h";
          subject = `📅 Lembrete: Check-in em 2 dias - ${desc}`;
          bodyHtml = buildEmail(
            "Lembrete de Check-in - 48 horas",
            `A reserva <strong>${desc}</strong> (Localizador: ${code}) tem check-in previsto para <strong>${checkInFormatted}</strong>.`,
            "Faltam 2 dias para o check-in. Acompanhe a reserva.",
            "#3b82f6"
          );
        }

        // Send the email if a reminder type was determined
        if (reminderType && bodyHtml) {
          try {
            await transporter.sendMail({
              from: senderAddress,
              to: recipientEmail,
              subject,
              html: bodyHtml,
            });

            await supabase.from("reservation_reminders").insert({
              reservation_id: reservation.id,
              empresa_id: empresaId,
              reminder_type: reminderType,
            });

            totalSent++;
            console.log(`Sent reminder [${reminderType}] for reservation ${reservation.id}`);
          } catch (emailErr: any) {
            console.error(`Failed to send reminder for reservation ${reservation.id}:`, emailErr.message);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent: totalSent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Reservation reminder error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildEmail(title: string, message: string, action: string, accentColor: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: ${accentColor}; color: white; padding: 15px 20px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0; font-size: 18px;">${title}</h2>
      </div>
      <div style="border: 1px solid #e5e7eb; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
        <p style="font-size: 14px; color: #374151; line-height: 1.6; margin: 0 0 15px;">${message}</p>
        <p style="font-size: 14px; color: #374151; line-height: 1.6; margin: 0 0 15px; font-weight: bold;">${action}</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="font-size: 11px; color: #9ca3af; margin: 0;">Enviado automaticamente pelo ERP Vortex.</p>
      </div>
    </div>
  `;
}
