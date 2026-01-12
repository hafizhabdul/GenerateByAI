import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { z } from "zod";
import { checkWanVideoStatus, getWanVideoResult, getWanVideoCost, type WanDuration, type WanResolution } from "@/lib/fal-wan";
import { persistExternalVideo } from "@/lib/storage-utils";
import { refundTokens, commitTokenCharge } from "@/lib/tokens-server";
import { incrementDailyGeneration, getDailyLimitInfo } from "@/lib/daily-limits";

// UUID validation helper
const uuidSchema = z.string().uuid();

/**
 * Helper: Wait for DB to have completed result
 * Used when another request is already fetching the result
 */
interface DbResult {
    status: string;
    file_url?: string;
    metadata?: Record<string, unknown>;
}

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

async function waitForDbResult(
    supabase: SupabaseClient,
    generationId: string,
    maxAttempts: number = 10,
    intervalMs: number = 2000
): Promise<DbResult | null> {
    for (let i = 0; i < maxAttempts; i++) {
        await new Promise(resolve => setTimeout(resolve, intervalMs));

        const { data: check } = await supabase
            .from("generations")
            .select("status, file_url, metadata")
            .eq("id", generationId)
            .single();

        if (check?.status === "completed" && check?.file_url) {
            return check;
        }

        if (check?.status === "failed") {
            return check;
        }
    }
    return null;
}

