import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * GET /api/community
 * Fetch public generations for community showcase
 * - Only completed generations with is_public = true
 * - Includes creator info (anonymized)
 * - Paginated with cursor-based pagination
 */
export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const limit = Math.min(parseInt(url.searchParams.get("limit") || "24"), 100);
        const offset = parseInt(url.searchParams.get("offset") || "0");
        const type = url.searchParams.get("type"); // 'image' | 'video' | null (all)

        const adminClient = createAdminClient();

        // Build query for public generations
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

        // Get total count for pagination
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

        // Transform data - anonymize creators
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
                // Only show first name or "Anonymous"
                name: gen.profiles?.name?.split(" ")[0] || "Creator",
                avatar_url: gen.profiles?.avatar_url || null,
            },
        }));

        return NextResponse.json({
            items,
            total: count || 0,
            hasMore: offset + limit < (count || 0),
            nextOffset: offset + limit,
        });

    } catch (error: any) {
        console.error("[Community API] Error:", error);
        return NextResponse.json(
            { error: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}
