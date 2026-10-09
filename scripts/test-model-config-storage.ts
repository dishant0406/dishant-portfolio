/**
 * Regression test for the GCS model config write path.
 *
 * The admin save path reported `{ ok: true }` for months while the stored config
 * never changed, because a write was sent to the media-download endpoint. That
 * endpoint answers a PUT with the *existing* object's metadata (HTTP 200), so the
 * failure was invisible from inside the app. This test writes to a scratch object
 * and reads it back, which is the only way to prove the bytes were stored.
 *
 * Requires a GCS token and the config bucket:
 *
 *   CLOUDSDK_CONFIG=$PWD/.gcloud-config \
 *   MODEL_CONFIG_GCS_TOKEN=$(gcloud auth print-access-token) \
 *   pnpm test:config-storage
 *
 * The scratch object is deleted at the end, so the real config is never touched.
 */

import {
  isModelConfigWritable,
  normalizeModelConfig,
  readModelConfig,
  writeModelConfig,
} from '../src/lib/model-config';

const gcsUri = process.env.MODEL_CONFIG_GCS_URI?.trim();

if (!gcsUri) {
  console.error('MODEL_CONFIG_GCS_URI must be set to the production config object.');
  process.exit(1);
}

if (!process.env.MODEL_CONFIG_GCS_TOKEN?.trim()) {
  console.error('MODEL_CONFIG_GCS_TOKEN must be set (e.g. `gcloud auth print-access-token`).');
  process.exit(1);
}

// Write to a sibling object so a failing run cannot damage the live config.
const scratchUri = `${gcsUri}.test-scratch.json`;
process.env.MODEL_CONFIG_GCS_URI = scratchUri;

const checks: Array<{ name: string; run: () => Promise<void> }> = [];

const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
};

checks.push({
  name: 'a written config reads back byte-identical',
  run: async () => {
    const config = normalizeModelConfig({
      model: 'deepseek-v4-pro',
      baseURL: 'https://opencode.ai/zen/go/v1',
      thinkingMode: 'disabled',
      cacheTtlSeconds: 30,
      adminPassword: 'scrypt:00:00',
    });

    await writeModelConfig(config);

    const readBack = normalizeModelConfig(await readModelConfig());

    assert(readBack.model === config.model, `model: ${readBack.model} !== ${config.model}`);
    assert(readBack.baseURL === config.baseURL, `baseURL: ${readBack.baseURL}`);
    assert(
      readBack.thinkingMode === config.thinkingMode,
      `thinkingMode: ${readBack.thinkingMode}`,
    );
    assert(
      readBack.cacheTtlSeconds === config.cacheTtlSeconds,
      `cacheTtlSeconds: ${readBack.cacheTtlSeconds}`,
    );
    assert(
      readBack.adminPassword === config.adminPassword,
      `adminPassword: ${readBack.adminPassword}`,
    );
  },
});

checks.push({
  name: 'a second write replaces the first',
  run: async () => {
    const config = normalizeModelConfig({ model: 'grok-4.7', cacheTtlSeconds: 45 });
    await writeModelConfig(config);

    const readBack = normalizeModelConfig(await readModelConfig());
    assert(readBack.model === 'grok-4.7', `model: ${readBack.model} !== grok-4.7`);
  },
});

checks.push({
  name: 'the write reports the stored size, not the previous object',
  run: async () => {
    // A tiny config followed by a much larger one catches a stale-metadata
    // response: the size check in writeModelConfig would reject it.
    await writeModelConfig(normalizeModelConfig({ model: 'a'.repeat(120) }));
    await writeModelConfig(
      normalizeModelConfig({ model: 'b'.repeat(120), apiKey: 'k'.repeat(200) }),
    );

    const readBack = normalizeModelConfig(await readModelConfig());
    assert(readBack.model === 'b'.repeat(120), 'the larger config was not stored');
  },
});

const deleteScratchObject = async () => {
  const [bucket, ...rest] = scratchUri.slice('gs://'.length).split('/');
  const object = rest.join('/');
  const token = process.env.MODEL_CONFIG_GCS_TOKEN!;

  await fetch(
    `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(object)}`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } },
  ).catch(() => undefined);
};

const main = async () => {
  if (!isModelConfigWritable()) {
    console.error('No writable target. Set MODEL_CONFIG_GCS_URI.');
    process.exit(1);
  }

  console.log(`Scratch object: ${scratchUri}\n`);

  let failures = 0;

  for (const check of checks) {
    try {
      await check.run();
      console.log(`PASS  ${check.name}`);
    } catch (error) {
      failures += 1;
      console.error(`FAIL  ${check.name}\n      ${(error as Error).message}`);
    }
  }

  await deleteScratchObject();

  console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILED`);
  process.exit(failures === 0 ? 0 : 1);
};

void main();
