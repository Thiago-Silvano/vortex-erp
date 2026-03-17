import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, query, placeId, apiKey } = await req.json();

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Google Maps API Key não configurada' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ACTION: search - Text search for hotels
    if (action === 'search') {
      if (!query) {
        return new Response(JSON.stringify({ error: 'Query é obrigatória' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&type=lodging&language=pt-BR&key=${apiKey}`;
      const resp = await fetch(url);
      const data = await resp.json();

      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        return new Response(JSON.stringify({ error: `Google API error: ${data.status}`, details: data.error_message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const results = (data.results || []).slice(0, 8).map((place: any) => ({
        place_id: place.place_id,
        name: place.name,
        address: place.formatted_address,
        rating: place.rating || 0,
        user_ratings_total: place.user_ratings_total || 0,
        photo_reference: place.photos?.[0]?.photo_reference || null,
        location: place.geometry?.location || null,
      }));

      // Build photo URLs for thumbnails
      const resultsWithPhotos = results.map((r: any) => ({
        ...r,
        thumbnail_url: r.photo_reference
          ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=200&photo_reference=${r.photo_reference}&key=${apiKey}`
          : null,
      }));

      return new Response(JSON.stringify({ success: true, results: resultsWithPhotos }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ACTION: details - Get place details
    if (action === 'details') {
      if (!placeId) {
        return new Response(JSON.stringify({ error: 'placeId é obrigatório' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check cache first (valid for 30 days)
      const { data: cached } = await supabase
        .from('hotels_cache')
        .select('*')
        .eq('place_id', placeId)
        .single();

      if (cached) {
        const cacheAge = Date.now() - new Date(cached.data_atualizacao).getTime();
        const thirtyDays = 30 * 24 * 60 * 60 * 1000;
        if (cacheAge < thirtyDays) {
          // Build photo URLs from cached references
          const photos = (cached.fotos as any[] || []).map((ref: string) =>
            `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${ref}&key=${apiKey}`
          );
          return new Response(JSON.stringify({
            success: true,
            data: {
              place_id: cached.place_id,
              name: cached.nome,
              city: cached.cidade,
              country: cached.pais,
              address: cached.endereco,
              phone: cached.telefone,
              website: cached.website,
              rating: cached.rating,
              reviews_total: cached.reviews_total,
              latitude: cached.latitude,
              longitude: cached.longitude,
              photos,
            },
            fromCache: true,
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      // Fetch from Google
      const fields = 'place_id,name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,geometry,photos,address_components';
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&language=pt-BR&key=${apiKey}`;
      const resp = await fetch(url);
      const data = await resp.json();

      if (data.status !== 'OK') {
        return new Response(JSON.stringify({ error: `Google API error: ${data.status}`, details: data.error_message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const place = data.result;
      
      // Extract city and country from address_components
      let city = '';
      let country = '';
      for (const comp of (place.address_components || [])) {
        if (comp.types.includes('locality') || comp.types.includes('administrative_area_level_2')) {
          city = city || comp.long_name;
        }
        if (comp.types.includes('country')) {
          country = comp.long_name;
        }
      }

      // Get up to 5 photo references
      const photoRefs = (place.photos || []).slice(0, 5).map((p: any) => p.photo_reference);
      const photoUrls = photoRefs.map((ref: string) =>
        `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${ref}&key=${apiKey}`
      );

      const hotelData = {
        place_id: placeId,
        name: place.name || '',
        city,
        country,
        address: place.formatted_address || '',
        phone: place.formatted_phone_number || '',
        website: place.website || '',
        rating: place.rating || 0,
        reviews_total: place.user_ratings_total || 0,
        latitude: place.geometry?.location?.lat || 0,
        longitude: place.geometry?.location?.lng || 0,
        photos: photoUrls,
      };

      // Save/update cache (store photo references, not full URLs)
      const cacheRow = {
        place_id: placeId,
        nome: hotelData.name,
        cidade: city,
        pais: country,
        endereco: hotelData.address,
        telefone: hotelData.phone,
        website: hotelData.website,
        rating: hotelData.rating,
        reviews_total: hotelData.reviews_total,
        latitude: hotelData.latitude,
        longitude: hotelData.longitude,
        fotos: photoRefs,
        data_atualizacao: new Date().toISOString(),
      };

      if (cached) {
        await supabase.from('hotels_cache').update(cacheRow).eq('place_id', placeId);
      } else {
        await supabase.from('hotels_cache').insert(cacheRow);
      }

      return new Response(JSON.stringify({ success: true, data: hotelData, fromCache: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ACTION: search_photos - Search for photos of any place/service
    if (action === 'search_photos') {
      if (!query) {
        return new Response(JSON.stringify({ error: 'Query é obrigatória' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Search for places matching the query
      const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&language=pt-BR&key=${apiKey}`;
      const searchResp = await fetch(searchUrl);
      const searchData = await searchResp.json();

      if (searchData.status !== 'OK') {
        return new Response(JSON.stringify({ success: false, photos: [], error: `Nenhum resultado para "${query}"` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get details for top 3 results to collect photos
      const topResults = (searchData.results || []).slice(0, 3);
      const allPhotos: string[] = [];

      for (const place of topResults) {
        if (allPhotos.length >= 10) break;
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=photos&language=pt-BR&key=${apiKey}`;
        const detailsResp = await fetch(detailsUrl);
        const detailsData = await detailsResp.json();

        if (detailsData.status === 'OK' && detailsData.result?.photos) {
          const refs = detailsData.result.photos.slice(0, Math.max(1, 10 - allPhotos.length));
          for (const p of refs) {
            if (allPhotos.length >= 10) break;
            allPhotos.push(
              `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${p.photo_reference}&key=${apiKey}`
            );
          }
        }
      }

      return new Response(JSON.stringify({ success: true, photos: allPhotos }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ACTION: test - Test API key
    if (action === 'test') {
      const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=hotel+test&key=${apiKey}`;
      const resp = await fetch(url);
      const data = await resp.json();

      const isValid = data.status === 'OK' || data.status === 'ZERO_RESULTS';
      return new Response(JSON.stringify({ success: isValid, status: data.status, error: data.error_message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Ação inválida' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in google-places function:', error);
    return new Response(JSON.stringify({ error: error.message || 'Erro interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
