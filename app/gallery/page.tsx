"use client";

import { useState, useEffect, useCallback } from "react";
import { Sidebar } from "@/components/sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";
import type { Generation } from "@/lib/supabase/types";

type FilterType = "all" | "image" | "video";
type ViewMode = "grid" | "list";

const ITEMS_PER_PAGE = 20;

/**
 * Get proxied video URL for videos from external CDNs (fal.ai)
 */
function getProxiedVideoUrl(url: string | undefined | null): string | undefined {
    if (!url) return undefined;
    const falDomains = ["fal.media", "v3.fal.media", "fal.ai"];
    try {
        const urlObj = new URL(url);
        const needsProxy = falDomains.some(domain =>
            urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`)
        );
        if (needsProxy) {
            return `/api/video-proxy?url=${encodeURIComponent(url)}`;
        }
    } catch {
        // Invalid URL, return as-is
    }
    return url;
}

/**
 * Format relative time like fal.ai (e.g., "about 5 hours ago")
 */
function formatRelativeTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `about ${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/**
 * Copy text to clipboard
 */
async function copyToClipboard(text: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        return false;
    }
}

export default function GalleryPage() {
    const router = useRouter();
    const { user } = useAuth();
    const { showToast } = useToast();

    // View & Filter States
    const [view, setView] = useState<ViewMode>("list");
    const [searchQuery, setSearchQuery] = useState("");
    const [filterType, setFilterType] = useState<FilterType>("all");

    // Data States
    const [generations, setGenerations] = useState<Generation[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);

    // Selection & Modal
    const [selectedItem, setSelectedItem] = useState<Generation | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);

    // Fetch generations
    const fetchGenerations = useCallback(async (showRefreshing = false) => {
        if (showRefreshing) setRefreshing(true);
        else setLoading(true);

        try {
            const res = await fetch("/api/generations?limit=500");
            const data = await res.json();
            if (res.ok) {
                setGenerations(data.generations || []);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        if (user) {
            fetchGenerations();
        } else {
            setLoading(false);
        }
    }, [user, fetchGenerations]);

    // Poll for processing videos
    useEffect(() => {
        const processingVideos = generations.filter(
            g => g.type === "video" && g.status === "processing" && g.metadata?.taskId
        );

        if (processingVideos.length === 0) return;

        const pollInterval = setInterval(async () => {
            for (const video of processingVideos) {
                try {
                    const taskId = video.metadata?.taskId;
                    if (!taskId) continue;

                    const res = await fetch(
                        `/api/video-status?taskId=${taskId}&generationId=${video.id}&type=${video.metadata?.sourceType || "image2video"}`
                    );
                    const data = await res.json();

                    if (data.status === "completed" && data.url) {
                        setGenerations(prev =>
                            prev.map(g =>
                                g.id === video.id
                                    ? { ...g, status: "completed" as const, file_url: data.url }
                                    : g
                            )
                        );
                    } else if (data.status === "failed") {
                        setGenerations(prev =>
                            prev.map(g =>
                                g.id === video.id
                                    ? { ...g, status: "failed" as const }
                                    : g
                            )
                        );
                    }
                } catch (error) {
                    console.error("Error polling video status:", error);
                }
            }
        }, 5000);

        return () => clearInterval(pollInterval);
    }, [generations]);

    // Filter & Search
    const filteredItems = generations.filter(item => {
        const matchesSearch = item.prompt.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = filterType === "all" || item.type === filterType;
        return matchesSearch && matchesType;
    });

    // Pagination
    const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
    const paginatedItems = filteredItems.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    // Reset page when filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, filterType]);

    // Stats
    const imageCount = generations.filter(g => g.type === "image").length;
    const videoCount = generations.filter(g => g.type === "video").length;
    const processingCount = generations.filter(g => g.status === "processing").length;

    // Actions
    const handleRefresh = () => fetchGenerations(true);

    const handleDownload = async (item: Generation) => {
        if (!item.file_url || isDownloading) return;
        setIsDownloading(true);
        try {
            const downloadUrl = `/api/download?url=${encodeURIComponent(item.file_url)}`;
            const response = await fetch(downloadUrl);
            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: "Download failed" }));
                throw new Error(error.error || "Failed to download");
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            const ext = item.type === "video" ? "mp4" : "png";
            a.download = `ai-${item.type}-${Date.now()}.${ext}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            showToast(`${item.type === "video" ? "Video" : "Image"} downloaded!`, "success");
        } catch (error) {
            console.error("Download error:", error);
            showToast(error instanceof Error ? error.message : "Failed to download", "error");
        } finally {
            setIsDownloading(false);
        }
    };

    const handleCopyPrompt = async (prompt: string) => {
        const success = await copyToClipboard(prompt);
        showToast(success ? "Prompt copied!" : "Failed to copy", success ? "success" : "error");
    };

    const handleDelete = async (id: string) => {
        try {
            const res = await fetch("/api/generations", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id }),
            });

            if (res.ok) {
                setGenerations(prev => prev.filter(g => g.id !== id));
                setSelectedItem(null);
                showToast("Deleted successfully", "success");
            }
        } catch (error) {
            showToast("Failed to delete", "error");
        }
    };

    return (
        <div className="flex min-h-screen min-h-[100dvh] w-full bg-background text-foreground">
            <Sidebar />

            <main className="flex-1 pl-0 md:pl-28 pb-20 md:pb-0">
                <div className="container-fluid py-4 md:py-6 lg:py-8 space-y-4 md:space-y-5">
                    {/* Header - fal.ai style */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-0.5">
                            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
                                Gallery
                            </h1>
                            <p className="text-muted-foreground text-xs">
                                {loading ? "Loading..." : `${filteredItems.length} items (${imageCount} images, ${videoCount} videos)`}
                                {processingCount > 0 && (
                                    <span className="ml-2 text-primary animate-pulse">• {processingCount} generating</span>
                                )}
                            </p>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleRefresh}
                                disabled={loading || refreshing}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                            >
                                <Icon icon={refreshing ? "mingcute:loading-line" : "mingcute:refresh-1-line"} className={cn("w-4 h-4", refreshing && "animate-spin")} />
                                Refresh
                            </button>
                            <div className="flex items-center p-0.5 bg-surface-2 rounded-lg border border-border/50">
                                <button
                                    onClick={() => setView("grid")}
                                    className={cn(
                                        "p-1.5 rounded transition-colors",
                                        view === "grid" ? "bg-surface-3 text-foreground" : "text-muted-foreground hover:text-foreground"
                                    )}
                                    title="Grid view"
                                >
                                    <Icon icon="mingcute:grid-line" className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setView("list")}
                                    className={cn(
                                        "p-1.5 rounded transition-colors",
                                        view === "list" ? "bg-surface-3 text-foreground" : "text-muted-foreground hover:text-foreground"
                                    )}
                                    title="List view"
                                >
                                    <Icon icon="mingcute:list-check-line" className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Search & Filter Bar */}
                    <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
                        <div className="relative flex-1">
                            <Icon icon="mingcute:search-line" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by prompt..."
                                className="w-full h-9 pl-9 pr-4 bg-surface-2 border border-border/50 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all placeholder:text-muted-foreground/60"
                            />
                        </div>
                        <div className="flex items-center p-0.5 bg-surface-2 rounded-lg border border-border/50">
                            {(["all", "image", "video"] as FilterType[]).map((type) => (
                                <button
                                    key={type}
                                    onClick={() => setFilterType(type)}
                                    className={cn(
                                        "px-3 py-1.5 rounded text-xs font-medium transition-colors capitalize",
                                        filterType === type
                                            ? "bg-primary text-primary-foreground"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {type === "all" ? "All" : type === "image" ? "Images" : "Videos"}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Loading Skeleton */}
                    {loading && (
                        <div className="space-y-2">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="h-24 rounded-lg bg-surface-2 animate-pulse" />
                            ))}
                        </div>
                    )}

                    {/* List View - fal.ai style */}
                    {!loading && paginatedItems.length > 0 && view === "list" && (
                        <div className="space-y-2">
                            {paginatedItems.map((item) => (
                                <div
                                    key={item.id}
                                    className="group bg-surface-1 hover:bg-surface-2/80 border border-border/50 rounded-lg p-3 md:p-4 transition-colors cursor-pointer"
                                    onClick={() => setSelectedItem(item)}
                                >
                                    <div className="flex gap-3 md:gap-4">
                                        {/* Content */}
                                        <div className="flex-1 min-w-0 space-y-2">
                                            {/* Model Tag */}
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                                                    {item.type === "video" ? "video-gen" : "imagen-4"}
                                                </span>
                                                {item.status === "processing" && (
                                                    <span className="text-xs text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                        <Icon icon="mingcute:loading-line" className="w-3 h-3 animate-spin" />
                                                        Processing
                                                    </span>
                                                )}
                                                {item.status === "failed" && (
                                                    <span className="text-xs text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded">
                                                        Failed
                                                    </span>
                                                )}
                                                {item.status === "completed" && (
                                                    <span className="text-xs text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                                        200
                                                    </span>
                                                )}
                                            </div>

                                            {/* Time & ID */}
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <span>{formatRelativeTime(item.created_at)}</span>
                                                <span className="text-muted-foreground/50">•</span>
                                                <span className="font-mono text-[10px] truncate max-w-[180px]">{item.id}</span>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); copyToClipboard(item.id); showToast("ID copied!", "info"); }}
                                                    className="opacity-0 group-hover:opacity-100 hover:text-foreground transition-opacity"
                                                >
                                                    <Icon icon="mingcute:copy-2-line" className="w-3 h-3" />
                                                </button>
                                            </div>

                                            {/* Prompt */}
                                            <p className="text-sm text-foreground/90 line-clamp-2">{item.prompt}</p>

                                            {/* Metadata Tags */}
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                {item.type === "image" && (
                                                    <span className="text-[10px] font-medium text-muted-foreground bg-surface-3 px-1.5 py-0.5 rounded">
                                                        image_size 1024x1024
                                                    </span>
                                                )}
                                                {item.type === "video" && item.metadata?.duration && (
                                                    <span className="text-[10px] font-medium text-muted-foreground bg-surface-3 px-1.5 py-0.5 rounded">
                                                        duration {item.metadata.duration}s
                                                    </span>
                                                )}
                                                <span className="text-[10px] font-medium text-muted-foreground bg-surface-3 px-1.5 py-0.5 rounded">
                                                    {item.tokens_used} tokens
                                                </span>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-2 pt-1">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleCopyPrompt(item.prompt); }}
                                                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-surface-3"
                                                >
                                                    <Icon icon="mingcute:copy-2-line" className="w-3.5 h-3.5" />
                                                    Copy prompt
                                                </button>
                                                {item.file_url && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDownload(item); }}
                                                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-surface-3"
                                                    >
                                                        <Icon icon="mingcute:download-2-line" className="w-3.5 h-3.5" />
                                                        Download
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Thumbnail */}
                                        <div className="w-20 h-20 md:w-24 md:h-24 rounded-lg overflow-hidden bg-surface-3 shrink-0">
                                            {item.status === "processing" ? (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <Icon icon="mingcute:loading-line" className="w-6 h-6 text-muted-foreground animate-spin" />
                                                </div>
                                            ) : item.status === "failed" ? (
                                                <div className="w-full h-full flex items-center justify-center bg-red-500/10">
                                                    <Icon icon="mingcute:close-circle-line" className="w-6 h-6 text-red-500" />
                                                </div>
                                            ) : item.type === "video" && item.file_url ? (
                                                <video
                                                    src={getProxiedVideoUrl(item.file_url)}
                                                    className="w-full h-full object-cover"
                                                    muted
                                                    loop
                                                    playsInline
                                                    onMouseEnter={(e) => e.currentTarget.play()}
                                                    onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                                                />
                                            ) : item.file_url ? (
                                                <img src={item.file_url} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                                    <Icon icon="mingcute:pic-line" className="w-6 h-6" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Grid View */}
                    {!loading && paginatedItems.length > 0 && view === "grid" && (
                        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                            {paginatedItems.map((item) => (
                                <Card
                                    key={item.id}
                                    variant="default"
                                    padding="none"
                                    hover
                                    className="group overflow-hidden cursor-pointer"
                                    onClick={() => setSelectedItem(item)}
                                >
                                    <div className="relative aspect-square">
                                        {item.status === "processing" ? (
                                            <div className="w-full h-full flex flex-col items-center justify-center bg-surface-2 animate-pulse">
                                                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2" />
                                                <span className="text-xs text-muted-foreground">Generating...</span>
                                            </div>
                                        ) : item.status === "failed" ? (
                                            <div className="w-full h-full flex flex-col items-center justify-center bg-red-500/10">
                                                <Icon icon="mingcute:close-circle-line" className="w-8 h-8 text-red-500 mb-1" />
                                                <span className="text-xs text-red-500 font-medium">Failed</span>
                                            </div>
                                        ) : (
                                            <>
                                                {item.type === "video" && item.file_url ? (
                                                    <video
                                                        src={getProxiedVideoUrl(item.file_url)}
                                                        className="w-full h-full object-cover"
                                                        muted
                                                        loop
                                                        playsInline
                                                        onMouseEnter={(e) => e.currentTarget.play()}
                                                        onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                                                    />
                                                ) : item.file_url ? (
                                                    <img src={item.file_url} alt={item.prompt} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-surface-2 text-muted-foreground text-xs">
                                                        No media
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        {/* Type Badge */}
                                        {item.type === "video" && (
                                            <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/60 backdrop-blur-sm rounded text-[10px] text-white font-medium flex items-center gap-1">
                                                <Icon icon="mingcute:play-fill" className="w-2.5 h-2.5" />
                                                {item.metadata?.duration || "5"}s
                                            </div>
                                        )}

                                        {/* Hover Overlay */}
                                        <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-all duration-200 flex flex-col justify-end p-3">
                                            <p className="text-white text-xs line-clamp-2 mb-2">{item.prompt}</p>
                                            <div className="flex items-center justify-between">
                                                <span className="text-white/60 text-[10px]">
                                                    {formatRelativeTime(item.created_at)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}

                    {/* Pagination */}
                    {!loading && totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 pt-4">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-surface-2 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                <Icon icon="mingcute:arrow-left-line" className="w-4 h-4" />
                            </button>

                            <div className="flex items-center gap-1">
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    let pageNum: number;
                                    if (totalPages <= 5) {
                                        pageNum = i + 1;
                                    } else if (currentPage <= 3) {
                                        pageNum = i + 1;
                                    } else if (currentPage >= totalPages - 2) {
                                        pageNum = totalPages - 4 + i;
                                    } else {
                                        pageNum = currentPage - 2 + i;
                                    }

                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => setCurrentPage(pageNum)}
                                            className={cn(
                                                "w-8 h-8 rounded-lg text-sm font-medium transition-colors",
                                                currentPage === pageNum
                                                    ? "bg-primary text-primary-foreground"
                                                    : "text-muted-foreground hover:text-foreground hover:bg-surface-2"
                                            )}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}
                            </div>

                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-surface-2 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                <Icon icon="mingcute:arrow-right-line" className="w-4 h-4" />
                            </button>

                            <span className="text-xs text-muted-foreground ml-2">
                                Page {currentPage} of {totalPages}
                            </span>
                        </div>
                    )}

                    {/* Empty State */}
                    {!loading && filteredItems.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            {searchQuery || filterType !== "all" ? (
                                <>
                                    <Icon icon="mingcute:search-line" className="w-12 h-12 text-muted-foreground/30 mb-4" />
                                    <h3 className="font-semibold text-lg mb-2">No items found</h3>
                                    <p className="text-muted-foreground text-sm mb-4">Try adjusting your search or filters</p>
                                    <Button variant="ghost" onClick={() => { setSearchQuery(""); setFilterType("all"); }}>
                                        Clear Filters
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Icon icon="mingcute:pic-line" className="w-12 h-12 text-muted-foreground/30 mb-4" />
                                    <h3 className="font-semibold text-lg mb-2">Gallery is empty</h3>
                                    <p className="text-muted-foreground text-sm mb-6">
                                        Your generated creations will appear here.
                                    </p>
                                    <Button variant="primary" onClick={() => router.push("/?view=create")}>
                                        Generate Your First Creation
                                    </Button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* Detail Modal */}
            {selectedItem && (
                <div
                    className="fixed inset-0 z-[500] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
                    onClick={() => setSelectedItem(null)}
                >
                    <div
                        className="relative max-w-4xl w-full bg-card rounded-2xl overflow-hidden shadow-2xl animate-scale-in"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setSelectedItem(null)}
                            className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 transition-colors text-white"
                        >
                            <Icon icon="mingcute:close-line" className="w-5 h-5" />
                        </button>

                        <div className="flex flex-col md:flex-row">
                            <div className="flex-1 bg-black">
                                {selectedItem.status === "processing" ? (
                                    <div className="w-full h-64 md:h-[500px] flex flex-col items-center justify-center text-white">
                                        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                                        <p className="text-lg font-medium">Generating...</p>
                                        <p className="text-sm text-white/60">This may take a few minutes</p>
                                    </div>
                                ) : selectedItem.status === "failed" ? (
                                    <div className="w-full h-64 md:h-[500px] flex flex-col items-center justify-center text-red-400">
                                        <Icon icon="mingcute:close-circle-line" className="w-12 h-12 mb-3" />
                                        <p className="text-lg font-medium">Generation Failed</p>
                                    </div>
                                ) : (
                                    <>
                                        {selectedItem.type === "video" && selectedItem.file_url ? (
                                            <video
                                                src={getProxiedVideoUrl(selectedItem.file_url)}
                                                className="w-full h-64 md:h-[500px] object-contain"
                                                controls
                                                autoPlay
                                                loop
                                            />
                                        ) : selectedItem.file_url ? (
                                            <img
                                                src={selectedItem.file_url}
                                                alt={selectedItem.prompt}
                                                className="w-full h-64 md:h-[500px] object-contain"
                                            />
                                        ) : (
                                            <div className="w-full h-64 md:h-[500px] flex items-center justify-center text-white/40">
                                                <p>Media not available</p>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                            <div className="w-full md:w-80 p-4 md:p-6 space-y-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-primary px-2 py-0.5 bg-primary/10 rounded uppercase">
                                        {selectedItem.type}
                                    </span>
                                    <span className={cn(
                                        "text-xs px-2 py-0.5 rounded",
                                        selectedItem.status === "completed" ? "bg-emerald-500/10 text-emerald-500" :
                                            selectedItem.status === "failed" ? "bg-red-500/10 text-red-500" :
                                                "bg-amber-500/10 text-amber-500"
                                    )}>
                                        {selectedItem.status}
                                    </span>
                                </div>

                                <div>
                                    <h4 className="text-xs font-medium text-muted-foreground mb-1">Prompt</h4>
                                    <p className="text-foreground text-sm">{selectedItem.prompt}</p>
                                </div>

                                <div className="pt-2 space-y-1.5 text-xs text-muted-foreground">
                                    <p>Created {formatRelativeTime(selectedItem.created_at)}</p>
                                    <p>Tokens used: {selectedItem.tokens_used}</p>
                                    {selectedItem.type === "video" && selectedItem.metadata?.duration && (
                                        <p>Duration: {selectedItem.metadata.duration}s</p>
                                    )}
                                    <p className="font-mono text-[10px] truncate">ID: {selectedItem.id}</p>
                                </div>

                                <div className="flex gap-2 pt-3">
                                    <Button
                                        variant="primary"
                                        className="flex-1"
                                        onClick={() => handleDownload(selectedItem)}
                                        disabled={isDownloading || !selectedItem.file_url}
                                    >
                                        {isDownloading ? "..." : "Download"}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        onClick={() => handleCopyPrompt(selectedItem.prompt)}
                                    >
                                        <Icon icon="mingcute:copy-2-line" className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        onClick={() => handleDelete(selectedItem.id)}
                                        className="text-red-500 hover:text-red-400"
                                    >
                                        <Icon icon="mingcute:delete-2-line" className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
