"use client";

import { useState, useEffect, useCallback } from "react";
import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";
import { LongVideoProgress } from "./LongVideoProgress";
import { Button } from "@/components/ui/button";

interface HistoryJob {
    id: string;
    prompt: string;
    status: "pending" | "processing" | "completed" | "failed";
    created_at: string;
    final_video_url?: string;
    segments?: any[];
}

export function LongVideoHistory() {
    const [jobs, setJobs] = useState<HistoryJob[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

    const fetchHistory = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch("/api/long-video/history?limit=10");
            const data = await response.json();

            if (response.ok && data.jobs) {
                setJobs(data.jobs);
            }
        } catch (error) {
            console.error("Failed to fetch history:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    // Format date nicely
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("id-ID", {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (isLoading && jobs.length === 0) {
        return (
            <div className="flex justify-center py-8">
                <Icon icon="mingcute:loading-line" className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (jobs.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                <Icon icon="mingcute:video-line" className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>Belum ada riwayat video</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Icon icon="mingcute:history-line" className="w-5 h-5 text-primary" />
                Riwayat Long Video
            </h2>

            <div className="space-y-4">
                {jobs.map((job) => (
                    <div
                        key={job.id}
                        className={cn(
                            "bg-surface-2 border border-border rounded-xl overflow-hidden transition-all",
                            expandedJobId === job.id ? "ring-2 ring-primary/20" : "hover:border-primary/50"
                        )}
                    >
                        {/* Summary Header */}
                        <div
                            className="p-4 cursor-pointer flex items-center gap-4"
                            onClick={() => setExpandedJobId(expandedJobId === job.id ? null : job.id)}
                        >
                            {/* Status Icon */}
                            <div className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                                job.status === "completed" ? "bg-green-500/10 text-green-500" :
                                    job.status === "failed" ? "bg-red-500/10 text-red-500" :
                                        "bg-primary/10 text-primary"
                            )}>
                                {job.status === "completed" && <Icon icon="mingcute:check-fill" className="w-5 h-5" />}
                                {job.status === "failed" && <Icon icon="mingcute:close-fill" className="w-5 h-5" />}
                                {(job.status === "pending" || job.status === "processing") &&
                                    <Icon icon="mingcute:loading-line" className="w-5 h-5 animate-spin" />
                                }
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <p className="font-medium truncate pr-4">{job.prompt}</p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                    <span>{formatDate(job.created_at)}</span>
                                    <span>•</span>
                                    <span className={cn(
                                        "font-medium",
                                        job.status === "completed" && "text-green-500",
                                        job.status === "failed" && "text-red-500",
                                        (job.status === "pending" || job.status === "processing") && "text-primary"
                                    )}>
                                        {job.status === "completed" ? "Selesai" :
                                            job.status === "failed" ? "Gagal" :
                                                "Sedang Proses"}
                                    </span>
                                </div>
                            </div>

                            {/* Expand Icon */}
                            <Icon
                                icon="mingcute:down-line"
                                className={cn(
                                    "w-5 h-5 text-muted-foreground transition-transform",
                                    expandedJobId === job.id && "rotate-180"
                                )}
                            />
                        </div>

                        {/* Expanded Content (Progress View) */}
                        {expandedJobId === job.id && (
                            <div className="border-t border-border p-4 bg-background/50">
                                <LongVideoProgress
                                    jobId={job.id}
                                    onComplete={() => {
                                        // Update local status if needed
                                        setJobs(jobs.map(j => j.id === job.id ? { ...j, status: "completed" } : j));
                                    }}
                                    onError={() => {
                                        setJobs(jobs.map(j => j.id === job.id ? { ...j, status: "failed" } : j));
                                    }}
                                    onCancel={() => {
                                        setJobs(jobs.map(j => j.id === job.id ? { ...j, status: "failed" } : j));
                                        setExpandedJobId(null);
                                    }}
                                />
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="flex justify-center pt-4">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={fetchHistory}
                    className="text-muted-foreground"
                >
                    <Icon icon="mingcute:refresh-line" className="w-4 h-4 mr-2" />
                    Refresh Status
                </Button>
            </div>
        </div >
    );
}
