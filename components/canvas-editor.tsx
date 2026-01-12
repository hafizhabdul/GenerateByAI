"use client";

import { useRef, useEffect, useState, useImperativeHandle, forwardRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";

export interface TextOverlay {
    id: string;
    text: string;
    x: number; // Percentage 0-100
    y: number; // Percentage 0-100
    color: string;
    fontSize: number; // Base size (scaled by container)
    fontFamily: string;
    scale?: number; // Scaling factor for resizing
}

export interface StickerOverlay {
    id: string;
    src: string; // URL to svg or png
    x: number; // Percentage 0-100
    y: number; // Percentage 0-100
    scale: number;
    rotation?: number;
}

export interface ImageState {
    x: number; // Percentage 0-100
    y: number; // Percentage 0-100
    scale: number;
    rotate?: number;
}

interface CanvasEditorProps {
    imageUrl: string;
    imageState?: ImageState;
    onImageStateChange?: (newState: ImageState) => void;
    onMaskChange: (maskDataUrl: string) => void; // Keeping name for compatibility, but acts as drawing layer
    brushColor?: string; // New
    filters?: {
        brightness: number;
        contrast: number;
        saturation: number;
        grayscale: number;
    };
    textOverlays?: TextOverlay[];
    onTextUpdate?: (id: string, newProps: Partial<TextOverlay>) => void;
    stickerOverlays?: StickerOverlay[];
    onStickerUpdate?: (id: string, newProps: Partial<StickerOverlay>) => void;
    interactMode?: "draw" | "text" | "move" | "sticker"; // changed mask to draw
}

// --- Draggable Image Component ---
const DraggableImage = ({
    imageUrl,
    state,
    onUpdate,
    isActive,
    filterStyle,
    containerRef
}: {
    imageUrl: string;
    state: ImageState;
    onUpdate: (newState: ImageState) => void;
    isActive: boolean;
    filterStyle: React.CSSProperties;
    containerRef: React.RefObject<HTMLDivElement | null>;
}) => {
    const elementRef = useRef<HTMLImageElement>(null);
    const isDragging = useRef(false);
    const startPos = useRef({ x: 0, y: 0 });
    const startVal = useRef({ x: 0, y: 0, scale: 1 });

    // Sync Ref with Props
    useEffect(() => {
        if (elementRef.current) {
            elementRef.current.style.left = `${state.x}%`;
            elementRef.current.style.top = `${state.y}%`;
            elementRef.current.style.transform = `translate(-50%, -50%) scale(${state.scale})`;
        }
    }, [state.x, state.y, state.scale]);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (!isActive) return;
        e.stopPropagation();
        e.preventDefault();

        isDragging.current = true;
        startPos.current = { x: e.clientX, y: e.clientY };
        startVal.current = { x: state.x, y: state.y, scale: state.scale };

        const onMove = (e: MouseEvent) => {
            if (!containerRef.current || !elementRef.current) return;

            const rect = containerRef.current.getBoundingClientRect();
            const deltaXStr = e.clientX - startPos.current.x;
            const deltaYStr = e.clientY - startPos.current.y;

            const deltaX = (deltaXStr / rect.width) * 100;
            const deltaY = (deltaYStr / rect.height) * 100;

            const newX = startVal.current.x + deltaX; // Allow moving off canvas
            const newY = startVal.current.y + deltaY;

            elementRef.current.style.left = `${newX}%`;
            elementRef.current.style.top = `${newY}%`;
        };

        const onUp = (e: MouseEvent) => {
            isDragging.current = false;
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);

            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const deltaXStr = e.clientX - startPos.current.x;
            const deltaYStr = e.clientY - startPos.current.y;
            const deltaX = (deltaXStr / rect.width) * 100;
            const deltaY = (deltaYStr / rect.height) * 100;

            onUpdate({
                ...startVal.current,
                x: startVal.current.x + deltaX,
                y: startVal.current.y + deltaY
            });
        };

        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
    }, [isActive, state, onUpdate, containerRef]);

    // Simple Wheel Zoom on the image itself if active
    const handleWheel = useCallback((e: React.WheelEvent) => {
        if (!isActive) return;
        e.stopPropagation();
        // e.preventDefault(); // React passive event issue, usually handled by browser but we can try

        const delta = -e.deltaY * 0.001;
        const newScale = Math.max(0.1, state.scale + delta);
        onUpdate({ ...state, scale: newScale });
    }, [isActive, state, onUpdate]);


    return (
        <img
            ref={elementRef}
            src={imageUrl}
            alt="Layer"
            className={cn(
                "absolute object-contain origin-center select-none touching-none",
                isActive ? "cursor-move" : "pointer-events-none"
            )}
            style={{
                ...filterStyle,
                left: `${state.x}%`,
                top: `${state.y}%`,
                transform: `translate(-50%, -50%) scale(${state.scale})`,
                maxWidth: 'none', // Allow scaling beyond container
                maxHeight: 'none',
                width: '100%', // Base size is 100% of container, then scaled
                height: '100%',
                zIndex: 0
            }}
            onMouseDown={handleMouseDown}
            onWheel={handleWheel}
            draggable={false}
        />
    );
};


