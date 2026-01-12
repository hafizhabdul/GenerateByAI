
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkImageGenerationStatus, checkVideoGenerationStatus } from "@/lib/fal";
import { checkWanVideoStatus } from "@/lib/fal-wan";
import { commitTokenCharge, cancelTokenReservation } from "@/lib/tokens-server";
import { persistExternalImage, persistExternalVideo } from "@/lib/storage-utils";
import { incrementDailyGeneration, getDailyLimitInfo } from "@/lib/daily-limits";

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

        const metadata = generation.metadata as any;
        const requestId = metadata?.requestId || metadata?.fal_request_id; // Support both naming conventions
        const reservationId = metadata?.token_reservation_id || metadata?.tokenReservationId;
        const generationType = generation.type; // 'image' or 'video'
        const endpoint = metadata?.fal_endpoint; // Optional, useful if multiple video models
        const provider = metadata?.provider; // 'fal-wan-v2.6' or 'fal-veo-3.1'
        const sourceType = metadata?.sourceType || "text2video"; // 'image2video' or 'text2video'

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
                        // Attempt to get URL if completed (checkWanVideoStatus doesn't fetch result automatically like checkVideoGenerationStatus might)
                        // Actually checkWanVideoStatus implementation in lib/fal-wan.ts only calls queue/status. 
                        // We need to call getWanVideoResult if COMPLETED.
                    };

                    if (wanStatus.status === "COMPLETED") {
                        // Import lazy or use another helper? imported getWanVideoResult
                        const { getWanVideoResult } = await import("@/lib/fal-wan");
                        const result = await getWanVideoResult(requestId, sourceType as "image2video" | "text2video");
                        (statusResult as any).videoUrl = result.videoUrl;
                    }
                } catch (e: any) {
                    console.error("Wan check error:", e);
                    statusResult = { status: "FAILED", error: e.message };
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
                ? (statusResult as any).videoUrl
                : (statusResult as any).imageUrl;

            if (resultUrl) {
                // --- Success Workflow ---

                // A. Persist Media
                let permanentUrl = "";
                try {
                    if (generationType === "video") {
                        permanentUrl = await persistExternalVideo(resultUrl, user.id);
                    } else {
                        permanentUrl = await persistExternalImage(resultUrl, user.id);
                    }
                } catch (e) {
                    console.error("Failed to persist media:", e);
                    permanentUrl = resultUrl;
                }

                // B. Commit Tokens
                if (reservationId) {
                    await commitTokenCharge(reservationId);
                }

                // C. Increment Daily Limit
                await incrementDailyGeneration(user.id);
                const dailyLimitInfo = await getDailyLimitInfo(user.id);

                // D. Update DB
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

    } catch (error: any) {
        console.error("Check status error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to check status" },
            { status: 500 }
        );
    }
}
