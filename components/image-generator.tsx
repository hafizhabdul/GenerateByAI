"use client";

import { useState, useEffect, useRef, useCallback, memo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { GenerationLoading } from "./loading-states";
import type { Generation } from "@/lib/supabase/types";
import { BatikPattern } from "@/components/ui/batik-pattern";

// Extended Generation type to handle "optimistic" pending state
type FeedItem = {
    id: string;
    type: "image" | "video";
    prompt: string;
    file_url?: string;
    status: "pending" | "processing" | "completed" | "failed";
    created_at: string;
};

// Session type from API (database-backed)
type HistorySession = {
    id: string;
    title: string;
    type: 'image' | 'video';
    created_at: string;
    updated_at: string;
    is_archived: boolean;
    is_pinned: boolean;
    preview_image: string | null;
    generation_count: number;
    first_prompt: string | null;
};

// LocalStorage keys - will be suffixed with user ID for isolation
const getSessionKey = (userId: string) => `imageGeneratorSession_${userId}`;
const getHeroKey = (userId: string) => `imageGeneratorHero_${userId}`;
const getPendingKey = (userId: string) => `imageGeneratorPending_${userId}`;
const getDraftKey = (userId: string) => `imageGeneratorDraft_${userId}`;

// Maximum items to save in session
const MAX_FEED_ITEMS = 10;

// Draft state type
type DraftState = {
    prompt: string;
    mode: "generate" | "transform";
    quality: string;
};

// Auto-cleanup old generator data when storage is full
const cleanupOldStorageData = () => {
    try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (
                key.includes('GeneratorSession') ||
                key.includes('GeneratorDraft') ||
                key.includes('pendingVideos') ||
                key.includes('GeneratorPending')
            )) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        console.log(`[Storage] Cleaned up ${keysToRemove.length} old storage entries`);
        return true;
    } catch (e) {
        console.error("[Storage] Cleanup failed:", e);
        return false;
    }
};

// Safe localStorage set with auto-cleanup on quota exceeded
const safeLocalStorageSet = (key: string, value: string): boolean => {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch (e) {
        if (e instanceof DOMException && e.name === 'QuotaExceededError') {
            console.log("[Storage] Quota exceeded, cleaning up...");
            cleanupOldStorageData();
            try {
                localStorage.setItem(key, value);
                return true;
            } catch (e2) {
                console.error("[Storage] Still failed after cleanup:", e2);
                return false;
            }
        }
        return false;
    }
};

// Helper to save session to localStorage (user-specific)
const saveSession = (userId: string, feed: FeedItem[], isHero: boolean) => {
    if (!userId) return;
    // Limit feed items to prevent quota issues
    const limitedFeed = feed.slice(-MAX_FEED_ITEMS);
    safeLocalStorageSet(getSessionKey(userId), JSON.stringify(limitedFeed));
    safeLocalStorageSet(getHeroKey(userId), JSON.stringify(isHero));
};

// Helper to save draft (prompt in progress) - user-specific
const saveDraft = (userId: string, draft: DraftState) => {
    if (!userId) return;
    safeLocalStorageSet(getDraftKey(userId), JSON.stringify(draft));
};

// Helper to load draft - user-specific
const loadDraft = (userId: string): DraftState | null => {
    if (!userId) return null;
    try {
        const stored = localStorage.getItem(getDraftKey(userId));
        return stored ? JSON.parse(stored) : null;
    } catch (e) {
        return null;
    }
};

// Helper to clear draft - user-specific
const clearDraft = (userId: string) => {
    if (!userId) return;
    localStorage.removeItem(getDraftKey(userId));
};

// Helper to save pending generation info (for recovery) - user-specific
const savePendingGeneration = (userId: string, tempId: string, prompt: string) => {
    if (!userId) return;
    try {
        const pending = {
            tempId,
            prompt,
            startTime: Date.now(),
        };
        localStorage.setItem(getPendingKey(userId), JSON.stringify(pending));
    } catch (e) {
        console.error("Failed to save pending:", e);
    }
};

