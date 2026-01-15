import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { processTokenCharge, type TokenChargeResult } from "@/lib/tokens-server";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rate-limit";
import { checkDailyLimit, createDailyLimitResponse } from "@/lib/daily-limits";
import {
    startWanVideoGeneration,
    getWanVideoCost,
    isWanConfigured,
    type WanDuration,
    type WanResolution,
    type WanAspectRatio,
} from "@/lib/fal-wan";
import { createGenerationWithSession } from "@/lib/session-utils";

const GenerateVideoSchema = z.object({
    imageUrl: z.string().url().optional(),
    prompt: z.string().min(1, "Prompt is required").max(2000, "Prompt too long (max 2000 chars)"),
    negativePrompt: z.string().max(1000).optional(),
    duration: z.enum(["5", "10", "15"]).optional().default("5"),
    resolution: z.enum(["720p", "1080p"]).optional().default("720p"),
    aspectRatio: z.enum(["16:9", "9:16", "1:1"]).optional().default("16:9"),
    type: z.enum(["image2video", "text2video"]).optional().default("image2video"),
    disableSafetyChecker: z.boolean().optional().default(false), // Disable content moderation for falsely flagged images
});

/**
 * Synchronous video generation using fal.ai wan/v2.6
 * Similar to VEO premium but for standard tier
 * POST /api/generate-video-standard
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const validation = GenerateVideoSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: validation.error.issues[0].message },
                { status: 400 }
            );
        }

        const { imageUrl, prompt, negativePrompt, duration, resolution, aspectRatio, type, disableSafetyChecker } = validation.data;

        // Validate image URL for image2video
        if (type === "image2video" && !imageUrl) {
            return NextResponse.json(
                { error: "Image URL is required for image-to-video generation" },
                { status: 400 }
            );
        }

        // Check if fal.ai is configured
        if (!isWanConfigured()) {
            return NextResponse.json(
                { error: "Video generation service not configured" },
                { status: 503 }
            );
        }

        // Calculate cost based on duration and resolution
        const durationNum = parseInt(duration) as WanDuration;
        const cost = getWanVideoCost(durationNum, resolution as WanResolution);

        // Auth Check
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Rate Limit Check (5 video generations per minute per user)
        const rateLimit = checkRateLimit(`video-gen:${user.id}`, 5, 60000);
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
            const message = e instanceof Error ? e.message : "Failed to process token charge";
            return NextResponse.json({ error: message }, { status: 403 });
        }

        try {
            // Enhance prompt for better results
            const enhancedPrompt = enhanceMarketingPrompt(prompt, type);

            // Enhanced negative prompts
            const baseNegative = type === "image2video"
                ? "different product, wrong product, changed product, morphing, deformation, blurry, low quality, distorted, ugly, shaky camera, amateur, poorly lit, unnatural colors"
                : "blurry, low quality, distorted, ugly, shaky camera, amateur, poorly lit";

            const actionNegatives = [
                "frozen pose", "static image", "no movement",
                "incomplete action", "unrealistic movement", "jerky motion",
                "audio", "sound", "speech", "voice", "talking", "speaking"
            ].join(", ");

            const enhancedNegative = negativePrompt || `${baseNegative}, ${actionNegatives}`;

            console.log(`[Video-Standard] Starting wan/v2.6 SYNC generation`);
            console.log(`[Video-Standard] Duration: ${duration}s, Resolution: ${resolution}`);
            console.log(`[Video-Standard] Safety checker: ${disableSafetyChecker ? 'DISABLED' : 'enabled'}`);
            console.log(`[Video-Standard] Original prompt: ${prompt}`);
            console.log(`[Video-Standard] Enhanced prompt: ${enhancedPrompt}`);

            // Start video generation asynchronously
            const { requestId } = await startWanVideoGeneration({
                prompt: enhancedPrompt,
                imageUrl: type === "image2video" ? imageUrl : undefined,
                duration: durationNum,
                resolution: resolution as WanResolution,
                aspectRatio: aspectRatio as WanAspectRatio,
                negativePrompt: enhancedNegative,
                sample_audio: false,
                enableSafetyChecker: !disableSafetyChecker, // Invert: disableSafetyChecker=true means enableSafetyChecker=false
            });

            console.log(`[Video-Standard] Async generation started, requestId: ${requestId}`);

            // Create pending generation record with session
            const { generationId, sessionId } = await createGenerationWithSession({
                userId: user.id,
                type: "video",
                prompt: prompt,
                // No fileUrl yet
                status: "pending",
                tokensUsed: cost,
                metadata: {
                    requestId: requestId, // Important for polling
                    duration: durationNum,
                    resolution: resolution as WanResolution,
                    aspectRatio,
                    sourceType: type,
                    sourceImage: imageUrl || null,
                    provider: "fal-wan-v2.6",
                    tier: "standard",
                    tokenReservationId: tokenCharge.reservationId
                },
            });

            // We do NOT commit tokens here. We rely on the check/webhook to commit.
            // But verify: does createRateLimitResponse logic handle "pending"? 
            // Rate limit was already checked.

            // Increment daily generation count (optimistic? or wait?)
            // Usually we increment on success. But to prevent abuse we might increment now 
            // and decrement on failure? 
            // The existing synchronous code incremented at the end. 
            // Let's stick to incrementing at the end (in the check route) to be safe/fair, 
            // OR increment now and risk over-counting. 
            // The previous async implementation in generate-video (Veo) did increment in check route (actually generate-video had it commented out or handled differently).
            // Let's NOT increment here. The check route should handle it.

            return NextResponse.json({
                success: true,
                generationId,
                requestId,
                sessionId,
                status: "pending",
                type
            });

        } catch (generationError: unknown) {
            console.error("[Video-Standard] Submission failed:", generationError);
            await tokenCharge.cancel();
            throw generationError;
        }

    } catch (error: unknown) {
        console.error("[Video-Standard] Error:", error);
        const message = error instanceof Error ? error.message : "Failed to generate video";
        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}

/**
 * Enhance prompt for high-quality video generation
 */
