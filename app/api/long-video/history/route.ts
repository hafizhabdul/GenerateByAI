import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

/**
 * Get long video job history
 * GET /api/long-video/history?limit=10&offset=0
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get("limit") || "10");
        const offset = parseInt(searchParams.get("offset") || "0");

        // Auth Check
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Fetch jobs with validation for limit and offset
        const safeLimit = Math.min(Math.max(1, limit), 50);
        const safeOffset = Math.max(0, offset);

        const { data: jobs, error, count } = await supabase
            .from("long_video_jobs")
            .select("*", { count: "exact" })
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .range(safeOffset, safeOffset + safeLimit - 1);

        if (error) {
            console.error("[LongVideo] History fetch error:", error);
            return NextResponse.json(
                { error: "Failed to fetch history" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            jobs,
            total: count || 0,
            limit: safeLimit,
            offset: safeOffset,
        });

    } catch (error: unknown) {
        console.error("[LongVideo] History error:", error);
        const message = error instanceof Error ? error.message : "Failed to get job history";
        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}
