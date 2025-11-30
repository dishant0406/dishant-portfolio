import { mastra } from "@/mastra";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const { threadId } = await params;

    if (!threadId) {
      return NextResponse.json(
        { error: "Thread ID is required" },
        { status: 400 }
      );
    }

    const agent = mastra.getAgent("portfolioAgent");
    const memory = await agent.getMemory();

    if (!memory) {
      return NextResponse.json(
        { error: "Memory not configured" },
        { status: 500 }
      );
    }

    // Get thread info
    const thread = await memory.getThreadById({ threadId });

    if (!thread) {
      return NextResponse.json(
        { error: "Thread not found" },
        { status: 404 }
      );
    }

    // Get messages from the thread
    const { uiMessages } = await memory.query({
      threadId,
      selectBy: {
        last: 100, // Get last 100 messages
      },
    });

    return NextResponse.json({
      thread,
      messages: uiMessages,
    });
  } catch (error) {
    console.error("Get chat error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    );
  }
}
