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

        // Get user profile with token info
        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();

        if (profileError) throw profileError;

        // Get stats
        const { count: totalImages } = await supabase
            .from("generations")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("type", "image");

        const { count: totalVideos } = await supabase
            .from("generations")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("type", "video");

        const { count: totalFavorites } = await supabase
            .from("generations")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("is_favorite", true);

        // Get daily limit info
        const dailyLimitInfo = await getDailyLimitInfo(user.id);

        // Get today's generations count (for more accurate daily stats)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { count: todayImages } = await supabase
            .from("generations")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("type", "image")
            .gte("created_at", today.toISOString());

        const { count: todayVideos } = await supabase
            .from("generations")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("type", "video")
            .gte("created_at", today.toISOString());

        return NextResponse.json({
            profile,
            stats: {
                imagesGenerated: totalImages || 0,
                videosCreated: totalVideos || 0,
                favorites: totalFavorites || 0,
                tokensUsed: profile?.tokens_used || 0,
                tokensRemaining: (profile?.tokens_total || 0) - (profile?.tokens_used || 0),
                tokensTotal: profile?.tokens_total || 0,
            },
            dailyStats: {
                imagesGenerated: todayImages || 0,
                videosGenerated: todayVideos || 0,
                imageLimit: dailyLimitInfo?.limit || 50,
                videoLimit: Math.floor((dailyLimitInfo?.limit || 50) / 5), // Video limit is 1/5 of image limit
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
