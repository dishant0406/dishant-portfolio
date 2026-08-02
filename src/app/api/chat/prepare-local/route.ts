import { addCorsHeaders, checkApiSecurity } from '@/lib/security';
import { NextRequest } from 'next/server';

const MASTRA_API = process.env.MASTRA_API_URL || 'http://localhost:4000';

export async function OPTIONS(request: NextRequest) {
  const security = checkApiSecurity(request);
  return security.response!;
}

export async function POST(request: NextRequest) {
  const security = checkApiSecurity(request);

  if (!security.success && security.response) {
    return security.response;
  }

  try {
    const body = await request.json();
    const response = await fetch(`${MASTRA_API}/agent/prepare-local`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    const payload = await response.text();
    const localResponse = new Response(payload, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
        'Cache-Control': 'no-store',
      },
    });

    return addCorsHeaders(localResponse, security.corsHeaders);
  } catch (error) {
    console.error('Local chat prepare API error:', error);
    const errorResponse = new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
    return addCorsHeaders(errorResponse, security.corsHeaders);
  }
}
