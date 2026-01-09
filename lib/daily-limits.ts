import { createAdminClient } from "./supabase/server";

/**
 * Daily limit check result
 */
export interface DailyLimitResult {
    allowed: boolean;
    remaining: number;
    resetsAt: Date;
    plan: string;
}

/**
 * Daily limit info (read-only, no locking)
 */
export interface DailyLimitInfo {
    plan: string;
    limit: number;
    used: number;
    remaining: number;
    resetsAt: Date | null;
}

/**
 * Check if user can generate (with atomic lock to prevent race conditions)
 * Call this BEFORE starting generation
 */
export async function checkDailyLimit(userId: string): Promise<DailyLimitResult> {
    const adminClient = createAdminClient();

    const { data, error } = await adminClient.rpc('check_daily_limit', {
        p_user_id: userId
    });

    if (error) {
        console.error("[DailyLimit] Check failed:", error);
        // On error, allow generation to prevent blocking users
        return {
            allowed: true,
            remaining: 0,
            resetsAt: new Date(),
            plan: 'unknown'
        };
    }

    // RPC returns an array with one row
    const result = Array.isArray(data) ? data[0] : data;

    return {
        allowed: result.allowed,
        remaining: result.remaining,
        resetsAt: new Date(result.resets_at),
        plan: result.plan_name
    };
}

/**
 * Increment daily generation count after successful generation
 * Call this AFTER generation completes successfully
 */
export async function incrementDailyGeneration(userId: string): Promise<boolean> {
    const adminClient = createAdminClient();

    const { data, error } = await adminClient.rpc('increment_daily_generation', {
        p_user_id: userId
    });

    if (error) {
        console.error("[DailyLimit] Increment failed:", error);
        return false;
    }

    const result = data as { success: boolean; new_count?: number };
    return result.success;
}

/**
 * Get user's daily limit info without modifying anything
 * Use this for displaying limit info in UI
 */
export async function getDailyLimitInfo(userId: string): Promise<DailyLimitInfo | null> {
    const adminClient = createAdminClient();

    const { data, error } = await adminClient.rpc('get_daily_limit_info', {
        p_user_id: userId
    });

    if (error) {
        console.error("[DailyLimit] Get info failed:", error);
        return null;
    }

    const result = data as {
        error?: string;
        plan?: string;
        limit?: number;
        used?: number;
        remaining?: number;
        resets_at?: string;
    };

    if (result.error) {
        return null;
    }

    return {
        plan: result.plan || 'free',
        limit: result.limit || 3,
        used: result.used || 0,
        remaining: result.remaining || 0,
        resetsAt: result.resets_at ? new Date(result.resets_at) : null
    };
}

/**
 * Format time until reset for user display
 */
export function formatTimeUntilReset(resetsAt: Date): string {
    const now = new Date();
    const diffMs = resetsAt.getTime() - now.getTime();

    if (diffMs <= 0) {
        return "now";
    }

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
}

/**
 * Create a standardized daily limit exceeded response
 */
export function createDailyLimitResponse(result: DailyLimitResult) {
    const resetTime = formatTimeUntilReset(result.resetsAt);

    return {
        error: "Daily generation limit reached",
        code: "DAILY_LIMIT_EXCEEDED",
        message: `You've reached your daily limit of generations. Your limit will reset in ${resetTime}.`,
        plan: result.plan,
        resetsAt: result.resetsAt.toISOString(),
        upgradeHint: result.plan === 'free'
            ? "Upgrade to Starter for 5 generations/day, or Creator for 10 generations/day."
            : result.plan === 'starter'
                ? "Upgrade to Creator for 10 generations/day, or Business for 20 generations/day."
                : result.plan === 'creator'
                    ? "Upgrade to Business for 20 generations/day."
                    : null
    };
}
