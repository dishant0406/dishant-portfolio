import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { getOpencodeSessionHeaders } from './opencode-session';
import { getDefaultApiType, isModelUsable, type OpencodeApiType } from './opencode-model-catalog';

export const defaultPortfolioModelId = 'deepseek-v4-flash';
export const defaultOpencodeBaseURL = 'https://opencode.ai/zen/go/v1';

const OPENCODE_PROVIDER_NAME = 'opencode-go';

/**
 * OpenCode Go asks clients to identify themselves instead of sending the
 * default SDK user agent, and requires a session id on every request.
 */
export const getOpencodeRequestHeaders = (sessionId: unknown) => ({
  'User-Agent': process.env.OPENCODE_USER_AGENT || 'dishant-portfolio/1.0',
  'HTTP-Referer': process.env.OPENCODE_HTTP_REFERER || 'https://dishantsharma.dev',
  ...getOpencodeSessionHeaders(sessionId),
});

export const getOpencodeBaseURL = () =>
  process.env.OPENCODE_BASE_URL || defaultOpencodeBaseURL;

const buildProvider = (
  baseURL: string,
  apiType: OpencodeApiType,
  sessionId: unknown,
) => {
  const apiKey = process.env.OPENCODE_API_KEY;
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
  modelId = defaultPortfolioModelId,
  baseURL = getOpencodeBaseURL(),
  sessionId?: unknown,
) => {
  const apiType = isModelUsable(modelId) ? getDefaultApiType(modelId) : 'chat_completions';

  return buildProvider(baseURL, apiType, sessionId)(modelId);
};

/** Used by the admin "test this model" action to report the real provider error. */
export const testChatModel = async (modelId: string, baseURL: string, sessionId: string) => {
  if (!isModelUsable(modelId)) {
    throw new Error(`"${modelId}" is not served by OpenCode Go over any supported protocol.`);
  }

  const apiType = getDefaultApiType(modelId);
  const model = buildProvider(baseURL, apiType, sessionId)(modelId);

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
