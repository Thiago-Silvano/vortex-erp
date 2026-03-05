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
            content: `Você é um especialista em hotéis. Dado o nome de um hotel, forneça informações básicas sobre a acomodação. Responda APENAS em JSON válido com esta estrutura:
{
  "description": "Descrição breve de 2-3 frases em português sobre o hotel",
  "address": "Endereço completo incluindo cidade, estado, país e CEP",
  "hotel_category": "ex: 5 estrelas",
  "hotel_type": "ex: Resort, Hotel urbano, Hotel boutique",
  "check_in_time": "ex: 15:00",
  "check_out_time": "ex: 12:00",
  "total_rooms": "ex: 250 quartos",
  "room_types": ["tipos de quarto disponíveis com breve descrição"],
  "services": ["lista dos principais serviços do hotel em português"],
  "room_amenities": ["lista das principais comodidades dos quartos em português"]
}
Se não souber informações específicas, forneça estimativas razoáveis.`,
          },
          {
            role: 'user',
            content: `Busque informações básicas sobre o hotel: "${hotelName}".`,
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

    // Build organized description with topics
    const sections: string[] = [];
    
    if (hotelInfo.description) {
      sections.push(hotelInfo.description);
    }

    const details: string[] = [];
    if (hotelInfo.hotel_category) details.push(`Categoria: ${hotelInfo.hotel_category}`);
    if (hotelInfo.hotel_type) details.push(`Tipo: ${hotelInfo.hotel_type}`);
    if (hotelInfo.total_rooms) details.push(`Total de quartos: ${hotelInfo.total_rooms}`);
    if (details.length > 0) {
      sections.push(`\n📋 DETALHES\n${details.join('\n')}`);
    }

    if (hotelInfo.services && hotelInfo.services.length > 0) {
      sections.push(`\n🏨 SERVIÇOS\n${hotelInfo.services.map((s: string) => `• ${s}`).join('\n')}`);
    }

    if (hotelInfo.room_amenities && hotelInfo.room_amenities.length > 0) {
      sections.push(`\n🛏️ COMODIDADES\n${hotelInfo.room_amenities.map((s: string) => `• ${s}`).join('\n')}`);
    }

    if (hotelInfo.room_types && hotelInfo.room_types.length > 0) {
      sections.push(`\n🚪 TIPOS DE QUARTO\n${hotelInfo.room_types.map((s: string) => `• ${s}`).join('\n')}`);
    }

    const checkInOut = [
      hotelInfo.check_in_time ? `Check-in: ${hotelInfo.check_in_time}` : '',
      hotelInfo.check_out_time ? `Check-out: ${hotelInfo.check_out_time}` : '',
    ].filter(Boolean).join('\n');

    // Search for hotel images
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
              content: 'You are a hotel image search assistant. Given a hotel name, provide up to 15 publicly accessible image URLs. Respond ONLY with a JSON array of strings (URLs). If you cannot find real URLs, return an empty array [].',
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
      checkInOut,
      policies: '',
      accessibility: '',
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
