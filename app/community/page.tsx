"use client";

import { useState, useEffect, useCallback } from "react";
import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/toast";
import { Sidebar } from "@/components/sidebar";
import { Mascot } from "@/components/mascot";
import { GalleryImage, ModalImage } from "@/components/optimized-image";

interface CommunityItem {
    id: string;
    type: "image" | "video";
    prompt: string;
    file_url: string;
    thumbnail_url: string | null;
    width: number | null;
    height: number | null;
    duration: number | null;
    created_at: string;
    metadata: Record<string, unknown> | null;
    creator: {
        name: string;
        avatar_url: string | null;
    };
}

type FilterType = "all" | "image" | "video";

const ITEMS_PER_PAGE = 24;

/**
 * Format relative time
 */
function formatRelativeTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("id-ID", { month: "short", day: "numeric" });
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

/**
 * Get proxied video URL for videos from external CDNs
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

export default function CommunityPage() {
    const { user } = useAuth();
    const { showToast } = useToast();

    // States
    const [items, setItems] = useState<CommunityItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [filterType, setFilterType] = useState<FilterType>("all");
    const [hasMore, setHasMore] = useState(false);
    const [offset, setOffset] = useState(0);
    const [total, setTotal] = useState(0);
    const [selectedItem, setSelectedItem] = useState<CommunityItem | null>(null);

    // Fetch community items
    const fetchItems = useCallback(async (reset = false) => {
        const currentOffset = reset ? 0 : offset;
        if (reset) {
            setLoading(true);
        } else {
            setLoadingMore(true);
        }

        try {
            const typeParam = filterType !== "all" ? `&type=${filterType}` : "";
            const res = await fetch(`/api/community?limit=${ITEMS_PER_PAGE}&offset=${currentOffset}${typeParam}`);
            const data = await res.json();

            if (res.ok) {
                if (reset) {
                    setItems(data.items || []);
                } else {
                    setItems(prev => [...prev, ...(data.items || [])]);
                }
                setHasMore(data.hasMore);
                setOffset(data.nextOffset);
                setTotal(data.total);
            }
        } catch (error) {
            console.error("Failed to fetch community:", error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [filterType, offset]);

    // Initial load & filter change
    useEffect(() => {
        setOffset(0);
        fetchItems(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterType]);

    // Handle copy prompt
    const handleCopyPrompt = async (prompt: string) => {
        const success = await copyToClipboard(prompt);
        showToast(success ? "Prompt copied!" : "Failed to copy", success ? "success" : "error");
    };

    // Stats
    const imageCount = items.filter(i => i.type === "image").length;
    const videoCount = items.filter(i => i.type === "video").length;

    // If user is logged in, show with sidebar
    if (user) {
        return (
            <div className="flex min-h-screen min-h-[100dvh] w-full bg-background text-foreground">
                <Sidebar />
                <main className="flex-1 pl-0 md:pl-28 pb-20 md:pb-0">
                    {renderContent()}
                </main>
                {selectedItem && renderModal()}
            </div>
        );
    }

    // Public view (no sidebar)
    return (
        <div className="min-h-screen w-full bg-gradient-to-b from-[#1c1917] to-[#0c0a09] text-white">
            {/* Navigation */}
            <header className="sticky top-0 z-50 bg-[#1c1917]/80 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <Link href="/" className="flex items-center gap-2">
                            <Icon icon="mingcute:squirrel-fill" className="w-6 h-6 text-primary" />
                            <span className="font-wayang text-lg font-semibold">squirr.ai</span>
                        </Link>
                        <div className="flex items-center gap-4">
                            <Link href="/pricing" className="text-sm text-white/60 hover:text-white transition-colors">
                                pricing
                            </Link>
                            <Link href="/login" className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors">
                                Login
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 md:px-8 py-8">
                {renderContent()}
            </main>

            {selectedItem && renderModal()}
        </div>
    );

    function renderContent() {
        return (
            <div className="space-y-6">
                {/* Header */}
                <div className="space-y-2">
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                        Community <span className="text-primary">Showcase</span>
                    </h1>
                    <p className="text-muted-foreground text-sm md:text-base">
                        Karya-karya keren dari komunitas SQUIRR.AI. Lihat prompt & buat versimu sendiri!
                    </p>
                </div>

                {/* Stats & Filter */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{total.toLocaleString()} karya</span>
                        <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                        <span>{imageCount} gambar</span>
                        <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                        <span>{videoCount} video</span>
                    </div>

                    <div className="flex items-center p-1 bg-surface-2 rounded-lg border border-border/50">
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
                                {type === "all" ? "Semua" : type === "image" ? "Gambar" : "Video"}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Loading */}
                {loading && (
                    <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="aspect-square rounded-xl bg-surface-2 animate-pulse" />
                        ))}
                    </div>
                )}

                {/* Grid */}
                {!loading && items.length > 0 && (
                    <>
                        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                            {items.map((item) => (
                                <div
                                    key={item.id}
                                    className="group relative aspect-square rounded-xl overflow-hidden bg-surface-2 border border-border/50 cursor-pointer hover:border-primary/50 transition-all"
                                    onClick={() => setSelectedItem(item)}
                                >
                                    {/* Media - Optimized */}
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
                                    ) : (
                                        <GalleryImage
                                            src={item.thumbnail_url || item.file_url}
                                            alt={item.prompt}
                                            className="w-full h-full"
                                        />
                                    )}

                                    {/* Video Badge */}
                                    {item.type === "video" && (
                                        <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-lg text-[10px] text-white font-medium flex items-center gap-1">
                                            <Icon icon="mingcute:play-fill" className="w-3 h-3" />
                                            {(item.metadata as any)?.duration || "5"}s
                                        </div>
                                    )}

                                    {/* Hover Overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-3">
                                        <p className="text-white text-xs line-clamp-2 mb-2">{item.prompt}</p>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                                                    <Icon icon="mingcute:user-3-fill" className="w-3 h-3 text-primary" />
                                                </div>
                                                <span className="text-white/70 text-[10px]">{item.creator.name}</span>
                                            </div>
                                            <span className="text-white/50 text-[10px]">{formatRelativeTime(item.created_at)}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Load More */}
                        {hasMore && (
                            <div className="flex justify-center pt-4">
                                <button
                                    onClick={() => fetchItems(false)}
                                    disabled={loadingMore}
                                    className="px-6 py-2.5 rounded-xl bg-surface-2 border border-border hover:border-primary/50 text-sm font-medium transition-all disabled:opacity-50 flex items-center gap-2"
                                >
                                    {loadingMore ? (
                                        <>
                                            <Icon icon="mingcute:loading-line" className="w-4 h-4 animate-spin" />
                                            Loading...
                                        </>
                                    ) : (
                                        <>
                                            <Icon icon="mingcute:arrow-down-line" className="w-4 h-4" />
                                            Load More
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </>
                )}

                {/* Empty State */}
                {!loading && items.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <Mascot expression="confused" size="large" />
                        <h3 className="font-semibold text-lg mb-2 mt-6">Belum ada karya</h3>
                        <p className="text-muted-foreground text-sm mb-6">
                            Jadilah yang pertama berbagi karya di community!
                        </p>
                        <Link href="/login">
                            <button className="px-6 py-2.5 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 transition-all">
                                Mulai Buat
                            </button>
                        </Link>
                    </div>
                )}

                {/* CTA for non-logged in users */}
                {!user && items.length > 0 && (
                    <div className="bg-gradient-to-r from-primary/20 to-primary/5 border border-primary/20 rounded-2xl p-6 md:p-8 text-center">
                        <h3 className="text-xl md:text-2xl font-bold mb-2">
                            Ingin karya kamu tampil di sini?
                        </h3>
                        <p className="text-muted-foreground mb-6">
                            Daftar gratis dan mulai generate gambar & video dengan AI!
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                            <Link href="/register">
                                <button className="px-6 py-2.5 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 transition-all flex items-center gap-2">
                                    <Icon icon="mingcute:sparkles-2-fill" className="w-4 h-4" />
                                    Daftar Gratis
                                </button>
                            </Link>
                            <Link href="/login">
                                <button className="px-6 py-2.5 rounded-xl bg-surface-2 border border-border text-foreground font-medium hover:bg-surface-3 transition-all">
                                    Sudah punya akun? Login
                                </button>
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    function renderModal() {
        if (!selectedItem) return null;

        return (
            <div
                className="fixed inset-0 z-[500] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
                onClick={() => setSelectedItem(null)}
            >
                <div
                    className="relative max-w-5xl w-full bg-card rounded-2xl overflow-hidden shadow-2xl animate-scale-in max-h-[90vh] overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Close Button */}
                    <button
                        onClick={() => setSelectedItem(null)}
                        className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 transition-colors text-white"
                    >
                        <Icon icon="mingcute:close-line" className="w-5 h-5" />
                    </button>

                    <div className="flex flex-col lg:flex-row">
                        {/* Media - Optimized */}
                        <div className="flex-1 bg-black min-h-[300px] lg:min-h-[500px] flex items-center justify-center">
                            {selectedItem.type === "video" && selectedItem.file_url ? (
                                <video
                                    src={getProxiedVideoUrl(selectedItem.file_url)}
                                    className="w-full h-full object-contain max-h-[70vh]"
                                    controls
                                    autoPlay
                                    loop
                                />
                            ) : (
                                <ModalImage
                                    src={selectedItem.file_url}
                                    alt={selectedItem.prompt}
                                    className="max-h-[70vh]"
                                />
                            )}
                        </div>

                        {/* Details Panel */}
                        <div className="w-full lg:w-96 p-6 space-y-6 bg-surface-1">
                            {/* Creator Info */}
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                                    <Icon icon="mingcute:user-3-fill" className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <p className="font-medium">{selectedItem.creator.name}</p>
                                    <p className="text-xs text-muted-foreground">{formatRelativeTime(selectedItem.created_at)}</p>
                                </div>
                            </div>

                            {/* Type Badge */}
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-primary px-2 py-1 bg-primary/10 rounded uppercase">
                                    {selectedItem.type}
                                </span>
                                {selectedItem.type === "video" && (selectedItem.metadata as any)?.duration && (
                                    <span className="text-xs text-muted-foreground bg-surface-2 px-2 py-1 rounded">
                                        {(selectedItem.metadata as any).duration}s
                                    </span>
                                )}
                            </div>

                            {/* Prompt */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Prompt</h4>
                                    <button
                                        onClick={() => handleCopyPrompt(selectedItem.prompt)}
                                        className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                                    >
                                        <Icon icon="mingcute:copy-2-line" className="w-3.5 h-3.5" />
                                        Copy
                                    </button>
                                </div>
                                <p className="text-sm text-foreground bg-surface-2 rounded-lg p-3 border border-border/50">
                                    {selectedItem.prompt}
                                </p>
                            </div>

                            {/* CTA */}
                            {!user && (
                                <div className="pt-4 border-t border-border">
                                    <p className="text-sm text-muted-foreground mb-3">
                                        Suka karya ini? Buat versimu sendiri!
                                    </p>
                                    <Link href="/login" className="block">
                                        <button className="w-full py-3 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 transition-all flex items-center justify-center gap-2">
                                            <Icon icon="mingcute:sparkles-2-fill" className="w-4 h-4" />
                                            Coba Buat Sekarang
                                        </button>
                                    </Link>
                                </div>
                            )}

                            {user && (
                                <div className="pt-4 border-t border-border">
                                    <Link href={`/?view=create`} className="block">
                                        <button
                                            onClick={() => {
                                                // Copy prompt to clipboard for easy paste
                                                copyToClipboard(selectedItem.prompt);
                                                showToast("Prompt copied! Paste it in the generator.", "success");
                                            }}
                                            className="w-full py-3 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
                                        >
                                            <Icon icon="mingcute:copy-2-fill" className="w-4 h-4" />
                                            Copy & Create Similar
                                        </button>
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}
