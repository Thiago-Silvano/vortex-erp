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
          cidade: { type: "string", description: "Cidade onde a hospedagem está localizada (apenas o nome da cidade)." },
          enderecoCompleto: { type: "string", description: "Endereço completo (rua, número, bairro, cidade, país) usado para Google Maps." },
          nomeOficial: { type: "string", description: "Nome oficial exato do hotel para busca em Google Maps e TripAdvisor." },
          precoEstimado: { type: "string" },
          recomendadoPara: { type: "string" },
        },
          required: ["id", "tipo", "nome", "categoria", "descricao", "diferenciais", "localizacao", "cidade", "enderecoCompleto", "nomeOficial", "precoEstimado", "recomendadoPara"],
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
          cidade: { type: "string", description: "Cidade onde o passeio acontece (apenas o nome da cidade, sem estado/país)." },
          diaRecomendado: { type: "number" },
          periodo: { type: "string", enum: ["manha", "tarde", "noite"] },
          precoEstimado: { type: "string" },
          nivelEsforco: { type: "string", enum: ["baixo", "medio", "alto"] },
        },
        required: ["id", "tipo", "nome", "descricao", "duracao", "cidade", "precoEstimado"],
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
          cidade: { type: "string", description: "Cidade onde o restaurante/experiência gastronômica está." },
        },
        required: ["id", "nome", "tipo", "descricao", "especialidade", "faixaPreco", "cidade"],
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
${Array.isArray(form.cidadesDias) && form.cidadesDias.length > 0
  ? `- Distribuição de cidades (RESPEITE EXATAMENTE a ordem e a quantidade de dias):\n${form.cidadesDias
      .filter((c: any) => c?.cidade)
      .map((c: any, i: number) =>
        c.stopLogistico
          ? `   ${i + 1}. ${c.cidade}: ${c.dias} dia(s) — STOP LOGÍSTICO (parada estratégica entre a cidade anterior e a próxima; INCLUI hospedagem e conta os dias normalmente).`
          : `   ${i + 1}. ${c.cidade}: ${c.dias} dia(s)`)
      .join("\n")}
  → Para cidades marcadas como STOP LOGÍSTICO:
     • Trate-a como uma parada intermediária estratégica entre a cidade anterior e a próxima — o passageiro PERNOITA na cidade, então SUGIRA hospedagem (preferência por hotéis próximos ao terminal/centro para facilitar a conexão seguinte).
     • Os dias informados CONTAM no total da viagem e devem aparecer no roteiro diário como dias regulares (com programação leve/compatível com o tempo de trânsito).
     • Escolha o tipo de logística mais viável de chegada e saída (avião, trem rápido, ônibus rodoviário, ferry, transfer) considerando distância, horários reais e viabilidade.
     • Inclua na seção "logistica" os trechos: cidade anterior → cidade-stop e cidade-stop → cidade seguinte, com horários aproximados.
     • A programação diária deve priorizar 1-2 atrações próximas e tempo de descanso/conexão.
  → Para as demais cidades, os dias do roteiro diário devem seguir exatamente a ordem e quantidade indicadas. Inclua transfers entre as cidades nos dias de troca.`
  : ""}
- Passageiros: ${form.numPassageiros} (${form.perfilViajante})
${form.idadesCriancas ? `- Crianças: ${form.idadesCriancas} anos` : ""}
- Hotel desejado: ${form.categoriaHotel}
${form.precoHotelMin ? `- Faixa hotel: R$ ${form.precoHotelMin}–${form.precoHotelMax}/noite` : ""}
- Interesses: ${(form.interesses || []).join(", ")}
- Ritmo: ${form.ritmoViagem}
${form.aeroportoOrigem ? `- Aeroporto de ORIGEM (embarque inicial do passageiro): ${form.aeroportoOrigem} (use como ponto de partida da viagem; considere voos saindo deste aeroporto até o aeroporto de chegada).` : ""}
${form.aeroportoChegada ? `- Aeroporto de CHEGADA: ${form.aeroportoChegada} (use este aeroporto como ponto de entrada — sugira transfers a partir dele e considere a localização nas hospedagens do dia 1).` : ""}
${form.aeroportoSaida ? `- Aeroporto de SAÍDA: ${form.aeroportoSaida} (programe transfer/logística para este aeroporto no último dia).` : ""}
- Observações: ${form.observacoes || "nenhuma"}

INSTRUÇÕES:
1. Hospedagens: 3-4 opções reais/verossímeis, cada uma com perfil diferente.
   - Para CADA hotel preencha "enderecoCompleto" (rua, bairro, cidade, país) e "nomeOficial" (nome exato como aparece no Google Maps / TripAdvisor).
   - Para CADA hotel preencha também "cidade" com APENAS o nome da cidade (sem estado/país).
2. Passeios: 10-14 opções variadas cobrindo todos os dias, manhã/tarde/noite.
   - Para CADA passeio preencha "cidade" com APENAS o nome da cidade onde o passeio acontece (sem estado/país). Isso é OBRIGATÓRIO em roteiros multi-cidade.
3. Logística: 2-3 opções de deslocamento.
   - SE aeroportos foram informados, inclua obrigatoriamente:
     a) Transfer aeroporto de chegada → primeira hospedagem (origem = código IATA + nome do aeroporto).
     b) Transfer última hospedagem → aeroporto de saída.
   - Cite os códigos IATA explicitamente em "origem" e "destino".
4. Gastronomia: 6-8 restaurantes/experiências reais do destino.
   - Para CADA item preencha "cidade" com APENAS o nome da cidade.
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