import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
    try {
        const { imageDataUrl, prompt, userId } = await req.json();

        if (!imageDataUrl || !userId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user || user.id !== userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const adminClient = createAdminClient();

        // 1. Convert Data URL to Buffer to upload to Storage
        const base64Data = imageDataUrl.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');
        const filename = `${user.id}/${Date.now()}-edited.png`;

        // 2. Upload to Storage
        const buckets = await adminClient.storage.listBuckets();
        const bucketExists = buckets.data?.find(b => b.name === 'generations');
        // Note: adminClient doesn't need to check bucket usually if setup, but good to know 'generations' bucket exists.

        const { data: uploadData, error: uploadError } = await adminClient
            .storage
            .from('generations')
            .upload(filename, buffer, {
                contentType: 'image/png',
                upsert: false
            });

        if (uploadError) {
            console.error("Storage upload error:", uploadError);
            return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
        }

        // 3. Get Public URL
        const { data: { publicUrl } } = adminClient
            .storage
            .from('generations')
            .getPublicUrl(filename);

        // 4. Save Record in DB
        const { error: dbError } = await adminClient
            .from("generations")
            .insert({
                user_id: user.id,
                type: "image",
                prompt: prompt, // Use the prompt or "Edit"
                file_url: publicUrl,
                tokens_used: 0, // Edits might be free or cost less? Let's make saving composited result free.
                status: "completed",
            });

        if (dbError) {
            console.error("DB Insert error:", dbError);
            // We shouldn't fail if DB insert fails but image is uploaded, but cleaner to report error.
            return NextResponse.json({ error: "Failed to save record" }, { status: 500 });
        }

        return NextResponse.json({ success: true, url: publicUrl });

    } catch (error: any) {
        console.error("Save image error:", error);
        return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
    }
}
