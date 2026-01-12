/**
 * Prompt Sanitizer Module
 * Validates and sanitizes prompts before sending to AI generation APIs
 * Blocks NSFW, violent, and other prohibited content
 */

// Prohibited content categories with keywords
const PROHIBITED_CATEGORIES = {
    // Sexual/Adult content
    nsfw: [
        "nude", "naked", "nsfw", "xxx", "porn", "hentai", "erotic",
        "sexual", "sex", "topless", "bottomless", "lingerie", "underwear",
        "bikini", "bra", "panties", "fetish", "bondage", "bdsm",
        "orgasm", "masturbat", "genital", "penis", "vagina", "breast",
        "nipple", "boob", "butt", "ass", "dick", "cock", "pussy",
        // Indonesian
        "telanjang", "bugil", "bokep", "mesum", "cabul", "vulgar",
        "toket", "memek", "kontol", "ngentot", "colmek", "coli",
    ],

    // Violence/Gore
    violence: [
        "gore", "blood", "bloody", "murder", "kill", "death",
        "corpse", "dead body", "decapitat", "dismember", "torture",
        "mutilat", "wound", "injury", "gun", "weapon", "knife",
        "stab", "shoot", "execute", "suicide", "self-harm",
        // Indonesian
        "bunuh", "mayat", "darah", "luka", "senjata", "pisau",
    ],

    // Hate/Discrimination
    hate: [
        "nazi", "hitler", "kkk", "racist", "racism", "hate",
        "slur", "n-word", "nigger", "faggot", "retard",
        "terrorist", "terrorism", "isis", "jihad",
        // Indonesian
        "kafir", "yahudi" // when used in hateful context
    ],

    // Child safety (critical - always block)
    child_safety: [
        "child porn", "cp", "pedo", "underage", "minor",
        "loli", "shota", "young girl", "young boy",
        "little girl", "little boy", "kid nude", "teen nude",
        // Indonesian
        "anak kecil telanjang", "bocah bugil",
    ],

    // Deepfake/Impersonation
    deepfake: [
        "deepfake", "fake nude", "celebrity nude",
        "real person nude", "without consent",
    ],

    // Illegal activities
    illegal: [
        "drug", "cocaine", "heroin", "meth", "marijuana grow",
        "bomb", "explosive", "weapon making", "hack", "steal",
        // Indonesian
        "narkoba", "ganja", "sabu",
    ],
};

// Compile regex patterns for performance
const PATTERN_CACHE = new Map<string, RegExp>();

function getPattern(category: string, words: string[]): RegExp {
    const cacheKey = category;
    if (!PATTERN_CACHE.has(cacheKey)) {
        const pattern = words
            .map(word => {
                const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                return `\\b${escaped}`;
            })
            .join("|");
        PATTERN_CACHE.set(cacheKey, new RegExp(pattern, "i"));
    }
    return PATTERN_CACHE.get(cacheKey)!;
}

export interface SanitizeResult {
    isValid: boolean;
    sanitizedPrompt: string;
    blockedReason?: string;
    blockedCategory?: string;
    matchedWords?: string[];
}

/**
 * Check if a prompt contains prohibited content
 * @param prompt - The prompt to check
 * @returns Sanitization result with details
 */
export function sanitizePrompt(prompt: string): SanitizeResult {
    if (!prompt || typeof prompt !== "string") {
        return {
            isValid: false,
            sanitizedPrompt: "",
            blockedReason: "Prompt is required",
        };
    }

    const normalizedPrompt = prompt.toLowerCase().trim();
    const matchedWords: string[] = [];

    // Check each category
    for (const [category, keywords] of Object.entries(PROHIBITED_CATEGORIES)) {
        const pattern = getPattern(category, keywords);
        const match = normalizedPrompt.match(pattern);

        if (match) {
            matchedWords.push(...match);

            // Return immediately for critical categories
            if (category === "child_safety") {
                return {
                    isValid: false,
                    sanitizedPrompt: "",
                    blockedReason: "Konten yang melibatkan anak-anak tidak diizinkan",
                    blockedCategory: category,
                    matchedWords,
                };
            }

            // Determine user-friendly message based on category
            const messages: Record<string, string> = {
                nsfw: "Konten dewasa atau seksual tidak diizinkan",
                violence: "Konten kekerasan tidak diizinkan",
                hate: "Konten kebencian atau diskriminasi tidak diizinkan",
                deepfake: "Pembuatan deepfake tidak diizinkan",
                illegal: "Konten aktivitas ilegal tidak diizinkan",
            };

            return {
                isValid: false,
                sanitizedPrompt: "",
                blockedReason: messages[category] || "Konten tidak diizinkan",
                blockedCategory: category,
                matchedWords,
            };
        }
    }

    // Prompt is valid
    return {
        isValid: true,
        sanitizedPrompt: prompt.trim(),
    };
}

/**
 * Quick check if prompt is valid (for performance)
 * Use this for simple validation without detailed feedback
 */
export function isPromptValid(prompt: string): boolean {
    return sanitizePrompt(prompt).isValid;
}

/**
 * Get all prohibited words for a specific category
 * Useful for admin/debugging
 */
export function getProhibitedWords(category?: keyof typeof PROHIBITED_CATEGORIES): string[] {
    if (category) {
        return [...(PROHIBITED_CATEGORIES[category] || [])];
    }
    return Object.values(PROHIBITED_CATEGORIES).flat();
}

/**
 * Log blocked prompt attempt for monitoring
 * In production, send to analytics/monitoring service
 */
export function logBlockedPrompt(
    userId: string,
    prompt: string,
    result: SanitizeResult
): void {
    console.warn("[Prompt Blocked]", {
        userId: userId.substring(0, 8), // Partial ID for privacy
        category: result.blockedCategory,
        matchedWords: result.matchedWords,
        promptLength: prompt.length,
        timestamp: new Date().toISOString(),
    });
}
