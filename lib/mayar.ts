/**
 * Mayar.id Payment Integration
 * Documentation: https://docs.mayar.id
 */

export interface MayarPaymentLink {
  id: string;
  name: string;
  amount: number;
  redirectUrl: string;
  webhookUrl: string;
  expiredAt?: string;
}

export interface MayarPaymentLinkResponse {
  statusCode: number;
  data: {
    id: string;
    link: string;
    expiredAt: string;
  };
}

export interface MayarWebhookPayload {
  id: string;
  event: "payment.received" | "payment.expired" | "payment.failed";
  data: {
    id: string;
    name: string;
    email: string;
    amount: number;
    status: string;
    paidAt?: string;
    mobile?: string;
    metadata?: Record<string, string>;
  };
}

// Token packages configuration
export const TOKEN_PACKAGES = {
  starter: {
    id: "starter",
    name: "Starter Pack",
    tokens: 100,
    price: 25000, // IDR
    priceUsd: 1.5,
  },
  basic: {
    id: "basic",
    name: "Basic Pack",
    tokens: 500,
    price: 99000, // IDR
    priceUsd: 6,
  },
  pro: {
    id: "pro",
    name: "Pro Pack",
    tokens: 1500,
    price: 249000, // IDR
    priceUsd: 15,
  },
  business: {
    id: "business",
    name: "Business Pack",
    tokens: 5000,
    price: 699000, // IDR
    priceUsd: 42,
  },
} as const;

export type TokenPackageId = keyof typeof TOKEN_PACKAGES;

class MayarClient {
  private apiKey: string;
  private baseUrl = "https://api.mayar.id/hl/v1";

  constructor() {
    const apiKey = process.env.MAYAR_API_KEY;
    if (!apiKey) {
      throw new Error("MAYAR_API_KEY is not configured");
    }
    this.apiKey = apiKey;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Mayar API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Create a payment link for token purchase
   */
  async createPaymentLink(params: {
    packageId: TokenPackageId;
    userId: string;
    userEmail: string;
    userName?: string;
  }): Promise<MayarPaymentLinkResponse> {
    const tokenPackage = TOKEN_PACKAGES[params.packageId];
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    return this.request<MayarPaymentLinkResponse>("/payment_link/create", {
      method: "POST",
      body: JSON.stringify({
        name: `${tokenPackage.name} - ${tokenPackage.tokens} Tokens`,
        amount: tokenPackage.price,
        redirectUrl: `${appUrl}/dashboard?payment=success`,
        webhookUrl: `${appUrl}/api/webhooks/mayar`,
        description: `Purchase ${tokenPackage.tokens} AI generation tokens`,
        customerName: params.userName || params.userEmail,
        customerEmail: params.userEmail,
        // Custom metadata to track the purchase
        metadata: JSON.stringify({
          userId: params.userId,
          packageId: params.packageId,
          tokens: tokenPackage.tokens,
        }),
      }),
    });
  }

  /**
   * Verify webhook signature
   */
  verifyWebhook(payload: string, signature: string): boolean {
    const secret = process.env.MAYAR_WEBHOOK_SECRET;
    if (!secret) {
      console.warn("MAYAR_WEBHOOK_SECRET is not configured");
      return false;
    }

    // Mayar uses HMAC-SHA256 for webhook signatures
    const crypto = require("crypto");
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    return signature === expectedSignature;
  }
}

// Singleton instance
let mayarClient: MayarClient | null = null;

export function getMayarClient(): MayarClient {
  if (!mayarClient) {
    mayarClient = new MayarClient();
  }
  return mayarClient;
}

// Helper to check if Mayar is configured
export function isMayarConfigured(): boolean {
  return Boolean(
    process.env.MAYAR_API_KEY && process.env.MAYAR_WEBHOOK_SECRET
  );
}
