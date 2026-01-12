import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { getTokenCost, QualityTier } from "@/lib/tokens";
import { processTokenCharge, type TokenChargeResult } from "@/lib/tokens-server";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rate-limit";
import { checkDailyLimit, createDailyLimitResponse } from "@/lib/daily-limits";
import { isFalConfigured, submitImageGeneration } from "@/lib/fal";
import { createGenerationWithSession } from "@/lib/session-utils";
import { sanitizePrompt, logBlockedPrompt } from "@/lib/prompt-sanitizer";

const GenerateSchema = z.object({
    prompt: z.string().min(1, "Prompt is required").max(2000, "Prompt too long (max 2000 chars)"),
    size: z.enum(["1024x1024", "512x512", "1024x1536", "1536x1024"]).optional().default("1024x1024"),
    quality: z.enum(["low", "medium", "high"]).optional().default("high"),
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const validation = GenerateSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: validation.error.issues[0].message },
                { status: 400 }
            );
        }

        const { prompt, size, quality } = validation.data;
        const cost = getTokenCost('image', quality as QualityTier);

        // --- Auth Check ---
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // --- Rate Limit Check (10 requests per minute per user) ---
        const rateLimit = checkRateLimit(`image:${user.id}`, 10, 60000);
        if (!rateLimit.allowed) {
            return createRateLimitResponse(rateLimit.resetIn);
        }

        // --- Daily Limit Check ---
        const dailyLimit = await checkDailyLimit(user.id);
        if (!dailyLimit.allowed) {
            return NextResponse.json(createDailyLimitResponse(dailyLimit), { status: 429 });
        }

        // --- Prompt Sanitization (NSFW/Violence Filter) ---
        const sanitizeResult = sanitizePrompt(prompt);
        if (!sanitizeResult.isValid) {
            logBlockedPrompt(user.id, prompt, sanitizeResult);
            return NextResponse.json(
                { error: sanitizeResult.blockedReason || "Prompt tidak diizinkan" },
                { status: 400 }
            );
        }

        // --- Check fal.ai Configuration ---
        if (!isFalConfigured()) {
            return NextResponse.json({ error: "Image generation service not configured" }, { status: 500 });
        }

        // --- 1. Token Balance Pre-Check & Reserve ---
        let tokenCharge: TokenChargeResult;
        try {
            tokenCharge = await processTokenCharge(user.id, cost);
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : "Failed to process token charge";
            return NextResponse.json({ error: message }, { status: 403 });
        }

        try {
            // --- 2. Enhance Prompt based on quality ---
            let enhancedPrompt = prompt;
            if (quality === "medium") {
                enhancedPrompt = `${prompt}, high resolution, professional photography, cinematic lighting, sharp focus, vibrant colors`;
            } else if (quality === "high") {
                enhancedPrompt = `${prompt}, hyper-realistic masterpiece, award-winning photography, ultra-detailed 8k, ray tracing, soft global illumination, professional color grading, shot on Nikon Z9`;
            }
            // For "low" quality, use prompt as-is for faster generation

            // --- 3. Submit Image Generation (Async) ---
            // Use async submission to prevent Vercel/Netlify timeouts (LIMIT: 10s)
            console.log(`[Generate Image] Submitting async job to fal.ai GPT-Image-1.5`);

            const { requestId } = await submitImageGeneration({
                prompt: enhancedPrompt,
                size: size as "1024x1024" | "512x512" | "1024x1536" | "1536x1024",
                quality: quality as "low" | "medium" | "high",
                outputFormat: "png",
            });

            // --- 4. Create Pending Record ---
            // We create the record immediately with "pending" status
            // The frontend will poll /api/generations/[id]/check to update it
            const { generationId, sessionId } = await createGenerationWithSession({
                userId: user.id,
                type: "image",
                prompt: prompt,
                fileUrl: "", // No URL yet
                status: "pending",
                tokensUsed: cost,
                metadata: {
                    provider: "fal-gpt-image-1.5",
                    quality,
                    size,
                    generationType: "text-to-image",
                    fal_request_id: requestId,
                    token_reservation_id: tokenCharge.reservationId
                },
            });

            // NOTE: We do NOT commit tokens yet. They remain reserved.
            // They will be committed in the check-status route when generation completes.

            return NextResponse.json({
                success: true,
                generationId,
                sessionId,
                requestId,
                status: "pending"
            });

        } catch (generationError: unknown) {
            await tokenCharge.cancel();
            throw generationError;
        }

    } catch (error: unknown) {
        console.error("Image generation error:", error);
        const message = error instanceof Error ? error.message : "Failed to generate image";
        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}
