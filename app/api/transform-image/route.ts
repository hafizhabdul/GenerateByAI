import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { processTokenCharge, type TokenChargeResult } from "@/lib/tokens-server";
import { transformImage, isFalConfigured } from "@/lib/fal";
import { getTokenCost, QualityTier } from "@/lib/tokens";
import { persistExternalImage } from "@/lib/storage-utils";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rate-limit";
import { checkDailyLimit, incrementDailyGeneration, createDailyLimitResponse, getDailyLimitInfo } from "@/lib/daily-limits";
import { createGenerationWithSession } from "@/lib/session-utils";

const TransformImageSchema = z.object({
    imageUrl: z.string().url("Valid image URL required"),
    prompt: z.string().min(1, "Prompt is required").max(2000, "Prompt too long (max 2000 chars)"),
    size: z.enum(["1024x1024", "512x512", "1024x1536", "1536x1024"]).optional().default("1024x1024"),
    quality: z.enum(["low", "medium", "high"]).optional().default("high"),
});

/**
 * Transform/edit an image using GPT-Image-1.5 edit endpoint
 * POST /api/transform-image
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const validation = TransformImageSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: validation.error.issues[0].message },
                { status: 400 }
            );
        }

        const { imageUrl, prompt, size, quality } = validation.data;

        // Check if fal.ai is configured
        if (!isFalConfigured()) {
            return NextResponse.json(
                { error: "Image transformation service not configured" },
                { status: 503 }
            );
        }

        // Calculate cost based on quality tier
        const cost = getTokenCost('image', quality as QualityTier);

        // Auth Check
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Rate Limit Check (10 transforms per minute per user)
        const rateLimit = checkRateLimit(`transform-image:${user.id}`, 10, 60000);
        if (!rateLimit.allowed) {
            return createRateLimitResponse(rateLimit.resetIn);
        }

        // Daily Limit Check
        const dailyLimit = await checkDailyLimit(user.id);
        if (!dailyLimit.allowed) {
            return NextResponse.json(createDailyLimitResponse(dailyLimit), { status: 429 });
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
            console.log(`[Transform] Starting image transformation for user ${user.id}`);

            // Transform the image
            const result = await transformImage({
                imageUrl,
                prompt,
                size,
                quality,
            });

            // Persist the result to Supabase storage
            const permanentUrl = await persistExternalImage(result.imageUrl, user.id);

            // Save to database with session
            const { generationId, sessionId } = await createGenerationWithSession({
                userId: user.id,
                type: "image",
                prompt: prompt,
                fileUrl: permanentUrl,
                status: "completed",
                tokensUsed: cost,
                metadata: {
                    provider: "fal-gpt-image-1.5-edit",
                    sourceImage: imageUrl,
                    size,
                    quality,
                    requestId: result.requestId,
                    generationType: "image-to-image",
                },
            });

            // Commit token charge
            await tokenCharge.commit();

            // Increment daily generation count
            await incrementDailyGeneration(user.id);
            const dailyLimitInfo = await getDailyLimitInfo(user.id);

            console.log(`[Transform] Transformation complete for user ${user.id}:`, {
                outputUrl: permanentUrl,
                tokensUsed: cost,
                generationId,
                sessionId,
            });

            return NextResponse.json({
                success: true,
                imageUrl: permanentUrl,
                tokensUsed: cost,
                generationId,
                sessionId,
                dailyRemaining: dailyLimitInfo?.remaining
            });

        } catch (generationError) {
            // Cancel the token reservation if transformation fails
            await tokenCharge.cancel();
            throw generationError;
        }

    } catch (error) {
        console.error("[Transform] Error:", error);

        const message = error instanceof Error ? error.message : "Image transformation failed";
        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}
