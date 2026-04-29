import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ENRICH_SCHEMA = {
  type: "object",
  properties: {
    servicos: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          tipo: { type: "string", enum: ["hotel", "transfer", "passeio", "ingresso", "seguro", "carro", "outros"] },
          nome: { type: "string" },
          descricao: { type: "string" },
          custo: { type: "number" },
          moeda: { type: "string" },
          fornecedor: { type: "string" },
          disponivel: { type: "boolean" },
          categoria: { type: "string" },
          numNoites: { type: "number" },
          custoTotal: { type: "number" },
        },
        required: ["id", "tipo", "nome", "descricao", "custo", "fornecedor"],
      },
    },
  },
  required: ["servicos"],
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY ausente" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { cotacao, hoteis, servicos, precoMin, precoMax, itensSugeridos } = await req.json();

    const userPrompt = `Você é um especialista em turismo. Analise os dados abaixo e organize uma lista de serviços para uma cotação de viagem.

COTAÇÃO:
- Destino: ${cotacao?.destino || ""}
- Período: ${cotacao?.dataInicio || ""} a ${cotacao?.dataFim || ""} (${cotacao?.numNoites || 0} noites)
- Passageiros: ${cotacao?.numPassageiros || 1}
${precoMin ? `- Preço mín. hotel: R$ ${precoMin}` : ""}
${precoMax ? `- Preço máx. hotel: R$ ${precoMax}` : ""}

HOTÉIS DOS FORNECEDORES (${(hoteis || []).length}): ${JSON.stringify((hoteis || []).slice(0, 30))}
SERVIÇOS DOS FORNECEDORES (${(servicos || []).length}): ${JSON.stringify((servicos || []).slice(0, 30))}

${itensSugeridos && itensSugeridos.length
  ? `ITENS PRIORITÁRIOS (vindos de roteiro pré-aprovado): ${JSON.stringify(itensSugeridos)}\nProcure cobrir TODOS estes itens com opções dos fornecedores.\n`
  : ""}

REGRAS:
1. Para hotéis: custoTotal = custo * numNoites.
2. Se os arrays de fornecedores estiverem vazios, gere 6-10 ESTIMATIVAS realistas para o destino com fornecedor "Estimativa".
3. Descrição máx. 100 caracteres, comercial e clara.
4. IDs únicos curtos (ex.: r1, r2, ...).
5. Inclua sempre pelo menos 2 hotéis, 2 transfers/passeios e 1 seguro.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Você é um curador de serviços de viagem. Sempre retorne dados via tool calling." },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "emit_servicos",
              description: "Emite a lista organizada de serviços de viagem.",
              parameters: ENRICH_SCHEMA,
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "emit_servicos" } },
      }),
    });

    if (!aiResponse.ok) {
      const t = await aiResponse.text();
      console.error("AI error", aiResponse.status, t);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit. Tente em instantes." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos esgotados." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Falha ao enriquecer." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResponse.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ servicos: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const parsed = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify({ servicos: parsed.servicos || [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("enrich error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "erro" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});