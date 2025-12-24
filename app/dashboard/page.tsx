import { Sidebar } from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Sparkles, Image as ImageIcon, Film, Zap, TrendingUp, Clock, Star } from "lucide-react";
import Link from "next/link";

// Mock data - in real app, this would come from API/database
const stats = [
    { label: "Images Generated", value: "1,247", icon: ImageIcon, trend: "+12%" },
    { label: "Videos Created", value: "89", icon: Film, trend: "+5%" },
    { label: "Tokens Used", value: "45.2K", icon: Zap, trend: "-3%" },
    { label: "Saved to Gallery", value: "328", icon: Star, trend: "+8%" },
];

const recentActivity = [
    { type: "image", prompt: "A futuristic cityscape at sunset with flying cars", time: "2 min ago" },
    { type: "image", prompt: "Portrait of a mystical forest spirit", time: "15 min ago" },
    { type: "video", prompt: "Ocean waves crashing on rocks", time: "1 hour ago" },
    { type: "image", prompt: "Abstract geometric patterns in neon colors", time: "3 hours ago" },
];

const quickActions = [
    { label: "Generate Image", href: "/", icon: ImageIcon, color: "from-violet-500 to-purple-600" },
    { label: "Create Video", href: "/?mode=video", icon: Film, color: "from-blue-500 to-cyan-600" },
    { label: "View Gallery", href: "/gallery", icon: Star, color: "from-amber-500 to-orange-600" },
];

export default function DashboardPage() {
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
                            Welcome back! Here&apos;s your creative overview.
                        </p>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {stats.map((stat) => (
                            <Card key={stat.label} variant="glass" hover>
                                <CardContent className="p-4 md:p-6">
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-2">
                                            <p className="text-muted-foreground text-xs md:text-sm">{stat.label}</p>
                                            <p className="text-2xl md:text-3xl font-bold">{stat.value}</p>
                                        </div>
                                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                            <stat.icon className="w-5 h-5" />
                                        </div>
                                    </div>
                                    <div className="mt-3 flex items-center gap-1 text-xs">
                                        <TrendingUp className="w-3 h-3 text-success" />
                                        <span className="text-success">{stat.trend}</span>
                                        <span className="text-muted-foreground">vs last week</span>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

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
                                {recentActivity.map((activity, i) => (
                                    <div key={i} className="p-4 flex items-center gap-4 hover:bg-white/5 transition-colors">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${activity.type === "image" ? "bg-violet-500/10 text-violet-400" : "bg-blue-500/10 text-blue-400"
                                            }`}>
                                            {activity.type === "image" ? <ImageIcon className="w-5 h-5" /> : <Film className="w-5 h-5" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm truncate">{activity.prompt}</p>
                                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                                <Clock className="w-3 h-3" />
                                                {activity.time}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
}
