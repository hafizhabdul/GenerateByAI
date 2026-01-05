"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Link from "next/link";

// Token packages with IDR pricing
const TOKEN_PACKAGES = [
    {
        id: "starter",
        name: "Starter Pack",
        tokens: 100,
        price: 29000,
        description: "Cocok untuk mencoba",
        features: [
            "100 Token",
            "~10 gambar HD",
            "~1 video 5 detik",
            "Akses galeri",
        ],
        popular: false,
    },
    {
        id: "basic",
        name: "Basic Pack",
        tokens: 500,
        price: 119000,
        description: "Untuk kreator pemula",
        features: [
            "500 Token",
            "~50 gambar HD",
            "~5 video 5 detik",
            "Akses galeri",
            "Download HD",
        ],
        popular: false,
    },
    {
        id: "pro",
        name: "Pro Pack",
        tokens: 1500,
        price: 299000,
        description: "Pilihan terpopuler",
        features: [
            "1.500 Token",
            "~150 gambar HD",
            "~15 video 5 detik",
            "Akses galeri",
            "Download HD",
            "Priority queue",
        ],
        popular: true,
    },
    {
        id: "business",
        name: "Business Pack",
        tokens: 5000,
        price: 899000,
        description: "Untuk profesional",
        features: [
            "5.000 Token",
            "~500 gambar HD",
            "~50 video 5 detik",
            "Akses galeri",
            "Download HD",
            "Priority queue",
            "Commercial license",
        ],
        popular: false,
    },
];

