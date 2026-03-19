import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { type } = body;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let prompt = "";
    let systemPrompt = "Você é um especialista em turismo e viagens. Crie roteiros detalhados e práticos para viajantes.";

    if (type === "attraction_description") {
      const { attractionName, location } = body;
      if (!attractionName) {
        return new Response(JSON.stringify({ error: "attractionName is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      systemPrompt = "Você é um redator turístico premium. Escreva textos elegantes, inspiradores e informativos sobre atrações turísticas. Seja conciso mas envolvente.";
      prompt = `Escreva uma descrição turística curta e elegante (máximo 3 frases, cerca de 50-70 palavras) sobre "${attractionName}"${location ? ` em ${location}` : ''}.

A descrição deve:
- Ser fluida e inspiradora
- Destacar o que torna o lugar especial
- Usar linguagem comercial e sofisticada
- Ser adequada para um roteiro premium de viagem
- NÃO usar emojis
- Escrever em português do Brasil

Retorne apenas o texto da descrição, sem título ou formatação.`;
    } else {
      // Original itinerary generation
      const { city, totalDays, freeDays, aiTips } = body;
      if (!city || !totalDays) {
        return new Response(JSON.stringify({ error: "city and totalDays are required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const itineraryDays = Math.max(1, totalDays - (freeDays || 0));
      const tipsSection = aiTips ? `\n\nDicas e particularidades do viajante (IMPORTANTE - adapte o roteiro conforme estas instruções):\n${aiTips}` : '';
      prompt = `Crie um roteiro turístico detalhado para ${city} com ${itineraryDays} dia(s) de atividades.
${freeDays > 0 ? `O viajante terá ${freeDays} dia(s) livre(s) além desses ${itineraryDays} dias de roteiro.` : ''}${tipsSection}

Formato do roteiro:
- Para cada dia, liste as atividades com horários sugeridos (manhã, tarde, noite)
- Inclua pontos turísticos principais, restaurantes recomendados e dicas
- Use emojis para tornar visual
- Seja específico com nomes de lugares reais
- Escreva em português do Brasil
- Não use markdown headers (#), apenas texto simples com quebras de linha
- Formato: "Dia X - Título do dia" seguido das atividades`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro ao gerar conteúdo" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    if (type === "attraction_description") {
      return new Response(JSON.stringify({ success: true, description: content }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, itinerary: content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
