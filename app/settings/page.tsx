"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { Icon } from "@iconify/react";
import { useTheme } from "next-themes";

export default function SettingsPage() {
    const { showToast } = useToast();
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [notifications, setNotifications] = useState(true);
    const [quality, setQuality] = useState<"low" | "medium" | "high">("high");

    useEffect(() => {
        setMounted(true);
        // Load saved settings
        const savedQuality = localStorage.getItem("generation_quality");
        if (savedQuality) setQuality(savedQuality as "low" | "medium" | "high");

        const savedNotifications = localStorage.getItem("notifications_enabled");
        if (savedNotifications !== null) {
            setNotifications(savedNotifications === "true");
        }
    }, []);

    if (!mounted) return null;

    const handleNotificationToggle = (newValue: boolean) => {
        setNotifications(newValue);
        localStorage.setItem("notifications_enabled", String(newValue));
        showToast(newValue ? "Notifications enabled" : "Notifications disabled", "success");
    };

    const handleQualityChange = (newQuality: "low" | "medium" | "high") => {
        setQuality(newQuality);
        localStorage.setItem("generation_quality", newQuality);
        showToast(`Quality set to ${newQuality}`, "success");
    };

    return (
        <div className="flex min-h-screen min-h-[100dvh] w-full bg-background text-foreground">
            <Sidebar />

            <main className="flex-1 pl-0 md:pl-28 pb-20 md:pb-0">
                <div className="container-fluid py-6 md:py-10 space-y-8 max-w-3xl">
                    {/* Header */}
                    <div className="space-y-2">
                        <h1 className="font-bold tracking-tight text-foreground" style={{ fontSize: "var(--text-4xl)" }}>
                            Settings
                        </h1>
                        <p className="text-muted-foreground" style={{ fontSize: "var(--text-base)" }}>
                            Customize your SquirrAI experience
                        </p>
                    </div>

                    {/* Appearance */}
                    <Card variant="glass">
                        <CardHeader>
                            <CardTitle>Appearance</CardTitle>
                            <CardDescription>Customize how the app looks</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <div className="space-y-4">
                                <label className="text-sm font-medium">Theme</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { value: "dark", label: "Dark" },
                                        { value: "light", label: "Light" },
                                        { value: "system", label: "System" },
                                    ].map((option) => (
                                        <button
                                            key={option.value}
                                            onClick={() => setTheme(option.value as "dark" | "light" | "system")}
                                            className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${theme === option.value
                                                ? "border-primary bg-primary/10 text-primary"
                                                : "border-border bg-surface-2 hover:border-border-hover"
                                                }`}
                                        >
                                            <span className="text-sm">{option.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Generation Quality */}
                    <Card variant="glass">
                        <CardHeader>
                            <CardTitle>Image Quality</CardTitle>
                            <CardDescription>Balance between speed and quality</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                            {[
                                { value: "low", label: "Low", desc: "Fast generation, good quality", tokens: "10 tokens" },
                                { value: "medium", label: "Medium", desc: "Balanced speed and quality", tokens: "20 tokens" },
                                { value: "high", label: "High", desc: "Best quality, slower", tokens: "40 tokens" },
                            ].map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => handleQualityChange(option.value as typeof quality)}
                                    className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${quality === option.value
                                        ? "border-primary bg-primary/5"
                                        : "border-border hover:border-border-hover"
                                        }`}
                                >
                                    <div className="text-left">
                                        <p className="font-medium">{option.label}</p>
                                        <p className="text-sm text-muted-foreground">{option.desc}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-muted-foreground bg-surface-2 px-2 py-1 rounded-lg">{option.tokens}</span>
                                    </div>
                                </button>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Notifications */}
                    <Card variant="glass">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                    <Icon icon={notifications ? "mingcute:notification-fill" : "mingcute:notification-off-fill"} className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                    <CardTitle>Notifications</CardTitle>
                                    <CardDescription>Get notified when generations complete</CardDescription>
                                </div>
                                <button
                                    onClick={() => handleNotificationToggle(!notifications)}
                                    className={`w-12 h-7 rounded-full transition-colors relative ${notifications ? "bg-primary" : "bg-surface-3"
                                        }`}
                                >
                                    <div className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${notifications ? "left-6" : "left-1"
                                        }`} />
                                </button>
                            </div>
                        </CardHeader>
                    </Card>
                </div>
            </main>
        </div>
    );
}
