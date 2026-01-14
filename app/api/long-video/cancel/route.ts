import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { z } from "zod";
import { cancelTokenReservation } from "@/lib/tokens-server";

/**
 * Cancel a long video generation job
 * POST /api/long-video/cancel
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { jobId } = body;

        if (!jobId) {
            return NextResponse.json(
                { error: "Job ID is required" },
                { status: 400 }
            );
        }

        // Auth Check
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get job details
        const adminClient = createAdminClient();
        const { data: job, error: fetchError } = await adminClient
            .from("long_video_jobs")
            .select("id, status, token_reservation_id, tokens_reserved, tokens_used")
            .eq("id", jobId)
            .eq("user_id", user.id)
            .single();

        if (fetchError || !job) {
            return NextResponse.json(
                { error: "Job not found" },
                { status: 404 }
            );
        }

        // Only allow cancelling pending or processing jobs
        if (job.status === "completed" || job.status === "failed") {
            return NextResponse.json(
                { error: "Cannot cancel a completed or failed job" },
                { status: 400 }
            );
        }

        // Cancel token reservation if exists
        const reservationId = job.token_reservation_id;
        if (reservationId) {
            try {
                await cancelTokenReservation(reservationId);
                console.log(`[LongVideo] Canceled token reservation ${reservationId} for job ${jobId}`);
            } catch (tokenError) {
                console.error(`[LongVideo] Failed to cancel token reservation:`, tokenError);
                // Continue with job cancellation anyway
            }
        }

        // Mark job as failed/canceled
        // Note: We use 'failed' status with a specific error message since we don't have a 'canceled' status in the enum yet
        // Ideally we should add 'canceled' to the enum, but for now 'failed' works to stop processing
        const { error: updateError } = await adminClient
            .from("long_video_jobs")
            .update({
                status: "failed",
                error: "Canceled by user",
                tokens_reserved: 0,
                // We keep tokens_used as is, assuming consumed tokens before cancel are lost
                // OR we can choose to refund everything. Let's assume standard policy: no refund for already generated segments?
                // The reservation system typically holds the full amount. 
                // If we cancel the reservation, we release the hold. 
                // Any actually used tokens should have been committed separately? 
                // Current implementation reserves ALL tokens upfront.
                // If we cancel reservation, we release everything.
                // If some segments were already done, we might want to charge for them?
                // For simplicity in MVP: Cancel = full refund of reserved amount (since reservation is all-or-nothing usually)
                // But we should verify if we want that. 
                // existing logic in `syncSegmentStatuses` refunds EVERYTHING on failure.
                // So here we also refund everything by cancelling reservation.
            })
            .eq("id", jobId);

        if (updateError) {
            throw new Error("Failed to update job status");
        }

        return NextResponse.json({
            success: true,
            message: "Job canceled successfully",
        });

    } catch (error: unknown) {
        console.error("[LongVideo] Cancel error:", error);
        const message = error instanceof Error ? error.message : "Failed to cancel job";
        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}
