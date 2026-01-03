import { NextResponse } from "next/server";

export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = "APIError";
  }

  static badRequest(message: string, code?: string) {
    return new APIError(message, 400, code || "BAD_REQUEST");
  }

  static unauthorized(message: string = "Unauthorized") {
    return new APIError(message, 401, "UNAUTHORIZED");
  }

  static forbidden(message: string = "Forbidden") {
    return new APIError(message, 403, "FORBIDDEN");
  }

  static notFound(message: string = "Not found") {
    return new APIError(message, 404, "NOT_FOUND");
  }

  static insufficientTokens(required: number, available: number) {
    return new APIError(
      `Insufficient tokens. Required: ${required}, Available: ${available}`,
      402,
      "INSUFFICIENT_TOKENS"
    );
  }

  static rateLimit(message: string = "Too many requests") {
    return new APIError(message, 429, "RATE_LIMIT_EXCEEDED");
  }

  static internal(message: string = "Internal server error") {
    return new APIError(message, 500, "INTERNAL_ERROR");
  }
}

export function handleAPIError(error: unknown): NextResponse {
  // Log the error for debugging
  console.error("[API Error]:", error);

  if (error instanceof APIError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
      },
      { status: error.statusCode }
    );
  }

  if (error instanceof Error) {
    // Don't expose internal error messages in production
    const message =
      process.env.NODE_ENV === "production"
        ? "An unexpected error occurred"
        : error.message;

    return NextResponse.json(
      {
        error: message,
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      error: "An unexpected error occurred",
      code: "UNKNOWN_ERROR",
    },
    { status: 500 }
  );
}

// Success response helper
export function apiSuccess<T>(data: T, status: number = 200): NextResponse {
  return NextResponse.json(data, { status });
}

// Validation helper
export function validateRequired<T>(
  value: T | undefined | null,
  fieldName: string
): T {
  if (value === undefined || value === null || value === "") {
    throw APIError.badRequest(`${fieldName} is required`, "VALIDATION_ERROR");
  }
  return value;
}
