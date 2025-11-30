// In-memory rate limiter by IP address
// 1 message per second for POST requests to LLM endpoints

interface RateLimitEntry {
  count: number;
  lastReset: number;
}

// Store rate limit data by IP
const rateLimitStore = new Map<string, RateLimitEntry>();

// Configuration
const RATE_LIMIT_WINDOW_MS = 1000; // 1 second
const RATE_LIMIT_MAX_REQUESTS = 1; // 1 request per window

// Clean up old entries periodically (every 60 seconds)
const CLEANUP_INTERVAL_MS = 60000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  
  lastCleanup = now;
  const cutoff = now - RATE_LIMIT_WINDOW_MS * 10; // Keep entries for 10 windows
  
  for (const [ip, entry] of rateLimitStore.entries()) {
    if (entry.lastReset < cutoff) {
      rateLimitStore.delete(ip);
    }
  }
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetIn: number; // milliseconds until reset
}

/**
 * Check if a request should be rate limited
 * @param ip - The IP address to check
 * @returns RateLimitResult with success status and metadata
 */
export function checkRateLimit(ip: string): RateLimitResult {
  cleanup();
  
  const now = Date.now();
  const entry = rateLimitStore.get(ip);
  
  // If no entry or window has passed, create/reset entry
  if (!entry || now - entry.lastReset >= RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(ip, { count: 1, lastReset: now });
    return {
      success: true,
      remaining: RATE_LIMIT_MAX_REQUESTS - 1,
      resetIn: RATE_LIMIT_WINDOW_MS,
    };
  }
  
  // Check if under limit
  if (entry.count < RATE_LIMIT_MAX_REQUESTS) {
    entry.count++;
    return {
      success: true,
      remaining: RATE_LIMIT_MAX_REQUESTS - entry.count,
      resetIn: RATE_LIMIT_WINDOW_MS - (now - entry.lastReset),
    };
  }
  
  // Over limit
  return {
    success: false,
    remaining: 0,
    resetIn: RATE_LIMIT_WINDOW_MS - (now - entry.lastReset),
  };
}

/**
 * Get client IP from Next.js request
 * @param request - The NextRequest object
 * @returns The client IP address
 */
export function getClientIP(request: Request): string {
  // Try various headers for IP (when behind proxies/load balancers)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  
  // Fallback for local development
  return '127.0.0.1';
}

/**
 * Create a rate limit error response
 * @param resetIn - Milliseconds until rate limit resets
 * @returns A Response object with 429 status
 */
export function createRateLimitResponse(resetIn: number): Response {
  return new Response(
    JSON.stringify({
      error: 'Rate limit exceeded',
      message: 'Please wait a moment before sending another message',
      retryAfter: Math.ceil(resetIn / 1000),
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(Math.ceil(resetIn / 1000)),
        'X-RateLimit-Limit': String(RATE_LIMIT_MAX_REQUESTS),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(Math.ceil((Date.now() + resetIn) / 1000)),
      },
    }
  );
}
