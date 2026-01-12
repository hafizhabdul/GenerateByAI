import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rate-limit";

// Allowed image MIME types
const ALLOWED_MIME_TYPES = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/avif",
];

// Max file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Magic bytes for file type validation
const MAGIC_BYTES: Record<string, number[][]> = {
    "image/jpeg": [[0xFF, 0xD8, 0xFF]],
    "image/jpg": [[0xFF, 0xD8, 0xFF]],
    "image/png": [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
    "image/gif": [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]], // GIF87a or GIF89a
    "image/webp": [[0x52, 0x49, 0x46, 0x46]], // RIFF (WebP starts with RIFF)
};

/**
 * Validate file magic bytes to ensure file content matches MIME type
 */
function validateMagicBytes(buffer: Buffer, mimeType: string): boolean {
    const signatures = MAGIC_BYTES[mimeType];
    if (!signatures) {
        // AVIF and other formats - rely on MIME type only
        return true;
    }

    for (const signature of signatures) {
        let matches = true;
        for (let i = 0; i < signature.length; i++) {
            if (buffer[i] !== signature[i]) {
                matches = false;
                break;
            }
        }
        if (matches) return true;
    }
    return false;
}

export async function POST(req: Request) {
    try {
        // Auth check
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Rate limit: 20 uploads per minute per user
        const rateLimit = checkRateLimit(`upload:${user.id}`, 20, 60000);
        if (!rateLimit.allowed) {
            return createRateLimitResponse(rateLimit.resetIn);
        }

        const formData = await req.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        // Validate MIME type (strict allowlist)
        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
            return NextResponse.json(
                { error: `Tipe file tidak didukung. Gunakan: ${ALLOWED_MIME_TYPES.map(t => t.split('/')[1].toUpperCase()).join(', ')}` },
                { status: 400 }
            );
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { error: `File terlalu besar. Maksimal ${MAX_FILE_SIZE / 1024 / 1024}MB` },
                { status: 400 }
            );
        }

        // Validate file size minimum (prevent empty files)
        if (file.size < 100) {
            return NextResponse.json(
                { error: "File terlalu kecil atau kosong" },
                { status: 400 }
            );
        }

        // Convert to buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Validate magic bytes (prevent file spoofing)
        if (!validateMagicBytes(buffer, file.type)) {
            return NextResponse.json(
                { error: "File tidak valid. Konten tidak sesuai dengan tipe file" },
                { status: 400 }
            );
        }

        // Generate filename
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        const ext = file.name.split(".").pop() || "png";
        const filename = `${user.id}/upload-${timestamp}-${random}.${ext}`;

        // Upload to Supabase
        const adminClient = createAdminClient();
        const { error } = await adminClient
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

    } catch (error: unknown) {
        console.error("Upload error:", error);
        const message = error instanceof Error ? error.message : "Failed to upload file";
        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}
