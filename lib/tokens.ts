export type GenerationType = 'image' | 'video' | 'edit';
export type QualityTier = 'low' | 'medium' | 'high';

// ANTI-BONCOS TOKEN COSTS
// Image pricing based on fal.ai GPT-Image-1.5 quality tiers
// Low: Faster generation, good quality
// Medium: Balanced speed and quality
// High: Best quality, slower
export const TOKEN_COSTS: Record<string, number> = {
    image_low: 10,      // Fast generation
    image_medium: 25,   // Balanced
    image_high: 40,     // Best quality
    edit: 15,
    video: 25, // Base video cost (Kling 5s std)
};

export function getTokenCost(type: GenerationType, quality: QualityTier = 'high'): number {
    if (type === 'edit') return TOKEN_COSTS.edit;
    if (type === 'video') return TOKEN_COSTS.video;

    const key = `image_${quality}`;
    return TOKEN_COSTS[key] || TOKEN_COSTS.image_high;
}

// Re-export token packages from pakasir for convenience
export { TOKEN_PACKAGES, formatIDR, type TokenPackageId } from './pakasir';

