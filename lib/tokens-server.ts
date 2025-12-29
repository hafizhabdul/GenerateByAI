import { createAdminClient } from "./supabase/server";

/**
 * Shared logic for checking balance and deducting tokens.
 * This should be used across all generation APIs (Server-side ONLY).
 */
export async function processTokenCharge(userId: string, cost: number) {
    const adminClient = createAdminClient();

    // 1. Fetch profile
    const { data: profile, error: fetchError } = await adminClient
        .from("profiles")
        .select("tokens_used, tokens_total")
        .eq("id", userId)
        .single();

    if (fetchError || !profile) {
        throw new Error("Failed to fetch user profile for token check");
    }

    const currentTokens = (profile.tokens_total || 0) - (profile.tokens_used || 0);

    if (currentTokens < cost) {
        throw new Error(`Insufficient tokens. This action requires ${cost} tokens, but you only have ${currentTokens} left.`);
    }

    // 2. Prepare update function (to be called AFTER successful AI generation)
    return async () => {
        const { error: updateError } = await adminClient
            .from("profiles")
            .update({ tokens_used: (profile.tokens_used || 0) + cost })
            .eq("id", userId);

        if (updateError) {
            console.error("Critical error: Failed to deduct tokens after generation:", updateError);
            // In a production app, we might want to log this to a separate audit table
        }
    };
}
