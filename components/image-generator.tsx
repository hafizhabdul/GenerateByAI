"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
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

// LocalStorage keys for persisting session
const IMAGE_SESSION_KEY = "imageGeneratorSession";
const IMAGE_HERO_KEY = "imageGeneratorHero";
const IMAGE_PENDING_KEY = "imageGeneratorPending";
const IMAGE_DRAFT_KEY = "imageGeneratorDraft";

// Draft state type
type DraftState = {
    prompt: string;
    mode: "image" | "video";
    quality: string;
};

// Helper to save session to localStorage
const saveSession = (feed: FeedItem[], isHero: boolean) => {
    try {
        // Save ALL items including pending
        localStorage.setItem(IMAGE_SESSION_KEY, JSON.stringify(feed));
        localStorage.setItem(IMAGE_HERO_KEY, JSON.stringify(isHero));
    } catch (e) {
        console.error("Failed to save session:", e);
    }
};

// Helper to save draft (prompt in progress)
const saveDraft = (draft: DraftState) => {
    try {
        localStorage.setItem(IMAGE_DRAFT_KEY, JSON.stringify(draft));
    } catch (e) {
        console.error("Failed to save draft:", e);
    }
};

// Helper to load draft
const loadDraft = (): DraftState | null => {
    try {
        const stored = localStorage.getItem(IMAGE_DRAFT_KEY);
        return stored ? JSON.parse(stored) : null;
    } catch (e) {
        return null;
    }
};

// Helper to clear draft
const clearDraft = () => {
    localStorage.removeItem(IMAGE_DRAFT_KEY);
};

// Helper to save pending generation info (for recovery)
const savePendingGeneration = (tempId: string, prompt: string) => {
    try {
        const pending = {
            tempId,
            prompt,
            startTime: Date.now(),
        };
        localStorage.setItem(IMAGE_PENDING_KEY, JSON.stringify(pending));
    } catch (e) {
        console.error("Failed to save pending:", e);
    }
};

// Helper to clear pending generation
const clearPendingGeneration = () => {
    localStorage.removeItem(IMAGE_PENDING_KEY);
};

// Helper to get pending generation
const getPendingGeneration = (): { tempId: string; prompt: string; startTime: number } | null => {
    try {
        const pending = localStorage.getItem(IMAGE_PENDING_KEY);
        return pending ? JSON.parse(pending) : null;
    } catch (e) {
        return null;
    }
};

// Helper to load session from localStorage
const loadSession = (): { feed: FeedItem[]; isHero: boolean } => {
    try {
        const savedFeed = localStorage.getItem(IMAGE_SESSION_KEY);
        const savedHero = localStorage.getItem(IMAGE_HERO_KEY);
        return {
            feed: savedFeed ? JSON.parse(savedFeed) : [],
            isHero: savedHero ? JSON.parse(savedHero) : true,
        };
    } catch (e) {
        console.error("Failed to load session:", e);
        return { feed: [], isHero: true };
    }
};

// Helper to clear session
const clearSession = () => {
    localStorage.removeItem(IMAGE_SESSION_KEY);
    localStorage.removeItem(IMAGE_HERO_KEY);
    localStorage.removeItem(IMAGE_PENDING_KEY);
    localStorage.removeItem(IMAGE_DRAFT_KEY);
};

