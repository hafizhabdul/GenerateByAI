import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { z } from "zod";
import { stitchVideos, isFFmpegAvailable } from "@/lib/video-utils";
import { commitTokenCharge } from "@/lib/tokens-server";
import { incrementDailyGeneration } from "@/lib/daily-limits";
import {
    getSegmentCount,
    formatDuration,
    type LongVideoSegment,
    type LongVideoDuration,
} from "@/lib/long-video";

const StitchLongVideoSchema = z.object({
    jobId: z.string().uuid("Valid job ID required"),
});

/**
 * Stitch all segments into final video
 * POST /api/long-video/stitch
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const validation = StitchLongVideoSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: validation.error.issues[0].message },
                { status: 400 }
            );
        }

        const { jobId } = validation.data;

        // Auth Check
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check ffmpeg availability
        const ffmpegAvailable = await isFFmpegAvailable();
        if (!ffmpegAvailable) {
            return NextResponse.json(
                { error: "Video processing service not available" },
                { status: 503 }
            );
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
        if (job.status === "completed") {
            return NextResponse.json({
                success: true,
                alreadyCompleted: true,
                videoUrl: job.final_video_url,
                duration: job.current_duration,
            });
        }

        if (job.status !== "processing") {
            return NextResponse.json(
                { error: `Cannot stitch job with status: ${job.status}` },
                { status: 400 }
            );
        }

        const segments = (job.segments || []) as LongVideoSegment[];
        const targetDuration = job.target_duration as LongVideoDuration;
        const totalSegments = getSegmentCount(targetDuration);

        // Check if all segments are completed
        const completedSegments = segments.filter(s => s.status === "completed" && s.videoUrl);
        
        if (completedSegments.length < totalSegments) {
            return NextResponse.json(
                { 
                    error: `Not all segments completed. ${completedSegments.length}/${totalSegments} ready.`,
                    completedCount: completedSegments.length,
                    totalCount: totalSegments,
                },
                { status: 400 }
            );
        }

        // Update status to stitching
        await adminClient
            .from("long_video_jobs")
            .update({ status: "stitching" })
            .eq("id", jobId);

        console.log(`[LongVideo] Starting stitch for job ${jobId} with ${completedSegments.length} segments`);

        try {
            // Sort segments by order and get video URLs
            const sortedSegments = completedSegments.sort((a, b) => a.order - b.order);
            const videoUrls = sortedSegments.map(s => s.videoUrl!);

            // Stitch videos together
            const { videoUrl, duration } = await stitchVideos(videoUrls, user.id);

            console.log(`[LongVideo] Stitch complete: ${formatDuration(duration)}`);

            // Update job as completed
            await adminClient
                .from("long_video_jobs")
                .update({
                    status: "completed",
                    final_video_url: videoUrl,
                    current_duration: duration,
                    tokens_used: job.tokens_reserved,
                })
                .eq("id", jobId);

            // Commit the reserved tokens
            // Note: We already reserved tokens at start, now we commit them
            // The reservation ID would need to be stored - for now we just mark as used

            // Increment daily generation count
            await incrementDailyGeneration(user.id);

            return NextResponse.json({
                success: true,
                videoUrl,
                duration: Math.round(duration),
                formattedDuration: formatDuration(Math.round(duration)),
                tokensUsed: job.tokens_reserved,
                segmentCount: completedSegments.length,
            });

        } catch (stitchError) {
            console.error("[LongVideo] Stitch failed:", stitchError);

            // Update job as failed
            await adminClient
                .from("long_video_jobs")
                .update({
                    status: "failed",
                    error: stitchError instanceof Error ? stitchError.message : "Stitching failed",
                })
                .eq("id", jobId);

            throw stitchError;
        }

    } catch (error: unknown) {
        console.error("[LongVideo] Stitch error:", error);
        const message = error instanceof Error ? error.message : "Failed to stitch video";
        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}
