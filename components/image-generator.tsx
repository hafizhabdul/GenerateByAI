"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, Send, Image as ImageIcon, Film, Sparkles, Zap, Download, RotateCcw, Copy, History, X, Clock, User, Trash2, MessageSquarePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import type { Generation } from "@/lib/supabase/types";

// Extended Generation type to handle "optimistic" pending state
type FeedItem = {
    id: string;
    type: "image" | "video";
    prompt: string;
    file_url?: string;
    status: "pending" | "processing" | "completed" | "failed";
    created_at: string;
};

export function ImageGenerator() {
    const [prompt, setPrompt] = useState("");
    const [feed, setFeed] = useState<FeedItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState<"image" | "video">("image");
    const [isHero, setIsHero] = useState(true);
    const [showHistory, setShowHistory] = useState(false);
    const [history, setHistory] = useState<Generation[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const { showToast } = useToast();
    const { user } = useAuth();
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when feed updates
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [feed]);

    // Fetch history when panel opens
    useEffect(() => {
        if (showHistory && user) {
            fetchHistory();
        }
    }, [showHistory, user]);

    const fetchHistory = async () => {
        setLoadingHistory(true);
        try {
            const res = await fetch("/api/generations?limit=20");
            if (res.ok) {
                const data = await res.json();
                setHistory(data.generations || []);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            showToast("Please enter a prompt to generate", "warning");
            return;
        }

        const currentPrompt = prompt;
        setPrompt(""); // Clear immediately
        setIsHero(false);
        setLoading(true);
        setShowHistory(false);

        // Optimistic Update: Add pending item to feed
        const tempId = Date.now().toString();
        const optimisticItem: FeedItem = {
            id: tempId,
            type: mode,
            prompt: currentPrompt,
            status: "pending",
            created_at: new Date().toISOString()
        };

        setFeed(prev => [...prev, optimisticItem]);

        try {
            if (mode === "video") {
                await new Promise(resolve => setTimeout(resolve, 2000));
                showToast("Video generation coming soon!", "info");
                setFeed(prev => prev.filter(item => item.id !== tempId)); // Remove pending item
                setLoading(false);
                return;
            }

            const res = await fetch("/api/generate-image", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: currentPrompt }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Generation failed");

            // Update optimistic item with result
            setFeed(prev => prev.map(item =>
                item.id === tempId
                    ? { ...item, status: "completed", file_url: data.url }
                    : item
            ));

            showToast("Image generated successfully!", "success");

            // Usage updates happen server-side, sidebar will update via useAuth/context eventually
        } catch (err) {
            console.error(err);
            showToast(err instanceof Error ? err.message : "Failed to generate image", "error");

            // Mark item as failed
            setFeed(prev => prev.map(item =>
                item.id === tempId
                    ? { ...item, status: "failed" }
                    : item
            ));
        } finally {
            setLoading(false);
        }
    };

    const handleSelectFromHistory = (item: Generation) => {
        // When selecting from history, we just add it to the feed
        const historyItem: FeedItem = {
            id: item.id,
            type: item.type,
            prompt: item.prompt,
            file_url: item.file_url,
            status: item.status,
            created_at: item.created_at
        };
        setFeed(prev => [...prev, historyItem]);
        setIsHero(false);
        setShowHistory(false);
    };

    const handleNewSession = () => {
        setFeed([]);
        setIsHero(true);
        setPrompt("");
        showToast("Started a new creative session", "info");
    };

    return (
        <div className="flex flex-col h-full min-h-[calc(100vh-80px)] md:min-h-screen w-full relative overflow-hidden">
            {/* Background Ambient Glow */}
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] md:w-[800px] h-[400px] md:h-[800px] bg-primary/5 rounded-full blur-[100px] md:blur-[150px] pointer-events-none" />

            {/* Top Controls */}
            <div className="absolute top-4 right-4 z-40 flex items-center gap-2">
                {feed.length > 0 && (
                    <Button
                        variant="glass"
                        size="sm"
                        onClick={handleNewSession}
                        className="animate-fade-in group"
                    >
                        <MessageSquarePlus className="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform" />
                        New Session
                    </Button>
                )}
            </div>

            {/* History Panel */}
            {showHistory && (
                <div
                    className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-fade-in"
                    onClick={() => setShowHistory(false)}
                >
                    <div
                        className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-card border-l border-border animate-slide-in-right overflow-hidden flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-border">
                            <div className="flex items-center gap-2">
                                <History className="w-5 h-5 text-primary" />
                                <h2 className="font-semibold">Chat History</h2>
                            </div>
                            <button
                                onClick={() => setShowHistory(false)}
                                className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        {/* History List */}
                        <div className="flex-1 overflow-y-auto">
                            {history.length > 0 ? (
                                <div className="divide-y divide-border">
                                    {history.map((item) => (
                                        <button
                                            key={item.id}
                                            onClick={() => handleSelectFromHistory(item)}
                                            className="w-full p-4 text-left hover:bg-white/5 transition-colors flex gap-3"
                                        >
                                            <div className="w-16 h-16 rounded-xl overflow-hidden bg-surface-2 shrink-0">
                                                <img src={item.file_url} alt="" className="w-full h-full object-cover" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm line-clamp-2 mb-1">{item.prompt}</p>
                                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                    <Clock className="w-3 h-3" />
                                                    {new Date(item.created_at).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                                    <Sparkles className="w-10 h-10 text-muted-foreground/50 mb-3" />
                                    <p className="text-muted-foreground">No history yet</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Main Stage (Feed) */}
            <div
                ref={scrollRef}
                className={cn(
                    "flex-1 overflow-y-auto overflow-x-hidden scroll-smooth",
                    isHero ? "flex items-center justify-center p-4" : "p-4 md:p-8 pb-32 md:pb-40"
                )}
            >
                {/* Hero Content - Moved Up Significantly */}
                <div className={cn(
                    "text-center space-y-4 md:space-y-6 transition-all duration-700 max-w-2xl mx-auto",
                    isHero ? "opacity-100 translate-y-[-140px]" : "hidden" // Moved up much more (-140px)
                )}>
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-primary tracking-wider uppercase animate-fade-in">
                        <Zap className="w-3 h-3 fill-current" />
                        AI Creative Studio
                    </div>
                    <h1 className="font-bold tracking-tight gradient-text" style={{ fontSize: "var(--text-5xl)" }}>
                        Dream it. <br className="md:hidden" />
                        <span className="text-white/20">Create it.</span>
                    </h1>
                </div>

                {/* Feed Items (Chat Style) */}
                {!isHero && (
                    <div className="w-full max-w-3xl mx-auto space-y-12">
                        {feed.map((item) => (
                            <FeedItemCard key={item.id} item={item} />
                        ))}
                    </div>
                )}
            </div>

            {/* Floating Input Bar */}
            <div className={cn(
                "fixed left-0 right-0 px-4 transition-all duration-700 ease-out z-40",
                isHero
                    ? "bottom-1/2 translate-y-[calc(50%+80px)] md:translate-y-[calc(50%+100px)]" // Moved further down
                    : "bottom-20 md:bottom-8"
            )}>
                <div className="w-full max-w-2xl mx-auto">
                    <div className="rounded-2xl md:rounded-3xl p-2 flex flex-col gap-2 shadow-2xl ring-1 ring-white/10 transition-all duration-300 focus-within:ring-primary/50 focus-within:shadow-[0_0_50px_rgba(139,92,246,0.15)] bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/5">
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Describe what you want to create..."
                            className="w-full bg-transparent border-none focus:ring-0 focus:outline-none px-4 md:px-6 py-3 md:py-4 min-h-[50px] md:min-h-[60px] max-h-[120px] resize-none placeholder:text-white/25 text-foreground"
                            style={{ fontSize: "var(--text-base)" }}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleGenerate();
                                }
                            }}
                        />
                        <div className="flex items-center justify-between px-2 md:px-4 pb-2 gap-2">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setShowHistory(true)}
                                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                                >
                                    <History className="w-5 h-5" />
                                </button>
                                {/* Mode Toggles... (Keep simplified for now) */}
                            </div>
                            <Button
                                onClick={handleGenerate}
                                disabled={loading || !prompt.trim()}
                                loading={loading}
                                size="md"
                            >
                                {!loading && <Send className="w-4 h-4" />}
                                <span className="hidden sm:inline">Generate</span>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function FeedItemCard({ item }: { item: FeedItem }) {
    const handleDownload = async () => {
        if (!item.file_url) return;
        try {
            const response = await fetch(item.file_url);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `ai-generated-${Date.now()}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch {
            // Error handling
        }
    };

    return (
        <div className="flex flex-col gap-6 animate-fade-in-up">
            {/* User Prompt Bubble */}
            <div className="flex justify-end">
                <div className="max-w-[80%] bg-surface-2 border border-white/10 rounded-2xl rounded-tr-sm px-6 py-4 shadow-sm">
                    <p className="text-foreground/90 leading-relaxed">{item.prompt}</p>
                </div>
            </div>

            {/* AI Response (Image) */}
            <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center shrink-0 shadow-glow">
                    <Sparkles className="w-4 h-4 text-white" />
                </div>

                <div className="flex-1 space-y-3">
                    {item.status === "pending" ? (
                        <div className="w-full aspect-square max-w-md rounded-2xl bg-surface-2 animate-pulse flex flex-col items-center justify-center border border-white/5">
                            <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
                            <p className="text-sm text-muted-foreground">Creating masterpiece...</p>
                        </div>
                    ) : item.status === "failed" ? (
                        <div className="w-full max-w-md p-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-200">
                            Failed to generate image. Please try again.
                        </div>
                    ) : (
                        <div className="relative group w-full max-w-md">
                            <div className="rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-black/30">
                                <img
                                    src={item.file_url}
                                    alt="Generated"
                                    className="w-full h-auto object-cover"
                                />
                            </div>

                            {/* Action Bar */}
                            <div className="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <Button variant="ghost" size="sm" onClick={handleDownload}>
                                    <Download className="w-4 h-4 mr-2" />
                                    Download
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
