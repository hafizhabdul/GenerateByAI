import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { z } from "zod";
import { persistExternalImage } from "@/lib/storage-utils";
import { getTokenCost, QualityTier } from "@/lib/tokens";
import { processTokenCharge } from "@/lib/tokens-server";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rate-limit";
import { generateImage, isFalConfigured } from "@/lib/fal";

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

        // --- Check fal.ai Configuration ---
        if (!isFalConfigured()) {
            return NextResponse.json({ error: "Image generation service not configured" }, { status: 500 });
        }

        // --- 1. Token Balance Pre-Check ---
        let commitCharge: () => Promise<void>;
        try {
            commitCharge = await processTokenCharge(user.id, cost);
        } catch (e: any) {
            return NextResponse.json({ error: e.message }, { status: 403 });
        }

        // --- 2. Enhance Prompt based on quality ---
        let enhancedPrompt = prompt;
        if (quality === "medium") {
            enhancedPrompt = `${prompt}, high resolution, professional photography, cinematic lighting, sharp focus, vibrant colors`;
        } else if (quality === "high") {
            enhancedPrompt = `${prompt}, hyper-realistic masterpiece, award-winning photography, ultra-detailed 8k, ray tracing, soft global illumination, professional color grading, shot on Nikon Z9`;
        }
        // For "low" quality, use prompt as-is for faster generation

        // --- 3. Generate Image using fal.ai GPT-Image-1.5 ---
        console.log(`[Generate Image] Using fal.ai GPT-Image-1.5 with quality: ${quality}`);

        const result = await generateImage({
            prompt: enhancedPrompt,
            size: size as "1024x1024" | "512x512" | "1024x1536" | "1536x1024",
            quality: quality as "low" | "medium" | "high",
            outputFormat: "png",
        });

        const tempImageUrl = result.imageUrl;

        if (!tempImageUrl) {
            throw new Error("Failed to generate image - no URL returned from fal.ai");
        }

        // --- 4. Persist to Storage (Prevent Expiration) ---
        const permanentUrl = await persistExternalImage(tempImageUrl, user.id);

        // --- 5. Save Record & Deduct Tokens ---
        const adminClient = createAdminClient();
        const { data: generation } = await adminClient.from("generations").insert({
            user_id: user.id,
            type: "image",
            prompt: prompt,
            file_url: permanentUrl,
            tokens_used: cost,
            status: "completed",
        }).select("id").single();

        await commitCharge();

        return NextResponse.json({
            url: permanentUrl,
            generationId: generation?.id,
        });

    } catch (error: any) {
        console.error("Image generation error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to generate image" },
            { status: 500 }
        );
    }
}
