import { mastra } from "@/mastra";
import { NextResponse } from "next/server";

const RESOURCE_ID = 'portfolio-visitor';

export async function GET() {
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
    });
  } catch (error) {
    console.error("Get threads error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    );
  }
}
