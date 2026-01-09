import { fal } from "@fal-ai/client";

// Configure fal.ai client
fal.config({
    credentials: process.env.FAL_KEY,
});

/**
 * wan/v2.6 Model Endpoints
 * NOTE: Use format "wan/v2.6/..." NOT "fal-ai/wan/v2.6/..."
 * Ref: https://fal.ai/models/wan/v2.6/image-to-video/api
 */
export const WAN_ENDPOINTS = {
    textToVideo: "wan/v2.6/text-to-video",
    imageToVideo: "wan/v2.6/image-to-video",
} as const;

/**
 * Supported durations for wan/v2.6
 */
export type WanDuration = 5 | 10 | 15;

/**
 * Supported resolutions for wan/v2.6
 */
export type WanResolution = "720p" | "1080p";

/**
 * Aspect ratios supported
 */
export type WanAspectRatio = "16:9" | "9:16" | "1:1";

/**
 * Token pricing for wan/v2.6 (60% margin)
 * Cost: $0.10/sec for 720p, $0.15/sec for 1080p
 * 1 token = Rp 330, 1 USD = Rp 16,500
 */
export const WAN_VIDEO_COSTS: Record<WanResolution, Record<WanDuration, number>> = {
    "720p": {
        5: 40,   // $0.50 cost -> Rp 8,250 -> 40 tokens = Rp 13,200 (60% margin)
        10: 80,  // $1.00 cost -> Rp 16,500 -> 80 tokens = Rp 26,400 (60% margin)
        15: 120, // $1.50 cost -> Rp 24,750 -> 120 tokens = Rp 39,600 (60% margin)
    },
    "1080p": {
        5: 60,   // $0.75 cost -> Rp 12,375 -> 60 tokens = Rp 19,800 (60% margin)
        10: 120, // $1.50 cost -> Rp 24,750 -> 120 tokens = Rp 39,600 (60% margin)
        15: 180, // $2.25 cost -> Rp 37,125 -> 180 tokens = Rp 59,400 (60% margin)
    },
};

/**
 * Get token cost for wan/v2.6 video generation
 */
export function getWanVideoCost(duration: WanDuration, resolution: WanResolution): number {
    return WAN_VIDEO_COSTS[resolution][duration];
}

/**
 * Input for wan/v2.6 video generation
 */
export interface WanVideoInput {
    prompt: string;
    imageUrl?: string;
    duration: WanDuration;
    resolution: WanResolution;
    aspectRatio?: WanAspectRatio;
    negativePrompt?: string;
}

/**
 * Result from wan/v2.6 video generation
 */
export interface WanVideoResult {
    videoUrl: string;
    requestId: string;
    duration: number;
    resolution: string;
}

/**
 * Queue status for async generation
 */
export interface WanQueueStatus {
    status: "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
    requestId: string;
    logs?: Array<{ message: string; timestamp: string }>;
    result?: {
        video?: { url: string };
        url?: string;
    };
}

/**
 * Check if fal.ai is configured for wan/v2.6
 */
export function isWanConfigured(): boolean {
    return !!process.env.FAL_KEY;
}

/**
 * Generate video using wan/v2.6 (async/queue mode)
 * Returns request_id for polling
 */
export async function startWanVideoGeneration(input: WanVideoInput): Promise<{ requestId: string }> {
    const { prompt, imageUrl, duration, resolution, aspectRatio = "16:9", negativePrompt } = input;

    const endpoint = imageUrl ? WAN_ENDPOINTS.imageToVideo : WAN_ENDPOINTS.textToVideo;

    // Map resolution to fal.ai format
    const resolutionParam = resolution === "1080p" ? "1080p" : "720p";

    const requestInput: Record<string, unknown> = {
        prompt,
        duration_seconds: duration,
        resolution: resolutionParam,
        aspect_ratio: aspectRatio,
    };

    if (negativePrompt) {
        requestInput.negative_prompt = negativePrompt;
    }

    if (imageUrl) {
        requestInput.image_url = imageUrl;
    }

    console.log(`[WAN] Starting ${imageUrl ? "image-to-video" : "text-to-video"} generation:`, {
        endpoint,
        duration,
        resolution: resolutionParam,
        aspectRatio,
    });

    // Use queue mode for async generation
    const { request_id } = await fal.queue.submit(endpoint, {
        input: requestInput,
    });

    console.log(`[WAN] Generation queued with request_id: ${request_id}`);

    return { requestId: request_id };
}

