import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeFetch, validateDownloadUrl } from "@/lib/url-validator";

// Extended allowed domains for download
const DOWNLOAD_ALLOWED_DOMAINS = [
    "supabase.co",
    "supabase.in",
    "storage.googleapis.com",
    "googleusercontent.com",
    "fal.media",
    "v3.fal.media",
    "fal.ai",
    "kwai.net",
    "kwai.com",
    "cdn.kwai.net",
    "files.kwai.com",
    "kling-ai.com",
    "klingai.com",
] as const;

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const fileUrl = searchParams.get("url");

        if (!fileUrl) {
            return NextResponse.json({ error: "URL is required" }, { status: 400 });
        }

        // --- Auth Check ---
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Validate URL with SSRF protection
        const validation = validateDownloadUrl(fileUrl);
        if (!validation.valid) {
            console.log(`[Download] URL validation failed: ${validation.error}`);
            return NextResponse.json(
                { error: "Invalid file URL" },
                { status: 400 }
            );
        }

        // Fetch with timeout and size limit (100MB max)
        const response = await safeFetch(fileUrl, {
            allowedDomains: DOWNLOAD_ALLOWED_DOMAINS,
            maxContentLength: 100 * 1024 * 1024, // 100MB
            timeout: 60000, // 60 seconds for large files
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch file: ${response.status}`);
        }

        const blob = await response.blob();
        const buffer = await blob.arrayBuffer();

        // Determine content type
        const contentType = response.headers.get("content-type") || "video/mp4";
        const isVideo = contentType.includes("video");
        const isImage = contentType.includes("image");

        // Generate filename
        const timestamp = Date.now();
        let filename = `download-${timestamp}`;
        if (isVideo) {
            filename = `product-video-${timestamp}.mp4`;
        } else if (isImage) {
            const ext = contentType.split("/")[1] || "png";
            filename = `product-image-${timestamp}.${ext}`;
        }

        // Return file with proper headers for download
        return new NextResponse(buffer, {
            status: 200,
            headers: {
                "Content-Type": contentType,
                "Content-Disposition": `attachment; filename="${filename}"`,
                "Content-Length": buffer.byteLength.toString(),
                "Cache-Control": "no-cache",
            },
        });

    } catch (error: unknown) {
        console.error("Download error:", error);
        return NextResponse.json(
            { error: "Failed to download file" },
            { status: 500 }
        );
    }
}
