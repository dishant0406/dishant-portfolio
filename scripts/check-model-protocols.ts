/**
 * Re-derives the model → protocol map in opencode-model-catalog.ts by sending
 * every model the provider lists to all three endpoints.
 *
 * Run this when OpenCode Go adds or retires models, then update the catalog with
 * whatever it prints. Requires OPENCODE_API_KEY.
 *
 *   pnpm check:models
 */

import { OPENCODE_API_TYPES } from '../src/mastra/agents/opencode-model-catalog';
import { getOpencodeRequestHeaders } from '../src/mastra/agents/opencode-chat-model';
import { DEFAULT_BASE_URL } from '../src/lib/model-config';

type ApiType = (typeof OPENCODE_API_TYPES)[number];

const baseURL = process.env.OPENCODE_BASE_URL || DEFAULT_BASE_URL;
const apiKey = process.env.OPENCODE_API_KEY;

if (!apiKey) {
  console.error('OPENCODE_API_KEY is required.');
  process.exitCode = 1;
} else {
  const headers = { ...getOpencodeRequestHeaders('model-check'), 'Content-Type': 'application/json' };

  const requests: Record<ApiType, (model: string) => { url: string; headers: Record<string, string>; body: unknown }> = {
    chat_completions: (model) => ({
      url: `${baseURL}/chat/completions`,
      headers: { Authorization: `Bearer ${apiKey}` },
      body: { model, messages: [{ role: 'user', content: 'hi' }], max_tokens: 4 },
    }),
    responses: (model) => ({
      url: `${baseURL}/responses`,
      headers: { Authorization: `Bearer ${apiKey}` },
      body: {
        model,
        input: [{ role: 'user', content: [{ type: 'input_text', text: 'hi' }] }],
        max_output_tokens: 16,
      },
    }),
    anthropic_messages: (model) => ({
      url: `${baseURL}/messages`,
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: { model, max_tokens: 8, messages: [{ role: 'user', content: 'hi' }] },
    }),
  };

  const listModels = async () => {
    const response = await fetch(`${baseURL}/models`);
    if (!response.ok) throw new Error(`Model list failed with ${response.status}`);

    const payload = (await response.json()) as { data?: Array<{ id: string }> };
    return (payload.data ?? []).map((model) => model.id);
  };

  const run = async () => {
    const modelIds = await listModels();
    const supported: Record<string, ApiType[]> = {};

    for (const modelId of modelIds) {
      supported[modelId] = [];

      for (const apiType of OPENCODE_API_TYPES) {
        const spec = requests[apiType](modelId);
        const response = await fetch(spec.url, {
          method: 'POST',
          headers: { ...headers, ...spec.headers },
          body: JSON.stringify(spec.body),
        });

        if (response.ok) {
          supported[modelId].push(apiType);
          continue;
        }

        const text = await response.text();
        if (!text.includes('ModelProtocolUnsupported')) {
          console.warn(`${modelId} / ${apiType} -> ${response.status} ${text.slice(0, 120)}`);
        }
      }
    }

    console.log(JSON.stringify(supported, null, 2));
  };

  run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
