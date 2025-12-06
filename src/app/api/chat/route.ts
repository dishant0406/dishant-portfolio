import { checkApiSecurity } from "@/lib/security";
import { mastra } from "@/mastra";
import { NextRequest, NextResponse } from "next/server";

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
    const { messages, threadId, resourceId } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages array is required and cannot be empty" },
        { status: 400 }
      );
    }

    const agent = mastra.getAgent("portfolioAgent");

    // Get the last user message
    const lastUserMessage = messages.filter((m: { role: string }) => m.role === 'user').pop();
    
    if (!lastUserMessage) {
      return NextResponse.json(
        { error: "At least one user message is required" },
        { status: 400 }
      );
    }

    // Call agent with the user message and memory context
    const result = await agent.generate(lastUserMessage.content, {
      memory: threadId && resourceId ? {
        thread: threadId,
        resource: resourceId,
      } : undefined,
    });

    return NextResponse.json({
      text: result.text,
      toolResults: result.toolResults,
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    );
  }
}
