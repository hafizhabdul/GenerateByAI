"use client";

import { useState, useEffect, useRef } from "react";
import { Sidebar } from "@/components/sidebar";
import { CanvasEditor, TextOverlay } from "@/components/canvas-editor";
import { Button } from "@/components/ui/button";
import { Upload, Wand2, Download, AlertCircle, Palette, Maximize2, Layers, X, Image as ImageIcon, Type, Sliders, Trash2, Plus, Save, ChevronDown, Check } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

interface Generation {
    id: string;
    file_url: string;
    prompt: string;
}

const FONT_OPTIONS = [
    { label: "Inter (App Default)", value: "Inter", style: "var(--font-inter)" },
    { label: "Playfair (Serif)", value: "Playfair Display", style: "var(--font-playfair)" },
    { label: "Roboto Mono (Code)", value: "Roboto Mono", style: "var(--font-roboto-mono)" },
    { label: "Pacifico (Handwritten)", value: "Pacifico", style: "var(--font-pacifico)" },
    { label: "Oswald (Bold)", value: "Oswald", style: "var(--font-oswald)" },
];

export default function StudioPage() {
    const { showToast } = useToast();
    const { user, refreshProfile } = useAuth();
    const editorRef = useRef<{ exportImage: () => Promise<string> }>(null);

    // Core State
    const [image, setImage] = useState<string | null>(null);
    const [mask, setMask] = useState<string | null>(null);
    const [prompt, setPrompt] = useState("");

    // Editor State
    const [activeTab, setActiveTab] = useState<"generate" | "adjust" | "text">("generate");
    const [filters, setFilters] = useState({
        brightness: 100,
        contrast: 100,
        saturation: 100,
        grayscale: 0
    });
    const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);

    // New Text State
    const [newText, setNewText] = useState("");
    const [textColor, setTextColor] = useState("#ffffff");
    const [textSize, setTextSize] = useState(40);
    const [selectedFont, setSelectedFont] = useState("Inter");
    const [isFontOpen, setFontOpen] = useState(false);

    // UI State
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [libraryOpen, setLibraryOpen] = useState(false);
    const [libraryImages, setLibraryImages] = useState<Generation[]>([]);
    const [loadingLibrary, setLoadingLibrary] = useState(false);

    // Persistence
    useEffect(() => {
        // Load state
        const savedImage = localStorage.getItem("studio_image");
        const savedMask = localStorage.getItem("studio_mask");
        const savedPrompt = localStorage.getItem("studio_prompt");
        const savedFilters = localStorage.getItem("studio_filters");
        const savedText = localStorage.getItem("studio_text");

        if (savedImage) setImage(savedImage);
        if (savedMask) setMask(savedMask);
        if (savedPrompt) setPrompt(savedPrompt);
        if (savedFilters) setFilters(JSON.parse(savedFilters));
        if (savedText) setTextOverlays(JSON.parse(savedText));
    }, []);

    useEffect(() => {
        // Save state
        if (image) localStorage.setItem("studio_image", image);
        if (mask) localStorage.setItem("studio_mask", mask);
        localStorage.setItem("studio_prompt", prompt);
        localStorage.setItem("studio_filters", JSON.stringify(filters));
        localStorage.setItem("studio_text", JSON.stringify(textOverlays));
    }, [image, mask, prompt, filters, textOverlays]);

    const handleContinueEditing = () => {
        if (generatedImage) {
            setImage(generatedImage);
            setGeneratedImage(null);
            setMask(null);
            showToast("Image loaded to canvas! You can now add more edits.", "default");
        }
    };

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

    const fetchLibrary = async () => {
        setLoadingLibrary(true);
        try {
            const res = await fetch("/api/generations?type=image");
            const data = await res.json();
            if (res.ok) setLibraryImages(data.generations || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingLibrary(false);
        }
    };

    const handleSelectFromLibrary = async (imgUrl: string) => {
        try {
            const res = await fetch(imgUrl);
            const blob = await res.blob();
            const file = new File([blob], "library-image.png", { type: "image/png" });
            const processed = await processImage(file);
            setImage(processed);
            setGeneratedImage(null);
            setMask(null);
            setLibraryOpen(false);
        } catch (e) {
            showToast("Failed to load image from library", "error");
        }
    };

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
            // Note: This logic only uses the BASE image and MASK for generation. 
            // Text overlays are NOT sent to AI, which is expected (we want to add text AFTER generation usually).
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
            refreshProfile();

        } catch (error: any) {
            console.error(error);
            showToast(error.message || "Something went wrong", "error");
        } finally {
            setIsGenerating(false);
        }
    };

    // --- Save Logic ---
    const handleSaveToGallery = async () => {
        if (!editorRef.current || !user) return;
        setIsSaving(true);
        try {
            const compositedDataUrl = await editorRef.current.exportImage();

            const res = await fetch("/api/save-image", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    imageDataUrl: compositedDataUrl,
                    prompt: prompt || "Edited Image",
                    userId: user.id
                }),
            });

            if (!res.ok) throw new Error("Failed to save");

            showToast("Saved to your Gallery!", "success");

        } catch (error) {
            console.error(error);
            showToast("Failed to save image", "error");
        } finally {
            setIsSaving(false);
        }
    };


    // --- Text Logic ---
    const addText = () => {
        if (!newText) return;
        setTextOverlays([...textOverlays, {
            id: Date.now().toString(),
            text: newText,
            x: 50,
            y: 50,
            color: textColor,
            fontSize: textSize,
            fontFamily: selectedFont
        }]);
        setNewText("");
    };

    const updateTextPosition = (id: string, newProps: Partial<TextOverlay>) => {
        setTextOverlays(prev => prev.map(t => t.id === id ? { ...t, ...newProps } : t));
    };

    const removeText = (id: string) => {
        setTextOverlays(textOverlays.filter(t => t.id !== id));
    };

    const resetCanvas = () => {
        if (confirm("Clear canvas? This cannot be undone.")) {
            setImage(null);
            setMask(null);
            setFilters({ brightness: 100, contrast: 100, saturation: 100, grayscale: 0 });
            setTextOverlays([]);
            localStorage.removeItem("studio_image");
            localStorage.removeItem("studio_mask");
            localStorage.removeItem("studio_filters");
            localStorage.removeItem("studio_text");
            localStorage.removeItem("studio_prompt");
        }
    };

    // Determine Mode
    let interactMode: "mask" | "text" | "view" = "view";
    if (activeTab === "generate") interactMode = "mask";
    if (activeTab === "text") interactMode = "text";

    return (
        <div className="flex min-h-screen bg-background text-foreground">
            <Sidebar />

            <main className="flex-1 transition-all duration-300 ease-in-out p-4 md:p-8 flex flex-col h-screen overflow-hidden md:pl-24">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Palette className="w-6 h-6 text-primary" />
                            Creative Studio <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/20">BETA</span>
                        </h1>
                    </div>
                    {image && (
                        <Button variant="default" onClick={handleSaveToGallery} disabled={isSaving}>
                            {isSaving ? <Wand2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            Save New Image
                        </Button>
                    )}
                </div>

                <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden h-full pb-20 md:pb-8">
                    {/* Main Canvas Area */}
                    <div className="flex-1 bg-surface-1 rounded-3xl border border-white/5 relative overflow-hidden flex flex-col items-center justify-center p-2 md:p-4 min-h-[400px]">
                        {!image ? (
                            <div className="text-center space-y-4">
                                <div className="w-20 h-20 bg-surface-2 rounded-full flex items-center justify-center mx-auto mb-4 border border-dashed border-white/20">
                                    <Upload className="w-8 h-8 text-muted-foreground" />
                                </div>
                                <h3 className="text-lg font-medium">Start Creating</h3>
                                <div className="flex flex-col gap-2 max-w-xs mx-auto">
                                    <div className="relative">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleUpload}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        />
                                        <Button className="w-full">
                                            <Upload className="w-4 h-4 mr-2" />
                                            Upload Photo
                                        </Button>
                                    </div>
                                    <Button variant="outline" onClick={() => { setLibraryOpen(true); fetchLibrary(); }}>
                                        <ImageIcon className="w-4 h-4 mr-2" />
                                        Select from Library
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <CanvasEditor
                                ref={editorRef}
                                imageUrl={image}
                                onMaskChange={setMask}
                                filters={filters}
                                textOverlays={textOverlays}
                                onTextUpdate={updateTextPosition}
                                interactMode={interactMode}
                            />
                        )}

                        {/* Reset Button */}
                        {image && (
                            <button
                                onClick={resetCanvas}
                                className="absolute top-4 right-4 p-2 bg-black/50 backdrop-blur rounded-full hover:bg-red-500/20 hover:text-red-400 transition-colors z-30 shadow-lg border border-white/10"
                                title="Reset Canvas"
                            >
                                <AlertCircle className="w-5 h-5 text-white" />
                            </button>
                        )}
                    </div>

                    {/* Right Controls */}
                    <div className="w-full lg:w-80 shrink-0 flex flex-col gap-4 overflow-y-auto lg:overflow-visible pr-2">
                        {/* Tool Tabs */}
                        <div className="flex p-1 bg-surface-2 rounded-xl border border-white/5">
                            <button
                                onClick={() => setActiveTab("generate")}
                                className={cn("flex-1 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2", activeTab === "generate" ? "bg-primary text-white" : "text-muted-foreground hover:text-white")}
                            >
                                <Wand2 className="w-4 h-4" /> AI Magic
                            </button>
                            <button
                                onClick={() => setActiveTab("adjust")}
                                className={cn("flex-1 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2", activeTab === "adjust" ? "bg-primary text-white" : "text-muted-foreground hover:text-white")}
                            >
                                <Sliders className="w-4 h-4" /> Adjust
                            </button>
                            <button
                                onClick={() => setActiveTab("text")}
                                className={cn("flex-1 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2", activeTab === "text" ? "bg-primary text-white" : "text-muted-foreground hover:text-white")}
                            >
                                <Type className="w-4 h-4" /> Text
                            </button>
                        </div>

                        {/* Tab Content */}
                        <div className="flex-1 bg-surface-1 rounded-2xl border border-white/5 p-4 flex flex-col gap-4">

                            {/* GENERATE TAB */}
                            {activeTab === "generate" && (
                                <>
                                    <div className="space-y-3">
                                        <h3 className="font-medium text-sm text-foreground/80">How it works</h3>
                                        <Step number={1} text="Brush over the area to change." active={!!image} />
                                        <Step number={2} text="Describe changes." active={!!mask && !prompt} />
                                    </div>
                                    <div className="space-y-2 mt-4 flex-1 flex flex-col">
                                        <label className="text-sm font-medium">Prompt</label>
                                        <textarea
                                            value={prompt}
                                            onChange={(e) => setPrompt(e.target.value)}
                                            placeholder="E.g. On a wooden table in a sunny garden, surrounded by lemons, cinematic lighting..."
                                            className="w-full h-full min-h-[120px] bg-surface-2 border border-white/10 rounded-xl p-3 text-sm resize-none focus:ring-1 focus:ring-primary focus:outline-none"
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
                                            <><Wand2 className="w-5 h-5 mr-2 animate-spin" /> Magic happening...</>
                                        ) : (
                                            <><Wand2 className="w-5 h-5 mr-2" /> Generate Background</>
                                        )}
                                    </Button>
                                </>
                            )}

                            {/* ADJUST TAB */}
                            {activeTab === "adjust" && (
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs font-medium">
                                            <span>Brightness</span>
                                            <span>{filters.brightness}%</span>
                                        </div>
                                        <input type="range" min="0" max="200" value={filters.brightness} onChange={(e) => setFilters({ ...filters, brightness: Number(e.target.value) })} className="w-full h-1 bg-surface-2 rounded-lg appearance-none cursor-pointer accent-primary" />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs font-medium">
                                            <span>Contrast</span>
                                            <span>{filters.contrast}%</span>
                                        </div>
                                        <input type="range" min="0" max="200" value={filters.contrast} onChange={(e) => setFilters({ ...filters, contrast: Number(e.target.value) })} className="w-full h-1 bg-surface-2 rounded-lg appearance-none cursor-pointer accent-primary" />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs font-medium">
                                            <span>Saturation</span>
                                            <span>{filters.saturation}%</span>
                                        </div>
                                        <input type="range" min="0" max="200" value={filters.saturation} onChange={(e) => setFilters({ ...filters, saturation: Number(e.target.value) })} className="w-full h-1 bg-surface-2 rounded-lg appearance-none cursor-pointer accent-primary" />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs font-medium">
                                            <span>Grayscale</span>
                                            <span>{filters.grayscale}%</span>
                                        </div>
                                        <input type="range" min="0" max="100" value={filters.grayscale} onChange={(e) => setFilters({ ...filters, grayscale: Number(e.target.value) })} className="w-full h-1 bg-surface-2 rounded-lg appearance-none cursor-pointer accent-primary" />
                                    </div>
                                    <Button className="mt-4" variant="outline" size="sm" onClick={() => setFilters({ brightness: 100, contrast: 100, saturation: 100, grayscale: 0 })}>
                                        Reset Filters
                                    </Button>
                                </div>
                            )}

                            {/* TEXT TAB */}
                            {activeTab === "text" && (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Add Text</label>
                                        <input
                                            value={newText}
                                            onChange={(e) => setNewText(e.target.value)}
                                            placeholder="Enter text here..."
                                            className="w-full h-10 bg-surface-2 border border-white/10 rounded-lg px-3 text-sm focus:ring-1 focus:ring-primary focus:outline-none"
                                        />
                                    </div>

                                    <div className="space-y-2 relative">
                                        <label className="text-xs font-medium text-muted-foreground">Font</label>
                                        <button
                                            onClick={() => setFontOpen(!isFontOpen)}
                                            className="w-full h-10 bg-surface-2 border border-white/10 rounded-lg px-3 text-sm flex items-center justify-between hover:bg-white/5 transition-colors"
                                        >
                                            <span style={{ fontFamily: FONT_OPTIONS.find(f => f.value === selectedFont)?.style }}>
                                                {FONT_OPTIONS.find(f => f.value === selectedFont)?.label}
                                            </span>
                                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                        </button>

                                        {isFontOpen && (
                                            <>
                                                <div
                                                    className="fixed inset-0 z-40"
                                                    onClick={() => setFontOpen(false)}
                                                />
                                                <div className="absolute top-full left-0 right-0 mt-2 bg-surface-2 border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden py-1 max-h-[300px] overflow-y-auto">
                                                    {FONT_OPTIONS.map(font => (
                                                        <button
                                                            key={font.value}
                                                            onClick={() => {
                                                                setSelectedFont(font.value);
                                                                setFontOpen(false);
                                                            }}
                                                            className="w-full text-left px-3 py-2.5 text-sm hover:bg-white/10 transition-colors flex items-center justify-between group"
                                                        >
                                                            <span style={{ fontFamily: font.style }} className="text-sm font-medium">
                                                                {font.label}
                                                            </span>
                                                            {selectedFont === font.value && <Check className="w-4 h-4 text-primary" />}
                                                        </button>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    <div className="flex gap-2">
                                        <div className="h-10 w-10 shrink-0 rounded-lg overflow-hidden border border-white/10 relative">
                                            <input
                                                type="color"
                                                value={textColor}
                                                onChange={(e) => setTextColor(e.target.value)}
                                                className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer"
                                            />
                                        </div>
                                        <input
                                            type="number"
                                            value={textSize}
                                            onChange={(e) => setTextSize(Number(e.target.value))}
                                            className="h-10 w-20 bg-surface-2 border border-white/10 rounded-lg px-2 text-sm focus:outline-none"
                                            placeholder="Size"
                                        />
                                        <Button size="sm" className="flex-1" onClick={addText} disabled={!newText}>
                                            <Plus className="w-4 h-4 mr-2" /> Add
                                        </Button>
                                    </div>

                                    <div className="space-y-2">
                                        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-2">Layers</h4>
                                        <div className="max-h-[250px] overflow-y-auto space-y-2">
                                            {textOverlays.length === 0 && (
                                                <p className="text-xs text-muted-foreground text-center py-4 border border-dashed border-white/10 rounded-lg">
                                                    No text added yet
                                                </p>
                                            )}
                                            {textOverlays.map((t) => (
                                                <div key={t.id} className="flex items-center justify-between p-3 bg-surface-2 rounded-lg text-sm border border-white/5 group">
                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: t.color }}></span>
                                                        <div className="flex flex-col truncate">
                                                            <span className="truncate font-medium">{t.text}</span>
                                                            <span className="text-[10px] text-muted-foreground">{t.fontFamily}</span>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => removeText(t.id)} className="text-muted-foreground hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        {textOverlays.length > 0 && (
                                            <p className="text-[10px] text-muted-foreground text-center animate-pulse">
                                                Drag text on canvas to reposition
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Library Modal */}
                {
                    libraryOpen && (
                        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                            <div className="bg-surface-1 w-full max-w-3xl rounded-3xl border border-white/10 overflow-hidden flex flex-col h-[80vh] shadow-2xl">
                                <div className="p-4 border-b border-white/10 flex items-center justify-between bg-surface-2/50 backdrop-blur">
                                    <h3 className="font-bold">Select from Library</h3>
                                    <button onClick={() => setLibraryOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                                </div>
                                <div className="p-6 overflow-y-auto grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {loadingLibrary && (
                                        <div className="col-span-full flex justify-center py-12">
                                            <Wand2 className="w-8 h-8 animate-spin text-primary" />
                                        </div>
                                    )}
                                    {!loadingLibrary && libraryImages.length === 0 && (
                                        <p className="text-center col-span-full py-12 text-muted-foreground">No generated images found in your history.</p>
                                    )}
                                    {libraryImages.map((img) => (
                                        <div
                                            key={img.id}
                                            className="aspect-square rounded-xl overflow-hidden cursor-pointer hover:ring-2 ring-primary transition-all relative group bg-black"
                                            onClick={() => handleSelectFromLibrary(img.file_url)}
                                        >
                                            <img src={img.file_url} alt={img.prompt} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-[1px]">
                                                <span className="text-xs font-bold text-white px-3 py-1.5 bg-primary rounded-full shadow-lg">Select Image</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )
                }
            </main >
        </div >
    );
}

function Step({ number, text, active }: { number: number, text: string, active: boolean }) {
    return (
        <div className={cn("flex items-start gap-3 text-sm transition-opacity", active ? "opacity-100" : "opacity-50 text-muted-foreground")}>
            <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border transition-colors",
                active ? "bg-primary text-primary-foreground border-primary" : "bg-transparent border-white/20"
            )}>
                {number}
            </div>
            <p className="pt-0.5 leading-tight">{text}</p>
        </div>
    );
}
