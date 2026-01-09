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

  // Show landing page when not logged in - Neo-Wayang Bold Dark Style (Option B)
  if (!user) {
    return (
      <div className="min-h-screen w-full bg-[#0a0a0a] text-white overflow-hidden selection:bg-[#c2410c] selection:text-white relative noise-overlay">

        {/* Gunungan pattern background */}
        <div className="fixed inset-0 gunungan-pattern opacity-30 pointer-events-none" />

        {/* Dramatic copper gradient accent */}
        <div className="fixed top-0 right-0 w-[60%] h-[70%] pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-bl from-[#c2410c]/20 via-transparent to-transparent" />
        </div>

        {/* Minimal Header - Icon Only */}
        <header className="fixed top-0 left-0 right-0 z-50 px-6 md:px-12 py-6">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <div className="flex items-center gap-3 text-[#c2410c]">
              <div className="w-12 h-12 border-2 border-[#c2410c] flex items-center justify-center animate-border-dance">
                <Icon icon="mingcute:squirrel-fill" className="w-6 h-6" />
              </div>
            </div>

            {/* Login */}
            <Link
              href="/login"
              className="group flex items-center gap-3 text-white/60 hover:text-white transition-colors"
            >
              <span className="font-grotesque text-sm tracking-wider">MASUK</span>
              <div className="w-10 h-10 border border-white/20 flex items-center justify-center group-hover:border-[#c2410c] group-hover:bg-[#c2410c] transition-all">
                <Icon icon="mingcute:arrow-right-line" className="w-5 h-5" />
              </div>
            </Link>
          </div>
        </header>

        {/* Main Content */}
        <main className="min-h-screen flex items-center relative">
          <div className="w-full max-w-[1800px] mx-auto px-6 md:px-12 lg:px-20 py-24 md:py-0">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">

              {/* Left - Giant Typography */}
              <div className="relative z-10">
                {/* Pre-title */}
                <div className="flex items-center gap-4 mb-6 animate-dramatic-enter" style={{ animationDelay: '0.1s' }}>
                  <div className="w-12 h-[2px] bg-[#c2410c]" />
                  <span className="font-grotesque text-xs tracking-[0.4em] text-[#c2410c] uppercase">
                    AI Generatif Indonesia
                  </span>
                </div>

                {/* Main Title - Stacked Vertical */}
                <div className="space-y-0">
                  <h1 className="animate-dramatic-enter" style={{ animationDelay: '0.2s' }}>
                    <span className="block font-wayang text-[20vw] md:text-[15vw] lg:text-[12vw] leading-[0.85] text-white tracking-tight">
                      SQUIRR
                    </span>
                  </h1>
                  <h1 className="animate-dramatic-enter" style={{ animationDelay: '0.3s' }}>
                    <span className="block font-wayang text-[20vw] md:text-[15vw] lg:text-[12vw] leading-[0.85] text-stroke text-[#c2410c] tracking-tight glitch-hover">
                      AI
                    </span>
                  </h1>
                </div>

                {/* Tagline */}
                <p className="mt-8 md:mt-12 font-grotesque text-xl md:text-2xl text-white/50 max-w-md leading-relaxed animate-dramatic-enter" style={{ animationDelay: '0.5s' }}>
                  Wujudkan <span className="text-[#c2410c] font-semibold">imajinasi Nusantara</span> dalam hitungan detik.
                  Visual batik, wayang, hingga arsitektur tradisional.
                </p>

                {/* CTA Row */}
                <div className="mt-10 md:mt-14 flex flex-col sm:flex-row items-start gap-4 animate-dramatic-enter" style={{ animationDelay: '0.6s' }}>
                  <Link
                    href="/register"
                    className="group relative corner-accents text-[#c2410c] px-10 py-5 bg-[#c2410c] text-white font-wayang text-xl tracking-wider overflow-hidden transition-all hover:scale-105"
                  >
                    <span className="relative z-10 flex items-center gap-3">
                      MULAI SEKARANG
                      <Icon icon="mingcute:arrow-right-fill" className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
                    </span>
                  </Link>
                </div>

                {/* Feature pills */}
                <div className="mt-12 md:mt-16 flex flex-wrap gap-3 animate-dramatic-enter" style={{ animationDelay: '0.7s' }}>
                  {['BATIK', 'WAYANG', 'TENUN', 'NUSANTARA'].map((tag, i) => (
                    <span
                      key={tag}
                      className="px-4 py-2 border border-white/10 text-white/40 font-grotesque text-xs tracking-widest hover:border-[#c2410c] hover:text-[#c2410c] transition-all cursor-default"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Right - Mascot with dramatic treatment */}
              <div className="relative flex items-center justify-center lg:justify-end">
                {/* Rotating geometric ring */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-[400px] h-[400px] md:w-[500px] md:h-[500px] lg:w-[600px] lg:h-[600px] border border-[#c2410c]/20 rounded-full animate-rotate-slow" />
                  <div className="absolute w-[350px] h-[350px] md:w-[450px] md:h-[450px] lg:w-[550px] lg:h-[550px] border border-white/5 rounded-full animate-rotate-slow" style={{ animationDirection: 'reverse', animationDuration: '40s' }} />
                </div>

                {/* Mascot */}
                <div className="relative z-10 w-[280px] md:w-[380px] lg:w-[450px] animate-dramatic-enter" style={{ animationDelay: '0.4s' }}>
                  {/* Copper glow behind mascot */}
                  <div className="absolute inset-0 bg-[#c2410c]/30 blur-[80px] rounded-full animate-breathe" />

                  <div className="relative animate-breathe">
                    <img
                      src="/maskot.png"
                      alt="SquirrAI"
                      className="w-full h-auto wayang-shadow"
                    />
                  </div>

                  {/* Floating stats */}
                  <div className="absolute -left-6 md:-left-12 top-1/4 bg-[#0a0a0a] border border-[#c2410c]/30 p-4 md:p-5 animate-dramatic-enter" style={{ animationDelay: '0.8s' }}>
                    <div className="font-wayang text-3xl md:text-4xl text-[#c2410c]">10K+</div>
                    <div className="font-grotesque text-xs text-white/40 tracking-wider mt-1">KREATOR</div>
                  </div>

                  <div className="absolute -right-4 md:-right-8 bottom-1/3 bg-[#c2410c] p-4 md:p-5 animate-dramatic-enter" style={{ animationDelay: '0.9s' }}>
                    <div className="font-wayang text-3xl md:text-4xl text-white">50K+</div>
                    <div className="font-grotesque text-xs text-white/70 tracking-wider mt-1">KREASI</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Bottom bar */}
        <footer className="fixed bottom-0 left-0 right-0 border-t border-white/5 bg-[#0a0a0a]/80 backdrop-blur-sm">
          <div className="px-6 md:px-12 py-4 flex justify-between items-center">
            <div className="flex items-center gap-6">
              <span className="font-grotesque text-xs text-white/30 tracking-wider hidden md:block">© 2024 SQUIRRAI</span>
            </div>

            <div className="flex items-center gap-2">
              {['GAMBAR', 'VIDEO', 'ANIMASI'].map((item, i) => (
                <span key={item} className="flex items-center gap-2 font-grotesque text-xs text-white/30 tracking-wider">
                  {i > 0 && <span className="text-[#c2410c]">◆</span>}
                  {item}
                </span>
              ))}
            </div>

            <div className="hidden md:flex items-center gap-4 text-white/30">
              <span className="font-grotesque text-xs tracking-wider">NUSANTARA EDITION</span>
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
