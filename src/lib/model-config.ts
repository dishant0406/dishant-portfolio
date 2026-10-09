/**
 * The model configuration is shared by both server processes:
 *
 * - the Mastra chat server reads it to pick the model for a request
 * - the Next.js /admin route reads and writes it
 *
 * It lives in GCS (`MODEL_CONFIG_GCS_URI`) in production and on disk in
 * development. The write path validates every field before saving, so a value
 * that would break the chat server cannot be stored through /admin.
 *
 * This file must stay importable from plain Node (no `next/*`, no `server-only`).
 */

import { readFile, rename, writeFile } from 'node:fs/promises';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { isModelUsable } from '../mastra/agents/opencode-model-catalog';
import { getOpencodeThinkingMode, type ThinkingMode } from '../../mastra-server/opencode-thinking';

export type ModelConfig = {
  version: number;
  model: string;
  fallbackModel: string;
  guardrailModel: string;
  guardrailBaseURL: string;
  thinkingMode: ThinkingMode;
  cacheTtlSeconds: number;
  /** Password for /admin, stored as `scrypt:<salt>:<hash>`. Empty disables the admin. */
  adminPassword: string;
};

/** The config without the password hash, safe to send to the admin browser. */
export type PublicModelConfig = Omit<ModelConfig, 'adminPassword'>;

export const redactModelConfig = (config: ModelConfig): PublicModelConfig => ({
  version: config.version,
  model: config.model,
  fallbackModel: config.fallbackModel,
  guardrailModel: config.guardrailModel,
  guardrailBaseURL: config.guardrailBaseURL,
  thinkingMode: config.thinkingMode,
  cacheTtlSeconds: config.cacheTtlSeconds,
});

export const MODEL_CONFIG_VERSION = 2;

const DEFAULT_CACHE_TTL_SECONDS = 60;
const MIN_CACHE_TTL_SECONDS = 5;
const MAX_CACHE_TTL_SECONDS = 3600;
const MAX_MODEL_ID_LENGTH = 128;

export const DEFAULT_BASE_URL = 'https://opencode.ai/zen/go/v1';
export const DEFAULT_FALLBACK_MODEL = 'mimo-v2.5';
export const DEFAULT_GUARDRAIL_MODEL = 'deepseek-v4-flash';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const envValue = (value: unknown, fallback: string) => {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || fallback;
};

const clampTtl = (value: unknown) => {
  const numericValue = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numericValue)) return DEFAULT_CACHE_TTL_SECONDS;

  return Math.min(
    MAX_CACHE_TTL_SECONDS,
    Math.max(MIN_CACHE_TTL_SECONDS, Math.floor(numericValue)),
  );
};

const isHttpUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
};

const firstEnvValue = (...values: (string | undefined)[]) => {
  for (const value of values) {
    const text = value?.trim();
    if (text) return text;
  }

  return '';
};

/**
 * Values that come from the environment instead of the config file. Also used as
 * the fallback when the config file is missing or unreadable.
 */
export const getEnvModelConfig = (): ModelConfig => {
  const guardrailBaseURL = firstEnvValue(
    process.env.OPENCODE_GUARDRAIL_BASE_URL,
    process.env.OPENCODE_BASE_URL,
  );

  return {
    version: MODEL_CONFIG_VERSION,
    model: envValue(process.env.OPENCODE_MODEL, 'deepseek-v4-flash'),
    fallbackModel: envValue(process.env.OPENCODE_FALLBACK_MODEL, DEFAULT_FALLBACK_MODEL),
    guardrailModel: envValue(process.env.OPENCODE_GUARDRAIL_MODEL, DEFAULT_GUARDRAIL_MODEL),
    guardrailBaseURL: isHttpUrl(guardrailBaseURL) ? guardrailBaseURL : DEFAULT_BASE_URL,
    thinkingMode: getOpencodeThinkingMode(),
    cacheTtlSeconds: clampTtl(process.env.MODEL_CONFIG_CACHE_TTL_SECONDS),
    adminPassword: '',
  };
};

const parseAdminPassword = (value: unknown, fallback: string) => {
  const text = typeof value === 'string' ? value.trim() : '';

  return text || fallback;
};

/**
 * Normalises anything read from disk/GCS/env into a complete config. Unknown
 * fields are dropped and every field is coerced to a safe value.
 *
 * This reader is deliberately more permissive than `validateModelConfigInput`,
 * which guards the write path: a config file written by hand (or by an older
 * version) must still load, as long as the result is usable.
 */
