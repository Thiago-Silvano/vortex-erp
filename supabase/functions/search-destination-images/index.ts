import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { destination } = await req.json();
    if (!destination) {
      return new Response(JSON.stringify({ error: "Destination is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompts = [
      `A stunning high-resolution travel photograph of ${destination}, showing the most iconic landmark or scenery, vibrant colors, professional travel photography, golden hour lighting, 16:9 aspect ratio`,
      `A beautiful aerial panoramic view of ${destination}, high resolution travel photography, clear sky, showing the city skyline or natural landscape, cinematic composition, 16:9 aspect ratio`,
      `A breathtaking scenic view of ${destination} at sunset, professional travel magazine quality photo, vivid colors, wide angle shot showing the beauty of the destination, 16:9 aspect ratio`,
    ];

    const imagePromises = prompts.map(async (prompt) => {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3.1-flash-image-preview",
          messages: [{ role: "user", content: prompt }],
          modalities: ["image", "text"],
        }),
      });

      if (!response.ok) {
        if (response.status === 429) throw new Error("rate_limit");
        if (response.status === 402) throw new Error("payment_required");
        console.error("AI gateway error:", response.status);
        return null;
      }

      const data = await response.json();
      const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      return imageUrl || null;
    });

    const results = await Promise.allSettled(imagePromises);
    const images = results
      .filter((r): r is PromiseFulfilledResult<string | null> => r.status === "fulfilled" && !!r.value)
      .map(r => r.value);

    if (images.length === 0) {
      // Check if rate limited
      const hasRateLimit = results.some(r => r.status === "rejected" && r.reason?.message === "rate_limit");
      const hasPayment = results.some(r => r.status === "rejected" && r.reason?.message === "payment_required");
      
      if (hasRateLimit) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns instantes." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (hasPayment) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao seu workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Não foi possível gerar imagens. Tente novamente." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ images }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("search-destination-images error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
