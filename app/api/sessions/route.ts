import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";


// GET: Fetch all sessions for current user
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
        const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
        const offset = Math.max(parseInt(searchParams.get("offset") || "0"), 0);
        const includeArchived = searchParams.get("archived") === "true";

        let query = supabase
            .from("sessions")
            .select(`
                *,
                generations:generations(
                    id,
                    prompt,
                    file_url,
                    status,
                    created_at
                )
            `, { count: "exact" })
            .eq("user_id", user.id)
            .order("is_pinned", { ascending: false })
            .order("updated_at", { ascending: false })
            .range(offset, offset + limit - 1);

        if (type) {
            query = query.eq("type", type);
        }

        if (!includeArchived) {
            query = query.eq("is_archived", false);
        }

        const { data, count, error } = await query;

        if (error) throw error;

        interface SessionRow {
            id: string;
            title: string | null;
            type: string;
            created_at: string;
            updated_at: string;
            is_archived: boolean;
            is_pinned: boolean;
            generations: Array<{
                id: string;
                prompt: string;
                file_url: string | null;
                thumbnail_url?: string | null;
                status: string;
                created_at: string;
            }>;
        }
        const sessions = (data || []).map((session: SessionRow) => {
            const generations = session.generations || [];
            const completedGen = generations.find((g) => g.file_url && g.status === "completed");

            return {
                id: session.id,
                title: session.title || "Untitled Session",
                type: session.type,
                created_at: session.created_at,
                updated_at: session.updated_at,
                is_archived: session.is_archived,
                is_pinned: session.is_pinned,
                preview_image: completedGen?.thumbnail_url || completedGen?.file_url || null,
                generation_count: generations.length,
                first_prompt: generations.length > 0
                    ? generations[generations.length - 1]?.prompt
                    : null,
            };
        });

        return NextResponse.json({
            sessions,
            total: count,
            limit,
            offset,
        });
    } catch (error: unknown) {
        console.error("Get sessions error:", error);
        const message = error instanceof Error ? error.message : "Failed to get sessions";
        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}

// POST: Create a new session
export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const body = await req.json();
        const { type = "image", title } = body;

        if (!["image", "video"].includes(type)) {
            return NextResponse.json(
                { error: "Invalid session type" },
                { status: 400 }
            );
        }

        const { data, error } = await supabase
            .from("sessions")
            .insert({
                user_id: user.id,
                type,
                title: title || null,
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ session: data });
    } catch (error: unknown) {
        console.error("Create session error:", error);
        const message = error instanceof Error ? error.message : "Failed to create session";
        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}

// PATCH: Update session (title, archive, pin)
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

        const { id, title, is_archived, is_pinned } = await req.json();

        if (!id) {
            return NextResponse.json(
                { error: "Session ID is required" },
                { status: 400 }
            );
        }

        const updateData: Record<string, string | boolean> = {};
        if (title !== undefined) updateData.title = title;
        if (is_archived !== undefined) updateData.is_archived = is_archived;
        if (is_pinned !== undefined) updateData.is_pinned = is_pinned;

        const { data, error } = await supabase
            .from("sessions")
            .update(updateData)
            .eq("id", id)
            .eq("user_id", user.id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ session: data });
    } catch (error: unknown) {
        console.error("Update session error:", error);
        const message = error instanceof Error ? error.message : "Failed to update session";
        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}

// DELETE: Delete a session and its generations
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
                { error: "Session ID is required" },
                { status: 400 }
            );
        }

        // Delete session (generations will have session_id set to NULL due to ON DELETE SET NULL)
        const { error } = await supabase
            .from("sessions")
            .delete()
            .eq("id", id)
            .eq("user_id", user.id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error("Delete session error:", error);
        const message = error instanceof Error ? error.message : "Failed to delete session";
        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}
