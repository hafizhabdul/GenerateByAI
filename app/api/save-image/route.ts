import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { z } from "zod";
import { persistBase64Image } from "@/lib/storage-utils";

const SaveSchema = z.object({
    imageDataUrl: z.string().startsWith("data:image/", "Image data URL is required"),
    prompt: z.string().optional().default("Composited Edit"),
    userId: z.string().uuid(),
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const validation = SaveSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });
        }

        const { imageDataUrl, prompt, userId } = validation.data;

        // --- Auth Check ---
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user || user.id !== userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // --- 1. Persist to Storage ---
        const publicUrl = await persistBase64Image(imageDataUrl, user.id);

        // --- 2. Save Record in DB ---
        const adminClient = createAdminClient();
        const { error: dbError } = await adminClient
            .from("generations")
            .insert({
                user_id: user.id,
                type: "image",
                prompt: prompt,
                file_url: publicUrl,
                tokens_used: 0, // Composited edits are currently free
                status: "completed",
            });

        if (dbError) {
            console.error("DB Insert error:", dbError);
            return NextResponse.json({ error: "Failed to save record" }, { status: 500 });
        }

        return NextResponse.json({ success: true, url: publicUrl });

    } catch (error: unknown) {
        console.error("Save image error:", error);
        const message = error instanceof Error ? error.message : "Server error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
