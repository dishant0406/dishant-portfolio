// Security utilities for API routes
// CORS protection and enhanced rate limiting

import { NextRequest } from 'next/server';

// ==========================================
// CORS Configuration
// ==========================================

// Get allowed origins from environment or default to same-origin only
const getAllowedOrigins = (): string[] => {
  const envOrigins = process.env.ALLOWED_ORIGINS;
  if (envOrigins) {
    return envOrigins.split(',').map(o => o.trim());
  }
  
  // Default allowed origins
  const origins = [
    'https://dishantsharma.dev',
    'https://www.dishantsharma.dev',
    'http://localhost:3000',
    'http://localhost:3001',
  ];
  
  return origins;
};

/**
 * Check if the request origin is allowed
 */
export function isOriginAllowed(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  
  // Allow same-origin requests (no origin header means same-origin)
  if (!origin) {
    // For same-origin requests, check referer as a fallback
    if (referer) {
      const refererOrigin = new URL(referer).origin;
      return getAllowedOrigins().includes(refererOrigin);
    }
    // No origin and no referer - likely server-side or curl, allow in dev
    return process.env.NODE_ENV === 'development';
  }
  
  return getAllowedOrigins().includes(origin);
}

/**
 * Get CORS headers for the response
 */
export function getCorsHeaders(request: NextRequest): Record<string, string> {
  const origin = request.headers.get('origin');
  const allowedOrigins = getAllowedOrigins();
  
  // If origin is in allowed list, return it; otherwise return first allowed origin
  const allowedOrigin = origin && allowedOrigins.includes(origin) 
    ? origin 
    : allowedOrigins[0];
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400', // 24 hours
  };
}

/**
 * Create a CORS error response
 */
export function createCorsErrorResponse(): Response {
  return new Response(
    JSON.stringify({
      error: 'Forbidden',
      message: 'Cross-origin requests are not allowed from this origin',
    }),
    {
      status: 403,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}

/**
 * Handle OPTIONS preflight request
 */
export function handleCorsPreflightRequest(request: NextRequest): Response {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(request),
  });
}

// ==========================================
// Enhanced Rate Limiting
// ==========================================

interface RateLimitEntry {
  shortTermCount: number;  // Per-second count
  shortTermReset: number;  // When short-term resets
  longTermCount: number;   // Per-hour count
  longTermReset: number;   // When long-term resets
  dailyCount: number;      // Per-day count
  dailyReset: number;      // When daily resets
}

// Store rate limit data by IP
const rateLimitStore = new Map<string, RateLimitEntry>();

// Configuration
const RATE_LIMITS = {
  SHORT_TERM: {
    WINDOW_MS: 1000,        // 1 second
    MAX_REQUESTS: 2,        // 2 requests per second (allow small burst)
  },
  LONG_TERM: {
    WINDOW_MS: 60 * 1000,   // 1 minute
    MAX_REQUESTS: 20,       // 20 requests per minute
  },
  DAILY: {
    WINDOW_MS: 24 * 60 * 60 * 1000,  // 24 hours
    MAX_REQUESTS: 500,                // 500 requests per day per IP
  },
};

// Clean up old entries periodically
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  
  lastCleanup = now;
  const cutoff = now - RATE_LIMITS.DAILY.WINDOW_MS;
  
  for (const [ip, entry] of rateLimitStore.entries()) {
    if (entry.dailyReset < cutoff) {
      rateLimitStore.delete(ip);
    }
  }
}

export interface EnhancedRateLimitResult {
  success: boolean;
  remaining: {
    shortTerm: number;
    longTerm: number;
    daily: number;
  };
  resetIn: number;
  reason?: 'short_term' | 'long_term' | 'daily';
}

/**
 * Get client IP from Next.js request
 */
