"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { CanvasEditor } from "@/components/canvas-editor";
import { Button } from "@/components/ui/button";
import { Upload, Wand2, Download, AlertCircle, Palette, Maximize2, Layers, X } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

export default function StudioPage() {
    const { showToast } = useToast();
    const [image, setImage] = useState<string | null>(null);
    const [mask, setMask] = useState<string | null>(null);
    const [prompt, setPrompt] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [lightboxOpen, setLightboxOpen] = useState(false);

    const handleContinueEditing = () => {
        if (generatedImage) {
            // Use the generated image as the new base
            setImage(generatedImage);
            setGeneratedImage(null);
            setMask(null); // Reset mask so user can start fresh
            showToast("Image loaded to canvas! You can now add more edits.", "default");
        }
    };


    // Helper to resize/process image to 1024x1024 PNG Data URL
    const processImage = (file: File): Promise<string> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = URL.createObjectURL(file);
            img.onload = () => {
                const canvas = document.createElement("canvas");
                canvas.width = 1024;
                canvas.height = 1024;
                const ctx = canvas.getContext("2d");

                if (ctx) {
                    // Draw white background (optional, but good for transparency safety)
                    // ctx.fillStyle = "#FFFFFF";
                    // ctx.fillRect(0, 0, 1024, 1024);

                    // Scale image to fit (contain) or cover. "Contain" preserves aspect ratio without crop.
                    const scale = Math.min(1024 / img.width, 1024 / img.height);
                    const x = (1024 - img.width * scale) / 2;
                    const y = (1024 - img.height * scale) / 2;

                    ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
                    resolve(canvas.toDataURL("image/png"));
                }
            };
        });
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const processedUrl = await processImage(file);
            setImage(processedUrl);
            setGeneratedImage(null);
            setMask(null);
        }
    };

    const { user, profile, refreshProfile } = useAuth(); // Get user for credits handling

    const handleGenerate = async () => {
        if (!image || !mask || !prompt) {
            showToast("Please upload an image, mask the product, and enter a prompt!", "warning");
            return;
        }

        if (!user) {
            showToast("Please login to generate images", "error");
            return;
        }

        setIsGenerating(true);
        try {
            const res = await fetch("/api/edit-image", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    image,
                    mask,
                    prompt,
                    userId: user.id
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Generation failed");

            setGeneratedImage(data.url);
            showToast("Magic Edit completed!", "success");
            refreshProfile(); // Update credits if we deducted them

        } catch (error: any) {
            console.error(error);
            showToast(error.message || "Something went wrong", "error");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-background text-foreground">
            <Sidebar />

            <main className="flex-1 transition-all duration-300 ease-in-out p-4 md:p-8 flex flex-col h-screen overflow-hidden md:pl-24">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Palette className="w-6 h-6 text-primary" />
                            Product Studio <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/20">BETA</span>
                        </h1>
                        <p className="text-muted-foreground text-sm hidden md:block">Upload product photos and magically change backgrounds.</p>
                    </div>
                    {generatedImage && (
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => setLightboxOpen(true)}>
                                <Maximize2 className="w-4 h-4 mr-2" />
                                Zoom Result
                            </Button>
                            <Button variant="default" size="sm" onClick={handleContinueEditing}>
                                <Layers className="w-4 h-4 mr-2" />
                                Edit This
                            </Button>
                            <Button variant="secondary" size="sm" onClick={() => window.open(generatedImage, '_blank')}>
                                <Download className="w-4 h-4 mr-2" />
                                Download
                            </Button>
                        </div>
                    )}
                </div>

                {/* Lightbox Overlay */}
                {lightboxOpen && generatedImage && (
                    <div
                        className="fixed inset-0 z-[500] bg-black/90 backdrop-blur-xl flex items-center justify-center p-8 animate-in fade-in duration-200"
                        onClick={() => setLightboxOpen(false)}
                    >
                        <button
                            onClick={() => setLightboxOpen(false)}
                            className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                        >
                            <X className="w-6 h-6 text-white" />
                        </button>
                        <img
                            src={generatedImage}
                            alt="Generated Result"
                            className="max-w-full max-h-full rounded-lg shadow-2xl border border-white/10"
                            onClick={(e) => e.stopPropagation()}
                        />
                        <div className="absolute bottom-8 flex gap-4" onClick={(e) => e.stopPropagation()}>
                            <Button size="lg" onClick={() => window.open(generatedImage, '_blank')}>
                                <Download className="w-5 h-5 mr-2" /> Download
                            </Button>
                            <Button size="lg" variant="secondary" onClick={() => { handleContinueEditing(); setLightboxOpen(false); }}>
                                <Layers className="w-5 h-5 mr-2" /> Edit This
                            </Button>
                        </div>
                    </div>
                )}

                <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden h-full pb-20 md:pb-8">
                    {/* Main Canvas Area */}
                    <div className="flex-1 bg-surface-1 rounded-3xl border border-white/5 relative overflow-hidden flex flex-col items-center justify-center p-2 md:p-4 min-h-[400px]">
                        {!image ? (
                            <div className="text-center space-y-4">
                                <div className="w-20 h-20 bg-surface-2 rounded-full flex items-center justify-center mx-auto mb-4 border border-dashed border-white/20">
                                    <Upload className="w-8 h-8 text-muted-foreground" />
                                </div>
                                <h3 className="text-lg font-medium">Upload Product Photo</h3>
                                <p className="text-muted-foreground text-sm max-w-xs mx-auto mb-6">
                                    Drag and drop your photo here, or click to browse.
                                </p>
                                <div className="relative">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleUpload}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    <Button>
                                        <Upload className="w-4 h-4 mr-2" />
                                        Choose File
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <CanvasEditor
                                imageUrl={image}
                                onMaskChange={setMask}
                            />
                        )}

                        {/* Status Bar */}
                        {image && (
                            <button
                                onClick={() => setImage(null)}
                                className="absolute top-4 right-4 p-2 bg-black/50 backdrop-blur rounded-full hover:bg-red-500/20 hover:text-red-400 transition-colors"
                                title="Reset Image"
                            >
                                <AlertCircle className="w-5 h-5" />
                            </button>
                        )}
                    </div>

                    {/* Right Controls */}
                    <div className="w-full lg:w-80 shrink-0 flex flex-col gap-6 overflow-y-auto lg:overflow-visible pr-2">
                        {/* Instructions Card */}
                        <div className="p-4 bg-surface-1 rounded-2xl border border-white/5 space-y-4">
                            <h3 className="font-medium text-sm text-foreground/80">How it works</h3>
                            <div className="space-y-3">
                                <Step number={1} text="Upload your product photo." active={!image} />
                                <Step number={2} text="Brush over the area you want to KEEP (your product)." active={!!image && !mask} />
                                <Step number={3} text="Describe the new background." active={!!mask && !prompt} />
                            </div>
                        </div>

                        {/* Prompt Input */}
                        <div className="p-4 bg-surface-1 rounded-2xl border border-white/5 flex-1 flex flex-col gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Magic Prompt</label>
                                <textarea
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder="E.g. On a wooden table in a sunny garden, surrounded by lemons, cinematic lighting..."
                                    className="w-full h-32 bg-surface-2 border border-white/10 rounded-xl p-3 text-sm resize-none focus:ring-1 focus:ring-primary focus:outline-none"
                                    disabled={!image}
                                />
                            </div>

                            <Button
                                className="w-full h-12 text-base shadow-glow mt-auto"
                                size="lg"
                                onClick={handleGenerate}
                                disabled={isGenerating || !image || !mask}
                            >
                                {isGenerating ? (
                                    <>
                                        <Wand2 className="w-5 h-5 mr-2 animate-spin" />
                                        Magic happening...
                                    </>
                                ) : (
                                    <>
                                        <Wand2 className="w-5 h-5 mr-2" />
                                        Generate Background
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

function Step({ number, text, active }: { number: number, text: string, active: boolean }) {
    return (
        <div className={cn("flex items-start gap-3 text-sm transition-opacity", active ? "opacity-100" : "opacity-50")}>
            <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border",
                active ? "bg-primary text-primary-foreground border-primary" : "bg-transparent border-white/20"
            )}>
                {number}
            </div>
            <p className="pt-0.5">{text}</p>
        </div>
    );
}
