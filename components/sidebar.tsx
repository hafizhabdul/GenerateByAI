"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
    LayoutGrid,
    Sparkles,
    Film,
    Image as ImageIcon,
    Settings,
    User,
    Zap,
    Menu,
    X,
    Crown,
    Palette
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

const navItems = [
    { href: "/", icon: Sparkles, label: "Create" },
    { href: "/studio", icon: Palette, label: "Studio" },
    { href: "/gallery", icon: ImageIcon, label: "Gallery" },
    { href: "/videos", icon: Film, label: "Videos" },
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
            {/* Desktop Sidebar - Minimalist & Premium */}
            <aside className="fixed left-6 top-6 bottom-6 w-16 rounded-full glass-panel flex flex-col items-center py-6 gap-6 z-[300] shadow-2xl hide-mobile border border-white/5 bg-black/40 backdrop-blur-xl">
                {/* Logo - Subtle Glow */}
                <Link
                    href="/"
                    className="relative group w-10 h-10 flex items-center justify-center mb-4 transition-transform hover:scale-110"
                >
                    <div className="absolute inset-0 bg-primary/20 rounded-full blur-lg opacity-50 group-hover:opacity-100 transition-opacity" />
                    <Zap className="w-6 h-6 text-primary fill-current relative z-10" />
                </Link>

                {/* Nav Items - Clean & Centered */}
                <nav className="flex-1 w-full flex flex-col items-center gap-4">
                    {navItems.map((item) => (
                        <NavItem
                            key={item.href}
                            href={item.href}
                            icon={<item.icon className="w-5 h-5" />}
                            label={item.label}
                            active={pathname === item.href}
                        />
                    ))}
                </nav>

                {/* Bottom Actions - Grouped Minimalist */}
                <div className="w-full flex flex-col items-center gap-4 pb-2">

                    {/* Minimalist Credit Ring */}
                    {!loading && profile && (
                        <div className="group relative w-10 h-10 flex items-center justify-center">
                            {/* Ring */}
                            <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 36 36">
                                <path
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none"
                                    stroke="rgba(255, 255, 255, 0.1)"
                                    strokeWidth="3"
                                />
                                <path
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none"
                                    stroke={creditsLeft < 10 ? "#ef4444" : "#8b5cf6"}
                                    strokeWidth="3"
                                    strokeDasharray={`${100 - progress}, 100`}
                                    className="transition-all duration-500 ease-out"
                                />
                            </svg>

                            {/* Upgrade Icon inside Ring */}
                            <Link
                                href="/pricing"
                                className="w-6 h-6 flex items-center justify-center text-amber-500 hover:scale-110 transition-transform cursor-pointer z-10"
                            >
                                <Crown className="w-4 h-4 fill-current" />
                            </Link>

                            {/* Floating Tooltip */}
                            <div className="absolute left-full ml-4 px-3 py-2 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl opacity-0 translate-x-[-10px] invisible group-hover:visible group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 pointer-events-none w-max z-[400]">
                                <div className="text-xs font-semibold text-white mb-0.5">{creditsLeft} Credits Left</div>
                                <div className="text-[10px] text-amber-400 font-medium">Upgrade to Pro</div>
                            </div>
                        </div>
                    )}

                    {/* Settings / Profile */}
                    <NavItem
                        href="/settings"
                        icon={<Settings className="w-5 h-5" />}
                        label="Settings"
                        active={pathname === "/settings"}
                    />

                    <div className="w-8 h-px bg-white/5" />

                    {/* User Avatar - Ultra clean */}
                    <Link
                        href="/profile"
                        className="w-10 h-10 rounded-full bg-gradient-to-tr from-surface-2 to-surface-3 border border-white/10 flex items-center justify-center text-muted-foreground hover:text-white hover:border-white/20 transition-all"
                    >
                        <User className="w-5 h-5" />
                    </Link>
                </div>
            </aside>

            {/* Mobile Bottom Navigation - Kept Functional */}
            <nav className="fixed bottom-0 left-0 right-0 z-[300] hide-desktop safe-area-bottom">
                <div className="glass border-t border-white/5 px-2 py-2 bg-black/80 backdrop-blur-xl">
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
                                <item.icon className="w-6 h-6" />
                            </Link>
                        ))}
                        <Link href="/pricing" className="p-3 rounded-2xl text-amber-500 bg-amber-500/10">
                            <Crown className="w-6 h-6 fill-current/20" />
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
                "relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300 group",
                active
                    ? "text-primary bg-primary/10 shadow-[0_0_15px_rgba(139,92,246,0.3)]"
                    : "text-muted-foreground hover:text-white hover:bg-white/5"
            )}
        >
            {icon}

            {/* Minimal Tooltip */}
            <div className="absolute left-full ml-4 px-3 py-1.5 bg-[#1a1a1a] border border-white/10 rounded-lg text-xs font-medium text-white opacity-0 translate-x-[-5px] invisible group-hover:opacity-100 group-hover:visible group-hover:translate-x-0 transition-all duration-200 whitespace-nowrap z-[400] shadow-xl">
                {label}
            </div>
        </Link>
    );
}
