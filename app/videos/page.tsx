import { Sidebar } from "@/components/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Film, Play, Clock, Sparkles } from "lucide-react";
import Link from "next/link";

export default function VideosPage() {
    return (
        <div className="flex min-h-screen min-h-[100dvh] w-full bg-background text-foreground">
            <Sidebar />

            <main className="flex-1 pl-0 md:pl-28 pb-20 md:pb-0">
                <div className="container-fluid py-6 md:py-10">
                    {/* Header */}
                    <div className="space-y-2 mb-8">
                        <h1 className="font-bold tracking-tight gradient-text" style={{ fontSize: "var(--text-4xl)" }}>
                            Videos
                        </h1>
                        <p className="text-muted-foreground" style={{ fontSize: "var(--text-base)" }}>
                            Create stunning AI-generated videos
                        </p>
                    </div>

                    {/* Coming Soon Hero */}
                    <Card variant="glass" className="overflow-hidden">
                        <CardContent className="p-0">
                            <div className="relative min-h-[400px] md:min-h-[500px] flex flex-col items-center justify-center text-center p-8">
                                {/* Background Animation */}
                                <div className="absolute inset-0 overflow-hidden">
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-violet-600/20 via-purple-600/20 to-indigo-600/20 rounded-full blur-[100px] animate-pulse" />
                                </div>

                                {/* Icon */}
                                <div className="relative z-10 w-24 h-24 md:w-32 md:h-32 rounded-3xl bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-600 flex items-center justify-center shadow-2xl shadow-primary/30 mb-8">
                                    <Film className="w-12 h-12 md:w-16 md:h-16 text-white" />
                                </div>

                                {/* Text */}
                                <div className="relative z-10 space-y-4 max-w-md">
                                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
                                        <Sparkles className="w-4 h-4" />
                                        Coming Soon
                                    </div>

                                    <h2 className="text-2xl md:text-3xl font-bold">AI Video Generation</h2>
                                    <p className="text-muted-foreground">
                                        Transform your ideas into captivating videos. We&apos;re working hard to bring you the most advanced AI video generation technology.
                                    </p>
                                </div>

                                {/* Features Preview */}
                                <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-4 mt-10 w-full max-w-2xl">
                                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5">
                                        <Play className="w-5 h-5 text-primary" />
                                        <span className="text-sm">Text to Video</span>
                                    </div>
                                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5">
                                        <Film className="w-5 h-5 text-primary" />
                                        <span className="text-sm">Image to Video</span>
                                    </div>
                                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5">
                                        <Clock className="w-5 h-5 text-primary" />
                                        <span className="text-sm">Up to 60s</span>
                                    </div>
                                </div>

                                {/* CTA */}
                                <div className="relative z-10 mt-8">
                                    <Link href="/">
                                        <Button variant="primary" size="lg">
                                            Generate Images Instead
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
