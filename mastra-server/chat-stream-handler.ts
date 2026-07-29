import type { Request, Response } from 'express';
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

const completeComposeOnFirstOutput = (
  eventType: string,
  completeCompose: () => void,
) => {
  if (eventType !== 'text' && eventType !== 'thinking-start' && eventType !== 'thinking-delta') {
    return false;
  }

  completeCompose();
  return true;
};

export const streamAgentResponse = async (req: Request, res: Response) => {
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
    writer.write({
      type: 'status',
      id: 'portfolio-context',
      label: 'Preparing portfolio context',
      state: 'running',
    });
    const portfolioContext = await collectPortfolioContext(lastUserMessage.content, writer.write);
    writer.write({
      type: 'status',
      id: 'portfolio-context',
      label: 'Preparing portfolio context',
      state: 'completed',
    });
    writer.write({
      type: 'status',
      id: 'compose-response',
      label: 'Composing response',
      state: 'running',
    });

    const stream = await agent.stream(lastUserMessage.content, {
      memory: getMemoryOptions(req.body.threadId, req.body.resourceId),
      context: getModelContext(messages, portfolioContext),
      maxSteps: 1,
      toolChoice: 'none',
    });

    let startedModelOutput = false;
    const completeCompose = () => {
      if (startedModelOutput) return;
      startedModelOutput = true;
      writer.write({
        type: 'status',
        id: 'compose-response',
        label: 'Composing response',
        state: 'completed',
      });
    };

    for await (const chunk of stream.fullStream) {
      const event = streamChunkToSseEvent(chunk);
      if (!event) continue;

      completeComposeOnFirstOutput(event.type, completeCompose);
      writer.write(event);
    }

    completeCompose();
    writer.done();
  } catch (error) {
    console.error('Stream error:', error);
    writer.write({ type: 'error', error: 'Internal server error' });
    writer.done();
  } finally {
    writer.close();
  }
};
