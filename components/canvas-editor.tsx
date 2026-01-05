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

interface CanvasEditorProps {
    imageUrl: string;
    onMaskChange: (maskDataUrl: string) => void;
    filters?: {
        brightness: number;
        contrast: number;
        saturation: number;
        grayscale: number;
    };
    textOverlays?: TextOverlay[];
    onTextUpdate?: (id: string, newProps: Partial<TextOverlay>) => void;
    interactMode?: "mask" | "text" | "view";
}


// --- Interactable Text Overlay Component ---
// Handles its own drag and resize logic via Refs to avoid React Render Lag
const DraggableText = ({
    data,
    containerRef,
    onUpdate,
    isActive
}: {
    data: TextOverlay;
    containerRef: React.RefObject<HTMLDivElement | null>;
    onUpdate: (id: string, props: Partial<TextOverlay>) => void;
    isActive: boolean;
}) => {
    const elementRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);
    const isResizing = useRef(false);
    const startPos = useRef({ x: 0, y: 0 });
    const startVal = useRef({ x: 0, y: 0, scale: 1 });

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (!isActive) return;
        e.stopPropagation();
        e.preventDefault(); // Prevent text selection

        isDragging.current = true;
        startPos.current = { x: e.clientX, y: e.clientY };
        startVal.current = { x: data.x, y: data.y, scale: data.scale || 1 };

        const onMove = (e: MouseEvent) => {
            if (!containerRef.current || !elementRef.current) return;

            const rect = containerRef.current.getBoundingClientRect();
            const deltaXStr = e.clientX - startPos.current.x;
            const deltaYStr = e.clientY - startPos.current.y;

            // Convert pixel delta to percentage delta
            const deltaX = (deltaXStr / rect.width) * 100;
            const deltaY = (deltaYStr / rect.height) * 100;

            const newX = Math.max(0, Math.min(100, startVal.current.x + deltaX));
            const newY = Math.max(0, Math.min(100, startVal.current.y + deltaY));

            // Direct DOM update for performance
            elementRef.current.style.left = `${newX}%`;
            elementRef.current.style.top = `${newY}%`;
        };

        const onUp = (e: MouseEvent) => {
            isDragging.current = false;
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);

            // Sync final state
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const deltaXStr = e.clientX - startPos.current.x;
            const deltaYStr = e.clientY - startPos.current.y;
            const deltaX = (deltaXStr / rect.width) * 100;
            const deltaY = (deltaYStr / rect.height) * 100;

            const finalX = Math.max(0, Math.min(100, startVal.current.x + deltaX));
            const finalY = Math.max(0, Math.min(100, startVal.current.y + deltaY));

            onUpdate(data.id, { x: finalX, y: finalY });
        };

        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
    }, [data, isActive, onUpdate, containerRef]);


    const handleResizeDown = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        isResizing.current = true;

        // Starting mouse position
        startPos.current = { x: e.clientX, y: e.clientY };
        // Starting scale
        startVal.current = { x: 0, y: 0, scale: data.scale || 1 };

        const onMove = (e: MouseEvent) => {
            // Calculate distance moved
            const delta = (e.clientX - startPos.current.x);
            // Arbitrary sensitivity: 100px movement = +1 scale factor roughly? 
            // Let's make it smoother. 0.01 per pixel.
            const newScale = Math.max(0.2, startVal.current.scale + (delta * 0.005));

            if (elementRef.current) {
                elementRef.current.style.transform = `translate(-50%, -50%) scale(${newScale})`;
            }
        };

        const onUp = (e: MouseEvent) => {
            isResizing.current = false;
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);

            const delta = (e.clientX - startPos.current.x);
            const finalScale = Math.max(0.2, startVal.current.scale + (delta * 0.005));
            onUpdate(data.id, { scale: finalScale });
        };

        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
    }, [data, onUpdate]);


    // Update Refs when props change (sync from outside updates like Undo/Redo or initial load)
    useEffect(() => {
        if (elementRef.current) {
            elementRef.current.style.left = `${data.x}%`;
            elementRef.current.style.top = `${data.y}%`;
            elementRef.current.style.transform = `translate(-50%, -50%) scale(${data.scale || 1})`;
        }
    }, [data.x, data.y, data.scale]);


    // Font Logic
    let fontStack = "sans-serif";
    if (data.fontFamily === "Inter") fontStack = "var(--font-inter), sans-serif";
    if (data.fontFamily === "Playfair Display") fontStack = "var(--font-playfair), serif";
    if (data.fontFamily === "Roboto Mono") fontStack = "var(--font-roboto-mono), monospace";
    if (data.fontFamily === "Pacifico") fontStack = "var(--font-pacifico), cursive";
    if (data.fontFamily === "Oswald") fontStack = "var(--font-oswald), sans-serif";

    return (
        <div
            ref={elementRef}
            className={cn(
                "absolute select-none group",
                isActive ? "cursor-move" : "pointer-events-none"
            )}
            style={{
                left: `${data.x}%`,
                top: `${data.y}%`,
                transform: `translate(-50%, -50%) scale(${data.scale || 1})`,
                zIndex: 20
            }}
            onMouseDown={handleMouseDown}
        >
            <div
                className={cn(
                    "relative px-4 py-2 border-2 border-transparent transition-colors duration-200",
                    isActive && "group-hover:border-primary/50 group-hover:bg-black/20 rounded-lg"
                )}
            >
                <div style={{
                    color: data.color,
                    fontSize: `${data.fontSize}px`,
                    fontFamily: fontStack,
                    textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
                    whiteSpace: 'nowrap'
                }}>
                    {data.text}
                </div>

                {/* Resize Handle */}
                {isActive && (
                    <div
                        className="absolute -right-3 -bottom-3 w-6 h-6 bg-white rounded-full shadow-lg border-2 border-primary cursor-se-resize flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        onMouseDown={handleResizeDown}
                    >
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                    </div>
                )}
            </div>
        </div>
    );
};


