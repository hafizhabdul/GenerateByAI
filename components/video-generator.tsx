"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

type VideoFeedItem = {
    id: string;
    prompt: string;
    imageUrl?: string;
    videoUrl?: string;
    status: "pending" | "processing" | "completed" | "failed";
    duration: string;
    mode: "std" | "pro";
    created_at: string;
    error?: string;
    canExtend?: boolean;
    sourceType?: "image2video" | "text2video";
    taskId?: string; // Kling task ID for polling
    generationId?: string; // Database generation ID
};

type VideoSettings = {
    duration: "5" | "10";
    mode: "std" | "pro";
    aspectRatio: "16:9" | "9:16" | "1:1";
    sound: boolean; // Kling 2.6 native audio
};

type GenerationMode = "image2video" | "text2video";

// LocalStorage keys - will be suffixed with user ID for isolation
const getSessionKey = (userId: string) => `videoGeneratorSession_${userId}`;
const getHeroKey = (userId: string) => `videoGeneratorHero_${userId}`;
const getPendingKey = (userId: string) => `pendingVideos_${userId}`;
const getDraftKey = (userId: string) => `videoGeneratorDraft_${userId}`;

// Helper to save full session to localStorage (user-specific)
const saveSession = (userId: string, feed: VideoFeedItem[], isHero: boolean) => {
    if (!userId) return;
    try {
        localStorage.setItem(getSessionKey(userId), JSON.stringify(feed));
        localStorage.setItem(getHeroKey(userId), JSON.stringify(isHero));
    } catch (e) {
        console.error("Failed to save session:", e);
    }
};

