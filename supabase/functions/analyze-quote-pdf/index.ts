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

IMPORTANT RULES FOR FLIGHTS / AIR TICKETS:
- Group ALL flight segments (legs) into a SINGLE service item with service_type "Passagem aérea" (or best match from catalog).
- Extract EACH flight leg/segment separately in the "flight_legs" array.
- For each leg include: origin (airport code like GRU, FLN, MIA), destination (airport code), departure_date (YYYY-MM-DD), departure_time (HH:MM), arrival_date (YYYY-MM-DD), arrival_time (HH:MM), airline, flight_number, direction ("ida" for outbound, "volta" for return).
- Calculate connection_duration between consecutive legs of the same direction (format: "Xh Ymin").
- Calculate total_travel_duration for each direction (format: "Xh Ymin").
- The description should summarize the full itinerary, e.g. "FLN → GRU → MIA | LATAM | 15/03 - 22/03".
- The cost_price should be the TOTAL price for all flights combined.

RULES FOR BAGGAGE:
- If baggage info is found, include it in "baggage" object with fields: personal_item (number of items), carry_on (number), checked_bag (number).

FOR OTHER SERVICES (hotels, car rentals, insurance, transfers, tours, cruises, experiences):
- Each service is a separate item.
- Extract: service_type, description, cost_price, quantity, start_date (YYYY-MM-DD), end_date (YYYY-MM-DD), location, supplier, details.

Also extract general trip info:
- client_name: passenger/client name if found
- origin: departure city/airport
- destination: arrival city/destination  
- departure_date: departure date (YYYY-MM-DD)
- return_date: return date (YYYY-MM-DD)
- passengers: number of passengers if found

Return ONLY valid JSON in this exact format:
{
  "trip_info": {
    "client_name": "",
    "origin": "",
    "destination": "",
    "departure_date": "",
    "return_date": "",
    "passengers": 1
  },
  "services": [
    {
      "service_type": "category name",
      "description": "detailed description",
      "cost_price": 0,
      "quantity": 1,
      "start_date": "",
      "end_date": "",
      "location": "",
      "supplier": "",
      "details": "additional info",
      "flight_legs": [
        {
          "origin": "FLN",
          "destination": "GRU",
          "departure_date": "2026-03-15",
          "departure_time": "10:30",
          "arrival_date": "2026-03-15",
          "arrival_time": "11:45",
          "airline": "LATAM",
          "flight_number": "LA3456",
          "direction": "ida",
          "connection_duration": ""
        }
      ],
      "baggage": {
        "personal_item": 1,
        "carry_on": 1,
        "checked_bag": 1
      },
      "total_travel_duration_outbound": "",
      "total_travel_duration_return": ""
    }
  ]
}

Notes:
- flight_legs and baggage should ONLY be present for flight/air ticket services. Omit for other service types.
- If you cannot read certain values, leave them empty or 0.
- Prices should be numbers without currency symbols.
- Always try your best to extract every service found.`;

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
                text: "Analyze this PDF document from a travel supplier. Extract all services with detailed flight itineraries, hotel info, car rentals, insurance, transfers, tours. Group all flight legs into one service. Return the structured JSON as specified."
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

    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1].trim();
    
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