export const CanvasEditor = forwardRef<{ exportImage: () => Promise<string> }, CanvasEditorProps>(
    ({ imageUrl, onMaskChange, filters, textOverlays, onTextUpdate, interactMode = "mask" }, ref) => {
        const canvasRef = useRef<HTMLCanvasElement>(null);
        const containerRef = useRef<HTMLDivElement>(null);
        const imageRef = useRef<HTMLImageElement>(null);

        // State
        const [isDrawing, setIsDrawing] = useState(false);
        const [brushSize, setBrushSize] = useState(20);
        const [mode, setMode] = useState<"brush" | "eraser">("brush");
        const [scale, setScale] = useState(1);

        // History for Mask
        const [history, setHistory] = useState<ImageData[]>([]);
        const [historyIndex, setHistoryIndex] = useState(-1);

        // Initialize Canvas
        useEffect(() => {
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext("2d");
            if (!canvas || !ctx || !imageUrl) return;

            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = imageUrl;
            img.onload = () => {
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                ctx.clearRect(0, 0, canvas.width, canvas.height); // Start empty
                saveState(); // Init history
            };
        }, [imageUrl]);

        // Handle Export (Imperative Handle)
        useImperativeHandle(ref, () => ({
            exportImage: async () => {
                // Create a temporary canvas
                const tempCanvas = document.createElement("canvas");
                const ctx = tempCanvas.getContext("2d");
                if (!ctx || !imageRef.current || !canvasRef.current) return "";

                const img = imageRef.current;
                tempCanvas.width = img.naturalWidth;
                tempCanvas.height = img.naturalHeight;

                // 1. Draw Image with Filters
                ctx.filter = `brightness(${filters?.brightness || 100}%) contrast(${filters?.contrast || 100}%) saturate(${filters?.saturation || 100}%) grayscale(${filters?.grayscale || 0}%)`;
                ctx.drawImage(img, 0, 0);
                ctx.filter = "none"; // Reset filter for text

                // 2. Draw Text
                textOverlays?.forEach(text => {
                    const x = (text.x / 100) * tempCanvas.width;
                    const y = (text.y / 100) * tempCanvas.height;
                    const scale = text.scale || 1;

                    // Map font family names to CSS font stack (Approximation for Canvas)
                    let canvasFont = "Arial";
                    if (text.fontFamily === "Playfair Display") canvasFont = "Times New Roman";
                    if (text.fontFamily === "Roboto Mono") canvasFont = "Courier New";
                    if (text.fontFamily === "Pacifico") canvasFont = "cursive";
                    if (text.fontFamily === "Oswald") canvasFont = "Impact"; // fallback close enough

                    ctx.save();
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    // Apply Scale to font size 
                    // Note: we must also account for the 'transform: translate(-50%, -50%)' in the calculation if we used it for positioning.
                    // In CSS we used top/left % and translate -50%. 
                    // In Canvas text is drawn at x,y. If textAlign=center, that matches the horizontal centering. 
                    // textBaseline=middle matches vertical centering.

                    ctx.font = `bold ${text.fontSize * (tempCanvas.width / 1024) * 2 * scale}px ${canvasFont}`; // Approximate scale
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
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            return {
                x: (clientX - rect.left) * scaleX,
                y: (clientY - rect.top) * scaleY
            };
        };

        const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
            if (interactMode !== "mask") return;
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
            if (!isDrawing || interactMode !== "mask") return;
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext("2d");
            if (!canvas || !ctx) return;
            const { x, y } = getMousePos(e);
            ctx.lineWidth = brushSize;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            if (mode === "brush") {
                ctx.globalCompositeOperation = "source-over";
                ctx.strokeStyle = "rgba(139, 92, 246, 0.5)";
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
                        <Button
                            variant={mode === "brush" ? "primary" : "ghost"}
                            size="icon"
                            onClick={() => setMode("brush")}
                            title="Brush (Mask)"
                            disabled={interactMode !== "mask"}
                            className={interactMode !== "mask" ? "opacity-30" : ""}
                        >
                            <Icon icon="mingcute:pencil-fill" className="w-4 h-4" />
                        </Button>
                        <Button
                            variant={mode === "eraser" ? "primary" : "ghost"}
                            size="icon"
                            onClick={() => setMode("eraser")}
                            title="Eraser"
                            disabled={interactMode !== "mask"}
                            className={interactMode !== "mask" ? "opacity-30" : ""}
                        >
                            <Icon icon="mingcute:eraser-fill" className="w-4 h-4" />
                        </Button>
                        <div className="w-px h-6 bg-white/10 mx-2" />
                        <div className="flex items-center gap-2 px-2 w-32">
                            <span className="text-xs text-muted-foreground w-12">Size: {brushSize}</span>
                            <input
                                type="range"
                                min="5"
                                max="100"
                                value={brushSize}
                                onChange={(e) => setBrushSize(parseInt(e.target.value))}
                                className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
                                disabled={interactMode !== "mask"}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={undo} disabled={historyIndex <= 0 || interactMode !== "mask"}>
                            <Icon icon="mingcute:arrow-left-circle-fill" className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={redo} disabled={historyIndex >= history.length - 1 || interactMode !== "mask"}>
                            <Icon icon="mingcute:arrow-right-circle-fill" className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* Canvas Container */}
                <div
                    ref={containerRef}
                    className={cn("relative flex-1 bg-[#1a1a1a] rounded-xl border border-white/5 overflow-hidden flex items-center justify-center checkered-bg")}
                >
                    {/* Reference & Content */}
                    <div
                        className="relative"
                        style={{
                            width: canvasRef.current?.width ? `${canvasRef.current.width}px` : 'auto',
                            height: canvasRef.current?.height ? `${canvasRef.current.height}px` : 'auto',
                            transform: `scale(${scale})`
                        }}
                    >
                        <img
                            ref={imageRef}
                            src={imageUrl}
                            alt="Original"
                            className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none z-0"
                            style={filterStyle}
                        />

                        {/* Text Overlays Layer */}
                        {textOverlays?.map((text) => (
                            <DraggableText
                                key={text.id}
                                data={text}
                                containerRef={containerRef}
                                onUpdate={onTextUpdate || (() => { })}
                                isActive={interactMode === "text"}
                            />
                        ))}

                        {/* Masking Drawing Surface */}
                        <canvas
                            ref={canvasRef}
                            className={cn("absolute inset-0 z-10 touch-none", interactMode === "mask" ? "cursor-crosshair" : "pointer-events-none opacity-50")}
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp}
                            onTouchStart={startDrawing}
                            onTouchMove={draw}
                            onTouchEnd={handleMouseUp}
                        />
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
