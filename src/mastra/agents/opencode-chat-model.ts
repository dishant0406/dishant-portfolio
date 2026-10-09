import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { getOpencodeRequestHeaders } from '../../lib/opencode-request';
import { getDefaultApiType, isModelUsable, type OpencodeApiType } from '../../lib/model-catalog';
import type { ModelConfig } from '../../lib/model-config';

const OPENCODE_PROVIDER_NAME = 'opencode-go';

/** How a single call reaches the provider. */
export type ProviderConnection = {
  baseURL: string;
  apiKey: string;
  sessionId: unknown;
  catalog: ModelConfig['modelCatalog'];
};

export const getProviderConnection = (
  config: ModelConfig,
  sessionId: unknown,
  baseURL = config.baseURL,
): ProviderConnection => ({
  baseURL,
  apiKey: config.apiKey,
  sessionId,
  catalog: config.modelCatalog,
});

const buildProvider = (connection: ProviderConnection, apiType: OpencodeApiType) => {
  const { apiKey, baseURL, sessionId } = connection;
  const headers = getOpencodeRequestHeaders(sessionId);

  if (apiType === 'anthropic_messages') {
    return createAnthropic({ apiKey, baseURL, headers });
  }

  if (apiType === 'responses') {
    return createOpenAI({ name: OPENCODE_PROVIDER_NAME, apiKey, baseURL, headers });
  }

  return createOpenAICompatible({ name: OPENCODE_PROVIDER_NAME, apiKey, baseURL, headers });
};

/**
 * Builds the language model for a model id.
 *
 * The API protocol is a property of the model (OpenCode Go answers
 * `400 ModelProtocolUnsupported` for the wrong one), so it is derived from the
 * catalog rather than passed in. An unknown model id falls back to the default
 * protocol, which is what custom/self-hosted base URLs need.
 */
export const getChatModel = (
  modelId: string,
  connection: ProviderConnection,
) => {
  const apiType = isModelUsable(connection.catalog, modelId)
    ? getDefaultApiType(connection.catalog, modelId)
    : 'chat_completions';

  return buildProvider(connection, apiType)(modelId);
};

/**
 * Turns a provider failure into something an operator can act on.
 *
 * The SDK reports a bare status text ("Bad Request") when the provider sends no
 * message, which is exactly the kind of unhelpful error that let the guardrail
 * outage go unnoticed. The status code, the endpoint and the provider's own
 * message are all worth surfacing here; the request headers are not, because
 * they carry the API key.
 */
export const describeProviderError = (error: unknown) => {
  if (!(error instanceof Error)) return String(error);

  const details = error as Error & { statusCode?: number; responseBody?: string; url?: string };
  const parts = [details.message || 'The provider rejected the request'];

  if (details.statusCode) parts.push(`(HTTP ${details.statusCode})`);

  const providerMessage = readProviderMessage(details.responseBody);
  if (providerMessage && !parts[0].includes(providerMessage)) parts.push(`— ${providerMessage}`);

  if (details.url) parts.push(`at ${details.url}`);

  return parts.join(' ');
};

const readProviderMessage = (responseBody: string | undefined) => {
  if (!responseBody) return '';

  try {
    const payload: unknown = JSON.parse(responseBody);
    if (typeof payload !== 'object' || payload === null) return '';

    const error = (payload as { error?: unknown }).error;
    if (typeof error === 'string') return error.slice(0, 300);
    if (typeof error === 'object' && error !== null) {
      const message = (error as { message?: unknown }).message;
      if (typeof message === 'string') return message.slice(0, 300);
    }

    const message = (payload as { message?: unknown }).message;
    return typeof message === 'string' ? message.slice(0, 300) : '';
  } catch {
    return responseBody.slice(0, 300);
  }
};

/** Used by the admin "test this model" action to report the real provider error. */
export const testChatModel = async (
  modelId: string,
  connection: ProviderConnection,
) => {
  if (!isModelUsable(connection.catalog, modelId)) {
    throw new Error(`"${modelId}" is not served over any protocol in the model catalog.`);
  }

  // The SDK omits the Authorization header rather than failing when the key is
  // empty, which would surface as an unexplained 401 from the provider.
  if (!connection.apiKey) {
    throw new Error('No API key is configured. Add one in the Provider section and save.');
  }

  const apiType = getDefaultApiType(connection.catalog, modelId);
  const model = buildProvider(connection, apiType)(modelId);

  // Reasoning models put their output in `reasoning_content` unless thinking is
  // disabled, which would make the test report an empty reply. Disable it here
  // so the reply reflects what a chat request actually produces.
  const providerOptions = apiType === 'chat_completions'
    ? { [OPENCODE_PROVIDER_NAME]: { thinking: { type: 'disabled' as const } } }
    : undefined;

  const result = await model.doGenerate({
    prompt: [{ role: 'user', content: [{ type: 'text', text: 'Reply with the single word: OK' }] }],
    maxOutputTokens: 64,
    providerOptions,
  });

  const text = result.content
    .map((part: { type: string; text?: string }) => (part.type === 'text' ? part.text ?? '' : ''))
    .join('')
    .trim();

  return { apiType, text };
};
