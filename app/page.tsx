"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { ImageGenerator } from "@/components/image-generator";
import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function Home() {
  const [activeView, setActiveView] = useState<"dashboard" | "create">("dashboard");

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground overflow-x-hidden selection:bg-primary/30 font-sans">
      {/* Navigation - Floating Dock Style */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative w-full pl-0 md:pl-24 pb-24 md:pb-0 transition-all duration-500">
        
        {activeView === "dashboard" ? (
          <div className="p-6 md:p-10 max-w-7xl mx-auto w-full space-y-8 animate-fade-in">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-2">
                  Hello, <span className="text-primary">Creator!</span> 👋
                </h1>
                <p className="text-muted-foreground text-lg">What will you create with SquirrAI today?</p>
              </div>
              <div className="flex items-center gap-3">
                 <div className="px-4 py-2 rounded-full bg-surface-2 border border-border flex items-center gap-2 text-sm font-medium">
                    <Icon icon="ph:sparkle-fill" className="text-primary" />
                    <span>Pro Plan Active</span>
                 </div>
              </div>
            </div>

            {/* Bento Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 auto-rows-[180px]">
              
              {/* Main Action: Create Image */}
              <div 
                onClick={() => setActiveView("create")}
                className="group col-span-1 md:col-span-2 row-span-2 relative overflow-hidden rounded-[2.5rem] bg-primary text-primary-foreground p-8 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-xl"
              >
                <div className="absolute -right-8 -bottom-8 w-64 h-64 opacity-90 group-hover:scale-110 transition-transform duration-500">
                   <img src="/mascot.png" alt="SquirrAI Mascot" className="w-full h-full object-contain drop-shadow-2xl" />
                </div>
                <div className="relative z-10 h-full flex flex-col justify-between">
                  <div className="p-3 bg-black/10 w-fit rounded-2xl backdrop-blur-sm">
                    <Icon icon="ph:image-square-fill" className="w-8 h-8" />
                  </div>
                  <div className="max-w-[60%]">
                    <h2 className="text-3xl font-bold mb-2">Generate Images</h2>
                    <p className="opacity-90 text-lg">Create cute & amazing visuals with our AI.</p>
                  </div>
                  <div className="flex items-center gap-2 font-bold mt-4 group-hover:translate-x-2 transition-transform">
                    Start Creating <Icon icon="ph:arrow-right-bold" />
                  </div>
                </div>
              </div>

              {/* Secondary Action: Video */}
              <Link href="/videos" className="group col-span-1 md:col-span-1 row-span-2 relative overflow-hidden rounded-[2.5rem] bg-surface-2 border border-border p-6 transition-all hover:scale-[1.02] hover:border-primary/50">
                 <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:opacity-20 transition-opacity">
                   <Icon icon="ph:film-strip-fill" className="w-40 h-40 -rotate-12" />
                </div>
                <div className="relative z-10 h-full flex flex-col justify-between">
                   <div className="p-3 bg-surface-3 w-fit rounded-2xl">
                    <Icon icon="ph:video-fill" className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-1">AI Video</h3>
                    <p className="text-muted-foreground text-sm">Animate your stories.</p>
                  </div>
                </div>
              </Link>

              {/* Stats / Credits */}
              <div className="col-span-1 row-span-1 rounded-[2.5rem] bg-surface-1 border border-border p-6 flex flex-col justify-between group hover:border-primary/30 transition-colors">
                 <div className="flex justify-between items-start">
                    <div className="p-2 bg-surface-2 rounded-xl">
                        <Icon icon="ph:coins-fill" className="w-5 h-5 text-yellow-400" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground bg-surface-2 px-2 py-1 rounded-full">Refills in 2d</span>
                 </div>
                 <div>
                    <div className="text-3xl font-bold">850</div>
                    <div className="text-sm text-muted-foreground">Credits left</div>
                 </div>
              </div>

              {/* Gallery Preview */}
              <Link href="/gallery" className="col-span-1 row-span-1 rounded-[2.5rem] bg-surface-1 border border-border p-1 overflow-hidden group relative">
                 <div className="absolute inset-0 bg-black/60 z-10 flex items-end p-6">
                    <span className="font-bold text-white group-hover:translate-y-[-4px] transition-transform">Your Gallery</span>
                 </div>
                 <img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop" className="w-full h-full object-cover rounded-[2.2rem] opacity-60 group-hover:opacity-80 transition-opacity group-hover:scale-110 duration-500" alt="Gallery" />
              </Link>

              {/* Community / Explore */}
              <div className="col-span-1 md:col-span-2 lg:col-span-1 row-span-1 rounded-[2.5rem] bg-surface-2 border border-white/5 p-6 flex items-center justify-between group cursor-pointer hover:brightness-110 transition-all">
                 <div>
                    <h3 className="font-bold text-lg">Community</h3>
                    <p className="text-xs text-muted-foreground">Explore trending styles</p>
                 </div>
                 <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center group-hover:rotate-45 transition-transform">
                    <Icon icon="ph:compass-fill" className="w-6 h-6" />
                 </div>
              </div>

               {/* Recent Activity List */}
               <div className="col-span-1 md:col-span-3 row-span-1 rounded-[2.5rem] bg-surface-1 border border-border p-6 flex items-center gap-4 overflow-x-auto hide-scrollbar">
                  <div className="shrink-0 text-sm font-bold text-muted-foreground w-24">Recent<br/>Creations</div>
                  {[1,2,3,4,5].map((i) => (
                      <div key={i} className="w-16 h-16 rounded-2xl bg-surface-2 shrink-0 border border-white/5 hover:border-primary/50 transition-colors cursor-pointer" />
                  ))}
                  <div className="w-12 h-12 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center shrink-0 text-muted-foreground hover:text-primary hover:border-primary transition-colors cursor-pointer">
                      <Icon icon="ph:plus" />
                  </div>
               </div>

            </div>

          </div>
        ) : (
          <div className="h-full flex flex-col">
             <div className="px-6 pt-4">
                <button 
                    onClick={() => setActiveView("dashboard")}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                    <Icon icon="ph:arrow-left" /> Back to Dashboard
                </button>
             </div>
             <div className="flex-1">
                <ImageGenerator />
             </div>
          </div>
        )}
      </main>
    </div>
  );
}
