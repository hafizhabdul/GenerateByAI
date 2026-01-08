"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Icon } from "@iconify/react";
import type { Generation } from "@/lib/supabase/types";

type FilterType = "all" | "image" | "video";

/**
 * Get proxied video URL for videos from external CDNs (fal.ai)
 * This solves CORS issues when playing videos in the browser
 */
function getProxiedVideoUrl(url: string | undefined | null): string | undefined {
    if (!url) return undefined;

    // Check if URL is from fal.ai CDN - needs proxy
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

export default function GalleryPage() {
    const router = useRouter();

    const { user } = useAuth();
    const { showToast } = useToast();
    const [view, setView] = useState<"grid" | "list">("grid");
    const [searchQuery, setSearchQuery] = useState("");
    const [filterType, setFilterType] = useState<FilterType>("all");
    const [selectedItem, setSelectedItem] = useState<Generation | null>(null);
    const [generations, setGenerations] = useState<Generation[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDownloading, setIsDownloading] = useState(false);

    useEffect(() => {
        if (user) {
            fetchGenerations();
        } else {
            setLoading(false);
        }
    }, [user]);

    // Poll for processing videos to check their status
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
                        // Update local state with completed video
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
        }, 5000); // Poll every 5 seconds

        return () => clearInterval(pollInterval);
    }, [generations]);

    const fetchGenerations = async () => {
        try {
            const res = await fetch("/api/generations");
            const data = await res.json();
            if (res.ok) {
                setGenerations(data.generations || []);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleFavorite = async (id: string, currentValue: boolean) => {
        try {
            const res = await fetch("/api/generations", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, is_favorite: !currentValue }),
            });

            if (res.ok) {
                setGenerations(prev =>
                    prev.map(g => g.id === id ? { ...g, is_favorite: !currentValue } : g)
                );
                showToast(currentValue ? "Removed from favorites" : "Added to favorites", "success");
            }
        } catch (error) {
            showToast("Failed to update", "error");
        }
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

    const filteredItems = generations.filter(item => {
        const matchesSearch = item.prompt.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = filterType === "all" || item.type === filterType;
        return matchesSearch && matchesType;
    });

    const imageCount = generations.filter(g => g.type === "image").length;
    const videoCount = generations.filter(g => g.type === "video").length;
    const processingCount = generations.filter(g => g.status === "processing").length;

    const handleRefresh = async () => {
        setLoading(true);
        await fetchGenerations();
    };

    return (
        <div className="flex min-h-screen min-h-[100dvh] w-full bg-background text-foreground">
            <Sidebar />

            <main className="flex-1 pl-0 md:pl-28 pb-20 md:pb-0">
                <div className="container-fluid py-4 md:py-6 lg:py-10 space-y-4 md:space-y-6">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 md:gap-4">
                        <div className="space-y-1">
                            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
                                Gallery
                            </h1>
                            <p className="text-muted-foreground text-xs md:text-sm">
                                {loading ? "Loading..." : `${filteredItems.length} items (${imageCount} images, ${videoCount} videos)`}
                                {processingCount > 0 && (
                                    <span className="ml-2 text-primary">• {processingCount} generating</span>
                                )}
                            </p>
                        </div>

                        {/* View Toggle + Refresh */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleRefresh}
                                disabled={loading}
                                className="px-3 py-2 rounded-xl bg-surface-2 hover:bg-surface-3 transition-colors disabled:opacity-50 text-xs font-medium text-foreground"
                                title="Refresh"
                            >
                                {loading ? "Syncing..." : "Refresh"}
                            </button>
                            <div className="flex items-center p-1 bg-surface-2 rounded-xl">
                                <button
                                    onClick={() => setView("grid")}
                                    className={`px-3 py-2 rounded-lg transition-colors text-xs font-medium ${view === "grid" ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white"}`}
                                >
                                    Grid
                                </button>
                                <button
                                    onClick={() => setView("list")}
                                    className={`px-3 py-2 rounded-lg transition-colors text-xs font-medium ${view === "list" ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white"}`}
                                >
                                    List
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Search & Filter Bar */}
                    <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by prompt..."
                                className="w-full h-10 md:h-11 px-4 bg-surface-2 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                            />
                        </div>
                        <div className="flex items-center p-1 bg-surface-2 rounded-xl">
                            <button
                                onClick={() => setFilterType("all")}
                                className={`px-4 py-2 rounded-lg text-sm transition-colors ${filterType === "all" ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white"}`}
                            >
                                All
                            </button>
                            <button
                                onClick={() => setFilterType("image")}
                                className={`px-4 py-2 rounded-lg text-sm transition-colors ${filterType === "image" ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white"}`}
                            >
                                Images
                            </button>
                            <button
                                onClick={() => setFilterType("video")}
                                className={`px-4 py-2 rounded-lg text-sm transition-colors ${filterType === "video" ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white"}`}
                            >
                                Videos
                            </button>
                        </div>
                    </div>

                    {/* Loading Skeleton */}
                    {loading && (
                        <div className={`grid gap-3 md:gap-4 ${view === "grid" ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4" : "grid-cols-1"}`}>
                            {[...Array(8)].map((_, i) => (
                                <div key={i} className="rounded-xl md:rounded-2xl overflow-hidden bg-surface-2 border border-border animate-pulse">
                                    <div className="aspect-square bg-white/5" />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Gallery Grid */}
                    {!loading && filteredItems.length > 0 && (
                        <div className={`grid gap-3 md:gap-4 ${view === "grid" ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4" : "grid-cols-1"}`}>
                            {filteredItems.map((item) => (
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
                                                    <img
                                                        src={item.file_url}
                                                        alt={item.prompt}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-surface-2 text-muted-foreground text-xs">
                                                        No media
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        {/* Type Badge - Minimal */}
                                        {item.type === "video" && (
                                            <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/60 backdrop-blur-sm rounded text-[10px] text-white font-medium">
                                                {item.metadata?.duration || "5"}s
                                            </div>
                                        )}

                                        {/* Hover Overlay */}
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-4">
                                            <p className="text-white text-xs line-clamp-2 mb-2">{item.prompt}</p>
                                            <div className="flex items-center justify-between">
                                                <span className="text-white/60 text-[10px]">
                                                    {new Date(item.created_at).toLocaleDateString()}
                                                </span>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDownload(item); }}
                                                    className="text-xs text-white hover:text-primary transition-colors hover:underline"
                                                >
                                                    Download
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}

                    {/* Empty State - Minimal */}
                    {!loading && filteredItems.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            {searchQuery || filterType !== "all" ? (
                                <>
                                    <h3 className="font-semibold text-lg mb-2">No items found</h3>
                                    <Button variant="ghost" onClick={() => { setSearchQuery(""); setFilterType("all"); }}>
                                        Clear Filters
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <h3 className="font-semibold text-lg mb-2">Gallery is empty</h3>
                                    <p className="text-muted-foreground text-sm mb-6">
                                        Your generated creations will appear here.
                                    </p>
                                    <div className="flex justify-center gap-3">
                                        <Button variant="primary" onClick={() => router.push("/?view=create")}>
                                            Generate Image
                                        </Button>
                                    </div>
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
                        className="relative max-w-4xl w-full bg-card rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl animate-scale-in mx-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setSelectedItem(null)}
                            className="absolute top-3 right-3 md:top-4 md:right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 transition-colors text-white text-lg font-medium"
                        >
                            ✕
                        </button>

                        <div className="flex flex-col md:flex-row">
                            <div className="flex-1 bg-black">
                                {selectedItem.status === "processing" ? (
                                    <div className="w-full h-64 md:h-[500px] flex flex-col items-center justify-center text-white">
                                        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                                        <p className="text-lg font-medium">Video is being generated...</p>
                                        <p className="text-sm text-white/60">This may take a few minutes</p>
                                    </div>
                                ) : selectedItem.status === "failed" ? (
                                    <div className="w-full h-64 md:h-[500px] flex flex-col items-center justify-center text-red-400">
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
                            <div className="w-full md:w-80 p-4 md:p-6 space-y-3 md:space-y-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-primary px-2 py-0.5 bg-primary/10 rounded uppercase tracking-wider">
                                        {selectedItem.type}
                                    </span>
                                </div>

                                <div>
                                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Prompt</h4>
                                    <p className="text-foreground text-sm">{selectedItem.prompt}</p>
                                </div>

                                <div className="pt-4 space-y-2">
                                    <p className="text-xs text-muted-foreground">
                                        Created {new Date(selectedItem.created_at).toLocaleString()}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Tokens used: {selectedItem.tokens_used}
                                    </p>
                                    {selectedItem.type === "video" && selectedItem.metadata?.duration && (
                                        <p className="text-xs text-muted-foreground">
                                            Duration: {selectedItem.metadata.duration}s
                                        </p>
                                    )}
                                </div>

                                <div className="flex gap-2 pt-3 md:pt-4">
                                    <Button
                                        variant="primary"
                                        className="flex-1"
                                        onClick={() => handleDownload(selectedItem)}
                                        disabled={isDownloading}
                                    >
                                        {isDownloading ? "..." : "Download"}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        onClick={() => handleDelete(selectedItem.id)}
                                    >
                                        Delete
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
