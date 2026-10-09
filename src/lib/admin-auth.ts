import 'server-only';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { normalizeModelConfig, readModelConfig, verifyAdminPassword } from './model-config';

/**
 * Admin authentication for /admin.
 *
 * A successful login sets a signed, HttpOnly cookie. The signature is an HMAC
 * over the session payload, so the cookie cannot be forged or edited, and the
 * payload carries an expiry that is checked on every request.
 */

const SESSION_COOKIE = 'portfolio_admin_session';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;

const getSessionSecret = () => {
  const secret = process.env.ADMIN_SESSION_SECRET?.trim();
  if (secret) return secret;

  if (process.env.NODE_ENV === 'production') {
    throw new Error('ADMIN_SESSION_SECRET must be set in production');
  }

  // Development-only fallback so the admin works without extra setup locally.
  return 'dev-only-admin-session-secret';
};

const sign = (payload: string) =>
  createHmac('sha256', getSessionSecret()).update(payload).digest('base64url');

const safeEqual = (left: string, right: string) => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) return false;

  return timingSafeEqual(leftBuffer, rightBuffer);
};

export const createSessionToken = () => {
  const expiresAt = String(Date.now() + SESSION_TTL_MS);
  const nonce = randomBytes(16).toString('base64url');
  const payload = `${expiresAt}.${nonce}`;

  return `${payload}.${sign(payload)}`;
};

export const isSessionTokenValid = (token: string | undefined) => {
  if (!token) return false;

  const parts = token.split('.');
  if (parts.length !== 3) return false;

  const [expiresAt, nonce, signature] = parts;
  if (!safeEqual(signature, sign(`${expiresAt}.${nonce}`))) return false;

  const expiry = Number(expiresAt);
  return Number.isFinite(expiry) && expiry > Date.now();
};

export const getAdminSessionCookieName = () => SESSION_COOKIE;

export const getAdminSessionMaxAgeSeconds = () => Math.floor(SESSION_TTL_MS / 1000);

/**
 * The password lives in the same config file as the model settings. The default
 * from `model-config.ts` applies until it is changed through /admin.
 */
export const isAdminPasswordValid = async (password: string) => {
  const config = normalizeModelConfig(await readModelConfig());
  if (!config.adminPassword) return false;

  return verifyAdminPassword(config.adminPassword, password);
};

export const requireAdminSession = async () => {
  const cookieStore = await cookies();
  return isSessionTokenValid(cookieStore.get(SESSION_COOKIE)?.value);
};

/**
 * Admin responses must never be cached or indexed. Both are set here so no
 * route can forget them.
 */
export const adminJson = (body: unknown, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });

/**
 * Blocks cross-site form posts, which are the only requests that can skip a CORS
 * preflight. SameSite=Strict already covers this, so this is defence in depth.
 *
 * The comparison uses the forwarded/host header rather than `request.url`,
 * because behind Cloud Run's proxy `request.url` is built from the internal
 * address, not the public host the browser sent.
 */
export const isSameOriginRequest = (request: Request) => {
  const origin = request.headers.get('origin');
  if (!origin) return false;

  const requestHost = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  if (!requestHost) return false;

  try {
    return new URL(origin).host === requestHost;
  } catch {
    return false;
  }
};

/** Returns a 401 response when there is no valid admin session, otherwise null. */
export const requireAdminApi = async () => {
  try {
    if (await requireAdminSession()) return null;
  } catch (error) {
    // e.g. ADMIN_SESSION_SECRET missing in production. Fail closed with a
    // generic response instead of leaking a stack trace.
    console.error('Admin session check failed:', error);
  }

  return adminJson({ error: 'Unauthorized' }, 401);
};

// ---------------------------------------------------------------------------
// Login throttling
// ---------------------------------------------------------------------------

type LoginAttempts = { count: number; firstAttemptMs: number };

const loginAttempts = new Map<string, LoginAttempts>();

/** Drops entries whose window has passed so the map cannot grow forever. */
const pruneLoginAttempts = (now: number) => {
  for (const [ip, entry] of loginAttempts) {
    if (now - entry.firstAttemptMs > LOGIN_WINDOW_MS) loginAttempts.delete(ip);
  }
};

/** Returns false when the caller has used up its attempts for the window. */
export const registerLoginAttempt = (ip: string) => {
  const now = Date.now();
  pruneLoginAttempts(now);

  const entry = loginAttempts.get(ip);

  if (!entry) {
    loginAttempts.set(ip, { count: 1, firstAttemptMs: now });
    return true;
  }

  entry.count += 1;
  return entry.count <= MAX_LOGIN_ATTEMPTS;
};

export const clearLoginAttempts = (ip: string) => {
  loginAttempts.delete(ip);
};

export const getLoginRetryAfterSeconds = (ip: string) => {
  const entry = loginAttempts.get(ip);
  if (!entry) return 0;

  return Math.max(0, Math.ceil((entry.firstAttemptMs + LOGIN_WINDOW_MS - Date.now()) / 1000));
};
