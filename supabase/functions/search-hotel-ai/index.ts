const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { hotelName, location } = await req.json();
    if (!hotelName) {
      return new Response(JSON.stringify({ error: 'Hotel name is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI gateway not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const prompt = `You are a travel industry expert with deep knowledge of TripAdvisor data. Search for the hotel "${hotelName}"${location ? ` in ${location}` : ''} and return detailed information including TripAdvisor-specific data.

Return a JSON object with EXACTLY this structure (use null for unknown fields):
{
  "name": "Full official hotel name",
  "stars": 5,
  "address": "Full address",
  "city": "City name",
  "country": "Country",
  "description": "A compelling 2-3 sentence description of the hotel highlighting its best features, in Portuguese (Brazil)",
  "amenities": ["Pool", "Spa", "Restaurant", "Gym", "WiFi", "Room Service"],
  "check_in_time": "15:00",
  "check_out_time": "11:00",
  "category": "Resort/Hotel/Boutique/Pousada",
  "highlights": ["Beachfront", "All-Inclusive", "Adults Only"],
  "tripadvisor_rating": 4.5,
  "tripadvisor_reviews_count": 3200,
  "tripadvisor_ranking": "Nº 3 de 45 hotéis em Cancún",
  "tripadvisor_badges": ["Travellers Choice 2024", "Certificado de Excelência"],
  "tripadvisor_top_reviews": [
    "Hotel incrível com vista maravilhosa para o mar",
    "Serviço impecável, staff muito atencioso",
    "Café da manhã espetacular com opções variadas"
  ],
  "tripadvisor_rating_breakdown": {
    "location": 4.8,
    "cleanliness": 4.6,
    "service": 4.7,
    "value": 4.3,
    "rooms": 4.5
  },
  "tripadvisor_popular_mentions": ["piscina", "vista para o mar", "café da manhã", "staff"]
}

Be accurate and factual based on your knowledge of this hotel's TripAdvisor presence. Provide reviews and mentions in Portuguese (Brazil). If unsure about specific TripAdvisor data, provide reasonable estimates based on the hotel's category and reputation.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a hotel information database with TripAdvisor data. Return ONLY valid JSON, no markdown, no explanation.' },
          { role: 'user', content: prompt },
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'return_hotel_info',
            description: 'Return structured hotel information with TripAdvisor data',
            parameters: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                stars: { type: 'number' },
                address: { type: 'string' },
                city: { type: 'string' },
                country: { type: 'string' },
                description: { type: 'string' },
                amenities: { type: 'array', items: { type: 'string' } },
                check_in_time: { type: 'string' },
                check_out_time: { type: 'string' },
                category: { type: 'string' },
                highlights: { type: 'array', items: { type: 'string' } },
                tripadvisor_rating: { type: 'number' },
                tripadvisor_reviews_count: { type: 'number' },
                tripadvisor_ranking: { type: 'string' },
                tripadvisor_badges: { type: 'array', items: { type: 'string' } },
                tripadvisor_top_reviews: { type: 'array', items: { type: 'string' } },
                tripadvisor_rating_breakdown: {
                  type: 'object',
                  properties: {
                    location: { type: 'number' },
                    cleanliness: { type: 'number' },
                    service: { type: 'number' },
                    value: { type: 'number' },
                    rooms: { type: 'number' },
                  },
                },
                tripadvisor_popular_mentions: { type: 'array', items: { type: 'string' } },
              },
              required: ['name', 'description'],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'return_hotel_info' } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded, try again later' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const t = await response.text();
      console.error('AI gateway error:', response.status, t);
      return new Response(JSON.stringify({ error: 'AI gateway error' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    let hotelInfo;
    if (toolCall?.function?.arguments) {
      hotelInfo = typeof toolCall.function.arguments === 'string' 
        ? JSON.parse(toolCall.function.arguments)
        : toolCall.function.arguments;
    } else {
      const content = data.choices?.[0]?.message?.content || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        hotelInfo = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Could not extract hotel information');
      }
    }

    // Generate 10 hotel images in parallel (2 batches of 5 to avoid rate limits)
    const images: string[] = [];
    const imagePrompts = [
      `A stunning professional photograph of the exterior facade of ${hotelName}${location ? ` in ${location}` : ''}, luxury hotel photography, golden hour, high resolution, 16:9`,
      `A beautiful interior lobby photograph of ${hotelName}, luxury hotel interior design, elegant lighting, professional photography, 16:9`,
      `A gorgeous swimming pool area at ${hotelName}, resort pool photography, crystal clear water, tropical setting, professional travel photography, 16:9`,
      `A luxurious hotel room or suite at ${hotelName}, interior design photography, king bed, elegant decor, natural light, 16:9`,
      `A beautiful restaurant or dining area at ${hotelName}, fine dining, elegant atmosphere, professional food photography setting, 16:9`,
      `An aerial panoramic view of ${hotelName}${location ? ` in ${location}` : ''}, drone photography, showing the full property and surroundings, 16:9`,
      `A relaxing spa and wellness area at ${hotelName}, tranquil atmosphere, luxury spa photography, candles, natural elements, 16:9`,
      `A stunning sunset view from ${hotelName}${location ? ` in ${location}` : ''}, breathtaking scenery, professional travel photography, 16:9`,
      `A beautiful garden or outdoor lounge area at ${hotelName}, landscaped gardens, tropical plants, professional photography, 16:9`,
      `A gorgeous bar or entertainment area at ${hotelName}, cocktail bar, ambient lighting, luxury nightlife, professional photography, 16:9`,
    ];

    for (let batch = 0; batch < 2; batch++) {
      const batchPrompts = imagePrompts.slice(batch * 5, (batch + 1) * 5);
      const batchResults = await Promise.allSettled(
        batchPrompts.map(async (imgPrompt) => {
          const imgResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${LOVABLE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-3.1-flash-image-preview',
              messages: [{ role: 'user', content: imgPrompt }],
              modalities: ['image', 'text'],
            }),
          });
          if (!imgResponse.ok) return null;
          const imgData = await imgResponse.json();
          return imgData.choices?.[0]?.message?.images?.[0]?.image_url?.url || null;
        })
      );
      for (const r of batchResults) {
        if (r.status === 'fulfilled' && r.value) {
          images.push(r.value);
        }
      }
    }

    return new Response(JSON.stringify({ success: true, data: hotelInfo, images }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
