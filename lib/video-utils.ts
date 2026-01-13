import { fal } from "@fal-ai/client";

fal.config({
    credentials: process.env.FAL_KEY,
});

/**
 * Video Utilities using fal.ai ffmpeg API
 * 
 * Cloud-based video processing - no local ffmpeg required!
 * Uses fal.ai's serverless ffmpeg endpoints.
 */

interface ExtractFrameResult {
    images: Array<{
        url: string;
        content_type?: string;
        file_name?: string;
        file_size?: number;
        width?: number;
        height?: number;
    }>;
}

interface MergeVideosResult {
    video: {
        url: string;
        content_type: string;
        file_name: string;
        file_size: number;
        duration?: number;
    };
    metadata?: {
        duration?: number;
    };
}

/**
 * Extract a frame from a video using fal.ai ffmpeg API
 * 
 * @param videoUrl - URL of the video
 * @param frameType - 'first', 'middle', or 'last'
 * @returns URL of the extracted frame image
 */
export async function extractFrame(
    videoUrl: string,
    frameType: "first" | "middle" | "last" = "last"
): Promise<string> {
    console.log(`[VideoUtils] Extracting ${frameType} frame from video...`);

    try {
        const result = await fal.subscribe("fal-ai/ffmpeg-api/extract-frame", {
            input: {
                video_url: videoUrl,
                frame_type: frameType,
            },
        }) as { data: ExtractFrameResult };

        if (!result.data.images || result.data.images.length === 0) {
            throw new Error("No frame extracted from video");
        }

        const frameUrl = result.data.images[0].url;
        console.log(`[VideoUtils] Frame extracted: ${frameUrl}`);

        return frameUrl;
    } catch (error) {
        console.error("[VideoUtils] Frame extraction failed:", error);
        throw new Error(`Failed to extract frame: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
}

/**
 * Extract the last frame from a video
 * Convenience wrapper for extractFrame with frameType='last'
 * 
 * @param videoUrl - URL of the video
 * @param _userId - User ID (kept for backward compatibility, not used with fal.ai)
 * @returns URL of the extracted frame image
 */
export async function extractLastFrame(
    videoUrl: string,
    _userId?: string
): Promise<string> {
    return extractFrame(videoUrl, "last");
}

/**
 * Extract a frame at a specific position
 * Note: fal.ai only supports first/middle/last, so we approximate
 * 
 * @param videoUrl - URL of the video
 * @param position - 'start', 'middle', or 'end'
 * @param _userId - User ID (kept for backward compatibility)
 * @returns URL of the extracted frame image
 */
export async function extractFrameAt(
    videoUrl: string,
    position: "start" | "middle" | "end",
    _userId?: string
): Promise<string> {
    const frameType = position === "start" ? "first" : position === "end" ? "last" : "middle";
    return extractFrame(videoUrl, frameType);
}

/**
 * Stitch multiple videos together using fal.ai ffmpeg API
 * 
 * @param videoUrls - Array of video URLs in order
 * @param _userId - User ID (kept for backward compatibility)
 * @param options - Stitching options (resolution supported)
 * @returns Object with videoUrl and duration
 */
export async function stitchVideos(
    videoUrls: string[],
    _userId?: string,
    options: {
        resolution?: { width: number; height: number };
    } = {}
): Promise<{ videoUrl: string; duration: number }> {
    console.log(`[VideoUtils] Stitching ${videoUrls.length} videos...`);

    if (videoUrls.length === 0) {
        throw new Error("No videos to stitch");
    }

    if (videoUrls.length === 1) {
        console.log("[VideoUtils] Single video, returning as-is");
        return { videoUrl: videoUrls[0], duration: 0 };
    }

    try {
        const input = {
            video_urls: videoUrls,
            ...(options.resolution && { resolution: options.resolution }),
        };

        const result = await fal.subscribe("fal-ai/ffmpeg-api/merge-videos", {
            input,
        }) as { data: MergeVideosResult };

        if (!result.data.video || !result.data.video.url) {
            throw new Error("No merged video in result");
        }

        const videoUrl = result.data.video.url;
        const duration = result.data.video.duration || result.data.metadata?.duration || 0;

        console.log(`[VideoUtils] Videos stitched: ${videoUrl} (${Math.round(duration)}s)`);

        return { videoUrl, duration };
    } catch (error) {
        console.error("[VideoUtils] Video stitching failed:", error);
        throw new Error(`Failed to stitch videos: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
}

/**
 * Check if video processing is available
 * Always returns true since we're using cloud-based fal.ai
 */
export async function isFFmpegAvailable(): Promise<boolean> {
    return true;
}

/**
 * Get video duration (not directly available via fal.ai, returns 0)
 * Consider using metadata endpoint if needed in the future
 */
export async function getVideoDuration(_videoUrl: string): Promise<number> {
    console.log("[VideoUtils] getVideoDuration not implemented for fal.ai, returning 0");
    return 0;
}

/**
 * Generate a thumbnail from video
 */
export async function generateThumbnail(
    videoUrl: string,
    _userId?: string,
    position: "start" | "middle" | "end" = "start"
): Promise<string> {
    return extractFrameAt(videoUrl, position, _userId);
}
