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
 * Premium tier with native audio - HIGH MARGIN TIER
 * 
 * fal.ai Veo cost: ~$0.45/5s, ~$0.72/8s with audio
 * 1 token = Rp 330, 1 USD = Rp 16.500
 * 
 * 5s: $0.45 = Rp 7.425, sell 250 token = Rp 82.500, margin 91%
 * 8s: $0.72 = Rp 11.880, sell 400 token = Rp 132.000, margin 91%
 */
export function getVeoCost(duration: 5 | 8 | 10): number {
    // Token costs based on duration - ANTI-BONCOS PRICING
    const costs: Record<number, number> = {
        5: 250,   // Premium 5s with audio
        8: 400,   // Premium 8s with audio
        10: 500,  // Premium 10s (if available)
    };
    
    return costs[duration] || 250;
}

/**
 * Check if fal.ai is configured
 */
export function isFalConfigured(): boolean {
    return !!process.env.FAL_KEY;
}

export { fal };
