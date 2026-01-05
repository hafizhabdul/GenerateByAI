import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { createKlingClient } from "@/lib/kling";
import { persistExternalVideo } from "@/lib/storage-utils";

/**
 * Check video generation status and finalize when complete
 * GET /api/video-status?taskId=xxx&type=image2video&generationId=xxx
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const taskId = searchParams.get("taskId");
        const type = (searchParams.get("type") as "image2video" | "text2video") || "image2video";
        const generationId = searchParams.get("generationId");

        if (!taskId) {
            return NextResponse.json(
                { error: "Task ID is required" },
                { status: 400 }
            );
        }

        // Auth check
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
                    taskId,
                    url: existing.file_url,
                    klingVideoId: existing.metadata?.klingVideoId,
                });
            }
        }

        // Create Kling client and check status
        const kling = createKlingClient();
        let result;
        
        try {
            if (type === "text2video") {
                result = await kling.getTextToVideoResult(taskId);
            } else {
                result = await kling.getTaskResult(taskId);
            }
        } catch (apiError: any) {
            console.error("Kling API error:", apiError);
            return NextResponse.json({
                status: "processing",
                taskId,
                message: "Checking status...",
            });
        }

        const status = result.data.task_status;

        // If still processing, return current status
        if (status === "submitted" || status === "processing") {
            return NextResponse.json({
                status: "processing",
                taskId,
                message: result.data.task_status_msg || "Video is being generated...",
            });
        }

        // If failed
        if (status === "failed") {
            // Update generation record if exists
            if (generationId) {
                const adminClient = createAdminClient();
                await adminClient
                    .from("generations")
                    .update({ 
                        status: "failed",
                        metadata: {
                            error: result.data.task_status_msg || "Generation failed",
                        }
                    })
                    .eq("id", generationId)
                    .eq("user_id", user.id);
            }

            return NextResponse.json({
                status: "failed",
                taskId,
                error: result.data.task_status_msg || "Video generation failed",
            });
        }

        // If succeeded, persist video and update record
        if (status === "succeed") {
            const videoData = result.data.task_result?.videos?.[0];
            
            if (!videoData?.url) {
                return NextResponse.json({
                    status: "failed",
                    error: "No video URL in result",
                });
            }

            // Persist video to storage
            console.log(`[Video] Persisting video for task ${taskId}...`);
            const permanentUrl = await persistExternalVideo(videoData.url, user.id);

            // Update generation record
            if (generationId) {
                const adminClient = createAdminClient();
                await adminClient
                    .from("generations")
                    .update({
                        status: "completed",
                        file_url: permanentUrl,
                        metadata: {
                            klingVideoId: videoData.id,
                            duration: videoData.duration,
                        },
                    })
                    .eq("id", generationId)
                    .eq("user_id", user.id);
            }

            console.log(`[Video] Completed and persisted: ${taskId}`);

            return NextResponse.json({
                status: "completed",
                taskId,
                url: permanentUrl,
                klingVideoId: videoData.id,
                duration: videoData.duration,
            });
        }

        return NextResponse.json({
            status: "unknown",
            taskId,
            rawStatus: status,
        });

    } catch (error: any) {
        console.error("Video status check error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to check video status" },
            { status: 500 }
        );
    }
}
