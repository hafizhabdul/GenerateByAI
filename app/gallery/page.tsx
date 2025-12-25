"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth-context";
import { Download, Trash2, Search, Filter, Grid3X3, LayoutList, Heart, X, Loader2 } from "lucide-react";
import type { Generation } from "@/lib/supabase/types";

export default function GalleryPage() {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [view, setView] = useState<"grid" | "list">("grid");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedImage, setSelectedImage] = useState<Generation | null>(null);
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
            const res = await fetch("/api/generations?type=image");
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
                setSelectedImage(null);
                showToast("Deleted successfully", "success");
            }
        } catch (error) {
            showToast("Failed to delete", "error");
        }
    };

    const filteredImages = generations.filter(img =>
        img.prompt.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
                                {loading ? "Loading..." : `${filteredImages.length} images in your collection`}
                            </p>
                        </div>

                        {/* View Toggle */}
                        <div className="flex items-center gap-2">
                            <div className="flex items-center p-1 bg-surface-2 rounded-xl">
                                <button
                                    onClick={() => setView("grid")}
                                    className={`p-2 rounded-lg transition-colors ${view === "grid" ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white"}`}
                                >
                                    <Grid3X3 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setView("list")}
                                    className={`p-2 rounded-lg transition-colors ${view === "list" ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white"}`}
                                >
                                    <LayoutList className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Search & Filter Bar */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by prompt..."
                                className="w-full h-11 pl-11 pr-4 bg-surface-2 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                            />
                        </div>
                        <Button variant="secondary">
                            <Filter className="w-4 h-4" />
                            Filter
                        </Button>
                    </div>

                    {/* Loading */}
                    {loading && (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    )}

                    {/* Gallery Grid */}
                    {!loading && filteredImages.length > 0 && (
                        <div className={`grid gap-4 ${view === "grid" ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4" : "grid-cols-1"}`}>
                            {filteredImages.map((image) => (
                                <Card
                                    key={image.id}
                                    variant="default"
                                    padding="none"
                                    hover
                                    className="group overflow-hidden cursor-pointer"
                                    onClick={() => setSelectedImage(image)}
                                >
                                    <div className="relative aspect-square">
                                        <img
                                            src={image.file_url}
                                            alt={image.prompt}
                                            className="w-full h-full object-cover"
                                        />

                                        {/* Hover Overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-4">
                                            <p className="text-white text-sm line-clamp-2 mb-2">{image.prompt}</p>
                                            <div className="flex items-center justify-between">
                                                <span className="text-white/60 text-xs">
                                                    {new Date(image.created_at).toLocaleDateString()}
                                                </span>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleToggleFavorite(image.id, image.is_favorite); }}
                                                        className={`p-1.5 rounded-lg hover:bg-white/20 transition-colors ${image.is_favorite ? "text-red-400" : "text-white/60"}`}
                                                    >
                                                        <Heart className={`w-4 h-4 ${image.is_favorite ? "fill-current" : ""}`} />
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
                    {!loading && filteredImages.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-16 h-16 rounded-full bg-surface-2 flex items-center justify-center mb-4">
                                <Search className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <h3 className="font-semibold text-lg mb-1">
                                {searchQuery ? "No images found" : "No images yet"}
                            </h3>
                            <p className="text-muted-foreground text-sm">
                                {searchQuery ? "Try adjusting your search query" : "Generate your first image to see it here"}
                            </p>
                        </div>
                    )}
                </div>
            </main>

            {/* Image Detail Modal */}
            {selectedImage && (
                <div
                    className="fixed inset-0 z-[500] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
                    onClick={() => setSelectedImage(null)}
                >
                    <div
                        className="relative max-w-4xl w-full bg-card rounded-3xl overflow-hidden shadow-2xl animate-scale-in"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setSelectedImage(null)}
                            className="absolute top-4 right-4 z-10 p-2 rounded-xl bg-black/50 hover:bg-black/70 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex flex-col md:flex-row">
                            <div className="flex-1 bg-black">
                                <img
                                    src={selectedImage.file_url}
                                    alt={selectedImage.prompt}
                                    className="w-full h-64 md:h-[500px] object-contain"
                                />
                            </div>
                            <div className="w-full md:w-80 p-6 space-y-4">
                                <h3 className="font-semibold">Prompt</h3>
                                <p className="text-muted-foreground text-sm">{selectedImage.prompt}</p>

                                <div className="pt-4 space-y-2">
                                    <p className="text-xs text-muted-foreground">
                                        Created {new Date(selectedImage.created_at).toLocaleString()}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Tokens used: {selectedImage.tokens_used}
                                    </p>
                                </div>

                                <div className="flex gap-2 pt-4">
                                    <Button
                                        variant="primary"
                                        className="flex-1"
                                        onClick={() => window.open(selectedImage.file_url, "_blank")}
                                    >
                                        <Download className="w-4 h-4" />
                                        Download
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        onClick={() => handleDelete(selectedImage.id)}
                                    >
                                        <Trash2 className="w-4 h-4" />
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
