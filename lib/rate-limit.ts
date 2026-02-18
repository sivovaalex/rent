import { NextResponse } from 'next/server';

interface RateLimitConfig {
  interval: number; // in milliseconds
  maxRequests: number;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store for rate limiting (use Redis in production)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean up every minute

export function rateLimit(config: RateLimitConfig) {
  return {
    check: (identifier: string): { success: boolean; remaining: number; resetTime: number } => {
      const now = Date.now();
      const key = identifier;

      let entry = rateLimitStore.get(key);

      if (!entry || now > entry.resetTime) {
        // Create new entry or reset expired one
        entry = {
          count: 1,
          resetTime: now + config.interval,
        };
        rateLimitStore.set(key, entry);
        return {
          success: true,
          remaining: config.maxRequests - 1,
          resetTime: entry.resetTime,
        };
      }

      if (entry.count >= config.maxRequests) {
        return {
          success: false,
          remaining: 0,
          resetTime: entry.resetTime,
        };
      }

      entry.count++;
      rateLimitStore.set(key, entry);

      return {
        success: true,
        remaining: config.maxRequests - entry.count,
        resetTime: entry.resetTime,
      };
    },
  };
}

// Pre-configured rate limiters
export const authRateLimiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 requests per minute for auth
});

export const smsRateLimiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  maxRequests: 3, // 3 SMS per minute per phone number
});

export const apiRateLimiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  maxRequests: 100, // 100 requests per minute for general API
});

export function rateLimitResponse(resetTime: number) {
  const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
  return NextResponse.json(
    { error: 'Слишком много запросов. Попробуйте позже.' },
    {
      status: 429,
      headers: {
        'Retry-After': retryAfter.toString(),
        'X-RateLimit-Reset': resetTime.toString(),
      },
    }
  );
}

export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return 'unknown';
}