function enhanceMarketingPrompt(prompt: string, type: string): string {
    const userPrompt = prompt.trim();

    // Translate common Indonesian terms
    const translatedPrompt = translateCommonTerms(userPrompt);

    // Don't over-enhance if prompt is already detailed
    if (translatedPrompt.length > 300) {
        return translatedPrompt;
    }

    // Analyze for action content
    const hasAction = /spray|apply|pour|hold|use|drink|eat|open|show|rub|massage|smell/i.test(translatedPrompt);
    const isProductDemo = /product|marketing|advertisement|promotional|commercial/i.test(translatedPrompt);
    const isBeautyContent = /beauty|cosmetic|skincare|makeup|perfume|lotion|cream|serum/i.test(translatedPrompt);

    const enhancements: string[] = [translatedPrompt];

    if (type === "image2video") {
        enhancements.push("realistic natural movement");
        enhancements.push("continuous smooth motion");
        if (hasAction) {
            enhancements.push("complete action from start to finish");
        }
    } else {
        if (isProductDemo) {
            enhancements.push("professional commercial style");
            enhancements.push("clean studio background");
        } else if (isBeautyContent) {
            enhancements.push("beauty advertisement style");
            enhancements.push("soft flattering lighting");
        }
    }

    enhancements.push("high quality");
    enhancements.push("natural lighting");

    return enhancements.join(", ");
}

/**
 * Translate common Indonesian terms to English
 */
function translateCommonTerms(prompt: string): string {
    const translations: Record<string, string> = {
        'menyemprotkan': 'spraying', 'menyemprot': 'sprays', 'semprot': 'spray',
        'memegang': 'holding', 'pegang': 'hold',
        'menggunakan': 'using', 'pakai': 'use', 'memakai': 'wearing',
        'menuangkan': 'pouring', 'tuang': 'pour',
        'minum': 'drinking', 'makan': 'eating',
        'berjalan': 'walking', 'berlari': 'running',
        'duduk': 'sitting', 'berdiri': 'standing',
        'tersenyum': 'smiling', 'menari': 'dancing',
        'membuka': 'opening', 'menutup': 'closing',
        'mengambil': 'taking', 'meletakkan': 'placing',
        'menunjukkan': 'showing', 'memperlihatkan': 'displaying',
        'mengaplikasikan': 'applying', 'mengoleskan': 'applying',
        'wanita': 'woman', 'perempuan': 'woman',
        'pria': 'man', 'laki-laki': 'man',
        'parfum': 'perfume', 'produk': 'product',
        'botol': 'bottle', 'kemasan': 'packaging',
        'cantik': 'beautiful', 'menarik': 'attractive',
        'elegan': 'elegant', 'mewah': 'luxurious',
        'wajah': 'face', 'tangan': 'hand',
        'badan': 'body', 'kulit': 'skin',
    };

    let result = prompt.toLowerCase();
    const sortedKeys = Object.keys(translations).sort((a, b) => b.length - a.length);

    for (const indonesian of sortedKeys) {
        const english = translations[indonesian];
        const regex = new RegExp(`\\b${indonesian}\\b`, 'gi');
        result = result.replace(regex, english);
    }

    return result;
}
