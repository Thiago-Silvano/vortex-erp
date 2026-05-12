import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function sendWhatsAppMessage(serverUrl: string, empresaId: string, phone: string, message: string) {
  const url = `${serverUrl.replace(/\/$/, '')}/send-message`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ empresa_id: empresaId, number: phone, message }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`WhatsApp send failed [${res.status}]: ${txt}`);
  }
  return res.json().catch(() => ({}));
}

function applyTemplate(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? '');
}

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

    const { data: companies } = await supabase.from("companies").select("id");
    if (!companies?.length) {
      return new Response(JSON.stringify({ message: "No companies", sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    for (const company of companies) {
      const empresaId = company.id;

      const { data: waSettings } = await supabase
        .from("whatsapp_settings")
        .select("*")
        .eq("empresa_id", empresaId)
        .maybeSingle();

      if (!waSettings?.reminder_enabled) continue;
      if (!waSettings.reminder_phone || !waSettings.server_url || waSettings.server_url.includes('localhost')) continue;

      const { data: reservations } = await supabase
        .from("reservations")
        .select("*")
        .eq("empresa_id", empresaId)
        .eq("status", "pending")
        .not("check_in", "is", null);

      if (!reservations?.length) continue;

      for (const reservation of reservations) {
        const checkInDate = new Date(reservation.check_in + "T12:00:00");
        const hoursUntilCheckIn = (checkInDate.getTime() - now.getTime()) / (1000 * 60 * 60);

        const { data: sentReminders } = await supabase
          .from("reservation_reminders")
          .select("reminder_type")
          .eq("reservation_id", reservation.id);

        const sentTypes = new Set((sentReminders || []).map((r: any) => r.reminder_type));

        let reminderType: string | null = null;
        let template = '';

        if (hoursUntilCheckIn <= 0) {
          if (!sentTypes.has("missed_checkin")) {
            reminderType = "missed_checkin";
            template = waSettings.reminder_template_missed || '';
          }
        } else if (hoursUntilCheckIn <= 2) {
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
            template = waSettings.reminder_template_urgent || '';
          }
        } else if (hoursUntilCheckIn <= 10 && !sentTypes.has("reminder_10h")) {
          reminderType = "reminder_10h";
          template = waSettings.reminder_template_10h || '';
        } else if (hoursUntilCheckIn <= 24 && !sentTypes.has("reminder_24h")) {
          reminderType = "reminder_24h";
          template = waSettings.reminder_template_24h || '';
        } else if (hoursUntilCheckIn <= 48 && !sentTypes.has("reminder_48h")) {
          reminderType = "reminder_48h";
          template = waSettings.reminder_template_48h || '';
        }

        if (reminderType && template) {
          const message = applyTemplate(template, {
            descricao: reservation.description || 'Reserva',
            localizador: reservation.confirmation_code || 'N/A',
            checkin: new Date(reservation.check_in + "T12:00:00").toLocaleDateString("pt-BR"),
          });

          try {
            await sendWhatsAppMessage(waSettings.server_url, empresaId, waSettings.reminder_phone, message);
            await supabase.from("reservation_reminders").insert({
              reservation_id: reservation.id,
              empresa_id: empresaId,
              reminder_type: reminderType,
            });
            totalSent++;
            console.log(`Sent WA reminder [${reminderType}] for reservation ${reservation.id}`);
          } catch (err: any) {
            console.error(`Failed WA reminder for reservation ${reservation.id}:`, err.message);
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
