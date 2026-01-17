import cors from 'cors';
import express from 'express';
import { mastra } from '../src/mastra';

const app = express();
const PORT = process.env.MASTRA_PORT || 4000;

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
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Stream the response
    for await (const chunk of stream.fullStream) {
      const c = chunk as Record<string, unknown>;
      const chunkType = c.type as string;
      const payload = c.payload as Record<string, unknown> | undefined;
      
      // Handle text delta
      if (chunkType === 'text-delta' || chunkType === 'textDelta' || chunkType === 'text') {
        const text = c.textDelta || payload?.textDelta || c.text || payload?.text || '';
        if (text) {
          res.write(`data: ${JSON.stringify({ type: 'text', text })}\n`);
        }
      }
      // Handle tool call
      else if (chunkType === 'tool-call' || chunkType === 'toolCall') {
        const toolName = c.toolName || payload?.toolName || 'unknown';
        const toolCallId = c.toolCallId || payload?.toolCallId || String(Date.now());
        const args = c.args || payload?.args;
        
        res.write(`data: ${JSON.stringify({ 
          type: 'tool-call',
          toolName,
          toolCallId,
          args,
        })}\n`);
      }
      // Handle tool result
      else if (chunkType === 'tool-result' || chunkType === 'toolResult') {
        const toolName = c.toolName || payload?.toolName || 'unknown';
        const toolCallId = c.toolCallId || payload?.toolCallId || String(Date.now());
        const result = c.result || payload?.result;
        
        res.write(`data: ${JSON.stringify({ 
          type: 'tool-result',
          toolName,
          toolCallId,
          result,
        })}\n`);
      }
      // Handle tripwire
      else if (chunkType === 'tripwire') {
        const tripwireReason = c.tripwireReason || payload?.tripwireReason || 'Request blocked by guardrails';
        res.write(`data: ${JSON.stringify({ 
          type: 'text',
          text: tripwireReason,
        })}\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error('Stream error:', error);
    res.status(500).json({ error: 'Internal server error', details: String(error) });
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

