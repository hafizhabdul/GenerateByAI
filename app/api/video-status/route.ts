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

        // If succeeded, check if audio is needed and persist video
        if (status === "succeed") {
            const videoData = result.data.task_result?.videos?.[0];

            if (!videoData?.url) {
                return NextResponse.json({
                    status: "failed",
                    error: "No video URL in result",
                });
            }

            // Check if we need to add audio
            let finalVideoUrl = videoData.url;
            let audioTaskId = null;

            if (generationId) {
                const { data: genRecord } = await supabase
                    .from("generations")
                    .select("metadata")
                    .eq("id", generationId)
                    .eq("user_id", user.id)
                    .single();

                const hasAudio = genRecord?.metadata?.hasAudio;
                const existingAudioTaskId = genRecord?.metadata?.audioTaskId;

                // If audio is requested but not started yet
                if (hasAudio && !existingAudioTaskId) {
                    console.log(`[Video] Starting audio generation for video: ${videoData.id}`);

                    try {
                        const audioTask = await kling.videoToAudio(videoData.id);

                        if (audioTask.code === 0) {
                            audioTaskId = audioTask.data.task_id;
                            console.log(`[Video] Audio task started: ${audioTaskId}`);

                            // Update metadata with audio task ID
                            const adminClient = createAdminClient();
                            await adminClient
                                .from("generations")
                                .update({
                                    metadata: {
                                        ...genRecord?.metadata,
                                        klingVideoId: videoData.id,
                                        audioTaskId: audioTaskId,
                                    },
                                })
                                .eq("id", generationId)
                                .eq("user_id", user.id);

                            // Return processing status - audio is being generated
                            return NextResponse.json({
                                status: "processing",
                                taskId,
                                message: "Adding audio to video...",
                                step: "audio",
                            });
                        } else {
                            console.warn(`[Video] Audio generation failed: ${audioTask.message}`);
                            // Continue without audio
                        }
                    } catch (audioError) {
                        console.error("[Video] Audio generation error:", audioError);
                        // Continue without audio
                    }
                }

                // If audio task is in progress, check its status
                if (existingAudioTaskId) {
                    try {
                        const audioResult = await kling.getVideoToAudioResult(existingAudioTaskId);

                        if (audioResult.data.task_status === "processing" || audioResult.data.task_status === "submitted") {
                            return NextResponse.json({
                                status: "processing",
                                taskId,
                                message: "Adding audio to video...",
                                step: "audio",
                            });
                        }

                        if (audioResult.data.task_status === "succeed") {
                            const audioVideoUrl = audioResult.data.task_result?.videos?.[0]?.url;
                            if (audioVideoUrl) {
                                finalVideoUrl = audioVideoUrl;
                                console.log(`[Video] Audio added successfully`);
                            }
                        } else if (audioResult.data.task_status === "failed") {
                            console.warn(`[Video] Audio failed: ${audioResult.data.task_status_msg}`);
                            // Continue with original video
                        }
                    } catch (audioCheckError) {
                        console.error("[Video] Audio status check error:", audioCheckError);
                        // Continue with original video
                    }
                }
            }

            // Persist video to storage
            console.log(`[Video] Persisting video for task ${taskId}...`);
            const permanentUrl = await persistExternalVideo(finalVideoUrl, user.id);

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
                            hasAudio: finalVideoUrl !== videoData.url, // True if we used audio version
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
                hasAudio: finalVideoUrl !== videoData.url,
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
