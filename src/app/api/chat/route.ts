import { checkRateLimit, createRateLimitResponse, getClientIP } from "@/lib/rate-limit";
import { mastra } from "@/mastra";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  // Rate limiting - 1 message per second per IP
  const clientIP = getClientIP(request);
  const rateLimitResult = checkRateLimit(clientIP);
  
  if (!rateLimitResult.success) {
    return createRateLimitResponse(rateLimitResult.resetIn);
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