// --- Interactable Text Overlay Component ---
const DraggableText = ({ ...props }: any) => {
    // ... Existing implementation ...
    // Copying existing implementation to avoid huge payload, but actually I need to provide it fully if I replace file content.
    // Since I'm using replace_file_content with a large range, I must include DraggableText fully.
    const { data, containerRef, onUpdate, isActive } = props;
    const elementRef = useRef<HTMLDivElement>(null);
    const startPos = useRef({ x: 0, y: 0 });
    const startVal = useRef({ x: 0, y: 0, scale: 1 });

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (!isActive) return;
        e.stopPropagation();
        e.preventDefault();

        startPos.current = { x: e.clientX, y: e.clientY };
        startVal.current = { x: data.x, y: data.y, scale: data.scale || 1 };

        const onMove = (e: MouseEvent) => {
            if (!containerRef.current || !elementRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const deltaX = ((e.clientX - startPos.current.x) / rect.width) * 100;
            const deltaY = ((e.clientY - startPos.current.y) / rect.height) * 100;

            const newX = Math.max(0, Math.min(100, startVal.current.x + deltaX));
            const newY = Math.max(0, Math.min(100, startVal.current.y + deltaY));

            elementRef.current.style.left = `${newX}%`;
            elementRef.current.style.top = `${newY}%`;
        };

        const onUp = (e: MouseEvent) => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const deltaX = ((e.clientX - startPos.current.x) / rect.width) * 100;
            const deltaY = ((e.clientY - startPos.current.y) / rect.height) * 100;
            onUpdate(data.id, {
                x: Math.max(0, Math.min(100, startVal.current.x + deltaX)),
                y: Math.max(0, Math.min(100, startVal.current.y + deltaY))
            });
        };

        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
    }, [data, isActive, onUpdate, containerRef]);


    const handleResizeDown = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        startPos.current = { x: e.clientX, y: e.clientY };
        startVal.current = { x: 0, y: 0, scale: data.scale || 1 };

        const onMove = (e: MouseEvent) => {
            const delta = (e.clientX - startPos.current.x);
            const newScale = Math.max(0.2, startVal.current.scale + (delta * 0.005));
            if (elementRef.current) elementRef.current.style.transform = `translate(-50%, -50%) scale(${newScale})`;
        };

        const onUp = (e: MouseEvent) => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
            const delta = (e.clientX - startPos.current.x);
            onUpdate(data.id, { scale: Math.max(0.2, startVal.current.scale + (delta * 0.005)) });
        };

        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
    }, [data, onUpdate]);

    useEffect(() => {
        if (elementRef.current) {
            elementRef.current.style.left = `${data.x}%`;
            elementRef.current.style.top = `${data.y}%`;
            elementRef.current.style.transform = `translate(-50%, -50%) scale(${data.scale || 1})`;
        }
    }, [data.x, data.y, data.scale]);

    // Font utility
    let fontStack = "sans-serif";
    if (data.fontFamily === "Inter") fontStack = "var(--font-inter), sans-serif";
    if (data.fontFamily === "Playfair Display") fontStack = "var(--font-playfair), serif";
    if (data.fontFamily === "Roboto Mono") fontStack = "var(--font-roboto-mono), monospace";
    if (data.fontFamily === "Pacifico") fontStack = "var(--font-pacifico), cursive";
    if (data.fontFamily === "Oswald") fontStack = "var(--font-oswald), sans-serif";

    return (
        <div
            ref={elementRef}
            className={cn("absolute select-none group", isActive ? "cursor-move" : "pointer-events-none")}
            style={{ left: `${data.x}%`, top: `${data.y}%`, transform: `translate(-50%, -50%) scale(${data.scale || 1})`, zIndex: 20 }}
            onMouseDown={handleMouseDown}
        >
            <div className={cn("relative px-4 py-2 border-2 border-transparent transition-colors duration-200", isActive && "group-hover:border-primary/50 group-hover:bg-black/20 rounded-lg")}>
                <div style={{ color: data.color, fontSize: `${data.fontSize}px`, fontFamily: fontStack, textShadow: '2px 2px 4px rgba(0,0,0,0.5)', whiteSpace: 'nowrap' }}>
                    {data.text}
                </div>
                {isActive && (
                    <div className="absolute -right-3 -bottom-3 w-6 h-6 bg-white rounded-full shadow-lg border-2 border-primary cursor-se-resize flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" onMouseDown={handleResizeDown}>
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                    </div>
                )}
            </div>
        </div>
    );
};


