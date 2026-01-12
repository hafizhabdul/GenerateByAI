import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { TOKEN_PACKAGES, type TokenPackageId } from "@/lib/pakasir";

/**
 * Sync payments - Fix profiles that weren't updated properly
 * POST /api/payments/sync
 */
export async function POST() {
  try {
    // Auth check - only authenticated users can sync their own payments
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use admin client to bypass RLS
    const adminSupabase = createAdminClient();

    // Get all completed payments for this user
    const { data: payments, error: paymentsError } = await adminSupabase
      .from("payments")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .order("created_at", { ascending: true });

    if (paymentsError) {
      console.error("Error fetching payments:", paymentsError);
      return NextResponse.json(
        { error: "Failed to fetch payments" },
        { status: 500 }
      );
    }

    if (!payments || payments.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No completed payments to sync",
        synced: 0,
      });
    }

    // Get current profile
    const { data: profile, error: profileError } = await adminSupabase
      .from("profiles")
      .select("tokens_total, tokens_used, plan")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    // Calculate total tokens from all completed payments
    let totalPurchasedTokens = 0;
    let highestPlan = "free";
    const planHierarchy: Record<string, number> = {
      free: 0,
      starter: 1,
      basic: 2,
      pro: 3,
      business: 4,
    };

    for (const payment of payments) {
      const packageId = payment.package_id as TokenPackageId;
      const tokenPackage = TOKEN_PACKAGES[packageId];
      
      if (tokenPackage) {
        totalPurchasedTokens += tokenPackage.tokens;
        
        // Track highest plan purchased
        const paymentPlanLevel = planHierarchy[packageId] || 0;
        const currentHighestLevel = planHierarchy[highestPlan] || 0;
        if (paymentPlanLevel > currentHighestLevel) {
          highestPlan = packageId;
        }
      }
    }

    // Base free tokens (100 for new users)
    const baseFreeTokens = 100;
    const expectedTotalTokens = baseFreeTokens + totalPurchasedTokens;

    // Check if profile needs update
    const needsTokenUpdate = profile.tokens_total !== expectedTotalTokens;
    const needsPlanUpdate = planHierarchy[highestPlan] > planHierarchy[profile.plan || "free"];

    if (!needsTokenUpdate && !needsPlanUpdate) {
      return NextResponse.json({
        success: true,
        message: "Profile is already in sync",
        synced: 0,
        currentTokens: profile.tokens_total,
        currentPlan: profile.plan,
      });
    }

    // Update profile
    const updateData: Record<string, string | number> = {
      updated_at: new Date().toISOString(),
    };

    if (needsTokenUpdate) {
      updateData.tokens_total = expectedTotalTokens;
    }

    if (needsPlanUpdate) {
      updateData.plan = highestPlan;
    }

    const { error: updateError } = await adminSupabase
      .from("profiles")
      .update(updateData)
      .eq("id", user.id);

    if (updateError) {
      console.error("Error updating profile:", updateError);
      return NextResponse.json(
        { error: "Failed to update profile" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Profile synced successfully",
      synced: payments.length,
      updates: {
        tokens: needsTokenUpdate
          ? { from: profile.tokens_total, to: expectedTotalTokens }
          : null,
        plan: needsPlanUpdate
          ? { from: profile.plan, to: highestPlan }
          : null,
      },
    });
  } catch (error) {
    console.error("Sync error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
