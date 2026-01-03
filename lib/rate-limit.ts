import { NextResponse } from "next/server";

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

// In-memory store - for production, consider Redis
const rateLimitStore = new Map<string, RateLimitRecord>();

// Clean up expired entries periodically
const CLEANUP_INTERVAL = 60000; // 1 minute
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;

  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
  lastCleanup = now;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number;
}

export function checkRateLimit(
  identifier: string,
  limit: number = 10,
  windowMs: number = 60000 // 1 minute default
): RateLimitResult {
  cleanup();

  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  // First request or window expired
  if (!record || now > record.resetTime) {
    rateLimitStore.set(identifier, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetIn: windowMs };
  }

  // Rate limit exceeded
  if (record.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: record.resetTime - now,
    };
  }

  // Increment count
  record.count++;
  return {
    allowed: true,
    remaining: limit - record.count,
    resetIn: record.resetTime - now,
  };
}

export function createRateLimitResponse(resetIn: number): NextResponse {
  return NextResponse.json(
    {
      error: "Too many requests. Please try again later.",
      code: "RATE_LIMIT_EXCEEDED",
    },
    {
      status: 429,
      headers: {
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(Math.ceil(resetIn / 1000)),
        "Retry-After": String(Math.ceil(resetIn / 1000)),
      },
    }
  );
}

// Rate limit configurations for different endpoints
export const RATE_LIMITS = {
  // Image generation: 10 per minute
  "generate-image": { limit: 10, windowMs: 60000 },
  // Image editing: 10 per minute
  "edit-image": { limit: 10, windowMs: 60000 },
  // Video generation: 5 per minute (more expensive)
  "generate-video": { limit: 5, windowMs: 60000 },
  // General API: 60 per minute
  general: { limit: 60, windowMs: 60000 },
} as const;

export type RateLimitType = keyof typeof RATE_LIMITS;

export function applyRateLimit(
  identifier: string,
  type: RateLimitType = "general"
): { allowed: boolean; response?: NextResponse } {
  const config = RATE_LIMITS[type];
  const result = checkRateLimit(identifier, config.limit, config.windowMs);

  if (!result.allowed) {
    return {
      allowed: false,
      response: createRateLimitResponse(result.resetIn),
    };
  }

  return { allowed: true };
}
