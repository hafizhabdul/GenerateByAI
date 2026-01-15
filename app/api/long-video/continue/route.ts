import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { z } from "zod";
import { startWanVideoGeneration, type WanResolution, type WanAspectRatio } from "@/lib/fal-wan";
import { createGenerationWithSession } from "@/lib/session-utils";
import { extractLastFrame } from "@/lib/video-utils";
import {
    getSegmentCount,
    getNextSegmentOrder,
    isReadyForStitching,
    getSegmentPrompt,
    type LongVideoSegment,
    type LongVideoSettings,
    type LongVideoDuration,
    type LongVideoMode,
    type SegmentPrompt,
    SEGMENT_DURATION,
} from "@/lib/long-video";

const ContinueLongVideoSchema = z.object({
    jobId: z.string().uuid("Valid job ID required"),
    continuationHint: z.string().max(500).optional(),
});

/**
 * Continue long video generation - generate next segment
 * POST /api/long-video/continue
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const validation = ContinueLongVideoSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: validation.error.issues[0].message },
                { status: 400 }
            );
        }

        const { jobId, continuationHint } = validation.data;

        // Auth Check
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Fetch job
        const adminClient = createAdminClient();
        const { data: job, error: fetchError } = await adminClient
            .from("long_video_jobs")
            .select("*")
            .eq("id", jobId)
            .eq("user_id", user.id)
            .single();

        if (fetchError || !job) {
            return NextResponse.json(
                { error: "Job not found" },
                { status: 404 }
            );
        }

        // Check job status
        if (job.status !== "processing") {
            return NextResponse.json(
                { error: `Cannot continue job with status: ${job.status}` },
                { status: 400 }
            );
        }

        const segments = (job.segments || []) as LongVideoSegment[];
        const settings = job.settings as LongVideoSettings;
        const targetDuration = job.target_duration as LongVideoDuration;
        const segmentPrompts = (job.segment_prompts || []) as SegmentPrompt[];

        // Check if there's a segment still processing
        const processingSegment = segments.find(s => s.status === "processing");
        if (processingSegment) {
            return NextResponse.json(
                { 
                    error: "A segment is still being processed",
                    segmentId: processingSegment.generationId,
                },
                { status: 409 }
            );
        }

        // Check if we've reached target
        const totalSegments = getSegmentCount(targetDuration);
        const completedSegments = segments.filter(s => s.status === "completed").length;

        if (completedSegments >= totalSegments) {
            return NextResponse.json(
                { 
                    error: "All segments completed. Ready for stitching.",
                    readyForStitching: true,
                },
                { status: 400 }
            );
        }

        // Determine generation mode (default to continuous for backward compatibility)
        const generationMode: LongVideoMode = settings.mode || "continuous";
        const isContinuousMode = generationMode === "continuous";
        
        // Build continuation prompt
        const nextOrder = segments.length === 0 ? 0 : Math.max(...segments.map(s => s.order)) + 1;
        const isLastSegment = nextOrder >= totalSegments - 1;
        
        // Use AI-generated prompt if available, otherwise fallback
        let segmentPrompt = getSegmentPrompt(segmentPrompts, nextOrder, job.prompt);
        
        // Add continuation hint if provided
        if (continuationHint) {
            segmentPrompt = `${segmentPrompt}, ${continuationHint}`;
        }
        
        // Add cinematic modifiers if using fallback (no AI prompts)
        if (segmentPrompts.length === 0) {
            if (isLastSegment) {
                segmentPrompt = `${segmentPrompt}, concluding shot, natural ending`;
            } else if (!isContinuousMode) {
                // Different angles mode: add variety modifiers
                segmentPrompt = `${segmentPrompt}, different perspective, dynamic angle`;
            } else {
                segmentPrompt = `${segmentPrompt}, continuous motion, seamless continuation`;
            }
        }

        let lastFrameUrl: string | undefined;
        
        // Only extract frame for continuous mode
        if (isContinuousMode) {
            // Get the last completed segment to extract frame from
            const lastCompletedSegment = segments
                .filter(s => s.status === "completed" && s.videoUrl)
                .sort((a, b) => b.order - a.order)[0];

            if (!lastCompletedSegment || !lastCompletedSegment.videoUrl) {
                return NextResponse.json(
                    { error: "No completed segment found to continue from" },
                    { status: 400 }
                );
            }

            console.log(`[LongVideo] Continuing job ${jobId} from segment ${lastCompletedSegment.order} (continuous mode)`);

            // Extract last frame from previous segment
            try {
                lastFrameUrl = await extractLastFrame(lastCompletedSegment.videoUrl, user.id);
                console.log(`[LongVideo] Extracted last frame: ${lastFrameUrl}`);
            } catch (frameError) {
                console.error("[LongVideo] Frame extraction failed:", frameError);
                return NextResponse.json(
                    { error: "Failed to extract frame from previous segment" },
                    { status: 500 }
                );
            }
        } else {
            console.log(`[LongVideo] Continuing job ${jobId} segment ${nextOrder} (different-angles mode)`);
        }

        // Start next segment generation
        // Continuous: I2V from last frame | Different-angles: T2V independently
        const { requestId } = await startWanVideoGeneration({
            prompt: segmentPrompt,
            imageUrl: lastFrameUrl, // undefined for different-angles mode
            duration: SEGMENT_DURATION as 5 | 10 | 15,
            resolution: settings.resolution,
            aspectRatio: settings.aspectRatio as WanAspectRatio,
            negativePrompt: settings.negativePrompt || "blurry, low quality, distorted, jump cut, different scene",
        });

        // Create generation record
        const { generationId } = await createGenerationWithSession({
            userId: user.id,
            type: "video",
            prompt: segmentPrompt,
            status: "pending",
            tokensUsed: 0,
            metadata: {
                provider: "fal-wan-v2.6",
                requestId,
                duration: SEGMENT_DURATION,
                resolution: settings.resolution,
                aspectRatio: settings.aspectRatio,
                sourceType: isContinuousMode ? "image2video" : "text2video",
                sourceImage: lastFrameUrl || null,
                longVideoJobId: jobId,
                segmentOrder: nextOrder,
                generationMode: generationMode,
            },
        });

        // Add new segment to job
        const newSegment: LongVideoSegment = {
            id: crypto.randomUUID(),
            generationId,
            order: nextOrder,
            status: "processing",
            duration: SEGMENT_DURATION,
            createdAt: new Date().toISOString(),
        };

        const updatedSegments = [...segments, newSegment];

        await adminClient
            .from("long_video_jobs")
            .update({
                segments: updatedSegments,
            })
            .eq("id", jobId);

        console.log(`[LongVideo] Started segment ${nextOrder + 1}/${totalSegments}: ${generationId}`);

        return NextResponse.json({
            success: true,
            segment: {
                id: newSegment.id,
                order: nextOrder,
                generationId,
                requestId,
            },
            progress: {
                current: nextOrder + 1,
                total: totalSegments,
                isLast: isLastSegment,
            },
        });

    } catch (error: unknown) {
        console.error("[LongVideo] Continue error:", error);
        const message = error instanceof Error ? error.message : "Failed to continue video generation";
        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}
