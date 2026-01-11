"use client";

import { Component, ReactNode } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree
 * and displays a fallback UI instead of crashing the whole app
 */
export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        // Log error to console (in production, send to error tracking service)
        console.error("[ErrorBoundary] Caught error:", error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: undefined });
    };

    render() {
        if (this.state.hasError) {
            // Custom fallback if provided
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Default fallback UI
            return (
                <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
                    <div className="w-20 h-20 mb-6 rounded-full bg-destructive/10 flex items-center justify-center">
                        <Icon icon="mingcute:warning-fill" className="w-10 h-10 text-destructive" />
                    </div>
                    <h2 className="text-xl font-bold text-foreground mb-2">
                        Oops! Terjadi Kesalahan
                    </h2>
                    <p className="text-muted-foreground mb-6 max-w-md">
                        Maaf, terjadi kesalahan saat memuat konten ini. Silakan coba lagi atau kembali ke beranda.
                    </p>
                    <div className="flex gap-3">
                        <button
                            onClick={this.handleRetry}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                        >
                            <Icon icon="mingcute:refresh-2-line" className="w-4 h-4" />
                            Coba Lagi
                        </button>
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-surface-2 text-foreground rounded-lg font-medium hover:bg-surface-3 transition-colors border border-border"
                        >
                            <Icon icon="mingcute:home-4-line" className="w-4 h-4" />
                            Beranda
                        </Link>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

/**
 * Gallery-specific error fallback
 */
export function GalleryErrorFallback({ onRetry }: { onRetry?: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
            <div className="w-24 h-24 mb-6 relative">
                <img
                    src="/maskot.png"
                    alt="Error"
                    className="w-full h-full object-contain opacity-50"
                />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">
                Gagal Memuat Gallery
            </h2>
            <p className="text-muted-foreground mb-6 max-w-md">
                Tidak dapat memuat koleksi kreasi Anda. Periksa koneksi internet dan coba lagi.
            </p>
            <div className="flex gap-3">
                {onRetry && (
                    <button
                        onClick={onRetry}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                    >
                        <Icon icon="mingcute:refresh-2-line" className="w-4 h-4" />
                        Muat Ulang
                    </button>
                )}
                <Link
                    href="/?view=create"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-surface-2 text-foreground rounded-lg font-medium hover:bg-surface-3 transition-colors border border-border"
                >
                    <Icon icon="mingcute:add-fill" className="w-4 h-4" />
                    Buat Baru
                </Link>
            </div>
        </div>
    );
}

/**
 * Community-specific error fallback
 */
export function CommunityErrorFallback({ onRetry }: { onRetry?: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
            <div className="w-20 h-20 mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                <Icon icon="mingcute:planet-line" className="w-10 h-10 text-primary/50" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">
                Gagal Memuat Community
            </h2>
            <p className="text-muted-foreground mb-6 max-w-md">
                Tidak dapat memuat kreasi dari komunitas. Silakan coba lagi nanti.
            </p>
            <div className="flex gap-3">
                {onRetry && (
                    <button
                        onClick={onRetry}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                    >
                        <Icon icon="mingcute:refresh-2-line" className="w-4 h-4" />
                        Muat Ulang
                    </button>
                )}
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-surface-2 text-foreground rounded-lg font-medium hover:bg-surface-3 transition-colors border border-border"
                >
                    <Icon icon="mingcute:home-4-line" className="w-4 h-4" />
                    Beranda
                </Link>
            </div>
        </div>
    );
}