export const normalizeModelConfig = (rawConfig: unknown): ModelConfig => {
  const fallback = getEnvModelConfig();
  if (!isRecord(rawConfig)) return fallback;

  const guardrailBaseURL = envValue(rawConfig.guardrailBaseURL, fallback.guardrailBaseURL);

  return {
    version: MODEL_CONFIG_VERSION,
    model: envValue(rawConfig.model, fallback.model),
    fallbackModel: envValue(rawConfig.fallbackModel, fallback.fallbackModel),
    guardrailModel: envValue(rawConfig.guardrailModel, fallback.guardrailModel),
    guardrailBaseURL: isHttpUrl(guardrailBaseURL) ? guardrailBaseURL : fallback.guardrailBaseURL,
    thinkingMode: getOpencodeThinkingMode(rawConfig.thinkingMode ?? fallback.thinkingMode),
    cacheTtlSeconds: clampTtl(rawConfig.cacheTtlSeconds ?? fallback.cacheTtlSeconds),
    adminPassword: parseAdminPassword(rawConfig.adminPassword, fallback.adminPassword),
  };
};

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

type GcsLocation = {
  bucket: string;
  object: string;
};

const METADATA_TOKEN_URL =
  'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token';

const parseGcsUri = (uri: string): GcsLocation => {
  if (!uri.startsWith('gs://')) {
    throw new Error('MODEL_CONFIG_GCS_URI must start with gs://');
  }

  const withoutScheme = uri.slice('gs://'.length);
  const slashIndex = withoutScheme.indexOf('/');
  const bucket = slashIndex === -1 ? withoutScheme : withoutScheme.slice(0, slashIndex);
  const object = slashIndex === -1 ? '' : withoutScheme.slice(slashIndex + 1);

  if (!bucket || !object) {
    throw new Error('MODEL_CONFIG_GCS_URI must include bucket and object path');
  }

  return { bucket, object };
};

// A hung metadata/GCS call would otherwise stall every admin request and every
// chat request that needs a config refresh.
const CONFIG_FETCH_TIMEOUT_MS = 5000;

const configFetch = (url: string | URL, init: RequestInit = {}) =>
  fetch(url, { ...init, signal: AbortSignal.timeout(CONFIG_FETCH_TIMEOUT_MS) });

const getAccessToken = async () => {
  // A token in the environment wins, which is what local development uses.
  const staticToken = process.env.MODEL_CONFIG_GCS_TOKEN?.trim();
  if (staticToken) return staticToken;

  const response = await configFetch(METADATA_TOKEN_URL, {
    headers: { 'Metadata-Flavor': 'Google' },
  });

  if (!response.ok) {
    throw new Error(`Metadata token request failed with ${response.status}`);
  }

  const payload: unknown = await response.json();
  const accessToken = isRecord(payload) ? payload.access_token : undefined;

  if (typeof accessToken !== 'string' || !accessToken.trim()) {
    throw new Error('Metadata token response did not include access_token');
  }

  return accessToken;
};

const gcsObjectUrl = ({ bucket, object }: GcsLocation) =>
  `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(object)}`;

export const readModelConfig = async (): Promise<unknown> => {
  const filePath = process.env.MODEL_CONFIG_FILE?.trim();
  if (filePath) return JSON.parse(await readFile(filePath, 'utf8'));

  const gcsUri = process.env.MODEL_CONFIG_GCS_URI?.trim();
  if (!gcsUri) return undefined;

  const location = parseGcsUri(gcsUri);
  const accessToken = await getAccessToken();
  const url = new URL(gcsObjectUrl(location));
  url.searchParams.set('alt', 'media');

  const response = await configFetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) {
    throw new Error(`GCS model config request failed with ${response.status}`);
  }

  return response.json();
};

export const writeModelConfig = async (config: ModelConfig): Promise<void> => {
  const body = JSON.stringify(config, null, 2);

  const filePath = process.env.MODEL_CONFIG_FILE?.trim();
  if (filePath) {
    // Write to a temporary file and rename so a crash cannot leave a truncated
    // config behind for the chat server to fail on.
    const temporaryPath = `${filePath}.tmp`;
    await writeFile(temporaryPath, body, 'utf8');
    await rename(temporaryPath, filePath);
    return;
  }

  const gcsUri = process.env.MODEL_CONFIG_GCS_URI?.trim();
  if (!gcsUri) {
    throw new Error('No writable model config target. Set MODEL_CONFIG_FILE or MODEL_CONFIG_GCS_URI.');
  }

  const location = parseGcsUri(gcsUri);
  const accessToken = await getAccessToken();
  const url = new URL(gcsObjectUrl(location));
  url.searchParams.set('uploadType', 'media');

  const response = await configFetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body,
  });

  if (!response.ok) {
    throw new Error(`GCS model config write failed with ${response.status}`);
  }
};

export const isModelConfigWritable = () =>
  Boolean(process.env.MODEL_CONFIG_FILE?.trim() || process.env.MODEL_CONFIG_GCS_URI?.trim());

