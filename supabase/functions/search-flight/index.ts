const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { flightCode, date } = await req.json();

    if (!flightCode || !date) {
      return new Response(
        JSON.stringify({ error: 'Flight code and date are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const API_KEY = Deno.env.get('AVIATIONSTACK_API_KEY');
    if (!API_KEY) {
      return new Response(
        JSON.stringify({ error: 'AviationStack API not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract airline code and flight number from IATA code (e.g., "LA3456" -> airline "LA", flight "3456")
    const match = flightCode.trim().toUpperCase().match(/^([A-Z0-9]{2})(\d+)$/);
    if (!match) {
      return new Response(
        JSON.stringify({ error: 'Código de voo inválido. Use o formato IATA, ex: LA3456, G31234, AA100' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const airlineCode = match[1];
    const flightNumber = match[2];

    // Query AviationStack API
    const url = `http://api.aviationstack.com/v1/flights?access_key=${API_KEY}&flight_iata=${airlineCode}${flightNumber}&flight_date=${date}`;
    
    console.log(`Searching flight: ${airlineCode}${flightNumber} on ${date}`);

    const response = await fetch(url);
    if (!response.ok) {
      const errText = await response.text();
      console.error('AviationStack error:', errText);
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar dados do voo' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    
    if (data.error) {
      console.error('AviationStack API error:', data.error);
      return new Response(
        JSON.stringify({ error: data.error.message || 'Erro na API de voos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const flights = data.data;
    if (!flights || flights.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Voo não encontrado para esta data' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the first matching flight
    const flight = flights[0];

    // Extract times - AviationStack returns ISO timestamps
    const departureScheduled = flight.departure?.scheduled || '';
    const arrivalScheduled = flight.arrival?.scheduled || '';

    const depDate = departureScheduled ? departureScheduled.substring(0, 10) : date;
    const depTime = departureScheduled ? departureScheduled.substring(11, 16) : '';
    const arrDate = arrivalScheduled ? arrivalScheduled.substring(0, 10) : '';
    const arrTime = arrivalScheduled ? arrivalScheduled.substring(11, 16) : '';

    const result = {
      origin: flight.departure?.iata || '',
      destination: flight.arrival?.iata || '',
      departureDate: depDate,
      departureTime: depTime,
      arrivalDate: arrDate,
      arrivalTime: arrTime,
      airline: flight.airline?.name || '',
      airlineIata: flight.airline?.iata || '',
      flightIata: flight.flight?.iata || flightCode.toUpperCase(),
      status: flight.flight_status || '',
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
