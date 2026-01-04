import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
    try {
        // Auth check
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        // Validate file type
        if (!file.type.startsWith("image/")) {
            return NextResponse.json({ error: "File must be an image" }, { status: 400 });
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            return NextResponse.json({ error: "File must be less than 10MB" }, { status: 400 });
        }

        // Convert to buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Generate filename
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        const ext = file.name.split(".").pop() || "png";
        const filename = `${user.id}/upload-${timestamp}-${random}.${ext}`;

        // Upload to Supabase
        const adminClient = createAdminClient();
        const { data, error } = await adminClient
            .storage
            .from("generations")
            .upload(filename, buffer, {
                contentType: file.type,
                upsert: false,
            });

        if (error) {
            console.error("Upload error:", error);
            return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
        }

        // Get public URL
        const { data: { publicUrl } } = adminClient
            .storage
            .from("generations")
            .getPublicUrl(filename);

        return NextResponse.json({ url: publicUrl });

    } catch (error: any) {
        console.error("Upload error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to upload file" },
            { status: 500 }
        );
    }
}
