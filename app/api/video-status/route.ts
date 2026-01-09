import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { z } from "zod";
import { checkWanVideoStatus, getWanVideoResult } from "@/lib/fal-wan";
import { persistExternalVideo } from "@/lib/storage-utils";

// UUID validation helper
const uuidSchema = z.string().uuid();

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
                .select("status, file_url, metadata")
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
                await adminClient
                    .from("generations")
                    .update({
                        status: "failed",
                        metadata: {
                            error: "Video generation failed",
                        }
                    })
                    .eq("id", generationId)
                    .eq("user_id", user.id);
            }

            return NextResponse.json({
                status: "failed",
                requestId,
                error: "Video generation failed",
            });
        }

        // If completed, get the result
        if (queueStatus.status === "COMPLETED") {
            console.log(`[Video] Generation completed, fetching result...`);

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
