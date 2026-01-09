"use client";

import { Mascot, MascotWithMessage, MascotLoading } from "./mascot";

/**
 * Loading state for image/video generation
 */
export function GenerationLoading({ type = "image" }: { type?: "image" | "video" }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-8 p-8">
      <MascotLoading
        message={
          type === "image"
            ? "✨ Squirrel sedang menciptakan gambar magic..."
            : "🎬 Squirrel sedang mengubah gambar menjadi video..."
        }
        submessage="Ini mungkin memakan waktu beberapa saat. Bersabarlah!"
      />
    </div>
  );
}

/**
 * Empty state for when user hasn't generated anything
 */
export function EmptyGenerations() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-6 p-8 text-center">
      <Mascot expression="confused" size="large" />
      <div className="space-y-2 max-w-md">
        <h3 className="text-xl font-bold text-foreground">Belum ada kreasi?</h3>
        <p className="text-muted-foreground">
          Mari buat sesuatu yang amazing! Squirrel siap membantu Anda menciptakan gambar dan video yang luar biasa.
        </p>
      </div>
    </div>
  );
}

/**
 * Error state
 */
export function GenerationError({
  message = "Oops! Squirrel membuat kesalahan",
  submessage = "Mari coba lagi",
  onRetry,
}: {
  message?: string;
  submessage?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-6 p-8 text-center">
      <Mascot expression="confused" size="large" />
      <div className="space-y-4 max-w-md">
        <div className="space-y-1">
          <h3 className="text-xl font-bold text-foreground">{message}</h3>
          <p className="text-muted-foreground">{submessage}</p>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-4 px-6 py-2 rounded-lg btn-primary text-sm font-medium"
          >
            Coba Lagi
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Success state with celebration
 */
export function GenerationSuccess({
  message = "Berhasil! Squirrel berhasil menciptakannya!",
  submessage = "Gambar Anda siap diunduh atau dibagikan",
  action,
  actionLabel = "Lihat Hasil",
}: {
  message?: string;
  submessage?: string;
  action?: () => void;
  actionLabel?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-6 p-8 text-center">
      <Mascot expression="celebrating" size="large" />
      <div className="space-y-4 max-w-md">
        <div className="space-y-1">
          <h3 className="text-xl font-bold text-foreground">{message}</h3>
          <p className="text-muted-foreground">{submessage}</p>
        </div>
        {action && (
          <button
            onClick={action}
            className="mt-4 px-6 py-2 rounded-lg btn-primary text-sm font-medium"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Not enough credits state
 */
export function InsufficientCredits({
  creditsNeeded,
  creditsAvailable,
}: {
  creditsNeeded: number;
  creditsAvailable: number;
}) {
  const shortfall = creditsNeeded - creditsAvailable;

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-6 p-8 text-center">
      <Mascot expression="sleepy" size="large" />
      <div className="space-y-4 max-w-md">
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-foreground">
            Kredit Tidak Cukup 🪙
          </h3>
          <p className="text-muted-foreground">
            Anda membutuhkan <span className="font-semibold text-primary">{creditsNeeded}</span> kredit
            tapi hanya punya <span className="font-semibold">{creditsAvailable}</span>.
          </p>
          <p className="text-sm text-muted-foreground/70">
            Kurang <span className="text-primary font-semibold">{shortfall}</span> kredit lagi.
          </p>
        </div>
        <a
          href="/pricing"
          className="inline-block mt-4 px-6 py-2 rounded-lg btn-primary text-sm font-medium"
        >
          Beli Kredit Sekarang
        </a>
      </div>
    </div>
  );
}

/**
 * Coming soon state
 */
export function ComingSoon({ feature }: { feature: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-6 p-8 text-center">
      <Mascot expression="sleepy" size="large" />
      <div className="space-y-2 max-w-md">
        <h3 className="text-xl font-bold text-foreground">{feature} Segera Hadir</h3>
        <p className="text-muted-foreground">
          Squirrel sedang mempersiapkan fitur ini. Bersiaplah untuk sesuatu yang awesome! 🎉
        </p>
      </div>
    </div>
  );
}
