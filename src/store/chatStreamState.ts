import { Chat, ChatMessage, StreamStatus, ThinkingTrace, ToolCall } from '@/types';
import { generateId } from './chatIds';

type StreamStateOptions = {
  chatId: string;
  updateChat: (id: string, updates: Partial<Chat>) => void;
  getChat: () => Chat | undefined;
  isCurrentStream: () => boolean;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const setStatusEvent = (
  events: StreamStatus[],
  next: Omit<StreamStatus, 'timestamp'>,
) => {
  const statusEvent = { ...next, timestamp: new Date() };
  const existingIndex = events.findIndex((event) => event.id === next.id);

  if (existingIndex === -1) return [...events, statusEvent];

  return events.map((event, index) => (
    index === existingIndex ? statusEvent : event
  ));
};

const finishThinking = (thinking?: ThinkingTrace) => (
  thinking ? { ...thinking, isStreaming: false, updatedAt: new Date() } : undefined
);

export const stopStreamingMessages = (messages: ChatMessage[]) =>
  messages.map((message) => {
    if (!message.isStreaming) return message;

    return {
      ...message,
      isStreaming: false,
      thinking: finishThinking(message.thinking),
      statusEvents: message.statusEvents?.map((event) => (
        event.state === 'running' ? { ...event, state: 'cancelled' as const } : event
      )),
    };
  });

export class ChatStreamState {
  private messageId = generateId();
  private fullContent = '';
  private toolCalls: ToolCall[] = [];
  private thinking: ThinkingTrace | undefined;
  private statusEvents: StreamStatus[] = [];
  private assistantMessage: ChatMessage = {
    id: this.messageId,
    role: 'assistant',
    content: '',
    timestamp: new Date(),
    isStreaming: true,
    toolCalls: [],
  };

  constructor(private options: StreamStateOptions) {}

  get hasContent() {
    return Boolean(this.fullContent);
  }

  updateMessage(isStreaming = true) {
    if (!this.options.isCurrentStream()) return;

    const chat = this.options.getChat();
    if (!chat?.messages) return;

    const updatedMessages = chat.messages.filter((message) => message.id !== this.messageId);
    this.options.updateChat(this.options.chatId, {
      messages: [...updatedMessages, {
        ...this.assistantMessage,
        content: this.fullContent,
        toolCalls: [...this.toolCalls],
        thinking: this.thinking,
        statusEvents: [...this.statusEvents],
        isStreaming,
      }],
      description: this.fullContent ? `${this.fullContent.substring(0, 150)}...` : chat.description,
      updatedAt: new Date(),
    });
  }

  processData(data: string) {
    if (!data || data === '[DONE]') return;

    let parsed: unknown;
    try {
      parsed = JSON.parse(data);
    } catch {
      return;
    }

    if (!isRecord(parsed)) return;

    if (parsed.type === 'text' && typeof parsed.text === 'string' && parsed.text.length > 0) {
      this.fullContent += parsed.text;
      this.updateMessage();
      return;
    }

    if (parsed.type === 'thinking-start') {
      this.thinking = this.thinking || { content: '', isStreaming: true, startedAt: new Date() };
      this.thinking = { ...this.thinking, isStreaming: true, updatedAt: new Date() };
      this.updateMessage();
      return;
    }

    if (parsed.type === 'thinking-delta' && typeof parsed.text === 'string') {
      this.thinking = this.thinking || { content: '', isStreaming: true, startedAt: new Date() };
      this.thinking = {
        ...this.thinking,
        content: `${this.thinking.content}${parsed.text}`,
        isStreaming: true,
        updatedAt: new Date(),
      };
      this.updateMessage();
      return;
    }

    if (parsed.type === 'thinking-end') {
      this.thinking = finishThinking(this.thinking);
      this.updateMessage();
      return;
    }

    if (parsed.type === 'status' && typeof parsed.id === 'string' && typeof parsed.label === 'string') {
      this.statusEvents = setStatusEvent(this.statusEvents, {
        id: parsed.id,
        label: parsed.label,
        state: parsed.state === 'completed' || parsed.state === 'cancelled'
          ? parsed.state
          : 'running',
      });
      this.updateMessage();
      return;
    }

    if (parsed.type === 'tool-call') {
      const toolCallId = typeof parsed.toolCallId === 'string' ? parsed.toolCallId : generateId();
      const toolName = typeof parsed.toolName === 'string' ? parsed.toolName : 'unknown';

      this.toolCalls = [...this.toolCalls.filter((tool) => tool.id !== toolCallId), {
        id: toolCallId,
        toolName,
        args: parsed.args,
        status: 'running',
      }];
      this.updateMessage();
      return;
    }

    if (parsed.type === 'tool-result') {
      const toolCallId = typeof parsed.toolCallId === 'string' ? parsed.toolCallId : '';
      if (!toolCallId) return;

      const existingToolCall = this.toolCalls.find((tool) => tool.id === toolCallId);
      this.toolCalls = existingToolCall
        ? this.toolCalls.map((tool) => (
          tool.id === toolCallId ? { ...tool, status: 'completed', result: parsed.result } : tool
        ))
        : [...this.toolCalls, {
          id: toolCallId,
          toolName: typeof parsed.toolName === 'string' ? parsed.toolName : 'unknown',
          status: 'completed',
          result: parsed.result,
        }];
      this.updateMessage();
      return;
    }

    if (parsed.type === 'error') {
      throw new Error(typeof parsed.error === 'string' ? parsed.error : 'Stream error');
    }
  }

  replaceContent(content: string, isStreaming = true) {
    this.fullContent = content;
    this.updateMessage(isStreaming);
  }

  finish() {
    this.thinking = finishThinking(this.thinking);
    this.statusEvents = this.statusEvents.map((event) => (
      event.state === 'running' ? { ...event, state: 'completed' as const } : event
    ));
    this.updateMessage(false);
  }

  fail() {
    if (!this.fullContent) this.fullContent = 'Sorry, the stream failed before a response started. Please try again.';
    this.thinking = finishThinking(this.thinking);
    this.updateMessage(false);
  }
}
