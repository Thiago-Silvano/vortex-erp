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

    const prompt = `You are a travel industry expert. Search for the hotel "${hotelName}"${location ? ` in ${location}` : ''} and return detailed information.

Return a JSON object with EXACTLY this structure (use null for unknown fields):
{
  "name": "Full official hotel name",
  "stars": 5,
  "address": "Full address",
  "city": "City name",
  "country": "Country",
  "description": "A compelling 2-3 sentence description of the hotel highlighting its best features",
  "amenities": ["Pool", "Spa", "Restaurant", "Gym", "WiFi", "Room Service"],
  "check_in_time": "15:00",
  "check_out_time": "11:00",
  "category": "Resort/Hotel/Boutique/Pousada",
  "highlights": ["Beachfront", "All-Inclusive", "Adults Only"]
}

Be accurate and factual. If you're unsure about specific details, use reasonable defaults for a hotel of that category. Always provide the description in Portuguese (Brazil).`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a hotel information database. Return ONLY valid JSON, no markdown, no explanation.' },
          { role: 'user', content: prompt },
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'return_hotel_info',
            description: 'Return structured hotel information',
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
      // Fallback: try to parse from content
      const content = data.choices?.[0]?.message?.content || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        hotelInfo = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Could not extract hotel information');
      }
    }

    return new Response(JSON.stringify({ success: true, data: hotelInfo }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
