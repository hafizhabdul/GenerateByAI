import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(req.url);
        const type = searchParams.get("type"); // 'image' | 'video' | null (all)
        const limit = parseInt(searchParams.get("limit") || "50");
        const offset = parseInt(searchParams.get("offset") || "0");
        const favorites = searchParams.get("favorites") === "true";

        let query = supabase
            .from("generations")
            .select("*", { count: "exact" })
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);

        if (type) {
            query = query.eq("type", type);
        }

        if (favorites) {
            query = query.eq("is_favorite", true);
        }

        const { data, count, error } = await query;

        if (error) throw error;

        return NextResponse.json({
            generations: data,
            total: count,
            limit,
            offset,
        });
    } catch (error: unknown) {
        console.error("Get generations error:", error);
        const message = error instanceof Error ? error.message : "Failed to get generations";
        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}

export async function DELETE(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { id } = await req.json();

        if (!id) {
            return NextResponse.json(
                { error: "Generation ID is required" },
                { status: 400 }
            );
        }

        const { error } = await supabase
            .from("generations")
            .delete()
            .eq("id", id)
            .eq("user_id", user.id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error("Delete generation error:", error);
        const message = error instanceof Error ? error.message : "Failed to delete generation";
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

        const { id, is_favorite } = await req.json();

        if (!id) {
            return NextResponse.json(
                { error: "Generation ID is required" },
                { status: 400 }
            );
        }

        const { data, error } = await supabase
            .from("generations")
            .update({ is_favorite })
            .eq("id", id)
            .eq("user_id", user.id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ generation: data });
    } catch (error: unknown) {
        console.error("Update generation error:", error);
        const message = error instanceof Error ? error.message : "Failed to update generation";
        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}
