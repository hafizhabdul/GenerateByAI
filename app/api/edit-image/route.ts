
import { createAdminClient } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";
import { NextResponse } from "next/server";

// Helper to convert data URL to File/Buffer
function dataUrlToBuffer(dataUrl: string) {
    // Basic base64 parsing
    const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, "");
    return Buffer.from(base64Data, 'base64');
}

export async function POST(req: Request) {
    try {
        const { image, mask, prompt, userId } = await req.json();

        if (!image || !mask || !prompt) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // --- Auth Check ---
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // --- Init OpenAI with SUMOPOD keys (matching generate-image) ---
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

        // --- Convert Data URLs ---
        const imageBuffer = await dataUrlToBuffer(image);
        const maskBuffer = await dataUrlToBuffer(mask);

        const imageFile = await OpenAI.toFile(imageBuffer, 'image.png');
        const maskFile = await OpenAI.toFile(maskBuffer, 'mask.png');

        // --- Call API ---
        const response = await openai.images.edit({
            model: "gpt-image-1",
            image: imageFile,
            mask: maskFile,
            prompt: prompt,
            n: 1,
            size: "1024x1024",
        });

        if (!response.data || response.data.length === 0) {
            throw new Error("No image returned from OpenAI");
        }

        const imageUrl = response.data[0].url;

        // --- Save to DB ---
        // Use Admin Client for writing to 'generations' if needed, or regular client if RLS allows
        const adminClient = createAdminClient();

        await adminClient.from("generations").insert({
            user_id: user.id,
            prompt: prompt,
            file_url: imageUrl,
            type: "edit",
            status: "completed",
            tokens_used: 0, // Set appropriate token cost
        });

        return NextResponse.json({ url: imageUrl });

    } catch (error: any) {
        console.error("Edit Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to edit image" },
            { status: 500 }
        );
    }
}
