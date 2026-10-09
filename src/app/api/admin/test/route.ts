import { NextRequest } from 'next/server';
import { adminJson, isSameOriginRequest, requireAdminApi } from '@/lib/admin-auth';
import { getAdminTestSessionId } from '@/lib/mastra-admin';
import { normalizeModelConfig, readModelConfig, resolveAdminConnection, resolveGuardrailBaseURL } from '@/lib/model-config';
import { getModelApiTypes, isModelUsable } from '@/lib/model-catalog';
import { describeProviderError, getProviderConnection, testChatModel } from '@/mastra/agents/opencode-chat-model';

/**
 * Makes one small call to the selected model and reports the real provider
 * result. This is the check that was missing when the guardrail silently failed
 * for weeks.
 *
 * The form can pass the endpoint and key it has not saved yet, so a connection
 * can be verified before it is stored. The key is never echoed back.
 */
export async function POST(request: NextRequest) {
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;

  if (!isSameOriginRequest(request)) {
    return adminJson({ error: 'Cross-origin requests are not allowed.' }, 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return adminJson({ error: 'Invalid JSON body' }, 400);
  }

  const readField = (field: string) =>
    body && typeof body === 'object' && field in body
      ? String((body as Record<string, unknown>)[field] ?? '').trim()
      : '';

  const modelId = readField('model');
  if (!modelId) {
    return adminJson({ error: 'A model id is required.' }, 400);
  }

  // `scope` is which endpoint the model actually runs on: the guardrail has its
  // own, everything else uses the chat endpoint. Testing a primary model against
  // the guardrail URL would report a working model as broken.
  const scope = readField('scope') === 'guardrail' ? 'guardrail' : 'chat';

  let current;
  try {
    current = normalizeModelConfig(await readModelConfig());
  } catch (error) {
    console.error('Admin model test read failed:', error);
    return adminJson({ error: 'Could not read the model configuration.' }, 502);
  }

  const connection = resolveAdminConnection(current, {
    baseURL: readField('baseURL'),
    apiKey: readField('apiKey'),
  }, scope);

  if (!connection.ok) {
    return adminJson({ error: connection.error }, 400);
  }

  const config = connection.config;

  if (!isModelUsable(config.modelCatalog, modelId)) {
    return adminJson(
      { ok: false, error: `"${modelId}" is not served over any protocol in the model catalog.` },
      400,
    );
  }

  if (!config.apiKey) {
    return adminJson({ ok: false, error: 'No API key is configured.' }, 400);
  }

  const startedAt = Date.now();

  try {
    const result = await testChatModel(
      modelId,
      getProviderConnection(
        config,
        getAdminTestSessionId(modelId),
        scope === 'guardrail' ? resolveGuardrailBaseURL(config) : config.baseURL,
      ),
    );

    return adminJson({
      ok: true,
      apiType: result.apiType,
      reply: result.text,
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    return adminJson({
      ok: false,
      apiTypes: getModelApiTypes(config.modelCatalog, modelId),
      error: describeProviderError(error),
      durationMs: Date.now() - startedAt,
    });
  }
}
