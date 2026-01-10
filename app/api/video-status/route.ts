import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { z } from "zod";
import { checkWanVideoStatus, getWanVideoResult } from "@/lib/fal-wan";
import { persistExternalVideo } from "@/lib/storage-utils";
import { refundTokens, commitTokenCharge } from "@/lib/tokens-server";
import { decrementDailyGeneration } from "@/lib/daily-limits";

// UUID validation helper
const uuidSchema = z.string().uuid();

/**
 * Helper: Wait for DB to have completed result
 * Used when another request is already fetching the result
 */
async function waitForDbResult(
    supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never,
    generationId: string,
    maxAttempts: number = 10,
    intervalMs: number = 2000
): Promise<{ status: string; file_url?: string; metadata?: Record<string, unknown> } | null> {
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
        } catch (apiError: any) {
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

                // Commit tokens if reservation ID exists
                if (generationId) {
                    const { data: existingGen } = await supabase
                        .from("generations")
                        .select("metadata")
                        .eq("id", generationId)
                        .eq("user_id", user.id)
                        .single();

                    const reservationId = existingGen?.metadata?.token_reservation_id || existingGen?.metadata?.tokenReservationId;

                    if (reservationId) {
                        console.log(`[Video] Committing token reservation: ${reservationId}`);
                        await commitTokenCharge(reservationId);
                    } else {
                        // Fallback: If no reservation ID (legacy), maybe we should charge here? 
                        // But we already incremented usage? No, usage increment corresponds to deduction.
                        // If we are migrating, let's assume reservation handled it or it's free.
                        console.log(`[Video] No reservation ID found for ${generationId}`);
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

                    const adminClient = createAdminClient();
                    const { error: updateError } = await adminClient
                        .from("generations")
                        .update({
                            status: "completed",
                            file_url: permanentUrl,
                            metadata: {
                                ...existingGen?.metadata,
                                duration: result.duration,
                                resolution: result.resolution,
                            },
                        })
                        .eq("id", generationId)
                        .eq("user_id", user.id);

                    if (updateError) {
                        console.error("[Video] Failed to update generation record:", updateError);
                    }
                }

                console.log(`[Video] Completed and persisted: ${requestId}`);

                return NextResponse.json({
                    status: "completed",
                    requestId,
                    url: permanentUrl,
                    duration: result.duration,
                    resolution: result.resolution,
                });
            } catch (resultError: any) {
                // Handle 404 - result already consumed or expired
                if (resultError.status === 404) {
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

    } catch (error: any) {
        console.error("Video status check error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to check video status" },
            { status: 500 }
        );
    }
}
