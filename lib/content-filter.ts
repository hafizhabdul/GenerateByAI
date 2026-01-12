/**
 * Content Filter Module
 * Simple keyword-based content moderation for community showcase
 * Filters prompts containing NSFW/profanity in Indonesian and English
 */

// Blacklisted keywords - case insensitive matching
// English profanity and NSFW terms
const BLACKLIST_EN = [
    "porn", "porno", "pornography",
    "xxx", "xxxx",
    "nude", "nudes", "nudity",
    "naked",
    "nsfw",
    "hentai",
    "explicit",
    "erotic", "erotica",
    "adult content",
    "sex", "sexual", "sexually",
    "fuck", "fucking",
    "shit", "shitty",
    "ass", "asshole",
    "bitch",
    "dick", "cock", "penis",
    "pussy", "vagina",
    "boob", "boobs", "breast", "breasts",
    "fetish",
    "orgasm",
    "masturbat", // catches masturbate, masturbation, etc
];

// Indonesian profanity and NSFW terms
const BLACKLIST_ID = [
    "bokep",
    "telanjang",
    "bugil",
    "mesum",
    "cabul",
    "vulgar",
    "dewasa",
    "porno", "pornografi",
    "kontol", "titit",
    "memek", "pepek",
    "ngentot", "entot",
    "jembut",
    "toket",
    "colmek", "coli",
    "pelacur", "lonte",
    "anjing", "anjir", // context-dependent but often vulgar
    "bangsat",
    "bajingan",
    "keparat",
    "brengsek",
    "tolol", "goblok", "bodoh",
];

// Combine all blacklisted words
const BLACKLIST = [...new Set([...BLACKLIST_EN, ...BLACKLIST_ID])];

// Pre-compile regex for performance
// Using word boundaries where possible, but some Indonesian words need partial matching
const BLACKLIST_REGEX = new RegExp(
    BLACKLIST.map(word => {
        // Escape special regex characters
        const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Use word boundary for most words
        return `\\b${escaped}`;
    }).join("|"),
    "i" // case insensitive
);

/**
 * Check if a prompt contains blacklisted content
 * @param prompt - The text to check
 * @returns true if content should be hidden, false if safe to display
 */
export function containsBlacklistedContent(prompt: string): boolean {
    if (!prompt || typeof prompt !== "string") return false;
    return BLACKLIST_REGEX.test(prompt.toLowerCase());
}

/**
 * Filter an array of items, removing those with blacklisted prompts
 * @param items - Array of items with prompt property
 * @returns Filtered array with only safe content
 */
export function filterBlacklistedContent<T extends { prompt: string }>(items: T[]): T[] {
    return items.filter(item => !containsBlacklistedContent(item.prompt));
}

/**
 * Get the list of blacklisted words (for admin/debugging)
 * @returns Array of blacklisted keywords
 */
export function getBlacklistWords(): string[] {
    return [...BLACKLIST];
}
