"use client";

import { useState, useEffect, useRef } from "react";
import { Sidebar } from "@/components/sidebar";
import { CanvasEditor, TextOverlay, StickerOverlay } from "@/components/canvas-editor";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";
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
    const { user } = useAuth();
    const editorRef = useRef<{ exportImage: () => Promise<string> }>(null);
    const [showResetConfirm, setShowResetConfirm] = useState(false);

    // Core State
    const [image, setImage] = useState<string | null>(null);
    const [mask, setMask] = useState<string | null>(null);
    const [imageState, setImageState] = useState({ x: 50, y: 50, scale: 1 }); // Center default

    // Editor State
    const [activeTab, setActiveTab] = useState<"adjust" | "text" | "stickers" | "draw">("adjust");
    const [brushColor, setBrushColor] = useState("#ffffff"); // New
    const [filters, setFilters] = useState({
        brightness: 100,
        contrast: 100,
        saturation: 100,
        grayscale: 0
    });
    const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
    const [stickerOverlays, setStickerOverlays] = useState<StickerOverlay[]>([]); // New

    // New Text State
    const [newText, setNewText] = useState("");
    const [textColor, setTextColor] = useState("#ffffff");
    const [textSize, setTextSize] = useState(40);
    const [selectedFont, setSelectedFont] = useState("Inter");
    const [isFontOpen, setFontOpen] = useState(false);

    // UI State
    const [isSaving, setIsSaving] = useState(false);
    const [libraryOpen, setLibraryOpen] = useState(false);
    const [libraryImages, setLibraryImages] = useState<Generation[]>([]);
    const [loadingLibrary, setLoadingLibrary] = useState(false);

    // Persistence
    useEffect(() => {
        // Load state
        const savedImage = localStorage.getItem("studio_image");
        const savedFilters = localStorage.getItem("studio_filters");
        const savedText = localStorage.getItem("studio_text");
        const savedState = localStorage.getItem("studio_image_state");

        if (savedImage) setImage(savedImage);
        if (savedFilters) setFilters(JSON.parse(savedFilters));
        if (savedText) setTextOverlays(JSON.parse(savedText));
        const savedStickers = localStorage.getItem("studio_stickers");
        if (savedStickers) setStickerOverlays(JSON.parse(savedStickers));
        if (savedState) setImageState(JSON.parse(savedState));
    }, []);

    useEffect(() => {
        // Save state
        if (image) localStorage.setItem("studio_image", image);
        localStorage.setItem("studio_filters", JSON.stringify(filters));
        localStorage.setItem("studio_text", JSON.stringify(textOverlays));
        localStorage.setItem("studio_image_state", JSON.stringify(imageState));
        localStorage.setItem("studio_stickers", JSON.stringify(stickerOverlays));
    }, [image, filters, textOverlays, imageState, stickerOverlays]);

    const processImage = (file: File): Promise<string> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = URL.createObjectURL(file);
            img.onload = () => {
                const canvas = document.createElement("canvas");
                // Use natural dimensions or limit to reasonable max for editing
                const MAX_SIZE = 2048;
                let width = img.width;
                let height = img.height;

                if (width > MAX_SIZE || height > MAX_SIZE) {
                    const ratio = Math.min(MAX_SIZE / width, MAX_SIZE / height);
                    width *= ratio;
                    height *= ratio;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");

                if (ctx) {
                    ctx.drawImage(img, 0, 0, width, height);
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
            setImageState({ x: 50, y: 50, scale: 1 }); // Reset position on new upload
            setMask(null);
        }
    };

    // ... (Library functions omitted for brevity, unchanged) ...

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
            setImageState({ x: 50, y: 50, scale: 1 });
            setLibraryOpen(false);
        } catch (e) {
            showToast("Failed to load image from library", "error");
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
                    prompt: "Edited Image",
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
        setShowResetConfirm(true);
    };

    const confirmResetCanvas = () => {
        setImage(null);
        setMask(null);
        setImageState({ x: 50, y: 50, scale: 1 });
        setFilters({ brightness: 100, contrast: 100, saturation: 100, grayscale: 0 });
        setTextOverlays([]);
        setStickerOverlays([]);
        localStorage.removeItem("studio_image");
        localStorage.removeItem("studio_filters");
        localStorage.removeItem("studio_text");
        localStorage.removeItem("studio_stickers");
        localStorage.removeItem("studio_image_state");
        setShowResetConfirm(false);
        showToast("Canvas cleared", "success");
    };

    // Determine Mode
    let interactMode: "draw" | "text" | "move" | "sticker" = "move"; // Default to move (adjust)
    if (activeTab === "text") interactMode = "text";
    if (activeTab === "stickers") interactMode = "move";
    if (activeTab === "draw") interactMode = "draw";

    return (
        <div className="flex min-h-screen bg-background text-foreground">
            <Sidebar />

            <main className="flex-1 transition-all duration-300 ease-in-out p-4 md:p-8 flex flex-col h-screen overflow-hidden md:pl-24">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Icon icon="mingcute:brush-fill" className="w-6 h-6 text-primary" />
                            Studio Editor <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/20">BETA</span>
                        </h1>
                    </div>
                    {image && (
                        <Button variant="primary" onClick={handleSaveToGallery} disabled={isSaving}>
                            {isSaving ? <Icon icon="mingcute:loading-fill" className="w-4 h-4 mr-2 animate-spin" /> : <Icon icon="mingcute:save-fill" className="w-4 h-4 mr-2" />}
                            Save Image
                        </Button>
                    )}
                </div>

                <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden h-full pb-20 md:pb-8">
                    {/* Main Canvas Area */}
                    <div className="flex-1 bg-surface-1 rounded-3xl border border-white/5 relative overflow-hidden flex flex-col items-center justify-center p-2 md:p-4 min-h-[400px]">
                        {!image ? (
                            <div className="text-center space-y-4">
                                <div className="w-20 h-20 bg-surface-2 rounded-full flex items-center justify-center mx-auto mb-4 border border-dashed border-white/20">
                                    <Icon icon="mingcute:upload-2-fill" className="w-8 h-8 text-muted-foreground" />
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
                                            <Icon icon="mingcute:upload-2-fill" className="w-4 h-4 mr-2" />
                                            Upload Photo
                                        </Button>
                                    </div>
                                    <Button variant="outline" onClick={() => { setLibraryOpen(true); fetchLibrary(); }}>
                                        <Icon icon="mingcute:image-fill" className="w-4 h-4 mr-2" />
                                        Select from Library
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <CanvasEditor
                                ref={editorRef}
                                imageUrl={image}
                                imageState={imageState}
                                onImageStateChange={setImageState}
                                onMaskChange={setMask}
                                brushColor={brushColor}
                                filters={filters}
                                textOverlays={textOverlays}
                                onTextUpdate={updateTextPosition}
                                stickerOverlays={stickerOverlays}
                                onStickerUpdate={(id: string, props: Partial<StickerOverlay>) => setStickerOverlays(prev => prev.map(s => s.id === id ? { ...s, ...props } : s))}
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
                                <Icon icon="mingcute:refresh-2-fill" className="w-5 h-5 text-white" />
                            </button>
                        )}
                    </div>

                    {/* Right Controls */}
                    <div className="w-full lg:w-80 shrink-0 flex flex-col gap-4 overflow-y-auto lg:overflow-visible pr-2">
                        {/* Tool Tabs */}
                        <div className="flex p-1 bg-surface-2 rounded-xl border border-white/5">
                            <button
                                onClick={() => setActiveTab("adjust")}
                                className={cn("flex-1 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2", activeTab === "adjust" ? "bg-primary text-white" : "text-muted-foreground hover:text-white")}
                            >
                                <Icon icon="mingcute:settings-3-fill" className="w-4 h-4" /> Adjust
                            </button>
                            <button
                                onClick={() => setActiveTab("text")}
                                className={cn("flex-1 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2", activeTab === "text" ? "bg-primary text-white" : "text-muted-foreground hover:text-white")}
                            >
                                <Icon icon="mingcute:text-fill" className="w-4 h-4" /> Text
                            </button>
                            <button
                                onClick={() => setActiveTab("stickers")}
                                className={cn("flex-1 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2", activeTab === "stickers" ? "bg-primary text-white" : "text-muted-foreground hover:text-white")}
                            >
                                <Icon icon="mingcute:emoji-fill" className="w-4 h-4" /> Stickers
                            </button>
                        </div>

                        {/* Tab Content */}
                        <div className="flex-1 bg-surface-1 rounded-2xl border border-white/5 p-4 flex flex-col gap-4">

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
                                            <Icon icon="mingcute:down-fill" className="w-4 h-4 text-muted-foreground" />
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
                                                            {selectedFont === font.value && <Icon icon="mingcute:check-fill" className="w-4 h-4 text-primary" />}
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
                                            <Icon icon="mingcute:add-fill" className="w-4 h-4 mr-2" /> Add
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
                                                        <Icon icon="mingcute:delete-2-fill" className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* STICKERS TAB */}
                            {activeTab === "stickers" && (
                                <div className="space-y-4">
                                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Shapes & Stickers</h4>
                                    <div className="grid grid-cols-4 gap-2">
                                        {[
                                            // Emojis
                                            "twemoji:grinning-face", "twemoji:smiling-face-with-sunglasses", "twemoji:fire", "twemoji:sparkles",
                                            "twemoji:red-heart", "twemoji:thumbs-up", "twemoji:party-popper", "twemoji:star",
                                            "twemoji:ghost", "twemoji:alien-monster", "twemoji:unicorn", "twemoji:pizza",
                                            // Shapes
                                            "mdi:circle", "mdi:square", "mdi:triangle", "mdi:star",
                                            "mdi:heart", "mdi:hexagon", "mdi:rhombus", "mdi:cloud"
                                        ].map((iconData) => (
                                            <button
                                                key={iconData}
                                                onClick={() => {
                                                    const newSticker: StickerOverlay = {
                                                        id: Date.now().toString(),
                                                        src: `https://api.iconify.design/${iconData}.svg`,
                                                        x: 50,
                                                        y: 50,
                                                        scale: 1
                                                    };
                                                    setStickerOverlays([...stickerOverlays, newSticker]);
                                                }}
                                                className="aspect-square bg-surface-2 hover:bg-white/10 rounded-lg flex items-center justify-center transition-colors border border-white/5"
                                            >
                                                <img src={`https://api.iconify.design/${iconData}.svg`} className="w-8 h-8 pointer-events-none" />
                                            </button>
                                        ))}
                                    </div>
                                    <div className="space-y-2">
                                        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-2">Active Stickers</h4>
                                        <div className="max-h-[200px] overflow-y-auto space-y-2">
                                            {stickerOverlays.map(s => (
                                                <div key={s.id} className="flex items-center justify-between p-2 bg-surface-2 rounded-lg text-sm border border-white/5 group">
                                                    <img src={s.src} className="w-6 h-6" />
                                                    <button onClick={() => setStickerOverlays(stickerOverlays.filter(st => st.id !== s.id))} className="text-muted-foreground hover:text-red-400">
                                                        <Icon icon="mingcute:delete-2-fill" className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                            {stickerOverlays.length === 0 && <p className="text-xs text-muted-foreground text-center">No stickers added</p>}
                                        </div>
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
                                    <button onClick={() => setLibraryOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><Icon icon="mingcute:close-fill" className="w-5 h-5" /></button>
                                </div>
                                <div className="p-6 overflow-y-auto grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {loadingLibrary && (
                                        <div className="col-span-full flex justify-center py-12">
                                            <Icon icon="mingcute:loading-fill" className="w-8 h-8 animate-spin text-primary" />
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

            {/* Confirm Reset Modal */}
            {showResetConfirm && (
                <div className="fixed inset-0 z-[600] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowResetConfirm(false)}>
                    <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                                <Icon icon="mingcute:warning-fill" className="w-6 h-6 text-red-500" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg">Clear Canvas?</h3>
                                <p className="text-sm text-muted-foreground">This cannot be undone.</p>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <Button variant="ghost" className="flex-1" onClick={() => setShowResetConfirm(false)}>
                                Cancel
                            </Button>
                            <Button variant="primary" className="flex-1 bg-red-500 hover:bg-red-600" onClick={confirmResetCanvas}>
                                <Icon icon="mingcute:delete-2-fill" className="w-4 h-4 mr-2" />
                                Clear
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}
