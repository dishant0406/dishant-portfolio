import type { WebLlmChatMessage, WebLlmWorkerRequest, WebLlmWorkerResponse } from './workerMessages';

type StreamLocalOptions = {
  requestId: string;
  modelId: string;
  messages: WebLlmChatMessage[];
  onLoading: (progress: number, text: string) => void;
  onReady: () => void;
  onText: (text: string) => void;
  signal: AbortSignal;
};

let worker: Worker | undefined;

const getWorker = () => {
  worker ||= new Worker(new URL('./webllmWorker.ts', import.meta.url), { type: 'module' });
  return worker;
};

export const cancelWebLlmGeneration = () => {
  worker?.postMessage({ type: 'cancel' } satisfies WebLlmWorkerRequest);
};

export const streamWebLlmCompletion = ({
  requestId,
  modelId,
  messages,
  onLoading,
  onReady,
  onText,
  signal,
}: StreamLocalOptions) => new Promise<void>((resolve, reject) => {
  if (signal.aborted) {
    resolve();
    return;
  }

  const activeWorker = getWorker();

  const cleanup = () => {
    signal.removeEventListener('abort', abort);
    activeWorker.removeEventListener('message', handleMessage);
  };

  const abort = () => {
    cancelWebLlmGeneration();
    cleanup();
    resolve();
  };

  const handleMessage = (event: MessageEvent<WebLlmWorkerResponse>) => {
    const message = event.data;
    if (message.requestId && message.requestId !== requestId) return;

    if (message.type === 'loading') onLoading(message.progress, message.text);
    if (message.type === 'ready') onReady();
    if (message.type === 'text') onText(message.text);
    if (message.type === 'done') {
      cleanup();
      resolve();
    }
    if (message.type === 'error') {
      cleanup();
      reject(new Error(message.error));
    }
  };

  signal.addEventListener('abort', abort, { once: true });
  activeWorker.addEventListener('message', handleMessage);
  activeWorker.postMessage({
    type: 'generate',
    requestId,
    modelId,
    messages,
  } satisfies WebLlmWorkerRequest);
});
