"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Icon } from "@iconify/react";

interface ErrorProps {
    error: Error & { digest?: string };
    reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
    useEffect(() => {
        // Log the error to console for debugging
        console.error("[App Error]", error);
    }, [error]);

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="max-w-md w-full text-center">
                {/* Mascot with sad expression */}
                <div className="relative w-48 h-48 mx-auto mb-8">
                    <Image
                        src="/squirrel-sad.png"
                        alt="Error mascot"
                        fill
                        className="object-contain"
                        priority
                        onError={(e) => {
                            // Fallback if image doesn't exist
                            e.currentTarget.style.display = "none";
                        }}
                    />
                    {/* Fallback icon if image fails */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Icon
                            icon="mingcute:warning-fill"
                            className="w-24 h-24 text-destructive/50"
                        />
                    </div>
                </div>

                {/* Error message */}
                <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                    Oops! Terjadi Kesalahan
                </h1>
                <p className="text-muted-foreground mb-8">
                    Maaf, terjadi kesalahan pada sistem kami. Tim kami sedang bekerja untuk memperbaikinya.
                </p>

                {/* Error digest for debugging */}
                {error.digest && (
                    <p className="text-xs text-muted-foreground/50 mb-6 font-mono">
                        Error ID: {error.digest}
                    </p>
                )}

                {/* Action buttons */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                        onClick={reset}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                    >
                        <Icon icon="mingcute:refresh-2-line" className="w-5 h-5" />
                        Coba Lagi
                    </button>
                    <Link
                        href="/"
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-surface-1 text-foreground rounded-lg font-medium hover:bg-surface-2 transition-colors border border-border"
                    >
                        <Icon icon="mingcute:home-4-line" className="w-5 h-5" />
                        Kembali ke Beranda
                    </Link>
                </div>
            </div>
        </div>
    );
}