// ---------------------------------------------------------------------------
// Admin password
// ---------------------------------------------------------------------------

const ADMIN_HASH_ALGORITHM = 'scrypt';
const ADMIN_SALT_BYTES = 16;
const ADMIN_KEY_BYTES = 32;

/**
 * The admin password is only ever persisted as `scrypt:<salt>:<hash>`.
 * scrypt is memory-hard, so a leaked hash is expensive to brute force. The
 * comparison is constant-time over fixed-length digests.
 */
export const hashAdminPassword = (password: string) => {
  const salt = randomBytes(ADMIN_SALT_BYTES);
  const hash = scryptSync(password, salt, ADMIN_KEY_BYTES);

  return `${ADMIN_HASH_ALGORITHM}:${salt.toString('hex')}:${hash.toString('hex')}`;
};

export const verifyAdminPassword = (stored: string, password: string) => {
  const [algorithm, saltHex, hashHex] = stored.split(':');
  if (algorithm !== ADMIN_HASH_ALGORITHM || !saltHex || !hashHex) return false;

  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(saltHex, 'hex');
    expected = Buffer.from(hashHex, 'hex');
  } catch {
    return false;
  }

  // Buffer.from silently truncates invalid hex, so the lengths are the real check.
  if (salt.length !== ADMIN_SALT_BYTES || expected.length !== ADMIN_KEY_BYTES) return false;

  const candidate = scryptSync(password, salt, ADMIN_KEY_BYTES);

  return timingSafeEqual(candidate, expected);
};

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type ModelConfigValidation = {
  ok: boolean;
  errors: string[];
  config: ModelConfig;
};

/**
 * Validates a config coming from the admin UI. Every field is checked here, not
 * in the form, because the API route is reachable directly.
 */
export const validateModelConfigInput = (
  input: unknown,
  current: ModelConfig,
): ModelConfigValidation => {
  const errors: string[] = [];
  if (!isRecord(input)) {
    return { ok: false, errors: ['Config must be a JSON object.'], config: current };
  }

  const readModelField = (field: string, previous: string) => {
    const value = input[field];
    if (value === undefined) return previous;

    const modelId = typeof value === 'string' ? value.trim() : '';
    if (!modelId) {
      errors.push(`${field} is required.`);
      return previous;
    }
    if (modelId.length > MAX_MODEL_ID_LENGTH) {
      errors.push(`${field} must be at most ${MAX_MODEL_ID_LENGTH} characters.`);
      return previous;
    }
    if (!isModelUsable(modelId)) {
      errors.push(`${field} "${modelId}" is not a model OpenCode Go serves over any supported protocol.`);
      return previous;
    }

    return modelId;
  };

  const next: ModelConfig = {
    ...current,
    model: readModelField('model', current.model),
    fallbackModel: readModelField('fallbackModel', current.fallbackModel),
    guardrailModel: readModelField('guardrailModel', current.guardrailModel),
  };

  if (input.guardrailBaseURL !== undefined) {
    const guardrailBaseURL = typeof input.guardrailBaseURL === 'string'
      ? input.guardrailBaseURL.trim()
      : '';

    if (!isHttpUrl(guardrailBaseURL)) {
      errors.push('guardrailBaseURL must be a valid http(s) URL.');
    } else {
      next.guardrailBaseURL = guardrailBaseURL.replace(/\/$/, '');
    }
  }

  if (input.thinkingMode !== undefined) {
    const requested = String(input.thinkingMode);
    const normalized = getOpencodeThinkingMode(requested);
    if (normalized !== requested) {
      errors.push('thinkingMode must be one of: disabled, enabled, auto.');
    } else {
      next.thinkingMode = normalized;
    }
  }

  if (input.cacheTtlSeconds !== undefined) {
    const ttl = Number(input.cacheTtlSeconds);
    if (!Number.isFinite(ttl)) {
      errors.push('cacheTtlSeconds must be a number.');
    } else if (ttl < MIN_CACHE_TTL_SECONDS || ttl > MAX_CACHE_TTL_SECONDS) {
      errors.push(`cacheTtlSeconds must be between ${MIN_CACHE_TTL_SECONDS} and ${MAX_CACHE_TTL_SECONDS}.`);
    } else {
      next.cacheTtlSeconds = Math.floor(ttl);
    }
  }

  if (input.adminPassword !== undefined && input.adminPassword !== '') {
    const password = String(input.adminPassword);
    if (password.length < 8) {
      errors.push('adminPassword must be at least 8 characters.');
    } else {
      next.adminPassword = hashAdminPassword(password);
    }
  }

  return { ok: errors.length === 0, errors, config: next };
};
