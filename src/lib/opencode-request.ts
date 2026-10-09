/**
 * Everything OpenCode Go expects a client to identify itself with.
 *
 * This lives outside `src/mastra` and avoids `server-only` so the same code
 * serves the chat server, the admin "test model" action and the catalog probe.
 *
 * Two requirements come from https://opencode.ai/docs/go/#where-can-i-use-it:
 *   - a stable `x-opencode-session` per conversation, or the request is rejected
 *     with `MissingSessionID`
 *   - a client user agent, instead of the default SDK one
 */

export const OPENCODE_SESSION_HEADER = 'x-opencode-session';

const DEFAULT_SESSION_ID = 'dishant-portfolio';
const MAX_SESSION_ID_LENGTH = 128;

// The value ends up in an outbound request header, so treat it as untrusted
// input: allow only characters that are always safe in a header value. This
// drops CR/LF and other control characters, preventing header injection.
const UNSAFE_SESSION_CHARS = /[^A-Za-z0-9._:-]/g;

export const getOpencodeSessionId = (threadId: unknown) => {
  const rawValue = typeof threadId === 'string' ? threadId.trim() : '';
  const safeValue = rawValue.replace(UNSAFE_SESSION_CHARS, '').slice(0, MAX_SESSION_ID_LENGTH);

  return safeValue || DEFAULT_SESSION_ID;
};

export const getOpencodeSessionHeaders = (threadId: unknown) => ({
  [OPENCODE_SESSION_HEADER]: getOpencodeSessionId(threadId),
});

export const getOpencodeRequestHeaders = (sessionId: unknown) => ({
  'User-Agent': process.env.OPENCODE_USER_AGENT || 'dishant-portfolio/1.0',
  'HTTP-Referer': process.env.OPENCODE_HTTP_REFERER || 'https://dishantsharma.dev',
  ...getOpencodeSessionHeaders(sessionId),
});
