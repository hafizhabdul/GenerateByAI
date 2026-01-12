/**
 * Pakasir.com Payment Integration
 * Documentation: https://pakasir.com/p/docs
 *
 * Pakasir adalah layanan link pembayaran Indonesia
 * yang mendukung QRIS dan Virtual Account
 */

// Token packages dengan harga IDR - ANTI-BONCOS PRICING
// Starter: 1 token = Rp 330 (99.000/300)
// Creator: 1 token = Rp 299 (299.000/1000) - best seller
// Pro: 1 token = Rp 250 (999.000/4000) - best value
export const TOKEN_PACKAGES = {
  starter: {
    id: "starter",
    name: "Starter Pack",
    tokens: 300,
    price: 99000, // Rp 330/token
    description: "Cocok untuk mencoba",
    popular: false,
  },
  creator: {
    id: "creator",
    name: "Creator Pack",
    tokens: 1000,
    price: 299000, // Rp 299/token - 9% discount
    description: "Pilihan terpopuler",
    popular: true,
  },
  pro: {
    id: "pro",
    name: "Pro Pack",
    tokens: 4000,
    price: 999000, // Rp 250/token - 24% discount
    description: "Untuk profesional",
    popular: false,
  },
} as const;

export type TokenPackageId = keyof typeof TOKEN_PACKAGES;

// Webhook payload dari Pakasir
export interface PakasirWebhookPayload {
  amount: number;
  order_id: string;
  project: string;
  status: "completed" | "pending" | "expired" | "cancelled";
  payment_method: string;
  completed_at?: string;
}

// Response dari Transaction Create API
export interface PakasirTransactionResponse {
  payment: {
    project: string;
    order_id: string;
    amount: number;
    fee: number;
    total_payment: number;
    payment_method: string;
    payment_number: string; // QR string atau VA number
    expired_at: string;
  };
}

// Response dari Transaction Detail API
export interface PakasirTransactionDetail {
  transaction: {
    amount: number;
    order_id: string;
    project: string;
    status: "completed" | "pending" | "expired" | "cancelled";
    payment_method: string;
    completed_at?: string;
  };
}

// Payment method options
export type PakasirPaymentMethod =
  | "qris"
  | "cimb_niaga_va"
  | "bni_va"
  | "sampoerna_va"
  | "bnc_va"
  | "maybank_va"
  | "permata_va"
  | "atm_bersama_va"
  | "artha_graha_va"
  | "bri_va";

class PakasirClient {
  private slug: string;
  private apiKey: string;
  private baseUrl = "https://app.pakasir.com";

  constructor() {
    const slug = process.env.PAKASIR_SLUG;
    const apiKey = process.env.PAKASIR_API_KEY;

    if (!slug || !apiKey) {
      throw new Error("PAKASIR_SLUG and PAKASIR_API_KEY are required");
    }

    this.slug = slug;
    this.apiKey = apiKey;
  }

  /**
   * Generate payment URL untuk redirect user
   * Ini cara paling simple - langsung redirect ke halaman Pakasir
   */
  generatePaymentUrl(params: {
    orderId: string;
    amount: number;
    redirectUrl?: string;
    qrisOnly?: boolean;
  }): string {
    const { orderId, amount, redirectUrl, qrisOnly } = params;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    let url = `${this.baseUrl}/pay/${this.slug}/${amount}?order_id=${encodeURIComponent(orderId)}`;

    if (redirectUrl) {
      url += `&redirect=${encodeURIComponent(redirectUrl)}`;
    } else {
      url += `&redirect=${encodeURIComponent(`${appUrl}/dashboard?payment=success`)}`;
    }

    if (qrisOnly) {
      url += "&qris_only=1";
    }

    return url;
  }

  /**
   * Create transaction via API (untuk mendapatkan QR/VA number)
   * Gunakan ini jika ingin menampilkan QR di halaman sendiri
   */
  async createTransaction(params: {
    orderId: string;
    amount: number;
    paymentMethod?: PakasirPaymentMethod;
  }): Promise<PakasirTransactionResponse> {
    const method = params.paymentMethod || "qris";

    const response = await fetch(
      `${this.baseUrl}/api/transactioncreate/${method}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          project: this.slug,
          order_id: params.orderId,
          amount: params.amount,
          api_key: this.apiKey,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Pakasir API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Get transaction detail/status
   */
  async getTransactionDetail(params: {
    orderId: string;
    amount: number;
  }): Promise<PakasirTransactionDetail> {
    const url = new URL(`${this.baseUrl}/api/transactiondetail`);
    url.searchParams.set("project", this.slug);
    url.searchParams.set("order_id", params.orderId);
    url.searchParams.set("amount", params.amount.toString());
    url.searchParams.set("api_key", this.apiKey);

    const response = await fetch(url.toString());

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Pakasir API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Cancel a transaction
   */
  async cancelTransaction(params: {
    orderId: string;
    amount: number;
  }): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/transactioncancel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        project: this.slug,
        order_id: params.orderId,
        amount: params.amount,
        api_key: this.apiKey,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Pakasir API error: ${response.status} - ${error}`);
    }
  }

  /**
   * Simulate payment (only works in Sandbox mode)
   */
  async simulatePayment(params: {
    orderId: string;
    amount: number;
  }): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/paymentsimulation`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        project: this.slug,
        order_id: params.orderId,
        amount: params.amount,
        api_key: this.apiKey,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Pakasir API error: ${response.status} - ${error}`);
    }
  }

  /**
   * Validate webhook payload
   * Pakasir tidak menggunakan signature, jadi kita validasi dengan
   * mengecek transaction detail dari API
   */
  async validateWebhook(
    payload: PakasirWebhookPayload
  ): Promise<{ valid: boolean; transaction?: PakasirTransactionDetail }> {
    // Pastikan project sesuai
    if (payload.project !== this.slug) {
      return { valid: false };
    }

    // Double check dengan API untuk keamanan
    try {
      const detail = await this.getTransactionDetail({
        orderId: payload.order_id,
        amount: payload.amount,
      });

      const isValid =
        detail.transaction.status === "completed" &&
        detail.transaction.amount === payload.amount &&
        detail.transaction.order_id === payload.order_id;

      return { valid: isValid, transaction: detail };
    } catch {
      return { valid: false };
    }
  }
}

// Singleton instance
let pakasirClient: PakasirClient | null = null;

export function getPakasirClient(): PakasirClient {
  if (!pakasirClient) {
    pakasirClient = new PakasirClient();
  }
  return pakasirClient;
}

// Helper to check if Pakasir is configured
export function isPakasirConfigured(): boolean {
  return Boolean(process.env.PAKASIR_SLUG && process.env.PAKASIR_API_KEY);
}

// Helper to format price in IDR
export function formatIDR(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Generate unique order ID
export function generateOrderId(userId: string, packageId: string): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const userHash = userId.substring(0, 8);
  return `${packageId.toUpperCase()}-${userHash}-${timestamp}`;
}

// Parse order ID to extract metadata
export function parseOrderId(orderId: string): {
  packageId: string;
  userHash: string;
  timestamp: string;
} | null {
  const parts = orderId.split("-");
  if (parts.length < 3) return null;

  return {
    packageId: parts[0].toLowerCase(),
    userHash: parts[1],
    timestamp: parts.slice(2).join("-"),
  };
}
