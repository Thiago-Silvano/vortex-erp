const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { hotelName } = await req.json();

    if (!hotelName) {
      return new Response(
        JSON.stringify({ error: 'Hotel name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'AI not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Get hotel info via AI
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a hotel information assistant. Given a hotel name, provide detailed information as if from TripAdvisor. Respond ONLY in valid JSON format with this structure:
{
  "description": "Brief 2-3 sentence description in Portuguese",
  "address": "Full address",
  "services": ["list of hotel services/facilities in Portuguese, e.g. Piscina, Spa, Academia, Restaurante, Bar, Wi-Fi gratuito, Estacionamento, Room service, Concierge, Centro de negócios"],
  "room_amenities": ["list of room amenities in Portuguese, e.g. Ar condicionado, TV de tela plana, Cofre, Minibar, Secador de cabelo, Roupão de banho"],
  "room_types": ["list of room types in Portuguese, e.g. Standard, Superior, Deluxe, Suíte, Suíte Presidencial"],
  "hotel_category": "e.g. 5 estrelas",
  "hotel_type": "e.g. Resort, Hotel urbano, Hotel boutique, Pousada",
  "languages": ["list of languages spoken, e.g. Português, Inglês, Espanhol"],
  "website": "hotel website URL if known, or empty string",
  "tripadvisor_url": "TripAdvisor URL if known, or empty string"
}
If you cannot find specific info, provide reasonable estimates based on the hotel name and category.`,
          },
          {
            role: 'user',
            content: `Busque informações detalhadas sobre o hotel: "${hotelName}". Retorne todas as categorias solicitadas.`,
          },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('AI API error:', errText);
      return new Response(
        JSON.stringify({ error: 'Failed to search hotel info' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || '';
    
    let hotelInfo: any = {};
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        hotelInfo = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Failed to parse AI response:', content);
    }

    // Build rich description text
    const sections: string[] = [];
    
    if (hotelInfo.description) {
      sections.push(hotelInfo.description);
    }

    if (hotelInfo.hotel_category || hotelInfo.hotel_type) {
      const details: string[] = [];
      if (hotelInfo.hotel_category) details.push(`Categoria: ${hotelInfo.hotel_category}`);
      if (hotelInfo.hotel_type) details.push(`Tipo: ${hotelInfo.hotel_type}`);
      sections.push(`\n📋 DETALHES ÚTEIS\n${details.join('\n')}`);
    }

    if (hotelInfo.languages && hotelInfo.languages.length > 0) {
      sections.push(`Idiomas falados: ${hotelInfo.languages.join(', ')}`);
    }

    if (hotelInfo.services && hotelInfo.services.length > 0) {
      sections.push(`\n🏨 SERVIÇOS DO ESTABELECIMENTO\n${hotelInfo.services.map((s: string) => `• ${s}`).join('\n')}`);
    }

    if (hotelInfo.room_amenities && hotelInfo.room_amenities.length > 0) {
      sections.push(`\n🛏️ COMODIDADES NOS QUARTOS\n${hotelInfo.room_amenities.map((s: string) => `• ${s}`).join('\n')}`);
    }

    if (hotelInfo.room_types && hotelInfo.room_types.length > 0) {
      sections.push(`\n🚪 TIPOS DE QUARTO\n${hotelInfo.room_types.map((s: string) => `• ${s}`).join('\n')}`);
    }

    const links: string[] = [];
    if (hotelInfo.website) links.push(`Website: ${hotelInfo.website}`);
    if (hotelInfo.tripadvisor_url) links.push(`TripAdvisor: ${hotelInfo.tripadvisor_url}`);
    if (links.length > 0) {
      sections.push(`\n🔗 LINKS\n${links.join('\n')}`);
    }

    // Step 2: Search for hotel images using AI
    let images: string[] = [];
    try {
      const imgResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            {
              role: 'system',
              content: 'You are a hotel image search assistant. Given a hotel name, provide up to 15 publicly accessible image URLs of the hotel. These should be real, working URLs from sources like booking.com, hotels.com, tripadvisor, or the hotel\'s own website. Respond ONLY with a JSON array of strings (URLs). If you cannot find real URLs, return an empty array [].',
            },
            {
              role: 'user',
              content: `Find 15 real image URLs for the hotel: "${hotelName}". Return only a JSON array of URL strings.`,
            },
          ],
          temperature: 0.2,
        }),
      });

      if (imgResponse.ok) {
        const imgData = await imgResponse.json();
        const imgContent = imgData.choices?.[0]?.message?.content || '';
        try {
          const arrMatch = imgContent.match(/\[[\s\S]*\]/);
          if (arrMatch) {
            const parsed = JSON.parse(arrMatch[0]);
            if (Array.isArray(parsed)) {
              images = parsed.filter((u: any) => typeof u === 'string' && u.startsWith('http')).slice(0, 15);
            }
          }
        } catch (e) {
          console.error('Failed to parse image URLs:', imgContent);
        }
      }
    } catch (e) {
      console.error('Image search error:', e);
    }

    const result = {
      description: sections.join('\n'),
      address: hotelInfo.address || '',
      images,
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
