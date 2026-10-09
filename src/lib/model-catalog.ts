/**
 * Which API protocol each OpenCode Go model speaks.
 *
 * Sending a model to a protocol it does not support answers
 * `400 ModelProtocolUnsupported`, so the protocol is a property of the model and
 * not something the operator can choose freely.
 *
 * The catalog is stored in the model config and can be re-derived from the
 * provider from /admin ("Refresh model list"). The map below is the bundled
 * fallback used when the config has no catalog, so a failed refresh can never
 * leave the admin without a usable list.
 *
 * The fallback was produced by sending every id from
 * https://opencode.ai/zen/go/v1/models to all three endpoints and recording which
 * ones answered 200. Models that answered 400 everywhere are listed with an empty
 * array so the admin UI does not offer them.
 */

import { getOpencodeRequestHeaders } from './opencode-request';

export const OPENCODE_API_TYPES = ['chat_completions', 'responses', 'anthropic_messages'] as const;

export type OpencodeApiType = (typeof OPENCODE_API_TYPES)[number];

export const OPENCODE_API_TYPE_LABELS: Record<OpencodeApiType, string> = {
  chat_completions: 'Chat completions',
  responses: 'Responses',
  anthropic_messages: 'Anthropic messages',
};

export type ModelCatalog = {
  /** ISO timestamp of when the catalog was derived. */
  updatedAt: string;
  source: 'bundled' | 'probe';
  models: Record<string, OpencodeApiType[]>;
};

// Preference order used when a model supports more than one protocol.
const API_TYPE_PREFERENCE: readonly OpencodeApiType[] = [
  'chat_completions',
  'responses',
  'anthropic_messages',
];

const BUNDLED_MODELS: Record<string, OpencodeApiType[]> = {
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const getBundledCatalog = (): ModelCatalog => ({
  updatedAt: '2026-10-09T00:00:00.000Z',
  source: 'bundled',
  models: { ...BUNDLED_MODELS },
});

/**
 * Coerces anything stored in the config into a usable catalog. An unreadable or
 * empty catalog falls back to the bundled map, so the admin and the chat server
 * always have a list to work from.
 */
export const normalizeCatalog = (rawCatalog: unknown): ModelCatalog => {
  if (!isRecord(rawCatalog) || !isRecord(rawCatalog.models)) return getBundledCatalog();

  const models: Record<string, OpencodeApiType[]> = {};

  for (const [modelId, apiTypes] of Object.entries(rawCatalog.models)) {
    if (!modelId.trim() || !Array.isArray(apiTypes)) continue;

    models[modelId.trim()] = OPENCODE_API_TYPES.filter((apiType) => apiTypes.includes(apiType));
  }

  if (Object.keys(models).length === 0) return getBundledCatalog();

  const updatedAt = typeof rawCatalog.updatedAt === 'string' && rawCatalog.updatedAt.trim()
    ? rawCatalog.updatedAt
    : new Date().toISOString();

  return { updatedAt, source: rawCatalog.source === 'probe' ? 'probe' : 'bundled', models };
};

export const getModelApiTypes = (catalog: ModelCatalog, modelId: string) =>
  catalog.models[modelId] ?? [];

export const isModelUsable = (catalog: ModelCatalog, modelId: string) =>
  getModelApiTypes(catalog, modelId).length > 0;

export const getDefaultApiType = (catalog: ModelCatalog, modelId: string): OpencodeApiType =>
  API_TYPE_PREFERENCE.find((apiType) => getModelApiTypes(catalog, modelId).includes(apiType))
    ?? 'chat_completions';

export const getCatalogModels = (catalog: ModelCatalog) =>
  Object.keys(catalog.models)
    .sort()
    .map((id) => ({
      id,
      apiTypes: catalog.models[id],
      apiLabel: describeApiTypes(catalog.models[id]),
      defaultApiType: getDefaultApiType(catalog, id),
    }));

export const describeApiTypes = (apiTypes: readonly OpencodeApiType[]) =>
  apiTypes.length === 0
    ? 'No supported protocol'
    : apiTypes.map((apiType) => OPENCODE_API_TYPE_LABELS[apiType]).join(' · ');

// ---------------------------------------------------------------------------
// Probing the provider
// ---------------------------------------------------------------------------

const PROBE_TIMEOUT_MS = 20_000;
const PROBE_CONCURRENCY = 6;

const probeRequest = (
  apiType: OpencodeApiType,
  modelId: string,
  baseURL: string,
  apiKey: string,
) => {
  const headers = getOpencodeRequestHeaders('model-catalog');

  if (apiType === 'anthropic_messages') {
    return {
      url: `${baseURL}/messages`,
      headers: { ...headers, 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: { model: modelId, max_tokens: 8, messages: [{ role: 'user', content: 'hi' }] },
    };
  }

  if (apiType === 'responses') {
    return {
      url: `${baseURL}/responses`,
      headers: { ...headers, Authorization: `Bearer ${apiKey}` },
      body: {
        model: modelId,
        input: [{ role: 'user', content: [{ type: 'input_text', text: 'hi' }] }],
        max_output_tokens: 16,
      },
    };
  }

  return {
    url: `${baseURL}/chat/completions`,
    headers: { ...headers, Authorization: `Bearer ${apiKey}` },
    body: { model: modelId, messages: [{ role: 'user', content: 'hi' }], max_tokens: 4 },
  };
};

const providerModelIds = async (baseURL: string, apiKey: string) => {
  const response = await fetch(`${baseURL}/models`, {
    headers: { ...getOpencodeRequestHeaders('model-catalog'), Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`The provider model list request failed with ${response.status}.`);
  }

  const payload: unknown = await response.json();
  const data = isRecord(payload) && Array.isArray(payload.data) ? payload.data : [];

  return data
    .map((model) => (isRecord(model) ? String(model.id ?? '').trim() : ''))
    .filter(Boolean);
};

/** Runs `run` over `items` with a bounded number of requests in flight. */
const mapWithConcurrency = async <Item, Result>(
  items: Item[],
  limit: number,
  run: (item: Item) => Promise<Result>,
) => {
  const results: Result[] = [];
  let nextIndex = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await run(items[index]);
    }
  });

  await Promise.all(workers);

  return results;
};

