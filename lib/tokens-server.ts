import { createAdminClient } from "./supabase/server";

/**
 * Token charge result with reservation ID for tracking
 */
export interface TokenChargeResult {
    reservationId: string;
    commit: () => Promise<void>;
    cancel: () => Promise<void>;
}

/**
 * Commit a token charge by reservation ID.
 */
export async function commitTokenCharge(reservationId: string): Promise<{ success: boolean; message: string }> {
    const adminClient = createAdminClient();
    const { data: commitData, error: commitError } = await adminClient.rpc('commit_token_charge', {
        p_reservation_id: reservationId
    });

    if (commitError) {
        console.error("[Token] Commit charge RPC error:", commitError);
        return { success: false, message: commitError.message };
    }

    const commitResult = commitData as { success: boolean; message?: string };
    if (!commitResult.success) {
        console.error("[Token] Commit failed:", commitResult.message);
    }

    return {
        success: commitResult.success,
        message: commitResult.message || (commitResult.success ? "Committed" : "Commit failed")
    };
}

/**
 * Cancel a token reservation by reservation ID.
 */
export async function cancelTokenReservation(reservationId: string): Promise<void> {
    const adminClient = createAdminClient();
    const { error: cancelError } = await adminClient.rpc('cancel_token_reservation', {
        p_reservation_id: reservationId
    });

    if (cancelError) {
        console.error("[Token] Cancel reservation RPC error:", cancelError);
    }
}

/**
 * Shared logic for checking balance and reserving tokens atomically.
 * Uses database-level locking to prevent race conditions.
 * This should be used across all generation APIs (Server-side ONLY).
 *
 * Flow:
 * 1. Call processTokenCharge() - reserves tokens atomically
 * 2. Perform the AI generation
 * 3. On success: call result.commit() to deduct tokens
 * 4. On failure: call result.cancel() to release the reservation
 */
export async function processTokenCharge(userId: string, cost: number): Promise<TokenChargeResult> {
    const adminClient = createAdminClient();

    // Use atomic reservation function
    const { data, error } = await adminClient.rpc('reserve_tokens', {
        p_user_id: userId,
        p_cost: cost
    });

    if (error) {
        console.error("[Token] Reserve tokens RPC error:", error);
        throw new Error("Failed to process token charge. Please try again.");
    }

    const result = data as { success: boolean; message?: string; reservation_id?: string; available_after?: number };

    if (!result.success) {
        throw new Error(result.message || "Insufficient tokens for this action.");
    }

    const reservationId = result.reservation_id as string;

    // Return commit and cancel functions
    return {
        reservationId,

        // Commit: deduct tokens after successful generation
        commit: async () => {
            await commitTokenCharge(reservationId);
        },

        // Cancel: release reservation if generation failed
        cancel: async () => {
            await cancelTokenReservation(reservationId);
        }
    };
}

/**
 * Refund tokens for a failed generation.
 * This should be called when a generation fails AFTER tokens were committed.
 */
export async function refundTokens(
    userId: string,
    amount: number,
    generationId?: string,
    reason: string = "Generation failed"
): Promise<{ success: boolean; message: string }> {
    const adminClient = createAdminClient();

    const { data, error } = await adminClient.rpc('refund_tokens', {
        p_user_id: userId,
        p_amount: amount,
        p_generation_id: generationId || null,
        p_reason: reason
    });

    if (error) {
        console.error("[Token] Refund RPC error:", error);
        return { success: false, message: "Failed to refund tokens" };
    }

    const result = data as { success: boolean; message?: string; amount?: number };

    if (result.success) {
        console.log(`[Token] Refunded ${amount} tokens for user ${userId}. Reason: ${reason}`);
    }

    return {
        success: result.success,
        message: result.message || (result.success ? "Tokens refunded" : "Refund failed")
    };
}

/**
 * Record a token history entry for tracking purposes.
 */
export async function recordTokenHistory(
    userId: string,
    amount: number,
    type: 'deduction' | 'refund' | 'purchase' | 'bonus' | 'reset',
    status: 'success' | 'failed' | 'pending',
    options?: {
        generationType?: string;
        generationId?: string;
        description?: string;
    }
): Promise<void> {
    const adminClient = createAdminClient();

    const { error } = await adminClient.rpc('record_token_history', {
        p_user_id: userId,
        p_amount: amount,
        p_type: type,
        p_status: status,
        p_generation_type: options?.generationType || null,
        p_generation_id: options?.generationId || null,
        p_description: options?.description || null
    });

    if (error) {
        console.error("[Token] Failed to record token history:", error);
    }
}

/**
 * Legacy function for simple token check without reservation.
 * Use processTokenCharge() for new code - it handles concurrency properly.
 * @deprecated Use processTokenCharge() instead
 */
export async function checkTokenBalance(userId: string, cost: number): Promise<{ available: number; sufficient: boolean }> {
    const adminClient = createAdminClient();

    const { data: profile, error: fetchError } = await adminClient
        .from("profiles")
        .select("tokens_used, tokens_total")
        .eq("id", userId)
        .single();

    if (fetchError || !profile) {
        throw new Error("Failed to fetch user profile");
    }

    const available = (profile.tokens_total || 0) - (profile.tokens_used || 0);

    return {
        available,
        sufficient: available >= cost
    };
}
