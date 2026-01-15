/**
 * Watermark Utilities
 * 
 * Adds "SQUIRRAI" watermark to images/videos for free tier users.
 * Watermark specs:
 * - Text: "SQUIRRAI"
 * - Position: Bottom-right corner
 * - Opacity: 25%
 */

import { createAdminClient } from "@/lib/supabase/server";

/**
 * Check if user is on free tier (should have watermark)
 * Free users have tokens_total <= 100 (initial free tokens)
 */
export async function shouldApplyWatermark(userId: string): Promise<boolean> {
    try {
        const adminClient = createAdminClient();
        const { data: profile } = await adminClient
            .from("profiles")
            .select("tokens_total, plan")
            .eq("id", userId)
            .single();

        if (!profile) return true; // Default to watermark if no profile

        // Free tier: tokens_total <= 100 AND plan is 'free'
        const isFreeUser = (profile.tokens_total || 0) <= 100 || profile.plan === 'free';
        return isFreeUser;
    } catch (error) {
        console.error("[Watermark] Error checking user tier:", error);
        return true; // Default to watermark on error
    }
}

/**
 * Generate watermark text overlay for fal.ai ffmpeg
 * Used for video watermarking
 */
export function getVideoWatermarkFilter(): string {
    // FFmpeg drawtext filter for "SQUIRRAI" watermark
    // Position: bottom-right with 20px padding
    // Font: white with 25% opacity, size 24
    return "drawtext=text='SQUIRRAI':fontsize=24:fontcolor=white@0.25:x=w-tw-20:y=h-th-20";
}

/**
 * Watermark configuration for image processing
 */
export const WATERMARK_CONFIG = {
    text: "SQUIRRAI",
    position: "bottom-right" as const,
    opacity: 0.25,
    fontSize: 24,
    padding: 20,
    fontColor: "rgba(255, 255, 255, 0.25)",
};

/**
 * Generate SVG watermark for image overlay
 * This can be used with Sharp or Canvas
 */
export function generateWatermarkSVG(width: number, height: number): string {
    const { text, fontSize, padding, fontColor } = WATERMARK_CONFIG;
    const textWidth = text.length * (fontSize * 0.6); // Approximate text width
    const x = width - textWidth - padding;
    const y = height - padding;

    return `
        <svg width="${width}" height="${height}">
            <text 
                x="${x}" 
                y="${y}" 
                font-family="Arial, sans-serif" 
                font-size="${fontSize}" 
                font-weight="bold"
                fill="${fontColor}"
                text-anchor="start"
            >${text}</text>
        </svg>
    `;
}

/**
 * Apply watermark to image using Sharp
 * @param imageBuffer - Original image buffer
 * @returns Watermarked image buffer
 */
export async function applyImageWatermark(imageBuffer: Buffer): Promise<Buffer> {
    // Dynamic import to avoid issues in edge runtime
    const sharp = (await import("sharp")).default;
    
    // Get image metadata
    const metadata = await sharp(imageBuffer).metadata();
    const width = metadata.width || 1024;
    const height = metadata.height || 1024;

    // Generate watermark SVG
    const watermarkSvg = generateWatermarkSVG(width, height);
    const watermarkBuffer = Buffer.from(watermarkSvg);

    // Composite watermark onto image
    const watermarkedImage = await sharp(imageBuffer)
        .composite([
            {
                input: watermarkBuffer,
                top: 0,
                left: 0,
            },
        ])
        .png()
        .toBuffer();

    return watermarkedImage;
}

/**
 * Apply watermark to image from URL
 * Downloads image, applies watermark, returns base64
 */
export async function applyWatermarkToUrl(imageUrl: string): Promise<string> {
    // Fetch image
    const response = await fetch(imageUrl);
    if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
    }

    const imageBuffer = Buffer.from(await response.arrayBuffer());
    const watermarkedBuffer = await applyImageWatermark(imageBuffer);

    // Convert to base64 data URL
    const base64 = watermarkedBuffer.toString("base64");
    return `data:image/png;base64,${base64}`;
}
