/**
 * Captures IP address and geolocation data for contract signing anti-fraud.
 */
export interface SigningContext {
  ip_address: string;
  geo_city: string;
  geo_state: string;
  geo_country: string;
  geolocation: {
    latitude?: number;
    longitude?: number;
    city?: string;
    region?: string;
    country?: string;
    timezone?: string;
  };
  user_agent: string;
  device_info: string;
}

export async function captureSigningContext(): Promise<SigningContext> {
  const device_info = `${navigator.platform} | ${navigator.language} | ${screen.width}x${screen.height}`;
  const user_agent = navigator.userAgent;

  let ip_address = '';
  let geo_city = '';
  let geo_state = '';
  let geo_country = '';
  let geolocation: SigningContext['geolocation'] = {};

  try {
    // Use ipapi.co for IP + geolocation in one call (free, no key needed, 1000/day)
    const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const data = await res.json();
      ip_address = data.ip || '';
      geo_city = data.city || '';
      geo_state = data.region || '';
      geo_country = data.country_name || '';
      geolocation = {
        latitude: data.latitude,
        longitude: data.longitude,
        city: data.city,
        region: data.region,
        country: data.country_name,
        timezone: data.timezone,
      };
    }
  } catch {
    // Fallback: try another service
    try {
      const res2 = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(3000) });
      if (res2.ok) {
        const data2 = await res2.json();
        ip_address = data2.ip || '';
      }
    } catch {
      // Silent fail - IP capture is best-effort
    }
  }

  return { ip_address, geo_city, geo_state, geo_country, geolocation, user_agent, device_info };
}
