import { Chat } from '@/types';
import { RESOURCE_ID } from './chatIds';
import { ChatStreamState, stopStreamingMessages } from './chatStreamState';
import { extractSseData, findSseBoundary, isAbortError, yieldToBrowser } from './sseClient';

type StreamResponseOptions = {
  chatId: string;
  messages: Array<{ role: string; content: string }>;
  updateChat: (id: string, updates: Partial<Chat>) => void;
  getChat: () => Chat | undefined;
  signal: AbortSignal;
  isCurrentStream: () => boolean;
  finishStream: () => void;
};

const readStreamEvents = async (
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onEvent: (event: string) => void,
) => {
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    let boundary = findSseBoundary(buffer);
    while (boundary) {
      const event = buffer.slice(0, boundary.index);
      buffer = buffer.slice(boundary.index + boundary.length);
      onEvent(event);
      await yieldToBrowser();
      boundary = findSseBoundary(buffer);
    }
  }

  buffer += decoder.decode();
  if (buffer.trim()) onEvent(buffer);
};

export { stopStreamingMessages };

export const streamResponse = async ({
  chatId,
  messages,
  updateChat,
  getChat,
  signal,
  isCurrentStream,
  finishStream,
}: StreamResponseOptions) => {
  const streamState = new ChatStreamState({
    chatId,
    updateChat,
    getChat,
    isCurrentStream,
  });

  try {
    const response = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({ messages, threadId: chatId, resourceId: RESOURCE_ID }),
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No reader available');

    await readStreamEvents(reader, (event) => {
      streamState.processData(extractSseData(event));
    });
    streamState.finish();
  } catch (error) {
    if (!isCurrentStream() || isAbortError(error)) return;

    console.error('Streaming error:', error);
    streamState.fail();
  } finally {
    finishStream();
  }
};
