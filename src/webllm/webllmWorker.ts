import {
  CreateMLCEngine,
  type MLCEngine,
} from '@mlc-ai/web-llm';
import { createWebLlmAppConfig } from './appConfig';
import type { WebLlmWorkerRequest, WebLlmWorkerResponse } from './workerMessages';

let engine: MLCEngine | undefined;
let loadedModelId = '';
let activeRequestId = '';

const post = (message: WebLlmWorkerResponse) => {
  self.postMessage(message);
};

const appConfig = createWebLlmAppConfig();

const loadEngine = async (modelId: string, requestId: string) => {
  if (engine && loadedModelId === modelId) return engine;

  if (engine) await engine.unload();
  loadedModelId = '';

  engine = await CreateMLCEngine(modelId, {
    appConfig,
    initProgressCallback: (report) => {
      post({
        type: 'loading',
        requestId,
        progress: report.progress,
        text: report.text,
      });
    },
    logLevel: 'WARN',
  });
  loadedModelId = modelId;
  post({ type: 'ready', requestId, modelId });

  return engine;
};

const generate = async (request: Extract<WebLlmWorkerRequest, { type: 'generate' }>) => {
  activeRequestId = request.requestId;
  const currentEngine = await loadEngine(request.modelId, request.requestId);
  const chunks = await currentEngine.chat.completions.create({
    messages: request.messages,
    stream: true,
    max_tokens: 700,
    temperature: 0.25,
    top_p: 0.9,
    model: request.modelId,
    extra_body: { enable_thinking: false },
  });

  for await (const chunk of chunks) {
    if (activeRequestId !== request.requestId) return;

    const text = chunk.choices[0]?.delta?.content || '';
    if (text) post({ type: 'text', requestId: request.requestId, text });
  }

  post({ type: 'done', requestId: request.requestId });
};

self.onmessage = async (event: MessageEvent<WebLlmWorkerRequest>) => {
  const message = event.data;

  try {
    if (message.type === 'cancel') {
      activeRequestId = '';
      await engine?.interruptGenerate();
      return;
    }

    if (message.type === 'unload') {
      activeRequestId = '';
      await engine?.unload();
      engine = undefined;
      loadedModelId = '';
      return;
    }

    await generate(message);
  } catch (error) {
    post({
      type: 'error',
      requestId: 'requestId' in message ? message.requestId : undefined,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
