"use client";

import { Sidebar } from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { User, Mail, Calendar, Image as ImageIcon, Film, Zap, Crown, ExternalLink, LogOut } from "lucide-react";

// Mock user data
const userData = {
    name: "John Doe",
    email: "john.doe@example.com",
    plan: "Pro",
    joinedDate: "December 2024",
    avatar: null,
    stats: {
        imagesGenerated: 1247,
        videosCreated: 89,
        tokensUsed: 45200,
        tokensRemaining: 54800,
    },
};

export default function ProfilePage() {
    const { showToast } = useToast();

    const handleLogout = () => {
        showToast("Logged out successfully", "info");
    };

    return (
        <div className="flex min-h-screen min-h-[100dvh] w-full bg-background text-foreground">
            <Sidebar />

            <main className="flex-1 pl-0 md:pl-28 pb-20 md:pb-0">
                <div className="container-fluid py-6 md:py-10 space-y-8 max-w-3xl">
                    {/* Header */}
                    <div className="space-y-2">
                        <h1 className="font-bold tracking-tight gradient-text" style={{ fontSize: "var(--text-4xl)" }}>
                            Profile
                        </h1>
                        <p className="text-muted-foreground" style={{ fontSize: "var(--text-base)" }}>
                            Manage your account and view usage stats
                        </p>
                    </div>

                    {/* Profile Card */}
                    <Card variant="glass" className="overflow-hidden">
                        <div className="h-24 bg-gradient-to-r from-primary via-purple-500 to-indigo-600" />
                        <CardContent className="pt-0 pb-6 px-6">
                            <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12">
                                {/* Avatar */}
                                <div className="w-24 h-24 rounded-2xl bg-surface-2 border-4 border-card flex items-center justify-center overflow-hidden">
                                    {userData.avatar ? (
                                        <img src={userData.avatar} alt={userData.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <User className="w-10 h-10 text-muted-foreground" />
                                    )}
                                </div>

                                <div className="flex-1 space-y-1">
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-xl font-bold">{userData.name}</h2>
                                        <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center gap-1">
                                            <Crown className="w-3 h-3" />
                                            {userData.plan}
                                        </span>
                                    </div>
                                    <p className="text-muted-foreground text-sm flex items-center gap-2">
                                        <Mail className="w-4 h-4" />
                                        {userData.email}
                                    </p>
                                </div>

                                <Button variant="secondary" size="sm">
                                    Edit Profile
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card variant="default" padding="sm">
                            <CardContent className="flex flex-col items-center text-center p-4">
                                <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-400 mb-3">
                                    <ImageIcon className="w-5 h-5" />
                                </div>
                                <p className="text-2xl font-bold">{userData.stats.imagesGenerated.toLocaleString()}</p>
                                <p className="text-xs text-muted-foreground">Images</p>
                            </CardContent>
                        </Card>
                        <Card variant="default" padding="sm">
                            <CardContent className="flex flex-col items-center text-center p-4">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 mb-3">
                                    <Film className="w-5 h-5" />
                                </div>
                                <p className="text-2xl font-bold">{userData.stats.videosCreated}</p>
                                <p className="text-xs text-muted-foreground">Videos</p>
                            </CardContent>
                        </Card>
                        <Card variant="default" padding="sm">
                            <CardContent className="flex flex-col items-center text-center p-4">
                                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 mb-3">
                                    <Zap className="w-5 h-5" />
                                </div>
                                <p className="text-2xl font-bold">{(userData.stats.tokensUsed / 1000).toFixed(1)}K</p>
                                <p className="text-xs text-muted-foreground">Tokens Used</p>
                            </CardContent>
                        </Card>
                        <Card variant="default" padding="sm">
                            <CardContent className="flex flex-col items-center text-center p-4">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-3">
                                    <Zap className="w-5 h-5" />
                                </div>
                                <p className="text-2xl font-bold">{(userData.stats.tokensRemaining / 1000).toFixed(1)}K</p>
                                <p className="text-xs text-muted-foreground">Remaining</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Token Usage Bar */}
                    <Card variant="glass">
                        <CardHeader>
                            <CardTitle className="text-base">Token Usage</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Used this month</span>
                                    <span className="font-medium">{userData.stats.tokensUsed.toLocaleString()} / {(userData.stats.tokensUsed + userData.stats.tokensRemaining).toLocaleString()}</span>
                                </div>
                                <div className="h-3 rounded-full bg-surface-2 overflow-hidden">
                                    <div
                                        className="h-full rounded-full bg-gradient-to-r from-primary to-purple-500"
                                        style={{ width: `${(userData.stats.tokensUsed / (userData.stats.tokensUsed + userData.stats.tokensRemaining)) * 100}%` }}
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">Resets on January 1, 2025</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Account Info */}
                    <Card variant="glass">
                        <CardHeader>
                            <CardTitle className="text-base">Account Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between py-3 border-b border-border">
                                <div className="flex items-center gap-3">
                                    <Calendar className="w-5 h-5 text-muted-foreground" />
                                    <span className="text-muted-foreground">Member since</span>
                                </div>
                                <span>{userData.joinedDate}</span>
                            </div>
                            <div className="flex items-center justify-between py-3 border-b border-border">
                                <div className="flex items-center gap-3">
                                    <Crown className="w-5 h-5 text-muted-foreground" />
                                    <span className="text-muted-foreground">Current plan</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span>{userData.plan}</span>
                                    <Button variant="ghost" size="sm">
                                        Upgrade <ExternalLink className="w-3 h-3 ml-1" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Logout */}
                    <div className="flex justify-end">
                        <Button onClick={handleLogout} variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                            <LogOut className="w-4 h-4" />
                            Sign Out
                        </Button>
                    </div>
                </div>
            </main>
        </div>
    );
}
