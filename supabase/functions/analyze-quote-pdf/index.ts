import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { pdfBase64, serviceCatalog } = await req.json();
    if (!pdfBase64) throw new Error("No PDF data provided");

    const catalogList = (serviceCatalog || []).map((s: any) => s.name).join(", ");

    const systemPrompt = `You are a travel agency document analyzer. You receive PDFs from travel suppliers (airlines, hotels, car rentals, insurance, tour operators, etc.) and extract structured service information.

Your job is to identify every service/item in the document and return structured JSON.

Available service categories from the agency catalog: ${catalogList || "Passagem aérea, Hospedagem, Seguro viagem, Aluguel de carro, Traslado, Experiência, Outros"}

For each service found, extract:
- service_type: the best matching category from the catalog above
- description: detailed description (airline + route + dates for flights, hotel name + dates for hotels, etc.)
- cost_price: the price/cost found in the document (number only, no currency symbol)
- quantity: number of units (default 1)
- dates: any relevant dates found
- details: any additional details (flight numbers, room type, etc.)

Also extract general trip info if available:
- client_name: passenger/client name if found
- origin: departure city/airport
- destination: arrival city/destination
- departure_date: departure date (YYYY-MM-DD)
- return_date: return date (YYYY-MM-DD)

Return ONLY valid JSON in this exact format:
{
  "trip_info": {
    "client_name": "",
    "origin": "",
    "destination": "",
    "departure_date": "",
    "return_date": ""
  },
  "services": [
    {
      "service_type": "category name",
      "description": "detailed description",
      "cost_price": 0,
      "quantity": 1,
      "dates": "relevant dates",
      "details": "additional info"
    }
  ]
}

If you cannot read or identify certain values, leave them empty or 0. Always try your best to extract every service found in the document. Prices should be numbers without currency symbols.`;

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
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this PDF document from a travel supplier. Extract all services, prices, dates and trip information. Return the structured JSON as specified."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:application/pdf;base64,${pdfBase64}`
                }
              }
            ]
          }
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
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro ao analisar PDF" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Extract JSON from the response (handle markdown code blocks)
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1].trim();
    
    // Try to find JSON object directly
    const objMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (objMatch) jsonStr = objMatch[0];

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse AI response:", content);
      return new Response(JSON.stringify({ error: "Não foi possível interpretar o PDF. Tente com outro arquivo." }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-quote-pdf error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
