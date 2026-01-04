export type GenerationType = 'image' | 'video' | 'edit';
export type QualityTier = 'standard' | 'high' | 'ultra';

export const TOKEN_COSTS: Record<string, number> = {
    image_standard: 10,
    image_high: 20,
    image_ultra: 40,
    edit: 10,
    video: 100,
};

export function getTokenCost(type: GenerationType, quality: QualityTier = 'high'): number {
    if (type === 'edit') return TOKEN_COSTS.edit;
    if (type === 'video') return TOKEN_COSTS.video;

    const key = `image_${quality}`;
    return TOKEN_COSTS[key] || TOKEN_COSTS.image_high;
}

// Re-export token packages from pakasir for convenience
export { TOKEN_PACKAGES, formatIDR, type TokenPackageId } from './pakasir';
