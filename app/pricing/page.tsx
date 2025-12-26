"use client";

import { Check, Sparkles, Zap, Crown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function PricingPage() {
    return (
        <div className="min-h-screen w-full bg-background relative overflow-hidden flex flex-col items-center py-20 px-4 md:px-8">
            {/* Ambient Background */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1200px] h-[600px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

            {/* Close Button */}
            <div className="absolute top-6 right-6 z-50">
                <Link
                    href="/"
                    className="inline-flex items-center justify-center w-11 h-11 rounded-full hover:bg-white/10 transition-colors"
                >
                    <X className="w-6 h-6 text-muted-foreground hover:text-white" />
                </Link>
            </div>

            {/* Header */}
            <div className="relative z-10 text-center space-y-4 mb-16 md:mb-24 animate-fade-in-down">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-primary tracking-wider uppercase backdrop-blur-md">
                    <Crown className="w-3 h-3" />
                    Premium Access
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white">
                    Unlock your <span className="gradient-text">full potential</span>.
                </h1>
                <p className="text-muted-foreground max-w-lg mx-auto text-lg">
                    Choose the perfect plan to fuel your creativity. Simple pricing, cancel anytime.
                </p>
            </div>

            {/* Pricing Grid */}
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl w-full">
                {/* Free Plan */}
                <PricingCard
                    title="Starter"
                    price="Free"
                    description="Perfect for exploring AI art generation."
                    features={[
                        "100 Credits / month",
                        "Standard Generation Speed",
                        "Public Gallery Access",
                        "Personal Use Only"
                    ]}
                    buttonText="Current Plan"
                    variant="ghost"
                    delay={0}
                />

                {/* Pro Plan (Highlighted) */}
                <PricingCard
                    title="Pro Creator"
                    price="$19"
                    period="/month"
                    description="For serious creators and professionals."
                    features={[
                        "2,000 Credits / month",
                        "Fast Fast Generation",
                        "Upscale & Enhance (4x)",
                        "Private Mode",
                        "Commercial License",
                        "Priority Support"
                    ]}
                    buttonText="Upgrade to Pro"
                    variant="primary"
                    popular
                    delay={100}
                />

                {/* Business Plan */}
                <PricingCard
                    title="Agency"
                    price="$49"
                    period="/month"
                    description="Power for teams and high volume."
                    features={[
                        "10,000 Credits / month",
                        "Concurrent Generation",
                        "API Access",
                        "Team collaboration (3 seats)",
                        "Dedicated Account Manager"
                    ]}
                    buttonText="Box Sales"
                    variant="outline"
                    delay={200}
                />
            </div>
        </div>
    );
}

interface PricingCardProps {
    title: string;
    price: string;
    period?: string;
    description: string;
    features: string[];
    buttonText: string;
    variant: "primary" | "outline" | "ghost";
    popular?: boolean;
    delay?: number;
}

function PricingCard({
    title,
    price,
    period,
    description,
    features,
    buttonText,
    variant,
    popular,
    delay
}: PricingCardProps) {
    return (
        <div
            className={cn(
                "relative flex flex-col p-6 rounded-3xl border transition-all duration-300 animate-fade-in-up hover:translate-y-[-4px]",
                popular
                    ? "bg-white/5 border-primary/50 shadow-[0_0_40px_rgba(139,92,246,0.1)]"
                    : "bg-surface-1/50 border-white/5 hover:border-white/10"
            )}
            style={{ animationDelay: `${delay}ms` }}
        >
            {popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-primary to-indigo-600 rounded-full text-xs font-bold text-white shadow-lg shadow-primary/20 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 fill-white" />
                    MOST POPULAR
                </div>
            )}

            <div className="mb-8">
                <h3 className="text-lg font-medium text-white mb-2">{title}</h3>
                <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-4xl font-bold text-white">{price}</span>
                    {period && <span className="text-muted-foreground">{period}</span>}
                </div>
                <p className="text-sm text-muted-foreground">{description}</p>
            </div>

            <div className="flex-1 space-y-4 mb-8">
                {features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm text-foreground/80">
                        <div className={cn(
                            "mt-0.5 p-0.5 rounded-full flex items-center justify-center shrink-0",
                            popular ? "bg-primary/20 text-primary" : "bg-white/10 text-muted-foreground"
                        )}>
                            <Check className="w-3 h-3" />
                        </div>
                        {feature}
                    </div>
                ))}
            </div>

            <Button
                className={cn(
                    "w-full h-12 rounded-xl text-sm font-medium transition-all duration-300",
                    variant === "primary" && "bg-gradient-to-r from-primary to-indigo-600 hover:opacity-90 shadow-glow",
                    variant === "outline" && "bg-transparent border border-white/10 hover:bg-white/5",
                    variant === "ghost" && "bg-surface-2 hover:bg-surface-3"
                )}
            >
                {buttonText}
            </Button>
        </div>
    );
}
