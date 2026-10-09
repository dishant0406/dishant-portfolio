import { NextRequest } from 'next/server';
import { adminJson, isSameOriginRequest, requireAdminApi } from '@/lib/admin-auth';
import {
  isModelConfigWritable,
  normalizeModelConfig,
  readModelConfig,
  redactModelConfig,
  validateModelConfigInput,
  writeModelConfig,
} from '@/lib/model-config';
import { getCatalogModels } from '@/lib/model-catalog';
import { requestMastraModelConfigReload } from '@/lib/mastra-admin';

export async function GET() {
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;

  let config;
  try {
    config = normalizeModelConfig(await readModelConfig());
  } catch (error) {
    console.error('Admin config read failed:', error);
    return adminJson({ error: 'Could not read the model configuration.' }, 502);
  }

  return adminJson({
    config: redactModelConfig(config),
    models: getCatalogModels(config.modelCatalog),
    writable: isModelConfigWritable(),
  });
}

export async function PUT(request: NextRequest) {
  const unauthorized = await requireAdminApi();
  if (unauthorized) return unauthorized;

  if (!isSameOriginRequest(request)) {
    return adminJson({ error: 'Cross-origin requests are not allowed.' }, 403);
  }

  if (!isModelConfigWritable()) {
    return adminJson({ error: 'Model config storage is not writable.' }, 503);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return adminJson({ error: 'Invalid JSON body' }, 400);
  }

  let current;
  try {
    current = normalizeModelConfig(await readModelConfig());
  } catch (error) {
    console.error('Admin config read failed:', error);
    return adminJson({ error: 'Could not read the model configuration.' }, 502);
  }

  const validation = validateModelConfigInput(body, current);
  if (!validation.ok) {
    return adminJson({ error: 'Validation failed', errors: validation.errors }, 400);
  }

  try {
    await writeModelConfig(validation.config);
  } catch (error) {
    console.error('Admin config write failed:', error);
    return adminJson({ error: 'Could not save the model configuration.' }, 502);
  }

  const reload = await requestMastraModelConfigReload();

  return adminJson({ ok: true, config: redactModelConfig(validation.config), reload });
}
