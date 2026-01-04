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
};

type VideoSettings = {
    duration: "5" | "10";
    mode: "std" | "pro";
    aspectRatio: "16:9" | "9:16" | "1:1";
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
    const [settings, setSettings] = useState<VideoSettings>({
        duration: "5",
        mode: "std",
        aspectRatio: "16:9",
    });

    const { showToast } = useToast();
    const { user, refreshProfile } = useAuth();
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Load video history on mount
    useEffect(() => {
        if (user) {
            loadHistory();
        } else {
            setLoadingHistory(false);
        }
    }, [user]);

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
                setFeed(historyItems.reverse()); // Oldest first
                setIsHero(false);
            }
        } catch (error) {
            console.error("Failed to load history:", error);
        } finally {
            setLoadingHistory(false);
        }
    };

    // Calculate token cost
    const getEstimatedCost = useCallback(() => {
        const durationSec = parseInt(settings.duration);
        const ratePerSec = settings.mode === "pro" ? 0.8 : 0.6;
        const units = durationSec * ratePerSec;
        return Math.ceil(units * 15);
    }, [settings]);

    // Auto-scroll to bottom when feed updates
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
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
            showToast("Please describe how you want your product video", "warning");
            return;
        }

        if (!imageFile && !imagePreview) {
            showToast("Please upload a product image first", "warning");
            return;
        }

        const currentPrompt = prompt;
        const currentImage = imagePreview;
        setPrompt("");
        setIsHero(false);
        setLoading(true);

        // Optimistic Update
        const tempId = Date.now().toString();
        const optimisticItem: VideoFeedItem = {
            id: tempId,
            prompt: currentPrompt,
            imageUrl: currentImage || undefined,
            status: "pending",
            duration: settings.duration,
            mode: settings.mode,
            created_at: new Date().toISOString(),
        };

        setFeed((prev) => [...prev, optimisticItem]);

        try {
            // Upload image first if it's a file
            let imageUrl = currentImage;
            if (imageFile) {
                setFeed((prev) =>
                    prev.map((item) =>
                        item.id === tempId ? { ...item, status: "processing" } : item
                    )
                );
                imageUrl = await uploadImageToStorage(imageFile);
            }

            // Generate video
            const res = await fetch("/api/generate-video", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    imageUrl,
                    prompt: currentPrompt,
                    mode: settings.mode,
                    duration: settings.duration,
                    aspectRatio: settings.aspectRatio,
                    type: "image2video",
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Video generation failed");

            // Update with result
            setFeed((prev) =>
                prev.map((item) =>
                    item.id === tempId
                        ? { ...item, status: "completed", videoUrl: data.url }
                        : item
                )
            );

            showToast("Video generated successfully!", "success");
            removeImage();
            await refreshProfile();
        } catch (err) {
            console.error(err);
            const errorMessage = err instanceof Error ? err.message : "Failed to generate video";
            showToast(errorMessage, "error");

            setFeed((prev) =>
                prev.map((item) =>
                    item.id === tempId
                        ? { ...item, status: "failed", error: errorMessage }
                        : item
                )
            );
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

    return (
        <div className="flex flex-col h-full min-h-[calc(100vh-80px)] md:min-h-screen w-full relative overflow-hidden">
            {/* Background Ambient Glow */}
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] md:w-[800px] h-[400px] md:h-[800px] bg-violet-500/5 rounded-full blur-[100px] md:blur-[150px] pointer-events-none" />

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
                    isHero ? "flex items-center justify-center p-4" : "p-4 md:p-8 pb-48 md:pb-56"
                )}
            >
                {/* Hero Content */}
                <div
                    className={cn(
                        "text-center space-y-4 md:space-y-6 transition-all duration-700 max-w-2xl mx-auto",
                        isHero ? "opacity-100 translate-y-[-100px]" : "hidden"
                    )}
                >
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 text-xs font-medium text-violet-400 tracking-wider uppercase animate-fade-in">
                        <Icon icon="ph:video-duotone" className="w-3 h-3" />
                        AI Video Generation
                    </div>
                    <h1
                        className="font-bold tracking-tight gradient-text"
                        style={{ fontSize: "var(--text-5xl)" }}
                    >
                        Product to Video
                    </h1>
                    <p className="text-muted-foreground max-w-md mx-auto">
                        Upload your product image and describe the marketing video you want.
                        Our AI will create a professional video for you.
                    </p>
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
                    isHero ? "bottom-1/2 translate-y-[calc(50%+120px)]" : "bottom-20 md:bottom-8"
                )}
            >
                <div className="w-full max-w-2xl mx-auto">
                    <div className="rounded-2xl md:rounded-3xl p-3 flex flex-col gap-3 shadow-2xl ring-1 ring-border transition-all duration-300 focus-within:ring-primary/50 focus-within:shadow-[0_0_50px_rgba(139,92,246,0.15)] bg-background/80 backdrop-blur-xl border border-border">
                        {/* Image Preview */}
                        {imagePreview && (
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
                                imagePreview
                                    ? "Describe the video motion... (e.g., 'Product rotating with dramatic lighting')"
                                    : "First, upload your product image below..."
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
                                {/* Upload Button */}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="hidden"
                                />
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
                                    disabled={loading || !prompt.trim() || !imagePreview}
                                    loading={loading}
                                    size="md"
                                >
                                    {!loading && <Icon icon="ph:video-duotone" className="w-4 h-4" />}
                                    <span className="hidden sm:inline">Generate</span>
                                </Button>
                            </div>
                        </div>
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

    const handleDownload = async () => {
        if (!item.videoUrl) return;
        try {
            const response = await fetch(item.videoUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `product-video-${Date.now()}.mp4`;
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
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-glow">
                    <Icon icon="ph:video-fill" className="w-4 h-4 text-white" />
                </div>

                <div className="flex-1 space-y-3">
                    {item.status === "pending" || item.status === "processing" ? (
                        <div className="w-full aspect-video max-w-lg rounded-2xl bg-surface-2 animate-pulse flex flex-col items-center justify-center border border-white/5">
                            <Icon icon="ph:spinner" className="w-8 h-8 text-primary animate-spin mb-4" />
                            <p className="text-sm text-muted-foreground">
                                {item.status === "pending" ? "Starting video generation..." : "Creating your video..."}
                            </p>
                            <p className="text-xs text-muted-foreground/60 mt-2">
                                This may take 2-5 minutes
                            </p>
                        </div>
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

                            {/* Action Bar */}
                            <div className="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <Button variant="ghost" size="sm" onClick={handleDownload}>
                                    <Icon icon="ph:download-simple-duotone" className="w-4 h-4 mr-2" />
                                    Download
                                </Button>
                                {item.canExtend && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={onExtend}
                                        disabled={isExtending}
                                    >
                                        <Icon icon="ph:arrow-clockwise-duotone" className="w-4 h-4 mr-2" />
                                        Extend +5s
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
