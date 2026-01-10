import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { z } from "zod";
import { persistExternalVideo } from "@/lib/storage-utils";
import { processTokenCharge } from "@/lib/tokens-server";
import { createKlingClient, getVideoCost, getAudioCost } from "@/lib/kling";
import { submitVideoGeneration } from "@/lib/fal";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rate-limit";
import { checkDailyLimit, incrementDailyGeneration, createDailyLimitResponse } from "@/lib/daily-limits";

const GenerateVideoSchema = z.object({
    imageUrl: z.string().url().optional(),
    prompt: z.string().min(1, "Prompt is required"),
    negativePrompt: z.string().optional(),
    mode: z.enum(["std", "pro"]).optional().default("std"),
    duration: z.enum(["5", "10"]).optional().default("5"),
    aspectRatio: z.enum(["16:9", "9:16", "1:1"]).optional().default("16:9"),
    type: z.enum(["image2video", "text2video"]).optional().default("image2video"),
    sound: z.boolean().optional().default(false), // Kling 2.6 native audio
});

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

        const { imageUrl, prompt, negativePrompt, mode, duration, aspectRatio, type, sound } = validation.data;

        // Validate image URL for image2video
        if (type === "image2video" && !imageUrl) {
            return NextResponse.json(
                { error: "Image URL is required for image-to-video generation" },
                { status: 400 }
            );
        }

        // Calculate cost: video + optional audio (separate API call)
        const videoCost = getVideoCost(duration, mode);
        const audioCost = sound ? getAudioCost() : 0;
        const cost = videoCost + audioCost;

        // --- Auth Check ---
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // --- Rate Limit Check (5 video requests per minute per user) ---
        const rateLimit = checkRateLimit(`video:${user.id}`, 5, 60000);
        if (!rateLimit.allowed) {
            return createRateLimitResponse(rateLimit.resetIn);
        }

        // --- Daily Limit Check ---
        const dailyLimit = await checkDailyLimit(user.id);
        if (!dailyLimit.allowed) {
            return NextResponse.json(createDailyLimitResponse(dailyLimit), { status: 429 });
        }

        // --- Token Balance Pre-Check & Reserve ---
        let tokenCharge;
        try {
            tokenCharge = await processTokenCharge(user.id, cost);
        } catch (e: any) {
            return NextResponse.json({ error: e.message }, { status: 403 });
        }

        // --- Generate Marketing Prompt Enhancement ---
        const enhancedPrompt = enhanceMarketingPrompt(prompt, type);

        // --- Submit to Fal.ai Queue (Async) ---
        const { requestId, endpoint } = await submitVideoGeneration({
            prompt: enhancedPrompt,
            imageUrl: type === "image2video" ? imageUrl : undefined,
            duration: duration === "10" ? 8 : 5, // Map string duration to Fal supported numbers
            aspectRatio: aspectRatio as any,
            enableAudio: sound
        });

        // --- Create Pending Generation Record ---
        const adminClient = createAdminClient();
        const { data: generation, error: insertError } = await adminClient.from("generations").insert({
            user_id: user.id,
            type: "video",
            prompt: prompt,
            status: "pending",
            metadata: {
                duration,
                mode,
                aspectRatio,
                sourceType: type,
                sourceImage: imageUrl || null,
                hasAudio: sound,
                videoCost,
                audioCost,
                fal_request_id: requestId,
                fal_endpoint: endpoint,
                token_reservation_id: tokenCharge.reservationId
            },
        }).select().single();

        if (insertError) {
            // Cancel token reservation if DB insert fails
            await tokenCharge.cancel();
            throw new Error("Failed to create generation record");
        }

        return NextResponse.json({
            success: true,
            generationId: generation.id,
            requestId,
            status: "pending"
        });

    } catch (error: any) {
        console.error("Video generation error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to generate video" },
            { status: 500 }
        );
    }
}

/**
 * Enhance user prompt for better marketing video results
 * Focus on preserving the exact product appearance from the input image
 */
function enhanceMarketingPrompt(prompt: string, type: string): string {
    // For image-to-video, emphasize keeping the EXACT product from the image
    if (type === "image2video") {
        const imagePreservation = [
            "keep the exact same product from the image",
            "preserve product details and appearance",
            "smooth subtle camera movement around the product",
            "professional lighting",
        ];

        // Don't over-enhance if already detailed
        if (prompt.length > 200) {
            return `${prompt}, maintain exact product appearance`;
        }

        return `${prompt}, ${imagePreservation.join(", ")}`;
    }

    // For text-to-video, use marketing enhancements
    const marketingEnhancements = [
        "professional product showcase",
        "smooth cinematic camera movement",
        "professional lighting",
        "commercial quality",
    ];

    if (prompt.length > 200) {
        return prompt;
    }

    const enhancement = marketingEnhancements.slice(0, 3).join(", ");
    return `${prompt}, ${enhancement}`;
}

/**
 * GET endpoint to check task status
 */
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const taskId = searchParams.get("taskId");
        const type = searchParams.get("type") as "image2video" | "text2video" || "image2video";

        if (!taskId) {
            return NextResponse.json({ error: "Task ID required" }, { status: 400 });
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const kling = createKlingClient();
        const result = type === "image2video"
            ? await kling.getTaskResult(taskId)
            : await kling.getTextToVideoResult(taskId);

        return NextResponse.json({
            status: result.data.task_status,
            message: result.data.task_status_msg,
            videoUrl: result.data.task_result?.videos?.[0]?.url,
        });

    } catch (error: any) {
        console.error("Task status error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to get task status" },
            { status: 500 }
        );
    }
}
