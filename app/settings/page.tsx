"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { Moon, Sun, Monitor, Bell, BellOff, Shield, Key, Palette, Zap, ChevronRight, Check } from "lucide-react";

export default function SettingsPage() {
    const { showToast } = useToast();
    const [theme, setTheme] = useState<"dark" | "light" | "system">("dark");
    const [notifications, setNotifications] = useState(true);
    const [quality, setQuality] = useState<"standard" | "high" | "ultra">("high");

    const handleSave = () => {
        showToast("Settings saved successfully!", "success");
    };

    return (
        <div className="flex min-h-screen min-h-[100dvh] w-full bg-background text-foreground">
            <Sidebar />

            <main className="flex-1 pl-0 md:pl-28 pb-20 md:pb-0">
                <div className="container-fluid py-6 md:py-10 space-y-8 max-w-3xl">
                    {/* Header */}
                    <div className="space-y-2">
                        <h1 className="font-bold tracking-tight gradient-text" style={{ fontSize: "var(--text-4xl)" }}>
                            Settings
                        </h1>
                        <p className="text-muted-foreground" style={{ fontSize: "var(--text-base)" }}>
                            Customize your AI Creative Studio experience
                        </p>
                    </div>

                    {/* Appearance */}
                    <Card variant="glass">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                    <Palette className="w-5 h-5" />
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
                                        { value: "dark", label: "Dark", icon: Moon },
                                        { value: "light", label: "Light", icon: Sun },
                                        { value: "system", label: "System", icon: Monitor },
                                    ].map((option) => (
                                        <button
                                            key={option.value}
                                            onClick={() => setTheme(option.value as typeof theme)}
                                            className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${theme === option.value
                                                    ? "border-primary bg-primary/10 text-primary"
                                                    : "border-border bg-surface-2 hover:border-border-hover"
                                                }`}
                                        >
                                            <option.icon className="w-5 h-5" />
                                            <span className="text-sm">{option.label}</span>
                                            {theme === option.value && (
                                                <Check className="w-4 h-4 absolute top-2 right-2" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Generation Quality */}
                    <Card variant="glass">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                    <Zap className="w-5 h-5" />
                                </div>
                                <div>
                                    <CardTitle>Generation Quality</CardTitle>
                                    <CardDescription>Balance between speed and quality</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                            {[
                                { value: "standard", label: "Standard", desc: "Faster generation, good quality", tokens: "10 tokens" },
                                { value: "high", label: "High", desc: "Balanced speed and quality", tokens: "20 tokens" },
                                { value: "ultra", label: "Ultra", desc: "Best quality, slower", tokens: "40 tokens" },
                            ].map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => setQuality(option.value as typeof quality)}
                                    className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${quality === option.value
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
                                        {quality === option.value && <Check className="w-5 h-5 text-primary" />}
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
                                    {notifications ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
                                </div>
                                <div className="flex-1">
                                    <CardTitle>Notifications</CardTitle>
                                    <CardDescription>Get notified when generations complete</CardDescription>
                                </div>
                                <button
                                    onClick={() => setNotifications(!notifications)}
                                    className={`w-12 h-7 rounded-full transition-colors relative ${notifications ? "bg-primary" : "bg-surface-3"
                                        }`}
                                >
                                    <div className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${notifications ? "left-6" : "left-1"
                                        }`} />
                                </button>
                            </div>
                        </CardHeader>
                    </Card>

                    {/* Security */}
                    <Card variant="glass">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                    <Shield className="w-5 h-5" />
                                </div>
                                <div>
                                    <CardTitle>Security</CardTitle>
                                    <CardDescription>Manage your security settings</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-3">
                            <button className="w-full flex items-center justify-between p-4 rounded-xl border border-border hover:border-border-hover transition-colors">
                                <div className="flex items-center gap-3">
                                    <Key className="w-5 h-5 text-muted-foreground" />
                                    <span>API Key Configuration</span>
                                </div>
                                <ChevronRight className="w-5 h-5 text-muted-foreground" />
                            </button>
                        </CardContent>
                    </Card>

                    {/* Save Button */}
                    <div className="flex justify-end pt-4">
                        <Button onClick={handleSave} variant="primary" size="lg">
                            Save Changes
                        </Button>
                    </div>
                </div>
            </main>
        </div>
    );
}
