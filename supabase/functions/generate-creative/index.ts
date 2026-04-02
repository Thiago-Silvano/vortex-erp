import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { promotion, style = "premium", format = "1:1" } = await req.json();

    if (!promotion) {
      return new Response(JSON.stringify({ error: "promotion data required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const services: string[] = [];
    if (promotion.included_tickets) services.push("Ingressos");
    if (promotion.included_tours) services.push("Passeios");
    if (promotion.included_guide) services.push("Guia turístico");
    if (promotion.included_transfer) services.push("Transfer");
    if (promotion.included_train) services.push("Trem");

    const styleGuides: Record<string, string> = {
      premium: "Cores: dourado (#d4af37) e branco sobre fundo escuro. Fontes elegantes tipo serif para título. Espaçamento generoso. Sombra suave nos textos.",
      oferta: "Cores: vermelho (#ff4444) e amarelo (#ffcc00) vibrantes. Selo de desconto. Fonte bold impactante. Urgência visual.",
      emocional: "Cores: rosa (#ff6b9d) e tons pastel. Fontes suaves e arredondadas. Muito espaço para a imagem. Texto minimalista.",
      minimalista: "Cores: preto (#333) e branco. Máximo 3 elementos de texto. Fonte sans-serif fina. Muito espaço em branco.",
      familia: "Cores: turquesa (#4ecdc4) e laranja (#ff6b35). Ícones divertidos. Fonte amigável e arredondada.",
      economico: "Cores: verde (#2ecc71) e azul (#3498db). Destaque no preço. Selo de economia. Fonte moderna e limpa.",
    };

    const prompt = `Você é um designer de marketing de viagens. Gere um layout de criativo para a seguinte promoção:

DADOS DA PROMOÇÃO:
- Destino: ${promotion.destination_name}, ${promotion.destination_country}
- Acomodação: ${promotion.accommodation_type}
- Noites: ${promotion.nights}
- Período: ${promotion.period_text || "Consulte disponibilidade"}
- Voo: ${promotion.airport_origin} → ${promotion.airport_destination}
- Parcelas: ${promotion.installments}x R$ ${Number(promotion.installment_value || 0).toFixed(2)}
- Total: R$ ${Number(promotion.total_value || 0).toFixed(2)}
- Serviços: ${services.join(", ") || "Nenhum adicional"}

FORMATO: ${format === "9:16" ? "Story (vertical)" : format === "1:1" ? "Feed (quadrado)" : "Banner (horizontal)"}
ESTILO: ${style} - ${styleGuides[style] || styleGuides.premium}

Retorne APENAS um JSON válido (sem markdown) com esta estrutura exata:
{
  "bgColor": "#hex",
  "elements": [
    {
      "type": "text",
      "content": "texto do elemento",
      "x": 50,
      "y": 15,
      "fontSize": 48,
      "fontFamily": "Inter",
      "fontWeight": "700",
      "color": "#hex",
      "textAlign": "center",
      "letterSpacing": 0,
      "lineHeight": 1.2,
      "textTransform": "none",
      "opacity": 1,
      "width": 80
    }
  ]
}

REGRAS:
- x e y são porcentagens (0-100) do canvas
- width é porcentagem do canvas
- Inclua entre 6 e 10 elementos de texto
- Elemento 1: Nome do destino (grande, destaque)
- Elemento 2: País ou subtítulo
- Elemento 3: Informações do hotel/noites
- Elemento 4: Preço por parcela (grande, cor de destaque)
- Elemento 5: Texto de parcelamento
- Elemento 6: Info do voo
- Elemento 7: Serviços inclusos (se houver)
- Elemento 8: CTA (botão/chamada para ação)
- Use fontFamily entre: Inter, Montserrat, Playfair Display, Oswald, Poppins
- Distribua verticalmente os elementos de forma harmônica`;

    // Use Lovable AI proxy
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.8,
        max_tokens: 2000,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", errText);
      return new Response(JSON.stringify({ error: "Erro ao gerar layout com IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // Extract JSON from response
    let layout;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        layout = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found");
      }
    } catch {
      console.error("Failed to parse AI response:", content);
      return new Response(JSON.stringify({ error: "Resposta da IA inválida" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ layout }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
