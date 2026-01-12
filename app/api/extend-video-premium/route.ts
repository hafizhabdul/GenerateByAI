import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { z } from "zod";
import { processTokenCharge, type TokenChargeResult } from "@/lib/tokens-server";
import { extendVeoVideo, getVeoExtendCost, isFalConfigured } from "@/lib/fal";
import { persistExternalVideo } from "@/lib/storage-utils";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rate-limit";
import { checkDailyLimit, incrementDailyGeneration, createDailyLimitResponse } from "@/lib/daily-limits";

const ExtendVideoPremiumSchema = z.object({
    generationId: z.string().uuid("Valid generation ID required"),
    prompt: z.string().max(2000, "Prompt too long").optional(),
});

/**
 * Extend a Veo 3.1 (premium) video by 4 more seconds
 * POST /api/extend-video-premium
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const validation = ExtendVideoPremiumSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: validation.error.issues[0].message },
                { status: 400 }
            );
        }

        const { generationId, prompt } = validation.data;

        // Check if fal.ai is configured
        if (!isFalConfigured()) {
            return NextResponse.json(
                { error: "Video extension service not configured" },
                { status: 503 }
            );
        }

        // Calculate cost
        const cost = getVeoExtendCost();

        // Auth Check
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Rate Limit Check (3 extensions per minute per user)
        const rateLimit = checkRateLimit(`extend-video-premium:${user.id}`, 3, 60000);
        if (!rateLimit.allowed) {
            return createRateLimitResponse(rateLimit.resetIn);
        }

        // Daily Limit Check
        const dailyLimit = await checkDailyLimit(user.id);
        if (!dailyLimit.allowed) {
            return NextResponse.json(createDailyLimitResponse(dailyLimit), { status: 429 });
        }

        // Get original video
        const adminClient = createAdminClient();
        const { data: original, error: fetchError } = await adminClient
            .from("generations")
            .select("*")
            .eq("id", generationId)
            .eq("user_id", user.id)
            .eq("type", "video")
            .single();

        if (fetchError || !original) {
            return NextResponse.json({ error: "Video not found" }, { status: 404 });
        }

        // Verify it's a Veo 3.1 video
        if (original.metadata?.provider !== "fal-veo-3.1") {
            return NextResponse.json(
                { error: "Only Veo 3.1 (premium) videos can be extended. Standard videos don't support extension." },
                { status: 400 }
            );
        }

        // Verify video has a URL
        if (!original.file_url) {
            return NextResponse.json(
                { error: "Video not yet completed or URL missing" },
                { status: 400 }
            );
        }

        // Token Balance Pre-Check & Reserve
        let tokenCharge: TokenChargeResult;
        try {
            tokenCharge = await processTokenCharge(user.id, cost);
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : "Token charge failed";
            return NextResponse.json({ error: message }, { status: 403 });
        }

        try {
            console.log(`[Extend Premium] Starting extension for generation ${generationId}`);

            // Extend the video
            const result = await extendVeoVideo({
                videoUrl: original.file_url,
                prompt: prompt || original.prompt || "",
                enableAudio: original.metadata?.hasAudio ?? true,
            });

            // Persist the extended video to storage
            const permanentUrl = await persistExternalVideo(result.videoUrl, user.id);

            // Calculate new duration
            const originalDuration = parseInt(original.metadata?.duration || "5");
            const newDuration = originalDuration + result.duration;

            // Save new extended video record
            const { data: newGeneration, error: dbError } = await adminClient
                .from("generations")
                .insert({
                    user_id: user.id,
                    type: "video",
                    prompt: prompt || `Extended: ${original.prompt}`,
                    file_url: permanentUrl,
                    status: "completed",
                    tokens_used: cost,
                    metadata: {
                        provider: "fal-veo-3.1",
                        duration: newDuration,
                        hasAudio: result.hasAudio,
                        aspectRatio: original.metadata?.aspectRatio || "16:9",
                        sourceType: "video-extend",
                        extendedFrom: generationId,
                        requestId: result.requestId,
                        tier: "premium",
                    },
                })
                .select()
                .single();

            if (dbError) {
                console.error("[Extend Premium] DB error:", dbError);
            }

            // Commit token charge
            await tokenCharge.commit();

            // Increment daily generation count
            await incrementDailyGeneration(user.id);

            console.log(`[Extend Premium] Extension complete:`, {
                originalId: generationId,
                newId: newGeneration?.id,
                originalDuration,
                newDuration,
                tokensUsed: cost,
            });

            return NextResponse.json({
                success: true,
                videoUrl: permanentUrl,
                duration: newDuration,
                tokensUsed: cost,
                generation: newGeneration,
            });

        } catch (generationError) {
            // Cancel the token reservation if extension fails
            await tokenCharge.cancel();
            throw generationError;
        }

    } catch (error) {
        console.error("[Extend Premium] Error:", error);

        const message = error instanceof Error ? error.message : "Video extension failed";
        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}
