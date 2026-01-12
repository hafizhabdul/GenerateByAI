import { NextResponse } from "next/server";

/**
 * Rate Limiting with Upstash Redis
 *
 * This implementation uses Upstash Redis for distributed rate limiting
 * that works across serverless instances. Falls back to in-memory
 * if Redis is not configured.
 *
 * Setup:
 * 1. Create free account at https://upstash.com
 * 2. Create a Redis database
 * 3. Add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to .env
 */

// Check if Upstash is configured
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const IS_REDIS_CONFIGURED = !!(UPSTASH_URL && UPSTASH_TOKEN);

// Log once on startup
if (!IS_REDIS_CONFIGURED) {
    console.warn(
        "[RateLimit] Upstash Redis not configured. Using in-memory fallback. " +
        "Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN for production."
    );
}

// ============================================================================
// Redis Implementation (Primary - for production)
// ============================================================================

interface RedisRateLimitResult {
    success: boolean;
    limit: number;
    remaining: number;
    reset: number;
}

async function checkRateLimitRedis(
    identifier: string,
    limit: number,
    windowMs: number
): Promise<RedisRateLimitResult> {
    const windowSeconds = Math.ceil(windowMs / 1000);
    const key = `ratelimit:${identifier}`;

    try {
        // Use Upstash REST API directly for simplicity (no extra deps)
        const now = Math.floor(Date.now() / 1000);
        const windowStart = now - windowSeconds;

        // Pipeline: Remove old entries, add current, count, set expiry
        const pipeline = [
            // Remove entries older than window
            ["ZREMRANGEBYSCORE", key, "0", String(windowStart)],
            // Add current request with timestamp as score
            ["ZADD", key, String(now), `${now}:${Math.random()}`],
            // Count requests in window
            ["ZCARD", key],
            // Set expiry on the key
            ["EXPIRE", key, String(windowSeconds + 1)],
        ];

        const response = await fetch(`${UPSTASH_URL}/pipeline`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${UPSTASH_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(pipeline),
        });

        if (!response.ok) {
            throw new Error(`Redis error: ${response.status}`);
        }

        const results = await response.json();
        const count = results[2]?.result || 0;
        const remaining = Math.max(0, limit - count);

        return {
            success: count <= limit,
            limit,
            remaining,
            reset: windowMs,
        };
    } catch (error) {
        console.error("[RateLimit] Redis error, falling back:", error);
        // Fallback to in-memory on Redis failure
        return checkRateLimitMemory(identifier, limit, windowMs);
    }
}

// ============================================================================
// In-Memory Fallback (for development or Redis failure)
// ============================================================================

interface RateLimitRecord {
    count: number;
    resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();
const MAX_STORE_SIZE = 10000; // Prevent memory leak
let lastCleanup = Date.now();

function cleanupMemoryStore() {
    const now = Date.now();
    if (now - lastCleanup < 60000) return; // Cleanup every minute

    // Remove expired entries
    for (const [key, record] of rateLimitStore.entries()) {
        if (now > record.resetTime) {
            rateLimitStore.delete(key);
        }
    }

    // If still too large, remove oldest entries
    if (rateLimitStore.size > MAX_STORE_SIZE) {
        const entries = Array.from(rateLimitStore.entries());
        entries.sort((a, b) => a[1].resetTime - b[1].resetTime);
        const toRemove = entries.slice(0, entries.length - MAX_STORE_SIZE / 2);
        toRemove.forEach(([key]) => rateLimitStore.delete(key));
    }

    lastCleanup = now;
}

function checkRateLimitMemory(
    identifier: string,
    limit: number,
    windowMs: number
): RedisRateLimitResult {
    cleanupMemoryStore();

    const now = Date.now();
    const record = rateLimitStore.get(identifier);

    // First request or window expired
    if (!record || now > record.resetTime) {
        rateLimitStore.set(identifier, { count: 1, resetTime: now + windowMs });
        return { success: true, limit, remaining: limit - 1, reset: windowMs };
    }

    // Rate limit exceeded
    if (record.count >= limit) {
        return {
            success: false,
            limit,
            remaining: 0,
            reset: record.resetTime - now,
        };
    }

    // Increment count
    record.count++;
    return {
        success: true,
        limit,
        remaining: limit - record.count,
        reset: record.resetTime - now,
    };
}

// ============================================================================
// Public API (backward compatible)
// ============================================================================

export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetIn: number;
}

/**
 * Check rate limit for an identifier
 * Uses Redis if configured, falls back to in-memory
 */
export async function checkRateLimitAsync(
    identifier: string,
    limit: number = 10,
    windowMs: number = 60000
): Promise<RateLimitResult> {
    const result = IS_REDIS_CONFIGURED
        ? await checkRateLimitRedis(identifier, limit, windowMs)
        : checkRateLimitMemory(identifier, limit, windowMs);

    return {
        allowed: result.success,
        remaining: result.remaining,
        resetIn: result.reset,
    };
}

/**
 * Synchronous rate limit check (in-memory only)
 * @deprecated Use checkRateLimitAsync for production
 */
export function checkRateLimit(
    identifier: string,
    limit: number = 10,
    windowMs: number = 60000
): RateLimitResult {
    // For sync calls, use memory store only
    const result = checkRateLimitMemory(identifier, limit, windowMs);
    return {
        allowed: result.success,
        remaining: result.remaining,
        resetIn: result.reset,
    };
}

/**
 * Create a 429 Too Many Requests response
 */
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
    // Upload: 20 per minute
    upload: { limit: 20, windowMs: 60000 },
    // Checkout: 5 per minute
    checkout: { limit: 5, windowMs: 60000 },
    // Community: 30 per minute
    community: { limit: 30, windowMs: 60000 },
} as const;

export type RateLimitType = keyof typeof RATE_LIMITS;

/**
 * Apply rate limit and return response if exceeded (async version)
 */
export async function applyRateLimitAsync(
    identifier: string,
    type: RateLimitType = "general"
): Promise<{ allowed: boolean; response?: NextResponse }> {
    const config = RATE_LIMITS[type];
    const result = await checkRateLimitAsync(identifier, config.limit, config.windowMs);

    if (!result.allowed) {
        return {
            allowed: false,
            response: createRateLimitResponse(result.resetIn),
        };
    }

    return { allowed: true };
}

/**
 * Apply rate limit (sync version - in-memory only)
 * @deprecated Use applyRateLimitAsync for production
 */
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

/**
 * Get client IP from request headers
 * Works with Vercel, Cloudflare, and other proxies
 */
export function getClientIP(req: Request): string {
    const forwarded = req.headers.get("x-forwarded-for");
    if (forwarded) {
        return forwarded.split(",")[0].trim();
    }

    const realIP = req.headers.get("x-real-ip");
    if (realIP) {
        return realIP;
    }

    const cfIP = req.headers.get("cf-connecting-ip");
    if (cfIP) {
        return cfIP;
    }

    return "unknown";
}