/**
 * Check status of queued wan/v2.6 generation
 */
export async function checkWanVideoStatus(requestId: string, type: "text2video" | "image2video"): Promise<WanQueueStatus> {
    const endpoint = type === "image2video" ? WAN_ENDPOINTS.imageToVideo : WAN_ENDPOINTS.textToVideo;

    try {
        const status = await fal.queue.status(endpoint, {
            requestId,
            logs: true,
        });

        console.log(`[WAN] Status check for ${requestId}:`, status.status);

        // Cast to extract logs (not all status types have logs)
        const statusWithLogs = status as { status: string; logs?: Array<{ message: string; timestamp: string }> };

        // Map fal.ai status to our format
        const mappedStatus: WanQueueStatus = {
            status: statusWithLogs.status as WanQueueStatus["status"],
            requestId,
            logs: statusWithLogs.logs,
        };

        return mappedStatus;
    } catch (error) {
        console.error(`[WAN] Status check failed for ${requestId}:`, error);
        throw error;
    }
}

/**
 * Get result of completed wan/v2.6 generation
 * Falls back to direct result fetch if queue.result fails
 */
export async function getWanVideoResult(requestId: string, type: "text2video" | "image2video"): Promise<WanVideoResult> {
    const endpoint = type === "image2video" ? WAN_ENDPOINTS.imageToVideo : WAN_ENDPOINTS.textToVideo;

    try {
        // Try queue.result first
        const result = await fal.queue.result(endpoint, {
            requestId,
        });

        console.log(`[WAN] Got result for ${requestId}:`, result);

        // Cast result data to expected shape
        const data = result.data as { video?: { url: string }; url?: string; duration?: number; resolution?: string };

        // Extract video URL from result
        const videoUrl = data?.video?.url || data?.url;

        if (!videoUrl) {
            throw new Error("No video URL in result");
        }

        return {
            videoUrl,
            requestId,
            duration: data?.duration || 0,
            resolution: data?.resolution || "720p",
        };
    } catch (error: any) {
        // If 404, the result might have been consumed or expired
        // Re-throw with more context
        if (error.status === 404) {
            console.error(`[WAN] Result not found for ${requestId} - may have expired or already been fetched`);
            throw error;
        }

        console.error(`[WAN] Failed to get result for ${requestId}:`, error);
        throw error;
    }
}

/**
 * Generate video synchronously (waits for completion)
 * Use this for simpler flow, but be aware of timeout limits
 */
export async function generateWanVideoSync(input: WanVideoInput): Promise<WanVideoResult> {
    const { prompt, imageUrl, duration, resolution, aspectRatio = "16:9", negativePrompt } = input;

    const endpoint = imageUrl ? WAN_ENDPOINTS.imageToVideo : WAN_ENDPOINTS.textToVideo;
    const resolutionParam = resolution === "1080p" ? "1080p" : "720p";

    const requestInput: Record<string, unknown> = {
        prompt,
        duration_seconds: duration,
        resolution: resolutionParam,
        aspect_ratio: aspectRatio,
    };

    if (negativePrompt) {
        requestInput.negative_prompt = negativePrompt;
    }

    if (imageUrl) {
        requestInput.image_url = imageUrl;
    }

    console.log(`[WAN] Sync generation starting...`);

    const result = await fal.subscribe(endpoint, {
        input: requestInput,
        logs: true,
        onQueueUpdate: (update: { status: string }) => {
            console.log(`[WAN] Queue update:`, update.status);
        },
    });

    // Cast result data to expected shape
    const data = result.data as { video?: { url: string }; url?: string; duration?: number };
    const videoUrl = data?.video?.url || data?.url;

    if (!videoUrl) {
        throw new Error("No video URL in result");
    }

    return {
        videoUrl,
        requestId: result.requestId || "",
        duration: data?.duration || duration,
        resolution: resolutionParam,
    };
}
