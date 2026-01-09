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
import { MascotLoading } from "@/components/mascot";
import { BatikPattern } from "@/components/ui/batik-pattern";

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

  // Fetch recent generations - MUST BE ABOVE EARLY RETURN
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

  // Show a clean loading state while auth is still processing
  if (authLoading) {
    return (
      <div className="flex min-h-screen w-full bg-background items-center justify-center">
        <MascotLoading
          message="🐿️ Squirrel sedang memuat dashboard..."
          submessage="Tunggu sebentar ya!"
        />
      </div>
    );
  }

  // Calculate credits
  const creditsLeft = profile ? Math.max(0, (profile.tokens_total || 0) - (profile.tokens_used || 0)) : 0;
  const planName = profile?.plan || "Free";
  // Use profile name, fallback to email's first part, then "Creator"
  const userName = profile?.name?.split(" ")[0]
    || user?.email?.split("@")[0]?.split(".")[0]?.replace(/^\w/, c => c.toUpperCase())
    || "Creator";

  // Show landing page when not logged in
  if (!user) {
    return (
      <div className="flex min-h-screen w-full bg-[#FAFAF9] text-[#1c1917] font-sans overflow-hidden selection:bg-[#c2410c] selection:text-white">

        {/* Minimal Navbar */}
        <header className="fixed top-0 left-0 right-0 p-4 md:p-6 flex justify-between items-center z-50 mix-blend-multiply">
          <div className="w-10 h-10 md:w-12 md:h-12 border border-[#1c1917]/10 rounded-xl flex items-center justify-center bg-white shadow-sm hover:rotate-3 transition-transform cursor-pointer">
            <Icon icon="mingcute:squirrel-fill" className="w-6 h-6 text-[#c2410c]" />
          </div>
          <Link
            href="/login"
            className="w-10 h-10 md:w-12 md:h-12 border border-[#1c1917]/10 rounded-xl flex items-center justify-center bg-white shadow-sm hover:scale-105 transition-transform text-[#1c1917]"
            title="Masuk"
          >
            <Icon icon="mingcute:arrow-right-line" className="w-5 h-5 md:w-6 md:h-6" />
          </Link>
        </header>

        {/* Main Content - Georgi Inspired Layout */}
        <main className="flex-1 flex flex-col items-center justify-center relative w-full px-4 pt-20 md:pt-0">

          {/* Background Elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#c2410c]/5 rounded-full blur-[100px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#ea580c]/5 rounded-full blur-[100px]" />
            <BatikPattern className="opacity-[0.03] text-[#1c1917] w-full h-full object-cover" />
          </div>

          <div className="relative z-10 flex flex-col items-center text-center">
            {/* Intro Pill */}
            <div className="mb-6 md:mb-8 animate-fade-in-down">
              <span className="px-4 py-2 rounded-full border border-[#1c1917]/5 bg-white/50 backdrop-blur-sm text-sm md:text-base font-medium text-[#57534e]">
                Halo & Selamat Datang! 👋
              </span>
            </div>

            {/* Massive Typography */}
            <h1 className="text-[18vw] md:text-[160px] lg:text-[200px] leading-[0.8] font-[800] tracking-tighter text-[#1c1917] mb-2 md:mb-6 animate-scale-in select-none">
              SquirrAI
            </h1>

            {/* Subtitle */}
            <p className="text-xl md:text-3xl font-medium text-[#57534e] max-w-2xl animate-fade-in-up delay-100 px-4">
              Asisten kreatif <span className="text-[#c2410c] underline decoration-wavy decoration-2 decoration-[#c2410c]/30">Nusantara</span> paling estetik.
            </p>

            {/* Interactive Mascot Area */}
            <div className="relative mt-12 md:mt-16 w-full max-w-3xl flex items-center justify-center">

              {/* Floating Action: Create Image (Left) */}
              <Link
                href="/register"
                className="absolute left-[5%] md:left-[10%] top-[20%] w-24 h-24 md:w-32 md:h-32 bg-[#c2410c] text-white rounded-[2rem] flex flex-col items-center justify-center gap-1 shadow-xl rotate-[-12deg] hover:rotate-[-6deg] hover:scale-110 active:scale-95 transition-all z-20 group animate-tilt hidden sm:flex"
              >
                <Icon icon="mingcute:pic-fill" className="w-8 h-8 md:w-10 md:h-10 opacity-90" />
                <span className="font-bold text-sm md:text-base">Gambar</span>
              </Link>

              {/* Main Mascot Center */}
              <div className="w-64 h-64 md:w-96 md:h-96 relative z-10 transition-transform hover:scale-105 duration-500">
                <div className="absolute inset-0 bg-[#c2410c] blur-[60px] opacity-20 rounded-full animate-pulse"></div>
                <img
                  src="/maskot.png"
                  alt="SquirrAI Mascot"
                  className="w-full h-full object-contain drop-shadow-2xl animate-wobble"
                />
              </div>

              {/* Floating Action: Create Video (Right) */}
              <Link
                href="/register"
                className="absolute right-[5%] md:right-[10%] top-[30%] w-20 h-20 md:w-28 md:h-28 bg-[#f5f5f4] border-2 border-[#1c1917]/10 text-[#1c1917] rounded-[2rem] flex flex-col items-center justify-center gap-1 shadow-lg rotate-[12deg] hover:rotate-[6deg] hover:scale-110 active:scale-95 transition-all z-20 group animate-tilt hidden sm:flex"
              >
                <Icon icon="mingcute:movie-fill" className="w-6 h-6 md:w-8 md:h-8 text-[#c2410c]" />
                <span className="font-bold text-xs md:text-sm">Video</span>
              </Link>

              {/* Mobile CTA (replaces floating buttons on small screens) */}
              <div className="absolute -bottom-16 sm:hidden w-full px-8 pb-8">
                <Link href="/register" className="w-full py-4 bg-[#c2410c] text-white rounded-2xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all">
                  Mulai Sekarang <Icon icon="mingcute:arrow-right-fill" />
                </Link>
              </div>

            </div>
          </div>
        </main>
      </div>
    );
  }

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

              {/* Main Action: Create Image - Solid Copper */}
              <Link
                href="/?view=create&new=true"
                className="group col-span-2 row-span-2 relative overflow-hidden rounded-xl md:rounded-2xl bg-primary text-primary-foreground p-4 md:p-6 lg:p-8 cursor-pointer transition-all hover:translate-y-[-2px] border-b-4 border-primary-dark active:border-b-0 active:translate-y-0"
              >
                <BatikPattern opacity={0.2} color="white" />
                <div className="absolute -right-4 md:-right-8 -bottom-8 md:-bottom-16 w-40 md:w-56 lg:w-64 h-48 md:h-64 lg:h-72 opacity-90 group-hover:scale-105 transition-transform duration-500 overflow-hidden">
                  <img src="/maskot.png" alt="SquirrAI Mascot" className="w-full h-auto object-cover object-top drop-shadow-lg" style={{ marginBottom: '-60px' }} />
                </div>
                <div className="relative z-10 h-full flex flex-col justify-between">
                  <div className="p-2 md:p-3 bg-white/10 w-fit rounded-lg backdrop-blur-sm">
                    <Icon icon="mingcute:ai-fill" className="w-6 h-6 md:w-8 md:h-8" />
                  </div>
                  <div className="max-w-[65%] md:max-w-[60%]">
                    <h2 className="text-xl md:text-2xl lg:text-3xl font-bold mb-1 md:mb-2 text-white">Buat Gambar</h2>
                    <p className="opacity-90 text-sm md:text-base lg:text-lg text-white/90">Visual nusantara & modern dalam sekejap.</p>
                  </div>
                  <div className="flex items-center gap-2 font-bold mt-2 md:mt-4 text-sm md:text-base group-hover:gap-3 transition-all text-white">
                    Mulai Sekarang <Icon icon="mingcute:arrow-right-fill" />
                  </div>
                </div>
              </Link>

              {/* Secondary Action: Video - Solid Surface */}
              <Link href="/videos?new=true" className="group col-span-1 row-span-2 relative overflow-hidden rounded-xl md:rounded-2xl bg-surface-2 border border-border p-4 md:p-6 transition-all hover:border-primary/50">
                <div className="relative z-10 h-full flex flex-col justify-between">
                  <div className="p-2 md:p-3 bg-surface-3 w-fit rounded-lg">
                    <Icon icon="mingcute:video-fill" className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg md:text-xl font-bold mb-1">Video AI</h3>
                    <p className="text-muted-foreground text-xs md:text-sm">Animasi dari gambar.</p>
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
                    <div className="absolute inset-0 bg-black/50 z-10 flex items-end p-3 md:p-4 lg:p-6">
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

              {/* Community - Minimalist Coming Soon */}
              <div className="col-span-2 md:col-span-1 row-span-1 rounded-2xl md:rounded-[2rem] lg:rounded-[2.5rem] bg-surface-1 border border-white/5 p-4 md:p-5 lg:p-7 flex items-center justify-between group hover:border-white/10 transition-all cursor-default overflow-hidden relative">
                <div className="relative z-10">
                  <h3 className="font-bold text-sm md:text-base lg:text-lg flex items-center gap-2.5 mb-1">
                    Community
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-muted-foreground/70 font-bold uppercase tracking-[0.05em]">Soon</span>
                  </h3>
                  <p className="text-[10px] md:text-xs text-muted-foreground/60 font-medium">Coming to SquirrAI very soon.</p>
                </div>
                <div className="w-11 h-11 md:w-13 md:h-13 rounded-full bg-white/5 border border-white/10 flex items-center justify-center opacity-30 grayscale group-hover:opacity-40 transition-opacity">
                  <Icon icon="mingcute:planet-fill" className="w-6 h-6 md:w-7 md:h-7" />
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
                  recentGenerations.map((gen) => {
                    const isVideo = gen.type === "video";
                    const thumbnail = gen.thumbnail_url || (isVideo ? null : gen.file_url);

                    return (
                      <Link
                        key={gen.id}
                        href={isVideo ? "/videos" : "/gallery"}
                        className="w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 rounded-full bg-surface-2 shrink-0 border border-white/5 hover:border-primary/50 transition-all cursor-pointer overflow-hidden relative group"
                      >
                        {thumbnail ? (
                          <img
                            src={thumbnail}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).classList.add('hidden');
                              (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        ) : null}

                        {/* Fallback Icon */}
                        <div className={cn(
                          "absolute inset-0 flex items-center justify-center bg-surface-3",
                          thumbnail ? "hidden" : ""
                        )}>
                          <Icon
                            icon={isVideo ? "mingcute:movie-line" : "mingcute:pic-line"}
                            className="w-5 h-5 md:w-6 md:h-6 text-muted-foreground/30"
                          />
                        </div>

                        {/* Play Indicator for Video */}
                        {isVideo && (
                          <div className="absolute inset-0 bg-black/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Icon icon="mingcute:play-fill" className="w-5 h-5 md:w-6 md:h-6 text-white/80" />
                          </div>
                        )}
                      </Link>
                    );
                  })
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
            <div className="flex-1">
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
