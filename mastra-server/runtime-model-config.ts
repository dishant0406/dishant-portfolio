import {
  getGuardrailModelId,
  getPortfolioModelId,
} from '../src/mastra/agents/opencode-chat-model';
import { getOpencodeFallbackModelId } from './opencode-model-fallback';
import { getOpencodeThinkingMode, type ThinkingMode } from './opencode-thinking';
import { readRawModelConfig } from './model-config-source';

export type RuntimeModelConfig = {
  model: string;
  fallbackModel: string;
  guardrailModel: string;
  thinkingMode: ThinkingMode;
  cacheTtlSeconds: number;
};

type CachedModelConfig = {
  config: RuntimeModelConfig;
  expiresAtMs: number;
};

const DEFAULT_CACHE_TTL_SECONDS = 60;
const MIN_CACHE_TTL_SECONDS = 5;
const MAX_CACHE_TTL_SECONDS = 3600;

let cachedModelConfig: CachedModelConfig | undefined;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const nonEmptyString = (value: unknown, fallback: string) => {
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

const envModelConfig = (): RuntimeModelConfig => ({
  model: getPortfolioModelId(),
  fallbackModel: getOpencodeFallbackModelId(),
  guardrailModel: getGuardrailModelId(),
  thinkingMode: getOpencodeThinkingMode(),
  cacheTtlSeconds: clampTtl(process.env.MODEL_CONFIG_CACHE_TTL_SECONDS),
});

const normalizeModelConfig = (rawConfig: unknown): RuntimeModelConfig => {
  const fallback = envModelConfig();
  if (!isRecord(rawConfig)) return fallback;

  return {
    model: nonEmptyString(rawConfig.model, fallback.model),
    fallbackModel: nonEmptyString(rawConfig.fallbackModel, fallback.fallbackModel),
    guardrailModel: nonEmptyString(rawConfig.guardrailModel, fallback.guardrailModel),
    thinkingMode: getOpencodeThinkingMode(rawConfig.thinkingMode ?? fallback.thinkingMode),
    cacheTtlSeconds: clampTtl(rawConfig.cacheTtlSeconds ?? fallback.cacheTtlSeconds),
  };
};

const cacheConfig = (config: RuntimeModelConfig, nowMs: number) => {
  cachedModelConfig = {
    config,
    expiresAtMs: nowMs + config.cacheTtlSeconds * 1000,
  };
};

export const getRuntimeModelConfig = async (): Promise<RuntimeModelConfig> => {
  const nowMs = Date.now();
  if (cachedModelConfig && cachedModelConfig.expiresAtMs > nowMs) {
    return cachedModelConfig.config;
  }

  try {
    const rawConfig = await readRawModelConfig();
    const config = normalizeModelConfig(rawConfig);
    cacheConfig(config, nowMs);
    return config;
  } catch (error) {
    console.warn('Model config fetch failed; using stale or env config', error);

    if (cachedModelConfig) {
      cacheConfig(cachedModelConfig.config, nowMs);
      return cachedModelConfig.config;
    }

    const config = envModelConfig();
    cacheConfig(config, nowMs);
    return config;
  }
};
