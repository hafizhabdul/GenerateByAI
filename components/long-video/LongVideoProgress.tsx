"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type SegmentStatus = "pending" | "processing" | "completed" | "failed";

interface Segment {
    id: string;
    order: number;
    status: SegmentStatus;
    duration?: number;
    videoUrl?: string;
    thumbnailUrl?: string;
}

interface JobProgress {
    currentSegment: number;
    totalSegments: number;
    currentDuration: number;
    targetDuration: number;
    percentage: number;
    formattedCurrent: string;
    formattedTarget: string;
}

interface JobStatus {
    jobId: string;
    status: string;
    statusLabel: string;
    prompt: string;
    progress: JobProgress;
    segments: Segment[];
    currentSegmentId: string | null;
    canContinue: boolean;
    isReadyForStitching: boolean;
    finalVideoUrl: string | null;
    tokensReserved: number;
    tokensUsed: number;
    error: string | null;
    createdAt: string;
    updatedAt: string;
}

interface LongVideoProgressProps {
    jobId: string;
    onComplete: (videoUrl: string) => void;
    onError: (error: string) => void;
    onCancel?: () => void;
    autoMode?: boolean;
}

const POLL_INTERVAL = 5000;

export function LongVideoProgress({ jobId, onComplete, onError, onCancel, autoMode = true }: LongVideoProgressProps) {
    const [status, setStatus] = useState<JobStatus | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isContinuing, setIsContinuing] = useState(false);
    const [isStitching, setIsStitching] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);
    const [autoEnabled, setAutoEnabled] = useState(autoMode);

    const isAutoProcessingRef = useRef(false);
    // MOBILE FIX: Track last poll time and interval ref for visibility change
    const lastPollTimeRef = useRef<number>(0);
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const fetchStatus = useCallback(async () => {
        try {
            const response = await fetch(`/api/long-video/status?jobId=${jobId}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to fetch status");
            }

            setStatus(data);

            if (data.status === "completed" && data.finalVideoUrl) {
                onComplete(data.finalVideoUrl);
            } else if (data.status === "failed" && data.error) {
                onError(data.error);
            }

            return data;
        } catch (error) {
            console.error("Status fetch error:", error);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [jobId, onComplete, onError]);

    const autoContinue = useCallback(async () => {
        if (isAutoProcessingRef.current || !autoEnabled) return;

        isAutoProcessingRef.current = true;
        setIsContinuing(true);

        try {
            const response = await fetch("/api/long-video/continue", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ jobId }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Failed to continue");
            }
        } catch (error) {
            console.error("Auto-continue error:", error);
        } finally {
            setIsContinuing(false);
            isAutoProcessingRef.current = false;
        }
    }, [jobId, autoEnabled]);

    const autoStitch = useCallback(async () => {
        if (isAutoProcessingRef.current || !autoEnabled) return;

        isAutoProcessingRef.current = true;
        setIsStitching(true);

        try {
            const response = await fetch("/api/long-video/stitch", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ jobId }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Failed to stitch");
            }
        } catch (error) {
            console.error("Auto-stitch error:", error);
        } finally {
            setIsStitching(false);
            isAutoProcessingRef.current = false;
        }
    }, [jobId, autoEnabled]);

    // MOBILE FIX: Handle visibility change - force poll when returning to tab
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                const timeSinceLastPoll = Date.now() - lastPollTimeRef.current;
                if (timeSinceLastPoll > 3000) {
                    console.log("[LongVideo] Tab became visible, forcing immediate poll");
                    fetchStatus();
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [fetchStatus]);

    useEffect(() => {
        fetchStatus();

        const pollAndProcess = async () => {
            // MOBILE FIX: Update last poll time
            lastPollTimeRef.current = Date.now();
            
            const data = await fetchStatus();

            if (!data || data.status === "completed" || data.status === "failed") {
                return;
            }

            // POLL FIX: Trigger video status check for current segment to ensure DB updates
            if (data.currentSegmentId) {
                fetch(`/api/video-status?generationId=${data.currentSegmentId}`).catch(console.error);
            }

            if (autoEnabled && !isAutoProcessingRef.current) {
                if (data.canContinue) {
                    autoContinue();
                } else if (data.isReadyForStitching) {
                    autoStitch();
                }
            }
        };

        // MOBILE FIX: Store interval ref and always restart to ensure running after visibility change
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
        }
        pollingIntervalRef.current = setInterval(pollAndProcess, POLL_INTERVAL);

        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
            }
        };
    }, [fetchStatus, autoEnabled, autoContinue, autoStitch]);

    const handleContinue = async () => {
        if (!status?.canContinue) return;

        setIsContinuing(true);
        try {
            const response = await fetch("/api/long-video/continue", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ jobId }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Failed to continue");
            }

            await fetchStatus();
        } catch (error) {
            console.error("Continue error:", error);
            onError(error instanceof Error ? error.message : "Failed to continue");
        } finally {
            setIsContinuing(false);
        }
    };

    const handleStitch = async () => {
        if (!status?.isReadyForStitching) return;

        setIsStitching(true);
        try {
            const response = await fetch("/api/long-video/stitch", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ jobId }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Failed to stitch");
            }

            await fetchStatus();
        } catch (error) {
            console.error("Stitch error:", error);
            onError(error instanceof Error ? error.message : "Failed to stitch");
        } finally {
            setIsStitching(false);
        }
    };

    const handleCancel = async () => {
        if (!confirm("Are you sure you want to cancel this job? This action cannot be undone.")) return;

        setIsCancelling(true);
        try {
            const response = await fetch("/api/long-video/cancel", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ jobId }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Failed to cancel job");
            }

            // Notify parent
            if (onCancel) onCancel();

            // Refresh status to show failed/canceled
            await fetchStatus();

        } catch (error) {
            console.error("Cancel error:", error);
            onError(error instanceof Error ? error.message : "Failed to cancel job");
        } finally {
            setIsCancelling(false);
        }
    };

    if (isLoading) {
        return (
            <div className="p-6 bg-surface-2 rounded-2xl border border-border animate-pulse">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-surface-3 rounded-full" />
                    <div className="flex-1 space-y-2">
                        <div className="h-4 bg-surface-3 rounded w-32" />
                        <div className="h-3 bg-surface-3 rounded w-48" />
                    </div>
                </div>
            </div>
        );
    }

    if (!status) {
        return (
            <div className="p-6 bg-surface-2 rounded-2xl border border-border text-center text-muted-foreground">
                Failed to load job status
            </div>
        );
    }

    const isProcessing = status.status === "processing";
    const isCompleted = status.status === "completed";
    const isFailed = status.status === "failed";

    return (
        <div className="space-y-4">
            {/* Status Header */}
            <div className="p-4 bg-surface-2 rounded-2xl border border-border">
                <div className="flex items-center gap-3 mb-4">
                    <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center",
                        isCompleted && "bg-green-500/10 text-green-500",
                        isFailed && "bg-red-500/10 text-red-500",
                        isProcessing && "bg-primary/10 text-primary"
                    )}>
                        {isCompleted && <Icon icon="mingcute:check-fill" className="w-5 h-5" />}
                        {isFailed && <Icon icon="mingcute:close-fill" className="w-5 h-5" />}
                        {isProcessing && <Icon icon="mingcute:loading-line" className="w-5 h-5 animate-spin" />}
                    </div>
                    <div className="flex-1">
                        <h3 className="font-medium">{status.statusLabel}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                            {status.prompt}
                        </p>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                            {status.progress.formattedCurrent} / {status.progress.formattedTarget}
                        </span>
                        <span className="font-medium">{status.progress.percentage}%</span>
                    </div>
                    <div className="h-2 bg-surface-3 rounded-full overflow-hidden">
                        <div
                            className={cn(
                                "h-full rounded-full transition-all duration-500",
                                isCompleted && "bg-green-500",
                                isFailed && "bg-red-500",
                                isProcessing && "bg-primary"
                            )}
                            style={{ width: `${status.progress.percentage}%` }}
                        />
                    </div>
                </div>

                {/* Token Usage + Auto Mode Toggle */}
                <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-4">
                        <span>Tokens: {status.tokensUsed} / {status.tokensReserved}</span>
                        <span>Segment: {status.progress.currentSegment} / {status.progress.totalSegments}</span>
                    </div>
                    {isProcessing && (
                        <button
                            onClick={() => setAutoEnabled(!autoEnabled)}
                            className={cn(
                                "flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors",
                                autoEnabled
                                    ? "bg-primary/10 text-primary"
                                    : "bg-surface-3 text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Icon
                                icon={autoEnabled ? "mingcute:flash-fill" : "mingcute:flash-line"}
                                className="w-3.5 h-3.5"
                            />
                            <span>Auto</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Auto Mode Status Banner */}
            {isProcessing && autoEnabled && (
                <div className="p-3 bg-primary/5 border border-primary/10 rounded-xl flex items-center gap-2 text-sm">
                    <Icon icon="mingcute:flash-fill" className="w-4 h-4 text-primary animate-pulse" />
                    <span className="text-muted-foreground">
                        {isContinuing
                            ? "Generating next segment..."
                            : isStitching
                                ? "Stitching video..."
                                : "Auto mode enabled - will continue automatically"}
                    </span>
                </div>
            )}

            {/* Segment Timeline */}
            <div className="p-4 bg-surface-2 rounded-2xl border border-border">
                <h4 className="text-sm font-medium mb-3">Segments</h4>
                <div className="grid grid-cols-4 gap-2">
                    {status.segments.map((segment) => (
                        <div
                            key={segment.id}
                            className={cn(
                                "aspect-video rounded-lg overflow-hidden relative border",
                                segment.status === "completed" && "border-green-500/30",
                                segment.status === "processing" && "border-primary/30",
                                segment.status === "pending" && "border-border",
                                segment.status === "failed" && "border-red-500/30"
                            )}
                        >
                            {segment.thumbnailUrl ? (
                                <img
                                    src={segment.thumbnailUrl}
                                    alt={`Segment ${segment.order + 1}`}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className={cn(
                                    "w-full h-full flex items-center justify-center",
                                    segment.status === "completed" && "bg-green-500/5",
                                    segment.status === "processing" && "bg-primary/5",
                                    segment.status === "pending" && "bg-surface-3",
                                    segment.status === "failed" && "bg-red-500/5"
                                )}>
                                    {segment.status === "processing" && (
                                        <Icon icon="mingcute:loading-line" className="w-4 h-4 text-primary animate-spin" />
                                    )}
                                    {segment.status === "pending" && (
                                        <Icon icon="mingcute:time-line" className="w-4 h-4 text-muted-foreground" />
                                    )}
                                    {segment.status === "completed" && (
                                        <Icon icon="mingcute:check-fill" className="w-4 h-4 text-green-500" />
                                    )}
                                    {segment.status === "failed" && (
                                        <Icon icon="mingcute:close-fill" className="w-4 h-4 text-red-500" />
                                    )}
                                </div>
                            )}
                            <div className="absolute bottom-0 left-0 right-0 px-1.5 py-0.5 bg-black/60 text-[10px] text-white">
                                #{segment.order + 1}
                            </div>
                        </div>
                    ))}

                    {/* Placeholder for remaining segments */}
                    {Array.from({ length: status.progress.totalSegments - status.segments.length }).map((_, i) => (
                        <div
                            key={`placeholder-${i}`}
                            className="aspect-video rounded-lg border border-dashed border-border/50 flex items-center justify-center bg-surface-3/30"
                        >
                            <span className="text-xs text-muted-foreground">
                                #{status.segments.length + i + 1}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Error Message */}
            {status.error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <div className="flex items-start gap-2">
                        <Icon icon="mingcute:alert-fill" className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        <p className="text-sm text-red-400">{status.error}</p>
                    </div>
                </div>
            )}

            {/* Final Video */}
            {status.finalVideoUrl && (
                <div className="p-4 bg-surface-2 rounded-2xl border border-green-500/20">
                    <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                        <Icon icon="mingcute:video-fill" className="w-4 h-4 text-green-500" />
                        Video Selesai!
                    </h4>
                    <video
                        src={status.finalVideoUrl}
                        controls
                        className="w-full rounded-xl"
                    />
                    <a
                        href={status.finalVideoUrl}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 flex items-center justify-center gap-2 w-full py-2.5 bg-green-500/10 text-green-500 rounded-xl text-sm font-medium hover:bg-green-500/20 transition-colors"
                    >
                        <Icon icon="mingcute:download-line" className="w-4 h-4" />
                        Download Video
                    </a>
                </div>
            )}

            {/* Cancel Button */}
            {(isProcessing || status.status === "pending") && (
                <div className="mt-3 pt-3 border-t border-border/50 flex justify-end">
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleCancel}
                        disabled={isCancelling}
                        className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border-none"
                    >
                        {isCancelling ? (
                            <>
                                <Icon icon="mingcute:loading-line" className="w-3.5 h-3.5 mr-2 animate-spin" />
                                Cancelling...
                            </>
                        ) : (
                            <>
                                <Icon icon="mingcute:close-circle-line" className="w-3.5 h-3.5 mr-2" />
                                Cancel Job
                            </>
                        )}
                    </Button>
                </div>
            )}

            {/* Action Buttons - Only show when auto mode is off */}
            {!isCompleted && !isFailed && !autoEnabled && (
                <div className="flex gap-3">
                    {status.canContinue && (
                        <Button
                            variant="primary"
                            className="flex-1"
                            onClick={handleContinue}
                            disabled={isContinuing}
                        >
                            {isContinuing ? (
                                <>
                                    <Icon icon="mingcute:loading-line" className="w-4 h-4 mr-2 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Icon icon="mingcute:play-fill" className="w-4 h-4 mr-2" />
                                    Continue Next Segment
                                </>
                            )}
                        </Button>
                    )}

                    {status.isReadyForStitching && (
                        <Button
                            variant="primary"
                            className="flex-1"
                            onClick={handleStitch}
                            disabled={isStitching}
                        >
                            {isStitching ? (
                                <>
                                    <Icon icon="mingcute:loading-line" className="w-4 h-4 mr-2 animate-spin" />
                                    Stitching...
                                </>
                            ) : (
                                <>
                                    <Icon icon="mingcute:video-line" className="w-4 h-4 mr-2" />
                                    Finalize Video
                                </>
                            )}
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}

