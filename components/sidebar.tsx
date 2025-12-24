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
    X
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
    { href: "/", icon: Sparkles, label: "Create" },
    { href: "/gallery", icon: ImageIcon, label: "Gallery" },
    { href: "/videos", icon: Film, label: "Videos" },
    { href: "/dashboard", icon: LayoutGrid, label: "Dashboard" },
];

const bottomItems = [
    { href: "/settings", icon: Settings, label: "Settings" },
    { href: "/profile", icon: User, label: "Profile" },
];

export function Sidebar() {
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <>
            {/* Desktop Sidebar */}
            <aside className="fixed left-4 top-4 bottom-4 w-20 rounded-3xl glass-panel flex flex-col items-center py-6 gap-4 z-[300] shadow-2xl hide-mobile">
                {/* Logo */}
                <Link
                    href="/"
                    className="w-12 h-12 bg-gradient-to-br from-primary via-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30 hover:scale-105 transition-transform"
                >
                    <Zap className="w-6 h-6 text-white fill-current" />
                </Link>

                {/* Nav Items */}
                <nav className="flex-1 w-full flex flex-col items-center gap-2 mt-6">
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

                {/* Bottom Actions */}
                <div className="w-full flex flex-col items-center gap-2">
                    <div className="w-8 h-px bg-white/10 mb-2" />
                    {bottomItems.map((item) => (
                        <NavItem
                            key={item.href}
                            href={item.href}
                            icon={<item.icon className="w-5 h-5" />}
                            label={item.label}
                            active={pathname === item.href}
                        />
                    ))}
                </div>
            </aside>

            {/* Mobile Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 z-[300] hide-desktop safe-area-bottom">
                <div className="glass-panel border-t border-white/5 px-2 py-2">
                    <div className="flex items-center justify-around">
                        {navItems.map((item) => (
                            <MobileNavItem
                                key={item.href}
                                href={item.href}
                                icon={<item.icon className="w-5 h-5" />}
                                label={item.label}
                                active={pathname === item.href}
                            />
                        ))}
                        <button
                            onClick={() => setMobileOpen(true)}
                            className="flex flex-col items-center justify-center gap-1 p-2 min-w-[64px] text-muted-foreground"
                        >
                            <Menu className="w-5 h-5" />
                            <span className="text-[10px] font-medium">More</span>
                        </button>
                    </div>
                </div>
            </nav>

            {/* Mobile Menu Overlay */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 z-[400] bg-black/60 backdrop-blur-sm animate-fade-in hide-desktop"
                    onClick={() => setMobileOpen(false)}
                >
                    <div
                        className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl p-6 animate-slide-up safe-area-bottom"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-semibold">Menu</h3>
                            <button
                                onClick={() => setMobileOpen(false)}
                                className="p-2 rounded-xl hover:bg-white/5 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {bottomItems.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setMobileOpen(false)}
                                    className="flex items-center gap-3 p-4 rounded-2xl bg-surface-2 hover:bg-surface-3 transition-colors"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                        <item.icon className="w-5 h-5" />
                                    </div>
                                    <span className="font-medium">{item.label}</span>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            )}
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
                "relative w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-300 group touch-target",
                active
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            )}
            title={label}
        >
            {icon}
            {active && (
                <div className="absolute -right-0.5 top-2 w-1.5 h-1.5 bg-primary rounded-full shadow-[0_0_8px_rgba(139,92,246,0.8)]" />
            )}

            {/* Tooltip */}
            <div className="absolute left-full ml-3 px-3 py-1.5 bg-popover rounded-lg text-sm font-medium opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap shadow-xl border border-border pointer-events-none">
                {label}
            </div>
        </Link>
    );
}

function MobileNavItem({
    href,
    icon,
    label,
    active
}: {
    href: string;
    icon: React.ReactNode;
    label: string;
    active?: boolean;
}) {
    return (
        <Link
            href={href}
            className={cn(
                "flex flex-col items-center justify-center gap-1 p-2 min-w-[64px] rounded-xl transition-colors",
                active
                    ? "text-primary"
                    : "text-muted-foreground"
            )}
        >
            {icon}
            <span className="text-[10px] font-medium">{label}</span>
            {active && (
                <div className="absolute -top-0.5 w-6 h-0.5 bg-primary rounded-full" />
            )}
        </Link>
    );
}
