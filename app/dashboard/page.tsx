"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { Icon } from "@iconify/react";
import Link from "next/link";
import type { Generation } from "@/lib/supabase/types";
import { MascotLoading } from "@/components/mascot";

interface Stats {
    imagesGenerated: number;
    videosCreated: number;
    tokensUsed: number;
    tokensRemaining: number;
    favorites: number;
}

const quickActions = [
    { label: "Generate Image", href: "/?view=create", icon: "mingcute:image-fill", color: "bg-violet-500" },
    { label: "Create Video", href: "/videos", icon: "mingcute:video-fill", color: "bg-blue-500" },
    { label: "View Gallery", href: "/gallery", icon: "mingcute:star-fill", color: "bg-amber-500" },
];

export default function DashboardPage() {
    const { user, profile, loading: authLoading } = useAuth();
    const [stats, setStats] = useState<Stats | null>(null);
    const [recentActivity, setRecentActivity] = useState<Generation[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetchData();
        } else {
            setLoading(false);
        }
    }, [user]);

    const fetchData = async () => {
        try {
            // Fetch user stats
            const userRes = await fetch("/api/user");
            if (userRes.ok) {
                const userData = await userRes.json();
                setStats(userData.stats);
            }

            // Fetch recent activity
            const activityRes = await fetch("/api/generations?limit=5");
            if (activityRes.ok) {
                const activityData = await activityRes.json();
                setRecentActivity(activityData.generations || []);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const statsData = [
        { label: "Images Generated", value: stats?.imagesGenerated || 0, icon: "mingcute:image-fill", color: "text-primary" },
        { label: "Videos Created", value: stats?.videosCreated || 0, icon: "mingcute:video-fill", color: "text-primary" },
        { label: "Tokens Used", value: stats?.tokensUsed || 0, icon: "mingcute:flash-fill", color: "text-primary" },
        { label: "Favorites", value: stats?.favorites || 0, icon: "mingcute:star-fill", color: "text-primary" },
    ];

    // Show welcome/landing page when not logged in
    if (!authLoading && !user) {
        return (
            <div className="flex min-h-screen min-h-[100dvh] w-full bg-background text-foreground">
                <Sidebar />
                <main className="flex-1 pl-0 md:pl-28 pb-20 md:pb-0">
                    <div className="container-fluid py-6 md:py-10 flex flex-col items-center justify-center min-h-[80vh]">
                        {/* Welcome Hero */}
                        <div className="text-center space-y-6 max-w-2xl mx-auto px-4">
                            <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-primary/10 flex items-center justify-center">
                                <Icon icon="mingcute:sparkles-2-fill" className="w-10 h-10 text-primary" />
                            </div>
                            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">
                                Selamat datang di <span className="text-primary">SQUIRR.AI</span>
                            </h1>
                            <p className="text-muted-foreground text-base md:text-lg max-w-md mx-auto">
                                Platform AI untuk generate gambar dan video berkualitas tinggi. Login untuk mulai berkreasi!
                            </p>

                            {/* CTA Buttons */}
                            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                                <Link href="/login">
                                    <button className="w-full sm:w-auto px-8 py-3 rounded-xl bg-primary text-white font-medium hover:opacity-90 transition-all flex items-center justify-center gap-2">
                                        <Icon icon="mingcute:login-fill" className="w-5 h-5" />
                                        Login
                                    </button>
                                </Link>
                                <Link href="/register">
                                    <button className="w-full sm:w-auto px-8 py-3 rounded-xl bg-surface-2 border border-border text-foreground font-medium hover:bg-surface-3 transition-all flex items-center justify-center gap-2">
                                        <Icon icon="mingcute:user-add-fill" className="w-5 h-5" />
                                        Daftar Gratis
                                    </button>
                                </Link>
                            </div>

                            {/* Free Credits Banner */}
                            <div className="mt-8 p-4 rounded-2xl bg-primary/10 border border-primary/20">
                                <div className="flex items-center justify-center gap-2 text-primary">
                                    <Icon icon="mingcute:gift-fill" className="w-5 h-5" />
                                    <span className="font-medium">Daftar sekarang & dapatkan 100 token GRATIS!</span>
                                </div>
                            </div>

                            {/* Features Preview */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-12">
                                <div className="p-4 rounded-2xl bg-surface-1 border border-border text-center">
                                    <Icon icon="mingcute:pic-fill" className="w-8 h-8 mx-auto mb-2 text-primary" />
                                    <p className="font-medium">Generate Image</p>
                                    <p className="text-xs text-muted-foreground mt-1">AI-powered image creation</p>
                                </div>
                                <div className="p-4 rounded-2xl bg-surface-1 border border-border text-center">
                                    <Icon icon="mingcute:movie-fill" className="w-8 h-8 mx-auto mb-2 text-primary" />
                                    <p className="font-medium">Create Video</p>
                                    <p className="text-xs text-muted-foreground mt-1">Turn images into videos</p>
                                </div>
                                <div className="p-4 rounded-2xl bg-surface-1 border border-border text-center">
                                    <Icon icon="mingcute:sparkles-2-fill" className="w-8 h-8 mx-auto mb-2 text-primary" />
                                    <p className="font-medium">Premium Quality</p>
                                    <p className="text-xs text-muted-foreground mt-1">Veo 3.1 with audio</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen min-h-[100dvh] w-full bg-background text-foreground">
            <Sidebar />

            <main className="flex-1 pl-0 md:pl-28 pb-20 md:pb-0">
                <div className="container-fluid py-6 md:py-10 space-y-8">
                    {/* Header */}
                    <div className="space-y-2">
                        <h1 className="font-bold tracking-tight text-foreground" style={{ fontSize: "var(--text-4xl)" }}>
                            Dashboard
                        </h1>
                        <p className="text-muted-foreground" style={{ fontSize: "var(--text-base)" }}>
                            Welcome back{profile?.name ? `, ${profile.name}` : ""}! Here&apos;s your creative overview.
                        </p>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <MascotLoading
                                message="📊 Squirrel sedang memuat dashboard..."
                                submessage="Tunggu sebentar ya!"
                            />
                        </div>
                    ) : (
                        <>
                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                {statsData.map((stat) => (
                                    <Card key={stat.label} variant="glass" hover>
                                        <CardContent className="p-4 md:p-6">
                                            <div className="flex items-start justify-between">
                                                <div className="space-y-2">
                                                    <p className="text-muted-foreground text-xs md:text-sm">{stat.label}</p>
                                                    <p className="text-2xl md:text-3xl font-bold">
                                                        {stat.value.toLocaleString()}
                                                    </p>
                                                </div>
                                                <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center ${stat.color}`}>
                                                    <Icon icon={stat.icon} className="w-5 h-5" />
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>

                            {/* Token Usage */}
                            {stats && (
                                <Card variant="glass">
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="font-semibold">Token Usage</h3>
                                            <span className="text-sm text-muted-foreground">
                                                {stats.tokensUsed} / {stats.tokensUsed + stats.tokensRemaining} used
                                            </span>
                                        </div>
                                        <div className="h-3 rounded-full bg-surface-2 overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-primary transition-all duration-500"
                                                style={{
                                                    width: `${(stats.tokensUsed / (stats.tokensUsed + stats.tokensRemaining)) * 100}%`
                                                }}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Quick Actions */}
                            <div className="space-y-4">
                                <h2 className="text-lg font-semibold">Quick Actions</h2>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    {quickActions.map((action) => (
                                        <Link key={action.label} href={action.href}>
                                            <Card variant="default" hover className="group overflow-hidden">
                                                <CardContent className="p-6 flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-2xl ${action.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                                                        <Icon icon={action.icon} className="w-6 h-6 text-white" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium group-hover:text-primary transition-colors">{action.label}</p>
                                                        <p className="text-sm text-muted-foreground">Start creating</p>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </Link>
                                    ))}
                                </div>
                            </div>

                            {/* Recent Activity */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-lg font-semibold">Recent Activity</h2>
                                    <Link href="/gallery" className="text-sm text-primary hover:underline">View all</Link>
                                </div>
                                <Card variant="glass">
                                    <CardContent className="p-0 divide-y divide-border">
                                        {recentActivity.length > 0 ? (
                                            recentActivity.map((activity) => (
                                                <div key={activity.id} className="p-4 flex items-center gap-4 hover:bg-white/5 transition-colors">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${activity.type === "image" ? "bg-violet-500/10 text-violet-400" : "bg-blue-500/10 text-blue-400"
                                                        }`}>
                                                        <Icon icon={activity.type === "image" ? "mingcute:image-fill" : "mingcute:video-fill"} className="w-5 h-5" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm truncate">{activity.prompt}</p>
                                                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                                            <Icon icon="mingcute:time-fill" className="w-3 h-3" />
                                                            {new Date(activity.created_at).toLocaleString()}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="p-8 text-center text-muted-foreground">
                                                <Icon icon="mingcute:sparkles-2-fill" className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                                <p>No activity yet. Start generating!</p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
