import { checkApiSecurity, getCorsHeaders } from "@/lib/security";
import { NextRequest, NextResponse } from "next/server";

const MASTRA_API = process.env.MASTRA_API_URL || 'http://localhost:4000';
const RESOURCE_ID = 'portfolio-visitor';

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  const security = checkApiSecurity(request);
  return security.response!;
}

export async function GET(request: NextRequest) {
  // Security check (lighter for GET - just CORS, no rate limiting)
  const corsHeaders = getCorsHeaders(request);
  
  try {
    // Forward request to Mastra server
    const response = await fetch(`${MASTRA_API}/threads?resourceId=${RESOURCE_ID}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error('Mastra API request failed');
    }

    const data = await response.json();
    return NextResponse.json(data, {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("Get threads error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500, headers: corsHeaders }
    );
  }
}
