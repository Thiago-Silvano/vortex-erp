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
};

const serviceSchema = {
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
};

const extractionTool = {
  type: "function",
  function: {
    name: "extract_quote_data",
    description: "Extract complete structured data from a travel supplier quote or itinerary PDF, including multiple quote options and payment terms.",
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
          items: serviceSchema,
        },
        quote_options: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              services: {
                type: "array",
                items: serviceSchema,
              },
            },
            required: ["title", "services"],
            additionalProperties: false,
          },
        },
        payment_info: {
          type: "object",
          properties: {
            payment_terms: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  label: { type: "string" },
                  installments: { type: "number" },
                  notes: { type: "string" },
                },
                required: ["label", "installments", "notes"],
                additionalProperties: false,
              },
            },
            general_notes: { type: "string" },
          },
          required: ["payment_terms", "general_notes"],
          additionalProperties: false,
        },
      },
      required: ["trip_info", "services", "quote_options", "payment_info"],
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
    return {
      text: sanitizeExtractedText(parsed.text || ""),
      pageCount: Number(parsed.numpages) || 0,
    };
  } catch (error) {
    console.error("Failed to extract PDF text natively:", error);
    return {
      text: "",
      pageCount: 0,
    };
  }
}

function normalizeResult(parsed: any) {
  return {
    trip_info: {
      client_name: parsed?.trip_info?.client_name || "",
      origin: parsed?.trip_info?.origin || "",
      destination: parsed?.trip_info?.destination || "",
      departure_date: parsed?.trip_info?.departure_date || "",
      return_date: parsed?.trip_info?.return_date || "",
      passengers: Number(parsed?.trip_info?.passengers) || 1,
    },
    services: Array.isArray(parsed?.services) ? parsed.services : [],
    quote_options: Array.isArray(parsed?.quote_options) ? parsed.quote_options : [],
    payment_info: {
      payment_terms: Array.isArray(parsed?.payment_info?.payment_terms) ? parsed.payment_info.payment_terms : [],
      general_notes: parsed?.payment_info?.general_notes || "",
    },
  };
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
- Some PDFs contain MULTIPLE QUOTE OPTIONS (for example: ORÇAMENTO 1, ORÇAMENTO 2, ORÇAMENTO 3). When that happens, populate quote_options.
- If a quote option is a full package, repeat shared services (such as flights or common hotels) inside each quote option so that each option is complete on its own.
- Use the top-level services array only when the document has a single option or when there are truly common standalone services outside any option.

IMPORTANT RULES FOR FLIGHTS / AIR TICKETS:
- Group ALL flight segments (legs) into a SINGLE service item with service_type "Passagem aérea" (or best match from catalog).
- Extract EACH flight leg/segment separately in the flight_legs array.
- For each leg include: origin, destination, departure_date (YYYY-MM-DD), departure_time (HH:MM), arrival_date (YYYY-MM-DD), arrival_time (HH:MM), airline, flight_number, direction (ida or volta).
- Calculate connection_duration between consecutive legs of the same direction.
- Calculate total_travel_duration for each direction.
- The description should summarize the full itinerary.
- The cost_price should be the TOTAL price for all flights in that option.

RULES FOR BAGGAGE:
- If baggage info is found, include it in baggage with personal_item, carry_on, checked_bag.

FOR OTHER SERVICES:
- Each hotel, insurance, transfer, car rental, tour or additional item is a separate service.
- Extract: service_type, description, cost_price, quantity, start_date, end_date, location, supplier, details.

PAYMENT / GENERAL INFO RULES:
- Extract payment conditions, installment rules and important restrictions from pages such as "Formas de Pagamento".
- Put payment options in payment_info.payment_terms.
- Put warnings, restrictions and important operational notes in payment_info.general_notes.

If you cannot read certain values, leave them empty or 0.
Prices should be numbers without currency symbols.
Always try your best to extract every service found.`;

    const extractedTextBlock = nativeExtraction.text
      ? `The following text was extracted from the complete PDF (${nativeExtraction.pageCount || "multiple"} page(s)). Use it together with the PDF itself to make sure you capture all pages, quote options, payment terms and general notes.\n\nPDF FULL TEXT START\n${nativeExtraction.text}\nPDF FULL TEXT END`
      : `Native text extraction was limited. Rely on the PDF visual content and still analyze all ${nativeExtraction.pageCount || "multiple"} page(s).`;

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
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this COMPLETE supplier PDF. ${extractedTextBlock}`,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:application/pdf;base64,${pdfBase64}`,
                },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns instantes." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro ao analisar PDF" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(normalizeResult(parsed)), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-quote-pdf error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
