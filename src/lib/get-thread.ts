import { mastra } from "@/mastra";

export interface ThreadData {
  id: string;
  title?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export async function getThreadById(threadId: string): Promise<ThreadData | null> {
  try {
    const agent = mastra.getAgent("portfolioAgent");
    const memory = await agent.getMemory();

    if (!memory) {
      return null;
    }

    const thread = await memory.getThreadById({ threadId });

    if (!thread) {
      return null;
    }

    // Get first message for description if no metadata
    let description = thread.metadata?.description as string | undefined;
    
    if (!description) {
      try {
        const { uiMessages } = await memory.query({
          threadId,
          selectBy: {
            last: 2, // Get first couple of messages
          },
        });
        
        if (uiMessages && uiMessages.length > 0) {
          // Find first assistant message for description
          const assistantMsg = uiMessages.find((m: { role: string }) => m.role === 'assistant');
          if (assistantMsg && typeof assistantMsg.content === 'string') {
            description = assistantMsg.content.substring(0, 160).replace(/\n/g, ' ') + '...';
          }
        }
      } catch {
        // Ignore query errors
      }
    }

    return {
      id: thread.id,
      title: (thread.metadata?.title as string) || thread.title || 'Chat with Dishant',
      description: description || 'A conversation about my projects, skills, and experience.',
      createdAt: thread.createdAt?.toISOString(),
      updatedAt: thread.updatedAt?.toISOString(),
    };
  } catch (error) {
    console.error("Error fetching thread:", error);
    return null;
  }
}