function formatIDR(amount: number): string {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

export default function PricingPage() {
    const [loadingPackage, setLoadingPackage] = useState<string | null>(null);

    const handlePurchase = async (packageId: string) => {
        setLoadingPackage(packageId);
        try {
            const response = await fetch("/api/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ packageId }),
            });

            const data = await response.json();

            if (data.success && data.paymentUrl) {
                // Redirect to Pakasir payment page
                window.location.href = data.paymentUrl;
            } else {
                alert(data.error || "Gagal membuat pembayaran");
            }
        } catch (error) {
            console.error("Checkout error:", error);
            alert("Terjadi kesalahan, silakan coba lagi");
        } finally {
            setLoadingPackage(null);
        }
    };

    return (
        <div className="min-h-screen w-full bg-background relative overflow-hidden flex flex-col items-center py-20 px-4 md:px-8">
            {/* Ambient Background */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1200px] h-[600px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

            {/* Close Button */}
            <div className="absolute top-4 right-4 md:top-6 md:right-6 z-50">
                <Link
                    href="/"
                    className="inline-flex items-center justify-center w-10 h-10 md:w-11 md:h-11 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                >
                    <Icon icon="mingcute:close-fill" className="w-5 h-5 md:w-6 md:h-6 text-muted-foreground hover:text-foreground" />
                </Link>
            </div>

            {/* Header */}
            <div className="relative z-10 text-center space-y-3 md:space-y-4 mb-12 md:mb-16 lg:mb-24 animate-fade-in-down px-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary tracking-wider uppercase backdrop-blur-md">
                    <Icon icon="mingcute:coin-fill" className="w-3 h-3" />
                    Beli Token
                </div>
                <h1 className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold tracking-tight text-foreground">
                    Pilih paket <span className="text-primary">token kamu</span>
                </h1>
                <p className="text-muted-foreground max-w-lg mx-auto text-sm md:text-base lg:text-lg">
                    Beli token sekali, pakai kapan saja. Tanpa langganan bulanan.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4 text-xs md:text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                        <Icon icon="mingcute:check-circle-fill" className="w-4 h-4 text-green-500" />
                        Bayar via QRIS
                    </span>
                    <span className="flex items-center gap-1">
                        <Icon icon="mingcute:check-circle-fill" className="w-4 h-4 text-green-500" />
                        Virtual Account
                    </span>
                    <span className="flex items-center gap-1">
                        <Icon icon="mingcute:check-circle-fill" className="w-4 h-4 text-green-500" />
                        Token tidak expired
                    </span>
                </div>
            </div>

            {/* Free Trial Banner */}
            <div className="relative z-10 w-full max-w-4xl mb-6 md:mb-8 p-3 md:p-4 rounded-xl md:rounded-2xl bg-green-500/10 border border-green-500/30 mx-4">
                <div className="flex items-center justify-center gap-2 md:gap-3">
                    <Icon icon="mingcute:gift-fill" className="w-5 h-5 md:w-6 md:h-6 text-green-600 dark:text-green-400" />
                    <span className="text-green-700 dark:text-green-400 font-medium text-xs md:text-sm lg:text-base">
                        🎉 User baru dapat 100 token GRATIS untuk mencoba!
                    </span>
                </div>
            </div>

            {/* Pricing Grid */}
            <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 max-w-6xl w-full px-4">
                {TOKEN_PACKAGES.map((pkg, index) => (
                    <TokenPackageCard
                        key={pkg.id}
                        {...pkg}
                        priceFormatted={formatIDR(pkg.price)}
                        onPurchase={() => handlePurchase(pkg.id)}
                        isLoading={loadingPackage === pkg.id}
                        delay={index * 100}
                    />
                ))}
            </div>

            {/* Token Usage Info */}
            <div className="relative z-10 mt-12 md:mt-16 max-w-3xl w-full px-4">
                <h3 className="text-base md:text-lg font-medium text-foreground text-center mb-4 md:mb-6">Estimasi penggunaan token</h3>
                <div className="grid grid-cols-3 md:grid-cols-5 gap-2 md:gap-4">
                    <UsageInfo icon="mingcute:pic-fill" label="Gambar Standard" cost="10 token" />
                    <UsageInfo icon="mingcute:image-fill" label="Gambar HD" cost="20 token" />
                    <UsageInfo icon="mingcute:sparkles-fill" label="Gambar Ultra" cost="40 token" />
                    <UsageInfo icon="mingcute:movie-fill" label="Video 5 detik" cost="100 token" />
                    <UsageInfo icon="mingcute:volume-fill" label="+ AI Audio" cost="+50 token" />
                </div>
            </div>

            {/* Payment Methods */}
            <div className="relative z-10 mt-10 md:mt-12 text-center px-4 pb-8">
                <p className="text-xs md:text-sm text-muted-foreground mb-3 md:mb-4">Metode pembayaran</p>
                <div className="flex items-center justify-center gap-4 md:gap-6">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Icon icon="mingcute:qrcode-fill" className="w-6 h-6 md:w-8 md:h-8" />
                        <span className="text-xs">QRIS</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Icon icon="mingcute:bank-fill" className="w-5 h-5 md:w-6 md:h-6" />
                        <span className="text-xs">Virtual Account</span>
                    </div>
                </div>
                <p className="text-xs text-muted-foreground mt-4">
                    Pembayaran diproses dengan aman oleh{" "}
                    <a href="https://pakasir.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        Pakasir.com
                    </a>
                </p>
            </div>
        </div>
    );
}

interface TokenPackageCardProps {
    id: string;
    name: string;
    tokens: number;
    price: number;
    priceFormatted: string;
    description: string;
    features: string[];
    popular: boolean;
    onPurchase: () => void;
    isLoading: boolean;
    delay: number;
}

function TokenPackageCard({
    name,
    tokens,
    priceFormatted,
    description,
    features,
    popular,
    onPurchase,
    isLoading,
    delay,
}: TokenPackageCardProps) {
    return (
        <div
            className={cn(
                "relative flex flex-col p-4 md:p-6 rounded-2xl md:rounded-3xl border transition-all duration-300 animate-fade-in-up hover:translate-y-[-4px]",
                popular
                    ? "bg-primary/5 border-primary/50 shadow-[0_0_40px_rgba(139,92,246,0.1)]"
                    : "bg-card border-border hover:border-primary/30"
            )}
            style={{ animationDelay: `${delay}ms` }}
        >
            {popular && (
                <div className="absolute -top-3 md:-top-4 left-1/2 -translate-x-1/2 px-3 md:px-4 py-1 bg-primary rounded-full text-[10px] md:text-xs font-bold text-white shadow-lg shadow-primary/20 flex items-center gap-1">
                    <Icon icon="mingcute:fire-fill" className="w-3 h-3" />
                    TERPOPULER
                </div>
            )}

            <div className="mb-4 md:mb-6">
                <h3 className="text-base md:text-lg font-semibold text-foreground mb-1">{name}</h3>
                <p className="text-xs md:text-sm text-muted-foreground">{description}</p>
            </div>

            <div className="mb-4 md:mb-6">
                <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-2xl md:text-3xl font-bold text-foreground">{priceFormatted}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-primary font-medium">
                    <Icon icon="mingcute:coin-fill" className="w-4 h-4" />
                    <span>{tokens.toLocaleString("id-ID")} token</span>
                </div>
            </div>

            <div className="flex-1 space-y-3 mb-6">
                {features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-2 md:gap-3 text-xs md:text-sm text-foreground/80">
                        <div className={cn(
                            "mt-0.5 p-0.5 rounded-full flex items-center justify-center shrink-0",
                            popular ? "bg-primary/20 text-primary" : "bg-primary/10 text-primary"
                        )}>
                            <Icon icon="mingcute:check-fill" className="w-3 h-3" />
                        </div>
                        {feature}
                    </div>
                ))}
            </div>

            <Button
                onClick={onPurchase}
                disabled={isLoading}
                className={cn(
                    "w-full h-10 md:h-12 rounded-xl text-xs md:text-sm font-medium transition-all duration-300",
                    popular
                        ? "bg-primary hover:opacity-90 text-white"
                        : "bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20"
                )}
            >
                {isLoading ? (
                    <Icon icon="mingcute:loading-fill" className="w-5 h-5 animate-spin" />
                ) : (
                    <>
                        <Icon icon="mingcute:shopping-cart-2-fill" className="w-4 h-4 mr-2" />
                        Beli Sekarang
                    </>
                )}
            </Button>
        </div>
    );
}

function UsageInfo({ icon, label, cost }: { icon: string; label: string; cost: string }) {
    return (
        <div className="flex flex-col items-center gap-1 md:gap-2 p-2 md:p-4 rounded-lg md:rounded-xl bg-card border border-border">
            <Icon icon={icon} className="w-5 h-5 md:w-6 md:h-6 text-primary" />
            <span className="text-[10px] md:text-xs text-muted-foreground text-center">{label}</span>
            <span className="text-xs md:text-sm font-medium text-foreground">{cost}</span>
        </div>
    );
}
