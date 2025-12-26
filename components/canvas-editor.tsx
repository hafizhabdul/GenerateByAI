"use client";

import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Undo, Redo, Eraser, Pen, ZoomIn, ZoomOut, Download } from "lucide-react";
import { cn } from "@/lib/utils";

interface CanvasEditorProps {
    imageUrl: string;
    onMaskChange: (maskDataUrl: string) => void;
}

export function CanvasEditor({ imageUrl, onMaskChange }: CanvasEditorProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // State
    const [isDrawing, setIsDrawing] = useState(false);
    const [brushSize, setBrushSize] = useState(20);
    const [mode, setMode] = useState<"brush" | "eraser">("brush");
    const [scale, setScale] = useState(1);

    // History for Undo/Redo (simple stack of image data)
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
            // Set canvas size to match image natural size
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;

            // Adjust container to fit
            if (containerRef.current) {
                const aspect = img.naturalWidth / img.naturalHeight;
                // logic to fit in container could go here if needed
            }

            // Draw image initially
            // Actually, we want to draw the image as a background 
            // and the canvas is ONLY for the mask.
            // But to make it easy for user, we render image in a div behind canvas.

            // Clear canvas (transparency)
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            saveState();
        };
    }, [imageUrl]);

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
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return;

        const { x, y } = getMousePos(e);

        ctx.lineWidth = brushSize;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        if (mode === "brush") {
            ctx.globalCompositeOperation = "source-over";
            ctx.strokeStyle = "rgba(139, 92, 246, 0.5)"; // Semi-transparent Purple
        } else {
            ctx.globalCompositeOperation = "destination-out";
            ctx.strokeStyle = "rgba(0,0,0,1)";
        }

        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    // Reset path on mouse up
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

    return (
        <div className="flex flex-col h-full w-full gap-4">
            {/* Toolbar */}
            <div className="flex items-center justify-between p-2 bg-surface-2 rounded-xl border border-white/5 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                    <Button
                        variant={mode === "brush" ? "default" : "ghost"}
                        size="icon"
                        onClick={() => setMode("brush")}
                        title="Brush (Mask)"
                    >
                        <Pen className="w-4 h-4" />
                    </Button>
                    <Button
                        variant={mode === "eraser" ? "default" : "ghost"}
                        size="icon"
                        onClick={() => setMode("eraser")}
                        title="Eraser"
                    >
                        <Eraser className="w-4 h-4" />
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
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={undo} disabled={historyIndex <= 0}>
                        <Undo className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={redo} disabled={historyIndex >= history.length - 1}>
                        <Redo className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Canvas Container */}
            <div ref={containerRef} className="relative flex-1 bg-[#1a1a1a] rounded-xl border border-white/5 overflow-hidden flex items-center justify-center checkered-bg">
                {/* Background Image Reference */}
                <img
                    src={imageUrl}
                    alt="Original"
                    className="absolute max-w-none pointer-events-none select-none z-0"
                    style={{
                        transform: `scale(${scale})`,
                        width: canvasRef.current?.width ? `${canvasRef.current.width}px` : 'auto',
                        height: canvasRef.current?.height ? `${canvasRef.current.height}px` : 'auto'
                    }}
                />

                {/* Drawing Surface */}
                <canvas
                    ref={canvasRef}
                    className="absolute z-10 cursor-crosshair touch-none"
                    style={{ transform: `scale(${scale})` }}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={handleMouseUp}
                />
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
}
