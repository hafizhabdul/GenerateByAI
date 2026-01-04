import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { z } from "zod";
import { persistExternalVideo } from "@/lib/storage-utils";
import { processTokenCharge } from "@/lib/tokens-server";
import { createKlingClient, getVideoCost } from "@/lib/kling";

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

        // Calculate cost based on duration, mode, and audio
        const cost = getVideoCost(duration, mode, sound);

        // --- Auth Check ---
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // --- Token Balance Pre-Check ---
        let commitCharge: () => Promise<void>;
        try {
            commitCharge = await processTokenCharge(user.id, cost);
        } catch (e: any) {
            return NextResponse.json({ error: e.message }, { status: 403 });
        }

        // --- Create Kling Client ---
        const kling = createKlingClient();

        // --- Generate Marketing Prompt Enhancement ---
        const enhancedPrompt = enhanceMarketingPrompt(prompt, type);
        
        // Different negative prompts for image2video vs text2video
        const defaultNegative = type === "image2video"
            ? "different product, wrong product, changed product, morphing, deformation, blurry, low quality, distorted, ugly, shaky camera, amateur, poorly lit, unnatural colors"
            : "blurry, low quality, distorted, ugly, shaky camera, amateur, poorly lit";
        const enhancedNegative = negativePrompt || defaultNegative;

        // --- Start Video Generation ---
        let taskResponse;
        if (type === "image2video" && imageUrl) {
            taskResponse = await kling.imageToVideo({
                imageUrl,
                prompt: enhancedPrompt,
                negativePrompt: enhancedNegative,
                mode,
                duration,
                aspectRatio,
                sound, // Kling 2.6 native audio
            });
        } else {
            taskResponse = await kling.textToVideo({
                prompt: enhancedPrompt,
                negativePrompt: enhancedNegative,
                mode,
                duration,
                aspectRatio,
                sound, // Kling 2.6 native audio
            });
        }

        if (taskResponse.code !== 0) {
            throw new Error(`Kling API error: ${taskResponse.message}`);
        }

        const taskId = taskResponse.data.task_id;
        console.log(`[Video] Started task: ${taskId}`);

        // --- Poll for Completion ---
        const result = await kling.waitForCompletion(taskId, type, 120, 5000);

        if (!result.data.task_result?.videos?.[0]?.url) {
            throw new Error("No video URL in result");
        }

        const tempVideoUrl = result.data.task_result.videos[0].url;
        const klingVideoId = result.data.task_result.videos[0].id;
        console.log(`[Video] Generation complete, persisting...`);

        // --- Persist Video to Storage ---
        const permanentUrl = await persistExternalVideo(tempVideoUrl, user.id);

        // --- Save Record & Deduct Tokens ---
        const adminClient = createAdminClient();
        await adminClient.from("generations").insert({
            user_id: user.id,
            type: "video",
            prompt: prompt,
            file_url: permanentUrl,
            tokens_used: cost,
            status: "completed",
            metadata: {
                duration,
                mode,
                aspectRatio,
                sourceType: type,
                sourceImage: imageUrl || null,
                klingVideoId: klingVideoId,
                sound, // Kling 2.6 native audio
            },
        });

        await commitCharge();

        return NextResponse.json({
            url: permanentUrl,
            duration,
            taskId,
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