export type ModelCatalogProbe = {
  catalog: ModelCatalog;
  /** Ids the provider lists that reject every supported protocol. */
  unusable: string[];
  /** Requests that failed for a reason other than an unsupported protocol. */
  warnings: string[];
};

/**
 * Asks the provider which models it lists, then sends each one to all three
 * protocols to find out which it accepts.
 *
 * A model list alone is not enough: `/models` is a superset of what is actually
 * served, so listing it directly would offer models that fail every request.
 */
export const probeModelCatalog = async ({
  baseURL,
  apiKey,
}: {
  baseURL: string;
  apiKey: string;
}): Promise<ModelCatalogProbe> => {
  if (!apiKey) {
    throw new Error('An API key is required to refresh the model list.');
  }

  const modelIds = await providerModelIds(baseURL, apiKey);
  if (modelIds.length === 0) {
    throw new Error('The provider returned an empty model list.');
  }

  const warnings: string[] = [];

  const probed = await mapWithConcurrency(modelIds, PROBE_CONCURRENCY, async (modelId) => {
    const accepted: OpencodeApiType[] = [];

    for (const apiType of OPENCODE_API_TYPES) {
      const request = probeRequest(apiType, modelId, baseURL, apiKey);

      try {
        const response = await fetch(request.url, {
          method: 'POST',
          headers: { ...request.headers, 'Content-Type': 'application/json' },
          body: JSON.stringify(request.body),
          signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
        });

        if (response.ok) {
          accepted.push(apiType);
          continue;
        }

        const text = await response.text();
        if (!text.includes('ModelProtocolUnsupported')) {
          warnings.push(`${modelId} / ${apiType} -> ${response.status}`);
        }
      } catch (error) {
        warnings.push(`${modelId} / ${apiType} -> ${error instanceof Error ? error.message : error}`);
      }
    }

    return { modelId, accepted };
  });

  const models: Record<string, OpencodeApiType[]> = {};
  for (const { modelId, accepted } of probed) {
    models[modelId] = accepted;
  }

  if (!Object.values(models).some((accepted) => accepted.length > 0)) {
    throw new Error(
      'No model accepted any protocol. Check the base URL and API key, then try again.',
    );
  }

  return {
    catalog: { updatedAt: new Date().toISOString(), source: 'probe', models },
    unusable: modelIds.filter((modelId) => models[modelId].length === 0),
    warnings,
  };
};
