import { isOpenUiResponse, normalizeOpenUiResponse } from '@/openui/response';
import { Chat, LocalModelState } from '@/types';
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
  setLocalModelState: (state: Partial<LocalModelState>) => void;
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

const pushOpenUiText = (streamState: ChatStreamState, text: string) =>
  pushEvent(streamState, { type: 'text', text: normalizeOpenUiResponse(text) });

export const streamLocalResponse = async ({
  chatId,
  modelId,
  messages,
  updateChat,
  getChat,
  signal,
  isCurrentStream,
  finishStream,
  setLocalModelState,
}: LocalStreamOptions) => {
  const streamState = new ChatStreamState({ chatId, updateChat, getChat, isCurrentStream });

  try {
    setLocalModelState({
      status: 'checking',
      progress: 0,
      message: 'Checking local model support',
      error: undefined,
      modelId,
    });
    pushStatus(streamState, 'webllm-support', 'Checking local model support', 'running');
    const support = await getWebLlmSupport(modelId);
    if (!support.supported) {
      setLocalModelState({
        status: 'failed',
        progress: 0,
        message: 'Local model unavailable',
        error: support.reason,
        modelId,
      });
      pushStatus(streamState, 'webllm-support', 'Checking local model support', 'cancelled');
      pushOpenUiText(streamState, `Local WebLLM is not available here. ${support.reason || 'Use hosted mode to continue.'}`);
      streamState.finish();
      return;
    }
    pushStatus(streamState, 'webllm-support', 'Checking local model support', 'completed');

    setLocalModelState({
      status: 'preparing',
      progress: 0,
      message: 'Preparing portfolio context',
      error: undefined,
      modelId,
    });
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
      setLocalModelState({
        status: 'ready',
        progress: 100,
        message: 'Local model ready',
        error: undefined,
        modelId,
      });
      pushOpenUiText(streamState, payload.message);
      streamState.finish();
      return;
    }

    let rawLocalContent = '';
    let streamedOpenUi = false;

    setLocalModelState({
      status: 'loading',
      progress: 1,
      message: 'Loading local model',
      error: undefined,
      modelId,
    });
    pushStatus(streamState, 'webllm-model', 'Loading local model', 'running');
    await streamWebLlmCompletion({
      requestId: generateId(),
      modelId,
      messages: buildLocalWebLlmMessages(messages, payload.portfolioContext),
      signal,
      onLoading: (progress, text) => {
        const percent = Math.max(0, Math.min(100, Math.round(progress * 100)));
        setLocalModelState({
          status: 'loading',
          progress: percent,
          message: text || `Loading local model ${percent}%`,
          error: undefined,
          modelId,
        });
        pushStatus(streamState, 'webllm-model', text || `Loading local model ${percent}%`, 'running');
      },
      onReady: () => {
        setLocalModelState({
          status: 'generating',
          progress: 100,
          message: 'Composing local response',
          error: undefined,
          modelId,
        });
        pushStatus(streamState, 'webllm-model', 'Loading local model', 'completed');
        pushStatus(streamState, 'compose-response', 'Composing local response', 'running');
      },
      onText: (text) => {
        rawLocalContent += text;
        pushStatus(streamState, 'compose-response', 'Composing local response', 'completed');
        if (streamedOpenUi) {
          pushEvent(streamState, { type: 'text', text });
          return;
        }

        if (isOpenUiResponse(rawLocalContent)) {
          streamedOpenUi = true;
          streamState.replaceContent(normalizeOpenUiResponse(rawLocalContent));
        }
      },
    });

    streamState.replaceContent(normalizeOpenUiResponse(rawLocalContent));
    setLocalModelState({
      status: 'ready',
      progress: 100,
      message: 'Local model ready',
      error: undefined,
      modelId,
    });
    streamState.finish();
  } catch (error) {
    if (!isCurrentStream() || isAbortError(error)) return;

    console.error('Local streaming error:', error);
    setLocalModelState({
      status: 'failed',
      progress: 0,
      message: 'Local model failed',
      error: error instanceof Error ? error.message : String(error),
      modelId,
    });
    if (!streamState.hasContent) {
      pushOpenUiText(streamState, 'Local WebLLM could not start on this device. Switch to Hosted and try again.');
    }
    streamState.finish();
  } finally {
    finishStream();
  }
};
