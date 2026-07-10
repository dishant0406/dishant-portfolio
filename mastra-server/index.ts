import cors from 'cors';
import express from 'express';
import { mastra } from '../src/mastra';

const app = express();
const PORT = process.env.MASTRA_PORT || 4000;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const firstString = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === 'string') return value;
  }

  return '';
};

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Stream endpoint - main chat interface
app.post('/agent/stream', async (req, res) => {
  try {
    const { messages, threadId, resourceId } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required and cannot be empty' });
    }

    const agent = mastra.getAgent('portfolioAgent');

    // Get the last user message
    const lastUserMessage = messages.filter((m: { role: string }) => m.role === 'user').pop();
    
    if (!lastUserMessage) {
      return res.status(400).json({ error: 'At least one user message is required' });
    }

    // Start streaming with full message history for guardrails context
    const stream = await agent.stream(lastUserMessage.content, {
      memory: threadId && resourceId ? {
        thread: threadId,
        resource: resourceId,
      } : undefined,
      // Pass previous messages to guardrails for context on follow-up questions
      context: messages.slice(0, -1).map((m: { role: 'user' | 'assistant' | 'system'; content: string }) => ({
        role: m.role,
        content: m.role === 'system' ? m.content : (m.role === 'assistant' ? m.content : m.content),
      })),
    });

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    let responseClosed = false;
    res.on('close', () => {
      responseClosed = true;
    });

    const writeSse = (event: unknown) => {
      if (responseClosed || res.writableEnded) return;
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    // Stream the response
    for await (const chunk of stream.fullStream) {
      const c = chunk as Record<string, unknown>;
      const chunkType = c.type as string;
      const payload = isRecord(c.payload) ? c.payload : undefined;
       
      // Handle text delta
      if (chunkType === 'text-delta' || chunkType === 'textDelta') {
        const text = firstString(c.text, payload?.text, c.textDelta, payload?.textDelta);
        if (text) {
          writeSse({ type: 'text', text });
        }
      }
      // Handle tool call
      else if (chunkType === 'tool-call' || chunkType === 'toolCall') {
        const toolName = firstString(c.toolName, payload?.toolName) || 'unknown';
        const toolCallId = firstString(c.toolCallId, payload?.toolCallId) || String(Date.now());
        const args = c.args || payload?.args;
         
        writeSse({ 
          type: 'tool-call',
          toolName,
          toolCallId,
          args,
        });
      }
      // Handle tool result
      else if (chunkType === 'tool-result' || chunkType === 'toolResult') {
        const toolName = firstString(c.toolName, payload?.toolName) || 'unknown';
        const toolCallId = firstString(c.toolCallId, payload?.toolCallId) || String(Date.now());
        const result = c.result || payload?.result;
         
        writeSse({ 
          type: 'tool-result',
          toolName,
          toolCallId,
          result,
        });
      }
      // Handle tripwire
      else if (chunkType === 'tripwire') {
        const tripwireReason = firstString(c.tripwireReason, payload?.tripwireReason) || 'Request blocked by guardrails';
        writeSse({ 
          type: 'text',
          text: tripwireReason,
        });
      }
    }

    if (!responseClosed && !res.writableEnded) {
      res.write('data: [DONE]\n\n');
      res.end();
    }
  } catch (error) {
    console.error('Stream error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error', details: String(error) });
    } else if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: 'Internal server error' })}\n\n`);
      res.end();
    }
  }
});

// Regular (non-streaming) endpoint
app.post('/agent/generate', async (req, res) => {
  try {
    const { messages, threadId, resourceId } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required and cannot be empty' });
    }

    const agent = mastra.getAgent('portfolioAgent');

    // Get the last user message
    const lastUserMessage = messages.filter((m: { role: string }) => m.role === 'user').pop();
    
    if (!lastUserMessage) {
      return res.status(400).json({ error: 'At least one user message is required' });
    }

    const result = await agent.generate(lastUserMessage.content, {
      memory: threadId && resourceId ? {
        thread: threadId,
        resource: resourceId,
      } : undefined,
    });

    res.json({ 
      text: result.text,
      toolResults: result.toolResults,
    });
  } catch (error) {
    console.error('Generate error:', error);
    res.status(500).json({ error: 'Internal server error', details: String(error) });
  }
});

// Get thread history
app.get('/threads/:threadId', async (req, res) => {
  try {
    const { threadId } = req.params;

    if (!threadId) {
      return res.status(400).json({ error: 'Thread ID is required' });
    }

    const agent = mastra.getAgent('portfolioAgent');
    const memory = await agent.getMemory();

    if (!memory) {
      return res.status(500).json({ error: 'Memory not configured' });
    }

    // Get thread info
    const thread = await memory.getThreadById({ threadId });

    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    // Get messages from the thread
    const { uiMessages } = await memory.query({
      threadId,
      selectBy: {
        last: 100,
      },
    });

    res.json({
      thread,
      messages: uiMessages,
    });
  } catch (error) {
    console.error('Get thread error:', error);
    res.status(500).json({ error: 'Internal server error', details: String(error) });
  }
});

// List all threads for a resource
app.get('/threads', async (req, res) => {
  try {
    const { resourceId } = req.query;

    if (!resourceId) {
      return res.status(400).json({ error: 'resourceId query parameter is required' });
    }

    const agent = mastra.getAgent('portfolioAgent');
    const memory = await agent.getMemory();

    if (!memory) {
      return res.status(500).json({ error: 'Memory not configured' });
    }

    // Get all threads for the resource
    const threads = await memory.getThreadsByResourceId({ resourceId: resourceId as string });

    res.json({
      threads: threads || [],
    });
  } catch (error) {
    console.error('List threads error:', error);
    res.status(500).json({ error: 'Internal server error', details: String(error) });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Mastra server running on http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Stream: POST http://localhost:${PORT}/agent/stream`);
  console.log(`   Generate: POST http://localhost:${PORT}/agent/generate`);
});

export default app;
