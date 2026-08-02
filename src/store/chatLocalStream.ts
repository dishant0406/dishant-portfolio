import { Chat } from '@/types';
import { buildLocalWebLlmMessages } from '@/webllm/localPrompt';
import { getWebLlmSupport } from '@/webllm/support';
import { streamWebLlmCompletion } from '@/webllm/webllmClient';
import { RESOURCE_ID, generateId } from './chatIds';
import { ChatStreamState } from './chatStreamState';
import { isAbortError } from './sseClient';

type LocalStreamOptions = {
  chatId: string;
  modelId: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  updateChat: (id: string, updates: Partial<Chat>) => void;
  getChat: () => Chat | undefined;
  signal: AbortSignal;
  isCurrentStream: () => boolean;
  finishStream: () => void;
};

type LocalPrepareResponse =
  | { allowed: false; message: string; events?: unknown[] }
  | { allowed: true; portfolioContext: string; events?: unknown[] };

const pushEvent = (streamState: ChatStreamState, event: unknown) => {
  streamState.processData(JSON.stringify(event));
};

const pushStatus = (
  streamState: ChatStreamState,
  id: string,
  label: string,
  state: 'running' | 'completed' | 'cancelled',
) => {
  pushEvent(streamState, { type: 'status', id, label, state });
};

export const streamLocalResponse = async ({
  chatId,
  modelId,
  messages,
  updateChat,
  getChat,
  signal,
  isCurrentStream,
  finishStream,
}: LocalStreamOptions) => {
  const streamState = new ChatStreamState({ chatId, updateChat, getChat, isCurrentStream });

  try {
    pushStatus(streamState, 'webllm-support', 'Checking local model support', 'running');
    const support = await getWebLlmSupport(modelId);
    if (!support.supported) {
      pushStatus(streamState, 'webllm-support', 'Checking local model support', 'cancelled');
      pushEvent(streamState, {
        type: 'text',
        text: `Local WebLLM is not available here. ${support.reason || 'Use hosted mode to continue.'}`,
      });
      streamState.finish();
      return;
    }
    pushStatus(streamState, 'webllm-support', 'Checking local model support', 'completed');

    pushStatus(streamState, 'local-context', 'Preparing local context', 'running');
    const response = await fetch('/api/chat/prepare-local', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({ messages, threadId: chatId, resourceId: RESOURCE_ID }),
    });

    if (!response.ok) throw new Error(`Local prepare failed: ${response.status}`);

    const payload = await response.json() as LocalPrepareResponse;
    payload.events?.forEach((event) => pushEvent(streamState, event));
    pushStatus(streamState, 'local-context', 'Preparing local context', 'completed');

    if (!payload.allowed) {
      pushEvent(streamState, { type: 'text', text: payload.message });
      streamState.finish();
      return;
    }

    pushStatus(streamState, 'webllm-model', 'Loading local model', 'running');
    await streamWebLlmCompletion({
      requestId: generateId(),
      modelId,
      messages: buildLocalWebLlmMessages(messages, payload.portfolioContext),
      signal,
      onLoading: (progress, text) => {
        const percent = Math.max(0, Math.min(100, Math.round(progress * 100)));
        pushStatus(streamState, 'webllm-model', text || `Loading local model ${percent}%`, 'running');
      },
      onReady: () => {
        pushStatus(streamState, 'webllm-model', 'Loading local model', 'completed');
        pushStatus(streamState, 'compose-response', 'Composing local response', 'running');
      },
      onText: (text) => {
        pushStatus(streamState, 'compose-response', 'Composing local response', 'completed');
        pushEvent(streamState, { type: 'text', text });
      },
    });

    streamState.finish();
  } catch (error) {
    if (!isCurrentStream() || isAbortError(error)) return;

    console.error('Local streaming error:', error);
    if (!streamState.hasContent) {
      pushEvent(streamState, {
        type: 'text',
        text: `Local WebLLM failed before it could answer. ${error instanceof Error ? error.message : String(error)}`,
      });
    }
    streamState.finish();
  } finally {
    finishStream();
  }
};
