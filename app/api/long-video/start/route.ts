import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { z } from "zod";
import { processTokenCharge, type TokenChargeResult } from "@/lib/tokens-server";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rate-limit";
import { checkDailyLimit, createDailyLimitResponse } from "@/lib/daily-limits";
import { startWanVideoGeneration, isWanConfigured, type WanResolution, type WanAspectRatio } from "@/lib/fal-wan";
import { createGenerationWithSession } from "@/lib/session-utils";
import {
    getLongVideoCost,
    getSegmentCount,
    isValidDuration,
    generateSegmentPrompts,
    type LongVideoDuration,
    type LongVideoMode,
    type LongVideoSettings,
    type LongVideoSegment,
    type SegmentPrompt,
    SEGMENT_DURATION,
} from "@/lib/long-video";

const StartLongVideoSchema = z.object({
    prompt: z.string().min(1, "Prompt is required"),
    negativePrompt: z.string().max(1000).optional(),
    targetDuration: z.number().refine((d) => d === 60 || d === 90 || d === 120, {
        message: "Duration must be 60, 90, or 120 seconds",
    }),
    resolution: z.enum(["720p", "1080p"]).optional().default("720p"),
    aspectRatio: z.enum(["16:9", "9:16", "1:1"]).optional().default("16:9"),
    mode: z.enum(["continuous", "different-angles"]).optional().default("continuous"),
    imageUrl: z.string().url().optional(),
});