/**
 * Check video generation status for fal.ai wan/v2.6
 * GET /api/video-status?requestId=xxx&type=image2video&generationId=xxx
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const requestId = searchParams.get("requestId");
        const type = (searchParams.get("type") as "image2video" | "text2video") || "image2video";
        const generationId = searchParams.get("generationId");

        if (!requestId) {
            return NextResponse.json(
                { error: "Request ID is required" },
                { status: 400 }
            );
        }

        // Auth check
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Validate generationId if provided
        if (generationId && !uuidSchema.safeParse(generationId).success) {
            return NextResponse.json({ error: "Invalid generation ID format" }, { status: 400 });
        }

        // Check if already completed in database
        if (generationId) {
            const { data: existing } = await supabase
                .from("generations")
                .select("status, file_url, metadata, tokens_used")
                .eq("id", generationId)
                .eq("user_id", user.id)
                .single();

            if (existing?.status === "completed" && existing?.file_url) {
                return NextResponse.json({
                    status: "completed",
                    requestId,
                    url: existing.file_url,
                    duration: existing.metadata?.duration,
                    resolution: existing.metadata?.resolution,
                });
            }

            if (existing?.status === "failed") {
                return NextResponse.json({
                    status: "failed",
                    requestId,
                    error: existing.metadata?.error || "Generation failed",
                });
            }

            // If another request is currently fetching, wait for it
            if (existing?.status === "fetching") {
                console.log(`[Video] Another request is fetching ${requestId}, waiting...`);
                const result = await waitForDbResult(supabase, generationId);

                if (result?.status === "completed" && result?.file_url) {
                    return NextResponse.json({
                        status: "completed",
                        requestId,
                        url: result.file_url,
                        duration: result.metadata?.duration,
                        resolution: result.metadata?.resolution,
                    });
                }

                if (result?.status === "failed") {
                    return NextResponse.json({
                        status: "failed",
                        requestId,
                        error: result.metadata?.error || "Generation failed",
                    });
                }

                // Timeout waiting - return processing status to retry
                return NextResponse.json({
                    status: "processing",
                    requestId,
                    message: "Video is being processed, please wait...",
                });
            }
        }

        // Check fal.ai queue status
        let queueStatus;
        try {
            queueStatus = await checkWanVideoStatus(requestId, type);
        } catch (apiError: unknown) {
            console.error("fal.ai status check error:", apiError);
            return NextResponse.json({
                status: "processing",
                requestId,
                message: "Checking status...",
            });
        }

        // If still in queue or processing
        if (queueStatus.status === "IN_QUEUE" || queueStatus.status === "IN_PROGRESS") {
            return NextResponse.json({
                status: "processing",
                requestId,
                message: queueStatus.status === "IN_QUEUE"
                    ? "Video is queued for processing..."
                    : "Video is being generated...",
            });
        }

        // If failed
        if (queueStatus.status === "FAILED") {
            // Update generation record if exists
            if (generationId) {
                const adminClient = createAdminClient();

                // First, get the generation to know how many tokens to refund
                const { data: generation } = await supabase
                    .from("generations")
                    .select("tokens_used, metadata, status")
                    .eq("id", generationId)
                    .eq("user_id", user.id)
                    .single();

                // Only refund if not already failed (prevent double refund)
                if (generation && generation.status !== "failed") {
                    const tokensToRefund = generation.tokens_used || 0;

                    // Refund tokens and daily generation count atomically
                    // This also updates the generation status to 'failed' in the database
                    if (tokensToRefund > 0) {
                        const refundResult = await refundTokens(
                            user.id,
                            tokensToRefund,
                            generationId,
                            "Video generation failed on provider"
                        );
                        console.log(`[Video] Atomic refund result for ${generationId}:`, refundResult);
                    }
                }
            }

            return NextResponse.json({
                status: "failed",
                requestId,
                error: "Video generation failed",
                refunded: true,
            });
        }


        // If completed, get the result
        if (queueStatus.status === "COMPLETED") {
            console.log(`[Video] Generation completed, attempting to acquire fetch lock...`);

            // Acquire lock by atomically updating status from 'processing' to 'fetching'
            // This prevents race condition where multiple polls try to fetch the same result
            if (generationId) {
                const adminClient = createAdminClient();
                const { data: lockResult, error: lockError } = await adminClient
                    .from("generations")
                    .update({ status: "fetching" })
                    .eq("id", generationId)
                    .in("status", ["pending", "processing"])  // Allow pending or processing
                    .select("id")
                    .single();

                if (lockError || !lockResult) {
                    // Another request already acquired the lock, wait for result
                    console.log(`[Video] Lock not acquired for ${requestId}, waiting for result...`);

                    const result = await waitForDbResult(supabase, generationId);

                    if (result?.status === "completed" && result?.file_url) {
                        return NextResponse.json({
                            status: "completed",
                            requestId,
                            url: result.file_url,
                            duration: result.metadata?.duration,
                            resolution: result.metadata?.resolution,
                        });
                    }

                    if (result?.status === "failed") {
                        return NextResponse.json({
                            status: "failed",
                            requestId,
                            error: result.metadata?.error || "Generation failed",
                        });
                    }

                    // Timeout waiting - return processing status to retry
                    return NextResponse.json({
                        status: "processing",
                        requestId,
                        message: "Video is being processed, please wait...",
                    });
                }

                console.log(`[Video] Lock acquired for ${requestId}, fetching result...`);
            }

            try {
                const result = await getWanVideoResult(requestId, type);

                if (!result.videoUrl) {
                    return NextResponse.json({
                        status: "failed",
                        error: "No video URL in result",
                    });
                }

                // Persist video to storage
                console.log(`[Video] Persisting video for request ${requestId}...`);
                const permanentUrl = await persistExternalVideo(result.videoUrl, user.id);

                // Commit tokens if reservation ID exists, and handle partial refund if actual duration < requested
                let tokensRefunded = 0;
                if (generationId) {
                    const { data: existingGen } = await supabase
                        .from("generations")
                        .select("metadata, tokens_used")
                        .eq("id", generationId)
                        .eq("user_id", user.id)
                        .single();

                    const reservationId = existingGen?.metadata?.token_reservation_id || existingGen?.metadata?.tokenReservationId;

                    if (reservationId) {
                        console.log(`[Video] Committing token reservation: ${reservationId}`);
                        await commitTokenCharge(reservationId);
                    } else {
                        console.log(`[Video] No reservation ID found for ${generationId}`);
                    }

                    // Check if actual duration is less than requested duration
                    // If so, refund the difference
                    const requestedDuration = existingGen?.metadata?.duration as WanDuration | undefined;
                    const resolution = (existingGen?.metadata?.resolution || "720p") as WanResolution;
                    const actualDuration = result.duration;
                    const tokensCharged = existingGen?.tokens_used || 0;

                    if (requestedDuration && actualDuration && actualDuration < requestedDuration) {
                        // Calculate what the cost should have been for the actual duration
                        // Round actual duration to nearest supported duration (5, 10, or 15)
                        let effectiveDuration: WanDuration = 5;
                        if (actualDuration > 7.5) effectiveDuration = 10;
                        if (actualDuration > 12.5) effectiveDuration = 15;

                        const actualCost = getWanVideoCost(effectiveDuration, resolution);
                        const refundAmount = tokensCharged - actualCost;

                        if (refundAmount > 0) {
                            console.log(`[Video] Actual duration (${actualDuration}s) < requested (${requestedDuration}s). Refunding ${refundAmount} tokens.`);
                            const refundResult = await refundTokens(
                                user.id,
                                refundAmount,
                                generationId,
                                `Partial refund: video ${actualDuration}s instead of ${requestedDuration}s`
                            );
                            if (refundResult.success) {
                                tokensRefunded = refundAmount;
                                // Update the tokens_used in generation record to reflect actual cost
                                const adminClient = createAdminClient();
                                await adminClient
                                    .from("generations")
                                    .update({ tokens_used: actualCost })
                                    .eq("id", generationId);
                            }
                        }
                    }
                }

                // Update generation record
                if (generationId) {
                    const { data: existingGen } = await supabase
                        .from("generations")
                        .select("metadata")
                        .eq("id", generationId)
                        .eq("user_id", user.id)
                        .single();

                    // Preserve the requested duration from original metadata
                    // Only use result.duration for actualDuration field
                    const requestedDuration = existingGen?.metadata?.duration;
                    const actualDuration = result.duration || requestedDuration;

                    const adminClient = createAdminClient();
                    const { error: updateError } = await adminClient
                        .from("generations")
                        .update({
                            status: "completed",
                            file_url: permanentUrl,
                            metadata: {
                                ...existingGen?.metadata,
                                duration: requestedDuration, // Keep the user's requested duration
                                actualDuration: actualDuration, // Store actual duration from provider
                                resolution: result.resolution || existingGen?.metadata?.resolution,
                            },
                        })
                        .eq("id", generationId)
                        .eq("user_id", user.id);

                    if (updateError) {
                        console.error("[Video] Failed to update generation record:", updateError);
                    }
                }

                // Increment daily generation count
                await incrementDailyGeneration(user.id);
                const dailyLimitInfo = await getDailyLimitInfo(user.id);

                console.log(`[Video] Completed and persisted: ${requestId}, Daily remaining: ${dailyLimitInfo?.remaining}`);

                // Get the final duration to return (prefer requested duration for display)
                const { data: finalGen } = await supabase
                    .from("generations")
                    .select("metadata")
                    .eq("id", generationId)
                    .eq("user_id", user.id)
                    .single();
                
                const displayDuration = finalGen?.metadata?.duration || result.duration;

                return NextResponse.json({
                    status: "completed",
                    requestId,
                    url: permanentUrl,
                    duration: displayDuration,
                    actualDuration: result.duration || displayDuration,
                    resolution: result.resolution,
                    dailyRemaining: dailyLimitInfo?.remaining,
                    ...(tokensRefunded > 0 && { tokensRefunded, refundReason: `Video was ${result.duration}s instead of requested duration` })
                });
            } catch (resultError: unknown) {
                const errorWithStatus = resultError as { status?: number };
                if (errorWithStatus.status === 404) {
                    console.log(`[Video] Result already consumed for ${requestId}, waiting for DB update...`);

                    // Another request might be downloading, wait for DB update
                    if (generationId) {
                        // First immediate check
                        const { data: existing } = await supabase
                            .from("generations")
                            .select("status, file_url, metadata, tokens_used")
                            .eq("id", generationId)
                            .eq("user_id", user.id)
                            .single();

                        if (existing?.file_url) {
                            return NextResponse.json({
                                status: "completed",
                                requestId,
                                url: existing.file_url,
                                duration: existing.metadata?.duration,
                                resolution: existing.metadata?.resolution,
                            });
                        }

                        // If status is 'fetching', another request is downloading - wait for it
                        if (existing?.status === "fetching") {
                            console.log(`[Video] Status is 'fetching', waiting for download to complete...`);
                            const result = await waitForDbResult(supabase, generationId, 15, 2000); // Max 30s wait

                            if (result?.status === "completed" && result?.file_url) {
                                return NextResponse.json({
                                    status: "completed",
                                    requestId,
                                    url: result.file_url,
                                    duration: result.metadata?.duration,
                                    resolution: result.metadata?.resolution,
                                });
                            }
                        }

                        // Only refund if status is still 'processing' or 'fetching' (not already failed/completed)
                        if (existing && existing.status !== "failed" && existing.status !== "completed") {
                            const tokensToRefund = existing.tokens_used || 0;
                            if (tokensToRefund > 0) {
                                await refundTokens(
                                    user.id,
                                    tokensToRefund,
                                    generationId,
                                    "Video result expired before retrieval"
                                );
                            }
                        }
                    }

                    // Result is gone and not in database - mark as failed
                    return NextResponse.json({
                        status: "failed",
                        requestId,
                        error: "Video result expired. Please generate a new video.",
                        refunded: true,
                    });
                }

                throw resultError;
            }
        }

        return NextResponse.json({
            status: "unknown",
            requestId,
            rawStatus: queueStatus.status,
        });

    } catch (error: unknown) {
        console.error("Video status check error:", error);
        const message = error instanceof Error ? error.message : "Failed to check video status";
        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}
