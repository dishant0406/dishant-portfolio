import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * Proxy to add geo-location headers using IP-based geo-location API
 */
export async function proxy(request: NextRequest) {
  const response = NextResponse.next();

  // Get client IP from Azure Container Apps x-forwarded-for header
  const forwardedFor = request.headers.get('x-forwarded-for');
  const clientIP = forwardedFor?.split(',')[0]?.trim() || '127.0.0.1';

  console.log('Client IP detected:', clientIP);

  // Await geo-location data fetch to ensure headers are set before returning
  await fetchGeoLocationData(clientIP, response);

  return response;
}

// Async function to fetch geo-location data and set headers
async function fetchGeoLocationData(ip: string, response: NextResponse) {
  try {
    // Using custom Azure Container Apps geo-location API
    const geoResponse = await fetch(`https://ipinfo.proudsmoke-360acd96.centralindia.azurecontainerapps.io/lookup/${ip}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 3600 } // Cache for 1 hour
    });

    if (geoResponse.ok) {
      const geoData = await geoResponse.json();
      
      // Set custom geo headers based on the API response format
      response.headers.set('x-geo-timezone', geoData.timezone || 'Asia/Kolkata');
      response.headers.set('x-geo-city', geoData.city || 'Bangalore');
      response.headers.set('x-geo-latitude', geoData.ll?.[0]?.toString() || '12.9716');
      response.headers.set('x-geo-longitude', geoData.ll?.[1]?.toString() || '77.5946');
      response.headers.set('x-geo-country', geoData.country || 'IN');
      
      console.log('Geo data fetched:', {
        city: geoData.city,
        country: geoData.country,
        timezone: geoData.timezone,
        coordinates: geoData.ll
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
  response.headers.set('x-geo-timezone', 'Asia/Kolkata');
  response.headers.set('x-geo-city', 'Bangalore');
  response.headers.set('x-geo-latitude', '12.9716');
  response.headers.set('x-geo-longitude', '77.5946');
  response.headers.set('x-geo-country', 'IN');
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
