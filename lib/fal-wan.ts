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
 * Token pricing for wan/v2.6 (15% margin)
 * Cost: $0.10/sec for 720p, $0.15/sec for 1080p
 * 1 token = Rp 300, 1 USD = Rp 16,850 (Jan 2026)
 */
export const WAN_VIDEO_COSTS: Record<WanResolution, Record<WanDuration, number>> = {
    "720p": {
        5: 33,   // $0.50 = Rp 8,425 -> sell Rp 9,900 (15% margin) -> 33 tokens
        10: 66,  // $1.00 = Rp 16,850 -> sell Rp 19,800 (15% margin) -> 66 tokens
        15: 100, // $1.50 = Rp 25,275 -> sell Rp 29,700 (15% margin) -> 100 tokens
    },
    "1080p": {
        5: 50,   // $0.75 = Rp 12,638 -> sell Rp 14,900 (15% margin) -> 50 tokens
        10: 100, // $1.50 = Rp 25,275 -> sell Rp 29,700 (15% margin) -> 100 tokens
        15: 150, // $2.25 = Rp 37,913 -> sell Rp 44,600 (15% margin) -> 150 tokens
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
    sample_audio?: boolean;
    enableSafetyChecker?: boolean; // Set to false to bypass content moderation (use responsibly)
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
    const {
        prompt,
        imageUrl,
        duration,
        resolution,
        aspectRatio = "16:9",
        negativePrompt,
        sample_audio = false,
        enableSafetyChecker = true // Default to true for safety
    } = input;

    const endpoint = imageUrl ? WAN_ENDPOINTS.imageToVideo : WAN_ENDPOINTS.textToVideo;

    // Map resolution to fal.ai format
    const resolutionParam = resolution === "1080p" ? "1080p" : "720p";

    const requestInput: Record<string, unknown> = {
        prompt,
        duration: duration,
        resolution: resolutionParam,
        aspect_ratio: aspectRatio,
        sample_audio: sample_audio,
        enable_safety_checker: enableSafetyChecker, // Allow disabling safety checker
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
        enableSafetyChecker,
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
    const { prompt, imageUrl, duration, resolution, aspectRatio = "16:9", negativePrompt, sample_audio = false } = input;

    const endpoint = imageUrl ? WAN_ENDPOINTS.imageToVideo : WAN_ENDPOINTS.textToVideo;
    const resolutionParam = resolution === "1080p" ? "1080p" : "720p";

    const requestInput: Record<string, unknown> = {
        prompt,
        duration: duration,
        resolution: resolutionParam,
        aspect_ratio: aspectRatio,
        sample_audio: sample_audio,
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
