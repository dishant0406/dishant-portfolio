import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * Proxy to add geo-location headers using IP-based geo-location API
 */
export function proxy(request: NextRequest) {
  const response = NextResponse.next();

  // Get client IP from Azure Container Apps x-forwarded-for header
  const forwardedFor = request.headers.get('x-forwarded-for');
  const clientIP = forwardedFor?.split(',')[0]?.trim() || '127.0.0.1';

  console.log('Client IP detected:', clientIP);

  // Fetch geo-location data using the client IP
  fetchGeoLocationData(clientIP, response);

  return response;
}

// Async function to fetch geo-location data and set headers
async function fetchGeoLocationData(ip: string, response: NextResponse) {
  try {
    // Using ipapi.co free service (1000 requests/month)
    // Alternative services: ip-api.com, ipgeolocation.io, etc.
    const geoResponse = await fetch(`https://ipapi.co/${ip}/json/`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 3600 } // Cache for 1 hour
    });

    if (geoResponse.ok) {
      const geoData = await geoResponse.json();
      
      // Set custom geo headers
      response.headers.set('x-geo-timezone', geoData.timezone || 'America/New_York');
      response.headers.set('x-geo-city', geoData.city || 'New York');
      response.headers.set('x-geo-latitude', geoData.latitude?.toString() || '40.7128');
      response.headers.set('x-geo-longitude', geoData.longitude?.toString() || '-74.0060');
      response.headers.set('x-geo-country', geoData.country_code || 'US');
      
      console.log('Geo data fetched:', {
        city: geoData.city,
        country: geoData.country_code,
        timezone: geoData.timezone
      });
    } else {
      setDefaultHeaders(response);
    }
  } catch (error) {
    console.error('Geo-location API error:', error);
    setDefaultHeaders(response);
  }
}

// Fallback to default headers
function setDefaultHeaders(response: NextResponse) {
  response.headers.set('x-geo-timezone', 'America/New_York');
  response.headers.set('x-geo-city', 'New York');
  response.headers.set('x-geo-latitude', '40.7128');
  response.headers.set('x-geo-longitude', '-74.0060');
  response.headers.set('x-geo-country', 'US');
}

// Configure which routes should use this proxy
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes that don't need geo data)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
