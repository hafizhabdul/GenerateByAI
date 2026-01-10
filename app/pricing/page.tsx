"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import Link from "next/link";

// Token packages with IDR pricing - ANTI-BONCOS PRICING
// Renamed with Nusantara theme: Pelukis / Dalang / Maestro
const TOKEN_PACKAGES = [
    {
        id: "starter",
        name: "Pelukis",
        subtitle: "Starter Pack",
        tokens: 300,
        price: 99000,
        description: "Cocok untuk trial",
        features: [
            { text: "300 Token", included: true },
            { text: "~1x video Premium (Veo)", included: true },
            { text: "atau ~12x video Standard", included: true },
            { text: "~15 gambar HD", included: true },
            { text: "Priority rendering", included: false },
            { text: "Early access fitur baru", included: false },
        ],
        popular: false,
        icon: "mingcute:brush-fill",
    },
    {
        id: "creator",
        name: "Dalang",
        subtitle: "Creator Pack",
        tokens: 1000,
        price: 299000,
        description: "Untuk kreator rutin",
        features: [
            { text: "1.000 Token", included: true },
            { text: "~4x video Premium (Veo)", included: true },
            { text: "~25x video Standard", included: true },
            { text: "~50 gambar HD", included: true },
            { text: "Priority rendering", included: true },
            { text: "Early access fitur baru", included: false },
        ],
        popular: true,
        icon: "mingcute:magic-fill",
    },
    {
        id: "pro",
        name: "Maestro",
        subtitle: "Pro Pack",
        tokens: 4000,
        price: 999000,
        description: "Power user & agency",
        features: [
            { text: "4.000 Token", included: true },
            { text: "~16x video Premium (Veo)", included: true },
            { text: "~100x video Standard", included: true },
            { text: "~200 gambar HD", included: true },
            { text: "Priority rendering", included: true },
            { text: "Early access fitur baru", included: true },
        ],
        popular: false,
        icon: "mingcute:crown-fill",
    },
];

