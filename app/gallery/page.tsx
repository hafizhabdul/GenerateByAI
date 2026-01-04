"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth-context";
import { Icon } from "@iconify/react";
import type { Generation } from "@/lib/supabase/types";

type FilterType = "all" | "image" | "video";

export default function GalleryPage() {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [view, setView] = useState<"grid" | "list">("grid");
    const [searchQuery, setSearchQuery] = useState("");
    const [filterType, setFilterType] = useState<FilterType>("all");
    const [selectedItem, setSelectedItem] = useState<Generation | null>(null);
    const [generations, setGenerations] = useState<Generation[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetchGenerations();
        } else {
            setLoading(false);
        }
    }, [user]);

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

    const filteredItems = generations.filter(item => {
        const matchesSearch = item.prompt.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = filterType === "all" || item.type === filterType;
        return matchesSearch && matchesType;
    });

    const imageCount = generations.filter(g => g.type === "image").length;
    const videoCount = generations.filter(g => g.type === "video").length;

    return (
        <div className="flex min-h-screen min-h-[100dvh] w-full bg-background text-foreground">
            <Sidebar />

            <main className="flex-1 pl-0 md:pl-28 pb-20 md:pb-0">
                <div className="container-fluid py-6 md:py-10 space-y-6">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <h1 className="font-bold tracking-tight gradient-text" style={{ fontSize: "var(--text-4xl)" }}>
                                Gallery
                            </h1>
                            <p className="text-muted-foreground text-sm">
                                {loading ? "Loading..." : `${filteredItems.length} items (${imageCount} images, ${videoCount} videos)`}
                            </p>
                        </div>

                        {/* View Toggle */}
                        <div className="flex items-center gap-2">
                            <div className="flex items-center p-1 bg-surface-2 rounded-xl">
                                <button
                                    onClick={() => setView("grid")}
                                    className={`p-2 rounded-lg transition-colors ${view === "grid" ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white"}`}
                                >
                                    <Icon icon="ph:grid-four" className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setView("list")}
                                    className={`p-2 rounded-lg transition-colors ${view === "list" ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white"}`}
                                >
                                    <Icon icon="ph:rows" className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Search & Filter Bar */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Icon icon="ph:magnifying-glass" className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by prompt..."
                                className="w-full h-11 pl-11 pr-4 bg-surface-2 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                            />
                        </div>
                        <div className="flex items-center p-1 bg-surface-2 rounded-xl">
                            <button
                                onClick={() => setFilterType("all")}
                                className={`px-3 py-2 rounded-lg text-sm transition-colors ${filterType === "all" ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white"}`}
                            >
                                All
                            </button>
                            <button
                                onClick={() => setFilterType("image")}
                                className={`px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-1.5 ${filterType === "image" ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white"}`}
                            >
                                <Icon icon="ph:image-duotone" className="w-4 h-4" />
                                Images
                            </button>
                            <button
                                onClick={() => setFilterType("video")}
                                className={`px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-1.5 ${filterType === "video" ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white"}`}
                            >
                                <Icon icon="ph:video-duotone" className="w-4 h-4" />
                                Videos
                            </button>
                        </div>
                    </div>

                    {/* Loading */}
                    {loading && (
                        <div className="flex items-center justify-center py-20">
                            <Icon icon="ph:spinner" className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    )}

                    {/* Gallery Grid */}
                    {!loading && filteredItems.length > 0 && (
                        <div className={`grid gap-4 ${view === "grid" ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4" : "grid-cols-1"}`}>
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
                                        {item.type === "video" ? (
                                            <video
                                                src={item.file_url}
                                                className="w-full h-full object-cover"
                                                muted
                                                loop
                                                playsInline
                                                onMouseEnter={(e) => e.currentTarget.play()}
                                                onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                                            />
                                        ) : (
                                            <img
                                                src={item.file_url}
                                                alt={item.prompt}
                                                className="w-full h-full object-cover"
                                            />
                                        )}

                                        {/* Type Badge */}
                                        {item.type === "video" && (
                                            <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-lg flex items-center gap-1">
                                                <Icon icon="ph:video-fill" className="w-3 h-3 text-violet-400" />
                                                <span className="text-xs text-white">{item.metadata?.duration || "5"}s</span>
                                            </div>
                                        )}

                                        {/* Hover Overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-4">
                                            <p className="text-white text-sm line-clamp-2 mb-2">{item.prompt}</p>
                                            <div className="flex items-center justify-between">
                                                <span className="text-white/60 text-xs">
                                                    {new Date(item.created_at).toLocaleDateString()}
                                                </span>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleToggleFavorite(item.id, item.is_favorite); }}
                                                        className={`p-1.5 rounded-lg hover:bg-white/20 transition-colors ${item.is_favorite ? "text-red-400" : "text-white/60"}`}
                                                    >
                                                        <Icon icon={item.is_favorite ? "ph:heart-fill" : "ph:heart"} className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}

                    {/* Empty State */}
                    {!loading && filteredItems.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-16 h-16 rounded-full bg-surface-2 flex items-center justify-center mb-4">
                                <Icon icon="ph:magnifying-glass-duotone" className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <h3 className="font-semibold text-lg mb-1">
                                {searchQuery || filterType !== "all" ? "No items found" : "No items yet"}
                            </h3>
                            <p className="text-muted-foreground text-sm">
                                {searchQuery || filterType !== "all"
                                    ? "Try adjusting your search or filter"
                                    : "Generate your first image or video to see it here"}
                            </p>
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
                        className="relative max-w-4xl w-full bg-card rounded-3xl overflow-hidden shadow-2xl animate-scale-in"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setSelectedItem(null)}
                            className="absolute top-4 right-4 z-10 p-2 rounded-xl bg-black/50 hover:bg-black/70 transition-colors"
                        >
                            <Icon icon="ph:x" className="w-5 h-5" />
                        </button>

                        <div className="flex flex-col md:flex-row">
                            <div className="flex-1 bg-black">
                                {selectedItem.type === "video" ? (
                                    <video
                                        src={selectedItem.file_url}
                                        className="w-full h-64 md:h-[500px] object-contain"
                                        controls
                                        autoPlay
                                        loop
                                    />
                                ) : (
                                    <img
                                        src={selectedItem.file_url}
                                        alt={selectedItem.prompt}
                                        className="w-full h-64 md:h-[500px] object-contain"
                                    />
                                )}
                            </div>
                            <div className="w-full md:w-80 p-6 space-y-4">
                                <div className="flex items-center gap-2">
                                    <Icon
                                        icon={selectedItem.type === "video" ? "ph:video-duotone" : "ph:image-duotone"}
                                        className="w-5 h-5 text-primary"
                                    />
                                    <h3 className="font-semibold capitalize">{selectedItem.type}</h3>
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

                                <div className="flex gap-2 pt-4">
                                    <Button
                                        variant="primary"
                                        className="flex-1"
                                        onClick={() => window.open(selectedItem.file_url, "_blank")}
                                    >
                                        <Icon icon="ph:download-simple-duotone" className="w-4 h-4" />
                                        Download
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        onClick={() => handleDelete(selectedItem.id)}
                                    >
                                        <Icon icon="ph:trash-duotone" className="w-4 h-4" />
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
