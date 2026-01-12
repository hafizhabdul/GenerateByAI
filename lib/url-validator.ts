/**
 * URL Validation & SSRF Protection
 *
 * Validates URLs to prevent Server-Side Request Forgery (SSRF) attacks.
 * Blocks access to internal networks, localhost, and private IP ranges.
 */

// ============================================================================
// Private IP Range Detection
// ============================================================================

/**
 * Patterns for private/internal IP addresses
 */
const PRIVATE_IP_PATTERNS = [
    // IPv4 private ranges
    /^127\./,                          // Loopback (127.0.0.0/8)
    /^10\./,                           // Class A private (10.0.0.0/8)
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,  // Class B private (172.16.0.0/12)
    /^192\.168\./,                     // Class C private (192.168.0.0/16)
    /^169\.254\./,                     // Link-local (169.254.0.0/16)
    /^0\./,                            // Current network (0.0.0.0/8)
    /^100\.(6[4-9]|[7-9][0-9]|1[0-2][0-7])\./,  // Carrier-grade NAT (100.64.0.0/10)

    // IPv6 patterns
    /^::1$/,                           // IPv6 loopback
    /^fe80:/i,                         // IPv6 link-local
    /^fc00:/i,                         // IPv6 unique local
    /^fd[0-9a-f]{2}:/i,               // IPv6 unique local

    // Special hostnames
    /^localhost$/i,
    /^.*\.localhost$/i,
    /^.*\.local$/i,
    /^.*\.internal$/i,
];

/**
 * Check if a hostname is a private/internal address
 */
export function isPrivateAddress(hostname: string): boolean {
    return PRIVATE_IP_PATTERNS.some((pattern) => pattern.test(hostname));
}

// ============================================================================
// Allowed Domains Configuration
// ============================================================================

/**
 * List of allowed external domains for file downloads
 * Add new domains here as needed
 */
export const ALLOWED_DOMAINS = [
    // Supabase storage
    "supabase.co",

    // fal.ai CDN
    "fal.media",
    "fal.ai",
    "v3.fal.media",

    // Kling AI
    "kling-ai.com",
    "klingai.com",

    // Google AI (Veo)
    "storage.googleapis.com",
    "googleusercontent.com",

    // Common CDNs (if needed)
    "cloudflare-ipfs.com",
    "cdn.discordapp.com",
] as const;

// ============================================================================
// URL Validation
// ============================================================================

export interface UrlValidationResult {
    valid: boolean;
    error?: string;
    url?: URL;
}

/**
 * Validate a URL for security
 * Checks for SSRF vulnerabilities and domain restrictions
 */
export function validateUrl(urlString: string): UrlValidationResult {
    // Basic URL parsing
    let url: URL;
    try {
        url = new URL(urlString);
    } catch {
        return { valid: false, error: "Invalid URL format" };
    }

    // Only allow HTTP/HTTPS
    if (!["http:", "https:"].includes(url.protocol)) {
        return { valid: false, error: `Invalid protocol: ${url.protocol}` };
    }

    // Block private IP addresses
    if (isPrivateAddress(url.hostname)) {
        return { valid: false, error: "Access to private addresses is not allowed" };
    }

    // Check for IP address format (additional protection)
    const ipv4Pattern = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
    if (ipv4Pattern.test(url.hostname)) {
        // Only allow specific public IP ranges if needed
        // For now, block all raw IP access
        return { valid: false, error: "Direct IP access is not allowed" };
    }

    // Check for port abuse
    const port = parseInt(url.port) || (url.protocol === "https:" ? 443 : 80);
    if (![80, 443, 8080, 8443].includes(port)) {
        return { valid: false, error: `Port ${port} is not allowed` };
    }

    return { valid: true, url };
}

/**
 * Validate URL and check against allowed domains
 */
