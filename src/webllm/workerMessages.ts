export type WebLlmChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type WebLlmWorkerRequest =
  | {
      type: 'generate';
      requestId: string;
      modelId: string;
      messages: WebLlmChatMessage[];
    }
  | { type: 'cancel' }
  | { type: 'unload' };

export type WebLlmWorkerResponse =
  | { type: 'loading'; requestId: string; progress: number; text: string }
  | { type: 'ready'; requestId: string; modelId: string }
  | { type: 'text'; requestId: string; text: string }
  | { type: 'done'; requestId: string }
  | { type: 'error'; requestId?: string; error: string };
