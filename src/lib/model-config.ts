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
import {
  getBundledCatalog,
  isModelUsable,
  normalizeCatalog,
  type ModelCatalog,
} from './model-catalog';
import { getOpencodeThinkingMode, type ThinkingMode } from '../../mastra-server/opencode-thinking';

export type ModelConfig = {
  version: number;
  model: string;
  fallbackModel: string;
  guardrailModel: string;
  /** Provider endpoint for the chat and fallback models. */
  baseURL: string;
  /** Provider endpoint for the guardrail model. Blank inherits `baseURL`. */
  guardrailBaseURL: string;
  /** Provider API key. Write-only: never returned to the browser or logged. */
  apiKey: string;
  /** Which protocol each model speaks. Derived from the provider by /admin. */
  modelCatalog: ModelCatalog;
  thinkingMode: ThinkingMode;
  cacheTtlSeconds: number;
  /** Password for /admin, stored as `scrypt:<salt>:<hash>`. Empty disables the admin. */
  adminPassword: string;
};

/** The config without secrets, safe to send to the admin browser. */
export type PublicModelConfig = Omit<ModelConfig, 'adminPassword' | 'apiKey'> & {
  hasApiKey: boolean;
};

export const redactModelConfig = (config: ModelConfig): PublicModelConfig => ({
  version: config.version,
  model: config.model,
  fallbackModel: config.fallbackModel,
  guardrailModel: config.guardrailModel,
  baseURL: config.baseURL,
  guardrailBaseURL: config.guardrailBaseURL,
  modelCatalog: config.modelCatalog,
  thinkingMode: config.thinkingMode,
  cacheTtlSeconds: config.cacheTtlSeconds,
  hasApiKey: Boolean(config.apiKey),
});

const MODEL_CONFIG_VERSION = 3;
const DEFAULT_CACHE_TTL_SECONDS = 60;
const MIN_CACHE_TTL_SECONDS = 5;
const MAX_CACHE_TTL_SECONDS = 3600;
const MAX_MODEL_ID_LENGTH = 128;
const MAX_API_KEY_LENGTH = 512;
const MIN_API_KEY_LENGTH = 8;

export const DEFAULT_BASE_URL = 'https://opencode.ai/zen/go/v1';

const METADATA_HOST_NAMES = new Set([
  'metadata.google.internal',
  'metadata.goog',
  'instance-data',
  '100.100.100.200',
]);

/** Expands an IPv6 address to its eight groups, resolving the `::` shorthand. */
const expandIpv6 = (hostname: string) => {
  const parts = hostname.replace(/^\[|\]$/g, '').toLowerCase().split('::');
  if (parts.length > 2) return [];

  const left = parts[0] ? parts[0].split(':') : [];
  const right = parts.length === 2 && parts[1] ? parts[1].split(':') : [];
  const missing = 8 - left.length - right.length;
  if (parts.length === 1 && left.length !== 8) return [];
  if (missing < 0) return [];

  return [...left, ...Array(missing).fill('0'), ...right];
};

/**
 * Link-local and metadata addresses that no model endpoint should ever point at.
 *
 * `169.254.0.0/16` covers both the cloud metadata address and the ECS task
 * metadata address; `fe80::/10` is its IPv6 equivalent. Private ranges such as
 * `10.0.0.0/8` stay allowed, because running your own gateway is a real setup.
 */
const isBlockedAddress = (hostname: string) => {
  if (hostname.startsWith('169.254.')) return true;

  const groups = expandIpv6(hostname);
  if (groups.length !== 8) return false;

  // fe80::/10 means the first group is fe80 to febf.
  if (/^fe[89ab][0-9a-f]$/.test(groups[0])) return true;

  // AWS's IPv6 metadata endpoint, `fd00:ec2::254`.
  if (groups[0] === 'fd00' && groups[1] === 'ec2' && groups[7] === '254') {
    return true;
  }

  // An IPv4-mapped address arrives as ::ffff:a9fe:a9fe, so the last two groups
  // are the IPv4 address in hex.
  if (groups.slice(0, 5).every((group) => group === '0') && groups[5] === 'ffff') {
    const hex = `${groups[6]}${groups[7]}`.padStart(8, '0');
    const octets = [0, 2, 4, 6].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16));

    return octets[0] === 169 && octets[1] === 254;
  }

  return false;
};

