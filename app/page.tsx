"use client";

import { useState, useEffect, Suspense } from "react";
import { Sidebar } from "@/components/sidebar";
import { ImageGenerator } from "@/components/image-generator";
import { Icon } from "@iconify/react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import type { Generation } from "@/lib/supabase/types";

function HomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialView = searchParams.get("view") === "create" ? "create" : "dashboard";
  const [activeView, setActiveView] = useState<"dashboard" | "create">(initialView);

  const handleBackToDashboard = () => {
    router.push("/");
  };

  // Sync state with URL params - only when URL changes externally
  useEffect(() => {
    const view = searchParams.get("view");
    if (view === "create") {
      setActiveView("create");
    } else if (view === null || view === "") {
      setActiveView("dashboard");
    }
  }, [searchParams]);
  const [recentGenerations, setRecentGenerations] = useState<Generation[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const { user, profile, loading: authLoading } = useAuth();

  // Fetch recent generations
  useEffect(() => {
    const fetchRecent = async () => {
      if (!user) {
        setLoadingRecent(false);
        return;
      }
      try {
        const res = await fetch("/api/generations?limit=5");
        if (res.ok) {
          const data = await res.json();
          setRecentGenerations(data.generations || []);
        }
      } catch (err) {
        console.error("Failed to fetch recent:", err);
      } finally {
        setLoadingRecent(false);
      }
    };
    fetchRecent();
  }, [user]);

  // Calculate credits
  const creditsLeft = profile ? Math.max(0, (profile.tokens_total || 0) - (profile.tokens_used || 0)) : 0;
  const planName = profile?.plan || "Free";
  const userName = profile?.name?.split(" ")[0] || "Creator";

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground overflow-x-hidden selection:bg-primary/30 font-sans">
      {/* Navigation - Floating Dock Style */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative w-full pl-0 md:pl-28 pb-20 md:pb-0 transition-all duration-500">

        {activeView === "dashboard" ? (
          <div className="p-4 md:p-8 lg:p-10 max-w-7xl mx-auto w-full space-y-6 md:space-y-8 animate-fade-in">

            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-2">
                  Hello, <span className="text-primary">{userName}!</span> 👋
                </h1>
                <p className="text-muted-foreground text-base md:text-lg">What will you create with SquirrAI today?</p>
              </div>
              <div className="flex items-center gap-3">
                <Link href="/pricing" className="px-4 py-2 rounded-full bg-surface-2 border border-border flex items-center gap-2 text-sm font-medium hover:border-primary/50 transition-colors">
                  <Icon icon="mingcute:vip-2-fill" className="text-primary" />
                  <span>{planName} Plan</span>
                </Link>
              </div>
            </div>

            {/* Bento Grid Layout */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6 auto-rows-[140px] md:auto-rows-[160px] lg:auto-rows-[180px]">

              {/* Main Action: Create Image */}
              <Link
                href="/?view=create"
                className="group col-span-2 row-span-2 relative overflow-hidden rounded-2xl md:rounded-[2rem] lg:rounded-[2.5rem] bg-primary text-primary-foreground p-4 md:p-6 lg:p-8 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-xl"
              >
                <div className="absolute -right-4 md:-right-8 -bottom-8 md:-bottom-16 w-40 md:w-56 lg:w-64 h-48 md:h-64 lg:h-72 opacity-90 group-hover:scale-110 transition-transform duration-500 overflow-hidden">
                  <img src="/maskot.png" alt="SquirrAI Mascot" className="w-full h-auto object-cover object-top drop-shadow-2xl" style={{ marginBottom: '-60px' }} />
                </div>
                <div className="relative z-10 h-full flex flex-col justify-between">
                  <div className="p-2 md:p-3 bg-black/10 w-fit rounded-xl md:rounded-2xl backdrop-blur-sm">
                    <Icon icon="mingcute:ai-fill" className="w-6 h-6 md:w-8 md:h-8" />
                  </div>
                  <div className="max-w-[65%] md:max-w-[60%]">
                    <h2 className="text-xl md:text-2xl lg:text-3xl font-bold mb-1 md:mb-2">Generate Images</h2>
                    <p className="opacity-90 text-sm md:text-base lg:text-lg">Create cute & amazing visuals with our AI.</p>
                  </div>
                  <div className="flex items-center gap-2 font-bold mt-2 md:mt-4 text-sm md:text-base group-hover:translate-x-2 transition-transform">
                    Start Creating <Icon icon="mingcute:arrow-right-fill" />
                  </div>
                </div>
              </Link>

              {/* Secondary Action: Video */}
              <Link href="/videos" className="group col-span-1 row-span-2 relative overflow-hidden rounded-2xl md:rounded-[2rem] lg:rounded-[2.5rem] bg-surface-2 border border-border p-4 md:p-6 transition-all hover:scale-[1.02] hover:border-primary/50">
                <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Icon icon="mingcute:movie-fill" className="w-28 md:w-40 h-28 md:h-40 -rotate-12" />
                </div>
                <div className="relative z-10 h-full flex flex-col justify-between">
                  <div className="p-2 md:p-3 bg-surface-3 w-fit rounded-xl md:rounded-2xl">
                    <Icon icon="mingcute:video-fill" className="w-5 h-5 md:w-6 md:h-6 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg md:text-xl font-bold mb-1">AI Video</h3>
                    <p className="text-muted-foreground text-xs md:text-sm">Animate your stories.</p>
                  </div>
                </div>
              </Link>

              {/* Stats / Credits */}
              <Link href="/pricing" className="col-span-1 row-span-1 rounded-2xl md:rounded-[2rem] lg:rounded-[2.5rem] bg-surface-1 border border-border p-3 md:p-4 lg:p-6 flex flex-col justify-between group hover:border-primary/30 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="p-1.5 md:p-2 bg-surface-2 rounded-lg md:rounded-xl">
                    <Icon icon="mingcute:diamond-2-fill" className="w-4 h-4 md:w-5 md:h-5 text-yellow-400" />
                  </div>
                  {creditsLeft < 50 && (
                    <span className="text-[10px] md:text-xs font-medium text-red-400 bg-red-500/10 px-1.5 md:px-2 py-0.5 md:py-1 rounded-full">Low!</span>
                  )}
                </div>
                <div>
                  <div className="text-2xl md:text-3xl font-bold">{authLoading ? "..." : creditsLeft.toLocaleString()}</div>
                  <div className="text-xs md:text-sm text-muted-foreground">Credits left</div>
                </div>
              </Link>

              {/* Gallery Preview */}
              <Link href="/gallery" className="col-span-1 row-span-1 rounded-2xl md:rounded-[2rem] lg:rounded-[2.5rem] bg-surface-1 border border-border overflow-hidden group relative hover:border-primary/30 transition-colors">
                {/* Show first recent generation as thumbnail, or fallback to icon */}
                {recentGenerations.length > 0 && recentGenerations[0].file_url ? (
                  <>
                    <img src={recentGenerations[0].file_url} className="w-full h-full object-cover opacity-70 group-hover:opacity-90 group-hover:scale-110 transition-all duration-500" alt="Gallery" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10 flex items-end p-3 md:p-4 lg:p-6">
                      <span className="font-bold text-sm md:text-base text-white group-hover:translate-y-[-4px] transition-transform">Your Gallery</span>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-3 md:p-4 lg:p-6 text-center">
                    <div className="p-2 md:p-3 lg:p-4 bg-surface-2 rounded-xl md:rounded-2xl mb-2 md:mb-3 group-hover:bg-primary/10 transition-colors">
                      <Icon icon="mingcute:pic-fill" className="w-5 h-5 md:w-6 md:h-6 lg:w-8 lg:h-8 text-primary" />
                    </div>
                    <span className="font-bold text-xs md:text-sm lg:text-base text-foreground">Your Gallery</span>
                    <span className="text-[10px] md:text-xs text-muted-foreground mt-0.5 md:mt-1">View creations</span>
                  </div>
                )}
              </Link>

              {/* Community / Explore */}
              <div className="col-span-2 md:col-span-1 row-span-1 rounded-2xl md:rounded-[2rem] lg:rounded-[2.5rem] bg-surface-2 border border-white/5 p-3 md:p-4 lg:p-6 flex items-center justify-between group cursor-pointer hover:brightness-110 transition-all">
                <div>
                  <h3 className="font-bold text-sm md:text-base lg:text-lg">Community</h3>
                  <p className="text-[10px] md:text-xs text-muted-foreground">Explore trending styles</p>
                </div>
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/10 flex items-center justify-center group-hover:rotate-45 transition-transform">
                  <Icon icon="mingcute:planet-fill" className="w-5 h-5 md:w-6 md:h-6" />
                </div>
              </div>

              {/* Recent Activity List */}
              <div className="col-span-2 md:col-span-3 row-span-1 rounded-2xl md:rounded-[2rem] lg:rounded-[2.5rem] bg-surface-1 border border-border p-3 md:p-4 lg:p-6 flex items-center gap-3 md:gap-4 overflow-x-auto hide-scrollbar">
                <div className="shrink-0 text-xs md:text-sm font-bold text-muted-foreground w-16 md:w-24">Recent<br />Creations</div>
                {loadingRecent ? (
                  // Loading skeleton
                  [1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 rounded-xl md:rounded-2xl bg-surface-2 shrink-0 border border-white/5 animate-pulse" />
                  ))
                ) : recentGenerations.length > 0 ? (
                  // Show actual recent generations
                  recentGenerations.map((gen) => (
                    <Link
                      key={gen.id}
                      href="/gallery"
                      className="w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 rounded-xl md:rounded-2xl bg-surface-2 shrink-0 border border-white/5 hover:border-primary/50 transition-colors cursor-pointer overflow-hidden"
                    >
                      {gen.file_url && (
                        <img src={gen.file_url} alt="" className="w-full h-full object-cover" />
                      )}
                    </Link>
                  ))
                ) : (
                  // Empty state
                  <div className="text-xs md:text-sm text-muted-foreground/50 italic">No creations yet. Start creating!</div>
                )}
                <div
                  onClick={() => setActiveView("create")}
                  className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center shrink-0 text-muted-foreground hover:text-primary hover:border-primary transition-colors cursor-pointer"
                >
                  <Icon icon="mingcute:add-fill" />
                </div>
              </div>

            </div>

          </div>
        ) : (
          <div className="h-full flex flex-col">
            <div className="px-4 md:px-6 pt-4">
              <button
                onClick={handleBackToDashboard}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Icon icon="mingcute:arrow-left-fill" /> Back to Dashboard
              </button>
            </div>
            <div className="flex-1 md:pl-4">
              <ImageGenerator />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}
