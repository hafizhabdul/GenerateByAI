
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkImageGenerationStatus, checkVideoGenerationStatus } from "@/lib/fal";
import { commitTokenCharge, cancelTokenReservation } from "@/lib/tokens-server";
import { persistExternalImage, persistExternalVideo } from "@/lib/storage-utils";
import { incrementDailyGeneration } from "@/lib/daily-limits";

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
        const requestId = metadata?.fal_request_id;
        const reservationId = metadata?.token_reservation_id;
        const generationType = generation.type; // 'image' or 'video'
        const endpoint = metadata?.fal_endpoint; // Optional, useful if multiple video models

        if (!requestId) {
            // Legacy pending item or error? Mark as failed
            return NextResponse.json({ status: "failed", error: "Missing request ID" });
        }

        // 2. Check Fal Status
        let statusResult;

        if (generationType === "video") {
            // If we didn't save endpoint, default to text-to-video or guess based on metadata
            // For now assume image-to-video if sourceImage exists in metadata
            const defaultEndpoint = metadata.sourceImage ? "fal-ai/veo3.1/fast/image-to-video" : "fal-ai/veo3.1/fast";
            statusResult = await checkVideoGenerationStatus(requestId, endpoint || defaultEndpoint);
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
                    file_url: permanentUrl
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
