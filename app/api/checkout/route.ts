import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getPakasirClient,
  isPakasirConfigured,
  TOKEN_PACKAGES,
  generateOrderId,
  formatIDR,
  type TokenPackageId,
} from "@/lib/pakasir";
import { checkRateLimit, createRateLimitResponse } from "@/lib/rate-limit";

/**
 * Create a checkout session for token purchase
 * POST /api/checkout
 * Body: { packageId: "starter" | "basic" | "pro" | "business" }
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

    // --- Rate Limit Check (5 checkout attempts per minute per user) ---
    const rateLimit = checkRateLimit(`checkout:${user.id}`, 5, 60000);
    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit.resetIn);
    }

    // Parse request body
    const body = await request.json();
    const packageId = body.packageId as TokenPackageId;

    // Validate package ID
    if (!packageId || !TOKEN_PACKAGES[packageId]) {
      return NextResponse.json(
        {
          error: "Invalid package ID",
          validPackages: Object.keys(TOKEN_PACKAGES),
        },
        { status: 400 }
      );
    }

    const tokenPackage = TOKEN_PACKAGES[packageId];

    // Generate unique order ID
    const orderId = generateOrderId(user.id, packageId);

    // Create payment record in database (pending status)
    const { error: insertError } = await supabase.from("payments").insert({
      user_id: user.id,
      order_id: orderId,
      package_id: packageId,
      amount: tokenPackage.price,
      tokens: tokenPackage.tokens,
      status: "pending",
      created_at: new Date().toISOString(),
    });

    if (insertError) {
      console.error("Failed to create payment record:", insertError);
      return NextResponse.json(
        { error: "Failed to create payment" },
        { status: 500 }
      );
    }

    // Generate Pakasir payment URL
    const pakasir = getPakasirClient();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const paymentUrl = pakasir.generatePaymentUrl({
      orderId,
      amount: tokenPackage.price,
      redirectUrl: `${appUrl}/dashboard?payment=success&order=${orderId}`,
    });

    return NextResponse.json({
      success: true,
      paymentUrl,
      orderId,
      package: {
        id: packageId,
        name: tokenPackage.name,
        tokens: tokenPackage.tokens,
        price: tokenPackage.price,
        priceFormatted: formatIDR(tokenPackage.price),
      },
    });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Get available packages
 * GET /api/checkout
 */
export async function GET() {
  const packages = Object.entries(TOKEN_PACKAGES).map(([id, pkg]) => {
    const tokenPackage = pkg as typeof TOKEN_PACKAGES[keyof typeof TOKEN_PACKAGES];
    return {
      id,
      name: tokenPackage.name,
      tokens: tokenPackage.tokens,
      price: tokenPackage.price,
      priceFormatted: formatIDR(tokenPackage.price),
      description: tokenPackage.description,
      popular: tokenPackage.popular,
    };
  });

  return NextResponse.json({
    packages,
    paymentConfigured: isPakasirConfigured(),
  });
}
