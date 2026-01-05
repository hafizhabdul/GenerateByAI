"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

const navItems = [
    { href: "/", icon: "mingcute:sparkles-2-fill", label: "Create" },
    { href: "/studio", icon: "mingcute:brush-3-fill", label: "Studio" },
    { href: "/gallery", icon: "mingcute:pic-fill", label: "Gallery" },
    { href: "/videos", icon: "mingcute:movie-fill", label: "Videos" },
];

export function Sidebar() {
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);
    const { profile, loading } = useAuth();

    // Calculate credits
    const tokensTotal = profile?.tokens_total || 0;
    const tokensUsed = profile?.tokens_used || 0;
    const creditsLeft = Math.max(0, tokensTotal - tokensUsed);
    const progress = Math.min(100, (tokensUsed / tokensTotal) * 100);

    return (
        <>
            {/* Desktop Sidebar - Floating Dock Style */}
            <aside className="fixed left-4 top-1/2 -translate-y-1/2 w-20 rounded-[2rem] flex flex-col items-center py-8 gap-8 z-[300] shadow-2xl hide-mobile border border-border bg-surface-1 transition-all hover:scale-[1.02] hover:border-primary/20">
                {/* Logo - Custom Brand */}
                <Link
                    href="/"
                    className="relative group w-12 h-12 flex items-center justify-center mb-2 transition-transform hover:scale-110 hover:rotate-3"
                >
                    <img src="/mascot.png" alt="SquirrAI" className="w-10 h-10 relative z-10 drop-shadow-lg" />
                </Link>

                {/* Nav Items - Clean & Centered */}
                <nav className="flex-1 w-full flex flex-col items-center gap-6 justify-center">
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

                {/* Bottom Actions - Grouped Minimalist */}
                <div className="w-full flex flex-col items-center gap-6 pb-2">

                    {/* Minimalist Credit Ring */}
                    {!loading && profile && (
                        <div className="group relative w-12 h-12 flex items-center justify-center cursor-pointer hover:scale-105 transition-transform">
                            {/* Ring */}
                            <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 36 36">
                                <path
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeOpacity="0.1"
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                />
                                <path
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none"
                                    stroke={creditsLeft < 10 ? "#ef4444" : "#fb923c"}
                                    strokeWidth="3"
                                    strokeDasharray={`${100 - progress}, 100`}
                                    className="transition-all duration-500 ease-out"
                                    strokeLinecap="round"
                                />
                            </svg>

                            {/* Upgrade Icon inside Ring */}
                            <Link
                                href="/pricing"
                                className="w-8 h-8 flex items-center justify-center text-primary hover:text-white transition-colors z-10"
                            >
                                <Icon icon="mingcute:vip-2-fill" className="w-5 h-5" />
                            </Link>

                            {/* Floating Tooltip */}
                            <div className="absolute left-full ml-6 px-4 py-2 bg-surface-2 border border-border rounded-2xl shadow-xl opacity-0 translate-x-[-10px] invisible group-hover:visible group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 pointer-events-none w-max z-[400]">
                                <div className="text-sm font-bold text-foreground mb-0.5">{creditsLeft} Credits</div>
                                <div className="text-xs text-primary font-medium">Upgrade Plan</div>
                            </div>
                        </div>
                    )}

                    {/* Settings / Profile */}
                    <NavItem
                        href="/settings"
                        icon={<Icon icon="mingcute:settings-3-fill" className="w-6 h-6" />}
                        label="Settings"
                        active={pathname === "/settings"}
                    />

                    <div className="w-10 h-px bg-white/10" />

                    {/* User Avatar - Ultra clean */}
                    <Link
                        href="/profile"
                        className="w-12 h-12 rounded-full bg-surface-2 border-2 border-transparent hover:border-primary flex items-center justify-center text-muted-foreground hover:text-white transition-all shadow-lg"
                    >
                        <Icon icon="mingcute:user-3-fill" className="w-7 h-7" />
                    </Link>
                </div>
            </aside>

            {/* Mobile Bottom Navigation - Kept Functional */}
            <nav className="fixed bottom-0 left-0 right-0 z-[300] hide-desktop safe-area-bottom">
                <div className="glass border-t border-border px-2 py-2 bg-background/80 backdrop-blur-xl">
                    <div className="flex items-center justify-around">
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "p-3 rounded-2xl transition-all",
                                    pathname === item.href ? "text-primary bg-primary/10" : "text-muted-foreground"
                                )}
                            >
                                <Icon icon={item.icon} className="w-6 h-6" />
                            </Link>
                        ))}
                        <Link href="/pricing" className="p-3 rounded-2xl text-amber-500 bg-amber-500/10">
                            <Icon icon="mingcute:vip-2-fill" className="w-6 h-6" />
                        </Link>
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
                "relative flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-300 group",
                active
                    ? "text-white bg-primary scale-110"
                    : "text-muted-foreground hover:text-white hover:bg-white/10"
            )}
        >
            {icon}

            {/* Minimal Tooltip */}
            <div className="absolute left-full ml-6 px-4 py-2 bg-surface-2 border border-border rounded-xl text-sm font-bold text-foreground opacity-0 translate-x-[-10px] invisible group-hover:opacity-100 group-hover:visible group-hover:translate-x-0 transition-all duration-200 whitespace-nowrap z-[400] shadow-xl">
                {label}
            </div>
        </Link>
    );
}
