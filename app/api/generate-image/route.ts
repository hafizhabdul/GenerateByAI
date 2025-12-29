import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { z } from "zod";
import { persistExternalImage, persistBase64Image } from "@/lib/storage-utils";
import { getTokenCost, QualityTier } from "@/lib/tokens";
import { processTokenCharge } from "@/lib/tokens-server";



const GenerateSchema = z.object({
    prompt: z.string().min(1, "Prompt is required"),
    size: z.enum(["1024x1024", "512x512"]).optional().default("1024x1024"),
    quality: z.enum(["standard", "high", "ultra"]).optional().default("high"),
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

        // --- 1. Token Balance Pre-Check ---
        let commitCharge: () => Promise<void>;
        try {
            commitCharge = await processTokenCharge(user.id, cost);
        } catch (e: any) {
            return NextResponse.json({ error: e.message }, { status: 403 });
        }

        // --- 2. Init OpenAI (Sumopod) ---
        const apiKey = process.env.SUMOPOD_API_KEY;
        const baseURL = process.env.SUMOPOD_BASE_URL || "https://ai.sumopod.com/v1";

        if (!apiKey) {
            return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
        }

        const openai = new OpenAI({ apiKey, baseURL });

        // --- 3. Enhance Prompt ---
        let enhancedPrompt = prompt;
        if (quality === "high") {
            enhancedPrompt = `${prompt}, high resolution, professional photography, cinematic lighting, 8k, sharp focus, vibrant colors, detailed textures`;
        } else if (quality === "ultra") {
            enhancedPrompt = `${prompt}, hyper-realistic masterpiece, award-winning photography, ultra-detailed 8k, ray tracing, soft global illumination, professional color grading, shot on Nikon Z9`;
        }

        // --- 4. Generate Image ---
        const response = await openai.images.generate({
            model: "gpt-image-1",
            prompt: enhancedPrompt,
            n: 1,
            size: size as any,
        });

        console.log("AI Provider Response (Condensed):", {
            data_count: response.data?.length,
            first_item_keys: response.data?.[0] ? Object.keys(response.data[0]) : [],
        });

        if (!response.data || response.data.length === 0) {
            throw new Error(`Failed to generate image - no data returned from provider.`);
        }

        let tempImageUrl = response.data[0]?.url;

        // --- Fallback for Base64 Data ---
        if (!tempImageUrl && (response.data[0] as any).b64_json) {
            console.log("Detected Base64 response, converting...");
            const b64 = (response.data[0] as any).b64_json;
            // In a better implementation, we'd upload this directly. 
            // For now, let's prefix it so the persist logic knows what to do or just pass it through.
            tempImageUrl = `data:image/png;base64,${b64}`;
        }

        if (!tempImageUrl) {
            throw new Error(`Failed to generate image - no URL or Base64 data returned. Item keys: ${Object.keys(response.data[0]).join(", ")}`);
        }

        // --- 5. Persist to Storage (Prevent Expiration) ---
        let permanentUrl: string;
        if (tempImageUrl.startsWith("data:")) {
            permanentUrl = await persistBase64Image(tempImageUrl, user.id);
        } else {
            permanentUrl = await persistExternalImage(tempImageUrl, user.id);
        }

        // --- 6. Save Record & Deduct Tokens ---
        const adminClient = createAdminClient();
        await adminClient.from("generations").insert({
            user_id: user.id,
            type: "image",
            prompt: prompt,
            file_url: permanentUrl,
            tokens_used: cost,
            status: "completed",
        });

        await commitCharge();

        return NextResponse.json({ url: permanentUrl });

    } catch (error: any) {
        console.error("Image generation error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to generate image" },
            { status: 500 }
        );
    }
}
