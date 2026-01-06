import { fal } from "@fal-ai/client";

// Configure fal.ai client
fal.config({
    credentials: process.env.FAL_KEY,
});

// Veo 3.1 model endpoints
const VEO_ENDPOINTS = {
    textToVideo: "fal-ai/veo3",
    imageToVideo: "fal-ai/veo3/image-to-video",
} as const;

export interface VeoGenerateRequest {
    prompt: string;
    imageUrl?: string; // For image-to-video
    duration?: 5 | 8; // Veo supports 5-8 seconds
    aspectRatio?: "16:9" | "9:16" | "1:1";
    enableAudio?: boolean;
}

export interface VeoGenerateResult {
    videoUrl: string;
    duration: number;
    hasAudio: boolean;
    requestId: string;
}

/**
 * Generate video using Veo 3.1 via fal.ai
 * Supports both text-to-video and image-to-video
 */
export async function generateVeoVideo(
    request: VeoGenerateRequest
): Promise<VeoGenerateResult> {
    const { prompt, imageUrl, duration = 5, aspectRatio = "16:9", enableAudio = true } = request;
    
    // Choose endpoint based on whether we have an image
    const endpoint = imageUrl ? VEO_ENDPOINTS.imageToVideo : VEO_ENDPOINTS.textToVideo;
    
    console.log(`[fal.ai Veo 3.1] Starting generation:`, {
        endpoint,
        prompt: prompt.substring(0, 100) + '...',
        hasImage: !!imageUrl,
        duration,
        aspectRatio,
        enableAudio,
    });
    
    try {
        // Build input based on endpoint type
        const baseInput = {
            prompt,
            duration: String(duration),
            aspect_ratio: aspectRatio,
            enable_audio: enableAudio,
        };
        
        const input = imageUrl 
            ? { ...baseInput, image_url: imageUrl }
            : baseInput;
        
        const result = await fal.subscribe(endpoint, {
            input: input as Parameters<typeof fal.subscribe>[1]["input"],
            logs: true,
            onQueueUpdate: (update) => {
                if (update.status === "IN_PROGRESS") {
                    console.log(`[fal.ai Veo 3.1] Progress:`, update.logs?.map(l => l.message).join(", "));
                }
            },
        });
        
        console.log(`[fal.ai Veo 3.1] Generation complete:`, result);
        
        // Extract video URL from result
        const videoUrl = (result.data as { video?: { url: string } })?.video?.url;
        
        if (!videoUrl) {
            throw new Error("No video URL in response");
        }
        
        return {
            videoUrl,
            duration,
            hasAudio: enableAudio,
            requestId: result.requestId,
        };
    } catch (error) {
        console.error(`[fal.ai Veo 3.1] Error:`, error);
        throw error;
    }
}

/**
 * Calculate token cost for Veo 3.1 video generation
 * Premium tier with native audio
 */
export function getVeoCost(duration: 5 | 8 | 10): number {
    // Token costs based on duration
    // ~$0.11/second with audio enabled
    const costs: Record<number, number> = {
        5: 100,   // ~Rp 8.800 cost, sell Rp 20.000
        8: 160,   // ~Rp 14.000 cost, sell Rp 32.000
        10: 200,  // ~Rp 17.600 cost, sell Rp 40.000
    };
    
    return costs[duration] || 100;
}

/**
 * Check if fal.ai is configured
 */
export function isFalConfigured(): boolean {
    return !!process.env.FAL_KEY;
}

export { fal };
