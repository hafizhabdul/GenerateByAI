import { z } from "zod";

const envSchema = z.object({
  // Supabase (required)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("Invalid Supabase URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "Supabase anon key is required"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "Supabase service role key is required"),

  // AI Provider (required)
  SUMOPOD_API_KEY: z.string().min(1, "Sumopod API key is required"),
  SUMOPOD_BASE_URL: z.string().url().default("https://ai.sumopod.com/v1"),

  // Kling AI (optional, required for video generation)
  KLING_AI_ACCESS_KEY: z.string().optional(),
  KLING_AI_SECRET_KEY: z.string().optional(),

  // Pakasir Payment (optional, required for payments)
  PAKASIR_SLUG: z.string().optional(),
  PAKASIR_API_KEY: z.string().optional(),

  // Legacy Mayar Payment (deprecated, use Pakasir instead)
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

// Helper to check if Pakasir payment is configured
export function isPaymentConfigured(): boolean {
  return Boolean(process.env.PAKASIR_SLUG && process.env.PAKASIR_API_KEY);
}

// Helper to check if Kling AI (video generation) is configured
export function isKlingConfigured(): boolean {
  return Boolean(process.env.KLING_AI_ACCESS_KEY && process.env.KLING_AI_SECRET_KEY);
}

// Legacy: Helper to check if Mayar is configured (deprecated)
export function isMayarConfigured(): boolean {
  return Boolean(process.env.MAYAR_API_KEY && process.env.MAYAR_WEBHOOK_SECRET);
}

// Helper to get app URL with fallback
export function getAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  );
}
