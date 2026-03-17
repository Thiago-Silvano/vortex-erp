import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Buffer } from "node:buffer";
import pdfParse from "npm:pdf-parse@1.1.1/lib/pdf-parse.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type ExtractedPdfResult = {
  text: string;
  pageCount: number;
  quality: "good" | "poor";
};

const extractionTool = {
  type: "function",
  function: {
    name: "extract_quote_data",
    description: "Extract structured trip and service information from a travel supplier quote or itinerary document.",
    parameters: {
      type: "object",
      properties: {
        trip_info: {
          type: "object",
          properties: {
            client_name: { type: "string" },
            origin: { type: "string" },
            destination: { type: "string" },
            departure_date: { type: "string" },
            return_date: { type: "string" },
            passengers: { type: "number" },
          },
          required: ["client_name", "origin", "destination", "departure_date", "return_date", "passengers"],
          additionalProperties: false,
        },
        services: {
          type: "array",
          items: {
            type: "object",
            properties: {
              service_type: { type: "string" },
              description: { type: "string" },
              cost_price: { type: "number" },
              quantity: { type: "number" },
              start_date: { type: "string" },
              end_date: { type: "string" },
              location: { type: "string" },
              supplier: { type: "string" },
              details: { type: "string" },
              flight_legs: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    origin: { type: "string" },
                    destination: { type: "string" },
                    departure_date: { type: "string" },
                    departure_time: { type: "string" },
                    arrival_date: { type: "string" },
                    arrival_time: { type: "string" },
                    airline: { type: "string" },
                    flight_number: { type: "string" },
                    direction: { type: "string", enum: ["ida", "volta"] },
                    connection_duration: { type: "string" },
                  },
                  required: [
                    "origin",
                    "destination",
                    "departure_date",
                    "departure_time",
                    "arrival_date",
                    "arrival_time",
                    "airline",
                    "flight_number",
                    "direction",
                    "connection_duration",
                  ],
                  additionalProperties: false,
                },
              },
              baggage: {
                type: "object",
                properties: {
                  personal_item: { type: "number" },
                  carry_on: { type: "number" },
                  checked_bag: { type: "number" },
                },
                required: ["personal_item", "carry_on", "checked_bag"],
                additionalProperties: false,
              },
              total_travel_duration_outbound: { type: "string" },
              total_travel_duration_return: { type: "string" },
            },
            required: [
              "service_type",
              "description",
              "cost_price",
              "quantity",
              "start_date",
              "end_date",
              "location",
              "supplier",
              "details",
            ],
            additionalProperties: false,
          },
        },
      },
      required: ["trip_info", "services"],
      additionalProperties: false,
    },
  },
};

function sanitizeExtractedText(text: string) {
  return text
    .replace(/\u0000/g, "")
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function extractPdfText(pdfBase64: string): Promise<ExtractedPdfResult> {
  try {
    const pdfBuffer = Buffer.from(pdfBase64, "base64");
    const parsed = await pdfParse(pdfBuffer);
    const text = sanitizeExtractedText(parsed.text || "");
    const letterCount = (text.match(/\p{L}/gu) || []).length;
    const quality = text.length > 800 && letterCount > 200 ? "good" : "poor";

    return {
      text,
      pageCount: Number(parsed.numpages) || 0,
      quality,
    };
  } catch (error) {
    console.error("Failed to extract PDF text natively:", error);
    return {
      text: "",
      pageCount: 0,
      quality: "poor",
    };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { pdfBase64, serviceCatalog } = await req.json();
    if (!pdfBase64) throw new Error("No PDF data provided");

    const catalogList = (serviceCatalog || []).map((s: any) => s.name).join(", ");
    const nativeExtraction = await extractPdfText(pdfBase64);

    const systemPrompt = `You are a travel agency document analyzer. You receive PDFs from travel suppliers (airlines, hotels, car rentals, insurance, tour operators, etc.) and extract structured service information.

Your job is to identify every service/item in the COMPLETE document and return structured data.

Available service categories from the agency catalog: ${catalogList || "Passagem aérea, Hospedagem, Seguro viagem, Aluguel de carro, Traslado, Experiência, Outros"}

IMPORTANT GLOBAL RULES:
- Read and analyze the COMPLETE document, including all pages.
- Never stop after the first page.
- Never omit services found on later pages.
- If the same booking spans multiple pages, merge the information into the same service when appropriate.

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

If you cannot read certain values, leave them empty or 0.
Prices should be numbers without currency symbols.
Always try your best to extract every service found.`;

    const userMessage = nativeExtraction.quality === "good"
      ? {
          role: "user",
          content: `The full text below was extracted from all ${nativeExtraction.pageCount || "multiple"} page(s) of the PDF. Analyze the COMPLETE extracted text from start to end and extract every service mentioned, including services that appear only on later pages.

PDF FULL TEXT START
${nativeExtraction.text}
PDF FULL TEXT END`,
        }
      : {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this COMPLETE PDF document from a travel supplier. It has ${nativeExtraction.pageCount || "multiple"} page(s). You MUST read ALL pages from start to end. Extract ALL services with detailed flight itineraries, hotel info, car rentals, insurance, transfers, tours, and any other service found anywhere in the document. Do NOT stop at the first page.`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:application/pdf;base64,${pdfBase64}`
              }
            }
          ]
        };

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        max_tokens: 16000,
        tools: [extractionTool],
        tool_choice: { type: "function", function: { name: "extract_quote_data" } },
        messages: [
          { role: "system", content: systemPrompt },
          userMessage,
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
    const message = data.choices?.[0]?.message;
    const toolCall = message?.tool_calls?.find((call: any) => call?.function?.name === "extract_quote_data");
    const toolArguments = toolCall?.function?.arguments;
    const content = typeof message?.content === "string"
      ? message.content
      : Array.isArray(message?.content)
        ? message.content.map((part: any) => part?.text || "").join("\n")
        : "";

    let jsonStr = toolArguments || content || "";
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1].trim();

    const objMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (objMatch) jsonStr = objMatch[0];

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse AI response:", data);
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
