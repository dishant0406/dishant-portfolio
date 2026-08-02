import type { ChatMessage } from '@/types';

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
You are Dishant Sharma's local portfolio assistant running inside the visitor's browser.
Answer only from the supplied portfolio context and the recent conversation.
If a detail is not present, say that you do not have that detail.
Keep answers concise, useful, and portfolio-focused.
Use plain Markdown only. Do not output OpenUI, JSON, or code unless the user asks about a repository.

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
