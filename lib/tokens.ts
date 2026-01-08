export type GenerationType = 'image' | 'video' | 'edit';
export type QualityTier = 'standard' | 'high' | 'ultra';

// ANTI-BONCOS TOKEN COSTS
// Image: 40 tokens (Always Ultra quality - best results)
// Edit: 15 tokens (Rp 4.950 sell, ~Rp 400 cost, margin 92%)
export const TOKEN_COSTS: Record<string, number> = {
    image: 40,  // Always Ultra quality
    edit: 15,
    video: 25, // Base video cost (Kling 5s std)
};

export function getTokenCost(type: GenerationType, _quality?: QualityTier): number {
    if (type === 'edit') return TOKEN_COSTS.edit;
    if (type === 'video') return TOKEN_COSTS.video;
    return TOKEN_COSTS.image; // Always 40 tokens for image (Ultra quality)
}

// Re-export token packages from pakasir for convenience
export { TOKEN_PACKAGES, formatIDR, type TokenPackageId } from './pakasir';
