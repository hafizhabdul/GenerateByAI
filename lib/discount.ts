/**
 * Discount Configuration
 * Launch promo: 50% off for the first week
 */

export interface DiscountConfig {
    code: string;
    percentage: number; // 0-100
    startDate: Date;
    endDate: Date;
    description: string;
    enabled: boolean;
}

// Current active discount
// CHANGE THE END DATE TO EXTEND THE PROMO
export const LAUNCH_DISCOUNT: DiscountConfig = {
    code: "LAUNCH50",
    percentage: 50,
    startDate: new Date("2026-01-11T00:00:00+07:00"), // Today
    endDate: new Date("2026-01-18T23:59:59+07:00"),   // 1 week from now
    description: "Diskon 50% Grand Opening!",
    enabled: true,
};

/**
 * Check if discount is currently active
 */
export function isDiscountActive(discount: DiscountConfig = LAUNCH_DISCOUNT): boolean {
    if (!discount.enabled) return false;

    const now = new Date();
    return now >= discount.startDate && now <= discount.endDate;
}

/**
 * Calculate discounted price
 */
export function getDiscountedPrice(
    originalPrice: number,
    discount: DiscountConfig = LAUNCH_DISCOUNT
): number {
    if (!isDiscountActive(discount)) {
        return originalPrice;
    }

    const discountAmount = Math.floor(originalPrice * (discount.percentage / 100));
    return originalPrice - discountAmount;
}

/**
 * Get time remaining until discount ends
 */
export function getTimeRemaining(discount: DiscountConfig = LAUNCH_DISCOUNT): {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    total: number;
    expired: boolean;
} {
    const now = new Date();
    const total = discount.endDate.getTime() - now.getTime();

    if (total <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0, expired: true };
    }

    return {
        days: Math.floor(total / (1000 * 60 * 60 * 24)),
        hours: Math.floor((total % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((total % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((total % (1000 * 60)) / 1000),
        total,
        expired: false,
    };
}

/**
 * Format discount info for display
 */
export function getDiscountInfo(discount: DiscountConfig = LAUNCH_DISCOUNT): {
    isActive: boolean;
    percentage: number;
    description: string;
    endDate: Date;
    code: string;
} | null {
    if (!isDiscountActive(discount)) {
        return null;
    }

    return {
        isActive: true,
        percentage: discount.percentage,
        description: discount.description,
        endDate: discount.endDate,
        code: discount.code,
    };
}

/**
 * Format price to IDR
 */
export function formatIDR(amount: number): string {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}
