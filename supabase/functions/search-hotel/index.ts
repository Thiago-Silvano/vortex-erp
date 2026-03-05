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

    // Step 1: Get comprehensive hotel info via AI (simulating TripAdvisor "About" section)
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
            content: `You are a hotel information expert with deep knowledge equivalent to TripAdvisor's "About" section. Given a hotel name, provide extremely detailed information. Respond ONLY in valid JSON format with this structure:
{
  "description": "Brief 2-3 sentence description in Portuguese about the hotel, its history and highlights",
  "address": "Full address including city, state/province, country and ZIP/postal code",
  "hotel_category": "e.g. 5 estrelas",
  "hotel_type": "e.g. Resort, Hotel urbano, Hotel boutique, Pousada, Hotel de luxo",
  "languages": ["list of languages spoken by staff"],
  "services": ["comprehensive list of ALL hotel services/facilities in Portuguese - include everything: Piscina, Piscina aquecida, Spa, Academia, Restaurante, Bar, Lounge, Wi-Fi gratuito, Estacionamento, Estacionamento com manobrista, Room service, Concierge, Centro de negócios, Salão de eventos, Lavanderia, Serviço de câmbio, Transfer aeroporto, Serviço de babá, Kids club, Quadra de tênis, Campo de golfe, Praia privativa, etc."],
  "room_amenities": ["comprehensive list of ALL room amenities in Portuguese - include everything: Ar condicionado, TV de tela plana, TV a cabo, Cofre digital, Minibar, Frigobar, Secador de cabelo, Roupão de banho, Chinelos, Amenities de banho premium, Banheira, Chuveiro de chuva, Varanda/Sacada, Vista para o mar, Wi-Fi no quarto, Máquina de café Nespresso, Telefone, Escrivaninha, Ferro de passar, etc."],
  "room_types": ["all room types available in Portuguese with brief description, e.g. Standard (30m²), Superior (35m²), Deluxe (40m²), Suíte Junior (50m²), Suíte Master (70m²), Suíte Presidencial (120m²), Villa (150m²)"],
  "check_in_time": "e.g. 15:00",
  "check_out_time": "e.g. 12:00",
  "price_range": "e.g. R$ 800 - R$ 5.000 por noite",
  "total_rooms": "e.g. 250 quartos",
  "year_built": "e.g. 2005",
  "year_renovated": "e.g. 2020",
  "accessibility": ["list of accessibility features in Portuguese, e.g. Quartos acessíveis, Elevadores, Rampas de acesso, Banheiros adaptados, Estacionamento para PCD"],
  "dining": ["list of restaurants/bars with brief description in Portuguese, e.g. Restaurante Principal - cozinha internacional, buffet; Bar da Piscina - drinks e petiscos; Restaurante Japonês - culinária asiática"],
  "sustainability": ["eco/sustainability practices in Portuguese if any, e.g. Programa de reutilização de toalhas, Energia solar, Produtos orgânicos, Redução de plástico"],
  "nearby_attractions": ["list of nearby attractions/points of interest in Portuguese with approximate distance, e.g. Praia de Copacabana (50m), Cristo Redentor (8km), Aeroporto Santos Dumont (5km)"],
  "policies": ["important policies in Portuguese, e.g. Aceita animais de estimação (sob consulta), Fumantes: áreas designadas, Idade mínima para check-in: 18 anos, Cartão de crédito obrigatório no check-in"],
  "awards": ["awards or recognitions if any, e.g. TripAdvisor Travelers Choice 2024, Forbes Travel Guide 5-Star, Condé Nast Top 50"],
  "website": "hotel website URL if known, or empty string",
  "tripadvisor_url": "TripAdvisor URL if known, or empty string",
  "phone": "hotel phone number if known, or empty string",
  "email": "hotel email if known, or empty string"
}
If you cannot find specific info, provide reasonable estimates based on the hotel name and category. Be as comprehensive and detailed as possible.`,
          },
          {
            role: 'user',
            content: `Busque informações extremamente detalhadas sobre o hotel: "${hotelName}". Quero todas as informações que estariam disponíveis na página "Sobre" do TripAdvisor e mais. Retorne TODAS as categorias solicitadas com o máximo de itens possível.`,
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

    // Details section
    const details: string[] = [];
    if (hotelInfo.hotel_category) details.push(`Categoria: ${hotelInfo.hotel_category}`);
    if (hotelInfo.hotel_type) details.push(`Tipo: ${hotelInfo.hotel_type}`);
    if (hotelInfo.total_rooms) details.push(`Total de quartos: ${hotelInfo.total_rooms}`);
    if (hotelInfo.year_built) details.push(`Ano de construção: ${hotelInfo.year_built}`);
    if (hotelInfo.year_renovated) details.push(`Última renovação: ${hotelInfo.year_renovated}`);
    if (hotelInfo.price_range) details.push(`Faixa de preço: ${hotelInfo.price_range}`);
    if (hotelInfo.check_in_time) details.push(`Check-in: ${hotelInfo.check_in_time}`);
    if (hotelInfo.check_out_time) details.push(`Check-out: ${hotelInfo.check_out_time}`);
    if (hotelInfo.phone) details.push(`Telefone: ${hotelInfo.phone}`);
    if (hotelInfo.email) details.push(`E-mail: ${hotelInfo.email}`);
    if (details.length > 0) {
      sections.push(`\n📋 DETALHES ÚTEIS\n${details.join('\n')}`);
    }

    if (hotelInfo.languages && hotelInfo.languages.length > 0) {
      sections.push(`🗣️ Idiomas falados: ${hotelInfo.languages.join(', ')}`);
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

    if (hotelInfo.dining && hotelInfo.dining.length > 0) {
      sections.push(`\n🍽️ GASTRONOMIA\n${hotelInfo.dining.map((s: string) => `• ${s}`).join('\n')}`);
    }

    if (hotelInfo.accessibility && hotelInfo.accessibility.length > 0) {
      sections.push(`\n♿ ACESSIBILIDADE\n${hotelInfo.accessibility.map((s: string) => `• ${s}`).join('\n')}`);
    }

    if (hotelInfo.sustainability && hotelInfo.sustainability.length > 0) {
      sections.push(`\n🌿 SUSTENTABILIDADE\n${hotelInfo.sustainability.map((s: string) => `• ${s}`).join('\n')}`);
    }

    if (hotelInfo.nearby_attractions && hotelInfo.nearby_attractions.length > 0) {
      sections.push(`\n📍 ATRAÇÕES PRÓXIMAS\n${hotelInfo.nearby_attractions.map((s: string) => `• ${s}`).join('\n')}`);
    }

    if (hotelInfo.policies && hotelInfo.policies.length > 0) {
      sections.push(`\n📜 POLÍTICAS\n${hotelInfo.policies.map((s: string) => `• ${s}`).join('\n')}`);
    }

    if (hotelInfo.awards && hotelInfo.awards.length > 0) {
      sections.push(`\n🏆 PRÊMIOS E RECONHECIMENTOS\n${hotelInfo.awards.map((s: string) => `• ${s}`).join('\n')}`);
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
