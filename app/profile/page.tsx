"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth-context";
import { Icon } from "@iconify/react";

interface Stats {
    imagesGenerated: number;
    videosCreated: number;
    tokensUsed: number;
    tokensRemaining: number;
    tokensTotal: number;
}

export default function ProfilePage() {
    const router = useRouter();
    const { user, profile, signOut, loading: authLoading, refreshProfile } = useAuth();
    const { showToast } = useToast();
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);

    useEffect(() => {
        let mounted = true;
        // Safety timeout to prevent infinite loading
        const safetyTimer = setTimeout(() => {
            if (mounted && loading) setLoading(false);
        }, 4000);

        if (user) {
            fetchStats().finally(() => {
                if (mounted) setLoading(false);
            });
        } else if (!authLoading) {
            setLoading(false);
        }

        return () => {
            mounted = false;
            clearTimeout(safetyTimer);
        };
    }, [user, authLoading]);

    const fetchStats = async () => {
        try {
            const res = await fetch("/api/user");
            if (res.ok) {
                const data = await res.json();
                setStats(data.stats);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSyncPayments = async () => {
        setSyncing(true);
        try {
            const res = await fetch("/api/payments/sync", { method: "POST" });
            const data = await res.json();

            if (data.success) {
                if (data.synced > 0 || data.updates?.tokens || data.updates?.plan) {
                    showToast("✅ Profile synced! Tokens and plan updated.", "success");
                    // Refresh data
                    await fetchStats();
                    if (refreshProfile) await refreshProfile();
                } else {
                    showToast("Profile is already in sync", "info");
                }
            } else {
                showToast(data.error || "Failed to sync", "error");
            }
        } catch (error) {
            console.error("Sync error:", error);
            showToast("Failed to sync payments", "error");
        } finally {
            setSyncing(false);
        }
    };

    const handleLogout = async () => {
        await signOut();
        showToast("Signed out successfully", "info");
        router.push("/login");
    };

    if (loading || authLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen min-h-[100dvh] w-full bg-background text-foreground">
            <Sidebar />

            <main className="flex-1 pl-0 md:pl-28 pb-20 md:pb-0">
                <div className="container-fluid py-6 md:py-10 space-y-8 max-w-3xl">
                    {/* Header */}
                    <div className="space-y-2">
                        <h1 className="font-bold tracking-tight text-foreground" style={{ fontSize: "var(--text-4xl)" }}>
                            Profile
                        </h1>
                        <p className="text-muted-foreground" style={{ fontSize: "var(--text-base)" }}>
                            Manage your account and view usage stats
                        </p>
                    </div>

                    {/* Profile Card */}
                    <Card variant="glass" className="overflow-hidden">
                        <div className="h-20 bg-primary/80" />
                        <CardContent className="pt-0 pb-6 px-6">
                            <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-10">
                                {/* Avatar */}
                                <div className="w-20 h-20 rounded-2xl bg-surface-2 border-4 border-card flex items-center justify-center overflow-hidden text-2xl font-bold text-muted-foreground">
                                    {profile?.avatar_url ? (
                                        <img src={profile.avatar_url} alt={profile.name || ""} className="w-full h-full object-cover" />
                                    ) : (
                                        profile?.name?.[0]?.toUpperCase() || "U"
                                    )}
                                </div>

                                <div className="flex-1 space-y-1">
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-xl font-bold">{profile?.name || "User"}</h2>
                                        <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium capitalize">
                                            {profile?.plan || "Free"}
                                        </span>
                                    </div>
                                    <p className="text-muted-foreground text-sm">
                                        {user?.email}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Stats - Simplified */}
                    {stats && (
                        <div className="grid grid-cols-4 gap-3">
                            <Card variant="default" padding="sm">
                                <CardContent className="text-center p-4">
                                    <p className="text-2xl font-bold">{stats.imagesGenerated}</p>
                                    <p className="text-xs text-muted-foreground">Images</p>
                                </CardContent>
                            </Card>
                            <Card variant="default" padding="sm">
                                <CardContent className="text-center p-4">
                                    <p className="text-2xl font-bold">{stats.videosCreated}</p>
                                    <p className="text-xs text-muted-foreground">Videos</p>
                                </CardContent>
                            </Card>
                            <Card variant="default" padding="sm">
                                <CardContent className="text-center p-4">
                                    <p className="text-2xl font-bold">{stats.tokensUsed >= 1000 ? `${(stats.tokensUsed / 1000).toFixed(1)}K` : stats.tokensUsed}</p>
                                    <p className="text-xs text-muted-foreground">Used</p>
                                </CardContent>
                            </Card>
                            <Card variant="default" padding="sm">
                                <CardContent className="text-center p-4">
                                    <p className="text-2xl font-bold">{stats.tokensRemaining >= 1000 ? `${(stats.tokensRemaining / 1000).toFixed(1)}K` : stats.tokensRemaining}</p>
                                    <p className="text-xs text-muted-foreground">Left</p>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* Token Usage Bar */}
                    {stats && (
                        <Card variant="glass">
                            <CardHeader>
                                <CardTitle className="text-base">Token Usage</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Used this month</span>
                                        <span className="font-medium">
                                            {stats.tokensUsed.toLocaleString()} / {stats.tokensTotal.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="h-3 rounded-full bg-surface-2 overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-primary"
                                            style={{ width: `${(stats.tokensUsed / stats.tokensTotal) * 100}%` }}
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Resets monthly
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Account Info */}
                    <Card variant="glass">
                        <CardHeader>
                            <CardTitle className="text-base">Account</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between py-3 border-b border-border">
                                <span className="text-muted-foreground">Member since</span>
                                <span>
                                    {profile?.created_at
                                        ? new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
                                        : "-"
                                    }
                                </span>
                            </div>
                            <div className="flex items-center justify-between py-3 border-b border-border">
                                <span className="text-muted-foreground">Current plan</span>
                                <div className="flex items-center gap-2">
                                    <span className="capitalize">{profile?.plan || "Free"}</span>
                                    <Button variant="ghost" size="sm" onClick={() => router.push("/pricing")}>
                                        Upgrade →
                                    </Button>
                                </div>
                            </div>
                            <div className="flex items-center justify-between py-3">
                                <span className="text-muted-foreground">Payment sync</span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleSyncPayments}
                                    disabled={syncing}
                                >
                                    {syncing ? "Syncing..." : "Sync Payments"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Logout */}
                    <div className="flex justify-end">
                        <Button onClick={handleLogout} variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                            Sign Out
                        </Button>
                    </div>
                </div>
            </main>
        </div>
    );
}
