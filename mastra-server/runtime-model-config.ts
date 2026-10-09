import {
  getEnvModelConfig,
  normalizeModelConfig,
  readModelConfig,
  type ModelConfig,
} from '../src/lib/model-config';

/**
 * Model config for the chat server, cached for `cacheTtlSeconds`.
 *
 * When the config store is slow or unavailable the last good config is reused,
 * and if there is none the environment values are used. A refresh failure never
 * takes chat down.
 */

type CachedModelConfig = {
  config: ModelConfig;
  expiresAtMs: number;
};

let cachedModelConfig: CachedModelConfig | undefined;

const cacheConfig = (config: ModelConfig, nowMs: number) => {
  cachedModelConfig = {
    config,
    expiresAtMs: nowMs + config.cacheTtlSeconds * 1000,
  };
};

/** Called by the internal reload route so /admin saves apply immediately. */
export const clearRuntimeModelConfigCache = () => {
  cachedModelConfig = undefined;
};

export const getRuntimeModelConfig = async (): Promise<ModelConfig> => {
  const nowMs = Date.now();
  if (cachedModelConfig && cachedModelConfig.expiresAtMs > nowMs) {
    return cachedModelConfig.config;
  }

  try {
    const config = normalizeModelConfig(await readModelConfig());
    cacheConfig(config, nowMs);
    return config;
  } catch (error) {
    console.warn('Model config fetch failed; using stale or env config', error);

    const fallback = cachedModelConfig?.config ?? getEnvModelConfig();
    cacheConfig(fallback, nowMs);
    return fallback;
  }
};
