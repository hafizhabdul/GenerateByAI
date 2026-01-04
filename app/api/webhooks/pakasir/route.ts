import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import {
  getPakasirClient,
  isPakasirConfigured,
  TOKEN_PACKAGES,
  parseOrderId,
  type PakasirWebhookPayload,
  type TokenPackageId,
} from "@/lib/pakasir";

/**
 * Webhook handler for Pakasir payment notifications
 * Configure this URL in your Pakasir project settings:
 * https://your-domain.com/api/webhooks/pakasir
 */
export async function POST(request: NextRequest) {
  try {
    // Check if Pakasir is configured
    if (!isPakasirConfigured()) {
      console.error("Pakasir is not configured");
      return NextResponse.json(
        { error: "Payment service not configured" },
        { status: 500 }
      );
    }

    // Parse webhook payload
    const payload: PakasirWebhookPayload = await request.json();
    console.log("Pakasir webhook received:", payload);

    // Only process completed payments
    if (payload.status !== "completed") {
      console.log(`Payment not completed, status: ${payload.status}`);
      return NextResponse.json({ received: true, processed: false });
    }

    // Validate webhook by checking with Pakasir API
    const pakasir = getPakasirClient();
    const { valid, transaction } = await pakasir.validateWebhook(payload);

    if (!valid) {
      console.error("Webhook validation failed:", payload);
      return NextResponse.json({ error: "Invalid webhook" }, { status: 400 });
    }

    // Parse order ID to get user and package info
    const orderInfo = parseOrderId(payload.order_id);
    if (!orderInfo) {
      console.error("Invalid order ID format:", payload.order_id);
      return NextResponse.json(
        { error: "Invalid order ID format" },
        { status: 400 }
      );
    }

    // Get package details
    const packageId = orderInfo.packageId as TokenPackageId;
    const tokenPackage = TOKEN_PACKAGES[packageId];

    if (!tokenPackage) {
      console.error("Invalid package ID:", packageId);
      return NextResponse.json(
        { error: "Invalid package ID" },
        { status: 400 }
      );
    }

    // Verify amount matches package price
    if (payload.amount !== tokenPackage.price) {
      console.error(
        `Amount mismatch: expected ${tokenPackage.price}, got ${payload.amount}`
      );
      return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
    }

    // Use Admin client to bypass RLS (webhook has no user session)
    const supabase = createAdminClient();

    // Find the pending payment record
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select("*")
      .eq("order_id", payload.order_id)
      .eq("status", "pending")
      .single();

    if (paymentError || !payment) {
      console.error("Payment record not found:", payload.order_id, paymentError);
      return NextResponse.json(
        { error: "Payment record not found" },
        { status: 404 }
      );
    }

    // Update payment status to completed
    const { error: updatePaymentError } = await supabase
      .from("payments")
      .update({
        status: "completed",
        payment_method: payload.payment_method,
        completed_at: transaction?.transaction.completed_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", payment.id);

    if (updatePaymentError) {
      console.error("Failed to update payment:", updatePaymentError);
      return NextResponse.json(
        { error: "Failed to update payment" },
        { status: 500 }
      );
    }

    // Get user's current profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("tokens_total, plan")
      .eq("id", payment.user_id)
      .single();

    if (profileError || !profile) {
      console.error("User profile not found:", payment.user_id, profileError);
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }

    // Calculate new token balance
    const newTokenTotal = (profile.tokens_total || 0) + tokenPackage.tokens;
    
    // Determine plan based on package purchased
    let newPlan = profile.plan || 'free';
    if (packageId === 'business') {
      newPlan = 'business';
    } else if (packageId === 'pro' && newPlan !== 'business') {
      newPlan = 'pro';
    }

    // Update user's token balance and plan
    const { error: updateProfileError } = await supabase
      .from("profiles")
      .update({
        tokens_total: newTokenTotal,
        plan: newPlan,
        updated_at: new Date().toISOString(),
      })
      .eq("id", payment.user_id);

    if (updateProfileError) {
      console.error("Failed to update user profile:", updateProfileError);
      return NextResponse.json(
        { error: "Failed to update user profile" },
        { status: 500 }
      );
    }

    console.log(
      `Payment completed: ${payload.order_id}, added ${tokenPackage.tokens} tokens to user ${payment.user_id}, plan: ${newPlan}`
    );

    return NextResponse.json({
      success: true,
      message: "Payment processed successfully",
      tokensAdded: tokenPackage.tokens,
      newPlan,
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Pakasir only sends POST requests
export async function GET() {
  return NextResponse.json({ message: "Pakasir webhook endpoint" });
}
