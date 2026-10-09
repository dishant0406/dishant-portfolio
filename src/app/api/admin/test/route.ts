import { NextRequest } from 'next/server';
import { adminJson, requireAdminApi } from '@/lib/admin-auth';
import { getAdminTestSessionId } from '@/lib/mastra-admin';
import { normalizeModelConfig, readModelConfig } from '@/lib/model-config';
import { isModelUsable, getModelApiTypes } from '@/mastra/agents/opencode-model-catalog';
import { testChatModel } from '@/mastra/agents/opencode-chat-model';

/**
 * Makes one small call to the selected model and reports the real provider
 * result. This is the check that was missing when the guardrail silently failed
 * for weeks.
 */
export async function POST(request: NextRequest) {
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return adminJson({ error: 'Invalid JSON body' }, 400);
  }

  const modelId = body && typeof body === 'object' && 'model' in body
    ? String((body as { model: unknown }).model ?? '').trim()
    : '';

  if (!modelId) {
    return adminJson({ error: 'A model id is required.' }, 400);
  }

  if (!isModelUsable(modelId)) {
    return adminJson(
      { ok: false, error: `"${modelId}" is not served by OpenCode Go over any supported protocol.` },
      400,
    );
  }

  let baseURL: string;
  try {
    const config = normalizeModelConfig(await readModelConfig());
    baseURL = config.guardrailBaseURL;
  } catch (error) {
    console.error('Admin model test read failed:', error);
    return adminJson({ error: 'Could not read the model configuration.' }, 502);
  }

  const startedAt = Date.now();

  try {
    const result = await testChatModel(modelId, baseURL, getAdminTestSessionId(modelId));

    return adminJson({
      ok: true,
      apiType: result.apiType,
      reply: result.text,
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    return adminJson({
      ok: false,
      apiTypes: getModelApiTypes(modelId),
      error: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startedAt,
    });
  }
}
