import type { Express, Request, Response } from 'express';
import { mastra } from '../src/mastra';
import { looksLikePromptInjection } from '../src/mastra/agents/input-processors/local-guardrails-processor';
import { collectPortfolioContext } from './portfolio-context';
import { createSseWriter, streamChunkToSseEvent } from './sse';

type ChatMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

const getLastUserMessage = (messages: ChatMessage[]) =>
  messages.filter((message) => message.role === 'user').pop();

const getMemoryOptions = (threadId: unknown, resourceId: unknown) => {
  if (typeof threadId !== 'string' || typeof resourceId !== 'string') return undefined;
  if (!threadId || !resourceId) return undefined;

  return {
    thread: threadId,
    resource: resourceId,
  };
};

const getContextMessages = (messages: ChatMessage[]) =>
  messages.slice(0, -1).map((message) => ({
    role: message.role,
    content: message.content,
  }));

const getModelContext = (messages: ChatMessage[], portfolioContext: string) => [
  ...getContextMessages(messages),
  {
    role: 'system' as const,
    content: [
      'The server has already fetched current portfolio data through internal tools.',
      'Do not call tools for this response. Use only the supplied portfolio_context and conversation.',
      'portfolio_context:',
      portfolioContext,
    ].join('\n'),
  },
];

const validateMessages = (req: Request, res: Response): ChatMessage[] | null => {
  const { messages } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: 'Messages array is required and cannot be empty' });
    return null;
  }

  const validMessages = messages.filter(
    (message): message is ChatMessage =>
      message &&
      typeof message === 'object' &&
      ['user', 'assistant', 'system'].includes(message.role) &&
      typeof message.content === 'string',
  );

  if (validMessages.length !== messages.length) {
    res.status(400).json({ error: 'Messages must include role and string content' });
    return null;
  }

  return validMessages;
};

const streamAgentResponse = async (req: Request, res: Response) => {
  const messages = validateMessages(req, res);
  if (!messages) return;

  const lastUserMessage = getLastUserMessage(messages);
  if (!lastUserMessage) {
    res.status(400).json({ error: 'At least one user message is required' });
    return;
  }

  const writer = createSseWriter(res);
  const guardrailsMode = String(process.env.GUARDRAILS_MODE || 'fast').toLowerCase();

  if (guardrailsMode !== 'off' && looksLikePromptInjection(lastUserMessage.content)) {
    writer.write({ type: 'text', text: 'Request blocked by local guardrails.' });
    writer.done();
    writer.close();
    return;
  }

  try {
    const agent = mastra.getAgent('portfolioAgent');
    const portfolioContext = await collectPortfolioContext(lastUserMessage.content, writer.write);
    const stream = await agent.stream(lastUserMessage.content, {
      memory: getMemoryOptions(req.body.threadId, req.body.resourceId),
      context: getModelContext(messages, portfolioContext),
      maxSteps: 1,
      toolChoice: 'none',
    });

    for await (const chunk of stream.fullStream) {
      const event = streamChunkToSseEvent(chunk);
      if (event) writer.write(event);
    }

    writer.done();
  } catch (error) {
    console.error('Stream error:', error);
    writer.write({ type: 'error', error: 'Internal server error' });
    writer.done();
  } finally {
    writer.close();
  }
};

const getAgentMemory = async () => {
  const agent = mastra.getAgent('portfolioAgent');
  return agent.getMemory();
};

export const registerChatRoutes = (app: Express) => {
  app.post('/agent/stream', streamAgentResponse);

  app.get('/threads/:threadId', async (req, res) => {
    try {
      const { threadId } = req.params;

      if (!threadId) {
        return res.status(400).json({ error: 'Thread ID is required' });
      }

      const memory = await getAgentMemory();
      if (!memory) {
        return res.status(500).json({ error: 'Memory not configured' });
      }

      const thread = await memory.getThreadById({ threadId });
      if (!thread) {
        return res.status(404).json({ error: 'Thread not found' });
      }

      const { uiMessages } = await memory.query({
        threadId,
        selectBy: { last: 100 },
      });

      res.json({ thread, messages: uiMessages });
    } catch (error) {
      console.error('Get thread error:', error);
      res.status(500).json({ error: 'Internal server error', details: String(error) });
    }
  });

  app.get('/threads', async (req, res) => {
    try {
      const { resourceId } = req.query;

      if (typeof resourceId !== 'string' || !resourceId) {
        return res.status(400).json({ error: 'resourceId query parameter is required' });
      }

      const memory = await getAgentMemory();
      if (!memory) {
        return res.status(500).json({ error: 'Memory not configured' });
      }

      const threads = await memory.getThreadsByResourceId({ resourceId });
      res.json({ threads: threads || [] });
    } catch (error) {
      console.error('List threads error:', error);
      res.status(500).json({ error: 'Internal server error', details: String(error) });
    }
  });
};
