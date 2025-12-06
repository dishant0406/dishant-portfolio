import { checkApiSecurity } from "@/lib/security";
import { mastra } from "@/mastra";
import { NextRequest } from "next/server";

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
      return new Response(JSON.stringify({ error: "Messages array is required and cannot be empty" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const agent = mastra.getAgent("portfolioAgent");

    // Get the last user message
    const lastUserMessage = messages.filter((m: { role: string }) => m.role === 'user').pop();
    
    if (!lastUserMessage) {
      return new Response(JSON.stringify({ error: "At least one user message is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Call agent with the user message and memory context
    const stream = await agent.stream(lastUserMessage.content, {
      memory: threadId && resourceId ? {
        thread: threadId,
        resource: resourceId,
      } : undefined,
    });

    // Create a readable stream for the response
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          // Stream the full stream which includes tool calls
          for await (const chunk of stream.fullStream) {
            // Cast to access properties
            const c = chunk as Record<string, unknown>;
            const chunkType = c.type as string;
            const payload = c.payload as Record<string, unknown> | undefined;
            
            // Debug: Log the full chunk to see structure
            console.log('Stream chunk:', JSON.stringify(c).substring(0, 300));
            
            // Handle text delta - various possible type names
            if (chunkType === 'text-delta' || chunkType === 'textDelta' || chunkType === 'text') {
              const text = c.textDelta || payload?.textDelta || c.text || payload?.text || '';
              if (text) {
                const data = JSON.stringify({ type: 'text', text }) + "\n";
                controller.enqueue(encoder.encode(`data: ${data}\n`));
              }
            }
            // Handle tool call - various possible type names
            else if (chunkType === 'tool-call' || chunkType === 'toolCall') {
              const toolName = c.toolName || payload?.toolName || 'unknown';
              const toolCallId = c.toolCallId || payload?.toolCallId || String(Date.now());
              const args = c.args || payload?.args;
              
              const data = JSON.stringify({ 
                type: 'tool-call',
                toolName,
                toolCallId,
                args,
              }) + "\n";
              controller.enqueue(encoder.encode(`data: ${data}\n`));
            }
            // Handle tool result - various possible type names
            else if (chunkType === 'tool-result' || chunkType === 'toolResult') {
              const toolName = c.toolName || payload?.toolName || 'unknown';
              const toolCallId = c.toolCallId || payload?.toolCallId || String(Date.now());
              const result = c.result || payload?.result;
              
              const data = JSON.stringify({ 
                type: 'tool-result',
                toolName,
                toolCallId,
                result,
              }) + "\n";
              controller.enqueue(encoder.encode(`data: ${data}\n`));
            }
            // Fallback: Log unknown chunk types for debugging
            else {
              console.log('Unknown chunk type:', chunkType, Object.keys(c));
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          console.error("Stream error:", error);
          const errorData = JSON.stringify({ error: String(error) }) + "\n";
          controller.enqueue(encoder.encode(`data: ${errorData}\n`));
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
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
