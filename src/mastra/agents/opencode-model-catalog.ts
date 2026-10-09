/**
 * OpenCode Go serves its models across three different API protocols. Sending a
 * model to a protocol it does not support returns
 * `400 ModelProtocolUnsupported`, so the protocol is a property of the model and
 * not something the caller can choose freely.
 *
 * The map below was produced by sending every id from
 * https://opencode.ai/zen/go/v1/models to all three endpoints and recording which
 * ones answered `200`. Models that answered `400` everywhere are listed with an
 * empty array so the admin UI does not offer them.
 *
 * Re-verify with `pnpm check:models` when the provider adds or retires models.
 */

export const OPENCODE_API_TYPES = [
  'chat_completions',
  'responses',
  'anthropic_messages',
] as const;

export type OpencodeApiType = (typeof OPENCODE_API_TYPES)[number];

export const OPENCODE_API_TYPE_LABELS: Record<OpencodeApiType, string> = {
  chat_completions: 'Chat completions',
  responses: 'Responses',
  anthropic_messages: 'Anthropic messages',
};

// Preference order used when a model supports more than one protocol.
const API_TYPE_PREFERENCE: readonly OpencodeApiType[] = [
  'chat_completions',
  'responses',
  'anthropic_messages',
];

const MODEL_API_TYPES: Record<string, readonly OpencodeApiType[]> = {
  'claude-haiku-5-5': ['anthropic_messages'],
  'deepseek-flash': ['chat_completions', 'responses', 'anthropic_messages'],
  'deepseek-v4-flash': ['chat_completions', 'responses', 'anthropic_messages'],
  'deepseek-v4-flash-vision-exp': ['chat_completions', 'responses', 'anthropic_messages'],
  'deepseek-v4-pro': ['chat_completions', 'responses', 'anthropic_messages'],
  'deepseek-v4.1-flash': ['chat_completions', 'responses', 'anthropic_messages'],
  'glm-5': [],
  'glm-5.1': ['chat_completions'],
  'glm-5.2': ['chat_completions'],
  'glm-5.3': ['chat_completions'],
  'glm-5.3-flash': ['chat_completions'],
  'gpt-5.6-luna': ['responses'],
  'gpt-6-luna': ['responses'],
  'grok-4.5': [],
  'grok-4.6': ['responses'],
  'grok-4.7': ['responses'],
  'hy3': ['chat_completions'],
  'hy3-preview': [],
  'hy4-preview': ['chat_completions'],
  'kimi-k2.5': [],
  'kimi-k2.6': ['chat_completions'],
  'kimi-k2.7-code': ['chat_completions'],
  'kimi-k3': ['chat_completions', 'anthropic_messages'],
  'longcat-2.0': ['chat_completions'],
  'longcat-2.5-preview-free': ['chat_completions'],
  'mimo-v2-omni': [],
  'mimo-v2-pro': [],
  'mimo-v2.5': ['chat_completions'],
  'mimo-v2.5-pro': ['chat_completions'],
  'mimo-v2.6-flash': ['chat_completions'],
  'mimo-v2.6-pro': ['chat_completions'],
  'minimax-m2.5': ['chat_completions', 'anthropic_messages'],
  'minimax-m2.7': ['anthropic_messages'],
  'minimax-m3': ['chat_completions', 'anthropic_messages'],
  'muse-spark-1.2-contributor': ['responses'],
  'muse-spark-1.3-contributor': ['responses'],
  'omen-alpha': ['chat_completions'],
  'qwen3.5-plus': [],
  'qwen3.6-plus': ['chat_completions', 'anthropic_messages'],
  'qwen3.7-max': ['chat_completions', 'anthropic_messages'],
  'qwen3.7-plus': ['chat_completions', 'anthropic_messages'],
  'qwen3.8-flash': ['chat_completions', 'anthropic_messages'],
  'qwen3.8-max': ['chat_completions', 'anthropic_messages'],
  'space-bunny': ['chat_completions', 'anthropic_messages'],
  'step-5-preview-free': ['chat_completions'],
};

export const DEFAULT_OPENCODE_API_TYPE: OpencodeApiType = 'chat_completions';

export const getModelApiTypes = (modelId: string): readonly OpencodeApiType[] =>
  MODEL_API_TYPES[modelId] ?? [];

/** Models the provider lists but which reject every protocol. */
export const isModelUsable = (modelId: string) => getModelApiTypes(modelId).length > 0;

export const getDefaultApiType = (modelId: string): OpencodeApiType => {
  const supported = getModelApiTypes(modelId);

  return API_TYPE_PREFERENCE.find((apiType) => supported.includes(apiType))
    ?? DEFAULT_OPENCODE_API_TYPE;
};

export const getCatalogModels = () =>
  Object.keys(MODEL_API_TYPES)
    .sort()
    .map((id) => ({ id, apiTypes: MODEL_API_TYPES[id] }));
