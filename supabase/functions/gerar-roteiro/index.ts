import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ROTEIRO_SCHEMA = {
  type: "object",
  properties: {
    titulo: { type: "string" },
    subtitulo: { type: "string" },
    introducao: { type: "string" },
    hospedagens: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          tipo: { type: "string", enum: ["hotel", "pousada", "resort"] },
          nome: { type: "string" },
          categoria: { type: "string" },
          descricao: { type: "string" },
          diferenciais: { type: "array", items: { type: "string" } },
          localizacao: { type: "string" },
          precoEstimado: { type: "string" },
          recomendadoPara: { type: "string" },
        },
        required: ["id", "tipo", "nome", "categoria", "descricao", "diferenciais", "localizacao", "precoEstimado", "recomendadoPara"],
      },
    },
    passeios: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          tipo: { type: "string", enum: ["passeio", "experiencia", "gastronomia", "cultura", "aventura", "compras"] },
          nome: { type: "string" },
          descricao: { type: "string" },
          duracao: { type: "string" },
          diaRecomendado: { type: "number" },
          periodo: { type: "string", enum: ["manha", "tarde", "noite"] },
          precoEstimado: { type: "string" },
          nivelEsforco: { type: "string", enum: ["baixo", "medio", "alto"] },
        },
        required: ["id", "tipo", "nome", "descricao", "duracao", "precoEstimado"],
      },
    },
    logistica: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          tipo: { type: "string", enum: ["transfer", "carro", "van", "onibus", "barco"] },
          descricao: { type: "string" },
          origem: { type: "string" },
          destino: { type: "string" },
          precoEstimado: { type: "string" },
        },
        required: ["id", "tipo", "descricao", "origem", "destino", "precoEstimado"],
      },
    },
    gastronomia: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          nome: { type: "string" },
          tipo: { type: "string" },
          descricao: { type: "string" },
          especialidade: { type: "string" },
          faixaPreco: { type: "string" },
        },
        required: ["id", "nome", "tipo", "descricao", "especialidade", "faixaPreco"],
      },
    },
    infoPratica: {
      type: "object",
      properties: {
        clima: { type: "string" },
        melhorEpoca: { type: "string" },
        moeda: { type: "string" },
        idioma: { type: "string" },
        documentos: { type: "string" },
        fusoHorario: { type: "string" },
        dicasGerais: { type: "array", items: { type: "string" } },
      },
      required: ["clima", "melhorEpoca", "moeda", "idioma", "documentos", "fusoHorario", "dicasGerais"],
    },
    roteiroDiario: {
      type: "array",
      items: {
        type: "object",
        properties: {
          dia: { type: "number" },
          titulo: { type: "string" },
          descricao: { type: "string" },
          sugestoes: { type: "array", items: { type: "string" } },
        },
        required: ["dia", "titulo", "descricao", "sugestoes"],
      },
    },
  },
  required: ["titulo", "subtitulo", "introducao", "hospedagens", "passeios", "logistica", "gastronomia", "infoPratica", "roteiroDiario"],
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const form = await req.json();

    const userPrompt = `Você é um consultor de viagens premium brasileiro com 20 anos de experiência. Crie um roteiro de viagem COMPLETO, RICO e COMERCIALMENTE ATRAENTE com múltiplas opções.

DADOS DA VIAGEM:
- Destino principal: ${form.destinoPrincipal}
- Paradas/cidades: ${form.paradasSecundarias || "apenas destino principal"}
- Período: ${form.numDias} dias (${form.dataInicio} a ${form.dataFim})
- Passageiros: ${form.numPassageiros} (${form.perfilViajante})
${form.idadesCriancas ? `- Crianças: ${form.idadesCriancas} anos` : ""}
- Hotel desejado: ${form.categoriaHotel}
${form.precoHotelMin ? `- Faixa hotel: R$ ${form.precoHotelMin}–${form.precoHotelMax}/noite` : ""}
- Interesses: ${(form.interesses || []).join(", ")}
- Ritmo: ${form.ritmoViagem}
- Observações: ${form.observacoes || "nenhuma"}

INSTRUÇÕES:
1. Hospedagens: 3-4 opções reais/verossímeis, cada uma com perfil diferente.
2. Passeios: 10-14 opções variadas cobrindo todos os dias, manhã/tarde/noite.
3. Logística: 2-3 opções de deslocamento.
4. Gastronomia: 6-8 restaurantes/experiências reais do destino.
5. Roteiro diário: narrativa dia a dia para todos os ${form.numDias} dias.
6. Escreva em português, tom elegante e comercial.
7. Preços devem ser estimativas realistas para o destino.
8. IDs únicos: hospedagens h1..hN, passeios p1..pN, logística l1..lN, gastronomia g1..gN.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: "Você é um consultor sênior de viagens premium. Sempre retorne dados estruturados via tool calling." },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "emit_roteiro",
              description: "Emite o roteiro premium completo no formato estruturado.",
              parameters: ROTEIRO_SCHEMA,
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "emit_roteiro" } },
      }),
    });

    if (!aiResponse.ok) {
      const text = await aiResponse.text();
      console.error("AI gateway error", aiResponse.status, text);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em instantes." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos do AI esgotados. Adicione créditos em Settings > Workspace > Usage." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Falha ao gerar roteiro." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResponse.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("No tool call returned", JSON.stringify(data).slice(0, 500));
      return new Response(JSON.stringify({ error: "AI não retornou dados estruturados." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const roteiro = JSON.parse(toolCall.function.arguments);

    // Marcar todos como não selecionados
    roteiro.hospedagens = (roteiro.hospedagens || []).map((h: any) => ({ ...h, selecionado: false }));
    roteiro.passeios = (roteiro.passeios || []).map((p: any) => ({ ...p, selecionado: false }));
    roteiro.logistica = (roteiro.logistica || []).map((l: any) => ({ ...l, selecionado: false }));
    roteiro.gastronomia = (roteiro.gastronomia || []).map((g: any) => ({ ...g, selecionado: false }));

    return new Response(JSON.stringify({ roteiro }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("gerar-roteiro error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});