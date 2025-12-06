import { checkApiSecurity, getCorsHeaders } from "@/lib/security";
import { mastra } from "@/mastra";
import { NextRequest, NextResponse } from "next/server";

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
    const agent = mastra.getAgent("portfolioAgent");
    const memory = await agent.getMemory();

    if (!memory) {
      return NextResponse.json(
        { error: "Memory not configured" },
        { status: 500 }
      );
    }

    // Get all threads for the resource
    const threads = await memory.getThreadsByResourceId({ resourceId: RESOURCE_ID });

    return NextResponse.json({
      threads: threads || [],
    }, {
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
