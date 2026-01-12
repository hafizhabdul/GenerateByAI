"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { useAuth } from "@/lib/auth-context";

interface TokenLowAlertProps {
    threshold?: number; // Show alert when tokens below this
    dismissable?: boolean;
}

/**
 * Token Low Alert Component
 * Shows a warning banner when user's token balance is running low
 * Encourages users to top up before they run out
 */
export function TokenLowAlert({
    threshold = 50,
    dismissable = true
}: TokenLowAlertProps) {
    const { profile } = useAuth();
    const [dismissed, setDismissed] = useState(false);

    // Calculate remaining tokens
    const tokensRemaining = profile
        ? Math.max(0, (profile.tokens_total || 0) - (profile.tokens_used || 0))
        : 0;

    // Check localStorage for dismissed state (persists across sessions)
    useEffect(() => {
        const dismissedKey = `token_alert_dismissed_${tokensRemaining <= 10 ? 'critical' : 'low'}`;
        const dismissedUntil = localStorage.getItem(dismissedKey);

        if (dismissedUntil) {
            const until = parseInt(dismissedUntil, 10);
            if (Date.now() < until) {
                setDismissed(true);
            } else {
                localStorage.removeItem(dismissedKey);
            }
        }
    }, [tokensRemaining]);

    const handleDismiss = () => {
        // Dismiss for 24 hours
        const dismissedKey = `token_alert_dismissed_${tokensRemaining <= 10 ? 'critical' : 'low'}`;
        localStorage.setItem(dismissedKey, String(Date.now() + 24 * 60 * 60 * 1000));
        setDismissed(true);
    };

    // Don't show if dismissed or tokens are above threshold
    if (dismissed || tokensRemaining > threshold || !profile) {
        return null;
    }

    // Critical alert (very low tokens)
    if (tokensRemaining <= 10) {
        return (
            <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-slide-up">
                <div className="bg-destructive/95 backdrop-blur-sm text-white rounded-xl shadow-lg border border-destructive-foreground/20 p-4">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                            <Icon icon="mingcute:alert-fill" className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm">Token Hampir Habis!</p>
                            <p className="text-xs text-white/80 mt-0.5">
                                Sisa {tokensRemaining} token. Top up sekarang untuk terus berkreasi.
                            </p>
                            <div className="flex gap-2 mt-3">
                                <Link
                                    href="/pricing"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-destructive rounded-lg text-xs font-semibold hover:bg-white/90 transition-colors"
                                >
                                    <Icon icon="mingcute:diamond-2-fill" className="w-3.5 h-3.5" />
                                    Top Up
                                </Link>
                                {dismissable && (
                                    <button
                                        onClick={handleDismiss}
                                        className="px-3 py-1.5 text-white/70 hover:text-white text-xs transition-colors"
                                    >
                                        Nanti
                                    </button>
                                )}
                            </div>
                        </div>
                        {dismissable && (
                            <button
                                onClick={handleDismiss}
                                className="text-white/50 hover:text-white transition-colors"
                            >
                                <Icon icon="mingcute:close-line" className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Low alert (running low)
    return (
        <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-slide-up">
            <div className="bg-warning/95 backdrop-blur-sm text-warning-foreground rounded-xl shadow-lg border border-warning-foreground/20 p-4">
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-black/10 flex items-center justify-center shrink-0">
                        <Icon icon="mingcute:diamond-2-line" className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">Token Menipis</p>
                        <p className="text-xs opacity-80 mt-0.5">
                            Sisa {tokensRemaining} token. Pertimbangkan untuk top up.
                        </p>
                        <div className="flex gap-2 mt-3">
                            <Link
                                href="/pricing"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-black/10 rounded-lg text-xs font-semibold hover:bg-black/20 transition-colors"
                            >
                                <Icon icon="mingcute:shopping-bag-2-fill" className="w-3.5 h-3.5" />
                                Lihat Paket
                            </Link>
                            {dismissable && (
                                <button
                                    onClick={handleDismiss}
                                    className="px-3 py-1.5 opacity-70 hover:opacity-100 text-xs transition-opacity"
                                >
                                    Tutup
                                </button>
                            )}
                        </div>
                    </div>
                    {dismissable && (
                        <button
                            onClick={handleDismiss}
                            className="opacity-50 hover:opacity-100 transition-opacity"
                        >
                            <Icon icon="mingcute:close-line" className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

/**
 * Inline token indicator for headers/sidebars
 * Shows token count with visual warning states
 */
export function TokenIndicator({
    className = ""
}: {
    className?: string
}) {
    const { profile, loading } = useAuth();

    const tokensRemaining = profile
        ? Math.max(0, (profile.tokens_total || 0) - (profile.tokens_used || 0))
        : 0;

    if (loading) {
        return (
            <div className={`flex items-center gap-1.5 ${className}`}>
                <div className="w-4 h-4 rounded bg-muted animate-pulse" />
                <div className="w-8 h-4 rounded bg-muted animate-pulse" />
            </div>
        );
    }

    // Determine color based on token level
    let colorClass = "text-primary";
    let bgClass = "bg-primary/10";
    let icon = "mingcute:diamond-2-fill";

    if (tokensRemaining <= 10) {
        colorClass = "text-destructive";
        bgClass = "bg-destructive/10";
        icon = "mingcute:alert-fill";
    } else if (tokensRemaining <= 50) {
        colorClass = "text-warning";
        bgClass = "bg-warning/10";
        icon = "mingcute:diamond-2-line";
    }

    return (
        <Link
            href="/pricing"
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${bgClass} ${colorClass} text-xs font-medium hover:opacity-80 transition-opacity ${className}`}
        >
            <Icon icon={icon} className="w-3.5 h-3.5" />
            <span>{tokensRemaining.toLocaleString()}</span>
        </Link>
    );
}
