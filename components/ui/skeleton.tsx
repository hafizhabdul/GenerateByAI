import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-surface-2",
        className
      )}
    />
  );
}

export function SkeletonText({ className }: SkeletonProps) {
  return <Skeleton className={cn("h-4 rounded", className)} />;
}

export function SkeletonCircle({ className }: SkeletonProps) {
  return <Skeleton className={cn("rounded-full", className)} />;
}

// Gallery card skeleton
export function GalleryCardSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden border border-border bg-card">
      <Skeleton className="aspect-square rounded-none" />
      <div className="p-4 space-y-3">
        <SkeletonText className="w-3/4" />
        <SkeletonText className="w-1/2" />
      </div>
    </div>
  );
}

// Gallery grid skeleton
export function GalleryGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <GalleryCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Dashboard stat card skeleton
export function StatCardSkeleton() {
  return (
    <div className="p-6 rounded-2xl border border-border bg-card space-y-3">
      <div className="flex items-center justify-between">
        <SkeletonText className="w-20" />
        <SkeletonCircle className="w-8 h-8" />
      </div>
      <Skeleton className="h-8 w-24" />
      <SkeletonText className="w-16" />
    </div>
  );
}

// Dashboard stats grid skeleton
export function DashboardStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Image preview skeleton
export function ImagePreviewSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="aspect-square max-w-md mx-auto" />
      <div className="flex gap-2 justify-center">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  );
}

// Feed item skeleton
export function FeedItemSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <Skeleton className="aspect-square" />
      <div className="p-4 space-y-2">
        <SkeletonText className="w-full" />
        <SkeletonText className="w-2/3" />
        <div className="flex items-center gap-2 pt-2">
          <SkeletonCircle className="w-6 h-6" />
          <SkeletonText className="w-20" />
        </div>
      </div>
    </div>
  );
}

// Activity feed skeleton
export function ActivityFeedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-surface-2">
          <SkeletonCircle className="w-10 h-10" />
          <div className="flex-1 space-y-2">
            <SkeletonText className="w-3/4" />
            <SkeletonText className="w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
