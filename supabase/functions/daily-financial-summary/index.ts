import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VIAGENS_ID = "0dd6a20e-4804-4925-b910-d2f3978ee898";
const VISTOS_ID = "7c4e00d2-1dbd-4bd3-88e3-11ffd15e3f6d";
const SENDER_EMPRESA_ID = VIAGENS_ID; // server porta 3001
const DEFAULT_NUMBERS = ["5548991165568", "5548992008820", "5548998149109", "5548991934420"];

const DEFAULT_TEMPLATE =
`📊 *RESUMO FINANCEIRO DIÁRIO*
🗓️ Referente a: *{data}*

✈️ *VORTEX VIAGENS*
💰 Vendido ({data}): *{viagens_total}*
📈 Lucro Bruto: *{viagens_lucro}*
🧾 Qtd. de Vendas: *{viagens_qtd}*
📅 Total no mês ({mes}): *{viagens_mes}*

🛂 *VORTEX VISTOS*
💰 Vendido ({data}): *{vistos_total}*
📈 Lucro Bruto: *{vistos_lucro}*
🧾 Qtd. de Vendas: *{vistos_qtd}*
📅 Total no mês ({mes}): *{vistos_mes}*

━━━━━━━━━━━━━━━
🏆 *CONSOLIDADO {data}*
💵 Total Vendido: *{total_geral}*
💎 Lucro Bruto: *{lucro_geral}*
🧾 Total de Vendas: *{qtd_geral}*
📅 Mês: *{mes_geral}*

🤖 _Mensagem automática Vortex ERP_`;

function brl(n: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);
}

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

// Brazil "today" reference (UTC-3)
function brNow() {
  const now = new Date();
  return new Date(now.getTime() - 3 * 60 * 60 * 1000);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let body: any = {};
    if (req.method === "POST") {
      try { body = await req.json(); } catch { body = {}; }
    }
    const testPhone: string | undefined = body?.test_phone;
    const overrideTemplate: string | undefined = body?.template;
    const overrideRecipients: string[] | undefined = body?.recipients;

    const today = brNow();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yDate = ymd(yesterday);
    const monthStart = ymd(new Date(today.getFullYear(), today.getMonth(), 1));
    const monthEnd = ymd(today);

    async function viagensSummary(empresaId: string) {
      const { data: yest } = await supabase
        .from("sales")
        .select("total_sale, gross_profit")
        .eq("empresa_id", empresaId)
        .eq("status", "active")
        .eq("sale_date", yDate);
      const { data: month } = await supabase
        .from("sales")
        .select("total_sale")
        .eq("empresa_id", empresaId)
        .eq("status", "active")
        .gte("sale_date", monthStart)
        .lte("sale_date", monthEnd);
      const yTotal = (yest || []).reduce((s, r: any) => s + Number(r.total_sale || 0), 0);
      const yProfit = (yest || []).reduce((s, r: any) => s + Number(r.gross_profit || 0), 0);
      const yQty = (yest || []).length;
      const mTotal = (month || []).reduce((s, r: any) => s + Number(r.total_sale || 0), 0);
      return { yTotal, yProfit, yQty, mTotal };
    }

    async function vistosSummary(empresaId: string) {
      const { data: yest } = await supabase
        .from("visa_sales")
        .select("id, total_value")
        .eq("empresa_id", empresaId)
        .eq("status", "active")
        .eq("sale_date", yDate);
      const ids = (yest || []).map((s: any) => s.id);
      let supplierFees = 0;
      if (ids.length) {
        const { data: items } = await supabase
          .from("visa_sale_items")
          .select("visa_sale_id, total_value, is_supplier_fee")
          .in("visa_sale_id", ids)
          .eq("is_supplier_fee", true);
        supplierFees = (items || []).reduce((s, r: any) => s + Number(r.total_value || 0), 0);
      }
      const yTotal = (yest || []).reduce((s, r: any) => s + Number(r.total_value || 0), 0);
      const yProfit = yTotal - supplierFees;
      const yQty = (yest || []).length;
      const { data: month } = await supabase
        .from("visa_sales")
        .select("total_value")
        .eq("empresa_id", empresaId)
        .eq("status", "active")
        .gte("sale_date", monthStart)
        .lte("sale_date", monthEnd);
      const mTotal = (month || []).reduce((s, r: any) => s + Number(r.total_value || 0), 0);
      return { yTotal, yProfit, yQty, mTotal };
    }

    const viagens = await viagensSummary(VIAGENS_ID);
    const vistos = await vistosSummary(VISTOS_ID);

    const dataLabel = yesterday.toLocaleDateString("pt-BR");
    const mesLabel = today.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

    // Load saved config (template + recipients)
    const { data: cfg } = await supabase
      .from("financial_summary_config")
      .select("message_template, recipients")
      .eq("empresa_id", SENDER_EMPRESA_ID)
      .maybeSingle();

    const template = overrideTemplate ?? (cfg?.message_template?.trim() ? cfg!.message_template : DEFAULT_TEMPLATE);
    const savedRecipients: string[] = Array.isArray(cfg?.recipients)
      ? (cfg!.recipients as any[]).map((r: any) => typeof r === "string" ? r : r?.phone).filter(Boolean)
      : [];

    const vars: Record<string, string> = {
      data: dataLabel,
      mes: mesLabel,
      viagens_total: brl(viagens.yTotal),
      viagens_lucro: brl(viagens.yProfit),
      viagens_qtd: String(viagens.yQty),
      viagens_mes: brl(viagens.mTotal),
      vistos_total: brl(vistos.yTotal),
      vistos_lucro: brl(vistos.yProfit),
      vistos_qtd: String(vistos.yQty),
      vistos_mes: brl(vistos.mTotal),
      total_geral: brl(viagens.yTotal + vistos.yTotal),
      lucro_geral: brl(viagens.yProfit + vistos.yProfit),
      qtd_geral: String(viagens.yQty + vistos.yQty),
      mes_geral: brl(viagens.mTotal + vistos.mTotal),
    };
    const message = template.replace(/\{(\w+)\}/g, (_m, k) => vars[k] ?? `{${k}}`);

    const targets: string[] = testPhone
      ? [String(testPhone).replace(/\D/g, "")]
      : (overrideRecipients && overrideRecipients.length
          ? overrideRecipients.map(r => String(r).replace(/\D/g, ""))
          : (savedRecipients.length ? savedRecipients.map(r => String(r).replace(/\D/g, "")) : DEFAULT_NUMBERS));

    // Get sender server URL
    const { data: settings } = await supabase
      .from("whatsapp_settings")
      .select("server_url")
      .eq("empresa_id", SENDER_EMPRESA_ID)
      .maybeSingle();
    const serverUrl = (settings as any)?.server_url || "http://76.13.165.192:3001";

    const results: any[] = [];
    for (const num of targets) {
      try {
        const res = await fetch(`${serverUrl.replace(/\/$/, "")}/send-message`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            empresa_id: SENDER_EMPRESA_ID,
            phone: num,
            message,
          }),
          signal: AbortSignal.timeout(20000),
        });
        const text = await res.text();
        results.push({ phone: num, status: res.status, response: text.slice(0, 200) });
      } catch (e) {
        results.push({ phone: num, error: e instanceof Error ? e.message : String(e) });
      }
    }

    return new Response(
      JSON.stringify({ success: true, message, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});