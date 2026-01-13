import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { z } from "zod";
import { cancelTokenReservation } from "@/lib/tokens-server";
import {
    getSegmentCount,
    getProgressPercentage,
    isReadyForStitching,
    formatDuration,
    getStatusLabel,
    type LongVideoJob,
    type LongVideoSegment,
    type LongVideoDuration,
} from "@/lib/long-video";

/**
 * Sync segment status from generations table
 * This updates segment status based on actual generation status
 * If a segment fails, marks the job as failed and refunds tokens
 */
async function syncSegmentStatuses(
    jobId: string,
    segments: LongVideoSegment[],
    userId: string,
    tokenReservationId: string | null
): Promise<{ segments: LongVideoSegment[]; updated: boolean; jobFailed: boolean }> {
    const supabase = await createClient();
    let updated = false;
    let hasFailedSegment = false;

    // Get generation IDs for processing segments
    const processingSegments = segments.filter(s => s.status === "processing");
    
    if (processingSegments.length === 0) {
        return { segments, updated: false, jobFailed: false };
    }

    const generationIds = processingSegments.map(s => s.generationId);

    // Fetch actual generation statuses
    const { data: generations } = await supabase
        .from("generations")
        .select("id, status, file_url")
        .in("id", generationIds)
        .eq("user_id", userId);

    if (!generations || generations.length === 0) {
        return { segments, updated: false, jobFailed: false };
    }

    // Create map for quick lookup
    const generationMap = new Map(generations.map(g => [g.id, g]));

    // Update segments based on generation status
    const updatedSegments = segments.map(segment => {
        if (segment.status !== "processing") {
            return segment;
        }

        const generation = generationMap.get(segment.generationId);
        if (!generation) {
            return segment;
        }

        if (generation.status === "completed" && generation.file_url) {
            updated = true;
            return {
                ...segment,
                status: "completed" as const,
                videoUrl: generation.file_url,
            };
        }

        if (generation.status === "failed") {
            updated = true;
            hasFailedSegment = true;
            return {
                ...segment,
                status: "failed" as const,
            };
        }

        return segment;
    });

    // Persist updated segments to database if changed
    if (updated) {
        const adminClient = createAdminClient();
        
        if (hasFailedSegment) {
            // Cancel token reservation and mark job as failed
            if (tokenReservationId) {
                await cancelTokenReservation(tokenReservationId);
                console.log(`[LongVideo] Segment failed - token reservation ${tokenReservationId} canceled`);
            }
            
            await adminClient
                .from("long_video_jobs")
                .update({ 
                    segments: updatedSegments,
                    status: "failed",
                    error: "A segment failed to generate",
                    tokens_used: 0,
                    tokens_reserved: 0,
                })
                .eq("id", jobId);
        } else {
            await adminClient
                .from("long_video_jobs")
                .update({ segments: updatedSegments })
                .eq("id", jobId);
        }
    }

    return { segments: updatedSegments, updated, jobFailed: hasFailedSegment };
}

/**
 * Get long video job status
 * GET /api/long-video/status?jobId=xxx
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const jobId = searchParams.get("jobId");

        if (!jobId) {
            return NextResponse.json(
                { error: "Job ID is required" },
                { status: 400 }
            );
        }

        // Validate UUID format
        const uuidSchema = z.string().uuid();
        if (!uuidSchema.safeParse(jobId).success) {
            return NextResponse.json(
                { error: "Invalid job ID format" },
                { status: 400 }
            );
        }

        // Auth Check
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Fetch job
        const { data: job, error: fetchError } = await supabase
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

        // Parse segments and sync their status from generations table
        let segments = (job.segments || []) as LongVideoSegment[];
        const tokenReservationId = job.token_reservation_id as string | null;
        const syncResult = await syncSegmentStatuses(jobId, segments, user.id, tokenReservationId);
        segments = syncResult.segments;
        
        // If job just failed due to segment failure, update job status in response
        const jobStatus = syncResult.jobFailed ? "failed" : job.status;
        
        const targetDuration = job.target_duration as LongVideoDuration;
        const totalSegments = getSegmentCount(targetDuration);
        const completedSegments = segments.filter(s => s.status === "completed").length;
        const processingSegment = segments.find(s => s.status === "processing");
        const failedSegment = segments.find(s => s.status === "failed");

        // Calculate current duration from completed segments
        const currentDuration = segments
            .filter(s => s.status === "completed")
            .reduce((sum, s) => sum + (s.duration || 0), 0);

        // Build response
        const response = {
            jobId: job.id,
            status: jobStatus,
            statusLabel: getStatusLabel(jobStatus as "pending" | "processing" | "stitching" | "completed" | "failed"),
            prompt: job.prompt,
            
            progress: {
                currentSegment: completedSegments,
                totalSegments,
                currentDuration,
                targetDuration,
                percentage: getProgressPercentage(currentDuration, targetDuration),
                formattedCurrent: formatDuration(currentDuration),
                formattedTarget: formatDuration(targetDuration),
            },
            
            segments: segments.map(s => ({
                id: s.id,
                order: s.order,
                status: s.status,
                duration: s.duration,
                videoUrl: s.videoUrl,
                thumbnailUrl: s.thumbnailUrl,
            })),
            
            // Current segment being processed
            currentSegmentId: processingSegment?.generationId || null,
            
            // Ready for next action
            canContinue: jobStatus === "processing" && 
                         processingSegment === undefined && 
                         completedSegments < totalSegments,
            
            isReadyForStitching: isReadyForStitching({
                ...job,
                segments,
                targetDuration,
            } as unknown as LongVideoJob),
            
            // Final result
            finalVideoUrl: job.final_video_url || null,
            
            // Token info
            tokensReserved: job.tokens_reserved,
            tokensUsed: job.tokens_used,
            
            // Error info
            error: job.error || failedSegment ? (job.error || "A segment failed to generate") : null,
            
            // Timestamps
            createdAt: job.created_at,
            updatedAt: job.updated_at,
        };

        return NextResponse.json(response);

    } catch (error: unknown) {
        console.error("[LongVideo] Status error:", error);
        const message = error instanceof Error ? error.message : "Failed to get job status";
        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}
