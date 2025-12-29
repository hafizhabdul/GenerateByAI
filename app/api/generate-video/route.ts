import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { z } from "zod";
import { getTokenCost } from "@/lib/tokens";
import { processTokenCharge } from "@/lib/tokens-server";

const VideoSchema = z.object({
    prompt: z.string().min(1, "Prompt is required"),
    imageUrl: z.string().url("A starting image URL is required for video generation"),
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const validation = VideoSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });
        }

        const { prompt, imageUrl } = validation.data;
        const cost = getTokenCost('video');

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

        // --- 2. Generation Placeholder ---
        // TODO: Integrate with actual Video AI provider (e.g. Kling, Runway, or Sumopod Video)
        // For now, we simulate a successful generation for architecture testing.

        // --- 3. Deduct Tokens ---
        const adminClient = createAdminClient();
        await adminClient.from("generations").insert({
            user_id: user.id,
            type: "video",
            prompt: prompt,
            file_url: imageUrl, // Temporary simulation
            tokens_used: cost,
            status: "completed",
        });

        await commitCharge();

        return NextResponse.json({
            success: true,
            message: "Video generation started (Placeholder)",
            cost
        });

    } catch (error: any) {
        console.error("Video Generation Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to generate video" },
            { status: 500 }
        );
    }
}
