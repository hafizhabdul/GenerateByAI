"use client";

import { useState, useCallback } from "react";
import { Sidebar } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { LongVideoProgress } from "@/components/long-video/LongVideoProgress";

type DurationOption = 60 | 90 | 120;
type ResolutionOption = "720p" | "1080p";
type AspectRatioOption = "16:9" | "9:16" | "1:1";

interface PricingInfo {
    segmentCount: number;
    costPerSegment: number;
    totalCost: number;
    estimatedMinutes: number;
}

const DURATION_OPTIONS: { value: DurationOption; label: string }[] = [
    { value: 60, label: "1 menit (60s)" },
    { value: 90, label: "1.5 menit (90s)" },
    { value: 120, label: "2 menit (120s)" },
];

const RESOLUTION_OPTIONS: { value: ResolutionOption; label: string; cost: number }[] = [
    { value: "720p", label: "720p (Standard)", cost: 120 },
    { value: "1080p", label: "1080p (HD)", cost: 180 },
];

const ASPECT_RATIO_OPTIONS: { value: AspectRatioOption; label: string; icon: string }[] = [
    { value: "16:9", label: "Landscape", icon: "mingcute:aspect-ratio-line" },
    { value: "9:16", label: "Portrait", icon: "mingcute:cellphone-line" },
    { value: "1:1", label: "Square", icon: "mingcute:square-line" },
];

function calculatePricing(duration: DurationOption, resolution: ResolutionOption): PricingInfo {
    const costPerSegment = resolution === "1080p" ? 180 : 120;
    const segmentCount = Math.ceil(duration / 15);
    const totalCost = segmentCount * costPerSegment;
    const estimatedMinutes = segmentCount * 2.5;
    
    return { segmentCount, costPerSegment, totalCost, estimatedMinutes };
}

