"use client";

import { Suspense } from "react";
import { Sidebar } from "@/components/sidebar";
import { VideoGenerator } from "@/components/video-generator";
import { MascotLoading } from "@/components/mascot";

function VideoGeneratorFallback() {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <MascotLoading
                message="🎬 Squirrel sedang mempersiapkan generator video..."
                submessage="Tunggu sebentar ya!"
            />
        </div>
    );
}

export default function VideosPage() {
    return (
        <div className="flex min-h-screen min-h-[100dvh] w-full bg-background text-foreground">
            <Sidebar />

            <main className="flex-1 pl-0 md:pl-28 pb-20 md:pb-0">
                <Suspense fallback={<VideoGeneratorFallback />}>
                    <VideoGenerator />
                </Suspense>
            </main>
        </div>
    );
}
