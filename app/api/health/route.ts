import { NextResponse } from "next/server";

/**
 * Health check endpoint for monitoring and load balancers
 * GET /api/health
 */
export async function GET() {
  // Don't expose version/environment info for security
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
}

// Also support HEAD requests for simple uptime checks
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
