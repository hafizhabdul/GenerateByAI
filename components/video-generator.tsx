"use client";

import { useState, useEffect, useRef, useCallback, memo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { GenerationLoading } from "./loading-states";
import { Mascot } from "./mascot";
import { BatikPattern } from "@/components/ui/batik-pattern";

type VideoTier = "standard" | "premium";

/**
 * Get proxied video URL for videos from external CDNs (fal.ai)
 * This solves CORS issues when playing videos in the browser
 */
function getProxiedVideoUrl(url: string | undefined): string | undefined {
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

type VideoFeedItem = {
    id: string;
    prompt: string;
    imageUrl?: string;
    videoUrl?: string;
    status: "pending" | "processing" | "completed" | "failed";
    duration: string;
    resolution?: "720p" | "1080p";
    mode?: "std" | "pro"; // Legacy, kept for compatibility
    created_at: string;
    error?: string;
    canExtend?: boolean;
    sourceType?: "image2video" | "text2video";
    requestId?: string; // fal.ai request ID for polling (wan/v2.6)
    taskId?: string; // Legacy Kling task ID
    generationId?: string; // Database generation ID
    tier?: VideoTier; // standard (wan/v2.6) or premium (Veo 3.1)
    provider?: string; // fal-wan-v2.6 or fal-veo-3.1
};

type VideoSettings = {
    duration: "5" | "8" | "10" | "15"; // 5/10/15 for standard (wan/v2.6), 5/8 for premium (Veo 3.1)
    resolution: "720p" | "1080p"; // Only for standard tier (wan/v2.6)
    aspectRatio: "16:9" | "9:16" | "1:1";
    tier: VideoTier; // standard (wan/v2.6) or premium (Veo 3.1)
};

type GenerationMode = "image2video" | "text2video";

// Session type from API (database-backed) - same as image-generator
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
const getSessionKey = (userId: string) => `videoGeneratorSession_${userId}`;
const getHeroKey = (userId: string) => `videoGeneratorHero_${userId}`;
const getPendingKey = (userId: string) => `pendingVideos_${userId}`;
const getDraftKey = (userId: string) => `videoGeneratorDraft_${userId}`;

// Maximum items to save in session
const MAX_FEED_ITEMS = 5; // Reduced to prevent quota issues

// Helper to clean feed items for storage (remove large base64 data)
const cleanFeedForStorage = (feed: VideoFeedItem[]): VideoFeedItem[] => {
    return feed.slice(-MAX_FEED_ITEMS).map(item => ({
        ...item,
        // Only keep URL if it's not a base64 data URL (which can be very large)
        imageUrl: item.imageUrl?.startsWith('data:') ? undefined : item.imageUrl,
    }));
};

// Auto-cleanup old generator data when storage is full
const cleanupOldStorageData = () => {
    try {
        // Get all keys and find generator-related ones
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

        // Remove all old generator data
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

// Helper to save full session to localStorage (user-specific)
const saveSession = (userId: string, feed: VideoFeedItem[], isHero: boolean) => {
    if (!userId) return;
    // Clean and limit feed before saving
    const cleanedFeed = cleanFeedForStorage(feed);
    safeLocalStorageSet(getSessionKey(userId), JSON.stringify(cleanedFeed));
    safeLocalStorageSet(getHeroKey(userId), JSON.stringify(isHero));
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
    const [error, setError] = useState<string | null>(null);
    const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [isHero, setIsHero] = useState(true);
    const [showSettings, setShowSettings] = useState(false);
    const [showHistory, setShowHistory] = useState(false); // Start false to avoid hydration mismatch
    const [historySessions, setHistorySessions] = useState<HistorySession[]>([]);
    const [generationMode, setGenerationMode] = useState<GenerationMode>("text2video");
    const [sessionLoaded, setSessionLoaded] = useState(false);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [settings, setSettings] = useState<VideoSettings>({
        duration: "5",
        resolution: "720p",
        aspectRatio: "16:9",
        tier: "standard", // Default to wan/v2.6 (standard tier)
    });

    const { showToast } = useToast();
    const { user, refreshProfile, loading: authLoading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const pollingRef = useRef<NodeJS.Timeout | null>(null);
    const historyListRef = useRef<HTMLDivElement>(null);
    const prevUserIdRef = useRef<string | null>(null);

    const handleNewSession = useCallback(() => {
        // Stop any polling
        if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
        }
        // Clear all state
        setFeed([]);
        setIsHero(true);
        setPrompt("");
        setImagePreview(null);
        setImageFile(null);
        setCurrentSessionId(null); // Clear current session ID
        setGenerationMode("text2video"); // Reset to default mode
        // Reset settings to defaults (but keep user's tier preference)
        setSettings(prev => ({
            ...prev,
            duration: "5",
            resolution: "720p",
            aspectRatio: "16:9",
        }));
        // Clear localStorage for this user
        if (user) {
            clearSession(user.id);
            // Also explicitly clear draft to prevent autosave race condition
            clearDraft(user.id);
        }
        showToast("Started a new video session", "info");
    }, [user, showToast]);

    // Load last session from localStorage on mount
    useEffect(() => {
        // Wait for auth to finish loading before doing anything
        if (authLoading) return;

        if (!user) {
            // Only reset state when auth is done loading AND user is null (actually logged out)
            setFeed([]);
            setIsHero(true);
            setPrompt("");
            setImagePreview(null);
            setImageFile(null);
            setSessionLoaded(false);
            setLoadingHistory(false);
            return;
        }

        const { feed: savedFeed, isHero: savedHero } = loadSession(user.id);

        if (savedFeed.length > 0) {
            setFeed(savedFeed);
            setIsHero(savedHero);

            // Resume polling if there are pending videos
            const hasPending = savedFeed.some(item => item.status === "pending" || item.status === "processing");
            if (hasPending) {
                // Polling logic is handled by another useEffect that watches feed
            }
        } else {
            setFeed([]);
            setIsHero(true);
        }

        // Load showHistory preference (after mount to avoid hydration mismatch)
        const savedShowHistory = localStorage.getItem("videoGeneratorShowHistory");
        if (savedShowHistory === "true") setShowHistory(true);

        setSessionLoaded(true);
        setLoadingHistory(false);
    }, [user, authLoading]);

    // Check for source image from Image Generator (Image-to-Video workflow)
    useEffect(() => {
        if (!sessionLoaded) return;

        const sourceImage = sessionStorage.getItem("videoSourceImage");
        const sourcePrompt = sessionStorage.getItem("videoSourcePrompt");

        if (sourceImage) {
            // Set up Image-to-Video mode with the source image
            setGenerationMode("image2video");
            setImagePreview(sourceImage);
            setIsHero(false);

            // Pre-fill prompt if available
            if (sourcePrompt) {
                setPrompt(sourcePrompt);
            }

            // Clear sessionStorage to prevent re-loading
            sessionStorage.removeItem("videoSourceImage");
            sessionStorage.removeItem("videoSourcePrompt");

            showToast("Ready to create video from your image!", "success");
        }
    }, [sessionLoaded, showToast]);

    // Detect new session request from URL
    useEffect(() => {
        const isNew = searchParams.get("new") === "true";
        if (isNew && sessionLoaded && feed.length === 0) {
            handleNewSession();
            // Clean up URL
            const params = new URLSearchParams(searchParams.toString());
            params.delete("new");
            const newSearch = params.toString();
            router.replace(newSearch ? `/videos?${newSearch}` : "/videos", { scroll: false });
        }
    }, [searchParams, sessionLoaded, feed.length, handleNewSession, router]);

    // Detect user change (logout/login different user) - clear old session
    useEffect(() => {
        if (user && prevUserIdRef.current && prevUserIdRef.current !== user.id) {
            // User changed - clear previous user's session data
            clearSession(prevUserIdRef.current);
            // Reset to new session state
            setFeed([]);
            setIsHero(true);
            setPrompt("");
            setImagePreview(null);
            setImageFile(null);
            setCurrentSessionId(null);
        }
        prevUserIdRef.current = user?.id || null;
    }, [user]);

    // Persist History Panel state
    useEffect(() => {
        localStorage.setItem("videoGeneratorShowHistory", showHistory.toString());
    }, [showHistory]);

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

    // Poll for pending video status (supports both requestId for wan/v2.6 and taskId for legacy)
    useEffect(() => {
        const pendingItems = feed.filter(item =>
            (item.status === "pending" || item.status === "processing") && (item.requestId || item.taskId)
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
                // Use requestId for wan/v2.6, fallback to taskId for legacy
                const pollId = item.requestId || item.taskId;
                if (!pollId) continue;

                try {
                    const params = new URLSearchParams({
                        requestId: pollId,
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
                                    ? {
                                        ...f,
                                        status: "completed" as const,
                                        videoUrl: data.url,
                                        resolution: data.resolution || f.resolution,
                                        canExtend: false, // Extend not supported for wan/v2.6 yet
                                    }
                                    : f
                            );
                            if (user) savePendingVideos(user.id, updated);
                            return updated;
                        });
                        const notificationsEnabled = localStorage.getItem("notifications_enabled") !== "false";
                        if (notificationsEnabled) {
                            showToast("Video generated successfully!", "success");
                        }

                        // Check daily limit warning
                        if (data.dailyRemaining !== undefined && data.dailyRemaining <= 2) {
                            showToast(
                                data.dailyRemaining === 0
                                    ? "⚠️ Daily limit reached! Upgrade to continue."
                                    : `⚠️ running low! ${data.dailyRemaining} generations left today.`,
                                "warning"
                            );
                        }

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

    // Calculate token cost based on tier
    // Standard (wan/v2.6): aligned with lib/fal-wan.ts WAN_VIDEO_COSTS
    // Premium (Veo 3.1): aligned with lib/fal.ts getVeoCost
    const getEstimatedCost = useCallback(() => {
        if (settings.tier === "premium") {
            // Veo 3.1 costs (always with audio) - HIGH MARGIN
            const veoCosts: Record<string, number> = {
                "5": 250,
                "8": 400,
            };
            return veoCosts[settings.duration] || 250;
        }

        // Standard wan/v2.6 costs based on duration + resolution
        // Aligned with WAN_VIDEO_COSTS in lib/fal-wan.ts
        const wanCosts: Record<string, Record<string, number>> = {
            "720p": {
                "5": 40,   // $0.50 cost -> 40 tokens
                "10": 80,  // $1.00 cost -> 80 tokens
                "15": 120, // $1.50 cost -> 120 tokens
            },
            "1080p": {
                "5": 60,   // $0.75 cost -> 60 tokens
                "10": 120, // $1.50 cost -> 120 tokens
                "15": 180, // $2.25 cost -> 180 tokens
            },
        };

        const resolution = settings.resolution || "720p";
        const duration = settings.duration === "8" ? "5" : settings.duration; // Fallback for premium duration
        return wanCosts[resolution]?.[duration] || 40;
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
        setError(null); // Clear previous errors
        setPrompt("");
        if (currentMode === "image2video") {
            removeImage();
        }
        setIsHero(false);
        setLoading(true);

        // Clear draft since generation has started
        if (user) clearDraft(user.id);

        // Optimistic Update
        const tempId = Date.now().toString();
        const optimisticItem: VideoFeedItem = {
            id: tempId,
            prompt: currentPrompt,
            imageUrl: currentMode === "image2video" ? currentImage || undefined : undefined,
            status: "pending",
            duration: settings.duration,
            resolution: settings.tier === "standard" ? settings.resolution : undefined,
            created_at: new Date().toISOString(),
            sourceType: currentMode,
            tier: settings.tier,
            provider: settings.tier === "premium" ? "fal-veo-3.1" : "fal-wan-v2.6",
        };

        setFeed((prev) => {
            const newFeed = [...prev, optimisticItem];
            if (user) savePendingVideos(user.id, newFeed);
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

            // Use different endpoint based on tier
            if (settings.tier === "premium") {
                // Premium tier: Use Veo 3.1 via fal.ai 
                const res = await fetch("/api/generate-video-premium", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        imageUrl,
                        prompt: currentPrompt,
                        duration: settings.duration,
                        aspectRatio: settings.aspectRatio,
                        type: currentMode,
                    }),
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Premium video generation failed");

                if (data.status === "pending") {
                    // Async started
                    setFeed((prev) => {
                        const updated = prev.map((item) =>
                            item.id === tempId
                                ? {
                                    ...item,
                                    status: "pending" as const,
                                    requestId: data.requestId,
                                    generationId: data.generationId
                                }
                                : item
                        );
                        if (user) savePendingVideos(user.id, updated);
                        return updated;
                    });
                } else {
                    // Sync fallback
                    setFeed((prev) => {
                        const updated = prev.map((item) =>
                            item.id === tempId
                                ? {
                                    ...item,
                                    status: "completed" as const,
                                    videoUrl: data.videoUrl,
                                    generationId: data.generation?.id,
                                    tier: "premium" as const,
                                    provider: "fal-veo-3.1",
                                    canExtend: false,
                                }
                                : item
                        );
                        if (user) savePendingVideos(user.id, updated);
                        return updated;
                    });
                    showToast("🎬 Premium video generated with native audio!", "success");
                    if (refreshProfile) refreshProfile();
                }

            } else {
                // Standard tier: Use wan/v2.6 
                const res = await fetch("/api/generate-video-standard", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        imageUrl,
                        prompt: currentPrompt,
                        duration: settings.duration,
                        resolution: settings.resolution,
                        aspectRatio: settings.aspectRatio,
                        type: currentMode,
                    }),
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Video generation failed");

                if (data.status === "pending") {
                    // Async started
                    setFeed((prev) => {
                        const updated = prev.map((item) =>
                            item.id === tempId
                                ? {
                                    ...item,
                                    status: "pending" as const,
                                    requestId: data.requestId,
                                    generationId: data.generationId
                                }
                                : item
                        );
                        if (user) savePendingVideos(user.id, updated);
                        return updated;
                    });
                } else {
                    // Sync fallback
                    setFeed((prev) => {
                        const updated = prev.map((item) =>
                            item.id === tempId
                                ? {
                                    ...item,
                                    status: "completed" as const,
                                    videoUrl: data.videoUrl,
                                    generationId: data.generationId,
                                    resolution: data.resolution || settings.resolution,
                                    tier: "standard" as const,
                                    provider: "fal-wan-v2.6",
                                    canExtend: false,
                                }
                                : item
                        );
                        if (user) savePendingVideos(user.id, updated);
                        return updated;
                    });
                    showToast("Video generated successfully!", "success");
                    if (refreshProfile) refreshProfile();
                }
            }

        } catch (err) {
            console.error(err);
            const errorMessage = err instanceof Error ? err.message : "Failed to generate video";
            setError(errorMessage);
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
        // Only premium (Veo 3.1) videos can be extended
        if (item.tier !== "premium") {
            showToast("Only premium (Veo 3.1) videos can be extended", "warning");
            return;
        }

        setLoading(true);

        // Create extending item
        const tempId = Date.now().toString();
        const extendItem: VideoFeedItem = {
            id: tempId,
            prompt: `Extending: ${item.prompt}`,
            status: "processing",
            duration: (parseInt(item.duration) + 4).toString(), // Veo adds ~4 seconds
            created_at: new Date().toISOString(),
            tier: "premium",
            provider: "fal-veo-3.1",
        };

        setFeed((prev) => [...prev, extendItem]);

        try {
            // Use premium extend API for Veo 3.1 videos
            const res = await fetch("/api/extend-video-premium", {
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
                            id: data.generation?.id || tempId,
                            status: "completed",
                            videoUrl: data.videoUrl,
                            duration: data.duration.toString(),
                            tier: "premium",
                            provider: "fal-veo-3.1",
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

    const handleRegenerate = async (failedItem: VideoFeedItem) => {
        if (regeneratingId) return;
        setRegeneratingId(failedItem.id);

        // Remove the failed item from feed
        setFeed((prev) => prev.filter((f) => f.id !== failedItem.id));

        // Re-trigger generation with the same parameters
        const currentPrompt = failedItem.prompt;
        const currentImage = failedItem.imageUrl;
        const currentMode = failedItem.sourceType || "text2video";
        const itemTier = failedItem.tier || "standard";

        // Create optimistic item
        const tempId = Date.now().toString();
        const optimisticItem: VideoFeedItem = {
            id: tempId,
            prompt: currentPrompt,
            imageUrl: currentMode === "image2video" ? currentImage : undefined,
            status: "pending",
            duration: failedItem.duration,
            resolution: failedItem.resolution || "720p",
            created_at: new Date().toISOString(),
            sourceType: currentMode,
            tier: itemTier,
            provider: itemTier === "premium" ? "fal-veo-3.1" : "fal-wan-v2.6",
        };

        setFeed((prev) => {
            const newFeed = [...prev, optimisticItem];
            if (user) savePendingVideos(user.id, newFeed);
            return newFeed;
        });

        try {
            // Update status to processing
            setFeed((prev) => {
                const updated = prev.map((item) =>
                    item.id === tempId ? { ...item, status: "processing" as const } : item
                );
                if (user) savePendingVideos(user.id, updated);
                return updated;
            });

            if (itemTier === "premium") {
                // Premium tier: Use Veo 3.1 via fal.ai (synchronous)
                const res = await fetch("/api/generate-video-premium", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        imageUrl: currentImage,
                        prompt: currentPrompt,
                        duration: failedItem.duration,
                        aspectRatio: settings.aspectRatio,
                        type: currentMode,
                    }),
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Premium video generation failed");

                setFeed((prev) => {
                    const updated = prev.map((item) =>
                        item.id === tempId
                            ? {
                                ...item,
                                status: "completed" as const,
                                videoUrl: data.videoUrl,
                                generationId: data.generation?.id,
                                tier: "premium" as const,
                                provider: "fal-veo-3.1",
                                canExtend: false,
                            }
                            : item
                    );
                    if (user) savePendingVideos(user.id, updated);
                    return updated;
                });

                showToast("Video regenerated successfully!", "success");
                if (refreshProfile) refreshProfile();
            } else {
                // Standard tier: Use wan/v2.6 (synchronous)
                const res = await fetch("/api/generate-video-standard", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        imageUrl: currentImage,
                        prompt: currentPrompt,
                        duration: failedItem.duration,
                        resolution: failedItem.resolution || "720p",
                        aspectRatio: settings.aspectRatio,
                        type: currentMode,
                    }),
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Video generation failed");

                setFeed((prev) => {
                    const updated = prev.map((item) =>
                        item.id === tempId
                            ? {
                                ...item,
                                status: "completed" as const,
                                videoUrl: data.videoUrl,
                                generationId: data.generationId,
                                resolution: data.resolution || failedItem.resolution || "720p",
                                tier: "standard" as const,
                                provider: "fal-wan-v2.6",
                                canExtend: false,
                            }
                            : item
                    );
                    if (user) savePendingVideos(user.id, updated);
                    return updated;
                });

                showToast("Video regenerated successfully!", "success");
                if (refreshProfile) refreshProfile();
            }
        } catch (err) {
            console.error(err);
            const errorMessage = err instanceof Error ? err.message : "Failed to regenerate video";
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
            setRegeneratingId(null);
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

    // Fetch video sessions when history panel opens
    const fetchVideoHistory = useCallback(async () => {
        if (!user) return;
        try {
            // Use session API instead of generations API
            const res = await fetch("/api/sessions?type=video&limit=50");
            if (res.ok) {
                const data = await res.json();
                setHistorySessions(data.sessions || []);
            }
        } catch (error) {
            console.error("Failed to fetch video history:", error);
        }
    }, [user]);

    // Handle selecting from history - fetch session data and load
    const handleSelectFromHistory = useCallback(async (session: HistorySession) => {
        try {
            const res = await fetch(`/api/sessions/${session.id}`);
            if (res.ok) {
                const data = await res.json();
                const generations = data.generations || [];

                const feedItems: VideoFeedItem[] = generations.map((gen: any) => ({
                    id: gen.id,
                    prompt: gen.prompt,
                    imageUrl: gen.metadata?.sourceImage || undefined,
                    videoUrl: gen.file_url,
                    status: gen.status as "completed" | "failed" | "pending" | "processing",
                    duration: gen.metadata?.duration || "5",
                    mode: gen.metadata?.mode || "std",
                    created_at: gen.created_at,
                    canExtend: !!gen.metadata?.klingVideoId,
                    tier: gen.metadata?.tier || "standard",
                    provider: gen.metadata?.provider,
                }));

                setFeed(feedItems);
                setCurrentSessionId(session.id);
                setIsHero(false);
                setShowHistory(false);
                showToast(`Loaded session with ${session.generation_count} video${session.generation_count > 1 ? 's' : ''}`, "info");
            }
        } catch (error) {
            console.error(error);
            showToast("Failed to load session", "error");
        }
    }, [showToast]);

    // Fetch video history when panel opens
    useEffect(() => {
        if (showHistory && user) {
            fetchVideoHistory();
        }
    }, [showHistory, user, fetchVideoHistory]);

    return (
        <div className="flex flex-col h-full min-h-[calc(100vh-80px)] md:min-h-screen w-full relative">
            {/* Background Ambient Glow */}
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] md:w-[800px] h-[400px] md:h-[800px] bg-foreground/5 rounded-full blur-[100px] md:blur-[150px] pointer-events-none" />

            {/* Sticky Header - Unified with Back to Dashboard (matching Image Studio) */}
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
                            <span className="font-semibold text-foreground">Video Studio</span>
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
                            {historySessions.length > 0 ? (
                                <div className="divide-y divide-border">
                                    {historySessions.map((session) => (
                                        <button
                                            key={session.id}
                                            onClick={() => handleSelectFromHistory(session)}
                                            className="w-full p-4 text-left hover:bg-white/5 transition-colors flex gap-3"
                                        >
                                            <div className="w-14 h-14 rounded-xl overflow-hidden bg-surface-2 shrink-0 relative group">
                                                {session.preview_image ? (
                                                    <img
                                                        src={session.preview_image}
                                                        alt=""
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).style.display = 'none';
                                                            (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                                        }}
                                                    />
                                                ) : null}
                                                <div className={cn(
                                                    "absolute inset-0 flex items-center justify-center bg-surface-3",
                                                    session.preview_image ? "hidden" : ""
                                                )}>
                                                    <Icon icon="mingcute:movie-line" className="w-6 h-6 text-muted-foreground/40" />
                                                </div>
                                                <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Icon icon="mingcute:play-fill" className="w-4 h-4 text-white" />
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm line-clamp-2 mb-1.5 text-foreground/90">{session.title || session.first_prompt || "Untitled"}</p>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-muted-foreground">{formatSessionDate(session.updated_at)}</span>
                                                    {session.generation_count > 1 && (
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-2 text-muted-foreground">
                                                            {session.generation_count} videos
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                                    <Mascot expression="confused" size="large" />
                                    <p className="text-muted-foreground mt-6 font-semibold">Belum ada video</p>
                                    <p className="text-xs text-muted-foreground/70 mt-2">Video yang kamu buat akan muncul di sini</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Settings Panel - Ultra Minimal Design */}
            {showSettings && (
                <div
                    className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-fade-in flex items-center justify-center p-4"
                    onClick={() => setShowSettings(false)}
                >
                    <div
                        className="w-full max-w-sm bg-background/95 backdrop-blur-xl border border-border/40 rounded-2xl overflow-hidden animate-scale-in"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header - Clean & Minimal */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-border/30">
                            <h2 className="text-sm font-medium text-foreground">Video Settings</h2>
                            <button
                                onClick={() => setShowSettings(false)}
                                className="text-muted-foreground hover:text-foreground transition-colors text-lg leading-none"
                            >
                                ×
                            </button>
                        </div>

                        <div className="p-5 space-y-6">
                            {/* Model Selection - Simple Toggle */}
                            <div className="space-y-3">
                                <label className="text-xs text-muted-foreground">Model</label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setSettings((s) => ({ ...s, tier: "standard", duration: "5", resolution: "720p" }))}
                                        className={cn(
                                            "flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-all border",
                                            settings.tier === "standard"
                                                ? "border-primary/50 bg-primary/5 text-foreground"
                                                : "border-border/30 text-muted-foreground hover:text-foreground hover:border-border/50"
                                        )}
                                    >
                                        <div className="text-left">
                                            <div>Standard</div>
                                            <div className="text-[10px] opacity-60 font-normal mt-0.5">Up to 15s</div>
                                        </div>
                                    </button>
                                    <button
                                        onClick={() => setSettings((s) => ({ ...s, tier: "premium", duration: "5" }))}
                                        className={cn(
                                            "flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-all border",
                                            settings.tier === "premium"
                                                ? "border-primary/50 bg-primary/5 text-foreground"
                                                : "border-border/30 text-muted-foreground hover:text-foreground hover:border-border/50"
                                        )}
                                    >
                                        <div className="text-left">
                                            <div>Premium</div>
                                            <div className="text-[10px] opacity-60 font-normal mt-0.5">With Audio</div>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* Duration - Clean Pills */}
                            <div className="space-y-3">
                                <label className="text-xs text-muted-foreground">Duration</label>
                                <div className="flex gap-2">
                                    {(settings.tier === "premium" ? ["5", "8"] : ["5", "10", "15"]).map((d) => (
                                        <button
                                            key={d}
                                            onClick={() => setSettings((s) => ({ ...s, duration: d as "5" | "8" | "10" | "15" }))}
                                            className={cn(
                                                "flex-1 py-2 rounded-lg text-sm font-medium transition-all",
                                                settings.duration === d
                                                    ? "bg-foreground/10 text-foreground"
                                                    : "text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            {d}s
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Resolution - Only for Standard */}
                            {settings.tier === "standard" && (
                                <div className="space-y-3">
                                    <label className="text-xs text-muted-foreground">Resolution</label>
                                    <div className="flex gap-2">
                                        {(["720p", "1080p"] as const).map((res) => (
                                            <button
                                                key={res}
                                                onClick={() => setSettings((s) => ({ ...s, resolution: res }))}
                                                className={cn(
                                                    "flex-1 py-2 rounded-lg text-sm font-medium transition-all",
                                                    settings.resolution === res
                                                        ? "bg-foreground/10 text-foreground"
                                                        : "text-muted-foreground hover:text-foreground"
                                                )}
                                            >
                                                {res}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Aspect Ratio - Only for Standard */}
                            {settings.tier === "standard" && (
                                <div className="space-y-3">
                                    <label className="text-xs text-muted-foreground">Aspect Ratio</label>
                                    <div className="flex gap-2">
                                        {(["16:9", "9:16", "1:1"] as const).map((ratio) => (
                                            <button
                                                key={ratio}
                                                onClick={() => setSettings((s) => ({ ...s, aspectRatio: ratio }))}
                                                className={cn(
                                                    "flex-1 py-2 rounded-lg text-sm font-medium transition-all",
                                                    settings.aspectRatio === ratio
                                                        ? "bg-foreground/10 text-foreground"
                                                        : "text-muted-foreground hover:text-foreground"
                                                )}
                                            >
                                                {ratio}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer - Token Cost */}
                        <div className="px-5 py-4 border-t border-border/30 flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Estimated cost</span>
                            <span className="text-sm font-medium text-foreground">{getEstimatedCost()} tokens</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Stage */}
            <div
                ref={scrollRef}
                className={cn(
                    "flex-1 overflow-y-auto overflow-x-hidden scroll-smooth",
                    isHero ? "flex items-center justify-center p-4" : "p-4 md:p-8 pb-80 md:pb-96"
                )}
            >
                {/* Hero Content */}
                <div
                    className={cn(
                        "text-center space-y-4 md:space-y-6 transition-all duration-700 max-w-2xl mx-auto",
                        isHero ? "opacity-100 translate-y-[-160px] md:translate-y-[-180px]" : "hidden"
                    )}
                >
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-primary tracking-wider uppercase animate-fade-in">
                        <Icon icon="mingcute:movie-line" className="w-4 h-4" />
                        AI Video Studio
                    </div>
                    <h1
                        className="text-4xl md:text-5xl font-bold tracking-tight text-foreground"
                    >
                        {generationMode === "text2video" ? "Text to Video" : "Image to Video"}
                    </h1>
                    <p className="text-muted-foreground max-w-md mx-auto">
                        {generationMode === "text2video"
                            ? "Describe any scene and our AI will generate a professional video for you."
                            : "Upload your product image and describe the marketing video you want."}
                    </p>

                </div>

                {/* Loading History */}
                {loadingHistory && (
                    <div className="flex items-center justify-center py-20">
                        <Icon icon="mingcute:loading-line" className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                )}

                {/* Loading State with Mascot */}
                {loading && (
                    <div className="absolute inset-0 z-40 flex items-center justify-center bg-background/50 backdrop-blur-sm rounded-2xl">
                        <GenerationLoading type="video" />
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

                {/* Feed Items */}
                {!isHero && !loadingHistory && !loading && (
                    <div className="w-full max-w-3xl mx-auto space-y-12">
                        {feed.map((item) => (
                            <VideoFeedCard
                                key={item.id}
                                item={item}
                                onExtend={() => handleExtend(item)}
                                onRegenerate={() => handleRegenerate(item)}
                                isExtending={loading}
                                isRegenerating={regeneratingId === item.id}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Floating Input Bar - Unified Premium Design */}
            <div
                className={cn(
                    "fixed left-0 right-0 px-4 transition-all duration-700 ease-out z-40",
                    isHero
                        ? "bottom-1/2 translate-y-[calc(50%+110px)] md:translate-y-[calc(50%+130px)]"
                        : "bottom-20 md:bottom-8"
                )}
                style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
            >
                <div className="w-full max-w-2xl mx-auto md:pl-24">
                    {/* Clean Solid Container with Batik Touch - Crafted Stone Style */}
                    <div className="relative rounded-xl overflow-hidden shadow-2xl transition-all duration-300 group/container border-2 border-primary/20 bg-surface-2 focus-within:border-primary">
                        {/* Subtle Batik Pattern Watermark */}
                        <div className="absolute inset-0 pointer-events-none">
                            <BatikPattern color="currentColor" opacity={0.05} />
                        </div>

                        {/* Inner Content */}
                        <div className="relative bg-transparent">
                            {/* Mode Toggle - Minimal Top Bar */}
                            <div className="flex items-center justify-between px-4 py-3">
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => setGenerationMode("text2video")}
                                        className={cn(
                                            "relative flex items-center gap-1.5 text-sm font-medium transition-colors pb-0.5",
                                            generationMode === "text2video"
                                                ? "text-foreground"
                                                : "text-muted-foreground hover:text-foreground/70"
                                        )}
                                    >
                                        <span>Text to Video</span>
                                        {generationMode === "text2video" && (
                                            <span className="absolute bottom-0 left-0 right-0 h-px bg-foreground/60 rounded-full" />
                                        )}
                                    </button>
                                    <button
                                        onClick={() => setGenerationMode("image2video")}
                                        className={cn(
                                            "relative flex items-center gap-1.5 text-sm font-medium transition-colors pb-0.5",
                                            generationMode === "image2video"
                                                ? "text-foreground"
                                                : "text-muted-foreground hover:text-foreground/70"
                                        )}
                                    >
                                        <span>Image to Video</span>
                                        {generationMode === "image2video" && (
                                            <span className="absolute bottom-0 left-0 right-0 h-px bg-foreground/60 rounded-full" />
                                        )}
                                    </button>
                                </div>

                                {/* Video Settings - Clean Text Link */}
                                <button
                                    onClick={() => setShowSettings(true)}
                                    className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    Video Settings
                                </button>
                            </div>

                            {/* Image Preview - Compact */}
                            {generationMode === "image2video" && imagePreview && (
                                <div className="px-4 pb-2">
                                    <div className="relative group/img w-fit">
                                        <div className="w-14 h-14 rounded-lg overflow-hidden border border-border/30">
                                            <img src={imagePreview} alt="Source" className="w-full h-full object-cover" />
                                        </div>
                                        <button
                                            onClick={removeImage}
                                            className="absolute -top-1.5 -right-1.5 p-1 rounded-full bg-background/90 border border-border/50 opacity-0 group-hover/img:opacity-100 transition-opacity"
                                        >
                                            <Icon icon="mingcute:close-line" className="w-2.5 h-2.5 text-muted-foreground" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Textarea - Clean & Minimal */}
                            <div className="px-4 pb-3">
                                <textarea
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder={
                                        generationMode === "text2video"
                                            ? "Describe the video you want to create..."
                                            : imagePreview
                                                ? "Describe how you want the image to move..."
                                                : "Upload an image first..."
                                    }
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
                                <div className="flex items-center gap-2">
                                    {/* Upload Button for Image Mode */}
                                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                                    {generationMode === "image2video" && !imagePreview && (
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground border border-dashed border-border/50 hover:border-border rounded-lg transition-all"
                                        >
                                            <Icon icon="mingcute:upload-3-line" className="w-3.5 h-3.5" />
                                            <span>Upload</span>
                                        </button>
                                    )}
                                </div>

                                <div className="flex items-center gap-3">
                                    {/* Token Cost */}
                                    <span className="text-xs text-muted-foreground">
                                        {getEstimatedCost()} tokens
                                    </span>

                                    {/* Generate Button - Premium Pill */}
                                    <button
                                        onClick={handleGenerate}
                                        disabled={loading || !prompt.trim() || (generationMode === "image2video" && !imagePreview)}
                                        className={cn(
                                            "flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                                            loading || !prompt.trim() || (generationMode === "image2video" && !imagePreview)
                                                ? "bg-muted/50 text-muted-foreground cursor-not-allowed"
                                                : "bg-primary text-primary-foreground hover:bg-primary-hover active:scale-[0.98]"
                                        )}
                                    >
                                        {loading ? (
                                            <Icon icon="mingcute:loading-line" className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                            <Icon icon="mingcute:sparkles-2-line" className="w-3.5 h-3.5" />
                                        )}
                                        <span>Generate</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Suggestions - Floating Pills Below */}
                    {!prompt && (
                        <div className="flex flex-wrap justify-center gap-2 mt-3 px-2">
                            {(generationMode === "image2video" ? [
                                "Slow rotation with soft lighting",
                                "Gentle zoom with particles",
                                "Cinematic orbit",
                                "Light reveal effect",
                            ] : [
                                "Perfume bottle on marble surface",
                                "Coffee with rising steam",
                                "Floating tech product",
                                "Cinematic landscape",
                            ]).map((suggestion, i) => (
                                <button
                                    key={i}
                                    onClick={() => setPrompt(suggestion)}
                                    className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground bg-surface-2/30 hover:bg-surface-2/60 rounded-full transition-all"
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

const VideoFeedCard = memo(function VideoFeedCard({
    item,
    onExtend,
    onRegenerate,
    isExtending,
    isRegenerating,
}: {
    item: VideoFeedItem;
    onExtend: () => void;
    onRegenerate: () => void;
    isExtending: boolean;
    isRegenerating: boolean;
}) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const videoRef = useRef<HTMLVideoElement>(null);

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
                        <Icon icon="mingcute:time-fill" className="w-3 h-3" />
                        {item.duration}s {item.resolution && `• ${item.resolution}`}
                        {item.tier === "premium" && (
                            <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-foreground/5 text-foreground rounded-md">
                                Veo 3.1
                            </span>
                        )}
                        {item.tier !== "premium" && (
                            <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-surface-3 text-muted-foreground rounded-md">
                                {item.provider === "fal-wan-v2.6" ? "wan/v2.6" : "Standard"}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* AI Response (Video) */}
            <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-foreground flex items-center justify-center shrink-0">
                    <Icon icon="mingcute:movie-fill" className="w-4 h-4 text-background" />
                </div>

                <div className="flex-1 space-y-3">
                    {item.status === "pending" || item.status === "processing" ? (
                        <VideoProgressIndicator status={item.status} duration={item.duration} />
                    ) : item.status === "failed" ? (
                        <div className="w-full max-w-lg p-6 rounded-2xl bg-red-500/10 border border-red-500/20">
                            <div className="flex items-center gap-3 mb-3">
                                <Icon icon="mingcute:warning-fill" className="w-5 h-5 text-red-400" />
                                <p className="font-medium text-red-200">Failed to generate video</p>
                            </div>
                            <p className="text-sm text-red-300/70 mb-4">{item.error || "Something went wrong. Please try again."}</p>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onRegenerate}
                                disabled={isRegenerating}
                                className="border-red-500/30 hover:bg-red-500/10 text-red-200 hover:text-red-100"
                            >
                                <Icon icon={isRegenerating ? "mingcute:loading-fill" : "mingcute:refresh-2-line"} className={cn("w-4 h-4 mr-2", isRegenerating && "animate-spin")} />
                                {isRegenerating ? "Regenerating..." : "Try Again"}
                            </Button>
                        </div>
                    ) : (
                        <div className="relative group w-full max-w-lg">
                            <div className="rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-black/30">
                                <video
                                    ref={videoRef}
                                    src={getProxiedVideoUrl(item.videoUrl)}
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
                                            <Icon icon="mingcute:pause-fill" className="w-8 h-8 text-white" />
                                        ) : (
                                            <Icon icon="mingcute:play-fill" className="w-8 h-8 text-white ml-1" />
                                        )}
                                    </button>
                                </div>

                                {/* Volume Control */}
                                <button
                                    onClick={toggleMute}
                                    className="absolute bottom-3 right-3 p-2 rounded-xl bg-black/50 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    {isMuted ? (
                                        <Icon icon="mingcute:volume-mute-fill" className="w-4 h-4 text-white" />
                                    ) : (
                                        <Icon icon="mingcute:volume-fill" className="w-4 h-4 text-white" />
                                    )}
                                </button>
                            </div>

                            {/* Action Bar - Always visible for better UX */}
                            <div className="flex items-center gap-2 mt-3">
                                {/* Extend button - only for premium (Veo 3.1) videos */}
                                {item.tier === "premium" && item.status === "completed" && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={onExtend}
                                        disabled={isExtending}
                                        className="bg-surface-2 hover:bg-surface-3"
                                    >
                                        <Icon icon={isExtending ? "mingcute:loading-fill" : "mingcute:refresh-2-fill"} className={cn("w-4 h-4 mr-2", isExtending && "animate-spin")} />
                                        {isExtending ? "Extending..." : "Extend +4s"}
                                    </Button>
                                )}
                                {/* Show premium badge */}
                                {item.tier === "premium" && (
                                    <span className="flex items-center gap-1 text-xs text-foreground px-2 py-1 bg-surface-2 rounded-md">
                                        <Icon icon="mingcute:volume-fill" className="w-3 h-3" />
                                        Audio included
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

// Progress indicator component with steps
function VideoProgressIndicator({ status, duration }: { status: string; duration: string }) {
    const [elapsedTime, setElapsedTime] = useState(0);
    const [currentStep, setCurrentStep] = useState(0);

    const steps = [
        { label: "Uploading image", icon: "mingcute:upload-2-fill" },
        { label: "Analyzing content", icon: "mingcute:brain-fill" },
        { label: "Generating frames", icon: "mingcute:film-fill" },
        { label: "Rendering video", icon: "mingcute:movie-fill" },
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
                                ? "text-sky-400"
                                : index === currentStep
                                    ? "text-foreground"
                                    : "text-muted-foreground/50"
                        )}
                    >
                        <div
                            className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                                index < currentStep
                                    ? "bg-sky-500/20"
                                    : index === currentStep
                                        ? "bg-foreground/10"
                                        : "bg-white/5"
                            )}
                        >
                            {index < currentStep ? (
                                <Icon icon="mingcute:check-fill" className="w-4 h-4" />
                            ) : index === currentStep ? (
                                <Icon icon="mingcute:loading-fill" className="w-4 h-4 animate-spin" />
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
                        className="h-full bg-foreground rounded-full transition-all duration-1000 ease-out"
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
