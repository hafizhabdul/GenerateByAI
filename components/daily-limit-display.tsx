"use client";

import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

interface DailyLimitDisplayProps {
    className?: string;
    variant?: "compact" | "detailed";
}

interface DailyStats {
    imagesGenerated: number;
    videosGenerated: number;
    imageLimit: number;
    videoLimit: number;
    resetsAt: string;
}

/**
 * Daily Limit Display Component
 * Shows how many generations the user has left today
 */
export function DailyLimitDisplay({ className, variant = "compact" }: DailyLimitDisplayProps) {
    const { user } = useAuth();
    const [stats, setStats] = useState<DailyStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        // Fetch daily stats from API
        const fetchStats = async () => {
            try {
                const res = await fetch("/api/user");
                if (res.ok) {
                    const data = await res.json();
                    // Extract daily stats from user data
                    setStats({
                        imagesGenerated: data.dailyStats?.imagesGenerated || 0,
                        videosGenerated: data.dailyStats?.videosGenerated || 0,
                        imageLimit: data.dailyStats?.imageLimit || 50,
                        videoLimit: data.dailyStats?.videoLimit || 10,
                        resetsAt: data.dailyStats?.resetsAt || getNextMidnight(),
                    });
                }
            } catch (error) {
                console.error("Failed to fetch daily stats:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [user]);

    if (loading) {
        return (
            <div className={cn("animate-pulse", className)}>
                <div className="h-4 w-24 bg-surface-2 rounded" />
            </div>
        );
    }

    if (!stats || !user) {
        return null;
    }

    const imagesRemaining = Math.max(0, stats.imageLimit - stats.imagesGenerated);
    const videosRemaining = Math.max(0, stats.videoLimit - stats.videosGenerated);

    // Calculate percentage for progress bars
    const imagePercent = (stats.imagesGenerated / stats.imageLimit) * 100;
    const videoPercent = (stats.videosGenerated / stats.videoLimit) * 100;

    // Determine warning states
    const imageWarning = imagesRemaining <= 5;
    const videoWarning = videosRemaining <= 2;

    if (variant === "compact") {
        return (
            <div className={cn("flex items-center gap-3 text-xs", className)}>
                {/* Images */}
                <div className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded-md",
                    imageWarning ? "bg-warning/10 text-warning" : "bg-surface-2 text-muted-foreground"
                )}>
                    <Icon icon="mingcute:pic-line" className="w-3.5 h-3.5" />
                    <span className="font-medium">{imagesRemaining}/{stats.imageLimit}</span>
                </div>

                {/* Videos */}
                <div className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded-md",
                    videoWarning ? "bg-warning/10 text-warning" : "bg-surface-2 text-muted-foreground"
                )}>
                    <Icon icon="mingcute:video-line" className="w-3.5 h-3.5" />
                    <span className="font-medium">{videosRemaining}/{stats.videoLimit}</span>
                </div>

                {/* Reset time */}
                <span className="text-muted-foreground/60 hidden sm:inline">
                    Reset: {formatResetTime(stats.resetsAt)}
                </span>
            </div>
        );
    }

    // Detailed variant
    return (
        <div className={cn("bg-surface-1 border border-border rounded-xl p-4", className)}>
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Icon icon="mingcute:time-line" className="w-4 h-4 text-primary" />
                    Batas Harian
                </h3>
                <span className="text-[10px] text-muted-foreground">
                    Reset: {formatResetTime(stats.resetsAt)}
                </span>
            </div>

            <div className="space-y-3">
                {/* Images */}
                <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-muted-foreground flex items-center gap-1">
                            <Icon icon="mingcute:pic-fill" className="w-3.5 h-3.5" />
                            Gambar
                        </span>
                        <span className={cn(
                            "font-medium",
                            imageWarning ? "text-warning" : "text-foreground"
                        )}>
                            {imagesRemaining} tersisa
                        </span>
                    </div>
                    <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
                        <div
                            className={cn(
                                "h-full rounded-full transition-all duration-500",
                                imagePercent >= 80 ? "bg-warning" : "bg-primary"
                            )}
                            style={{ width: `${Math.min(imagePercent, 100)}%` }}
                        />
                    </div>
                </div>

                {/* Videos */}
                <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-muted-foreground flex items-center gap-1">
                            <Icon icon="mingcute:video-fill" className="w-3.5 h-3.5" />
                            Video
                        </span>
                        <span className={cn(
                            "font-medium",
                            videoWarning ? "text-warning" : "text-foreground"
                        )}>
                            {videosRemaining} tersisa
                        </span>
                    </div>
                    <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
                        <div
                            className={cn(
                                "h-full rounded-full transition-all duration-500",
                                videoPercent >= 80 ? "bg-warning" : "bg-primary"
                            )}
                            style={{ width: `${Math.min(videoPercent, 100)}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Warning message */}
            {(imageWarning || videoWarning) && (
                <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-[11px] text-warning flex items-center gap-1.5">
                        <Icon icon="mingcute:alert-line" className="w-3.5 h-3.5" />
                        Batas harian hampir tercapai
                    </p>
                </div>
            )}
        </div>
    );
}

// Helper functions
function getNextMidnight(): string {
    const tomorrow = new Date();
    tomorrow.setHours(24, 0, 0, 0);
    return tomorrow.toISOString();
}

function formatResetTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours > 0) {
        return `${diffHours}j ${diffMins}m`;
    }
    return `${diffMins}m`;
}
