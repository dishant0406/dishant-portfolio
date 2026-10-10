import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * Adds geo-location headers that the homepage greeting reads.
 *
 * Only the homepage needs these, so the matcher is limited to `/`. Crawler
 * endpoints such as /sitemap.xml, /robots.txt and every blog page previously ran
 * through this proxy too, which put a blocking third-party lookup in front of
 * content that does not use the result.
 */
export async function proxy(request: NextRequest) {
  const response = NextResponse.next();

  const forwardedFor = request.headers.get('x-forwarded-for');
  const clientIP = forwardedFor?.split(',')[0]?.trim() || '127.0.0.1';

  await fetchGeoLocationData(clientIP, response);

  return response;
}

async function fetchGeoLocationData(ip: string, response: NextResponse) {
  try {
    const geoResponse = await fetch(`https://ipwho.is/${ip}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 3600 },
      // A third party must never be able to hold up a page render.
      signal: AbortSignal.timeout(2000),
    });

    if (!geoResponse.ok) {
      setDefaultHeaders(response);
      return;
    }

    const geoData = await geoResponse.json();

    if (!geoData.success) {
      setDefaultHeaders(response);
      return;
    }

    response.headers.set('x-geo-timezone', geoData.timezone?.id || 'Asia/Kolkata');
    response.headers.set('x-geo-city', geoData.city || 'Bangalore');
    response.headers.set('x-geo-latitude', geoData.latitude?.toString() || '12.9716');
    response.headers.set('x-geo-longitude', geoData.longitude?.toString() || '77.5946');
    response.headers.set('x-geo-country', geoData.country_code || 'IN');
  } catch (error) {
    console.error('Geo-location API error:', error);
    setDefaultHeaders(response);
  }
}

function setDefaultHeaders(response: NextResponse) {
  response.headers.set('x-geo-timezone', 'Asia/Kolkata');
  response.headers.set('x-geo-city', 'Bangalore');
  response.headers.set('x-geo-latitude', '12.9716');
  response.headers.set('x-geo-longitude', '77.5946');
  response.headers.set('x-geo-country', 'IN');
}

export const config = {
  matcher: ['/'],
};