// Helper to load session from localStorage (user-specific)
const loadSession = (userId: string): { feed: VideoFeedItem[]; isHero: boolean } => {
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

// Helper to clear session (user-specific)
const clearSession = (userId: string) => {
    if (!userId) return;
    localStorage.removeItem(getSessionKey(userId));
    localStorage.removeItem(getHeroKey(userId));
    localStorage.removeItem(getPendingKey(userId));
    localStorage.removeItem(getDraftKey(userId));
};

// Helper to save pending videos for polling (user-specific)
const savePendingVideos = (userId: string, items: VideoFeedItem[]) => {
    if (!userId) return;
    const pending = items.filter(i => i.status === "pending" || i.status === "processing");
    if (pending.length > 0) {
        localStorage.setItem(getPendingKey(userId), JSON.stringify(pending));
    } else {
        localStorage.removeItem(getPendingKey(userId));
    }
};

// Helper to load pending videos from localStorage (user-specific)
const loadPendingVideos = (userId: string): VideoFeedItem[] => {
    if (!userId) return [];
    try {
        const stored = localStorage.getItem(getPendingKey(userId));
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.error("Failed to load pending videos:", e);
    }
    return [];
};

// Draft state type for persisting work in progress
type DraftState = {
    prompt: string;
    imagePreview: string | null;
    generationMode: GenerationMode;
    settings: VideoSettings;
};

// Helper to save draft state (image preview, prompt, etc.) - user-specific
const saveDraft = (userId: string, draft: DraftState) => {
    if (!userId) return;
    try {
        localStorage.setItem(getDraftKey(userId), JSON.stringify(draft));
    } catch (e) {
        console.error("Failed to save draft:", e);
    }
};

// Helper to load draft state (user-specific)
const loadDraft = (userId: string): DraftState | null => {
    if (!userId) return null;
    try {
        const stored = localStorage.getItem(getDraftKey(userId));
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.error("Failed to load draft:", e);
    }
    return null;
};

// Helper to clear draft (user-specific)
const clearDraft = (userId: string) => {
    if (!userId) return;
    localStorage.removeItem(getDraftKey(userId));
};

export function VideoGenerator() {
    const [prompt, setPrompt] = useState("");
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [feed, setFeed] = useState<VideoFeedItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [isHero, setIsHero] = useState(true);
    const [showSettings, setShowSettings] = useState(false);
    const [generationMode, setGenerationMode] = useState<GenerationMode>("text2video");
    const [sessionLoaded, setSessionLoaded] = useState(false);
    const [settings, setSettings] = useState<VideoSettings>({
        duration: "5",
        mode: "std",
        aspectRatio: "16:9",
        sound: false, // Kling 2.6 native audio - off by default
    });

    const { showToast } = useToast();
    const { user, refreshProfile } = useAuth();
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const pollingRef = useRef<NodeJS.Timeout | null>(null);

    // Load session from localStorage on mount - user-specific
    useEffect(() => {
        if (!user) {
            // Reset state when no user (logged out)
            setFeed([]);
            setIsHero(true);
            setPrompt("");
            setImagePreview(null);
            setImageFile(null);
            setSessionLoaded(false);
            return;
        }

        const { feed: savedFeed, isHero: savedHero } = loadSession(user.id);
        if (savedFeed.length > 0) {
            setFeed(savedFeed);
            setIsHero(savedHero);
        }
        // Also load pending videos that might need polling
        const pending = loadPendingVideos(user.id);
        if (pending.length > 0) {
            setFeed(prev => {
                const existingIds = new Set(prev.map(p => p.id));
                const newPending = pending.filter(p => !existingIds.has(p.id));
                if (newPending.length > 0) {
                    return [...prev, ...newPending];
                }
                return prev;
            });
            setIsHero(false);
        }
        
        // Load draft state (image preview, prompt, settings)
        const draft = loadDraft(user.id);
        if (draft) {
            if (draft.prompt) setPrompt(draft.prompt);
            if (draft.imagePreview) setImagePreview(draft.imagePreview);
            if (draft.generationMode) setGenerationMode(draft.generationMode);
            if (draft.settings) setSettings(draft.settings);
            // If there's a draft with content, exit hero state
            if (draft.prompt || draft.imagePreview) {
                setIsHero(false);
            }
        }
        
        setSessionLoaded(true);
    }, [user]);

    // Load video history on mount
    useEffect(() => {
        if (user) {
            loadHistory();
        } else {
            setLoadingHistory(false);
        }
    }, [user]);

    // Save session whenever feed changes (after initial load)
    useEffect(() => {
        if (sessionLoaded && user) {
            saveSession(user.id, feed, isHero);
            savePendingVideos(user.id, feed);
        }
    }, [feed, isHero, sessionLoaded, user]);

    // Save draft state whenever prompt, imagePreview, generationMode, or settings change
    useEffect(() => {
        if (sessionLoaded && user) {
            saveDraft(user.id, {
                prompt,
                imagePreview,
                generationMode,
                settings,
            });
        }
    }, [prompt, imagePreview, generationMode, settings, sessionLoaded, user]);

    // Handle page visibility change - resume polling when user returns to tab
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && user) {
                // User returned to tab - reload pending videos and force a poll
                const pending = loadPendingVideos(user.id);
                if (pending.length > 0) {
                    // Merge pending with current feed
                    setFeed(prev => {
                        const existingIds = new Set(prev.map(p => p.id));
                        const newPending = pending.filter(p => !existingIds.has(p.id));
                        if (newPending.length > 0) {
                            return [...prev, ...newPending];
                        }
                        // Update existing items that might have taskIds
                        const updated = prev.map(item => {
                            const pendingItem = pending.find(p => p.id === item.id);
                            if (pendingItem && !item.taskId && pendingItem.taskId) {
                                return { ...item, taskId: pendingItem.taskId, generationId: pendingItem.generationId };
                            }
                            return item;
                        });
                        return updated;
                    });
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [user]);

    // Poll for pending video status
    useEffect(() => {
        const pendingItems = feed.filter(item => 
            (item.status === "pending" || item.status === "processing") && item.taskId
        );

        if (pendingItems.length === 0) {
            if (pollingRef.current) {
                clearInterval(pollingRef.current);
                pollingRef.current = null;
            }
            return;
        }

        const pollStatus = async () => {
            for (const item of pendingItems) {
                if (!item.taskId) continue;
                
                try {
                    const params = new URLSearchParams({
                        taskId: item.taskId,
                        type: item.sourceType || "image2video",
                    });
                    if (item.generationId) {
                        params.set("generationId", item.generationId);
                    }

                    const res = await fetch(`/api/video-status?${params}`);
                    const data = await res.json();

                    if (data.status === "completed" && data.url) {
                        setFeed(prev => {
                            const updated = prev.map(f => 
                                f.id === item.id 
                                    ? { ...f, status: "completed" as const, videoUrl: data.url, canExtend: true }
                                    : f
                            );
                            if (user) savePendingVideos(user.id, updated);
                            return updated;
                        });
                        showToast("🎉 Video generated successfully!", "success");
                        await refreshProfile();
                    } else if (data.status === "failed") {
                        setFeed(prev => {
                            const updated = prev.map(f => 
                                f.id === item.id 
                                    ? { ...f, status: "failed" as const, error: data.error || "Generation failed" }
                                    : f
                            );
                            if (user) savePendingVideos(user.id, updated);
                            return updated;
                        });
                        showToast(data.error || "Video generation failed", "error");
                    }
                    // If still processing, do nothing - wait for next poll
                } catch (err) {
                    console.error("Polling error:", err);
                }
            }
        };

        // Initial poll immediately
        pollStatus();

        // Start interval polling (every 5 seconds)
        if (!pollingRef.current) {
            pollingRef.current = setInterval(pollStatus, 5000);
        }

        return () => {
            if (pollingRef.current) {
                clearInterval(pollingRef.current);
                pollingRef.current = null;
            }
        };
    }, [feed, showToast, refreshProfile]);

    // Check for pre-filled image from image generator
    useEffect(() => {
        const sourceImage = sessionStorage.getItem("videoSourceImage");
        const sourcePrompt = sessionStorage.getItem("videoSourcePrompt");

        if (sourceImage) {
            // Set image preview
            setImagePreview(sourceImage);
            // Auto-switch to image2video mode
            setGenerationMode("image2video");
            // Set a helpful prompt based on whether we have context
            if (sourcePrompt) {
                setPrompt(`Cinematic showcase of ${sourcePrompt}, slow elegant rotation, professional studio lighting, subtle reflections, floating particles effect`);
            } else {
                setPrompt("Smooth cinematic orbit around the subject, professional lighting with soft shadows, gentle zoom effect, high-end commercial quality");
            }
            // Exit hero state to show the input area
            setIsHero(false);
            // Clear session storage
            sessionStorage.removeItem("videoSourceImage");
            sessionStorage.removeItem("videoSourcePrompt");
            // Show toast
            showToast("📸 Image loaded! Customize the motion and click Generate.", "success");
        }
    }, [showToast]);

    const loadHistory = async () => {
        try {
            const res = await fetch("/api/generations?type=video&limit=20");
            const data = await res.json();
            if (res.ok && data.generations?.length > 0) {
                const historyItems: VideoFeedItem[] = data.generations.map((gen: any) => ({
                    id: gen.id,
                    prompt: gen.prompt,
                    imageUrl: gen.metadata?.sourceImage || undefined,
                    videoUrl: gen.file_url,
                    status: "completed" as const,
                    duration: gen.metadata?.duration || "5",
                    mode: gen.metadata?.mode || "std",
                    created_at: gen.created_at,
                    canExtend: !!gen.metadata?.klingVideoId,
                }));
                
                // IMPORTANT: Merge with pending videos instead of replacing!
                // This ensures in-progress generations are not lost when navigating away
                const pendingVideos = user ? loadPendingVideos(user.id) : [];
                const historyIds = new Set(historyItems.map(h => h.id));
                const pendingIds = new Set(pendingVideos.map(p => p.generationId || p.id));
                
                // Filter out completed items that are in pending (they'll be in history with correct status)
                const stillPending = pendingVideos.filter(p => {
                    // Keep if not in history yet (truly pending)
                    if (!historyIds.has(p.id) && !historyIds.has(p.generationId || '')) {
                        return true;
                    }
                    // Check if history says it's still processing
                    const historyItem = historyItems.find(h => h.id === p.generationId || h.id === p.id);
                    return historyItem && historyItem.status !== "completed";
                });
                
                // Combine: history items + still-pending items (deduped)
                const combined = [...historyItems];
                for (const pending of stillPending) {
                    if (!combined.some(c => c.id === pending.id || c.id === pending.generationId)) {
                        combined.push(pending);
                    }
                }
                
                // Sort by created_at
                combined.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                
                setFeed(combined);
                if (combined.length > 0) {
                    setIsHero(false);
                }
            } else {
                // No history from server - load pending from localStorage
                const pendingVideos = user ? loadPendingVideos(user.id) : [];
                if (pendingVideos.length > 0) {
                    setFeed(pendingVideos);
                    setIsHero(false);
                }
            }
        } catch (error) {
            console.error("Failed to load history:");
            // On error, still try to load pending videos
            const pendingVideos = user ? loadPendingVideos(user.id) : [];
            if (pendingVideos.length > 0) {
                setFeed(pendingVideos);
                setIsHero(false);
            }
        } finally {
            setLoadingHistory(false);
        }
    };

    // Calculate token cost (aligned with lib/kling.ts getVideoCost + getAudioCost)
    const getEstimatedCost = useCallback(() => {
        const baseCosts = {
            '5': { std: 100, pro: 120 },
            '10': { std: 180, pro: 220 },
        };
        const videoCost = baseCosts[settings.duration][settings.mode];
        const audioCost = settings.sound ? 50 : 0; // Audio via Video2Audio API
        return videoCost + audioCost;
    }, [settings]);

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

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
            setImageFile(file);
            const reader = new FileReader();
            reader.onload = (e) => setImagePreview(e.target?.result as string);
            reader.readAsDataURL(file);
        }
    };

    const removeImage = () => {
        setImageFile(null);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const uploadImageToStorage = async (file: File): Promise<string> => {
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

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            showToast("Please describe the video you want to create", "warning");
            return;
        }

        // Only require image for image2video mode
        if (generationMode === "image2video" && !imageFile && !imagePreview) {
            showToast("Please upload an image first for Image to Video mode", "warning");
            return;
        }

        const currentPrompt = prompt;
        const currentImage = imagePreview;
        const currentImageFile = imageFile;
        const currentMode = generationMode;

        // Clear input immediately after clicking Generate
        setPrompt("");
        if (currentMode === "image2video") {
            removeImage();
        }
        setIsHero(false);
        setLoading(true);
        
        // Clear draft since generation has started
        clearDraft();

        // Optimistic Update
        const tempId = Date.now().toString();
        const optimisticItem: VideoFeedItem = {
            id: tempId,
            prompt: currentPrompt,
            imageUrl: currentMode === "image2video" ? currentImage || undefined : undefined,
            status: "pending",
            duration: settings.duration,
            mode: settings.mode,
            created_at: new Date().toISOString(),
            sourceType: currentMode,
        };

        setFeed((prev) => {
            const newFeed = [...prev, optimisticItem];
            savePendingVideos(newFeed);
            return newFeed;
        });

        try {
            // Upload image first if it's a file (only for image2video)
            let imageUrl: string | undefined = undefined;
            if (currentMode === "image2video") {
                if (currentImageFile) {
                    setFeed((prev) => {
                        const updated = prev.map((item) =>
                            item.id === tempId ? { ...item, status: "processing" as const } : item
                        );
                        if (user) savePendingVideos(user.id, updated);
                        return updated;
                    });
                    imageUrl = await uploadImageToStorage(currentImageFile);
                } else if (currentImage) {
                    imageUrl = currentImage;
                }
            }

            // Update status to processing
            setFeed((prev) => {
                const updated = prev.map((item) =>
                    item.id === tempId ? { ...item, status: "processing" as const } : item
                );
                if (user) savePendingVideos(user.id, updated);
                return updated;
            });

            // Start async video generation (returns immediately with taskId)
            const res = await fetch("/api/video-start", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    imageUrl,
                    prompt: currentPrompt,
                    mode: settings.mode,
                    duration: settings.duration,
                    aspectRatio: settings.aspectRatio,
                    type: currentMode,
                    sound: settings.sound,
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Video generation failed");

            // Update with taskId for polling - video is now generating in background
            setFeed((prev) => {
                const updated = prev.map((item) =>
                    item.id === tempId
                        ? { 
                            ...item, 
                            status: "processing" as const,
                            taskId: data.taskId,
                            generationId: data.generationId,
                        }
                        : item
                );
                if (user) savePendingVideos(user.id, updated);
                return updated;
            });

            showToast("🚀 Video generation started! You can navigate away - we'll keep generating.", "success");
            
        } catch (err) {
            console.error(err);
            const errorMessage = err instanceof Error ? err.message : "Failed to generate video";
            showToast(errorMessage, "error");

            setFeed((prev) => {
                const updated = prev.map((item) =>
                    item.id === tempId
                        ? { ...item, status: "failed" as const, error: errorMessage }
                        : item
                );
                if (user) savePendingVideos(user.id, updated);
                return updated;
            });
        } finally {
            setLoading(false);
        }
    };

    const handleExtend = async (item: VideoFeedItem) => {
        if (!item.canExtend) {
            showToast("This video cannot be extended", "warning");
            return;
        }

        setLoading(true);

        // Create extending item
        const tempId = Date.now().toString();
        const extendItem: VideoFeedItem = {
            id: tempId,
            prompt: `Extending: ${item.prompt}`,
            status: "processing",
            duration: (parseInt(item.duration) + 5).toString(),
            mode: item.mode,
            created_at: new Date().toISOString(),
        };

        setFeed((prev) => [...prev, extendItem]);

        try {
            const res = await fetch("/api/extend-video", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    generationId: item.id,
                    prompt: item.prompt,
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to extend video");

            setFeed((prev) =>
                prev.map((i) =>
                    i.id === tempId
                        ? {
                            ...i,
                            id: data.generationId || tempId,
                            status: "completed",
                            videoUrl: data.url,
                            duration: data.duration.toString(),
                            canExtend: true,
                        }
                        : i
                )
            );

            showToast("Video extended successfully!", "success");
            await refreshProfile();
        } catch (err) {
            console.error(err);
            const errorMessage = err instanceof Error ? err.message : "Failed to extend video";
            showToast(errorMessage, "error");

            setFeed((prev) =>
                prev.map((i) =>
                    i.id === tempId
                        ? { ...i, status: "failed", error: errorMessage }
                        : i
                )
            );
        } finally {
            setLoading(false);
        }
    };

    const handleNewSession = () => {
        // Stop any polling
        if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
        }
        // Clear state
        setFeed([]);
        setIsHero(true);
        setPrompt("");
        setImagePreview(null);
        setImageFile(null);
        // Clear localStorage for this user
        if (user) clearSession(user.id);
        showToast("Started a new video session", "info");
    };

    return (
        <div className="flex flex-col h-full min-h-[calc(100vh-80px)] md:min-h-screen w-full relative overflow-hidden">
            {/* Background Ambient Glow */}
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] md:w-[800px] h-[400px] md:h-[800px] bg-primary/5 rounded-full blur-[100px] md:blur-[150px] pointer-events-none" />

            {/* Top Controls - New Session Button */}
            {feed.length > 0 && (
                <div className="absolute top-4 right-4 z-40">
                    <Button
                        variant="glass"
                        size="sm"
                        onClick={handleNewSession}
                        className="animate-fade-in group"
                    >
                        <Icon icon="ph:video-camera-plus-duotone" className="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform" />
                        New Session
                    </Button>
                </div>
            )}

            {/* Settings Panel */}
            {showSettings && (
                <div
                    className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-fade-in"
                    onClick={() => setShowSettings(false)}
                >
                    <div
                        className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-card border-l border-border animate-slide-in-right overflow-hidden flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between p-4 border-b border-border">
                            <div className="flex items-center gap-2">
                                <Icon icon="ph:gear-six-duotone" className="w-5 h-5 text-primary" />
                                <h2 className="font-semibold">Video Settings</h2>
                            </div>
                            <button
                                onClick={() => setShowSettings(false)}
                                className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                            >
                                <Icon icon="ph:x" className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-6">
                            {/* Duration */}
                            <div className="space-y-3">
                                <label className="text-sm font-medium">Duration</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {(["5", "10"] as const).map((d) => (
                                        <button
                                            key={d}
                                            onClick={() => setSettings((s) => ({ ...s, duration: d }))}
                                            className={cn(
                                                "p-3 rounded-xl border transition-all text-center",
                                                settings.duration === d
                                                    ? "border-primary bg-primary/10 text-primary"
                                                    : "border-border hover:border-border-hover"
                                            )}
                                        >
                                            {d} seconds
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Quality Mode */}
                            <div className="space-y-3">
                                <label className="text-sm font-medium">Quality</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => setSettings((s) => ({ ...s, mode: "std" }))}
                                        className={cn(
                                            "p-3 rounded-xl border transition-all text-center",
                                            settings.mode === "std"
                                                ? "border-primary bg-primary/10 text-primary"
                                                : "border-border hover:border-border-hover"
                                        )}
                                    >
                                        <div className="font-medium">Standard</div>
                                        <div className="text-xs text-muted-foreground mt-1">Faster</div>
                                    </button>
                                    <button
                                        onClick={() => setSettings((s) => ({ ...s, mode: "pro" }))}
                                        className={cn(
                                            "p-3 rounded-xl border transition-all text-center",
                                            settings.mode === "pro"
                                                ? "border-primary bg-primary/10 text-primary"
                                                : "border-border hover:border-border-hover"
                                        )}
                                    >
                                        <div className="font-medium">Pro</div>
                                        <div className="text-xs text-muted-foreground mt-1">Better quality</div>
                                    </button>
                                </div>
                            </div>

                            {/* Aspect Ratio */}
                            <div className="space-y-3">
                                <label className="text-sm font-medium">Aspect Ratio</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(["16:9", "9:16", "1:1"] as const).map((ratio) => (
                                        <button
                                            key={ratio}
                                            onClick={() => setSettings((s) => ({ ...s, aspectRatio: ratio }))}
                                            className={cn(
                                                "p-3 rounded-xl border transition-all text-center",
                                                settings.aspectRatio === ratio
                                                    ? "border-primary bg-primary/10 text-primary"
                                                    : "border-border hover:border-border-hover"
                                            )}
                                        >
                                            {ratio}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    16:9 for YouTube, 9:16 for TikTok/Reels, 1:1 for Instagram
                                </p>
                            </div>

                            {/* AI Audio Generation */}
                            <div className="space-y-3">
                                <label className="text-sm font-medium flex items-center gap-2">
                                    <Icon icon="ph:speaker-high-duotone" className="w-4 h-4 text-primary" />
                                    AI Audio
                                    <span className="px-1.5 py-0.5 text-[10px] bg-primary/20 text-primary rounded-md font-medium">NEW</span>
                                </label>
                                <button
                                    onClick={() => setSettings((s) => ({ ...s, sound: !s.sound }))}
                                    className={cn(
                                        "w-full p-4 rounded-xl border transition-all text-left",
                                        settings.sound
                                            ? "border-primary bg-primary/10"
                                            : "border-border hover:border-border-hover"
                                    )}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className={cn("font-medium", settings.sound ? "text-primary" : "text-foreground")}>
                                                {settings.sound ? "Audio Enabled" : "Audio Disabled"}
                                            </div>
                                            <div className="text-xs text-muted-foreground mt-1">
                                                {settings.sound
                                                    ? "AI akan generate audio: efek suara, ambient, musik"
                                                    : "Video tanpa audio (silent)"}
                                            </div>
                                        </div>
                                        <div className={cn(
                                            "w-12 h-7 rounded-full transition-all relative",
                                            settings.sound ? "bg-primary" : "bg-surface-3"
                                        )}>
                                            <div className={cn(
                                                "absolute top-1 w-5 h-5 rounded-full bg-white shadow-sm transition-all",
                                                settings.sound ? "left-6" : "left-1"
                                            )} />
                                        </div>
                                    </div>
                                </button>
                                {settings.sound && (
                                    <p className="text-xs text-primary/80 flex items-center gap-1">
                                        <Icon icon="ph:info" className="w-3 h-3" />
                                        Audio menambah +50 token
                                    </p>
                                )}
                            </div>

                            {/* Cost Estimate */}
                            <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm">Estimated Cost</span>
                                    <span className="font-bold text-primary">{getEstimatedCost()} tokens</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Stage */}
            <div
                ref={scrollRef}
                className={cn(
                    "flex-1 overflow-y-auto overflow-x-hidden scroll-smooth",
                    isHero ? "flex items-center justify-center p-4" : "p-4 md:p-8 pb-72 md:pb-80"
                )}
            >
                {/* Hero Content */}
                <div
                    className={cn(
                        "text-center space-y-4 md:space-y-6 transition-all duration-700 max-w-2xl mx-auto",
                        isHero ? "opacity-100 translate-y-[-100px]" : "hidden"
                    )}
                >
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary tracking-wider uppercase animate-fade-in">
                        <Icon icon="ph:video-duotone" className="w-3 h-3" />
                        AI Video Generation
                    </div>
                    <h1
                        className="font-bold tracking-tight text-foreground"
                        style={{ fontSize: "var(--text-5xl)" }}
                    >
                        {generationMode === "text2video" ? "Text to Video" : "Image to Video"}
                    </h1>
                    <p className="text-muted-foreground max-w-md mx-auto">
                        {generationMode === "text2video"
                            ? "Describe any scene and our AI will generate a professional video for you."
                            : "Upload your product image and describe the marketing video you want."}
                    </p>

                    {/* Mode Toggle */}
                    <div className="flex items-center justify-center gap-2 pt-2">
                        <div className="inline-flex p-1 bg-surface-2 rounded-xl border border-border">
                            <button
                                onClick={() => setGenerationMode("text2video")}
                                className={cn(
                                    "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                                    generationMode === "text2video"
                                        ? "bg-primary text-white shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <Icon icon="ph:text-aa" className="w-4 h-4" />
                                Text to Video
                            </button>
                            <button
                                onClick={() => setGenerationMode("image2video")}
                                className={cn(
                                    "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                                    generationMode === "image2video"
                                        ? "bg-primary text-white shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <Icon icon="ph:image" className="w-4 h-4" />
                                Image to Video
                            </button>
                        </div>
                    </div>
                </div>

                {/* Loading History */}
                {loadingHistory && (
                    <div className="flex items-center justify-center py-20">
                        <Icon icon="ph:spinner" className="w-8 h-8 animate-spin text-primary" />
                    </div>
                )}

                {/* Feed Items */}
                {!isHero && !loadingHistory && (
                    <div className="w-full max-w-3xl mx-auto space-y-12">
                        {feed.map((item) => (
                            <VideoFeedCard
                                key={item.id}
                                item={item}
                                onExtend={() => handleExtend(item)}
                                isExtending={loading}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Floating Input Bar */}
            <div
                className={cn(
                    "fixed left-0 right-0 px-4 transition-all duration-700 ease-out z-40",
                    isHero
                        ? "bottom-1/2 translate-y-[calc(50%+120px)]"
                        : "bottom-[calc(5rem+env(safe-area-inset-bottom))] md:bottom-8"
                )}
            >
                <div className="w-full max-w-2xl mx-auto">
                    <div className="rounded-2xl md:rounded-3xl p-3 flex flex-col gap-3 shadow-2xl ring-1 ring-border transition-all duration-300 focus-within:ring-primary/50 bg-surface-1 border border-border">
                        {/* Image Preview - Only show for image2video mode */}
                        {generationMode === "image2video" && imagePreview && (
                            <div className="relative mx-3 mt-1">
                                <div className="relative w-32 h-32 rounded-xl overflow-hidden border border-border">
                                    <img
                                        src={imagePreview}
                                        alt="Product"
                                        className="w-full h-full object-cover"
                                    />
                                    <button
                                        onClick={removeImage}
                                        className="absolute top-1 right-1 p-1 rounded-full bg-black/60 hover:bg-black/80 transition-colors"
                                    >
                                        <Icon icon="ph:x" className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Prompt Input */}
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder={
                                generationMode === "text2video"
                                    ? "Describe your video scene in detail... (e.g., 'Cinematic shot of a luxury perfume bottle rotating slowly on a marble surface, golden hour lighting, soft reflections, particles floating in the air')"
                                    : imagePreview
                                        ? "Describe the motion you want... (e.g., 'Slow zoom in with gentle rotation, soft lighting transitions, particles floating around the product')"
                                        : "Upload your image first, then describe the motion..."
                            }
                            className="w-full bg-transparent border-none focus:ring-0 focus:outline-none px-4 md:px-6 py-2 min-h-[50px] max-h-[100px] resize-none placeholder:text-muted-foreground/70 text-foreground"
                            style={{ fontSize: "var(--text-base)" }}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleGenerate();
                                }
                            }}
                        />

                        {/* Bottom Controls */}
                        <div className="flex items-center justify-between px-2 md:px-4 pb-1 gap-2">
                            <div className="flex items-center gap-2">
                                {/* Mode Toggle (compact) */}
                                <div className="flex items-center p-1 bg-surface-2 rounded-lg border border-border">
                                    <button
                                        onClick={() => setGenerationMode("text2video")}
                                        className={cn(
                                            "p-1.5 rounded transition-all",
                                            generationMode === "text2video"
                                                ? "bg-primary text-white"
                                                : "text-muted-foreground hover:text-foreground"
                                        )}
                                        title="Text to Video"
                                    >
                                        <Icon icon="ph:text-aa" className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setGenerationMode("image2video")}
                                        className={cn(
                                            "p-1.5 rounded transition-all",
                                            generationMode === "image2video"
                                                ? "bg-primary text-white"
                                                : "text-muted-foreground hover:text-foreground"
                                        )}
                                        title="Image to Video"
                                    >
                                        <Icon icon="ph:image" className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Upload Button - Only show for image2video mode */}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="hidden"
                                />
                                {generationMode === "image2video" && (
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className={cn(
                                            "p-2 rounded-lg transition-colors flex items-center gap-2",
                                            imagePreview
                                                ? "text-primary bg-primary/10"
                                                : "text-muted-foreground hover:text-foreground hover:bg-surface-2"
                                        )}
                                    >
                                        <Icon icon="ph:image-duotone" className="w-5 h-5" />
                                        <span className="text-sm hidden sm:inline">
                                            {imagePreview ? "Change" : "Upload"}
                                        </span>
                                    </button>
                                )}

                                {/* Settings Button */}
                                <button
                                    onClick={() => setShowSettings(true)}
                                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors flex items-center gap-2"
                                >
                                    <Icon icon="ph:gear-six-duotone" className="w-5 h-5" />
                                    <span className="text-xs hidden sm:inline">
                                        {settings.duration}s {settings.mode}
                                    </span>
                                </button>
                            </div>

                            {/* Cost Badge & Generate */}
                            <div className="flex items-center gap-3">
                                <div className="text-xs text-muted-foreground hidden sm:block">
                                    <span className="text-primary font-medium">{getEstimatedCost()}</span> tokens
                                </div>
                                <Button
                                    onClick={handleGenerate}
                                    disabled={loading || !prompt.trim() || (generationMode === "image2video" && !imagePreview)}
                                    loading={loading}
                                    size="md"
                                >
                                    {!loading && <Icon icon="ph:video-duotone" className="w-4 h-4" />}
                                    <span className="hidden sm:inline">Generate</span>
                                </Button>
                            </div>
                        </div>

                        {/* Quick Prompt Suggestions */}
                        {!prompt && (
                            <div className="px-3 pb-2 flex flex-wrap gap-2">
                                {(generationMode === "image2video" ? [
                                    "Slow elegant rotation with studio lighting",
                                    "Cinematic zoom in with floating particles",
                                    "Gentle orbit with soft shadow transitions",
                                    "Dynamic reveal with light rays",
                                ] : [
                                    "Luxury perfume bottle rotating on marble, golden hour",
                                    "Coffee cup with steam rising, cozy morning light",
                                    "Tech gadget floating in space with neon glow",
                                    "Nature landscape with cinematic drone movement",
                                ]).map((suggestion, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setPrompt(suggestion)}
                                        className="text-xs px-3 py-1.5 rounded-full bg-surface-2 hover:bg-primary/20 hover:text-primary border border-border transition-colors truncate max-w-[200px]"
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function VideoFeedCard({
    item,
    onExtend,
    isExtending,
}: {
    item: VideoFeedItem;
    onExtend: () => void;
    isExtending: boolean;
}) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const [isDownloading, setIsDownloading] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const { showToast } = useToast();

    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const toggleMute = () => {
        if (videoRef.current) {
            videoRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    const handleDownload = async () => {
        if (!item.videoUrl || isDownloading) return;
        setIsDownloading(true);
        try {
            // Use our API endpoint to bypass CORS and handle download
            const downloadUrl = `/api/download?url=${encodeURIComponent(item.videoUrl)}`;
            
            const response = await fetch(downloadUrl);
            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: "Download failed" }));
                throw new Error(error.error || "Failed to download video");
            }
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `product-video-${Date.now()}.mp4`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            showToast("Video downloaded successfully!", "success");
        } catch (error) {
            console.error("Download error:", error);
            showToast(error instanceof Error ? error.message : "Failed to download video", "error");
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="flex flex-col gap-6 animate-fade-in-up">
            {/* User Prompt Bubble */}
            <div className="flex justify-end gap-3">
                {item.imageUrl && (
                    <div className="w-16 h-16 rounded-xl overflow-hidden border border-border shrink-0">
                        <img src={item.imageUrl} alt="Source" className="w-full h-full object-cover" />
                    </div>
                )}
                <div className="max-w-[70%] bg-surface-2 border border-border rounded-2xl rounded-tr-sm px-6 py-4 shadow-sm">
                    <p className="text-foreground/90 leading-relaxed">{item.prompt}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <Icon icon="ph:clock" className="w-3 h-3" />
                        {item.duration}s {item.mode}
                    </div>
                </div>
            </div>

            {/* AI Response (Video) */}
            <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                    <Icon icon="ph:video-fill" className="w-4 h-4 text-white" />
                </div>

                <div className="flex-1 space-y-3">
                    {item.status === "pending" || item.status === "processing" ? (
                        <VideoProgressIndicator status={item.status} duration={item.duration} />
                    ) : item.status === "failed" ? (
                        <div className="w-full max-w-lg p-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-200">
                            <p className="font-medium mb-1">Failed to generate video</p>
                            <p className="text-sm text-red-300/70">{item.error || "Please try again"}</p>
                        </div>
                    ) : (
                        <div className="relative group w-full max-w-lg">
                            <div className="rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-black/30">
                                <video
                                    ref={videoRef}
                                    src={item.videoUrl}
                                    className="w-full h-auto"
                                    loop
                                    muted={isMuted}
                                    playsInline
                                    onPlay={() => setIsPlaying(true)}
                                    onPause={() => setIsPlaying(false)}
                                />

                                {/* Video Controls Overlay */}
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                                    <button
                                        onClick={togglePlay}
                                        className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors"
                                    >
                                        {isPlaying ? (
                                            <Icon icon="ph:pause-fill" className="w-8 h-8 text-white" />
                                        ) : (
                                            <Icon icon="ph:play-fill" className="w-8 h-8 text-white ml-1" />
                                        )}
                                    </button>
                                </div>

                                {/* Volume Control */}
                                <button
                                    onClick={toggleMute}
                                    className="absolute bottom-3 right-3 p-2 rounded-lg bg-black/50 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    {isMuted ? (
                                        <Icon icon="ph:speaker-simple-x" className="w-4 h-4 text-white" />
                                    ) : (
                                        <Icon icon="ph:speaker-simple-high" className="w-4 h-4 text-white" />
                                    )}
                                </button>
                            </div>

                            {/* Action Bar - Always visible for better UX */}
                            <div className="flex items-center gap-2 mt-3">
                                <Button variant="ghost" size="sm" onClick={handleDownload} disabled={isDownloading}>
                                    <Icon icon={isDownloading ? "ph:spinner" : "ph:download-simple-duotone"} className={cn("w-4 h-4 mr-2", isDownloading && "animate-spin")} />
                                    {isDownloading ? "Downloading..." : "Download"}
                                </Button>
                                {item.canExtend && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={onExtend}
                                        disabled={isExtending}
                                    >
                                        <Icon icon={isExtending ? "ph:spinner" : "ph:arrow-clockwise-duotone"} className={cn("w-4 h-4 mr-2", isExtending && "animate-spin")} />
                                        {isExtending ? "Extending..." : "Extend +5s"}
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Progress indicator component with steps
function VideoProgressIndicator({ status, duration }: { status: string; duration: string }) {
    const [elapsedTime, setElapsedTime] = useState(0);
    const [currentStep, setCurrentStep] = useState(0);

    const steps = [
        { label: "Uploading image", icon: "ph:cloud-arrow-up" },
        { label: "Analyzing content", icon: "ph:brain" },
        { label: "Generating frames", icon: "ph:film-strip" },
        { label: "Rendering video", icon: "ph:video" },
    ];

    // Estimate time based on duration setting
    const estimatedSeconds = duration === "10" ? 300 : 180; // 5 min for 10s, 3 min for 5s

    useEffect(() => {
        const timer = setInterval(() => {
            setElapsedTime((prev) => prev + 1);
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        // Progress through steps based on elapsed time
        if (status === "pending") {
            setCurrentStep(0);
        } else {
            const progress = elapsedTime / estimatedSeconds;
            if (progress < 0.1) setCurrentStep(0);
            else if (progress < 0.3) setCurrentStep(1);
            else if (progress < 0.7) setCurrentStep(2);
            else setCurrentStep(3);
        }
    }, [elapsedTime, status, estimatedSeconds]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    const remainingTime = Math.max(0, estimatedSeconds - elapsedTime);
    const progress = Math.min(100, (elapsedTime / estimatedSeconds) * 100);

    return (
        <div className="w-full max-w-lg rounded-2xl bg-surface-2 border border-white/5 p-6 space-y-5">
            {/* Progress Steps */}
            <div className="space-y-3">
                {steps.map((step, index) => (
                    <div
                        key={step.label}
                        className={cn(
                            "flex items-center gap-3 transition-all duration-300",
                            index < currentStep
                                ? "text-green-400"
                                : index === currentStep
                                    ? "text-primary"
                                    : "text-muted-foreground/50"
                        )}
                    >
                        <div
                            className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                                index < currentStep
                                    ? "bg-green-500/20"
                                    : index === currentStep
                                        ? "bg-primary/20"
                                        : "bg-white/5"
                            )}
                        >
                            {index < currentStep ? (
                                <Icon icon="ph:check-bold" className="w-4 h-4" />
                            ) : index === currentStep ? (
                                <Icon icon="ph:spinner" className="w-4 h-4 animate-spin" />
                            ) : (
                                <Icon icon={step.icon} className="w-4 h-4" />
                            )}
                        </div>
                        <span className="text-sm font-medium">{step.label}</span>
                    </div>
                ))}
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-primary rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Elapsed: {formatTime(elapsedTime)}</span>
                    <span>~{formatTime(remainingTime)} remaining</span>
                </div>
            </div>

            {/* Tips */}
            <p className="text-xs text-muted-foreground/70 text-center">
                💡 Tip: {duration === "10" ? "10 second videos" : "5 second videos"} typically take {duration === "10" ? "3-5" : "2-3"} minutes to generate
            </p>
        </div>
    );
}
