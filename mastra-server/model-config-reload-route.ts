import { timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';
import { clearRuntimeModelConfigCache, getRuntimeModelConfig } from './runtime-model-config';

/**
 * Internal endpoint that drops the cached model config so the next chat request
 * picks up an /admin save immediately instead of waiting for the cache TTL.
 *
 * This process (Mastra) and the admin UI (Next.js) are separate Node processes,
 * so the cache cannot simply be shared. The route is not exposed publicly:
 * Cloud Run only forwards to the Next.js port, and the caller must present the
 * shared secret in `INTERNAL_API_TOKEN`.
 */

const tokenMatches = (provided: string, expected: string) => {
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);

  if (providedBuffer.length !== expectedBuffer.length) return false;

  return timingSafeEqual(providedBuffer, expectedBuffer);
};

export const reloadModelConfig = async (req: Request, res: Response) => {
  const expectedToken = process.env.INTERNAL_API_TOKEN?.trim();

  if (!expectedToken) {
    res.status(503).json({ error: 'Model config reload is not configured' });
    return;
  }

  const providedToken = req.header('x-internal-token') ?? '';
  if (!tokenMatches(providedToken, expectedToken)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  clearRuntimeModelConfigCache();
  const config = await getRuntimeModelConfig();

  res.json({
    reloaded: true,
    model: config.model,
    fallbackModel: config.fallbackModel,
    guardrailModel: config.guardrailModel,
  });
};
