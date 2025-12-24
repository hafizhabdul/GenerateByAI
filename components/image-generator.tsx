"use client";

import { useState, useRef } from "react";
import { Loader2, Send, Image as ImageIcon, Film, Sparkles, Zap, Download, RotateCcw, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";

export function ImageGenerator() {
    const [prompt, setPrompt] = useState("");
    const [loading, setLoading] = useState(false);
    const [image, setImage] = useState<string | null>(null);
    const [mode, setMode] = useState<"image" | "video">("image");
    const [isHero, setIsHero] = useState(true);
    const { showToast } = useToast();
    const imageRef = useRef<HTMLImageElement>(null);

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            showToast("Please enter a prompt to generate", "warning");
            return;
        }

        setLoading(true);
        setIsHero(false);
        setImage(null);

        try {
            if (mode === "video") {
                await new Promise(resolve => setTimeout(resolve, 2000));
                showToast("Video generation coming soon!", "info");
                setLoading(false);
                return;
            }

            const res = await fetch("/api/generate-image", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Generation failed");

            setImage(data.url);
            showToast("Image generated successfully!", "success");
        } catch (err) {
            console.error(err);
            showToast(err instanceof Error ? err.message : "Failed to generate image", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async () => {
        if (!image) return;

        try {
            const response = await fetch(image);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `ai-generated-${Date.now()}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            showToast("Image downloaded!", "success");
        } catch {
            showToast("Failed to download image", "error");
        }
    };

    const handleCopyPrompt = () => {
        navigator.clipboard.writeText(prompt);
        showToast("Prompt copied to clipboard!", "success");
    };

    const handleReset = () => {
        setPrompt("");
        setImage(null);
        setIsHero(true);
    };

    return (
        <div className="flex flex-col h-full min-h-[calc(100vh-80px)] md:min-h-screen w-full relative overflow-hidden">
            {/* Background Ambient Glow */}
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] md:w-[800px] h-[400px] md:h-[800px] bg-primary/5 rounded-full blur-[100px] md:blur-[150px] pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-[200px] md:w-[400px] h-[200px] md:h-[400px] bg-purple-500/5 rounded-full blur-[80px] md:blur-[120px] pointer-events-none" />

            {/* Main Stage */}
            <div className={cn(
                "flex-1 flex flex-col items-center transition-all duration-700 ease-out px-4 md:px-8",
                isHero ? "justify-center pb-40 md:pb-48" : "justify-start pt-6 md:pt-12 pb-40 md:pb-36"
            )}>

                {/* Hero Text (Only visible in Hero Mode) */}
                <div className={cn(
                    "text-center space-y-4 md:space-y-6 mb-8 md:mb-12 transition-all duration-700",
                    isHero ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-10 hidden"
                )}>
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-primary tracking-wider uppercase animate-fade-in">
                        <Zap className="w-3 h-3 fill-current" />
                        AI Creative Studio
                    </div>

                    {/* Headline */}
                    <h1 className="font-bold tracking-tight gradient-text" style={{ fontSize: "var(--text-5xl)" }}>
                        Dream it. <br className="md:hidden" />
                        <span className="text-white/20">Create it.</span>
                    </h1>

                    {/* Subtitle */}
                    <p className="text-muted-foreground max-w-md mx-auto" style={{ fontSize: "var(--text-base)" }}>
                        Transform your imagination into stunning visuals with the power of AI
                    </p>
                </div>

                {/* Result Area */}
                {!isHero && (
                    <div className="w-full max-w-4xl flex-1 flex flex-col items-center justify-center animate-fade-in-up">
                        {loading ? (
                            <div className="flex flex-col items-center gap-6">
                                {/* Animated Loader */}
                                <div className="relative w-20 h-20 md:w-24 md:h-24">
                                    <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
                                    <div className="absolute inset-2 rounded-full border-2 border-transparent border-r-purple-500 animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
                                    <div className="absolute inset-4 rounded-full border-2 border-transparent border-b-indigo-500 animate-spin" style={{ animationDuration: "2s" }} />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <Sparkles className="w-6 h-6 md:w-8 md:h-8 text-primary animate-pulse" />
                                    </div>
                                </div>
                                <div className="text-center space-y-2">
                                    <p className="text-foreground font-medium" style={{ fontSize: "var(--text-lg)" }}>Creating your masterpiece...</p>
                                    <p className="text-muted-foreground text-sm">This may take a few seconds</p>
                                </div>
                            </div>
                        ) : image ? (
                            <div className="w-full space-y-4">
                                {/* Image Container */}
                                <div className="relative group rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-black/30 mx-auto">
                                    <img
                                        ref={imageRef}
                                        src={image}
                                        alt="Generated"
                                        className="w-full max-h-[50vh] md:max-h-[60vh] object-contain animate-fade-in"
                                    />

                                    {/* Hover Overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-end justify-between p-4 md:p-6">
                                        <p className="text-white/80 text-sm max-w-[60%] line-clamp-2">{prompt}</p>
                                        <Button onClick={handleDownload} variant="primary" size="sm">
                                            <Download className="w-4 h-4" />
                                            Download
                                        </Button>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center justify-center gap-3 flex-wrap">
                                    <Button onClick={handleDownload} variant="secondary" size="sm">
                                        <Download className="w-4 h-4" />
                                        <span className="hidden sm:inline">Download</span>
                                    </Button>
                                    <Button onClick={handleCopyPrompt} variant="ghost" size="sm">
                                        <Copy className="w-4 h-4" />
                                        <span className="hidden sm:inline">Copy Prompt</span>
                                    </Button>
                                    <Button onClick={handleReset} variant="ghost" size="sm">
                                        <RotateCcw className="w-4 h-4" />
                                        <span className="hidden sm:inline">New</span>
                                    </Button>
                                </div>
                            </div>
                        ) : null}
                    </div>
                )}
            </div>

            {/* Floating Input Bar */}
            <div className={cn(
                "fixed left-0 right-0 px-4 transition-all duration-700 ease-out z-40",
                isHero
                    ? "bottom-1/2 translate-y-[calc(50%+60px)] md:translate-y-[calc(50%+80px)]"
                    : "bottom-20 md:bottom-8"
            )}>
                <div className="w-full max-w-2xl mx-auto">
                    <div className="glass rounded-2xl md:rounded-3xl p-2 flex flex-col gap-2 shadow-2xl ring-1 ring-white/10 transition-all duration-300 focus-within:ring-primary/50 focus-within:shadow-[0_0_40px_rgba(139,92,246,0.15)]">
                        {/* Textarea */}
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

                        {/* Bottom Bar */}
                        <div className="flex items-center justify-between px-2 md:px-4 pb-2 gap-2">
                            {/* Mode Toggle */}
                            <div className="flex items-center gap-1 p-1 bg-white/5 rounded-xl border border-white/5">
                                <button
                                    onClick={() => setMode("image")}
                                    className={cn(
                                        "flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-xs font-medium transition-all duration-300 touch-target",
                                        mode === "image"
                                            ? "bg-white/10 text-white shadow-sm"
                                            : "text-white/40 hover:text-white"
                                    )}
                                >
                                    <ImageIcon className="w-3.5 h-3.5" />
                                    <span className="hidden xs:inline">Image</span>
                                </button>
                                <button
                                    onClick={() => setMode("video")}
                                    className={cn(
                                        "flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-xs font-medium transition-all duration-300 touch-target",
                                        mode === "video"
                                            ? "bg-white/10 text-white shadow-sm"
                                            : "text-white/40 hover:text-white"
                                    )}
                                >
                                    <Film className="w-3.5 h-3.5" />
                                    <span className="hidden xs:inline">Video</span>
                                </button>
                            </div>

                            {/* Generate Button */}
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