export const CanvasEditor = forwardRef<{ exportImage: () => Promise<string> }, CanvasEditorProps>(
    ({ imageUrl, imageState = { x: 50, y: 50, scale: 1 }, onImageStateChange, onMaskChange, brushColor = "#ffffff", filters, textOverlays, onTextUpdate, stickerOverlays, onStickerUpdate, interactMode = "move" }, ref) => {
        const canvasRef = useRef<HTMLCanvasElement>(null);
        const containerRef = useRef<HTMLDivElement>(null);
        const imageRef = useRef<HTMLImageElement>(null); // Kept for raw image loading if needed, but render uses DraggableImage

        // State
        const [isDrawing, setIsDrawing] = useState(false);
        const [brushSize, setBrushSize] = useState(20);
        const [mode, setMode] = useState<"brush" | "eraser">("brush");

        // History for Mask
        const [history, setHistory] = useState<ImageData[]>([]);
        const [historyIndex, setHistoryIndex] = useState(-1);

        // Compute container aspect ratio from first load of image, but then keep it fixed? 
        // For now, let's keep the strategy: Container Size = Initial Image Size.
        const [canvasSize, setCanvasSize] = useState({ width: 800, height: 800 }); // Default
        const [isLoaded, setIsLoaded] = useState(false);

        useEffect(() => {
            if (!imageUrl) return;
            const img = new Image();
            img.src = imageUrl;
            img.onload = () => {
                // Initialize canvas size to match image aspect ratio, capped at some max
                const MAX_W = 1024;
                const MAX_H = 800;
                let w = img.naturalWidth;
                let h = img.naturalHeight;

                // Scale down to fit constraint while maintaining ratio
                const ratio = Math.min(MAX_W / w, MAX_H / h);
                w = w * ratio;
                h = h * ratio;

                setCanvasSize({ width: w, height: h });
                setIsLoaded(true);
            };
        }, [imageUrl]);


        // Handle Export
        useImperativeHandle(ref, () => ({
            exportImage: async () => {
                const tempCanvas = document.createElement("canvas");
                const ctx = tempCanvas.getContext("2d");
                if (!ctx || !imageUrl) return "";

                // Export size = Canvas Size (Screen size) or Original Resolution? 
                // Let's us Canvas Size for WYSIWYG, or maybe 2x for quality.
                tempCanvas.width = canvasSize.width * 2;
                tempCanvas.height = canvasSize.height * 2;
                ctx.scale(2, 2); // Work in 2x space

                // Fill Background (Dark)
                ctx.fillStyle = "#1a1a1a";
                ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

                // 1. Draw Moved/Scaled Image
                const img = new Image();
                img.src = imageUrl;
                await new Promise(r => img.onload = r);

                ctx.save();
                // Translate to position (percentage -> pixels)
                const tx = (imageState.x / 100) * canvasSize.width;
                const ty = (imageState.y / 100) * canvasSize.height;
                ctx.translate(tx, ty);
                ctx.scale(imageState.scale, imageState.scale);

                // Apply Filters
                ctx.filter = `brightness(${filters?.brightness || 100}%) contrast(${filters?.contrast || 100}%) saturate(${filters?.saturation || 100}%) grayscale(${filters?.grayscale || 0}%)`;

                // Draw centered
                ctx.drawImage(img, -canvasSize.width / 2, -canvasSize.height / 2, canvasSize.width, canvasSize.height);
                ctx.restore();

                // 2. Draw Drawing Layer (Mask) - Note: Mask drawing is typically done on SCREEN coordinates on top.
                // If we want the mask to stick to the image, masking should be inside DraggableImage, but that's complex.
                // Current requirement is "Remove Magic AI", masking is less critical or is for "Draw" tool.
                if (canvasRef.current) {
                    ctx.drawImage(canvasRef.current, 0, 0, canvasSize.width, canvasSize.height);
                }

                // 3. Draw Text
                textOverlays?.forEach(text => {
                    const x = (text.x / 100) * canvasSize.width;
                    const y = (text.y / 100) * canvasSize.height;
                    const scale = text.scale || 1;

                    let canvasFont = "Arial";
                    if (text.fontFamily === "Playfair Display") canvasFont = "Times New Roman";
                    if (text.fontFamily === "Roboto Mono") canvasFont = "Courier New";
                    if (text.fontFamily === "Pacifico") canvasFont = "cursive";
                    if (text.fontFamily === "Oswald") canvasFont = "Impact";

                    ctx.save();
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.font = `bold ${text.fontSize * scale}px ${canvasFont}`;
                    ctx.fillStyle = text.color;
                    ctx.shadowColor = "rgba(0,0,0,0.5)";
                    ctx.shadowBlur = 4;
                    ctx.shadowOffsetX = 2;
                    ctx.shadowOffsetY = 2;
                    ctx.fillText(text.text, x, y);
                    ctx.restore();
                });

                return tempCanvas.toDataURL("image/png");
            }
        }));


        // --- Drawing Logic ---
        const getMousePos = (e: React.MouseEvent | React.TouchEvent) => {
            const canvas = canvasRef.current;
            if (!canvas) return { x: 0, y: 0 };
            const rect = canvas.getBoundingClientRect();
            const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
            const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
            return {
                x: (clientX - rect.left),
                y: (clientY - rect.top)
            };
        };

        const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
            if (interactMode !== "draw") return;
            setIsDrawing(true);
            draw(e);
        };

        const stopDrawing = () => {
            if (isDrawing) {
                setIsDrawing(false);
                const canvas = canvasRef.current;
                if (canvas) {
                    onMaskChange(canvas.toDataURL());
                    saveState();
                }
            }
        };

        const draw = (e: React.MouseEvent | React.TouchEvent) => {
            if (!isDrawing || interactMode !== "draw") return;
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext("2d");
            if (!canvas || !ctx) return;
            const { x, y } = getMousePos(e);
            ctx.lineWidth = brushSize;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";

            // Should scale brushes?

            if (mode === "brush") {
                ctx.globalCompositeOperation = "source-over";
                ctx.strokeStyle = brushColor;
            } else {
                ctx.globalCompositeOperation = "destination-out";
                ctx.strokeStyle = "rgba(0,0,0,1)";
            }
            ctx.lineTo(x, y);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x, y);
        };

        const handleMouseUp = () => {
            const ctx = canvasRef.current?.getContext("2d");
            ctx?.beginPath();
            stopDrawing();
        };

        const saveState = () => {
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext("2d");
            if (!canvas || !ctx) return;
            const toggle = historyIndex + 1;
            const nextHistory = history.slice(0, toggle);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            nextHistory.push(imageData);
            setHistory(nextHistory);
            setHistoryIndex(toggle);
        };

        const undo = () => {
            if (historyIndex <= 0) return;
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext("2d");
            if (!canvas || !ctx) return;
            const newIndex = historyIndex - 1;
            ctx.putImageData(history[newIndex], 0, 0);
            setHistoryIndex(newIndex);
            onMaskChange(canvas.toDataURL());
        };

        const redo = () => {
            if (historyIndex >= history.length - 1) return;
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext("2d");
            if (!canvas || !ctx) return;
            const newIndex = historyIndex + 1;
            ctx.putImageData(history[newIndex], 0, 0);
            setHistoryIndex(newIndex);
            onMaskChange(canvas.toDataURL());
        };

        const filterStyle = filters ? {
            filter: `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturation}%) grayscale(${filters.grayscale}%)`
        } : {};

        return (
            <div className="flex flex-col h-full w-full gap-4">
                {/* Toolbar */}
                <div className="flex items-center justify-between p-2 bg-surface-2 rounded-xl border border-white/5 backdrop-blur-sm">
                    <div className="flex items-center gap-2">
                        {interactMode === "draw" ? (
                            <>
                                <Button variant={mode === "brush" ? "primary" : "ghost"} size="icon" onClick={() => setMode("brush")} title="Brush">
                                    <Icon icon="mingcute:pencil-fill" className="w-4 h-4" />
                                </Button>
                                <Button variant={mode === "eraser" ? "primary" : "ghost"} size="icon" onClick={() => setMode("eraser")} title="Eraser">
                                    <Icon icon="mingcute:eraser-fill" className="w-4 h-4" />
                                </Button>
                                <div className="w-px h-6 bg-white/10 mx-2" />
                                <div className="flex items-center gap-2 px-2 w-32">
                                    <span className="text-xs text-muted-foreground w-12">Size: {brushSize}</span>
                                    <input type="range" min="5" max="100" value={brushSize} onChange={(e) => setBrushSize(parseInt(e.target.value))} className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer" />
                                </div>
                            </>
                        ) : (
                            <span className="text-xs text-muted-foreground pl-2">Select "Draw" tab to enable brushes</span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={undo} disabled={historyIndex <= 0 || interactMode !== "draw"}>
                            <Icon icon="mingcute:arrow-left-circle-fill" className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={redo} disabled={historyIndex >= history.length - 1 || interactMode !== "draw"}>
                            <Icon icon="mingcute:arrow-right-circle-fill" className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* Canvas Container */}
                <div
                    ref={containerRef}
                    className={cn("relative flex-1 bg-[#1a1a1a] rounded-xl border border-white/5 overflow-hidden flex items-center justify-center checkered-bg")}
                >
                    {/* Reference & Content - Dynamic Size based on Image Aspect Ratio */}
                    <div
                        className="relative shadow-2xl"
                        style={{
                            width: `${canvasSize.width}px`,
                            height: `${canvasSize.height}px`,
                            // We don't scale the Wrapper anymore, we scale the internal Image
                        }}
                    >
                        {/* 1. Base Image Layer (Draggable) */}
                        <DraggableImage
                            imageUrl={imageUrl}
                            state={imageState}
                            onUpdate={onImageStateChange || (() => { })}
                            isActive={interactMode === "move"} // Allow moving only in move mode
                            filterStyle={filterStyle}
                            containerRef={containerRef}
                        />

                        {/* 1.5 Stickers Layer */}
                        {stickerOverlays?.map((sticker) => (
                            <DraggableImage
                                key={sticker.id}
                                imageUrl={sticker.src}
                                state={{ x: sticker.x, y: sticker.y, scale: sticker.scale }}
                                onUpdate={(newState) => onStickerUpdate?.(sticker.id, { x: newState.x, y: newState.y, scale: newState.scale })}
                                isActive={interactMode === "sticker" || interactMode === "move"}
                                containerRef={containerRef}
                                filterStyle={{}}
                            />
                        ))}

                        {/* 2. Drawing Layer (Fixed on Top of Container) */}
                        <canvas
                            ref={canvasRef}
                            width={canvasSize.width}
                            height={canvasSize.height}
                            className={cn("absolute inset-0 z-10 touch-none", interactMode === "draw" ? "cursor-crosshair" : "pointer-events-none opacity-100")} // Opacity 100 for draw
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp}
                            onTouchStart={startDrawing}
                            onTouchMove={draw}
                            onTouchEnd={handleMouseUp}
                        />

                        {/* 3. Text Overlays Layer */}
                        {textOverlays?.map((text) => (
                            <DraggableText
                                key={text.id}
                                data={text}
                                containerRef={containerRef}
                                onUpdate={onTextUpdate || (() => { })}
                                isActive={interactMode === "text"}
                            />
                        ))}
                    </div>
                </div>

                <style jsx global>{`
                .checkered-bg {
                    background-image: linear-gradient(45deg, #111 25%, transparent 25%),
                        linear-gradient(-45deg, #111 25%, transparent 25%),
                        linear-gradient(45deg, transparent 75%, #111 75%),
                        linear-gradient(-45deg, transparent 75%, #111 75%);
                    background-size: 20px 20px;
                    background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
                }
            `}</style>
            </div>
        );
    });
CanvasEditor.displayName = "CanvasEditor";
