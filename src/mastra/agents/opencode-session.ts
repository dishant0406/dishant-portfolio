export const OPENCODE_SESSION_HEADER = 'x-opencode-session';

/**
 * OpenCode Go requires a stable `x-opencode-session` value per conversation so
 * it can route requests and reuse prompt caching. Requests without it are
 * rejected with "Request is missing x-opencode-session and cannot be routed
 * efficiently", which fails every guardrail check and therefore every message.
 *
 * https://opencode.ai/docs/go/#where-can-i-use-it
 */
const DEFAULT_SESSION_ID = 'dishant-portfolio';

const MAX_SESSION_ID_LENGTH = 128;

// The value ends up in an outbound request header, so treat it as untrusted
// input: allow only characters that are always safe in a header value. This
// drops CR/LF and other control characters, preventing header injection.
const UNSAFE_SESSION_CHARS = /[^A-Za-z0-9._:-]/g;

export const getOpencodeSessionId = (threadId: unknown) => {
  const rawValue = typeof threadId === 'string' ? threadId.trim() : '';
  const safeValue = rawValue
    .replace(UNSAFE_SESSION_CHARS, '')
    .slice(0, MAX_SESSION_ID_LENGTH);

  return safeValue || DEFAULT_SESSION_ID;
};

export const getOpencodeSessionHeaders = (threadId: unknown) => ({
  [OPENCODE_SESSION_HEADER]: getOpencodeSessionId(threadId),
});
