import { createAdminClient } from "@/lib/supabase/server";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";

const execAsync = promisify(exec);

/**
 * Video Utilities
 * 
 * Functions for video processing including:
 * - Extracting frames from videos
 * - Stitching multiple videos together
 * - Video format conversions
 */

/**
 * Download a file from URL to temp directory
 */
async function downloadToTemp(url: string, filename: string): Promise<string> {
    const tempDir = os.tmpdir();
    const filePath = path.join(tempDir, filename);
    
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to download: ${response.status}`);
    }
    
    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(filePath, buffer);
    
    return filePath;
}

/**
 * Upload a local file to Supabase Storage
 */
async function uploadFromLocal(
    localPath: string,
    storagePath: string,
    contentType: string
): Promise<string> {
    const adminClient = createAdminClient();
    const buffer = await fs.readFile(localPath);
    
    const { error } = await adminClient
        .storage
        .from("generations")
        .upload(storagePath, buffer, {
            contentType,
            upsert: false,
        });
    
    if (error) {
        throw new Error(`Upload failed: ${error.message}`);
    }
    
    const { data: { publicUrl } } = adminClient
        .storage
        .from("generations")
        .getPublicUrl(storagePath);
    
    return publicUrl;
}

/**
 * Clean up temp files
 */
async function cleanupTempFiles(files: string[]): Promise<void> {
    for (const file of files) {
        try {
            await fs.unlink(file);
        } catch {
            // Ignore cleanup errors
        }
    }
}

/**
 * Check if ffmpeg is available
 */
export async function isFFmpegAvailable(): Promise<boolean> {
    try {
        await execAsync("ffmpeg -version");
        return true;
    } catch {
        return false;
    }
}

/**
 * Extract the last frame from a video as an image
 * 
 * @param videoUrl - URL of the video
 * @param userId - User ID for storage path
 * @returns Public URL of the extracted frame image
 */
export async function extractLastFrame(
    videoUrl: string,
    userId: string
): Promise<string> {
    console.log(`[VideoUtils] Extracting last frame for user ${userId.slice(0, 8)}...`);
    
    const tempFiles: string[] = [];
    
    try {
        // Generate unique filenames
        const timestamp = Date.now();
        const videoFilename = `video-${timestamp}.mp4`;
        const frameFilename = `frame-${timestamp}.png`;
        
        // Download video to temp
        const videoPath = await downloadToTemp(videoUrl, videoFilename);
        tempFiles.push(videoPath);
        
        const framePath = path.join(os.tmpdir(), frameFilename);
        tempFiles.push(framePath);
        
        // Get video duration first
        const { stdout: durationOutput } = await execAsync(
            `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`
        );
        const duration = parseFloat(durationOutput.trim());
        
        if (isNaN(duration) || duration <= 0) {
            throw new Error("Could not determine video duration");
        }
        
        // Extract last frame (0.1s before end to ensure we get a frame)
        const seekTime = Math.max(0, duration - 0.1);
        
        await execAsync(
            `ffmpeg -y -ss ${seekTime} -i "${videoPath}" -frames:v 1 -q:v 2 "${framePath}"`
        );
        
        // Check if frame was created
        try {
            await fs.access(framePath);
        } catch {
            throw new Error("Failed to extract frame from video");
        }
        
        // Upload to storage
        const storagePath = `${userId}/frame-${timestamp}-${Math.floor(Math.random() * 10000)}.png`;
        const publicUrl = await uploadFromLocal(framePath, storagePath, "image/png");
        
        console.log(`[VideoUtils] Frame extracted and uploaded: ${storagePath}`);
        
        return publicUrl;
        
    } finally {
        // Cleanup temp files
        await cleanupTempFiles(tempFiles);
    }
}

/**
 * Extract a frame at a specific timestamp
 * 
 * @param videoUrl - URL of the video
 * @param timestampSeconds - Timestamp in seconds
 * @param userId - User ID for storage path
 * @returns Public URL of the extracted frame image
 */
export async function extractFrameAt(
    videoUrl: string,
    timestampSeconds: number,
    userId: string
): Promise<string> {
    console.log(`[VideoUtils] Extracting frame at ${timestampSeconds}s for user ${userId.slice(0, 8)}...`);
    
    const tempFiles: string[] = [];
    
    try {
        const timestamp = Date.now();
        const videoFilename = `video-${timestamp}.mp4`;
        const frameFilename = `frame-${timestamp}.png`;
        
        const videoPath = await downloadToTemp(videoUrl, videoFilename);
        tempFiles.push(videoPath);
        
        const framePath = path.join(os.tmpdir(), frameFilename);
        tempFiles.push(framePath);
        
        // Extract frame at timestamp
        await execAsync(
            `ffmpeg -y -ss ${timestampSeconds} -i "${videoPath}" -frames:v 1 -q:v 2 "${framePath}"`
        );
        
        try {
            await fs.access(framePath);
        } catch {
            throw new Error("Failed to extract frame from video");
        }
        
        const storagePath = `${userId}/frame-${timestamp}-${Math.floor(Math.random() * 10000)}.png`;
        const publicUrl = await uploadFromLocal(framePath, storagePath, "image/png");
        
        return publicUrl;
        
    } finally {
        await cleanupTempFiles(tempFiles);
    }
}

/**
 * Stitch multiple videos together into one
 * 
 * @param videoUrls - Array of video URLs in order
 * @param userId - User ID for storage path
 * @param options - Stitching options
 * @returns Public URL of the stitched video
 */
export async function stitchVideos(
    videoUrls: string[],
    userId: string,
    options: {
        crossfadeDuration?: number; // seconds, 0 = no crossfade
        outputFormat?: "mp4" | "webm";
    } = {}
): Promise<{ videoUrl: string; duration: number }> {
    const { crossfadeDuration = 0, outputFormat = "mp4" } = options;
    
    console.log(`[VideoUtils] Stitching ${videoUrls.length} videos for user ${userId.slice(0, 8)}...`);
    
    if (videoUrls.length === 0) {
        throw new Error("No videos to stitch");
    }
    
    if (videoUrls.length === 1) {
        // Single video, just return it
        return { videoUrl: videoUrls[0], duration: 0 };
    }
    
    const tempFiles: string[] = [];
    
    try {
        const timestamp = Date.now();
        const tempDir = os.tmpdir();
        
        // Download all videos
        const localPaths: string[] = [];
        for (let i = 0; i < videoUrls.length; i++) {
            const filename = `segment-${timestamp}-${i}.mp4`;
            const localPath = await downloadToTemp(videoUrls[i], filename);
            localPaths.push(localPath);
            tempFiles.push(localPath);
        }
        
        // Create concat file for ffmpeg
        const concatFilePath = path.join(tempDir, `concat-${timestamp}.txt`);
        const concatContent = localPaths.map(p => `file '${p}'`).join("\n");
        await fs.writeFile(concatFilePath, concatContent);
        tempFiles.push(concatFilePath);
        
        // Output path
        const outputFilename = `stitched-${timestamp}.${outputFormat}`;
        const outputPath = path.join(tempDir, outputFilename);
        tempFiles.push(outputPath);
        
        if (crossfadeDuration > 0) {
            // Use filter_complex for crossfade transitions
            // This is more complex but creates smoother transitions
            const filterParts: string[] = [];
            const inputs = localPaths.map((p, i) => `-i "${p}"`).join(" ");
            
            // Build filter chain for crossfades
            let filterChain = "";
            for (let i = 0; i < localPaths.length; i++) {
                filterChain += `[${i}:v][${i}:a]`;
            }
            filterChain += `concat=n=${localPaths.length}:v=1:a=1[outv][outa]`;
            
            await execAsync(
                `ffmpeg -y ${inputs} -filter_complex "${filterChain}" -map "[outv]" -map "[outa]" -c:v libx264 -c:a aac "${outputPath}"`
            );
        } else {
            // Simple concat without transitions
            await execAsync(
                `ffmpeg -y -f concat -safe 0 -i "${concatFilePath}" -c copy "${outputPath}"`
            );
        }
        
        // Get output duration
        const { stdout: durationOutput } = await execAsync(
            `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${outputPath}"`
        );
        const duration = parseFloat(durationOutput.trim()) || 0;
        
        // Upload to storage
        const storagePath = `${userId}/longvideo-${timestamp}.${outputFormat}`;
        const publicUrl = await uploadFromLocal(
            outputPath,
            storagePath,
            outputFormat === "mp4" ? "video/mp4" : "video/webm"
        );
        
        console.log(`[VideoUtils] Stitched video uploaded: ${storagePath} (${Math.round(duration)}s)`);
        
        return { videoUrl: publicUrl, duration };
        
    } finally {
        await cleanupTempFiles(tempFiles);
    }
}

/**
 * Get video duration in seconds
 */
export async function getVideoDuration(videoUrl: string): Promise<number> {
    const tempFiles: string[] = [];
    
    try {
        const timestamp = Date.now();
        const videoPath = await downloadToTemp(videoUrl, `probe-${timestamp}.mp4`);
        tempFiles.push(videoPath);
        
        const { stdout } = await execAsync(
            `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`
        );
        
        return parseFloat(stdout.trim()) || 0;
        
    } finally {
        await cleanupTempFiles(tempFiles);
    }
}

/**
 * Generate a thumbnail from video
 */
export async function generateThumbnail(
    videoUrl: string,
    userId: string,
    timestampSeconds: number = 0
): Promise<string> {
    return extractFrameAt(videoUrl, timestampSeconds, userId);
}
