"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

const navItems = [
    { href: "/?view=create", icon: "mingcute:sparkles-2-fill", label: "Create" },
    { href: "/studio", icon: "mingcute:brush-3-fill", label: "Studio" },
    { href: "/gallery", icon: "mingcute:pic-fill", label: "Gallery" },
    { href: "/videos", icon: "mingcute:movie-fill", label: "Videos" },
];

export function Sidebar() {
    const pathname = usePathname();
    const { profile, loading } = useAuth();

    // Calculate credits - simplified
    const tokensTotal = profile?.tokens_total || 0;
    const tokensUsed = profile?.tokens_used || 0;
    const creditsLeft = Math.max(0, tokensTotal - tokensUsed);

    return (
        <>
            {/* Desktop Sidebar - Floating Dock Style */}
            <aside className="fixed left-4 top-1/2 -translate-y-1/2 w-[72px] rounded-[1.75rem] flex flex-col items-center py-6 gap-6 z-[300] shadow-2xl hide-mobile border border-border bg-surface-1/95 backdrop-blur-xl transition-all hover:scale-[1.01] hover:border-primary/20">
                {/* Logo - Custom Brand */}
                <Link
                    href="/"
                    className="relative group w-11 h-11 flex items-center justify-center mb-1 transition-transform hover:scale-110 hover:rotate-3"
                >
                    <img src="/mascot.png" alt="SquirrAI" className="w-9 h-9 relative z-10 drop-shadow-lg" />
                </Link>

                {/* Nav Items - Clean & Centered */}
                <nav className="flex-1 w-full flex flex-col items-center gap-4 justify-center">
                    {navItems.map((item) => (
                        <NavItem
                            key={item.href}
                            href={item.href}
                            icon={<Icon icon={item.icon} className="w-6 h-6" />}
                            label={item.label}
                            active={pathname === item.href}
                        />
                    ))}
                </nav>

                {/* Bottom Actions - Simplified */}
                <div className="w-full flex flex-col items-center gap-4 pb-1">

                    {/* Credit Display - Simplified text */}
                    {!loading && profile && (
                        <Link
                            href="/pricing"
                            className="group relative flex flex-col items-center gap-0.5 p-2 rounded-xl hover:bg-white/5 transition-colors"
                        >
                            <span className="text-sm font-bold text-foreground">{creditsLeft}</span>
                            <span className="text-[10px] text-muted-foreground">tokens</span>

                            {/* Tooltip */}
                            <div className="absolute left-full ml-5 px-3 py-2 bg-surface-2 border border-border rounded-xl shadow-xl opacity-0 translate-x-[-10px] invisible group-hover:visible group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 pointer-events-none w-max z-[400]">
                                <div className="text-sm font-bold text-foreground mb-0.5">{creditsLeft} tokens left</div>
                                <div className="text-xs text-primary font-medium">Upgrade Plan</div>
                            </div>
                        </Link>
                    )}

                    {/* Login Prompt - Show when not logged in */}
                    {!loading && !profile && (
                        <Link
                            href="/login"
                            className="group relative px-3 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-sm font-medium hover:scale-105 transition-all"
                        >
                            Login

                            {/* Tooltip */}
                            <div className="absolute left-full ml-5 px-3 py-2 bg-surface-2 border border-border rounded-xl shadow-xl opacity-0 translate-x-[-10px] invisible group-hover:visible group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 pointer-events-none w-max z-[400]">
                                <div className="text-sm font-bold text-foreground mb-0.5">Login</div>
                                <div className="text-xs text-muted-foreground">Sign in to start</div>
                            </div>
                        </Link>
                    )}

                    {/* Settings */}
                    <NavItem
                        href="/settings"
                        icon={<Icon icon="mingcute:settings-3-fill" className="w-6 h-6" />}
                        label="Settings"
                        active={pathname === "/settings"}
                    />

                    <div className="w-8 h-px bg-white/10" />

                    {/* User Avatar - Text initial instead of icon */}
                    <Link
                        href="/profile"
                        className="w-10 h-10 rounded-full bg-surface-2 border-2 border-transparent hover:border-primary flex items-center justify-center text-sm font-bold text-muted-foreground hover:text-foreground transition-all"
                    >
                        {profile?.name?.[0]?.toUpperCase() || "U"}
                    </Link>
                </div>
            </aside>

            {/* Mobile Bottom Navigation - Kept Functional */}
            <nav className="fixed bottom-0 left-0 right-0 z-[300] hide-desktop safe-area-bottom">
                <div className="bg-background/95 backdrop-blur-xl border-t border-border px-2 py-2">
                    <div className="flex items-center justify-around max-w-md mx-auto">
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "p-3 rounded-xl transition-all flex flex-col items-center gap-1",
                                    pathname === item.href ? "text-primary bg-primary/10" : "text-muted-foreground active:bg-white/5"
                                )}
                            >
                                <Icon icon={item.icon} className="w-5 h-5" />
                                <span className="text-[10px] font-medium">{item.label}</span>
                            </Link>
                        ))}
                        {profile ? (
                            <Link href="/pricing" className="p-3 rounded-xl text-primary bg-primary/10 flex flex-col items-center gap-1">
                                <span className="text-sm font-bold">{creditsLeft}</span>
                                <span className="text-[10px] font-medium">tokens</span>
                            </Link>
                        ) : (
                            <Link href="/login" className="p-3 rounded-xl text-primary bg-primary/10 flex flex-col items-center gap-1">
                                <span className="text-sm font-medium">Login</span>
                            </Link>
                        )}
                    </div>
                </div>
            </nav>
        </>
    );
}

function NavItem({
    href,
    icon,
    label,
    active
}: {
    href: string;
    icon: React.ReactNode;
    label: string;
    active?: boolean
}) {
    return (
        <Link
            href={href}
            className={cn(
                "relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300 group",
                active
                    ? "text-white bg-primary scale-105"
                    : "text-muted-foreground hover:text-white hover:bg-white/10"
            )}
        >
            {icon}

            {/* Minimal Tooltip */}
            <div className="absolute left-full ml-5 px-3 py-1.5 bg-surface-2 border border-border rounded-lg text-sm font-medium text-foreground opacity-0 translate-x-[-10px] invisible group-hover:opacity-100 group-hover:visible group-hover:translate-x-0 transition-all duration-200 whitespace-nowrap z-[400] shadow-xl">
                {label}
            </div>
        </Link>
    );
}