export default function LongVideoPage() {
    const { user } = useAuth();
    const { showToast } = useToast();

    // Form state
    const [prompt, setPrompt] = useState("");
    const [negativePrompt, setNegativePrompt] = useState("");
    const [duration, setDuration] = useState<DurationOption>(60);
    const [resolution, setResolution] = useState<ResolutionOption>("720p");
    const [aspectRatio, setAspectRatio] = useState<AspectRatioOption>("16:9");
    const [imageUrl, setImageUrl] = useState<string>("");

    // UI state
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeJobId, setActiveJobId] = useState<string | null>(null);
    const [showAdvanced, setShowAdvanced] = useState(false);

    const pricing = calculatePricing(duration, resolution);

    const handleSubmit = async () => {
        if (!prompt.trim()) {
            showToast("Masukkan prompt terlebih dahulu", "error");
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await fetch("/api/long-video/start", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    prompt: prompt.trim(),
                    negativePrompt: negativePrompt.trim() || undefined,
                    targetDuration: duration,
                    resolution,
                    aspectRatio,
                    imageUrl: imageUrl.trim() || undefined,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to start generation");
            }

            showToast("Video generation started!", "success");
            setActiveJobId(data.jobId);

        } catch (error) {
            console.error("Start error:", error);
            showToast(
                error instanceof Error ? error.message : "Failed to start",
                "error"
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleComplete = useCallback((videoUrl: string) => {
        showToast("Video selesai! 🎉", "success");
    }, [showToast]);

    const handleError = useCallback((error: string) => {
        showToast(error, "error");
    }, [showToast]);

    const handleReset = () => {
        setActiveJobId(null);
        setPrompt("");
    };

    if (!user) {
        return (
            <div className="flex min-h-screen w-full bg-background">
                <Sidebar />
                <main className="flex-1 pl-0 md:pl-28 flex items-center justify-center">
                    <div className="text-center">
                        <Icon icon="mingcute:user-3-line" className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-muted-foreground">Please login to use this feature</p>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen min-h-[100dvh] w-full bg-background text-foreground">
            <Sidebar />

            <main className="flex-1 pl-0 md:pl-28 pb-20 md:pb-0">
                <div className="container-fluid py-4 md:py-6 lg:py-8 max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="mb-6">
                        <div className="flex items-center gap-2 mb-2">
                            <Icon icon="mingcute:video-line" className="w-6 h-6 text-primary" />
                            <h1 className="text-2xl font-bold">Long Video Generator</h1>
                            <span className="px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
                                BETA
                            </span>
                        </div>
                        <p className="text-muted-foreground text-sm">
                            Generate video marketing 1-2 menit dengan konsistensi tinggi
                        </p>
                    </div>

                    {/* Active Job Progress */}
                    {activeJobId ? (
                        <div className="space-y-4">
                            <LongVideoProgress
                                jobId={activeJobId}
                                onComplete={handleComplete}
                                onError={handleError}
                            />
                            <Button variant="ghost" onClick={handleReset} className="w-full">
                                <Icon icon="mingcute:add-line" className="w-4 h-4 mr-2" />
                                Buat Video Baru
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Prompt Input */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Prompt</label>
                                <textarea
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder="Describe your video... e.g., 'A woman applying perfume in a luxury bathroom, soft lighting, elegant movements'"
                                    className="w-full h-32 px-4 py-3 bg-surface-2 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                                    maxLength={2000}
                                />
                                <p className="text-xs text-muted-foreground text-right">
                                    {prompt.length}/2000
                                </p>
                            </div>

                            {/* Duration Selection */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Durasi Video</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {DURATION_OPTIONS.map((opt) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => setDuration(opt.value)}
                                            className={cn(
                                                "p-3 rounded-xl border text-sm font-medium transition-all",
                                                duration === opt.value
                                                    ? "border-primary bg-primary/10 text-primary"
                                                    : "border-border bg-surface-2 text-muted-foreground hover:border-primary/50"
                                            )}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Resolution Selection */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Resolusi</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {RESOLUTION_OPTIONS.map((opt) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => setResolution(opt.value)}
                                            className={cn(
                                                "p-3 rounded-xl border text-sm font-medium transition-all",
                                                resolution === opt.value
                                                    ? "border-primary bg-primary/10 text-primary"
                                                    : "border-border bg-surface-2 text-muted-foreground hover:border-primary/50"
                                            )}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Aspect Ratio Selection */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Aspect Ratio</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {ASPECT_RATIO_OPTIONS.map((opt) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => setAspectRatio(opt.value)}
                                            className={cn(
                                                "p-3 rounded-xl border text-sm font-medium transition-all flex items-center justify-center gap-2",
                                                aspectRatio === opt.value
                                                    ? "border-primary bg-primary/10 text-primary"
                                                    : "border-border bg-surface-2 text-muted-foreground hover:border-primary/50"
                                            )}
                                        >
                                            <Icon icon={opt.icon} className="w-4 h-4" />
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Advanced Options */}
                            <div>
                                <button
                                    onClick={() => setShowAdvanced(!showAdvanced)}
                                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                                >
                                    <Icon
                                        icon="mingcute:down-line"
                                        className={cn("w-4 h-4 transition-transform", showAdvanced && "rotate-180")}
                                    />
                                    Advanced Options
                                </button>

                                {showAdvanced && (
                                    <div className="mt-4 space-y-4 p-4 bg-surface-2 rounded-xl border border-border">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Negative Prompt</label>
                                            <input
                                                type="text"
                                                value={negativePrompt}
                                                onChange={(e) => setNegativePrompt(e.target.value)}
                                                placeholder="blurry, low quality, shaky..."
                                                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-sm"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Initial Image URL (optional)</label>
                                            <input
                                                type="url"
                                                value={imageUrl}
                                                onChange={(e) => setImageUrl(e.target.value)}
                                                placeholder="https://..."
                                                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-sm"
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Upload an image to start your video from
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Pricing Preview */}
                            <div className="p-4 bg-surface-2 rounded-xl border border-border">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm font-medium">Estimasi Biaya</span>
                                    <span className="text-lg font-bold text-primary">
                                        {pricing.totalCost} tokens
                                    </span>
                                </div>
                                <div className="grid grid-cols-3 gap-4 text-xs text-muted-foreground">
                                    <div>
                                        <p className="font-medium text-foreground">{pricing.segmentCount}</p>
                                        <p>Segments</p>
                                    </div>
                                    <div>
                                        <p className="font-medium text-foreground">{pricing.costPerSegment}</p>
                                        <p>Token/segment</p>
                                    </div>
                                    <div>
                                        <p className="font-medium text-foreground">~{Math.round(pricing.estimatedMinutes)} min</p>
                                        <p>Waktu proses</p>
                                    </div>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <Button
                                variant="primary"
                                className="w-full h-12 text-base"
                                onClick={handleSubmit}
                                disabled={isSubmitting || !prompt.trim()}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Icon icon="mingcute:loading-line" className="w-5 h-5 mr-2 animate-spin" />
                                        Starting...
                                    </>
                                ) : (
                                    <>
                                        <Icon icon="mingcute:video-line" className="w-5 h-5 mr-2" />
                                        Generate Video ({pricing.totalCost} tokens)
                                    </>
                                )}
                            </Button>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