/**
 * A provider endpoint has to be a real http(s) URL and must not be a cloud
 * metadata service. This runs on stored values and on the unsaved overrides the
 * admin form sends, because both reach the same fetch code.
 */
export const isAllowedBaseURL = (value: string) => {
  if (!isHttpUrl(value)) return false;

  try {
    // A trailing dot is the same host to DNS, so it must not slip past the name
    // check. `new URL` already canonicalises the integer and hex forms of an IP.
    const hostname = new URL(value).hostname.toLowerCase().replace(/\.+$/, '');

    return !METADATA_HOST_NAMES.has(hostname) && !isBlockedAddress(hostname);
  } catch {
    return false;
  }
};

/** Normalises an operator-supplied endpoint, or returns the fallback if unusable. */
const resolveBaseURL = (value: string, fallback: string) => {
  const url = value.trim().replace(/\/+$/, '');

  return isAllowedBaseURL(url) ? url : fallback;
};

const DEFAULT_FALLBACK_MODEL = 'mimo-v2.5';
const DEFAULT_GUARDRAIL_MODEL = 'deepseek-v4-flash';

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

/**
 * Values that come from the environment instead of the config file. Also used as
 * the fallback when the config file is missing or unreadable.
 */
export const getEnvModelConfig = (): ModelConfig => {
  return {
    version: MODEL_CONFIG_VERSION,
    model: envValue(process.env.OPENCODE_MODEL, 'deepseek-v4-flash'),
    fallbackModel: envValue(process.env.OPENCODE_FALLBACK_MODEL, DEFAULT_FALLBACK_MODEL),
    guardrailModel: envValue(process.env.OPENCODE_GUARDRAIL_MODEL, DEFAULT_GUARDRAIL_MODEL),
    baseURL: resolveBaseURL(process.env.OPENCODE_BASE_URL ?? '', DEFAULT_BASE_URL),
    // Blank means "same as the chat models", resolved by resolveGuardrailBaseURL.
    guardrailBaseURL: resolveBaseURL(process.env.OPENCODE_GUARDRAIL_BASE_URL ?? '', ''),
    apiKey: process.env.OPENCODE_API_KEY?.trim() ?? '',
    modelCatalog: getBundledCatalog(),
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

  return {
    version: MODEL_CONFIG_VERSION,
    model: envValue(rawConfig.model, fallback.model),
    fallbackModel: envValue(rawConfig.fallbackModel, fallback.fallbackModel),
    guardrailModel: envValue(rawConfig.guardrailModel, fallback.guardrailModel),
    baseURL: resolveBaseURL(
      typeof rawConfig.baseURL === 'string' ? rawConfig.baseURL : '',
      fallback.baseURL,
    ),
    // An unset or unusable guardrail URL means "same as the chat models" rather
    // than "no endpoint", so a half-written config still produces working calls.
    guardrailBaseURL: resolveBaseURL(
      typeof rawConfig.guardrailBaseURL === 'string' ? rawConfig.guardrailBaseURL : '',
      fallback.guardrailBaseURL,
    ),
    apiKey: envValue(rawConfig.apiKey, fallback.apiKey),
    modelCatalog: normalizeCatalog(rawConfig.modelCatalog),
    thinkingMode: getOpencodeThinkingMode(rawConfig.thinkingMode ?? fallback.thinkingMode),
    cacheTtlSeconds: clampTtl(rawConfig.cacheTtlSeconds ?? fallback.cacheTtlSeconds),
    adminPassword: parseAdminPassword(rawConfig.adminPassword, fallback.adminPassword),
  };
};

/**
 * The endpoint a request should use. The guardrail keeps its own field so it can
 * point at a different deployment, and an empty value means "same as the chat
 * models" rather than "no endpoint".
 */
export const resolveGuardrailBaseURL = (config: ModelConfig) =>
  config.guardrailBaseURL || config.baseURL;

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
  if (filePath) {
    try {
      return JSON.parse(await readFile(filePath, 'utf8'));
    } catch (error) {
      // No config yet is not an error: the caller falls back to env defaults and
      // /admin can then create the file. Anything else is a real failure.
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
      throw error;
    }
  }

  const gcsUri = process.env.MODEL_CONFIG_GCS_URI?.trim();
  if (!gcsUri) return undefined;

  const location = parseGcsUri(gcsUri);
  const accessToken = await getAccessToken();
  const url = new URL(gcsObjectUrl(location));
  url.searchParams.set('alt', 'media');

  const response = await configFetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (response.status === 404) return undefined;
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

/**
 * The provider endpoint and key an admin request should use.
 *
 * The admin form may send the endpoint and key it has not saved yet, so an
 * unsaved connection can be tested. Those overrides reach the same fetch code as
 * the stored values, so they are checked with the same rule — otherwise the
 * server would fetch an arbitrary URL with the API key attached (SSRF).
 *
 * `scope` only decides *which* endpoint field the override stands in for. The
 * caller reads the endpoint it needs from the returned config, so the two fields
 * are never confused.
 */
export const resolveAdminConnection = (
  current: ModelConfig,
  override: { baseURL?: string; apiKey?: string },
  scope: 'chat' | 'guardrail',
): { ok: true; config: ModelConfig } | { ok: false; error: string } => {
  const baseURL = override.baseURL?.trim().replace(/\/+$/, '') || '';

  if (baseURL && !isAllowedBaseURL(baseURL)) {
    return {
      ok: false,
      error: 'The base URL must be a valid http(s) URL that is not a cloud metadata endpoint.',
    };
  }

  const field = scope === 'guardrail' ? 'guardrailBaseURL' : 'baseURL';

  return {
    ok: true,
    config: {
      ...current,
      [field]: baseURL || current[field],
      apiKey: override.apiKey?.trim() || current.apiKey,
    },
  };
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
 *
 * Model ids are checked against the stored catalog, which only the catalog
 * refresh route can change. That route derives it from the provider, so a model
 * that cannot answer a request is never accepted.
 */
export const validateModelConfigInput = (
  input: unknown,
  current: ModelConfig,
): ModelConfigValidation => {
  const errors: string[] = [];
  if (!isRecord(input)) {
    return { ok: false, errors: ['Config must be a JSON object.'], config: current };
  }

  const catalog = current.modelCatalog;

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
    if (!isModelUsable(catalog, modelId)) {
      errors.push(`${field} "${modelId}" is not served over any protocol in the model catalog.`);
      return previous;
    }

    return modelId;
  };

  const next: ModelConfig = {
    ...current,
    modelCatalog: catalog,
    model: readModelField('model', current.model),
    fallbackModel: readModelField('fallbackModel', current.fallbackModel),
    guardrailModel: readModelField('guardrailModel', current.guardrailModel),
  };

  const readBaseURL = (field: 'baseURL' | 'guardrailBaseURL', allowEmpty: boolean) => {
    const value = input[field];
    if (value === undefined) return;

    const url = typeof value === 'string' ? value.trim().replace(/\/$/, '') : '';
    if (!url && allowEmpty) {
      next[field] = '';
      return;
    }
    if (!isAllowedBaseURL(url)) {
      errors.push(`${field} must be a valid http(s) URL that is not a cloud metadata endpoint.`);
      return;
    }

    next[field] = url;
  };

  readBaseURL('baseURL', false);
  readBaseURL('guardrailBaseURL', true);

  // An empty key means "keep the stored one", so the field can stay blank in the
  // form without wiping the credential on every save.
  if (typeof input.apiKey === 'string' && input.apiKey !== '') {
    const apiKey = input.apiKey.trim();

    if (apiKey.length < MIN_API_KEY_LENGTH || apiKey.length > MAX_API_KEY_LENGTH) {
      errors.push(`apiKey must be between ${MIN_API_KEY_LENGTH} and ${MAX_API_KEY_LENGTH} characters.`);
    } else if (/\s/.test(apiKey)) {
      errors.push('apiKey must not contain whitespace.');
    } else {
      next.apiKey = apiKey;
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
    const password = typeof input.adminPassword === 'string' ? input.adminPassword : '';
    if (password.length < 8) {
      errors.push('adminPassword must be at least 8 characters.');
    } else {
      next.adminPassword = hashAdminPassword(password);
    }
  }

  return { ok: errors.length === 0, errors, config: next };
};
