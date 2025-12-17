import { checkApiSecurity } from "@/lib/security";
import { NextRequest, NextResponse } from "next/server";

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
    const response = await fetch(`${MASTRA_API}/agent/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error('Mastra API request failed');
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    );
  }
}
