import { checkApiSecurity, getCorsHeaders } from "@/lib/security";
import { NextRequest, NextResponse } from "next/server";

const MASTRA_API = process.env.MASTRA_API_URL || 'http://localhost:4000';

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  const security = checkApiSecurity(request);
  return security.response!;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  // Security check (lighter for GET - just CORS, no rate limiting)
  const corsHeaders = getCorsHeaders(request);
  
  try {
    const { threadId } = await params;

    if (!threadId) {
      return NextResponse.json(
        { error: "Thread ID is required" },
        { status: 400 }
      );
    }

    // Forward request to Mastra server
    const response = await fetch(`${MASTRA_API}/threads/${threadId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: "Thread not found" },
          { status: 404, headers: corsHeaders }
        );
      }
      throw new Error('Mastra API request failed');
    }

    const data = await response.json();
    return NextResponse.json(data, {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("Get chat error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500, headers: corsHeaders }
    );
  }
}
