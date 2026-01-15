
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkImageGenerationStatus, checkVideoGenerationStatus } from "@/lib/fal";
import { checkWanVideoStatus } from "@/lib/fal-wan";
import { commitTokenCharge, cancelTokenReservation } from "@/lib/tokens-server";
import { persistExternalImage, persistExternalVideo } from "@/lib/storage-utils";
import { incrementDailyGeneration, getDailyLimitInfo } from "@/lib/daily-limits";
import { shouldApplyWatermark } from "@/lib/watermark";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 1. Fetch Generation Record
        const { data: generation, error: fetchError } = await supabase
            .from("generations")
            .select("*")
            .eq("id", id)
            .eq("user_id", user.id)
            .single();

        if (fetchError || !generation) {
            return NextResponse.json({ error: "Generation not found" }, { status: 404 });
        }

        // If not pending, return current status immediately
        if (generation.status !== "pending") {
            return NextResponse.json({
                status: generation.status,
                file_url: generation.file_url,
                generation
            });
        }

        interface GenerationMetadata {
            requestId?: string;
            fal_request_id?: string;
            token_reservation_id?: string;
            tokenReservationId?: string;
            fal_endpoint?: string;
            provider?: string;
            sourceType?: string;
            sourceImage?: string;
            completed_at?: string;
            error?: string;
            failed_at?: string;
        }
        const metadata = generation.metadata as GenerationMetadata | null;
        const requestId = metadata?.requestId || metadata?.fal_request_id;
        const reservationId = metadata?.token_reservation_id || metadata?.tokenReservationId;
        const generationType = generation.type;
        const endpoint = metadata?.fal_endpoint;
        const provider = metadata?.provider;
        const sourceType = metadata?.sourceType || "text2video";

        if (!requestId) {
            // Legacy pending item or error? Mark as failed
            return NextResponse.json({ status: "failed", error: "Missing request ID" });
        }

        // 2. Check Fal Status
        let statusResult;

        if (generationType === "video") {
            if (provider === "fal-wan-v2.6" || !endpoint?.includes("veo")) {
                // Check Wan Status
                // Note: checkWanVideoStatus returns { status, requestId, logs, result? }
                // We might need to adapter getting the URL if it's COMPLETED
                try {
                    const wanStatus = await checkWanVideoStatus(requestId, sourceType as "image2video" | "text2video");

                    // Adapter to match expected statusResult shape
                    statusResult = {
                        status: wanStatus.status,
                        error: (wanStatus.status === "FAILED") ? "Generation failed" : undefined,

                    };

                    if (wanStatus.status === "COMPLETED") {
                        const { getWanVideoResult } = await import("@/lib/fal-wan");
                        const result = await getWanVideoResult(requestId, sourceType as "image2video" | "text2video");
                        (statusResult as { status: string; error?: string; videoUrl?: string }).videoUrl = result.videoUrl;
                    }
                } catch (e: unknown) {
                    console.error("Wan check error:", e);
                    const errorMessage = e instanceof Error ? e.message : "Unknown error";
                    statusResult = { status: "FAILED", error: errorMessage };
                }

            } else {
                // If we didn't save endpoint, default to text-to-video or guess based on metadata
                // For now assume image-to-video if sourceImage exists in metadata
                const defaultEndpoint = metadata.sourceImage ? "fal-ai/veo3.1/fast/image-to-video" : "fal-ai/veo3.1/fast";
                statusResult = await checkVideoGenerationStatus(requestId, endpoint || defaultEndpoint);
            }

        } else {
            statusResult = await checkImageGenerationStatus(requestId);
        }

        if (statusResult.status === "COMPLETED") {
            const resultUrl = generationType === "video"
                ? (statusResult as { videoUrl?: string }).videoUrl
                : (statusResult as { imageUrl?: string }).imageUrl;

            if (resultUrl) {
                // --- Success Workflow ---

                // A. Check if user needs watermark (free tier)
                const needsWatermark = await shouldApplyWatermark(user.id);

                // B. Persist Media (with watermark for free users)
                let permanentUrl = "";
                try {
                    if (generationType === "video") {
                        permanentUrl = await persistExternalVideo(resultUrl, user.id, { applyWatermark: needsWatermark });
                    } else {
                        permanentUrl = await persistExternalImage(resultUrl, user.id, { applyWatermark: needsWatermark });
                    }
                } catch (e) {
                    console.error("Failed to persist media:", e);
                    permanentUrl = resultUrl;
                }

                // C. Commit Tokens
                if (reservationId) {
                    await commitTokenCharge(reservationId);
                }

                // D. Increment Daily Limit
                await incrementDailyGeneration(user.id);
                const dailyLimitInfo = await getDailyLimitInfo(user.id);

                // E. Update DB
                const { error: updateError } = await supabase
                    .from("generations")
                    .update({
                        status: "completed",
                        file_url: permanentUrl,
                        metadata: {
                            ...metadata,
                            completed_at: new Date().toISOString()
                        }
                    })
                    .eq("id", id);

                if (updateError) console.error("Failed to update generation:", updateError);

                return NextResponse.json({
                    status: "completed",
                    file_url: permanentUrl,
                    dailyRemaining: dailyLimitInfo?.remaining
                });
            } else {
                // Completed but no URL?
                return NextResponse.json({ status: "failed", error: "No media URL returned" });
            }

        } else if (statusResult.status === "FAILED") {
            // --- Failure Workflow ---

            // A. Cancel Tokens
            if (reservationId) {
                await cancelTokenReservation(reservationId);
            }

            // B. Update DB
            await supabase
                .from("generations")
                .update({
                    status: "failed",
                    metadata: {
                        ...metadata,
                        error: statusResult.error || "Generation failed",
                        failed_at: new Date().toISOString()
                    }
                })
                .eq("id", id);

            return NextResponse.json({
                status: "failed",
                error: statusResult.error
            });
        }

        // Still pending
        return NextResponse.json({ status: "pending" });

    } catch (error: unknown) {
        console.error("Check status error:", error);
        const message = error instanceof Error ? error.message : "Failed to check status";
        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}
