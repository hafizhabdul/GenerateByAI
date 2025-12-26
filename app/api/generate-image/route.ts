import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";

const TOKENS_PER_IMAGE = 10;

export async function POST(req: Request) {
    try {
        const { prompt, size = "1024x1024" } = await req.json();

        if (!prompt) {
            return NextResponse.json(
                { error: "Prompt is required" },
                { status: 400 }
            );
        }

        // Get authenticated user
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        // Check if user has enough tokens (if authenticated)
        let profile = null;
        if (user) {
            const { data } = await supabase
                .from("profiles")
                .select("tokens_total, tokens_used")
                .eq("id", user.id)
                .single();

            profile = data;

            if (profile && profile.tokens_used + TOKENS_PER_IMAGE > profile.tokens_total) {
                return NextResponse.json(
                    { error: "Insufficient tokens. Please upgrade your plan." },
                    { status: 403 }
                );
            }
        }

        // Generate image
        const apiKey = process.env.SUMOPOD_API_KEY;
        const baseURL = process.env.SUMOPOD_BASE_URL || "https://ai.sumopod.com/v1";

        if (!apiKey) {
            return NextResponse.json(
                { error: "API Key is missing" },
                { status: 500 }
            );
        }

        const openai = new OpenAI({
            apiKey: apiKey,
            baseURL: baseURL,
        });

        console.log("Original prompt:", prompt);

        // Enhance prompt for realism
        const realismKeywords = "photorealistic, 8k, highly detailed, realistic lighting, sharp focus, high quality, cinematic, masterpiece, photography, depth of field";
        const enhancedPrompt = `${prompt}, ${realismKeywords}`;

        console.log("Enhanced prompt:", enhancedPrompt);

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

        // If user is authenticated, save to database and deduct tokens
        if (user) {
            const adminClient = createAdminClient();

            // Save generation record
            await adminClient.from("generations").insert({
                user_id: user.id,
                type: "image",
                prompt: prompt,
                file_url: imageUrl,
                tokens_used: TOKENS_PER_IMAGE,
                status: "completed",
            });

            // Update user tokens
            await adminClient
                .from("profiles")
                .update({ tokens_used: (profile?.tokens_used || 0) + TOKENS_PER_IMAGE })
                .eq("id", user.id);
        }

        return NextResponse.json({ url: imageUrl });
    } catch (error: unknown) {
        console.error("Image generation error:", error);
        const message = error instanceof Error ? error.message : "Failed to generate image";
        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}

