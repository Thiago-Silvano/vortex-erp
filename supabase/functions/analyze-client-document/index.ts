import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageBase64, mimeType, documentType } = await req.json();
    if (!imageBase64 || !documentType) {
      return new Response(JSON.stringify({ error: "imageBase64 e documentType são obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurado");

    const docLabel: Record<string, string> = {
      identidade: "RG / Carteira de Identidade brasileira",
      passaporte: "Passaporte",
      cnh: "CNH - Carteira Nacional de Habilitação",
    };
    const label = docLabel[documentType] || documentType;

    const systemPrompt = `Você é um extrator de dados de documentos pessoais (${label}). Extraia TODAS as informações visíveis na imagem e retorne via tool call. Datas no formato YYYY-MM-DD. CPF apenas dígitos. Se um campo não estiver presente, deixe vazio. Nome em MAIÚSCULAS.`;

    const tools = [{
      type: "function",
      function: {
        name: "extract_document",
        description: "Extrai dados do documento pessoal",
        parameters: {
          type: "object",
          properties: {
            full_name: { type: "string", description: "Nome completo em maiúsculas" },
            cpf: { type: "string", description: "CPF apenas dígitos" },
            birth_date: { type: "string", description: "Data nascimento YYYY-MM-DD" },
            rg_number: { type: "string", description: "Número do RG (se documento for identidade)" },
            passport_number: { type: "string", description: "Número do passaporte" },
            passport_issue_date: { type: "string", description: "Data emissão passaporte YYYY-MM-DD" },
            passport_expiry_date: { type: "string", description: "Data validade passaporte YYYY-MM-DD" },
            cnh_number: { type: "string", description: "Número de registro da CNH" },
            cnh_category: { type: "string", description: "Categoria CNH" },
            cnh_expiry_date: { type: "string", description: "Validade CNH YYYY-MM-DD" },
            mother_name: { type: "string" },
            father_name: { type: "string" },
            nationality: { type: "string" },
            issuing_authority: { type: "string", description: "Órgão emissor" },
          },
          required: [],
          additionalProperties: false,
        },
      },
    }];

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: `Extraia os dados deste ${label}.` },
              { type: "image_url", image_url: { url: `data:${mimeType || "image/jpeg"};base64,${imageBase64}` } },
            ],
          },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "extract_document" } },
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) return new Response(JSON.stringify({ error: "Limite de requisições atingido. Aguarde." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (resp.status === 402) return new Response(JSON.stringify({ error: "Créditos esgotados. Adicione créditos no Lovable AI." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await resp.text();
      console.error("AI error:", resp.status, t);
      return new Response(JSON.stringify({ error: "Erro ao analisar documento" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await resp.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    const args = toolCall?.function?.arguments ? JSON.parse(toolCall.function.arguments) : {};

    return new Response(JSON.stringify({ data: args }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});