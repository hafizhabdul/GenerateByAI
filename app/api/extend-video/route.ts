import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { z } from "zod";
import { persistExternalVideo } from "@/lib/storage-utils";
import { processTokenCharge } from "@/lib/tokens-server";
import { createKlingClient, getExtendCost } from "@/lib/kling";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rate-limit";

const ExtendVideoSchema = z.object({
    generationId: z.string().uuid("Valid generation ID required"),
    prompt: z.string().min(1, "Prompt is required").max(2000, "Prompt too long"),
    negativePrompt: z.string().max(1000).optional(),
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const validation = ExtendVideoSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: validation.error.issues[0].message },
                { status: 400 }
            );
        }

        const { generationId, prompt, negativePrompt } = validation.data;
        const cost = getExtendCost();

        // --- Auth Check ---
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Rate Limit Check (3 extensions per minute per user)
        const rateLimit = checkRateLimit(`video-extend:${user.id}`, 3, 60000);
        if (!rateLimit.allowed) {
            return createRateLimitResponse(rateLimit.resetIn);
        }

        // --- Get Original Video ---
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

        // --- Get Video ID from metadata ---
        const videoId = original.metadata?.klingVideoId;
        if (!videoId) {
            return NextResponse.json(
                { error: "This video cannot be extended (no video ID)" },
                { status: 400 }
            );
        }

        // --- Token Balance Pre-Check & Reserve ---
        let tokenCharge;
        try {
            tokenCharge = await processTokenCharge(user.id, cost);
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : "Failed to process token charge";
            return NextResponse.json({ error: message }, { status: 403 });
        }

        // --- Create Kling Client ---
        const kling = createKlingClient();

        // --- Start Video Extension ---
        const taskResponse = await kling.extendVideo({
            videoId,
            prompt,
            negativePrompt: negativePrompt || "blurry, low quality, distorted, ugly",
        });

        if (taskResponse.code !== 0) {
            throw new Error(`Kling API error: ${taskResponse.message}`);
        }

        const taskId = taskResponse.data.task_id;
        console.log(`[Video Extend] Started task: ${taskId}`);

        // --- Poll for Completion ---
        const result = await kling.waitForCompletion(taskId, "video-extend", 120, 5000);

        if (!result.data.task_result?.videos?.[0]?.url) {
            throw new Error("No video URL in result");
        }

        const tempVideoUrl = result.data.task_result.videos[0].url;
        const newVideoId = result.data.task_result.videos[0].id;
        console.log(`[Video Extend] Complete, persisting...`);

        // --- Persist Video to Storage ---
        const permanentUrl = await persistExternalVideo(tempVideoUrl, user.id);

        // --- Calculate new duration ---
        const originalDuration = parseInt(original.metadata?.duration || "5");
        const newDuration = originalDuration + 5; // Extension adds 5 seconds

        // --- Save New Extended Video Record ---
        const { data: newGeneration } = await adminClient.from("generations").insert({
            user_id: user.id,
            type: "video",
            prompt: `Extended: ${prompt}`,
            file_url: permanentUrl,
            tokens_used: cost,
            status: "completed",
            metadata: {
                duration: newDuration.toString(),
                mode: original.metadata?.mode || "std",
                aspectRatio: original.metadata?.aspectRatio || "16:9",
                sourceType: "video-extend",
                extendedFrom: generationId,
                klingVideoId: newVideoId,
            },
        }).select().single();

        await tokenCharge.commit();

        return NextResponse.json({
            url: permanentUrl,
            duration: newDuration,
            generationId: newGeneration?.id,
        });

    } catch (error: unknown) {
        console.error("Video extend error:", error);
        const message = error instanceof Error ? error.message : "Failed to extend video";
        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}