// Helper to clear pending generation - user-specific
const clearPendingGeneration = (userId: string) => {
    if (!userId) return;
    localStorage.removeItem(getPendingKey(userId));
};

// Helper to get pending generation - user-specific
const getPendingGeneration = (userId: string): { tempId: string; prompt: string; startTime: number } | null => {
    if (!userId) return null;
    try {
        const pending = localStorage.getItem(getPendingKey(userId));
        return pending ? JSON.parse(pending) : null;
    } catch (e) {
        return null;
    }
};

// Helper to load session from localStorage - user-specific
const loadSession = (userId: string): { feed: FeedItem[]; isHero: boolean } => {
    if (!userId) return { feed: [], isHero: true };
    try {
        const savedFeed = localStorage.getItem(getSessionKey(userId));
        const savedHero = localStorage.getItem(getHeroKey(userId));
        return {
            feed: savedFeed ? JSON.parse(savedFeed) : [],
            isHero: savedHero ? JSON.parse(savedHero) : true,
        };
    } catch (e) {
        console.error("Failed to load session:", e);
        return { feed: [], isHero: true };
    }
};

// Helper to clear session - user-specific
const clearSession = (userId: string) => {
    if (!userId) return;
    localStorage.removeItem(getSessionKey(userId));
    localStorage.removeItem(getHeroKey(userId));
    localStorage.removeItem(getPendingKey(userId));
    localStorage.removeItem(getDraftKey(userId));
};

