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

  // Show landing page when not logged in - Editorial Bold Style (No Scroll)
  if (!user) {
    return (
      <div className="h-screen w-full bg-gradient-to-b from-[#c2410c] via-[#9a3412] to-[#1c1917] text-white overflow-hidden selection:bg-white selection:text-[#c2410c] relative">

        {/* Large Background Typography */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
          <h1 className="font-wayang text-[40vw] md:text-[30vw] lg:text-[25vw] font-black tracking-tighter text-black/10 select-none whitespace-nowrap leading-none">
            SQUIRRAI
          </h1>
        </div>

        {/* Subtle Noise Texture */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.04] z-[60]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
        }} />

        {/* Minimal Navigation */}
        <header className="absolute top-0 left-0 right-0 z-50 px-6 md:px-10 lg:px-16 py-4 md:py-6">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <Icon icon="mingcute:squirrel-fill" className="w-6 h-6 md:w-7 md:h-7 text-white" />
              <span className="font-wayang text-lg md:text-xl font-semibold tracking-tight text-white">squirrai</span>
            </div>

            {/* Nav Links */}
            <nav className="hidden md:flex items-center gap-6 lg:gap-10">
              <Link href="/gallery" className="font-grotesque text-sm text-white/70 hover:text-white transition-colors">gallery</Link>
              <Link href="/pricing" className="font-grotesque text-sm text-white/70 hover:text-white transition-colors">pricing</Link>
              <Link href="/login" className="font-grotesque text-sm text-white/70 hover:text-white transition-colors">login</Link>
            </nav>

            {/* Mobile Menu */}
            <button className="md:hidden w-9 h-9 flex items-center justify-center text-white">
              <Icon icon="mingcute:menu-fill" className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Main Content - Centered & Compact */}
        <main className="h-full flex flex-col items-center justify-center relative z-10 px-6">

          <div className="flex flex-col items-center text-center">

            {/* Pre-title */}
            <p className="font-heritage italic text-base md:text-lg lg:text-xl text-white/60 mb-2 md:mb-3 animate-fade-in-down">
              Generative AI Platform
            </p>

            {/* Main Headline */}
            <h1 className="font-heritage text-[10vw] md:text-[7vw] lg:text-[5vw] font-medium leading-[0.95] tracking-tight text-white mb-4 md:mb-6 animate-scale-in">
              Imajinasi<br />
              <span className="italic">Nusantara</span>
            </h1>

            {/* Mascot - Clickable */}
            <Link href="/login" className="relative my-4 md:my-6 animate-fade-in-up cursor-pointer group">
              <div className="absolute inset-0 bg-white/20 blur-[60px] rounded-full scale-75 group-hover:bg-white/30 transition-all" />
              <img
                src="/maskot.png"
                alt="SquirrAI - Click to Login"
                className="relative w-[140px] md:w-[200px] lg:w-[260px] h-auto object-contain drop-shadow-[0_15px_40px_rgba(0,0,0,0.4)] group-hover:scale-110 transition-transform duration-500"
              />
            </Link>

            {/* Tagline - Compact */}
            <p className="font-grotesque text-xs md:text-sm text-white/60 max-w-md leading-relaxed tracking-wide uppercase mb-6 md:mb-8 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              Visual batik, wayang, arsitektur tradisional.<br className="hidden sm:block" />
              Dibuat oleh AI untuk kreator Indonesia.
            </p>


          </div>
        </main>

        {/* Bottom Strip - Compact */}
        <footer className="absolute bottom-0 left-0 right-0 z-40 px-6 md:px-10 lg:px-16 py-4 md:py-5">
          <div className="flex justify-between items-end">
            {/* Left */}
            <div className="hidden md:flex flex-col gap-0.5">
              <span className="font-grotesque text-[9px] text-white/40 uppercase tracking-[0.15em]">Fitur</span>
              <span className="font-grotesque text-[11px] text-white/50">Image • Video • Style</span>
            </div>

            {/* Right */}
            <div className="flex flex-col items-end gap-0.5">
              <span className="font-grotesque text-[9px] text-white/40 uppercase tracking-[0.15em]">Platform</span>
              <span className="font-grotesque text-[11px] text-white/50">© 2026 SquirrAI</span>
            </div>
          </div>
        </footer>
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