/**
 * Start a long video generation job
 * POST /api/long-video/start
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const validation = StartLongVideoSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: validation.error.issues[0].message },
                { status: 400 }
            );
        }

        const { prompt, negativePrompt, targetDuration, resolution, aspectRatio, mode, imageUrl } = validation.data;

        // Check if fal.ai is configured
        if (!isWanConfigured()) {
            return NextResponse.json(
                { error: "Video generation service not configured" },
                { status: 503 }
            );
        }

        // Validate duration
        if (!isValidDuration(targetDuration)) {
            return NextResponse.json(
                { error: "Invalid target duration" },
                { status: 400 }
            );
        }

        // Calculate total cost upfront
        const totalCost = getLongVideoCost(targetDuration as LongVideoDuration, resolution as WanResolution);
        const segmentCount = getSegmentCount(targetDuration as LongVideoDuration);

        // Auth Check
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Rate Limit Check (2 long video jobs per hour)
        const rateLimit = checkRateLimit(`long-video:${user.id}`, 2, 3600000);
        if (!rateLimit.allowed) {
            return createRateLimitResponse(rateLimit.resetIn);
        }

        // Daily Limit Check
        const dailyLimit = await checkDailyLimit(user.id);
        if (!dailyLimit.allowed) {
            return NextResponse.json(createDailyLimitResponse(dailyLimit), { status: 429 });
        }

        // Check for existing incomplete jobs
        const adminClient = createAdminClient();
        const { data: existingJobs } = await adminClient
            .from("long_video_jobs")
            .select("id, status")
            .eq("user_id", user.id)
            .in("status", ["pending", "processing"])
            .limit(1);

        if (existingJobs && existingJobs.length > 0) {
            return NextResponse.json(
                { 
                    error: "You have an incomplete long video job. Please wait for it to complete or cancel it first.",
                    existingJobId: existingJobs[0].id,
                },
                { status: 409 }
            );
        }

        // Reserve tokens for the entire job
        let tokenCharge: TokenChargeResult;
        try {
            tokenCharge = await processTokenCharge(user.id, totalCost);
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : "Failed to process token charge";
            return NextResponse.json({ error: message }, { status: 403 });
        }

        let createdJobId: string | null = null;
        
        try {
            // Generate AI-powered segment prompts
            console.log(`[LongVideo] Generating AI segment prompts...`);
            let segmentPrompts: SegmentPrompt[];
            try {
                segmentPrompts = await generateSegmentPrompts(
                    prompt,
                    targetDuration as LongVideoDuration,
                    aspectRatio as "16:9" | "9:16" | "1:1"
                );
            } catch (aiError) {
                console.warn("[LongVideo] AI prompt generation failed, using fallback:", aiError);
                // Fallback is handled inside generateSegmentPrompts
                segmentPrompts = [];
            }
            
            // Create long video job record
            const settings: LongVideoSettings = {
                resolution: resolution as WanResolution,
                aspectRatio: aspectRatio as "16:9" | "9:16" | "1:1",
                negativePrompt,
                mode: mode as LongVideoMode,
            };

            const { data: job, error: jobError } = await adminClient
                .from("long_video_jobs")
                .insert({
                    user_id: user.id,
                    status: "processing",
                    prompt,
                    target_duration: targetDuration,
                    current_duration: 0,
                    settings,
                    segments: [],
                    segment_prompts: segmentPrompts, // Store AI-generated prompts
                    tokens_reserved: totalCost,
                    tokens_used: 0,
                    token_reservation_id: tokenCharge.reservationId,
                })
                .select()
                .single();

            if (jobError || !job) {
                throw new Error("Failed to create job record");
            }
            
            createdJobId = job.id;

            console.log(`[LongVideo] Created job ${job.id} - ${segmentCount} segments, ${totalCost} tokens`);

            // Start first segment generation with AI prompt (or fallback)
            const firstSegmentPrompt = imageUrl
                ? prompt // Use original prompt for image-to-video
                : (segmentPrompts[0]?.prompt || `${prompt}, establishing shot, cinematic opening`);

            const { requestId } = await startWanVideoGeneration({
                prompt: firstSegmentPrompt,
                imageUrl,
                duration: SEGMENT_DURATION as 5 | 10 | 15,
                resolution: resolution as WanResolution,
                aspectRatio: aspectRatio as WanAspectRatio,
                negativePrompt: negativePrompt || "blurry, low quality, distorted, ugly, shaky",
            });

            // Create generation record for first segment
            const { generationId } = await createGenerationWithSession({
                userId: user.id,
                type: "video",
                prompt: firstSegmentPrompt,
                status: "pending",
                tokensUsed: 0, // Will be tracked at job level
                metadata: {
                    provider: "fal-wan-v2.6",
                    requestId,
                    duration: SEGMENT_DURATION,
                    resolution,
                    aspectRatio,
                    sourceType: imageUrl ? "image2video" : "text2video",
                    sourceImage: imageUrl || null,
                    longVideoJobId: job.id,
                    segmentOrder: 0,
                },
            });

            // Update job with first segment info
            const firstSegment: LongVideoSegment = {
                id: crypto.randomUUID(),
                generationId,
                order: 0,
                status: "processing",
                duration: SEGMENT_DURATION,
                createdAt: new Date().toISOString(),
            };

            await adminClient
                .from("long_video_jobs")
                .update({
                    segments: [firstSegment],
                })
                .eq("id", job.id);

            console.log(`[LongVideo] Started first segment: ${generationId}`);

            return NextResponse.json({
                success: true,
                jobId: job.id,
                segmentCount,
                totalCost,
                estimatedMinutes: segmentCount * 2.5,
                segmentPrompts: segmentPrompts.length > 0 ? segmentPrompts : undefined,
                firstSegment: {
                    generationId,
                    requestId,
                    prompt: firstSegmentPrompt,
                },
            });

        } catch (error) {
            // Cancel token reservation on failure
            await tokenCharge.cancel();
            
            // If job was created, mark as failed
            if (createdJobId) {
                await adminClient
                    .from("long_video_jobs")
                    .update({
                        status: "failed",
                        error: error instanceof Error ? error.message : "Failed to start first segment",
                        tokens_reserved: 0,
                    })
                    .eq("id", createdJobId);
            }
            
            throw error;
        }

    } catch (error: unknown) {
        console.error("[LongVideo] Start error:", error);
        const message = error instanceof Error ? error.message : "Failed to start long video generation";
        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}
