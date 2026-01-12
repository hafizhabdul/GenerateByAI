import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rate-limit";
import { filterBlacklistedContent } from "@/lib/content-filter";
import crypto from "crypto";

/**
 * Get client IP from request headers
 * Works with Vercel, Cloudflare, and other reverse proxies
 */
function getClientIP(req: Request): string {
    // Vercel
    const xff = req.headers.get("x-forwarded-for");
    if (xff) {
        return xff.split(",")[0].trim();
    }
    // Cloudflare
    const cfIP = req.headers.get("cf-connecting-ip");
    if (cfIP) {
        return cfIP;
    }
    // Nginx
    const xri = req.headers.get("x-real-ip");
    if (xri) {
        return xri;
    }
    return "anonymous";
}

/**
 * GET /api/community
 * Fetch public generations for community showcase
 *
 * Security:
 * - Rate limited: 30 requests per minute per IP
 * - Content filtered: Blacklisted keywords hidden
 *
 * Performance:
 * - Cached: 5 minutes with ETag support
 * - Paginated: Offset-based with configurable limit
 */
export async function GET(req: Request) {
    try {
        // === RATE LIMITING ===
        // 30 requests per minute per IP address
        const clientIP = getClientIP(req);
        const rateLimit = checkRateLimit(`community:${clientIP}`, 30, 60000);
        if (!rateLimit.allowed) {
            return createRateLimitResponse(rateLimit.resetIn);
        }

        // === PARSE PARAMS ===
        const url = new URL(req.url);
        const limit = Math.min(parseInt(url.searchParams.get("limit") || "24"), 100);
        const offset = Math.max(parseInt(url.searchParams.get("offset") || "0"), 0);
        const type = url.searchParams.get("type"); // 'image' | 'video' | null (all)

        const adminClient = createAdminClient();

        // === BUILD QUERY ===
        let query = adminClient
            .from("generations")
            .select(`
                id,
                type,
                prompt,
                file_url,
                thumbnail_url,
                width,
                height,
                duration,
                created_at,
                metadata,
                profiles:user_id (
                    name,
                    avatar_url
                )
            `)
            .eq("status", "completed")
            .eq("is_public", true)
            .not("file_url", "is", null)
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);

        // Filter by type if specified
        if (type === "image" || type === "video") {
            query = query.eq("type", type);
        }

        const { data: generations, error } = await query;

        if (error) {
            console.error("[Community API] Error fetching:", error);
            return NextResponse.json(
                { error: "Failed to fetch community content" },
                { status: 500 }
            );
        }

        // === COUNT QUERY ===
        let countQuery = adminClient
            .from("generations")
            .select("id", { count: "exact", head: true })
            .eq("status", "completed")
            .eq("is_public", true)
            .not("file_url", "is", null);

        if (type === "image" || type === "video") {
            countQuery = countQuery.eq("type", type);
        }

        const { count } = await countQuery;

        // === TRANSFORM DATA ===
        const items = (generations || []).map((gen: any) => ({
            id: gen.id,
            type: gen.type,
            prompt: gen.prompt,
            file_url: gen.file_url,
            thumbnail_url: gen.thumbnail_url,
            width: gen.width,
            height: gen.height,
            duration: gen.duration,
            created_at: gen.created_at,
            metadata: gen.metadata,
            creator: {
                // Only show first name for privacy
                name: gen.profiles?.name?.split(" ")[0] || "Creator",
                avatar_url: gen.profiles?.avatar_url || null,
            },
        }));

        // === CONTENT MODERATION ===
        // Filter out items with blacklisted keywords in prompts
        const safeItems = filterBlacklistedContent(items);

        // === CACHING ===
        // Generate ETag based on response data
        const responseData = {
            items: safeItems,
            total: count || 0,
            hasMore: offset + limit < (count || 0),
            nextOffset: offset + limit,
        };

        const dataHash = crypto
            .createHash("md5")
            .update(JSON.stringify(responseData))
            .digest("hex");
        const etag = `"${dataHash}"`;

        // Check If-None-Match for conditional request
        const ifNoneMatch = req.headers.get("if-none-match");
        if (ifNoneMatch === etag) {
            return new NextResponse(null, {
                status: 304,
                headers: {
                    "ETag": etag,
                    "Cache-Control": "public, max-age=300, stale-while-revalidate=60",
                },
            });
        }

        // === RESPONSE ===
        return NextResponse.json(responseData, {
            headers: {
                // Cache for 5 minutes, allow stale for 1 minute while revalidating
                "Cache-Control": "public, max-age=300, stale-while-revalidate=60",
                "ETag": etag,
                "Vary": "Accept-Encoding",
                // Rate limit info headers
                "X-RateLimit-Limit": "30",
                "X-RateLimit-Remaining": String(rateLimit.remaining),
                "X-RateLimit-Reset": String(Math.ceil(rateLimit.resetIn / 1000)),
            },
        });

    } catch (error: any) {
        console.error("[Community API] Error:", error);
        return NextResponse.json(
            { error: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}
