import type { Request, Response } from 'express';

export type ChatMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export const getLastUserMessage = (messages: ChatMessage[]) =>
  messages.filter((message) => message.role === 'user').pop();

export const getMemoryOptions = (threadId: unknown, resourceId: unknown) => {
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

export const getModelContext = (messages: ChatMessage[], portfolioContext: string) => [
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

export const validateMessages = (req: Request, res: Response): ChatMessage[] | null => {
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
