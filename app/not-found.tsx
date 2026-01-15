import Link from "next/link";
import Image from "next/image";
import { Icon } from "@iconify/react";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Halaman Tidak Ditemukan",
    description: "Halaman yang Anda cari tidak ditemukan.",
};

export default function NotFound() {
    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="max-w-md w-full text-center">
                {/* Mascot */}
                <div className="relative w-48 h-48 mx-auto mb-8">
                    <Image
                        src="/maskot.png"
                        alt="SQUIRR.AI mascot"
                        fill
                        className="object-contain"
                        priority
                    />
                    {/* Background fallback/decoration with 404 text */}
                    <div className="absolute inset-0 flex items-center justify-center -z-10">
                        <span className="text-7xl font-bold text-primary/10">404</span>
                    </div>
                </div>

                {/* Error message */}
                <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                    Halaman Tidak Ditemukan
                </h1>
                <p className="text-muted-foreground mb-8">
                    Maaf, halaman yang Anda cari tidak ada atau sudah dipindahkan.
                </p>

                {/* Suggestions */}
                <div className="mb-8 text-left bg-surface-1 rounded-lg p-4 border border-border">
                    <p className="text-sm text-muted-foreground mb-3">Coba salah satu halaman berikut:</p>
                    <ul className="space-y-2">
                        <li>
                            <Link href="/" className="text-primary hover:underline inline-flex items-center gap-1">
                                <Icon icon="mingcute:home-4-line" className="w-4 h-4" />
                                Beranda
                            </Link>
                        </li>
                        <li>
                            <Link href="/community" className="text-primary hover:underline inline-flex items-center gap-1">
                                <Icon icon="mingcute:group-line" className="w-4 h-4" />
                                Community
                            </Link>
                        </li>
                        <li>
                            <Link href="/pricing" className="text-primary hover:underline inline-flex items-center gap-1">
                                <Icon icon="mingcute:currency-dollar-line" className="w-4 h-4" />
                                Harga
                            </Link>
                        </li>
                    </ul>
                </div>

                {/* Action button */}
                <Link
                    href="/"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                >
                    <Icon icon="mingcute:arrow-left-line" className="w-5 h-5" />
                    Kembali ke Beranda
                </Link>
            </div>
        </div>
    );
}