export function ImageGenerator() {
    const router = useRouter();
    const [prompt, setPrompt] = useState("");
    const [feed, setFeed] = useState<FeedItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState<"image" | "video">("image");
    const [isHero, setIsHero] = useState(true);
    const [showHistory, setShowHistory] = useState(false);
    const [history, setHistory] = useState<Generation[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [sessionLoaded, setSessionLoaded] = useState(false);
    const [pendingGenerationId, setPendingGenerationId] = useState<string | null>(null);

    const { showToast } = useToast();
    const { user, refreshProfile } = useAuth();
    const scrollRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Load session from localStorage on mount + check for pending generations
    useEffect(() => {
        const { feed: savedFeed, isHero: savedHero } = loadSession();

        if (savedFeed.length > 0) {
            // Check if there are any pending items that are too old (> 2 minutes = failed)
            const now = Date.now();
            const updatedFeed = savedFeed.map(item => {
                if (item.status === "pending") {
                    const createdTime = new Date(item.created_at).getTime();
                    const elapsed = now - createdTime;
                    // If pending for more than 2 minutes, mark as failed
                    if (elapsed > 2 * 60 * 1000) {
                        return { ...item, status: "failed" as const };
                    }
                }
                return item;
            });

            setFeed(updatedFeed);
            setIsHero(savedHero);

            // Check if there's an active pending generation
            const pendingItem = updatedFeed.find(item => item.status === "pending");
            if (pendingItem) {
                setPendingGenerationId(pendingItem.id);
                setLoading(true);
            }
        }

        // Load draft state (prompt in progress)
        const draft = loadDraft();
        if (draft) {
            if (draft.prompt) setPrompt(draft.prompt);
            if (draft.mode) setMode(draft.mode);
        }

        setSessionLoaded(true);
    }, []);

    // Save draft whenever prompt or mode changes
    useEffect(() => {
        if (sessionLoaded) {
            const quality = localStorage.getItem("generation_quality") || "high";
            saveDraft({ prompt, mode, quality });
        }
    }, [prompt, mode, sessionLoaded]);

    // Handle page visibility change - resume polling when user returns to tab
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && pendingGenerationId) {
                // User returned to tab with pending generation - trigger a check
                console.log("[Image] User returned to tab, checking pending generation...");
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [pendingGenerationId]);

    // Handle pending generation recovery - check database for completed result
    useEffect(() => {
        if (!pendingGenerationId || !user) return;
        
        const checkPendingResult = async () => {
            try {
                // Check if the generation completed in the database
                const res = await fetch(`/api/generations?limit=5`);
                if (res.ok) {
                    const data = await res.json();
                    const generations = data.generations || [];
                    
                    // Find pending item in feed
                    const pendingItem = feed.find(item => item.id === pendingGenerationId);
                    if (!pendingItem) {
                        setLoading(false);
                        setPendingGenerationId(null);
                        return;
                    }
                    
                    // Look for matching completed generation by prompt
                    const matchedGeneration = generations.find((g: Generation) => 
                        g.prompt === pendingItem.prompt && 
                        g.status === "completed" &&
                        g.file_url
                    );
                    
                    if (matchedGeneration) {
                        // Update feed with the result
                        setFeed(prev => prev.map(item =>
                            item.id === pendingGenerationId
                                ? { ...item, id: matchedGeneration.id, status: "completed", file_url: matchedGeneration.file_url }
                                : item
                        ));
                        setLoading(false);
                        setPendingGenerationId(null);
                        clearPendingGeneration();
                        showToast("Image generation completed!", "success");
                    }
                }
            } catch (error) {
                console.error("Error checking pending:", error);
            }
        };
        
        // Poll every 3 seconds while there's a pending generation
        const interval = setInterval(checkPendingResult, 3000);
        checkPendingResult(); // Check immediately
        
        return () => clearInterval(interval);
    }, [pendingGenerationId, user, feed]);

    // Save session whenever feed changes (after initial load)
    useEffect(() => {
        if (sessionLoaded) {
            saveSession(feed, isHero);
        }
    }, [feed, isHero, sessionLoaded]);

    // Auto-scroll to bottom when feed updates
    useEffect(() => {
        if (scrollRef.current && feed.length > 0) {
            // Use setTimeout to ensure DOM has updated
            setTimeout(() => {
                if (scrollRef.current) {
                    scrollRef.current.scrollTo({
                        top: scrollRef.current.scrollHeight,
                        behavior: 'smooth'
                    });
                }
            }, 100);
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

        // Clear draft since generation has started
        clearDraft();

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
        setPendingGenerationId(tempId);
        savePendingGeneration(tempId, currentPrompt);

        try {
            if (mode === "video") {
                await new Promise(resolve => setTimeout(resolve, 2000));
                showToast("Video generation coming soon!", "info");
                setFeed(prev => prev.filter(item => item.id !== tempId)); // Remove pending item
                setLoading(false);
                setPendingGenerationId(null);
                clearPendingGeneration();
                return;
            }

            // Get quality setting
            const quality = localStorage.getItem("generation_quality") || "high";

            const res = await fetch("/api/generate-image", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: currentPrompt, quality }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Generation failed");

            // Update optimistic item with result
            setFeed(prev => prev.map(item =>
                item.id === tempId
                    ? { ...item, id: data.generationId || tempId, status: "completed", file_url: data.url }
                    : item
            ));

            showToast("Image generated successfully!", "success");
            clearPendingGeneration();

            // Refresh profile to update credits immediately
            await refreshProfile();
        } catch (err) {
            console.error(err);
            showToast(err instanceof Error ? err.message : "Failed to generate image", "error");

            // Mark item as failed
            setFeed(prev => prev.map(item =>
                item.id === tempId
                    ? { ...item, status: "failed" }
                    : item
            ));
            clearPendingGeneration();
        } finally {
            setLoading(false);
            setPendingGenerationId(null);
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
        clearSession(); // Clear localStorage
        showToast("Started a new creative session", "info");
    };

    return (
        <div className="flex flex-col h-full min-h-[calc(100vh-80px)] md:min-h-screen w-full relative overflow-hidden">
            {/* Background Ambient Glow - Removed */}
            {/* <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] md:w-[800px] h-[400px] md:h-[800px] bg-primary/5 rounded-full blur-[100px] md:blur-[150px] pointer-events-none" /> */}

            {/* Top Controls */}
            <div className="absolute top-4 right-4 z-40 flex items-center gap-2">
                {feed.length > 0 && (
                    <Button
                        variant="glass"
                        size="sm"
                        onClick={handleNewSession}
                        className="animate-fade-in group"
                    >
                        <Icon icon="ph:chat-circle-plus-duotone" className="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform" />
                        New Session
                    </Button>
                )}
            </div>

            {/* History Panel */}
            {showHistory && (
                <div
                    className="fixed inset-0 z-50 bg-black/80 animate-fade-in"
                    onClick={() => setShowHistory(false)}
                >
                    <div
                        className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-card border-l border-border animate-slide-in-right overflow-hidden flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-border">
                            <div className="flex items-center gap-2">
                                <Icon icon="ph:clock-counter-clockwise-duotone" className="w-5 h-5 text-primary" />
                                <h2 className="font-semibold">Chat History</h2>
                            </div>
                            <button
                                onClick={() => setShowHistory(false)}
                                className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                            >
                                <Icon icon="ph:x" className="w-5 h-5" />
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
                                                    <Icon icon="ph:clock" className="w-3 h-3" />
                                                    {new Date(item.created_at).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                                    <Icon icon="ph:shooting-star-duotone" className="w-10 h-10 text-muted-foreground/50 mb-3" />
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
                    isHero ? "flex items-center justify-center p-4" : "p-4 md:p-8 pb-72 md:pb-80"
                )}
            >
                {/* Hero Content - Moved Up Significantly */}
                <div className={cn(
                    "text-center space-y-4 md:space-y-6 transition-all duration-700 max-w-2xl mx-auto",
                    isHero ? "opacity-100 translate-y-[-140px]" : "hidden" // Moved up much more (-140px)
                )}>
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-primary tracking-wider uppercase animate-fade-in">
                        <Icon icon="ph:paint-brush-duotone" className="w-3 h-3" />
                        SquirrAI
                    </div>
                    <h1 className="font-bold tracking-tight text-foreground" style={{ fontSize: "var(--text-5xl)" }}>
                        Dream it. <br className="md:hidden" />
                        <span className="text-muted-foreground/50">Create it.</span>
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
                    ? "bottom-1/2 translate-y-[calc(50%+80px)] md:translate-y-[calc(50%+100px)]"
                    : "bottom-[calc(5rem+env(safe-area-inset-bottom))] md:bottom-8"
            )}>
                <div className="w-full max-w-2xl mx-auto">
                    <div className="rounded-[2rem] p-3 flex flex-col gap-2 shadow-2xl ring-1 ring-border transition-all duration-300 focus-within:ring-primary/50 bg-surface-1 border border-border">
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Describe what you want to create..."
                            className="w-full bg-transparent border-none focus:ring-0 focus:outline-none px-6 py-4 min-h-[60px] max-h-[120px] resize-none placeholder:text-muted-foreground/70 text-foreground text-lg"
                            style={{ fontSize: "var(--text-base)" }}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleGenerate();
                                }
                            }}
                        />
                        <div className="flex items-center justify-between px-4 pb-2 gap-2">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setShowHistory(true)}
                                    className="p-3 rounded-xl text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors"
                                >
                                    <Icon icon="ph:clock-counter-clockwise-duotone" className="w-6 h-6" />
                                </button>
                                {/* Mode Toggles... (Keep simplified for now) */}
                            </div>
                            <Button
                                onClick={handleGenerate}
                                disabled={loading || !prompt.trim()}
                                loading={loading}
                                size="lg"
                                className="rounded-xl px-8"
                            >
                                {!loading && <Icon icon="ph:paper-plane-tilt-fill" className="w-5 h-5" />}
                                <span className="hidden sm:inline ml-2">Generate</span>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function FeedItemCard({ item }: { item: FeedItem }) {
    const router = useRouter();
    const [isDownloading, setIsDownloading] = useState(false);
    const { showToast } = useToast();

    const handleDownload = async () => {
        if (!item.file_url || isDownloading) return;
        setIsDownloading(true);
        try {
            // Use our API endpoint to bypass CORS and handle download
            const downloadUrl = `/api/download?url=${encodeURIComponent(item.file_url)}`;
            
            const response = await fetch(downloadUrl);
            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: "Download failed" }));
                throw new Error(error.error || "Failed to download image");
            }
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `ai-generated-${Date.now()}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            showToast("Image downloaded successfully!", "success");
        } catch (error) {
            console.error("Download error:", error);
            showToast(error instanceof Error ? error.message : "Failed to download image", "error");
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="flex flex-col gap-8 animate-fade-in-up">
            {/* User Prompt Bubble */}
            <div className="flex justify-end">
                <div className="max-w-[80%] bg-surface-2 border border-border rounded-2xl rounded-tr-sm px-6 py-4 shadow-sm">
                    <p className="text-foreground/90 leading-relaxed">{item.prompt}</p>
                </div>
            </div>

            {/* AI Response (Image) */}
            <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                    <Icon icon="ph:shooting-star-fill" className="w-4 h-4 text-white" />
                </div>

                <div className="flex-1 space-y-3">
                    {item.status === "pending" ? (
                        <div className="w-full aspect-square max-w-md rounded-2xl bg-surface-2 animate-pulse flex flex-col items-center justify-center border border-white/5">
                            <Icon icon="ph:spinner" className="w-8 h-8 text-primary animate-spin mb-4" />
                            <p className="text-sm text-muted-foreground">Creating masterpiece...</p>
                            <p className="text-xs text-muted-foreground/60 mt-2">You can navigate away, we&apos;ll save your result</p>
                        </div>
                    ) : item.status === "failed" ? (
                        <div className="w-full max-w-md p-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-200">
                            Failed to generate image. Please try again.
                        </div>
                    ) : item.file_url ? (
                        <div className="relative group w-full max-w-md">
                            <div className="rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-black/30">
                                <img
                                    src={item.file_url}
                                    alt="Generated"
                                    className="w-full h-auto object-cover"
                                />
                            </div>

                            {/* Action Bar - Always visible */}
                            <div className="flex flex-wrap items-center gap-2 mt-3 p-2 bg-surface-2/50 rounded-xl border border-border/50">
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={handleDownload} 
                                    disabled={isDownloading}
                                    className="flex-1 min-w-[120px]"
                                >
                                    <Icon icon={isDownloading ? "ph:spinner" : "ph:download-simple-duotone"} className={cn("w-4 h-4 mr-2", isDownloading && "animate-spin")} />
                                    {isDownloading ? "Downloading..." : "Download"}
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1 min-w-[120px]"
                                    onClick={() => {
                                        if (item.file_url) {
                                            sessionStorage.setItem("videoSourceImage", item.file_url);
                                            sessionStorage.setItem("videoSourcePrompt", item.prompt);
                                            router.push("/videos");
                                        }
                                    }}
                                >
                                    <Icon icon="ph:video-duotone" className="w-4 h-4 mr-2" />
                                    Create Video
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="w-full max-w-md p-6 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-200">
                            Image generated but URL not available. Check gallery.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
