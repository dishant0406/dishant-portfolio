import { Agent } from "@mastra/core/agent";
import type { MastraMessageV2 } from "@mastra/core/agent/message-list";
import type { TracingContext } from "@mastra/core/ai-tracing";
import type { MastraModelConfig } from "@mastra/core/llm";
import type { Processor } from "@mastra/core/processors";
import { z } from "zod";

/**
 * Portfolio Scope Processor
 * 
 * Ensures that the conversation stays focused on Dishant's portfolio.
 * Rejects questions that are not related to:
 * - Dishant's projects, work, education, skills, experience
 * - Technical questions about his code or repositories
 * - Professional background and contact information
 * 
 * Blocks questions about:
 * - General programming help
 * - Unrelated topics (news, weather, cooking, etc.)
 * - Questions about other people or companies
 * - Requests to perform unrelated tasks
 */
export class PortfolioScopeProcessor implements Processor {
  readonly name = "portfolio-scope-processor";
  private detectionAgent: Agent;

  constructor(config: { model: MastraModelConfig }) {
    this.detectionAgent = new Agent({
      name: "portfolio-scope-detector",
      instructions: `Analyze if the user's question is related to Dishant Sharma's portfolio.

ALLOWED TOPICS:
- Questions about Dishant's projects, repositories, code
- Questions about his education, work experience, skills
- Questions about his professional background
- Technical questions about his work
- Contact information requests
- Resume or portfolio requests
- "Tell me about yourself" type questions

BLOCKED TOPICS:
- General programming help unrelated to Dishant
- Coding tutorials or "how to" questions
- Questions about other people or companies
- General knowledge questions (news, weather, facts)
- Unrelated tasks (math, translation, etc.)
- Off-topic conversations

Return { "allowed": false, "reason": "..." } if the question is off-topic.
Return {} if the question is related to Dishant's portfolio.`,
      model: config.model,
    });
  }

  async processInput(args: {
    messages: MastraMessageV2[];
    abort: (reason?: string) => never;
    tracingContext?: TracingContext;
  }): Promise<MastraMessageV2[]> {
    const { messages, abort } = args;
    const lastMessage = messages[messages.length - 1];
    
    if (!lastMessage || lastMessage.role !== "user") {
      return messages;
    }

    // Extract text content from the message
    let content = "";
    const messageContent = lastMessage.content;
    
    if (messageContent.parts) {
      content = messageContent.parts
        .filter((part) => part.type === "text")
        .map((part) => (part as { type: "text"; text: string }).text)
        .join(" ");
    }

    if (!content.trim()) {
      return messages;
    }

    // Build conversation context for better follow-up question understanding
    let conversationContext = "";
    
    // Include the last 3 conversation turns (assistant + user pairs) for context
    const contextMessages = messages.slice(-6, -1);
    if (contextMessages.length > 0) {
      conversationContext = "Recent conversation:\n";
      for (const msg of contextMessages) {
        const role = msg.role === "user" ? "User" : "Assistant";
        let msgText = "";
        if (msg.content.parts) {
          msgText = msg.content.parts
            .filter((part) => part.type === "text")
            .map((part) => (part as { type: "text"; text: string }).text)
            .join(" ");
        }
        if (msgText) {
          conversationContext += `${role}: ${msgText.substring(0, 200)}...\n`;
        }
      }
      conversationContext += `\nCurrent question: ${content}`;
    } else {
      conversationContext = content;
    }

    try {
      const result = await this.detectionAgent.generate(conversationContext, {
        output: z.object({
          allowed: z.boolean().optional(),
          reason: z.string().optional(),
        }),
      });

      const detection = result.object;

      // If explicitly blocked
      if (detection?.allowed === false) {
        const reason = detection.reason || "This question is not related to Dishant's portfolio.";
        
        abort(`I'm Dishant's portfolio assistant and can only answer questions about:
- His projects and code
- His education and work experience
- His skills and technologies
- His professional background
- Contact information or resume

${reason}

Feel free to ask me anything about Dishant's work!`);
      }

      // If allowed or no detection, proceed
      return messages;
    } catch (error) {
      // If it's an abort error (from calling abort()), re-throw it
      // Abort errors have our custom message
      if (error instanceof Error && error.message.includes("I'm Dishant's portfolio assistant")) {
        throw error;
      }
      
      // For actual detection failures (API errors, etc.), fail open - allow the message
      console.warn("[PortfolioScopeProcessor] Detection failed, allowing content:", error);
      return messages;
    }
  }
}