export function getClientIP(request: NextRequest): string {
  // Vercel-specific header
  const vercelIp = request.headers.get('x-vercel-forwarded-for');
  if (vercelIp) {
    return vercelIp.split(',')[0].trim();
  }
  
  // Standard proxy headers
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
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
 * Enhanced rate limit check with multiple windows
 */
export function checkEnhancedRateLimit(ip: string): EnhancedRateLimitResult {
  cleanup();
  
  const now = Date.now();
  let entry = rateLimitStore.get(ip);
  
  // Initialize entry if doesn't exist
  if (!entry) {
    entry = {
      shortTermCount: 0,
      shortTermReset: now + RATE_LIMITS.SHORT_TERM.WINDOW_MS,
      longTermCount: 0,
      longTermReset: now + RATE_LIMITS.LONG_TERM.WINDOW_MS,
      dailyCount: 0,
      dailyReset: now + RATE_LIMITS.DAILY.WINDOW_MS,
    };
    rateLimitStore.set(ip, entry);
  }
  
  // Reset windows if expired
  if (now >= entry.shortTermReset) {
    entry.shortTermCount = 0;
    entry.shortTermReset = now + RATE_LIMITS.SHORT_TERM.WINDOW_MS;
  }
  
  if (now >= entry.longTermReset) {
    entry.longTermCount = 0;
    entry.longTermReset = now + RATE_LIMITS.LONG_TERM.WINDOW_MS;
  }
  
  if (now >= entry.dailyReset) {
    entry.dailyCount = 0;
    entry.dailyReset = now + RATE_LIMITS.DAILY.WINDOW_MS;
  }
  
  // Check each limit
  if (entry.shortTermCount >= RATE_LIMITS.SHORT_TERM.MAX_REQUESTS) {
    return {
      success: false,
      remaining: {
        shortTerm: 0,
        longTerm: RATE_LIMITS.LONG_TERM.MAX_REQUESTS - entry.longTermCount,
        daily: RATE_LIMITS.DAILY.MAX_REQUESTS - entry.dailyCount,
      },
      resetIn: entry.shortTermReset - now,
      reason: 'short_term',
    };
  }
  
  if (entry.longTermCount >= RATE_LIMITS.LONG_TERM.MAX_REQUESTS) {
    return {
      success: false,
      remaining: {
        shortTerm: RATE_LIMITS.SHORT_TERM.MAX_REQUESTS - entry.shortTermCount,
        longTerm: 0,
        daily: RATE_LIMITS.DAILY.MAX_REQUESTS - entry.dailyCount,
      },
      resetIn: entry.longTermReset - now,
      reason: 'long_term',
    };
  }
  
  if (entry.dailyCount >= RATE_LIMITS.DAILY.MAX_REQUESTS) {
    return {
      success: false,
      remaining: {
        shortTerm: RATE_LIMITS.SHORT_TERM.MAX_REQUESTS - entry.shortTermCount,
        longTerm: RATE_LIMITS.LONG_TERM.MAX_REQUESTS - entry.longTermCount,
        daily: 0,
      },
      resetIn: entry.dailyReset - now,
      reason: 'daily',
    };
  }
  
  // Increment all counters
  entry.shortTermCount++;
  entry.longTermCount++;
  entry.dailyCount++;
  
  return {
    success: true,
    remaining: {
      shortTerm: RATE_LIMITS.SHORT_TERM.MAX_REQUESTS - entry.shortTermCount,
      longTerm: RATE_LIMITS.LONG_TERM.MAX_REQUESTS - entry.longTermCount,
      daily: RATE_LIMITS.DAILY.MAX_REQUESTS - entry.dailyCount,
    },
    resetIn: 0,
  };
}

/**
 * Create a rate limit error response
 */
export function createEnhancedRateLimitResponse(result: EnhancedRateLimitResult): Response {
  const messages: Record<string, string> = {
    short_term: 'Too many requests. Please wait a moment.',
    long_term: 'Too many requests this minute. Please slow down.',
    daily: 'Daily request limit reached. Please try again tomorrow.',
  };
  
  return new Response(
    JSON.stringify({
      error: 'Rate limit exceeded',
      message: messages[result.reason || 'short_term'],
      retryAfter: Math.ceil(result.resetIn / 1000),
      remaining: result.remaining,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(Math.ceil(result.resetIn / 1000)),
        'X-RateLimit-Remaining-Minute': String(result.remaining.longTerm),
        'X-RateLimit-Remaining-Day': String(result.remaining.daily),
      },
    }
  );
}

// ==========================================
// Combined Security Check
// ==========================================

export interface SecurityCheckResult {
  success: boolean;
  response?: Response;
  corsHeaders: Record<string, string>;
}

/**
 * Combined security check for API routes
 * Checks CORS and rate limiting in one call
 */
export function checkApiSecurity(request: NextRequest): SecurityCheckResult {
  const corsHeaders = getCorsHeaders(request);
  
  // Handle preflight
  if (request.method === 'OPTIONS') {
    return {
      success: true,
      response: handleCorsPreflightRequest(request),
      corsHeaders,
    };
  }
  
  // Check CORS (skip for GET requests which are generally safe)
  if (request.method !== 'GET' && !isOriginAllowed(request)) {
    return {
      success: false,
      response: createCorsErrorResponse(),
      corsHeaders,
    };
  }
  
  // Check rate limit for POST requests
  if (request.method === 'POST') {
    const ip = getClientIP(request);
    const rateLimitResult = checkEnhancedRateLimit(ip);
    
    if (!rateLimitResult.success) {
      return {
        success: false,
        response: createEnhancedRateLimitResponse(rateLimitResult),
        corsHeaders,
      };
    }
  }
  
  return {
    success: true,
    corsHeaders,
  };
}

/**
 * Add CORS headers to a response
 */
export function addCorsHeaders(response: Response, corsHeaders: Record<string, string>): Response {
  const newHeaders = new Headers(response.headers);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    newHeaders.set(key, value);
  });
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}
