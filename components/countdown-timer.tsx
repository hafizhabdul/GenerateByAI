"use client";

import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";
import { getTimeRemaining, LAUNCH_DISCOUNT, type DiscountConfig } from "@/lib/discount";

interface CountdownTimerProps {
    discount?: DiscountConfig;
    className?: string;
    variant?: "banner" | "compact" | "inline";
    onExpire?: () => void;
}

/**
 * Countdown Timer Component
 * Shows remaining time until discount expires
 */
export function CountdownTimer({
    discount = LAUNCH_DISCOUNT,
    className,
    variant = "banner",
    onExpire,
}: CountdownTimerProps) {
    const [timeLeft, setTimeLeft] = useState(getTimeRemaining(discount));

    useEffect(() => {
        const timer = setInterval(() => {
            const remaining = getTimeRemaining(discount);
            setTimeLeft(remaining);

            if (remaining.expired) {
                clearInterval(timer);
                onExpire?.();
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [discount, onExpire]);

    if (timeLeft.expired) {
        return null;
    }

    // Compact variant - just numbers
    if (variant === "compact") {
        return (
            <div className={cn("flex items-center gap-1 text-xs font-mono", className)}>
                <span className="text-white/60">Berakhir dalam:</span>
                <span className="text-[#c2410c] font-bold">
                    {timeLeft.days > 0 && `${timeLeft.days}h `}
                    {String(timeLeft.hours).padStart(2, "0")}:
                    {String(timeLeft.minutes).padStart(2, "0")}:
                    {String(timeLeft.seconds).padStart(2, "0")}
                </span>
            </div>
        );
    }

    // Inline variant - single line
    if (variant === "inline") {
        return (
            <span className={cn("inline-flex items-center gap-1.5 text-sm", className)}>
                <Icon icon="mingcute:time-fill" className="w-4 h-4 text-[#c2410c]" />
                <span className="text-white/70">Berakhir dalam</span>
                <span className="font-bold text-[#c2410c]">
                    {timeLeft.days > 0 ? `${timeLeft.days} hari` : ""}
                    {timeLeft.days > 0 && timeLeft.hours > 0 ? " " : ""}
                    {timeLeft.hours > 0 ? `${timeLeft.hours} jam` : ""}
                    {timeLeft.days === 0 && timeLeft.hours === 0 ? `${timeLeft.minutes} menit` : ""}
                </span>
            </span>
        );
    }

    // Banner variant - full display with boxes
    return (
        <div className={cn("flex flex-col items-center gap-3", className)}>
            <div className="flex items-center gap-1.5 text-xs text-white/50">
                <Icon icon="mingcute:alarm-2-fill" className="w-4 h-4 text-[#c2410c] animate-pulse" />
                <span>Promo berakhir dalam:</span>
            </div>

            <div className="flex items-center gap-2 md:gap-3">
                {/* Days */}
                {timeLeft.days > 0 && (
                    <>
                        <TimeBox value={timeLeft.days} label="Hari" />
                        <Separator />
                    </>
                )}

                {/* Hours */}
                <TimeBox value={timeLeft.hours} label="Jam" />
                <Separator />

                {/* Minutes */}
                <TimeBox value={timeLeft.minutes} label="Menit" />
                <Separator />

                {/* Seconds */}
                <TimeBox value={timeLeft.seconds} label="Detik" />
            </div>
        </div>
    );
}

function TimeBox({ value, label }: { value: number; label: string }) {
    return (
        <div className="flex flex-col items-center">
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-xl bg-gradient-to-b from-[#c2410c] to-[#9a3412] flex items-center justify-center shadow-lg shadow-[#c2410c]/30">
                <span className="font-wayang text-2xl md:text-3xl font-bold text-white">
                    {String(value).padStart(2, "0")}
                </span>
            </div>
            <span className="text-[10px] text-white/40 mt-1.5 font-grotesque uppercase tracking-wider">
                {label}
            </span>
        </div>
    );
}

function Separator() {
    return (
        <div className="flex flex-col gap-1.5 pb-5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#c2410c]" />
            <div className="w-1.5 h-1.5 rounded-full bg-[#c2410c]" />
        </div>
    );
}

/**
 * Discount Badge - shows percentage off
 */
export function DiscountBadge({
    percentage,
    className,
    size = "md",
}: {
    percentage: number;
    className?: string;
    size?: "sm" | "md" | "lg";
}) {
    const sizeClasses = {
        sm: "text-xs px-2 py-0.5",
        md: "text-sm px-3 py-1",
        lg: "text-base px-4 py-1.5",
    };

    return (
        <span
            className={cn(
                "inline-flex items-center gap-1 font-bold rounded-full",
                "bg-gradient-to-r from-[#c2410c] to-[#ea580c] text-white",
                "shadow-lg shadow-[#c2410c]/30",
                sizeClasses[size],
                className
            )}
        >
            <Icon icon="mingcute:discount-fill" className="w-3.5 h-3.5" />
            -{percentage}%
        </span>
    );
}

/**
 * Promo Banner - full width banner for pricing page
 */
export function PromoBanner({
    discount = LAUNCH_DISCOUNT,
    className,
}: {
    discount?: DiscountConfig;
    className?: string;
}) {
    const [isActive, setIsActive] = useState(true);

    if (!isActive) return null;

    return (
        <div
            className={cn(
                "relative w-full overflow-hidden rounded-2xl md:rounded-3xl",
                "bg-gradient-to-r from-[#c2410c]/30 via-[#c2410c]/20 to-[#c2410c]/30",
                "border border-[#c2410c]/50",
                "p-6 md:p-8",
                className
            )}
        >
            {/* Animated background pattern */}
            <div
                className="absolute inset-0 opacity-10 animate-shimmer-gradient"
                style={{
                    backgroundImage: `linear-gradient(45deg, transparent 25%, rgba(194,65,12,0.3) 50%, transparent 75%)`,
                    backgroundSize: "200% 200%",
                }}
            />

            {/* Sparkle decorations */}
            <div className="absolute top-4 left-4 text-[#c2410c]/30">
                <Icon icon="mingcute:sparkles-fill" className="w-6 h-6" />
            </div>
            <div className="absolute bottom-4 right-4 text-[#c2410c]/30">
                <Icon icon="mingcute:sparkles-fill" className="w-8 h-8" />
            </div>

            <div className="relative z-10 flex flex-col items-center text-center gap-4">
                {/* Badge */}
                <div className="flex items-center gap-3">
                    <span className="text-3xl">🎉</span>
                    <DiscountBadge percentage={discount.percentage} size="lg" />
                    <span className="text-3xl">🎉</span>
                </div>

                {/* Title */}
                <div>
                    <h2 className="font-wayang text-2xl md:text-3xl font-bold text-white mb-1">
                        {discount.description}
                    </h2>
                    <p className="text-white/60 text-sm font-grotesque">
                        Penawaran terbatas untuk user baru. Jangan sampai kelewatan!
                    </p>
                </div>

                {/* Countdown */}
                <CountdownTimer
                    discount={discount}
                    variant="banner"
                    onExpire={() => setIsActive(false)}
                />

                {/* Code */}
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-black/30 border border-white/10">
                    <span className="text-xs text-white/50">Kode promo:</span>
                    <span className="font-mono font-bold text-[#c2410c]">{discount.code}</span>
                    <span className="text-xs text-white/30">(otomatis)</span>
                </div>
            </div>
        </div>
    );
}
