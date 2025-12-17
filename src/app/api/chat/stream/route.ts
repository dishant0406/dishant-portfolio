import { checkApiSecurity } from "@/lib/security";
import { NextRequest } from "next/server";

const MASTRA_API = process.env.MASTRA_API_URL || 'http://localhost:4000';

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  const security = checkApiSecurity(request);
  return security.response!;
}

export async function POST(request: NextRequest) {
  // Security check (CORS + Rate Limiting)
  const security = checkApiSecurity(request);
  
  if (!security.success && security.response) {
    return security.response;
  }
  
  try {
    const body = await request.json();

    // Forward request to Mastra server
    const response = await fetch(`${MASTRA_API}/agent/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error('Mastra API request failed');
    }

    // Forward the SSE stream from Mastra server
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error("Chat stream API error:", error);
    return new Response(JSON.stringify({ error: "Internal server error", details: String(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
