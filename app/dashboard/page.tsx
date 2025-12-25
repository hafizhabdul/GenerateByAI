"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { Sparkles, Image as ImageIcon, Film, Zap, TrendingUp, Clock, Star, Loader2 } from "lucide-react";
import Link from "next/link";
import type { Generation } from "@/lib/supabase/types";

interface Stats {
    imagesGenerated: number;
    videosCreated: number;
    tokensUsed: number;
    tokensRemaining: number;
    favorites: number;
}

const quickActions = [
    { label: "Generate Image", href: "/", icon: ImageIcon, color: "from-violet-500 to-purple-600" },
    { label: "Create Video", href: "/?mode=video", icon: Film, color: "from-blue-500 to-cyan-600" },
    { label: "View Gallery", href: "/gallery", icon: Star, color: "from-amber-500 to-orange-600" },
];

export default function DashboardPage() {
    const { user, profile } = useAuth();
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
        { label: "Images Generated", value: stats?.imagesGenerated || 0, icon: ImageIcon, color: "text-violet-400" },
        { label: "Videos Created", value: stats?.videosCreated || 0, icon: Film, color: "text-blue-400" },
        { label: "Tokens Used", value: stats?.tokensUsed || 0, icon: Zap, color: "text-amber-400" },
        { label: "Favorites", value: stats?.favorites || 0, icon: Star, color: "text-rose-400" },
    ];

    return (
        <div className="flex min-h-screen min-h-[100dvh] w-full bg-background text-foreground">
            <Sidebar />

            <main className="flex-1 pl-0 md:pl-28 pb-20 md:pb-0">
                <div className="container-fluid py-6 md:py-10 space-y-8">
                    {/* Header */}
                    <div className="space-y-2">
                        <h1 className="font-bold tracking-tight gradient-text" style={{ fontSize: "var(--text-4xl)" }}>
                            Dashboard
                        </h1>
                        <p className="text-muted-foreground" style={{ fontSize: "var(--text-base)" }}>
                            Welcome back{profile?.name ? `, ${profile.name}` : ""}! Here&apos;s your creative overview.
                        </p>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
                                                    <stat.icon className="w-5 h-5" />
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
                                                className="h-full rounded-full bg-gradient-to-r from-primary to-purple-500 transition-all duration-500"
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
                                                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${action.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                                                        <action.icon className="w-6 h-6 text-white" />
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
                                                        {activity.type === "image" ? <ImageIcon className="w-5 h-5" /> : <Film className="w-5 h-5" />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm truncate">{activity.prompt}</p>
                                                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                                            <Clock className="w-3 h-3" />
                                                            {new Date(activity.created_at).toLocaleString()}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="p-8 text-center text-muted-foreground">
                                                <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
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
