import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import {
  getPakasirClient,
  isPakasirConfigured,
  TOKEN_PACKAGES,
  parseOrderId,
  type TokenPackageId,
} from "@/lib/pakasir";

/**
 * Manual payment verification endpoint
 * Use this if webhook didn't process correctly
 * POST /api/payments/verify
 * Body: { orderId: string }
 */
export async function POST(request: NextRequest) {
  try {
    // Check if Pakasir is configured
    if (!isPakasirConfigured()) {
      return NextResponse.json(
        { error: "Payment service not configured" },
        { status: 500 }
      );
    }

    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    // Parse order ID to verify it belongs to this user
    const orderInfo = parseOrderId(orderId);
    if (!orderInfo || orderInfo.userId !== user.id) {
      return NextResponse.json(
        { error: "Invalid order ID or unauthorized" },
        { status: 403 }
      );
    }

    // Check payment status with Pakasir
    const pakasir = getPakasirClient();
    const transactions = await pakasir.getTransactions({ order_id: orderId });
    
    const transaction = transactions.find((t) => t.order_id === orderId);
    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction not found in Pakasir" },
        { status: 404 }
      );
    }

    if (transaction.status !== "completed") {
      return NextResponse.json({
        success: false,
        message: "Payment not completed yet",
        status: transaction.status,
      });
    }

    // Use admin client to bypass RLS
    const adminSupabase = createAdminClient();

    // Check if payment already processed
    const { data: existingPayment, error: paymentCheckError } = await adminSupabase
      .from("payments")
      .select("*")
      .eq("order_id", orderId)
      .single();

    if (paymentCheckError && paymentCheckError.code !== "PGRST116") {
      console.error("Error checking payment:", paymentCheckError);
      return NextResponse.json(
        { error: "Error checking payment status" },
        { status: 500 }
      );
    }

    if (existingPayment?.status === "completed") {
      return NextResponse.json({
        success: true,
        message: "Payment already processed",
        alreadyProcessed: true,
      });
    }

    // Get package details
    const packageId = orderInfo.packageId as TokenPackageId;
    const tokenPackage = TOKEN_PACKAGES[packageId];

    if (!tokenPackage) {
      return NextResponse.json(
        { error: "Invalid package ID" },
        { status: 400 }
      );
    }

    // Update or create payment record
    if (existingPayment) {
      await adminSupabase
        .from("payments")
        .update({
          status: "completed",
          payment_method: transaction.payment_method,
          completed_at: transaction.completed_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingPayment.id);
    } else {
      await adminSupabase.from("payments").insert({
        user_id: user.id,
        order_id: orderId,
        package_id: packageId,
        amount: tokenPackage.price,
        tokens: tokenPackage.tokens,
        status: "completed",
        payment_method: transaction.payment_method,
        completed_at: transaction.completed_at || new Date().toISOString(),
        created_at: new Date().toISOString(),
      });
    }

    // Get user's current profile
    const { data: profile, error: profileError } = await adminSupabase
      .from("profiles")
      .select("tokens_total, plan")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }

    // Calculate new token balance
    const newTokenTotal = (profile.tokens_total || 0) + tokenPackage.tokens;
    
    // Determine plan based on package purchased
    let newPlan = profile.plan || "free";
    if (packageId === "business") {
      newPlan = "business";
    } else if (packageId === "pro" && newPlan !== "business") {
      newPlan = "pro";
    }

    // Update user's token balance and plan
    const { error: updateError } = await adminSupabase
      .from("profiles")
      .update({
        tokens_total: newTokenTotal,
        plan: newPlan,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("Failed to update profile:", updateError);
      return NextResponse.json(
        { error: "Failed to update tokens" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Payment verified and tokens added",
      tokensAdded: tokenPackage.tokens,
      newTotal: newTokenTotal,
      plan: newPlan,
    });
  } catch (error) {
    console.error("Payment verification error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
