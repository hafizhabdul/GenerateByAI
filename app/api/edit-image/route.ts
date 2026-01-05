import { createAdminClient } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { persistExternalImage, persistBase64Image } from "@/lib/storage-utils";
import { getTokenCost } from "@/lib/tokens";
import { processTokenCharge } from "@/lib/tokens-server";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rate-limit";

const EditSchema = z.object({
    image: z.string().startsWith("data:image/", "Image must be a data URL"),
    mask: z.string().startsWith("data:image/", "Mask must be a data URL"),
    prompt: z.string().min(1, "Prompt is required"),
    userId: z.string().uuid("Invalid User ID"),
});

function dataUrlToBuffer(dataUrl: string) {
    const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, "");
    return Buffer.from(base64Data, 'base64');
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const validation = EditSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });
        }

        const { image, mask, prompt, userId } = validation.data;
        const cost = getTokenCost('edit');

        // --- Auth Check ---
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user || user.id !== userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // --- Rate Limit Check (10 edit requests per minute per user) ---
        const rateLimit = checkRateLimit(`edit:${user.id}`, 10, 60000);
        if (!rateLimit.allowed) {
            return createRateLimitResponse(rateLimit.resetIn);
        }

        // --- 1. Token Balance Pre-Check ---
        let commitCharge: () => Promise<void>;
        try {
            commitCharge = await processTokenCharge(user.id, cost);
        } catch (e: any) {
            return NextResponse.json({ error: e.message }, { status: 403 });
        }

        // --- 2. Init OpenAI ---
        const apiKey = process.env.SUMOPOD_API_KEY;
        const baseURL = process.env.SUMOPOD_BASE_URL || "https://ai.sumopod.com/v1";

        if (!apiKey) {
            return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
        }

        const openai = new OpenAI({ apiKey, baseURL });

        // --- 3. Convert Data URLs ---
        const imageBuffer = dataUrlToBuffer(image);
        const maskBuffer = dataUrlToBuffer(mask);

        const imageFile = await OpenAI.toFile(imageBuffer, 'image.png');
        const maskFile = await OpenAI.toFile(maskBuffer, 'mask.png');

        // --- 4. Call API ---
        const response = await openai.images.edit({
            model: "gpt-image-1",
            image: imageFile,
            mask: maskFile,
            prompt: prompt,
            n: 1,
            size: "1024x1024",
        });

        if (!response.data || response.data.length === 0) {
            throw new Error("No image data returned from provider");
        }

        let tempUrl = response.data[0].url;

        // --- Fallback for Base64 Data ---
        if (!tempUrl && (response.data[0] as any).b64_json) {
            const b64 = (response.data[0] as any).b64_json;
            tempUrl = `data:image/png;base64,${b64}`;
        }

        if (!tempUrl) {
            throw new Error(`AI Provider returned an empty result. Keys: ${Object.keys(response.data[0]).join(", ")}`);
        }

        // --- 5. Persist to Storage ---
        let permanentUrl: string;
        if (tempUrl.startsWith("data:")) {
            permanentUrl = await persistBase64Image(tempUrl, user.id);
        } else {
            permanentUrl = await persistExternalImage(tempUrl, user.id);
        }

        // --- 6. Save to DB & Deduct ---
        const adminClient = createAdminClient();
        await adminClient.from("generations").insert({
            user_id: user.id,
            prompt: prompt,
            file_url: permanentUrl,
            type: "edit",
            status: "completed",
            tokens_used: cost,
        });

        await commitCharge();

        return NextResponse.json({ url: permanentUrl });

    } catch (error: any) {
        console.error("Edit Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to edit image" },
            { status: 500 }
        );
    }
}
