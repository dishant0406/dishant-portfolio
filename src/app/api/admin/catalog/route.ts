import { NextRequest } from 'next/server';
import { adminJson, isSameOriginRequest, requireAdminApi } from '@/lib/admin-auth';
import {
  isModelConfigWritable,
  normalizeModelConfig,
  readModelConfig,
  resolveAdminConnection,
  writeModelConfig,
} from '@/lib/model-config';
import { getCatalogModels, isModelUsable, probeModelCatalog, type ModelCatalog } from '@/lib/model-catalog';
import { requestMastraModelConfigReload } from '@/lib/mastra-admin';

/**
 * Re-derives the model catalog from the provider and saves it to the config.
 *
 * A model list on its own is not enough: the provider lists more models than it
 * serves, so each one is sent to all three protocols to find out which it
 * accepts. The saved catalog is what the model pickers and the write validation
 * use, so a model that cannot answer is never selectable.
 */
export async function POST(request: NextRequest) {
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;

  if (!isSameOriginRequest(request)) {
    return adminJson({ error: 'Cross-origin requests are not allowed.' }, 403);
  }

  if (!isModelConfigWritable()) {
    return adminJson({ error: 'Model config storage is not writable.' }, 503);
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    // An empty body is fine: the endpoint falls back to the stored settings.
  }

  let current;
  try {
    current = normalizeModelConfig(await readModelConfig());
  } catch (error) {
    console.error('Admin catalog read failed:', error);
    return adminJson({ error: 'Could not read the model configuration.' }, 502);
  }

  const readOverride = (field: 'baseURL' | 'apiKey') => {
    const value = body && typeof body === 'object' && field in body
      ? (body as Record<string, unknown>)[field]
      : undefined;

    return typeof value === 'string' ? value.trim() : '';
  };

  const connection = resolveAdminConnection(current, {
    baseURL: readOverride('baseURL'),
    apiKey: readOverride('apiKey'),
  }, 'chat');

  if (!connection.ok) {
    return adminJson({ error: connection.error }, 400);
  }

  const { config } = connection;

  if (!config.apiKey) {
    return adminJson({ error: 'An API key is required to refresh the model list.' }, 400);
  }

  let next;
  try {
    next = await probeModelCatalog({ baseURL: config.baseURL, apiKey: config.apiKey });
  } catch (error) {
    console.error('Model catalog probe failed:', error);
    return adminJson({ error: 'The model list could not be refreshed. Check the base URL and API key.' }, 502);
  }

  // The refreshed catalog can drop a model that is still configured. Saving that
  // would leave the chat server sending a model the provider no longer serves,
  // so the refresh is refused instead and the operator picks a new one.
  const dropped = (['model', 'fallbackModel', 'guardrailModel'] as const)
    .filter((field) => !isModelUsable(next.catalog, config[field]));

  if (dropped.length > 0) {
    const details = dropped.map((field) => `${field} "${config[field]}"`).join(', ');

    return adminJson(
      {
        error: `The refreshed list no longer serves: ${details}. Choose a replacement model and save, then refresh again.`,
      },
      409,
    );
  }

  // The catalog is probed from the endpoint in the form, so that endpoint is
  // saved with it. Otherwise the stored config would pair one provider's catalog
  // with another provider's URL if the operator refreshed without saving.
  const nextConfig = {
    ...config,
    modelCatalog: next.catalog,
  };

  try {
    await writeModelConfig(nextConfig);
  } catch (error) {
    console.error('Admin catalog write failed:', error);
    return adminJson({ error: 'Could not save the model list.' }, 502);
  }

  const reload = await requestMastraModelConfigReload();

  return adminJson({
    ok: true,
    models: getCatalogModels(next.catalog),
    updatedAt: next.catalog.updatedAt,
    unusable: next.unusable,
    warnings: next.warnings,
    diff: describeCatalogChange(current.modelCatalog, next.catalog),
    reload,
  });
}

/** What the refresh changed, so the UI can report it without re-deriving it. */
const describeCatalogChange = (previous: ModelCatalog, next: ModelCatalog) => {
  const previousIds = Object.keys(previous.models);
  const nextIds = Object.keys(next.models);

  return {
    added: nextIds.filter((id) => !previousIds.includes(id)).sort(),
    removed: previousIds.filter((id) => !nextIds.includes(id)).sort(),
    protocolChanged: nextIds
      .filter((id) => previousIds.includes(id))
      .filter((id) => {
        const before = previous.models[id].join(',');
        const after = next.models[id].join(',');

        return before !== after;
      })
      .sort(),
  };
};
