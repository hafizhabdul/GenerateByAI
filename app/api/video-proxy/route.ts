import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Video proxy endpoint to serve videos from fal.ai and other CDNs
 * Solves CORS issues when playing videos in the browser
 */
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const videoUrl = searchParams.get("url");

        if (!videoUrl) {
            return NextResponse.json({ error: "URL is required" }, { status: 400 });
        }

        // --- Auth Check ---
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Validate URL is from trusted providers
        const allowedDomains = [
            "supabase.co",
            "supabase.in",
            "storage.googleapis.com",
            "fal.media",           // fal.ai CDN
            "v3.fal.media",        // fal.ai v3 CDN
            "fal.ai",              // fal.ai direct
        ];
        
        const urlObj = new URL(videoUrl);
        const isAllowed = allowedDomains.some(domain => 
            urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`)
        );
        
        if (urlObj.protocol !== "https:") {
            return NextResponse.json({ error: "Invalid URL protocol" }, { status: 400 });
        }
        
        if (!isAllowed) {
            console.log(`[Video Proxy] Blocked domain: ${urlObj.hostname}`);
            return NextResponse.json({ error: "Invalid video URL" }, { status: 400 });
        }

        // Handle range requests for video streaming
        const range = req.headers.get("range");
        
        const fetchHeaders: HeadersInit = {};
        if (range) {
            fetchHeaders["Range"] = range;
        }

        // Fetch the video from the source
        const response = await fetch(videoUrl, { headers: fetchHeaders });
        
        if (!response.ok && response.status !== 206) {
            console.error(`[Video Proxy] Failed to fetch: ${response.status}`);
            throw new Error(`Failed to fetch video: ${response.status}`);
        }

        const contentType = response.headers.get("content-type") || "video/mp4";
        const contentLength = response.headers.get("content-length");
        const contentRange = response.headers.get("content-range");
        const acceptRanges = response.headers.get("accept-ranges");

        // Build response headers
        const responseHeaders: HeadersInit = {
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=86400", // Cache for 24 hours
            "Access-Control-Allow-Origin": "*",
        };

        if (contentLength) {
            responseHeaders["Content-Length"] = contentLength;
        }
        if (contentRange) {
            responseHeaders["Content-Range"] = contentRange;
        }
        if (acceptRanges) {
            responseHeaders["Accept-Ranges"] = acceptRanges;
        }

        // Return streamed response
        return new NextResponse(response.body, {
            status: response.status,
            headers: responseHeaders,
        });

    } catch (error) {
        console.error("[Video Proxy] Error:", error);
        return NextResponse.json(
            { error: "Failed to proxy video" },
            { status: 500 }
        );
    }
}
