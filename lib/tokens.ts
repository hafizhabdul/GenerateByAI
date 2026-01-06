export type GenerationType = 'image' | 'video' | 'edit';
export type QualityTier = 'standard' | 'high' | 'ultra';

// ANTI-BONCOS TOKEN COSTS
// Image: 20 tokens (Rp 6.600 sell, ~Rp 800 cost, margin 88%)
// Edit: 15 tokens (Rp 4.950 sell, ~Rp 400 cost, margin 92%)
export const TOKEN_COSTS: Record<string, number> = {
    image_standard: 15,
    image_high: 20,
    image_ultra: 30,
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
