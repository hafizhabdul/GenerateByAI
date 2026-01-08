import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET: Fetch all generations for a specific session
export async function GET(
    req: Request,
    { params }: { params: Promise<{ sessionId: string }> }
) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { sessionId } = await params;

        // First verify session belongs to user
        const { data: session, error: sessionError } = await supabase
            .from("sessions")
            .select("id, user_id, type, title")
            .eq("id", sessionId)
            .eq("user_id", user.id)
            .single();

        if (sessionError || !session) {
            return NextResponse.json(
                { error: "Session not found" },
                { status: 404 }
            );
        }

        // Fetch generations for this session
        const { data: generations, error } = await supabase
            .from("generations")
            .select("*")
            .eq("session_id", sessionId)
            .order("created_at", { ascending: true }); // oldest first

        if (error) throw error;

        return NextResponse.json({
            session,
            generations: generations || [],
        });
    } catch (error: unknown) {
        console.error("Get session generations error:", error);
        const message = error instanceof Error ? error.message : "Failed to get session generations";
        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}
