import { z } from "zod";

const envSchema = z.object({
  // Supabase (required)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("Invalid Supabase URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "Supabase anon key is required"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "Supabase service role key is required"),

  // AI Provider (required)
  SUMOPOD_API_KEY: z.string().min(1, "Sumopod API key is required"),
  SUMOPOD_BASE_URL: z.string().url().default("https://ai.sumopod.com/v1"),

  // Mayar Payment (optional, required for payments)
  MAYAR_API_KEY: z.string().optional(),
  MAYAR_WEBHOOK_SECRET: z.string().optional(),

  // App configuration (optional)
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  // Only validate on server-side
  if (typeof window !== "undefined") {
    return {} as Env;
  }

  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    console.error("Environment validation failed:");
    console.error(JSON.stringify(errors, null, 2));

    // In development, warn but don't crash
    if (process.env.NODE_ENV === "development") {
      console.warn("Continuing with missing environment variables in development mode");
      return process.env as unknown as Env;
    }

    throw new Error(
      `Missing or invalid environment variables:\n${Object.entries(errors)
        .map(([key, value]) => `  ${key}: ${value?.join(", ")}`)
        .join("\n")}`
    );
  }

  return parsed.data;
}

export const env = validateEnv();

// Helper to check if payment is configured
export function isPaymentConfigured(): boolean {
  return Boolean(process.env.MAYAR_API_KEY && process.env.MAYAR_WEBHOOK_SECRET);
}

// Helper to get app URL with fallback
export function getAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  );
}
