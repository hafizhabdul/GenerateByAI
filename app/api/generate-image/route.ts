import { NextResponse } from "next/server";
// Force rebuild
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";

const TOKENS_PER_IMAGE = 10;

export async function POST(req: Request) {
    try {
        const { prompt, size = "1024x1024", quality = "high" } = await req.json();

        if (!prompt) {
            return NextResponse.json(
                { error: "Prompt is required" },
                { status: 400 }
            );
        }

        // --- Auth Check ---
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // --- Init OpenAI (Sumopod) ---
        const apiKey = process.env.SUMOPOD_API_KEY;
        const baseURL = process.env.SUMOPOD_BASE_URL || "https://ai.sumopod.com/v1";

        if (!apiKey) {
            console.error("API Key missing");
            return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
        }

        const openai = new OpenAI({
            apiKey: apiKey,
            baseURL: baseURL,
        });

        // --- Enhance Prompt ---
        // Enhance prompt based on Quality Setting
        let enhancedPrompt = prompt;

        if (quality === "high") {
            const realismKeywords = "photorealistic, 8k, highly detailed, realistic lighting, sharp focus, high quality, cinematic, masterpiece, photography, depth of field";
            enhancedPrompt = `${prompt}, ${realismKeywords}`;
        } else if (quality === "ultra") {
            const ultraKeywords = "award winning photography, 8k uhd, soft lighting, high quality, film grain, Fujifilm XT3, incredibly detailed, aesthetic, masterpiece, professional, trending on artstation";
            enhancedPrompt = `${prompt}, ${ultraKeywords}`;
        }
        // "standard" uses raw prompt

        console.log(`Generating [${quality}]:`, enhancedPrompt);

        // --- Generate Image ---
        const response = await openai.images.generate({
            model: "gpt-image-1",
            prompt: enhancedPrompt,
            n: 1,
            size: size,
        });

        console.log("API Response:", JSON.stringify(response, null, 2));

        // Handle different response formats
        let imageUrl: string | null = null;

        if (response.data && response.data.length > 0) {
            const imageData = response.data[0];
            // Check for url or b64_json
            if (imageData.url) {
                imageUrl = imageData.url;
            } else if (imageData.b64_json) {
                // If response is base64, convert to data URL
                imageUrl = `data:image/png;base64,${imageData.b64_json}`;
            }
        }

        if (!imageUrl) {
            console.error("No image URL in response:", response);
            return NextResponse.json(
                { error: "Failed to generate image - no URL returned" },
                { status: 500 }
            );
        }

        // --- Save & Deduct Tokens ---
        const adminClient = createAdminClient();

        // 1. Save generation record
        await adminClient.from("generations").insert({
            user_id: user.id,
            type: "image",
            prompt: prompt,
            file_url: imageUrl,
            tokens_used: TOKENS_PER_IMAGE,
            status: "completed",
        });

        // 2. Update user tokens (deduct/increment usage)
        // Fetch current profile to get current usage
        const { data: profile } = await adminClient.from("profiles").select("tokens_used").eq("id", user.id).single();

        await adminClient
            .from("profiles")
            .update({ tokens_used: (profile?.tokens_used || 0) + TOKENS_PER_IMAGE })
            .eq("id", user.id);

        return NextResponse.json({ url: imageUrl });

    } catch (error: any) {
        console.error("Image generation error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to generate image" },
            { status: 500 }
        );
    }
}
