import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Safari/605.1.15";

interface TaImage {
  id: string;
  url_preview: string;
  url_full: string;
  source: "tripadvisor";
  description: string;
}

/**
 * Estratégia: TripAdvisor não expõe API pública para fotos.
 * Usamos Bing Images filtrando por site:tripadvisor.com (sem precisar de API key).
 * Isso devolve thumbnails do CDN do TripAdvisor (media-cdn.tripadvisor.com / dynamic-media-cdn).
 */
async function searchBingForTripAdvisor(query: string, limit: number): Promise<TaImage[]> {
  const q = encodeURIComponent(`${query} site:tripadvisor.com`);
  const url = `https://www.bing.com/images/search?q=${q}&form=HDRSC2&first=1`;
  const resp = await fetch(url, {
    headers: {
      "User-Agent": UA,
      "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
    },
  });
  if (!resp.ok) {
    console.error("Bing fetch error", resp.status);
    return [];
  }
  const html = await resp.text();

  const results: TaImage[] = [];
  const seen = new Set<string>();

  // Bing embeda em data-m='{"murl":"https://...","turl":"https://...","t":"..."}'
  const re = /m=\\?["']?(\{[^}]*?\})\\?["']?/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null && results.length < limit) {
    try {
      const raw = match[1].replace(/&quot;/g, '"').replace(/\\"/g, '"');
      const obj = JSON.parse(raw);
      const murl: string = obj.murl || "";
      const turl: string = obj.turl || obj.murl || "";
      const title: string = obj.t || query;
      if (!murl || seen.has(murl)) continue;
      if (!/tripadvisor\.com/i.test(murl)) continue;
      seen.add(murl);
      results.push({
        id: `ta-${results.length}-${Date.now()}`,
        url_preview: turl,
        url_full: murl,
        source: "tripadvisor",
        description: title,
      });
    } catch {
      // ignora entradas malformadas
    }
  }

  // Fallback: extrai URLs diretas do CDN do TripAdvisor
  if (results.length < limit) {
    const cdnRe = /https?:\/\/(?:media-cdn|dynamic-media-cdn)\.tripadvisor\.com\/media\/photo[^"'\s)]+/g;
    let m: RegExpExecArray | null;
    while ((m = cdnRe.exec(html)) !== null && results.length < limit) {
      const u = m[0];
      if (seen.has(u)) continue;
      seen.add(u);
      results.push({
        id: `ta-cdn-${results.length}-${Date.now()}`,
        url_preview: u,
        url_full: u.replace(/-[wls]\d+(?:h\d+)?(?=\.[a-z]+$)/i, "-w1200"),
        source: "tripadvisor",
        description: query,
      });
    }
  }

  return results.slice(0, limit);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const { query, limit } = await req.json();
    if (!query || typeof query !== "string") {
      return new Response(JSON.stringify({ error: "query é obrigatória" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const max = Math.min(Math.max(Number(limit) || 10, 1), 20);
    const images = await searchBingForTripAdvisor(query, max);
    return new Response(JSON.stringify({ success: true, images, total: images.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("search-tripadvisor-images error", e);
    return new Response(JSON.stringify({ error: e?.message || "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});