import 'server-only';
import { createHash } from 'node:crypto';

/**
 * The Next.js process and the Mastra chat process each cache the model config,
 * so an /admin save has to tell Mastra to drop its copy. Cloud Run keeps Mastra
 * on an internal port that is not reachable from the internet, so the request
 * stays on localhost and is authenticated with the shared INTERNAL_API_TOKEN.
 */

const getInternalToken = () => {
  const token = process.env.INTERNAL_API_TOKEN?.trim();
  return token || undefined;
};

/**
 * The internal token is created with `openssl rand -hex 32`. When it has not
 * been set the reload is skipped, and the chat server picks the change up on
 * the next cache expiry instead.
 */
export const requestMastraModelConfigReload = async (): Promise<
  { reloaded: true } | { reloaded: false; reason: string }
> => {
  const token = getInternalToken();
  if (!token) {
    return { reloaded: false, reason: 'INTERNAL_API_TOKEN is not set' };
  }

  const baseUrl = process.env.MASTRA_API_URL || 'http://localhost:4000';

  try {
    const response = await fetch(`${baseUrl}/internal/model-config/reload`, {
      method: 'POST',
      headers: { 'x-internal-token': token },
      cache: 'no-store',
    });

    if (!response.ok) {
      return { reloaded: false, reason: `Mastra reload responded with ${response.status}` };
    }

    return { reloaded: true };
  } catch (error) {
    return { reloaded: false, reason: String(error) };
  }
};

/** Short, stable session id derived from the model so test calls are routable. */
export const getAdminTestSessionId = (modelId: string) =>
  `admin-${createHash('sha256').update(modelId).digest('hex').slice(0, 16)}`;
