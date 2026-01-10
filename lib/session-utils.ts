import { createAdminClient } from "@/lib/supabase/server";

/**
 * Session Utility Functions
 * Handles auto-creation and assignment of sessions for generations
 */

// Session gap threshold - if last generation was more than 30 minutes ago, create new session
const SESSION_GAP_MINUTES = 30;

interface CreateOrGetSessionParams {
    userId: string;
    type: "image" | "video";
    prompt: string;
}

interface SessionResult {
    sessionId: string;
    isNewSession: boolean;
}

/**
 * Get or create a session for a generation
 * - If user has a recent session (within 30 min) of same type, reuse it
 * - Otherwise create a new session with title from prompt
 */
export async function getOrCreateSession(
    params: CreateOrGetSessionParams
): Promise<SessionResult> {
    const { userId, type, prompt } = params;
    const adminClient = createAdminClient();

    try {
        // Check for recent session of same type
        const cutoffTime = new Date(Date.now() - SESSION_GAP_MINUTES * 60 * 1000).toISOString();

        const { data: recentSession } = await adminClient
            .from("sessions")
            .select("id, updated_at")
            .eq("user_id", userId)
            .eq("type", type)
            .eq("is_archived", false)
            .gte("updated_at", cutoffTime)
            .order("updated_at", { ascending: false })
            .limit(1)
            .single();

        if (recentSession) {
            // Update the session's updated_at timestamp
            await adminClient
                .from("sessions")
                .update({ updated_at: new Date().toISOString() })
                .eq("id", recentSession.id);

            return {
                sessionId: recentSession.id,
                isNewSession: false,
            };
        }

        // Create new session
        const title = prompt.length > 100 ? prompt.substring(0, 100) + "..." : prompt;

        const { data: newSession, error } = await adminClient
            .from("sessions")
            .insert({
                user_id: userId,
                type,
                title,
            })
            .select("id")
            .single();

        if (error) {
            console.error("[Session] Failed to create session:", error);
            throw error;
        }

        return {
            sessionId: newSession.id,
            isNewSession: true,
        };
    } catch (error) {
        console.error("[Session] Error in getOrCreateSession:", error);
        throw error;
    }
}

/**
 * Assign a generation to a session
 * Call this after inserting a generation to link it to the session
 */
export async function assignGenerationToSession(
    generationId: string,
    sessionId: string
): Promise<void> {
    const adminClient = createAdminClient();

    try {
        const { error } = await adminClient
            .from("generations")
            .update({ session_id: sessionId })
            .eq("id", generationId);

        if (error) {
            console.error("[Session] Failed to assign generation to session:", error);
            throw error;
        }

        // Also update session's updated_at
        await adminClient
            .from("sessions")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", sessionId);
    } catch (error) {
        console.error("[Session] Error in assignGenerationToSession:", error);
        // Don't throw - this is not critical and shouldn't fail the generation
    }
}

/**
 * Create generation with session in one step
 * This is a convenience function that creates or gets session and inserts generation
 */
export async function createGenerationWithSession(params: {
    userId: string;
    type: "image" | "video";
    prompt: string;
    fileUrl?: string | null; // Optional for processing videos
    status: "pending" | "processing" | "completed" | "failed";
    tokensUsed: number;
    metadata?: Record<string, unknown>;
    isPublic?: boolean; // If true, visible in community. Default based on user's token balance
}): Promise<{ generationId: string; sessionId: string }> {
    const { userId, type, prompt, fileUrl, status, tokensUsed, metadata, isPublic } = params;
    const adminClient = createAdminClient();

    // Get or create session
    const { sessionId } = await getOrCreateSession({ userId, type, prompt });

    // Determine is_public value
    // If not explicitly set, we'll determine based on user's purchased tokens
    let publicValue = isPublic;
    if (publicValue === undefined) {
        // Check if user has purchased tokens (tokens_total > 100, since free users get 100)
        const { data: profile } = await adminClient
            .from("profiles")
            .select("tokens_total")
            .eq("id", userId)
            .single();

        // Free users (100 tokens) = public, Paid users (>100 tokens) = private
        const hasPurchasedTokens = (profile?.tokens_total || 0) > 100;
        publicValue = !hasPurchasedTokens; // Free = public (true), Paid = private (false)
    }

    // Insert generation with session_id
    const { data: generation, error } = await adminClient
        .from("generations")
        .insert({
            user_id: userId,
            session_id: sessionId,
            type,
            prompt,
            file_url: fileUrl,
            status,
            tokens_used: tokensUsed,
            metadata,
            is_public: publicValue,
        })
        .select("id")
        .single();

    if (error) {
        console.error("[Session] Failed to create generation with session:", error);
        throw error;
    }

    // Update session's updated_at
    await adminClient
        .from("sessions")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", sessionId);

    return {
        generationId: generation.id,
        sessionId,
    };
}
