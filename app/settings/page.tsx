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

    useEffect(() => {
        setMounted(true);
        // Load saved settings
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
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                    <Icon icon="mingcute:palette-fill" className="w-5 h-5" />
                                </div>
                                <div>
                                    <CardTitle>Appearance</CardTitle>
                                    <CardDescription>Customize how the app looks</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <div className="space-y-4">
                                <label className="text-sm font-medium">Theme</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { value: "dark", label: "Dark", icon: "mingcute:moon-fill" },
                                        { value: "light", label: "Light", icon: "mingcute:sun-fill" },
                                        { value: "system", label: "System", icon: "mingcute:computer-fill" },
                                    ].map((option) => (
                                        <button
                                            key={option.value}
                                            onClick={() => setTheme(option.value as "dark" | "light" | "system")}
                                            className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${theme === option.value
                                                ? "border-primary bg-primary/10 text-primary"
                                                : "border-border bg-surface-2 hover:border-border-hover"
                                                }`}
                                        >
                                            <Icon icon={option.icon} className="w-5 h-5" />
                                            <span className="text-sm">{option.label}</span>
                                            {theme === option.value && (
                                                <Icon icon="mingcute:check-fill" className="w-4 h-4 absolute top-2 right-2" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
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

