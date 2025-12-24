"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Trash2, Search, Filter, Grid3X3, LayoutList, Heart, MoreVertical, X } from "lucide-react";

// Mock data - in real app, this would come from API/database
const mockImages = [
    { id: 1, url: "https://placehold.co/400x400/1a1a2e/8b5cf6?text=AI+Art+1", prompt: "A futuristic cityscape at sunset", liked: true, createdAt: "2 hours ago" },
    { id: 2, url: "https://placehold.co/400x600/1a1a2e/a855f7?text=AI+Art+2", prompt: "Portrait of a mystical forest spirit", liked: false, createdAt: "5 hours ago" },
    { id: 3, url: "https://placehold.co/600x400/1a1a2e/6366f1?text=AI+Art+3", prompt: "Abstract geometric patterns in neon", liked: true, createdAt: "1 day ago" },
    { id: 4, url: "https://placehold.co/400x400/1a1a2e/ec4899?text=AI+Art+4", prompt: "Underwater coral reef with bioluminescent fish", liked: false, createdAt: "2 days ago" },
    { id: 5, url: "https://placehold.co/400x500/1a1a2e/14b8a6?text=AI+Art+5", prompt: "Ancient temple covered in vines", liked: true, createdAt: "3 days ago" },
    { id: 6, url: "https://placehold.co/500x400/1a1a2e/f59e0b?text=AI+Art+6", prompt: "Cyberpunk street market at night", liked: false, createdAt: "4 days ago" },
];

export default function GalleryPage() {
    const [view, setView] = useState<"grid" | "list">("grid");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedImage, setSelectedImage] = useState<typeof mockImages[0] | null>(null);

    const filteredImages = mockImages.filter(img =>
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
                                {filteredImages.length} images in your collection
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

                    {/* Gallery Grid */}
                    {filteredImages.length > 0 ? (
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
                                            src={image.url}
                                            alt={image.prompt}
                                            className="w-full h-full object-cover"
                                        />

                                        {/* Hover Overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-4">
                                            <p className="text-white text-sm line-clamp-2 mb-2">{image.prompt}</p>
                                            <div className="flex items-center justify-between">
                                                <span className="text-white/60 text-xs">{image.createdAt}</span>
                                                <div className="flex items-center gap-1">
                                                    <button className={`p-1.5 rounded-lg hover:bg-white/20 transition-colors ${image.liked ? "text-red-400" : "text-white/60"}`}>
                                                        <Heart className={`w-4 h-4 ${image.liked ? "fill-current" : ""}`} />
                                                    </button>
                                                    <button className="p-1.5 rounded-lg hover:bg-white/20 transition-colors text-white/60">
                                                        <Download className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-16 h-16 rounded-full bg-surface-2 flex items-center justify-center mb-4">
                                <Search className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <h3 className="font-semibold text-lg mb-1">No images found</h3>
                            <p className="text-muted-foreground text-sm">Try adjusting your search query</p>
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
                                    src={selectedImage.url}
                                    alt={selectedImage.prompt}
                                    className="w-full h-64 md:h-[500px] object-contain"
                                />
                            </div>
                            <div className="w-full md:w-80 p-6 space-y-4">
                                <h3 className="font-semibold">Prompt</h3>
                                <p className="text-muted-foreground text-sm">{selectedImage.prompt}</p>

                                <div className="pt-4 space-y-2">
                                    <p className="text-xs text-muted-foreground">Created {selectedImage.createdAt}</p>
                                </div>

                                <div className="flex gap-2 pt-4">
                                    <Button variant="primary" className="flex-1">
                                        <Download className="w-4 h-4" />
                                        Download
                                    </Button>
                                    <Button variant="ghost">
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
