import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDailyLimitInfo } from "@/lib/daily-limits";

// Helper to get next midnight
function getNextMidnight(): string {
    const tomorrow = new Date();
    tomorrow.setHours(24, 0, 0, 0);
    return tomorrow.toISOString();
}

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // Fetch profile and stats in parallel (2 queries instead of 9)
        const [profileResult, statsResult, dailyLimitInfo] = await Promise.all([
            // Query 1: Get user profile
            supabase
                .from("profiles")
                .select("*")
                .eq("id", user.id)
                .single(),

            // Query 2: Get all stats in one RPC call
            supabase.rpc("get_user_stats", { p_user_id: user.id }),

            // Query 3: Get daily limit info
            getDailyLimitInfo(user.id),
        ]);

        if (profileResult.error) throw profileResult.error;

        const profile = profileResult.data;
        const stats = statsResult.data || {
            total_images: 0,
            total_videos: 0,
            total_favorites: 0,
            today_images: 0,
            today_videos: 0,
        };

        return NextResponse.json({
            profile,
            stats: {
                imagesGenerated: stats.total_images || 0,
                videosCreated: stats.total_videos || 0,
                favorites: stats.total_favorites || 0,
                tokensUsed: profile?.tokens_used || 0,
                tokensRemaining: (profile?.tokens_total || 0) - (profile?.tokens_used || 0),
                tokensTotal: profile?.tokens_total || 0,
            },
            dailyStats: {
                imagesGenerated: stats.today_images || 0,
                videosGenerated: stats.today_videos || 0,
                imageLimit: dailyLimitInfo?.limit || 50,
                videoLimit: Math.floor((dailyLimitInfo?.limit || 50) / 5),
                used: dailyLimitInfo?.used || 0,
                remaining: dailyLimitInfo?.remaining || 0,
                resetsAt: dailyLimitInfo?.resetsAt?.toISOString() || getNextMidnight(),
                plan: dailyLimitInfo?.plan || "free",
            },
        });
    } catch (error: unknown) {
        console.error("Get user error:", error);
        const message = error instanceof Error ? error.message : "Failed to get user data";
        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}

export async function PATCH(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const updates = await req.json();

        // Only allow updating certain fields
        const allowedFields = ["name", "avatar_url"];
        const sanitizedUpdates: Record<string, unknown> = {};

        for (const field of allowedFields) {
            if (field in updates) {
                sanitizedUpdates[field] = updates[field];
            }
        }

        sanitizedUpdates.updated_at = new Date().toISOString();

        const { data, error } = await supabase
            .from("profiles")
            .update(sanitizedUpdates)
            .eq("id", user.id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ profile: data });
    } catch (error: unknown) {
        console.error("Update user error:", error);
        const message = error instanceof Error ? error.message : "Failed to update user";
        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}
