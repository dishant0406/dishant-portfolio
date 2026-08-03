import type { ChatMessage } from '@/types';
import { LOCAL_OPENUI_SYSTEM_PROMPT } from './localOpenUiPrompt';

type LocalMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

const toLocalAssistantContent = (content: string) => {
  if (/(^|\n)\s*root\s*=/.test(content)) {
    return 'Previous assistant response was a visual portfolio card about Dishant Sharma.';
  }

  return content;
};

export const buildLocalSystemPrompt = (portfolioContext: string) => `
${LOCAL_OPENUI_SYSTEM_PROMPT}

portfolio_context:
${portfolioContext}
`.trim();

export const buildLocalWebLlmMessages = (
  messages: Array<Pick<ChatMessage, 'role' | 'content'>>,
  portfolioContext: string,
): LocalMessage[] => [
  { role: 'system', content: buildLocalSystemPrompt(portfolioContext) },
  ...messages.slice(-8).map((message) => ({
    role: message.role,
    content: message.role === 'assistant'
      ? toLocalAssistantContent(message.content)
      : message.content,
  })),
];
