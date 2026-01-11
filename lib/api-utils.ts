/**
 * API Utilities
 *
 * Provides timeout wrappers, retry mechanisms, and other utilities
 * for making external API calls more resilient.
 */

// ============================================================================
// Timeout Wrapper
// ============================================================================

export class TimeoutError extends Error {
    constructor(message: string, public readonly timeoutMs: number) {
        super(message);
        this.name = "TimeoutError";
    }
}

/**
 * Wrap a promise with a timeout
 * Throws TimeoutError if the promise doesn't resolve within timeoutMs
 *
 * @example
 * const result = await withTimeout(
 *   fetch("https://api.example.com"),
 *   5000,
 *   "API request timed out"
 * );
 */
export async function withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    errorMessage = "Operation timed out"
): Promise<T> {
    let timeoutId: ReturnType<typeof setTimeout>;

    const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
            reject(new TimeoutError(errorMessage, timeoutMs));
        }, timeoutMs);
    });

    try {
        const result = await Promise.race([promise, timeoutPromise]);
        clearTimeout(timeoutId!);
        return result;
    } catch (error) {
        clearTimeout(timeoutId!);
        throw error;
    }
}

/**
 * Fetch with timeout and abort support
 *
 * @example
 * const response = await fetchWithTimeout("https://api.example.com", {
 *   timeout: 5000,
 *   method: "POST",
 *   body: JSON.stringify(data),
 * });
 */
export async function fetchWithTimeout(
    url: string,
    options: RequestInit & { timeout?: number } = {}
): Promise<Response> {
    const { timeout = 30000, ...fetchOptions } = options;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            ...fetchOptions,
            signal: controller.signal,
        });
        return response;
    } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
            throw new TimeoutError(`Request to ${url} timed out after ${timeout}ms`, timeout);
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}

// ============================================================================
// Retry Mechanism with Exponential Backoff
// ============================================================================

export interface RetryOptions {
    /** Maximum number of retry attempts (default: 3) */
    maxAttempts?: number;
    /** Initial delay in ms before first retry (default: 1000) */
    baseDelayMs?: number;
    /** Maximum delay in ms between retries (default: 10000) */
    maxDelayMs?: number;
    /** Multiplier for exponential backoff (default: 2) */
    backoffMultiplier?: number;
    /** Add random jitter to delays (default: true) */
    jitter?: boolean;
    /** Function to determine if error is retryable (default: all errors) */
    isRetryable?: (error: Error) => boolean;
    /** Called before each retry attempt */
    onRetry?: (error: Error, attempt: number, delayMs: number) => void;
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
    jitter: true,
    isRetryable: () => true,
    onRetry: () => {},
};

/**
 * Retry a function with exponential backoff
 *
 * @example
 * const result = await withRetry(
 *   () => fetchExternalAPI(),
 *   {
 *     maxAttempts: 3,
 *     baseDelayMs: 1000,
 *     onRetry: (err, attempt) => console.log(`Retry ${attempt}: ${err.message}`)
 *   }
 * );
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
    let lastError: Error;

    for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error as Error;

            // Check if this is the last attempt or error is not retryable
            const isLastAttempt = attempt >= opts.maxAttempts;
            const isRetryable = opts.isRetryable(lastError);

            if (isLastAttempt || !isRetryable) {
                throw lastError;
            }

            // Calculate delay with exponential backoff
            let delay = opts.baseDelayMs * Math.pow(opts.backoffMultiplier, attempt - 1);

            // Add jitter (random 0-1000ms)
            if (opts.jitter) {
                delay += Math.random() * 1000;
            }

            // Cap at max delay
            delay = Math.min(delay, opts.maxDelayMs);

            // Call onRetry callback
            opts.onRetry(lastError, attempt, delay);

            // Wait before retrying
            await sleep(delay);
        }
    }

    throw lastError!;
}

// ============================================================================
// Network Error Detection
// ============================================================================

/**
 * Check if an error is a transient network error that should be retried
 */
export function isNetworkError(error: Error): boolean {
    const networkErrorMessages = [
        "fetch failed",
        "network error",
        "ECONNREFUSED",
        "ECONNRESET",
        "ETIMEDOUT",
        "ENOTFOUND",
        "socket hang up",
        "CERT_HAS_EXPIRED",
        "getaddrinfo",
    ];

    const message = error.message.toLowerCase();
    return networkErrorMessages.some((msg) => message.includes(msg.toLowerCase()));
}

/**
 * Check if an HTTP status code indicates a retryable error
 */
export function isRetryableStatusCode(status: number): boolean {
    // Retry on 5xx server errors and specific 4xx errors
    return (
        status >= 500 || // Server errors
        status === 408 || // Request Timeout
        status === 429 || // Too Many Requests
        status === 0 // Network failure
    );
}

/**
 * Create a retry predicate for HTTP requests
 */
export function createHttpRetryPredicate(response?: Response): (error: Error) => boolean {
    return (error: Error) => {
        // Always retry network errors
        if (isNetworkError(error)) return true;

        // Check for timeout errors
        if (error instanceof TimeoutError) return true;

        // Check HTTP status if response is available
        if (response && isRetryableStatusCode(response.status)) return true;

        return false;
    };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Sleep for a specified duration
 */
export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute multiple promises with a concurrency limit
 *
 * @example
 * const results = await withConcurrencyLimit(
 *   urls.map(url => () => fetch(url)),
 *   5 // max 5 concurrent requests
 * );
 */
export async function withConcurrencyLimit<T>(
    tasks: (() => Promise<T>)[],
    limit: number
): Promise<T[]> {
    const results: T[] = [];
    const executing: Promise<void>[] = [];

    for (const task of tasks) {
        const p = Promise.resolve().then(async () => {
            const result = await task();
            results.push(result);
        });

        executing.push(p);

        if (executing.length >= limit) {
            await Promise.race(executing);
            // Remove completed promises
            const completed = executing.findIndex(
                (p) => (p as unknown as { isResolved?: boolean }).isResolved
            );
            if (completed !== -1) {
                executing.splice(completed, 1);
            }
        }
    }

    await Promise.all(executing);
    return results;
}

// ============================================================================
// Predefined Configurations
// ============================================================================

/** Default timeout configurations for different operations */
export const TIMEOUTS = {
    /** Quick operations like auth checks */
    SHORT: 5000,
    /** Standard API calls */
    MEDIUM: 15000,
    /** Long operations like image generation */
    LONG: 30000,
    /** Very long operations like video generation */
    EXTRA_LONG: 60000,
} as const;

/** Default retry configurations for different scenarios */
export const RETRY_CONFIGS = {
    /** For critical operations that must succeed */
    CRITICAL: {
        maxAttempts: 5,
        baseDelayMs: 2000,
        maxDelayMs: 30000,
    },
    /** For standard API calls */
    STANDARD: {
        maxAttempts: 3,
        baseDelayMs: 1000,
        maxDelayMs: 10000,
    },
    /** For quick retries */
    FAST: {
        maxAttempts: 2,
        baseDelayMs: 500,
        maxDelayMs: 2000,
    },
} as const;
