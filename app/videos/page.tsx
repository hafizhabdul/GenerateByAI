"use client";

import { Sidebar } from "@/components/sidebar";
import { VideoGenerator } from "@/components/video-generator";

export default function VideosPage() {
    return (
        <div className="flex min-h-screen min-h-[100dvh] w-full bg-background text-foreground">
            <Sidebar />

            <main className="flex-1 pl-0 md:pl-28 pb-20 md:pb-0">
                <VideoGenerator />
            </main>
        </div>
    );
}