const TOKEN_USAGE = [
    { icon: "mingcute:pic-fill", label: "Gambar", cost: "10-40" },
    { icon: "mingcute:video-fill", label: "Video Standard", cost: "40" },
    { icon: "mingcute:movie-fill", label: "Video Pro", cost: "45" },
    { icon: "mingcute:star-fill", label: "Video Premium", cost: "250" },
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
    const { showToast } = useToast();

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
                window.location.href = data.paymentUrl;
            } else {
                showToast(data.error || "Gagal membuat pembayaran", "error");
            }
        } catch (error) {
            console.error("Checkout error:", error);
            showToast("Terjadi kesalahan, silakan coba lagi", "error");
        } finally {
            setLoadingPackage(null);
        }
    };

    return (
        <div className="min-h-screen w-full bg-[#0a0a0a] relative overflow-hidden flex flex-col items-center py-16 md:py-20 px-4 md:px-8">

            {/* Batik Pattern Overlay */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 5 L55 30 L30 55 L5 30 Z' fill='none' stroke='%23c2410c' stroke-width='0.5'/%3E%3Ccircle cx='30' cy='30' r='8' fill='none' stroke='%23c2410c' stroke-width='0.3'/%3E%3C/svg%3E")`,
                backgroundSize: '60px 60px'
            }} />

            {/* Ambient Glow */}
            <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[#c2410c]/20 rounded-full blur-[150px] pointer-events-none" />

            {/* Close Button */}
            <Link
                href="/"
                className="absolute top-4 right-4 md:top-6 md:right-6 z-50 inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 transition-colors text-white/60 hover:text-white"
            >
                <Icon icon="mingcute:close-line" className="w-5 h-5" />
            </Link>

            {/* Header */}
            <div className="relative z-10 text-center space-y-4 mb-8 md:mb-12 animate-fade-in-down px-4">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#c2410c]/10 border border-[#c2410c]/30 text-xs font-medium text-[#c2410c] tracking-wider uppercase">
                    <Icon icon="mingcute:fire-fill" className="w-3.5 h-3.5" />
                    Beli Token
                </div>
                <h1 className="font-wayang text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-white">
                    Pilih paket <span className="text-[#c2410c]">token</span> kamu
                </h1>
                <p className="text-white/50 max-w-lg mx-auto text-sm md:text-base font-grotesque">
                    Beli token sekali, pakai kapan saja. Tanpa langganan bulanan.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-white/40 font-grotesque">
                    <span className="flex items-center gap-1.5">
                        <Icon icon="mingcute:check-circle-fill" className="w-3.5 h-3.5 text-green-500" />
                        Bayar via QRIS
                    </span>
                    <span className="flex items-center gap-1.5">
                        <Icon icon="mingcute:check-circle-fill" className="w-3.5 h-3.5 text-green-500" />
                        Virtual Account
                    </span>
                    <span className="flex items-center gap-1.5">
                        <Icon icon="mingcute:check-circle-fill" className="w-3.5 h-3.5 text-green-500" />
                        Token tidak expired
                    </span>
                </div>
            </div>

            {/* Free Trial Banner */}
            <div className="relative z-10 w-full max-w-4xl mb-8 md:mb-10 p-4 rounded-2xl bg-gradient-to-r from-[#c2410c]/20 via-[#c2410c]/10 to-[#c2410c]/20 border border-[#c2410c]/30 text-center">
                <span className="text-white font-grotesque font-medium text-sm md:text-base flex items-center justify-center gap-2">
                    <span className="text-xl">🎉</span>
                    User baru dapat <span className="text-[#c2410c] font-bold">100 token GRATIS</span> untuk mencoba!
                </span>
            </div>

            {/* Pricing Grid - Responsive 1/2/3 columns */}
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-5 lg:gap-4 max-w-5xl w-full px-4 mx-auto items-start lg:items-center">
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

            {/* Token Usage Info - Horizontal List Style */}
            <div className="relative z-10 mt-12 md:mt-16 max-w-4xl w-full px-4 mx-auto">
                <h3 className="font-grotesque text-sm text-white/40 uppercase tracking-widest text-center mb-6">
                    Estimasi penggunaan token
                </h3>
                <div className="flex flex-wrap items-center justify-center gap-x-6 md:gap-x-8 gap-y-3">
                    {TOKEN_USAGE.map((item, i) => (
                        <div key={i} className="flex items-center gap-3 text-white/60">
                            <Icon icon={item.icon} className="w-5 h-5 text-[#c2410c]" />
                            <span className="font-grotesque text-sm">{item.label}:</span>
                            <span className="font-wayang text-lg text-white">{item.cost}</span>
                            <span className="text-xs text-white/40">token</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Payment Methods */}
            <div className="relative z-10 mt-12 md:mt-16 text-center px-4 pb-8">
                <p className="text-xs text-white/30 mb-3 font-grotesque uppercase tracking-widest">Metode pembayaran</p>
                <div className="flex items-center justify-center gap-6 text-sm text-white/50 font-grotesque font-medium">
                    <span>QRIS</span>
                    <span className="w-1 h-1 rounded-full bg-white/20" />
                    <span>Virtual Account</span>
                </div>
                <p className="text-xs text-white/30 mt-4 font-grotesque">
                    Pembayaran diproses dengan aman oleh{" "}
                    <a href="https://pakasir.com" target="_blank" rel="noopener noreferrer" className="text-[#c2410c] hover:underline">
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
    subtitle: string;
    tokens: number;
    price: number;
    priceFormatted: string;
    description: string;
    features: { text: string; included: boolean }[];
    popular: boolean;
    icon: string;
    onPurchase: () => void;
    isLoading: boolean;
    delay: number;
}

function TokenPackageCard({
    name,
    subtitle,
    tokens,
    priceFormatted,
    description,
    features,
    popular,
    icon,
    onPurchase,
    isLoading,
    delay,
}: TokenPackageCardProps) {
    return (
        <div
            className={cn(
                "relative flex flex-col p-6 md:p-8 rounded-3xl border transition-all duration-500 animate-fade-in-up",
                popular
                    ? "bg-gradient-to-b from-[#c2410c]/20 via-[#1a1a1a] to-[#0f0f0f] border-[#c2410c]/50 lg:scale-105 shadow-[0_0_60px_-20px_rgba(194,65,12,0.4)] z-20 md:col-span-2 lg:col-span-1"
                    : "bg-[#111]/80 border-white/10 hover:border-white/20 z-10"
            )}
            style={{ animationDelay: `${delay}ms` }}
        >
            {/* Popular Badge */}
            {popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-[#c2410c] rounded-full text-xs font-bold text-white shadow-lg shadow-[#c2410c]/30 font-grotesque tracking-wide">
                    ⭐ TERPOPULER
                </div>
            )}

            {/* Batik watermark for popular card */}
            {popular && (
                <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
                    <div className="absolute top-0 right-0 w-32 h-32 opacity-10" style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M50 10 L90 50 L50 90 L10 50 Z' fill='none' stroke='%23c2410c' stroke-width='2'/%3E%3Ccircle cx='50' cy='50' r='15' fill='none' stroke='%23c2410c' stroke-width='1'/%3E%3C/svg%3E")`,
                        backgroundSize: 'contain'
                    }} />
                </div>
            )}

            {/* Header with Icon */}
            <div className="flex items-start justify-between mb-6">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Icon icon={icon} className={cn("w-5 h-5", popular ? "text-[#c2410c]" : "text-white/40")} />
                        <span className="text-xs text-white/40 font-grotesque uppercase tracking-wider">{subtitle}</span>
                    </div>
                    <h3 className="font-wayang text-2xl md:text-3xl font-bold text-white">{name}</h3>
                    <p className="text-xs text-white/40 font-grotesque mt-1">{description}</p>
                </div>
            </div>

            {/* Price with Token Coin */}
            <div className="mb-6 pb-6 border-b border-white/10">
                <div className="flex items-baseline gap-1 mb-2">
                    <span className="font-wayang text-3xl md:text-4xl font-bold text-white">{priceFormatted}</span>
                </div>
                <div className="flex items-center gap-2">
                    {/* Token Coin Icon */}
                    <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center",
                        popular ? "bg-[#c2410c]" : "bg-white/10"
                    )}>
                        <Icon icon="mingcute:coin-fill" className={cn("w-4 h-4", popular ? "text-white" : "text-[#c2410c]")} />
                    </div>
                    <span className={cn("font-wayang text-xl font-bold", popular ? "text-[#c2410c]" : "text-white/70")}>
                        {tokens.toLocaleString("id-ID")}
                    </span>
                    <span className="text-sm text-white/40 font-grotesque">token</span>
                </div>
            </div>

            {/* Features with Checkmarks */}
            <div className="flex-1 space-y-3 mb-6">
                {features.map((feature, i) => (
                    <div
                        key={i}
                        className={cn(
                            "flex items-center gap-3 text-sm font-grotesque",
                            feature.included ? "text-white/80" : "text-white/30 line-through"
                        )}
                    >
                        <Icon
                            icon={feature.included ? "mingcute:check-circle-fill" : "mingcute:close-circle-line"}
                            className={cn(
                                "w-4 h-4 shrink-0",
                                feature.included
                                    ? popular ? "text-[#c2410c]" : "text-green-500"
                                    : "text-white/20"
                            )}
                        />
                        {feature.text}
                    </div>
                ))}
            </div>

            {/* CTA Button */}
            <Button
                onClick={onPurchase}
                disabled={isLoading}
                className={cn(
                    "w-full h-12 md:h-14 rounded-2xl text-sm md:text-base font-grotesque font-bold transition-all duration-300",
                    popular
                        ? "bg-[#c2410c] hover:bg-[#dc6727] text-white shadow-lg shadow-[#c2410c]/30"
                        : "bg-white/10 hover:bg-white/15 text-white border border-white/10"
                )}
            >
                {isLoading ? (
                    <span className="flex items-center gap-2">
                        <Icon icon="mingcute:loading-fill" className="w-4 h-4 animate-spin" />
                        Processing...
                    </span>
                ) : (
                    <span className="flex items-center gap-2">
                        Beli Sekarang
                        <Icon icon="mingcute:arrow-right-fill" className="w-4 h-4" />
                    </span>
                )}
            </Button>
        </div>
    );
}