export function validateAllowedUrl(
    urlString: string,
    allowedDomains: readonly string[] = ALLOWED_DOMAINS
): UrlValidationResult {
    // First do basic validation
    const basicResult = validateUrl(urlString);
    if (!basicResult.valid) {
        return basicResult;
    }

    const url = basicResult.url!;

    // Check domain whitelist
    const isAllowed = allowedDomains.some((domain) => {
        return (
            url.hostname === domain ||
            url.hostname.endsWith(`.${domain}`)
        );
    });

    if (!isAllowed) {
        return {
            valid: false,
            error: `Domain ${url.hostname} is not in the allowed list`,
        };
    }

    return { valid: true, url };
}

// ============================================================================
// Safe Fetch Wrapper
// ============================================================================

export interface SafeFetchOptions extends RequestInit {
    /** Maximum allowed content length in bytes (default: 100MB) */
    maxContentLength?: number;
    /** Request timeout in ms (default: 30000) */
    timeout?: number;
    /** Custom allowed domains (default: ALLOWED_DOMAINS) */
    allowedDomains?: readonly string[];
    /** Follow redirects (default: false for security) */
    followRedirects?: boolean;
}

/**
 * Fetch a URL with SSRF protection
 *
 * @example
 * const response = await safeFetch("https://fal.media/video.mp4", {
 *   maxContentLength: 100 * 1024 * 1024, // 100MB
 *   timeout: 30000,
 * });
 */
export async function safeFetch(
    urlString: string,
    options: SafeFetchOptions = {}
): Promise<Response> {
    const {
        maxContentLength = 100 * 1024 * 1024, // 100MB default
        timeout = 30000,
        allowedDomains = ALLOWED_DOMAINS,
        followRedirects = false,
        ...fetchOptions
    } = options;

    // Validate URL
    const validation = validateAllowedUrl(urlString, allowedDomains);
    if (!validation.valid) {
        throw new Error(`URL validation failed: ${validation.error}`);
    }

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        // Make request with redirect disabled
        const response = await fetch(urlString, {
            ...fetchOptions,
            signal: controller.signal,
            redirect: followRedirects ? "follow" : "error",
        });

        // Check content length if available
        const contentLength = response.headers.get("content-length");
        if (contentLength && parseInt(contentLength) > maxContentLength) {
            throw new Error(
                `Content too large: ${contentLength} bytes exceeds ${maxContentLength} byte limit`
            );
        }

        return response;
    } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
            throw new Error(`Request timed out after ${timeout}ms`);
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}

/**
 * Safely fetch and validate content length before downloading
 * Useful for large files like videos
 */
export async function safeFetchWithSizeCheck(
    urlString: string,
    options: SafeFetchOptions = {}
): Promise<Response> {
    const { maxContentLength = 100 * 1024 * 1024, ...rest } = options;

    // First make a HEAD request to check size
    const headResponse = await safeFetch(urlString, {
        ...rest,
        method: "HEAD",
    });

    const contentLength = headResponse.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > maxContentLength) {
        throw new Error(
            `File too large: ${contentLength} bytes exceeds ${maxContentLength} byte limit`
        );
    }

    // Now make the actual request
    return safeFetch(urlString, { ...options, maxContentLength });
}

// ============================================================================
// Domain Matching Utilities
// ============================================================================

/**
 * Extract the root domain from a hostname
 * e.g., "api.v3.fal.media" -> "fal.media"
 */
export function getRootDomain(hostname: string): string {
    const parts = hostname.split(".");
    if (parts.length <= 2) return hostname;
    return parts.slice(-2).join(".");
}

/**
 * Check if a hostname matches any of the allowed domains
 */
export function matchesDomain(
    hostname: string,
    allowedDomains: readonly string[]
): boolean {
    return allowedDomains.some((domain) => {
        return hostname === domain || hostname.endsWith(`.${domain}`);
    });
}

// ============================================================================
// Export utilities for download/proxy routes
// ============================================================================

/**
 * Validate URL for file download operations
 * Use this in /api/download and /api/video-proxy routes
 */
export function validateDownloadUrl(url: string): UrlValidationResult {
    return validateAllowedUrl(url, ALLOWED_DOMAINS);
}

/**
 * Get allowed domains list (for error messages)
 */
export function getAllowedDomainsList(): string {
    return ALLOWED_DOMAINS.join(", ");
}
