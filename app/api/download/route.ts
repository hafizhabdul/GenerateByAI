import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

        // Validate URL is from our storage (security check)
        const allowedDomains = [
            "supabase.co",
            "supabase.in",
            "storage.googleapis.com",
        ];
        
        const urlObj = new URL(fileUrl);
        const isAllowed = allowedDomains.some(domain => urlObj.hostname.includes(domain));
        
        if (!isAllowed) {
            return NextResponse.json({ error: "Invalid file URL" }, { status: 400 });
        }

        // Fetch the file from storage
        const response = await fetch(fileUrl);
        
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

    } catch (error: any) {
        console.error("Download error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to download file" },
            { status: 500 }
        );
    }
}
