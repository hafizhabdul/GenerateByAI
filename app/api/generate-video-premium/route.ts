import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { processTokenCharge, type TokenChargeResult } from "@/lib/tokens-server";
import { generateVeoVideo, getVeoCost, isFalConfigured } from "@/lib/fal";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rate-limit";
import { checkDailyLimit, incrementDailyGeneration, createDailyLimitResponse } from "@/lib/daily-limits";
import { createGenerationWithSession } from "@/lib/session-utils";

const GenerateVideoPremiumSchema = z.object({
    imageUrl: z.string().url().optional(),
    prompt: z.string().min(1, "Prompt is required"),
    duration: z.enum(["5", "8"]).optional().default("5"),
    aspectRatio: z.enum(["16:9", "9:16", "1:1"]).optional().default("16:9"),
    type: z.enum(["image2video", "text2video"]).optional().default("text2video"),
});

export async function POST(req: Request) {
    try {
        // Check if fal.ai is configured
        if (!isFalConfigured()) {
            return NextResponse.json(
                { error: "Premium video generation is not configured. Please contact support." },
                { status: 503 }
            );
        }

        const body = await req.json();
        const validation = GenerateVideoPremiumSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: validation.error.issues[0].message },
                { status: 400 }
            );
        }

        const { imageUrl, prompt, duration, aspectRatio, type } = validation.data;

        // Validate image URL for image2video
        if (type === "image2video" && !imageUrl) {
            return NextResponse.json(
                { error: "Image URL is required for image-to-video generation" },
                { status: 400 }
            );
        }

        // Calculate cost based on duration
        const durationNum = parseInt(duration) as 5 | 8;
        const cost = getVeoCost(durationNum);

        // --- Auth Check ---
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // --- Rate Limit Check (3 premium video requests per minute per user) ---
        const rateLimit = checkRateLimit(`video-premium:${user.id}`, 3, 60000);
        if (!rateLimit.allowed) {
            return createRateLimitResponse(rateLimit.resetIn);
        }

        // --- Daily Limit Check ---
        const dailyLimit = await checkDailyLimit(user.id);
        if (!dailyLimit.allowed) {
            return NextResponse.json(createDailyLimitResponse(dailyLimit), { status: 429 });
        }

        // --- Token Balance Pre-Check & Reserve ---
        let tokenCharge: TokenChargeResult;
        try {
            tokenCharge = await processTokenCharge(user.id, cost);
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : "Token charge failed";
            return NextResponse.json({ error: message }, { status: 403 });
        }

        try {
            // --- Enhanced Prompt for Better Results ---
            const enhancedPrompt = enhancePromptForVeo(prompt);

            // --- Generate Video with Veo 3.1 ---
            console.log(`[Premium Video] Starting Veo 3.1 generation for user ${user.id}`);

            const result = await generateVeoVideo({
                prompt: enhancedPrompt,
                imageUrl: type === "image2video" ? imageUrl : undefined,
                duration: durationNum,
                aspectRatio,
                enableAudio: true, // Always enable native audio for premium
            });

            // --- Save to Database with Session ---
            const { generationId, sessionId } = await createGenerationWithSession({
                userId: user.id,
                type: "video",
                prompt: prompt,
                fileUrl: result.videoUrl,
                status: "completed",
                tokensUsed: cost,
                metadata: {
                    provider: "fal-veo-3.1",
                    duration: durationNum,
                    hasAudio: true,
                    aspectRatio,
                    sourceType: type,
                    requestId: result.requestId,
                    tier: "premium",
                },
            });

            // --- Commit Token Charge ---
            await tokenCharge.commit();

            // --- Increment Daily Generation Count ---
            await incrementDailyGeneration(user.id);

            console.log(`[Premium Video] Generation complete for user ${user.id}:`, {
                videoUrl: result.videoUrl,
                duration: durationNum,
                tokensUsed: cost,
                generationId,
                sessionId,
            });

            return NextResponse.json({
                success: true,
                videoUrl: result.videoUrl,
                audioIncluded: true,
                duration: durationNum,
                tokensUsed: cost,
                generationId,
                sessionId,
                provider: "veo-3.1",
                tier: "premium",
            });

        } catch (generationError) {
            // Cancel the token reservation if generation fails
            await tokenCharge.cancel();
            throw generationError;
        }

    } catch (error) {
        console.error("[Premium Video] Generation error:", error);

        // Return user-friendly error
        const message = error instanceof Error ? error.message : "Video generation failed";
        return NextResponse.json(
            {
                error: "Premium video generation failed",
                details: message,
            },
            { status: 500 }
        );
    }
}

/**
 * Enhance prompt for better Veo 3.1 results
 */
function enhancePromptForVeo(prompt: string): string {
    // Check if prompt already has cinematic keywords
    const cinematicKeywords = [
        "cinematic", "film", "movie", "professional", "high quality",
        "4k", "hdr", "dramatic", "smooth motion"
    ];

    const hasQualityKeywords = cinematicKeywords.some(
        keyword => prompt.toLowerCase().includes(keyword)
    );

    if (hasQualityKeywords) {
        return prompt;
    }

    // Add quality enhancers for Veo 3.1
    return `${prompt}, cinematic quality, smooth camera motion, professional lighting, high detail`;
}
