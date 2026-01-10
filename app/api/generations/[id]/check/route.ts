
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkImageGenerationStatus } from "@/lib/fal";
import { commitTokenCharge, cancelTokenReservation } from "@/lib/tokens-server";
import { persistExternalImage } from "@/lib/storage-utils";
import { incrementDailyGeneration } from "@/lib/daily-limits";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 1. Fetch Generation Record
        const { data: generation, error: fetchError } = await supabase
            .from("generations")
            .select("*")
            .eq("id", id)
            .eq("user_id", user.id)
            .single();

        if (fetchError || !generation) {
            return NextResponse.json({ error: "Generation not found" }, { status: 404 });
        }

        // If not pending, return current status immediately
        if (generation.status !== "pending") {
            return NextResponse.json({
                status: generation.status,
                file_url: generation.file_url,
                generation
            });
        }

        const metadata = generation.metadata as any;
        const requestId = metadata?.fal_request_id;
        const reservationId = metadata?.token_reservation_id;

        if (!requestId) {
            // Legacy pending item or error? Mark as failed
            return NextResponse.json({ status: "failed", error: "Missing request ID" });
        }

        // 2. Check Fal Status
        const statusResult = await checkImageGenerationStatus(requestId);

        if (statusResult.status === "COMPLETED" && statusResult.imageUrl) {
            // --- Success Workflow ---

            // A. Persist Image
            let permanentUrl = "";
            try {
                permanentUrl = await persistExternalImage(statusResult.imageUrl, user.id);
            } catch (e) {
                console.error("Failed to persist image:", e);
                // Fallback to original URL if persist fails (unlikely but safe)
                permanentUrl = statusResult.imageUrl;
            }

            // B. Commit Tokens
            if (reservationId) {
                await commitTokenCharge(reservationId);
            }

            // C. Increment Daily Limit
            await incrementDailyGeneration(user.id);

            // D. Update DB
            const { error: updateError } = await supabase
                .from("generations")
                .update({
                    status: "completed",
                    file_url: permanentUrl,
                    metadata: {
                        ...metadata,
                        completed_at: new Date().toISOString()
                    }
                })
                .eq("id", id);

            if (updateError) console.error("Failed to update generation:", updateError);

            return NextResponse.json({
                status: "completed",
                file_url: permanentUrl
            });

        } else if (statusResult.status === "FAILED") {
            // --- Failure Workflow ---

            // A. Cancel Tokens
            if (reservationId) {
                await cancelTokenReservation(reservationId);
            }

            // B. Update DB
            await supabase
                .from("generations")
                .update({
                    status: "failed",
                    metadata: {
                        ...metadata,
                        error: statusResult.error || "Generation failed",
                        failed_at: new Date().toISOString()
                    }
                })
                .eq("id", id);

            return NextResponse.json({
                status: "failed",
                error: statusResult.error
            });
        }

        // Still pending
        return NextResponse.json({ status: "pending" });

    } catch (error: any) {
        console.error("Check status error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to check status" },
            { status: 500 }
        );
    }
}