export function ImageGenerator() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [prompt, setPrompt] = useState("");
    const [feed, setFeed] = useState<FeedItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mode, setMode] = useState<"generate" | "transform">("generate");
    const [transformImage, setTransformImage] = useState<string | null>(null);
    const [transformFile, setTransformFile] = useState<File | null>(null);
    const [isHero, setIsHero] = useState(true);
    const [showHistory, setShowHistory] = useState(false); // Start false to avoid hydration mismatch
    const [historySessions, setHistorySessions] = useState<HistorySession[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [sessionLoaded, setSessionLoaded] = useState(false);
    const [pendingGenerationId, setPendingGenerationId] = useState<string | null>(null);
    const [qualitySetting, setQualitySetting] = useState<"low" | "medium" | "high">("high");
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

    const { showToast } = useToast();
    const { user, refreshProfile, loading: authLoading } = useAuth();
    const scrollRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const historyListRef = useRef<HTMLDivElement>(null);
    const prevUserIdRef = useRef<string | null>(null);
    const transformInputRef = useRef<HTMLInputElement>(null);

    const handleNewSession = useCallback(() => {
        setFeed([]);
        setIsHero(true);
        setPrompt("");
        setCurrentSessionId(null); // Reset current session
        setMode("generate"); // Reset to default mode
        setTransformImage(null);
        setTransformFile(null);
        if (user) {
            clearSession(user.id); // Clear localStorage for this user
            clearDraft(user.id); // Explicitly clear draft to prevent autosave race condition
        }
        showToast("Started a new creative session", "info");
    }, [user, showToast]);

    // Load session from localStorage on mount + check for pending generations
    // Only load when auth is done loading and user is available
    useEffect(() => {
        // Wait for auth to finish loading before doing anything
        if (authLoading) return;

        if (!user) {
            // Only reset state when auth is done loading AND user is null (actually logged out)
            setFeed([]);
            setIsHero(true);
            setPrompt("");
            setSessionLoaded(false);
            return;
        }

        const { feed: savedFeed, isHero: savedHero } = loadSession(user.id);

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
        const draft = loadDraft(user.id);
        if (draft) {
            if (draft.prompt) setPrompt(draft.prompt);
            if (draft.mode && (draft.mode === "generate" || draft.mode === "transform")) {
                setMode(draft.mode);
            }
        }

        // Load quality setting
        const savedQuality = localStorage.getItem("generation_quality");
        if (savedQuality) setQualitySetting(savedQuality as "low" | "medium" | "high");

        // Load showHistory preference (after mount to avoid hydration mismatch)
        const savedShowHistory = localStorage.getItem("imageGeneratorShowHistory");
        if (savedShowHistory === "true") setShowHistory(true);

        setSessionLoaded(true);
    }, [user, authLoading]);

    // Listen for quality changes in localStorage (from Settings page)
    useEffect(() => {
        const handleStorageChange = () => {
            const q = localStorage.getItem("generation_quality");
            if (q) setQualitySetting(q as "low" | "medium" | "high");
        };

        window.addEventListener("storage", handleStorageChange);
        // Also check on focus (same-tab changes)
        window.addEventListener("focus", handleStorageChange);

        return () => {
            window.removeEventListener("storage", handleStorageChange);
            window.removeEventListener("focus", handleStorageChange);
        };
    }, []);

    // Detect new session request from URL
    useEffect(() => {
        const isNew = searchParams.get("new") === "true";
        if (isNew && sessionLoaded && feed.length === 0) {
            handleNewSession();
            // Clean up URL
            const params = new URLSearchParams(searchParams.toString());
            params.delete("new");
            const newSearch = params.toString();
            router.replace(newSearch ? `/?${newSearch}` : "/", { scroll: false });
        }
    }, [searchParams, sessionLoaded, feed.length, handleNewSession, router]);

    // Persist History Panel state
    useEffect(() => {
        localStorage.setItem("imageGeneratorShowHistory", showHistory.toString());
    }, [showHistory]);

    // Detect user change (logout/login different user) - clear old session
    useEffect(() => {
        if (user && prevUserIdRef.current && prevUserIdRef.current !== user.id) {
            // User changed - clear previous user's session data
            clearSession(prevUserIdRef.current);
            // Reset to new session state
            setFeed([]);
            setIsHero(true);
            setPrompt("");
            setCurrentSessionId(null);
        }
        prevUserIdRef.current = user?.id || null;
    }, [user]);

    // Scroll history to bottom when opened
    useEffect(() => {
        if (showHistory && historyListRef.current && historySessions.length > 0) {
            setTimeout(() => {
                if (historyListRef.current) {
                    historyListRef.current.scrollTop = historyListRef.current.scrollHeight;
                }
            }, 100);
        }
    }, [showHistory, historySessions]);

    // Save draft whenever prompt or mode changes
    useEffect(() => {
        if (sessionLoaded && user) {
            saveDraft(user.id, { prompt, mode, quality: qualitySetting });
        }
    }, [prompt, mode, sessionLoaded, user, qualitySetting]);

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
                // Trigger explicit check which will update DB if Fal completed
                let dailyRemaining: number | undefined;
                if (pendingGenerationId) {
                    const checkRes = await fetch(`/api/generations/${pendingGenerationId}/check`);
                    if (checkRes.ok) {
                        const checkData = await checkRes.json();
                        if (checkData.status === "completed") {
                            dailyRemaining = checkData.dailyRemaining;
                        }
                    }
                }

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
                        clearPendingGeneration(user.id);

                        const notificationsEnabled = localStorage.getItem("notifications_enabled") !== "false";
                        if (notificationsEnabled) {
                            showToast("Image generation completed!", "success");
                        }

                        // Check daily limit warning
                        if (dailyRemaining !== undefined && dailyRemaining <= 2) {
                            showToast(
                                dailyRemaining === 0
                                    ? "⚠️ Daily limit reached! Upgrade to continue."
                                    : `⚠️ running low! ${dailyRemaining} generations left today.`,
                                "warning"
                            );
                        }
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
        if (sessionLoaded && user) {
            saveSession(user.id, feed, isHero);
        }
    }, [feed, isHero, sessionLoaded, user]);

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
            // Fetch sessions from database API
            const res = await fetch("/api/sessions?type=image&limit=50");
            if (res.ok) {
                const data = await res.json();
                setHistorySessions(data.sessions || []);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingHistory(false);
        }
    };

    // Helper to format session date like ChatGPT
    const formatSessionDate = (dateStr: string): string => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return "Today";
        if (diffDays === 1) return "Yesterday";
        if (diffDays < 7) return date.toLocaleDateString("en-US", { weekday: "long" });
        return date.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
    };

    // Upload image for transform mode
    const uploadTransformImage = async (file: File): Promise<string> => {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/upload", {
            method: "POST",
            body: formData,
        });

        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || "Failed to upload image");
        }

        const data = await res.json();
        return data.url;
    };

    // Handle transform image selection
    const handleTransformImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.startsWith("image/")) {
                showToast("Please upload an image file", "error");
                return;
            }
            if (file.size > 10 * 1024 * 1024) {
                showToast("Image must be less than 10MB", "error");
                return;
            }
            setTransformFile(file);
            const reader = new FileReader();
            reader.onload = (e) => setTransformImage(e.target?.result as string);
            reader.readAsDataURL(file);
        }
    };

    // Remove transform image
    const removeTransformImage = () => {
        setTransformImage(null);
        setTransformFile(null);
        if (transformInputRef.current) transformInputRef.current.value = "";
    };

    const handleGenerate = useCallback(async () => {
        if (!prompt.trim()) {
            showToast("Please enter a prompt to generate", "warning");
            return;
        }

        // For transform mode, require an image
        if (mode === "transform" && !transformImage && !transformFile) {
            showToast("Please upload an image to transform", "warning");
            return;
        }

        const currentPrompt = prompt;
        const currentTransformFile = transformFile;
        const currentTransformImage = transformImage;

        setError(null); // Clear previous errors
        setPrompt(""); // Clear immediately
        setIsHero(false);
        setLoading(true);
        setShowHistory(false);

        // Clear transform image after starting
        if (mode === "transform") {
            setTransformImage(null);
            setTransformFile(null);
            if (transformInputRef.current) transformInputRef.current.value = "";
        }

        // Clear draft since generation has started
        if (user) clearDraft(user.id);

        // Optimistic Update: Add pending item to feed
        const tempId = Date.now().toString();
        const optimisticItem: FeedItem = {
            id: tempId,
            type: "image",
            prompt: currentPrompt,
            status: "pending",
            created_at: new Date().toISOString()
        };

        setFeed(prev => [...prev, optimisticItem]);
        setPendingGenerationId(tempId);
        if (user) savePendingGeneration(user.id, tempId, currentPrompt);

        try {
            if (mode === "transform") {
                // Upload the image first if it's a file
                let imageUrl: string;
                if (currentTransformFile) {
                    imageUrl = await uploadTransformImage(currentTransformFile);
                } else if (currentTransformImage) {
                    // It's already a URL
                    imageUrl = currentTransformImage;
                } else {
                    throw new Error("No image to transform");
                }

                // Get quality setting
                const quality = localStorage.getItem("generation_quality") || "high";

                const res = await fetch("/api/transform-image", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        imageUrl,
                        prompt: currentPrompt,
                        quality,
                    }),
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Transformation failed");

                // Update optimistic item with result
                setFeed(prev => prev.map(item =>
                    item.id === tempId
                        ? { ...item, id: data.generation?.id || tempId, status: "completed", file_url: data.imageUrl }
                        : item
                ));

                const notificationsEnabled = localStorage.getItem("notifications_enabled") !== "false";
                if (notificationsEnabled) {
                    showToast("Image transformed successfully!", "success");
                }

                if (data.dailyRemaining !== undefined && data.dailyRemaining <= 2) {
                    showToast(
                        data.dailyRemaining === 0
                            ? "⚠️ Daily limit reached! Upgrade to continue."
                            : `⚠️ running low! ${data.dailyRemaining} generations left today.`,
                        "warning"
                    );
                }
            } else {
                // Standard generation mode
                const quality = localStorage.getItem("generation_quality") || "high";

                const res = await fetch("/api/generate-image", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ prompt: currentPrompt, quality }),
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Generation failed");

                if (data.status === "pending") {
                    // Async generation started
                    setFeed(prev => prev.map(item =>
                        item.id === tempId
                            ? { ...item, id: data.generationId || tempId, status: "pending" }
                            : item
                    ));

                    // Start polling
                    setPendingGenerationId(data.generationId);
                    if (user) savePendingGeneration(user.id, data.generationId, currentPrompt);
                } else {
                    // Sync generation completed (should not happen with current API but good fallback)
                    setFeed(prev => prev.map(item =>
                        item.id === tempId
                            ? { ...item, id: data.generationId || tempId, status: "completed", file_url: data.url }
                            : item
                    ));
                    showToast("Image generated successfully!", "success");
                }
            }

            // Refresh profile to update credits immediately
            await refreshProfile();
        } catch (err) {
            console.error(err);
            const errorMessage = err instanceof Error ? err.message : "Failed to generate image";
            setError(errorMessage);
            showToast(errorMessage, "error");

            // Mark item as failed
            setFeed(prev => prev.map(item =>
                item.id === tempId
                    ? { ...item, status: "failed" }
                    : item
            ));
            if (user) clearPendingGeneration(user.id);
            setPendingGenerationId(null);
        } finally {
            setLoading(false);
            // Do NOT clear pendingGenerationId here, as we might be polling
        }
    }, [prompt, mode, transformFile, transformImage, user, showToast, refreshProfile]);

    const handleSelectFromHistory = useCallback(async (session: HistorySession) => {
        // Fetch generations for this session from API
        try {
            const res = await fetch(`/api/sessions/${session.id}`);
            if (res.ok) {
                const data = await res.json();
                const generations = data.generations || [];

                const feedItems: FeedItem[] = generations.map((item: any) => ({
                    id: item.id,
                    type: item.type,
                    prompt: item.prompt,
                    file_url: item.file_url || undefined,
                    status: item.status,
                    created_at: item.created_at
                }));

                setFeed(feedItems);
                setCurrentSessionId(session.id);
                setIsHero(false);
                setShowHistory(false);
                showToast(`Loaded session with ${session.generation_count} generation${session.generation_count > 1 ? 's' : ''}`, "info");
            }
        } catch (error) {
            console.error(error);
            showToast("Failed to load session", "error");
        }
    }, [showToast]);



    return (
        <div className="flex flex-col h-full min-h-[calc(100vh-80px)] md:min-h-screen w-full relative overflow-hidden">
            {/* Sticky Header - Unified with Back to Dashboard */}
            <div className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur-xl border-b border-border/50">
                <div className="w-full px-4 md:px-6 py-3">
                    <div className="max-w-5xl mx-auto flex items-center justify-between md:pl-24">
                        {/* Left: Back + Title */}
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => router.push("/")}
                                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <Icon icon="mingcute:arrow-left-line" className="w-4 h-4" />
                                <span className="hidden sm:inline">Dashboard</span>
                            </button>
                            <div className="w-px h-4 bg-border hidden sm:block" />
                            <span className="font-semibold text-foreground">Image Studio</span>
                        </div>

                        {/* Right: Actions */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowHistory(true)}
                                className="px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-all text-sm flex items-center gap-1.5"
                            >
                                <Icon icon="mingcute:history-line" className="w-4 h-4" />
                                <span className="hidden sm:inline">History</span>
                            </button>
                            <Button
                                variant="glass"
                                size="sm"
                                onClick={handleNewSession}
                                className="gap-1.5"
                            >
                                <Icon icon="mingcute:add-line" className="w-4 h-4" />
                                <span>New</span>
                            </Button>
                        </div>
                    </div>
                </div>
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
                            <h2 className="font-semibold">History</h2>
                            <button
                                onClick={() => setShowHistory(false)}
                                className="p-2 rounded-lg hover:bg-white/5 transition-colors text-muted-foreground hover:text-foreground"
                            >
                                ✕
                            </button>
                        </div>
                        {/* History List - Sessions like ChatGPT */}
                        <div ref={historyListRef} className="flex-1 overflow-y-auto">
                            {loadingHistory ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                </div>
                            ) : historySessions.length > 0 ? (
                                <div className="divide-y divide-border">
                                    {historySessions.map((session) => (
                                        <button
                                            key={session.id}
                                            onClick={() => handleSelectFromHistory(session)}
                                            className="w-full p-4 text-left hover:bg-white/5 transition-colors flex gap-3"
                                        >
                                            <div className="w-14 h-14 rounded-xl overflow-hidden bg-surface-2 shrink-0">
                                                {session.preview_image ? (
                                                    <img src={session.preview_image} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                                        <Icon icon="mingcute:pic-line" className="w-6 h-6 opacity-30" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm line-clamp-2 mb-1.5 text-foreground/90">{session.title || session.first_prompt || "Untitled"}</p>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-muted-foreground">{formatSessionDate(session.updated_at)}</span>
                                                    {session.generation_count > 1 && (
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-2 text-muted-foreground">
                                                            {session.generation_count} images
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                                    <Icon icon="mingcute:pic-line" className="w-10 h-10 text-muted-foreground/30 mb-3" />
                                    <p className="text-muted-foreground">No image history yet</p>
                                    <p className="text-xs text-muted-foreground/70 mt-1">Your generated images will appear here</p>
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
                    "text-center space-y-4 md:space-y-6 transition-all duration-700 max-w-2xl mx-auto px-4",
                    isHero ? "opacity-100 translate-y-[-100px] md:translate-y-[-120px]" : "hidden"
                )}>
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-primary tracking-wider uppercase animate-fade-in">
                        <Icon icon="mingcute:palette-fill" className="w-4 h-4" />
                        SQUIRR.AI
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
                        Dream it. <br className="md:hidden" />
                        <span className="text-muted-foreground/50">Create it.</span>
                    </h1>
                </div>

                {/* Loading State with Mascot */}
                {loading && (
                    <div className="absolute inset-0 z-40 flex items-center justify-center bg-background/50 backdrop-blur-sm rounded-2xl">
                        <GenerationLoading type={mode === "transform" ? "video" : "image"} />
                    </div>
                )}

                {/* Error State with Mascot */}
                {error && !loading && (
                    <div className="w-full max-w-2xl mx-auto mb-8 p-6 rounded-2xl bg-destructive/10 border border-destructive/20 animate-fade-in">
                        <div className="flex items-center gap-4">
                            <Icon icon="mingcute:alert-circle-fill" className="w-6 h-6 text-destructive shrink-0" />
                            <div className="flex-1">
                                <p className="font-semibold text-destructive mb-3">{error}</p>
                                <button
                                    onClick={() => setError(null)}
                                    className="text-sm text-destructive hover:underline font-medium"
                                >
                                    Dismiss Error
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Feed Items (Chat Style) */}
                {!isHero && !loading && (
                    <div className="w-full max-w-3xl mx-auto space-y-12">
                        {feed.map((item) => (
                            <FeedItemCard key={item.id} item={item} />
                        ))}
                    </div>
                )}
            </div>

            {/* Hidden file input for transform mode */}
            <input
                ref={transformInputRef}
                type="file"
                accept="image/*"
                onChange={handleTransformImageSelect}
                className="hidden"
            />

            {/* Floating Input Bar - Unified Premium Design */}
            <div className={cn(
                "fixed left-0 right-0 px-4 transition-all duration-700 ease-out z-40",
                isHero
                    ? "bottom-1/2 translate-y-[calc(50%+60px)] md:translate-y-[calc(50%+80px)]"
                    : "bottom-20 md:bottom-8"
            )}
                style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
            >
                <div className="w-full max-w-2xl mx-auto md:pl-24">
                    {/* Clean Solid Container with Batik Touch - Crafted Stone Style */}
                    <div className="relative rounded-xl overflow-hidden shadow-2xl transition-all duration-300 group/container border-2 border-primary/20 bg-surface-2 focus-within:border-primary">
                        {/* Subtle Batik Pattern Watermark - Visible on empty or focus */}
                        <div className="absolute inset-0 pointer-events-none">
                            <BatikPattern color="currentColor" opacity={0.05} />
                        </div>

                        {/* No more glow border, using solid border in parent */}

                        {/* Inner Content */}
                        <div className="relative bg-transparent">
                            {/* Mode Toggle - Minimal Top Bar */}
                            <div className="flex items-center gap-4 px-4 py-3">
                                <button
                                    onClick={() => setMode("generate")}
                                    className={cn(
                                        "relative flex items-center gap-1.5 text-sm font-medium transition-colors pb-0.5",
                                        mode === "generate"
                                            ? "text-foreground"
                                            : "text-muted-foreground hover:text-foreground/70"
                                    )}
                                >
                                    <span>Generate</span>
                                    {mode === "generate" && (
                                        <span className="absolute bottom-0 left-0 right-0 h-px bg-foreground/60 rounded-full" />
                                    )}
                                </button>
                                <button
                                    onClick={() => setMode("transform")}
                                    className={cn(
                                        "relative flex items-center gap-1.5 text-sm font-medium transition-colors pb-0.5",
                                        mode === "transform"
                                            ? "text-foreground"
                                            : "text-muted-foreground hover:text-foreground/70"
                                    )}
                                >
                                    <span>Transform</span>
                                    {mode === "transform" && (
                                        <span className="absolute bottom-0 left-0 right-0 h-px bg-foreground/60 rounded-full" />
                                    )}
                                </button>
                            </div>

                            {/* Transform Image Preview - Compact */}
                            {mode === "transform" && (
                                <div className="px-4 pb-2">
                                    {transformImage ? (
                                        <div className="relative group/img w-fit">
                                            <div className="w-14 h-14 rounded-lg overflow-hidden border border-border/30">
                                                <img src={transformImage} alt="Source" className="w-full h-full object-cover" />
                                            </div>
                                            <button
                                                onClick={removeTransformImage}
                                                className="absolute -top-1.5 -right-1.5 p-1 rounded-full bg-background/90 border border-border/50 opacity-0 group-hover/img:opacity-100 transition-opacity"
                                            >
                                                <Icon icon="mingcute:close-line" className="w-2.5 h-2.5 text-muted-foreground" />
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => transformInputRef.current?.click()}
                                            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground border border-dashed border-border/50 hover:border-border rounded-lg transition-all"
                                        >
                                            <Icon icon="mingcute:upload-3-line" className="w-3.5 h-3.5" />
                                            <span>Upload image</span>
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Textarea - Clean & Minimal */}
                            <div className="px-4 pb-3">
                                <textarea
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder={mode === "transform" ? "Describe how to transform the image..." : "Describe what you want to create..."}
                                    className="w-full bg-transparent border-none focus:ring-0 focus:outline-none min-h-[48px] max-h-[100px] resize-none placeholder:text-muted-foreground/50 text-foreground text-sm leading-relaxed"
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && !e.shiftKey) {
                                            e.preventDefault();
                                            handleGenerate();
                                        }
                                    }}
                                />
                            </div>

                            {/* Bottom Actions - Sleek Bar */}
                            <div className="flex items-center justify-between px-4 pb-3">
                                {/* Quality Selector - Clean Pills */}
                                <div className="hidden sm:flex items-center gap-1">
                                    {([
                                        { key: "low", label: "Fast", tokens: "10" },
                                        { key: "medium", label: "Balanced", tokens: "25" },
                                        { key: "high", label: "Quality", tokens: "40" }
                                    ] as const).map((q) => (
                                        <button
                                            key={q.key}
                                            onClick={() => {
                                                setQualitySetting(q.key);
                                                localStorage.setItem("generation_quality", q.key);
                                            }}
                                            className={cn(
                                                "flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all",
                                                qualitySetting === q.key
                                                    ? "bg-foreground/10 text-foreground"
                                                    : "text-muted-foreground/70 hover:text-muted-foreground"
                                            )}
                                        >
                                            <span>{q.label}</span>
                                            <span className="text-[10px] opacity-60">{q.tokens}</span>
                                        </button>
                                    ))}
                                </div>

                                {/* Generate Button - Premium Pill */}
                                <Button
                                    onClick={handleGenerate}
                                    disabled={loading || !prompt.trim() || (mode === "transform" && !transformImage)}
                                    loading={loading}
                                    className="rounded-full px-5"
                                >
                                    <span>{mode === "transform" ? "Transform" : "Generate"}</span>
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

const FeedItemCard = memo(function FeedItemCard({ item }: { item: FeedItem }) {
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
        <div className="animate-fade-in-up">
            {/* Centered Prompt - Clean, minimal */}
            <div className="flex justify-center mb-6">
                <div className="inline-block px-4 py-2 bg-surface-2/80 border border-border/50 rounded-lg max-w-[90%]">
                    <p className="text-sm text-foreground/80 line-clamp-2 text-center">{item.prompt}</p>
                </div>
            </div>

            {/* Image Container - Full width, modern card */}
            <div className="relative group">
                {item.status === "pending" ? (
                    <div className="w-full aspect-square rounded-2xl md:rounded-3xl bg-surface-2 flex flex-col items-center justify-center border border-border/30">
                        <div className="w-12 h-12 rounded-full border-3 border-primary/30 border-t-primary animate-spin" />
                        <p className="text-sm text-foreground mt-6">Generating...</p>
                        <p className="text-xs text-muted-foreground mt-2">~10-30 seconds</p>
                    </div>
                ) : item.status === "failed" ? (
                    <div className="w-full p-8 rounded-2xl md:rounded-3xl bg-red-500/5 border border-red-500/20 flex flex-col items-center justify-center gap-2">
                        <p className="text-red-400 font-medium">Generation failed</p>
                        <p className="text-sm text-red-300/70">Try again with a different prompt</p>
                    </div>
                ) : item.file_url ? (
                    <div className="relative overflow-hidden rounded-2xl md:rounded-3xl bg-surface-2 border border-border/30 shadow-xl transition-all duration-300 hover:shadow-2xl hover:border-border/50">
                        {/* Image */}
                        <img
                            src={item.file_url}
                            alt="Generated"
                            className="w-full h-auto object-cover"
                        />

                        {/* Hover Overlay with Actions */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-end">
                            <div className="w-full p-4 md:p-6 flex flex-wrap items-center justify-center gap-3">
                                <Button
                                    variant="glass"
                                    size="sm"
                                    onClick={handleDownload}
                                    disabled={isDownloading}
                                    className="bg-white/10 hover:bg-white/20 text-white border-white/20"
                                >
                                    {isDownloading ? "Saving..." : "Download"}
                                </Button>
                                <Button
                                    variant="glass"
                                    size="sm"
                                    className="bg-white/10 hover:bg-white/20 text-white border-white/20"
                                    onClick={() => {
                                        if (item.file_url) {
                                            sessionStorage.setItem("videoSourceImage", item.file_url);
                                            sessionStorage.setItem("videoSourcePrompt", item.prompt);
                                            router.push("/videos");
                                        }
                                    }}
                                >
                                    Create Video
                                </Button>
                            </div>
                        </div>

                        {/* Always visible action bar on mobile */}
                        <div className="md:hidden flex items-center justify-center gap-3 p-4 border-t border-border/30 bg-surface-1">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleDownload}
                                disabled={isDownloading}
                                className="flex-1"
                            >
                                {isDownloading ? "..." : "Download"}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                onClick={() => {
                                    if (item.file_url) {
                                        sessionStorage.setItem("videoSourceImage", item.file_url);
                                        sessionStorage.setItem("videoSourcePrompt", item.prompt);
                                        router.push("/videos");
                                    }
                                }}
                            >
                                Video
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="w-full p-8 rounded-2xl md:rounded-3xl bg-yellow-500/5 border border-yellow-500/20 flex flex-col items-center justify-center gap-2">
                        <p className="text-yellow-400 font-medium">Image unavailable</p>
                        <p className="text-sm text-yellow-300/70">Check your gallery</p>
                    </div>
                )}
            </div>
        </div>
    );
});
