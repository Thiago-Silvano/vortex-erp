import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ImageResult {
  id: string;
  url_preview: string;
  url_full: string;
  url_download: string;
  width: number;
  height: number;
  photographer: string;
  photographer_url: string;
  source: 'unsplash' | 'pexels';
  description: string;
}

async function searchUnsplash(query: string, apiKey: string, page: number, perPage: number): Promise<ImageResult[]> {
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}&orientation=landscape&order_by=relevant`;
  const resp = await fetch(url, {
    headers: { Authorization: `Client-ID ${apiKey}` },
  });

  if (!resp.ok) {
    console.error('Unsplash error:', resp.status, await resp.text());
    return [];
  }

  const data = await resp.json();
  return (data.results || [])
    .filter((img: any) => img.width >= 1920)
    .map((img: any) => ({
      id: `unsplash-${img.id}`,
      url_preview: img.urls?.regular || img.urls?.small,
      url_full: img.urls?.full,
      url_download: img.links?.download_location || img.urls?.full,
      width: img.width,
      height: img.height,
      photographer: img.user?.name || 'Unknown',
      photographer_url: img.user?.links?.html || '',
      source: 'unsplash' as const,
      description: img.description || img.alt_description || query,
    }));
}

async function searchPexels(query: string, apiKey: string, page: number, perPage: number): Promise<ImageResult[]> {
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}&orientation=landscape&size=large`;
  const resp = await fetch(url, {
    headers: { Authorization: apiKey },
  });

  if (!resp.ok) {
    console.error('Pexels error:', resp.status, await resp.text());
    return [];
  }

  const data = await resp.json();
  return (data.photos || [])
    .filter((img: any) => img.width >= 1920)
    .map((img: any) => ({
      id: `pexels-${img.id}`,
      url_preview: img.src?.large || img.src?.medium,
      url_full: img.src?.original,
      url_download: img.src?.original,
      width: img.width,
      height: img.height,
      photographer: img.photographer || 'Unknown',
      photographer_url: img.photographer_url || '',
      source: 'pexels' as const,
      description: img.alt || query,
    }));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, query, page, unsplashKey, pexelsKey } = await req.json();

    // ACTION: test - Test API keys
    if (action === 'test') {
      const results: { unsplash?: boolean; pexels?: boolean } = {};
      
      if (unsplashKey) {
        try {
          const resp = await fetch('https://api.unsplash.com/photos/random?count=1', {
            headers: { Authorization: `Client-ID ${unsplashKey}` },
          });
          results.unsplash = resp.ok;
        } catch {
          results.unsplash = false;
        }
      }
      
      if (pexelsKey) {
        try {
          const resp = await fetch('https://api.pexels.com/v1/search?query=test&per_page=1', {
            headers: { Authorization: pexelsKey },
          });
          results.pexels = resp.ok;
        } catch {
          results.pexels = false;
        }
      }

      return new Response(JSON.stringify({ success: true, results }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ACTION: search
    if (action === 'search') {
      if (!query) {
        return new Response(JSON.stringify({ error: 'Query é obrigatória' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!unsplashKey && !pexelsKey) {
        return new Response(JSON.stringify({ error: 'Configure pelo menos uma API Key (Unsplash ou Pexels) em Configurações > Integrações' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const currentPage = page || 1;
      const perPage = 10; // 10 from each source = ~20 total
      const allResults: ImageResult[] = [];

      // Search both APIs in parallel
      const promises: Promise<ImageResult[]>[] = [];
      if (unsplashKey) promises.push(searchUnsplash(query, unsplashKey, currentPage, perPage));
      if (pexelsKey) promises.push(searchPexels(query, pexelsKey, currentPage, perPage));

      const results = await Promise.allSettled(promises);
      for (const r of results) {
        if (r.status === 'fulfilled') allResults.push(...r.value);
      }

      // Sort by width descending (highest res first), limit 20
      allResults.sort((a, b) => b.width - a.width);
      const limited = allResults.slice(0, 20);

      return new Response(JSON.stringify({ success: true, images: limited, total: allResults.length }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Ação inválida' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('search-stock-images error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Erro interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
