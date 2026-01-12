import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * Comprehensive Health Check Endpoint
 *
 * Checks all critical dependencies and returns detailed status.
 * Used by monitoring tools, load balancers, and alerting systems.
 *
 * GET /api/health - Full health check with dependency status
 * GET /api/health?simple=true - Simple OK/ERROR response (faster)
 */

interface DependencyStatus {
    status: "ok" | "error" | "degraded";
    latencyMs?: number;
    error?: string;
}

interface HealthCheckResult {
    status: "ok" | "degraded" | "error";
    timestamp: string;
    uptime: number;
    dependencies: {
        supabase: DependencyStatus;
        storage: DependencyStatus;
        redis?: DependencyStatus;
    };
    version?: string;
}

// Track server start time for uptime calculation
const serverStartTime = Date.now();

/**
 * Check Supabase database connectivity
 */
async function checkSupabase(): Promise<DependencyStatus> {
    const start = Date.now();
    try {
        const supabase = createAdminClient();

        // Simple query to verify connection
        const { error } = await supabase
            .from("profiles")
            .select("id")
            .limit(1)
            .maybeSingle();

        if (error && error.code !== "PGRST116") {
            // PGRST116 = no rows found, which is OK
            throw error;
        }

        return {
            status: "ok",
            latencyMs: Date.now() - start,
        };
    } catch (error) {
        return {
            status: "error",
            latencyMs: Date.now() - start,
            error: error instanceof Error ? error.message : "Connection failed",
        };
    }
}

/**
 * Check Supabase Storage connectivity
 */
async function checkStorage(): Promise<DependencyStatus> {
    const start = Date.now();
    try {
        const supabase = createAdminClient();

        // List buckets to verify storage access
        const { error } = await supabase.storage.listBuckets();

        if (error) throw error;

        return {
            status: "ok",
            latencyMs: Date.now() - start,
        };
    } catch (error) {
        return {
            status: "error",
            latencyMs: Date.now() - start,
            error: error instanceof Error ? error.message : "Storage check failed",
        };
    }
}

/**
 * Check Redis (Upstash) connectivity if configured
 */
async function checkRedis(): Promise<DependencyStatus | null> {
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!redisUrl || !redisToken) {
        return null; // Redis not configured
    }

    const start = Date.now();
    try {
        const response = await fetch(`${redisUrl}/ping`, {
            headers: {
                Authorization: `Bearer ${redisToken}`,
            },
        });

        if (!response.ok) {
            throw new Error(`Redis ping failed: ${response.status}`);
        }

        const data = await response.json();
        if (data.result !== "PONG") {
            throw new Error("Unexpected Redis response");
        }

        return {
            status: "ok",
            latencyMs: Date.now() - start,
        };
    } catch (error) {
        return {
            status: "error",
            latencyMs: Date.now() - start,
            error: error instanceof Error ? error.message : "Redis check failed",
        };
    }
}

/**
 * Determine overall health status based on dependencies
 */
function getOverallStatus(deps: HealthCheckResult["dependencies"]): "ok" | "degraded" | "error" {
    const statuses = Object.values(deps).filter(Boolean).map((d) => d?.status);

    if (statuses.includes("error")) {
        // If Supabase is down, system is in error state
        if (deps.supabase.status === "error") {
            return "error";
        }
        // Other dependencies down = degraded
        return "degraded";
    }

    if (statuses.includes("degraded")) {
        return "degraded";
    }

    return "ok";
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const simple = searchParams.get("simple") === "true";

    // Simple health check for load balancers (fast)
    if (simple) {
        try {
            const supabase = createAdminClient();
            const { error } = await supabase.from("profiles").select("id").limit(1);
            if (error && error.code !== "PGRST116") throw error;

            return NextResponse.json({ status: "ok" }, { status: 200 });
        } catch {
            return NextResponse.json({ status: "error" }, { status: 503 });
        }
    }

    // Full health check with all dependencies
    const [supabase, storage, redis] = await Promise.all([
        checkSupabase(),
        checkStorage(),
        checkRedis(),
    ]);

    const dependencies: HealthCheckResult["dependencies"] = {
        supabase,
        storage,
    };

    if (redis) {
        dependencies.redis = redis;
    }

    const result: HealthCheckResult = {
        status: getOverallStatus(dependencies),
        timestamp: new Date().toISOString(),
        uptime: Math.floor((Date.now() - serverStartTime) / 1000),
        dependencies,
    };

    // Only include version in non-production for debugging
    if (process.env.NODE_ENV !== "production") {
        result.version = process.env.npm_package_version || "dev";
    }

    const httpStatus = result.status === "ok" ? 200 : result.status === "degraded" ? 200 : 503;

    return NextResponse.json(result, {
        status: httpStatus,
        headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
        },
    });
}

// HEAD request for simple uptime monitoring
export async function HEAD() {
    try {
        const supabase = createAdminClient();
        const { error } = await supabase.from("profiles").select("id").limit(1);
        if (error && error.code !== "PGRST116") throw error;

        return new NextResponse(null, { status: 200 });
    } catch {
        return new NextResponse(null, { status: 503 });
    }
}
