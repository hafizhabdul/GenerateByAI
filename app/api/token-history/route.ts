import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/token-history
 * Fetch user's token usage history with pagination
 */
export async function GET(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
        const offset = parseInt(searchParams.get("offset") || "0");
        const type = searchParams.get("type"); // Optional filter: 'deduction', 'refund', 'purchase', etc.

        let query = supabase
            .from("token_history")
            .select("*", { count: "exact" })
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);

        if (type) {
            query = query.eq("type", type);
        }

        const { data: history, count, error } = await query;

        if (error) {
            console.error("[TokenHistory] Fetch error:", error);
            return NextResponse.json(
                { error: "Failed to fetch token history" },
                { status: 500 }
            );
        }

        // Calculate summary stats
        const { data: stats } = await supabase
            .from("token_history")
            .select("type, amount")
            .eq("user_id", user.id);

        const summary = {
            totalDeductions: 0,
            totalRefunds: 0,
            totalPurchases: 0,
            netUsage: 0,
        };

        if (stats) {
            for (const entry of stats) {
                if (entry.type === "deduction") {
                    summary.totalDeductions += Math.abs(entry.amount);
                } else if (entry.type === "refund") {
                    summary.totalRefunds += Math.abs(entry.amount);
                } else if (entry.type === "purchase" || entry.type === "bonus") {
                    summary.totalPurchases += Math.abs(entry.amount);
                }
            }
            summary.netUsage = summary.totalDeductions - summary.totalRefunds;
        }

        return NextResponse.json({
            history: history || [],
            total: count || 0,
            limit,
            offset,
            summary,
        });

    } catch (error: any) {
        console.error("[TokenHistory] Error:", error);
        return NextResponse.json(
            { error: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}
