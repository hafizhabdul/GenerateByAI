import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { processTokenCharge, type TokenChargeResult } from "@/lib/tokens-server";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rate-limit";
import { checkDailyLimit, createDailyLimitResponse, incrementDailyGeneration } from "@/lib/daily-limits";
import {
    startWanVideoGeneration,
    getWanVideoCost,
    isWanConfigured,
    type WanDuration,
    type WanResolution,
    type WanAspectRatio,
} from "@/lib/fal-wan";
import { createGenerationWithSession } from "@/lib/session-utils";

const StartVideoSchema = z.object({
    imageUrl: z.string().url().optional(),
    prompt: z.string().min(1, "Prompt is required").max(2000, "Prompt too long (max 2000 chars)"),
    negativePrompt: z.string().max(1000).optional(),
    duration: z.enum(["5", "10", "15"]).optional().default("5"),
    resolution: z.enum(["720p", "1080p"]).optional().default("720p"),
    aspectRatio: z.enum(["16:9", "9:16", "1:1"]).optional().default("16:9"),
    type: z.enum(["image2video", "text2video"]).optional().default("image2video"),
});

/**
 * Start async video generation using fal.ai wan/v2.6
 * POST /api/video-start
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const validation = StartVideoSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: validation.error.issues[0].message },
                { status: 400 }
            );
        }

        const { imageUrl, prompt, negativePrompt, duration, resolution, aspectRatio, type } = validation.data;

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

        // Rate Limit Check (5 video starts per minute per user)
        const rateLimit = checkRateLimit(`video-start:${user.id}`, 5, 60000);
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
                "incomplete action", "unrealistic movement", "jerky motion"
            ].join(", ");

            const enhancedNegative = negativePrompt || `${baseNegative}, ${actionNegatives}`;

            console.log(`[Video] Starting wan/v2.6 generation`);
            console.log(`[Video] Duration: ${duration}s, Resolution: ${resolution}`);
            console.log(`[Video] Original prompt: ${prompt}`);
            console.log(`[Video] Enhanced prompt: ${enhancedPrompt}`);

            // Start async video generation with wan/v2.6
            const { requestId } = await startWanVideoGeneration({
                prompt: enhancedPrompt,
                imageUrl: type === "image2video" ? imageUrl : undefined,
                duration: durationNum,
                resolution: resolution as WanResolution,
                aspectRatio: aspectRatio as WanAspectRatio,
                negativePrompt: enhancedNegative,
            });

            console.log(`[Video] Started async task: ${requestId}`);

            // Save pending generation record with session
            const { generationId, sessionId } = await createGenerationWithSession({
                userId: user.id,
                type: "video",
                prompt: prompt,
                fileUrl: null, // Will be filled when complete
                status: "processing",
                tokensUsed: cost,
                metadata: {
                    requestId,
                    duration: durationNum,
                    resolution,
                    aspectRatio,
                    sourceType: type,
                    sourceImage: imageUrl || null,
                    provider: "fal-wan-v2.6",
                    tier: "standard",
                },
            });

            // Commit token charge - task started successfully
            await tokenCharge.commit();

            // Increment daily generation count
            await incrementDailyGeneration(user.id);

            return NextResponse.json({
                success: true,
                requestId,
                generationId,
                sessionId,
                type,
                duration: durationNum,
                resolution,
                tokensUsed: cost,
                message: "Video generation started. Check status with /api/video-status",
            });

        } catch (generationError: unknown) {
            await tokenCharge.cancel();
            throw generationError;
        }

    } catch (error: unknown) {
        console.error("Video start error:", error);
        const message = error instanceof Error ? error.message : "Failed to start video generation";
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
