import { WAN_VIDEO_COSTS, type WanResolution } from "./fal-wan";

/**
 * Supported target durations for long video generation
 */
export type LongVideoDuration = 60 | 90 | 120;

/**
 * Segment duration (using Wan 2.6 max duration)
 */
export const SEGMENT_DURATION = 15;

/**
 * Long video job status
 */
export type LongVideoStatus = "pending" | "processing" | "stitching" | "completed" | "failed";

/**
 * Long video job settings
 */
export interface LongVideoSettings {
    resolution: WanResolution;
    aspectRatio: "16:9" | "9:16" | "1:1";
    negativePrompt?: string;
}

/**
 * Long video segment info
 */
export interface LongVideoSegment {
    id: string;
    generationId: string;
    order: number;
    status: "pending" | "processing" | "completed" | "failed";
    duration: number;
    videoUrl?: string;
    thumbnailUrl?: string;
    createdAt: string;
}

/**
 * Long video job
 */
export interface LongVideoJob {
    id: string;
    userId: string;
    status: LongVideoStatus;
    prompt: string;
    targetDuration: LongVideoDuration;
    currentDuration: number;
    settings: LongVideoSettings;
    segments: LongVideoSegment[];
    finalVideoUrl?: string;
    tokensUsed: number;
    tokensReserved: number;
    error?: string;
    createdAt: string;
    updatedAt: string;
}

/**
 * Calculate number of segments needed for target duration
 */
export function getSegmentCount(targetDuration: LongVideoDuration): number {
    return Math.ceil(targetDuration / SEGMENT_DURATION);
}

/**
 * Get cost per segment based on resolution
 * Uses Wan 2.6 15s pricing
 */
export function getCostPerSegment(resolution: WanResolution): number {
    return WAN_VIDEO_COSTS[resolution][15];
}

/**
 * Calculate total token cost for long video
 */
export function getLongVideoCost(
    targetDuration: LongVideoDuration,
    resolution: WanResolution
): number {
    const segmentCount = getSegmentCount(targetDuration);
    const costPerSegment = getCostPerSegment(resolution);
    return segmentCount * costPerSegment;
}

/**
 * Get pricing breakdown for display
 */
export function getLongVideoPricing(
    targetDuration: LongVideoDuration,
    resolution: WanResolution
): {
    segmentCount: number;
    costPerSegment: number;
    totalCost: number;
    estimatedTimeMinutes: number;
} {
    const segmentCount = getSegmentCount(targetDuration);
    const costPerSegment = getCostPerSegment(resolution);
    const totalCost = segmentCount * costPerSegment;
    
    // Estimate ~2-3 minutes per segment for generation
    const estimatedTimeMinutes = segmentCount * 2.5;
    
    return {
        segmentCount,
        costPerSegment,
        totalCost,
        estimatedTimeMinutes,
    };
}

/**
 * Calculate progress percentage
 */
export function getProgressPercentage(
    currentDuration: number,
    targetDuration: LongVideoDuration
): number {
    return Math.min(100, Math.round((currentDuration / targetDuration) * 100));
}

/**
 * Get remaining segments count
 */
export function getRemainingSegments(
    completedSegments: number,
    targetDuration: LongVideoDuration
): number {
    const totalSegments = getSegmentCount(targetDuration);
    return Math.max(0, totalSegments - completedSegments);
}

/**
 * Check if job is ready for stitching
 */
export function isReadyForStitching(job: LongVideoJob): boolean {
    const requiredSegments = getSegmentCount(job.targetDuration);
    const completedSegments = job.segments.filter(s => s.status === "completed").length;
    return completedSegments >= requiredSegments;
}

/**
 * Get next segment order number
 */
export function getNextSegmentOrder(job: LongVideoJob): number {
    if (job.segments.length === 0) return 0;
    return Math.max(...job.segments.map(s => s.order)) + 1;
}

/**
 * Validate target duration
 */
export function isValidDuration(duration: number): duration is LongVideoDuration {
    return duration === 60 || duration === 90 || duration === 120;
}

/**
 * Format duration for display (e.g., "1:30" for 90 seconds)
 */
export function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Get human-readable status
 */
export function getStatusLabel(status: LongVideoStatus): string {
    const labels: Record<LongVideoStatus, string> = {
        pending: "Menunggu",
        processing: "Sedang Diproses",
        stitching: "Menggabungkan Video",
        completed: "Selesai",
        failed: "Gagal",
    };
    return labels[status];
}
