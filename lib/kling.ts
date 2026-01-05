import * as jose from 'jose';

const KLING_API_BASE = 'https://api-singapore.klingai.com';

interface KlingConfig {
    accessKey: string;
    secretKey: string;
}

interface ImageToVideoRequest {
    model_name: string;
    image: string; // URL or base64
    prompt: string;
    negative_prompt?: string;
    cfg_scale?: number;
    mode?: 'std' | 'pro';
    duration?: '5' | '10';
    aspect_ratio?: '16:9' | '9:16' | '1:1';
    callback_url?: string;
    // Kling 2.6 audio support
    sound?: boolean;
}

interface TextToVideoRequest {
    model_name: string;
    prompt: string;
    negative_prompt?: string;
    cfg_scale?: number;
    mode?: 'std' | 'pro';
    duration?: '5' | '10';
    aspect_ratio?: '16:9' | '9:16' | '1:1';
    callback_url?: string;
    // Kling 2.6 audio support
    sound?: boolean;
}

interface VideoExtendRequest {
    model_name: string;
    video_id: string;
    prompt: string;
    negative_prompt?: string;
    cfg_scale?: number;
    callback_url?: string;
}

interface VideoToAudioRequest {
    video_id: string;  // ID of the generated video from Kling
    callback_url?: string;
}

interface VideoToAudioResult {
    code: number;
    message: string;
    request_id: string;
    data: {
        task_id: string;
        task_status: 'submitted' | 'processing' | 'succeed' | 'failed';
        task_status_msg?: string;
        created_at: number;
        updated_at: number;
        task_result?: {
            videos: Array<{
                id: string;
                url: string;
                duration: string;
            }>;
        };
    };
}

interface KlingTaskResponse {
    code: number;
    message: string;
    request_id: string;
    data: {
        task_id: string;
        task_status: string;
        task_status_msg?: string;
        created_at?: number;
        updated_at?: number;
    };
}

interface KlingTaskResult {
    code: number;
    message: string;
    request_id: string;
    data: {
        task_id: string;
        task_status: 'submitted' | 'processing' | 'succeed' | 'failed';
        task_status_msg?: string;
        created_at: number;
        updated_at: number;
        task_result?: {
            videos: Array<{
                id: string;
                url: string;
                duration: string;
            }>;
        };
    };
}

export class KlingClient {
    private accessKey: string;
    private secretKey: string;

    constructor(config: KlingConfig) {
        this.accessKey = config.accessKey;
        this.secretKey = config.secretKey;
    }

    /**
     * Generate JWT token for Kling AI API authentication
     */
    private async generateToken(): Promise<string> {
        const now = Math.floor(Date.now() / 1000);
        const exp = now + 1800; // 30 minutes expiry

        const header = {
            alg: 'HS256',
            typ: 'JWT',
        };

        const payload = {
            iss: this.accessKey,
            exp: exp,
            nbf: now - 5,
        };

        const secret = new TextEncoder().encode(this.secretKey);
        const token = await new jose.SignJWT(payload)
            .setProtectedHeader(header)
            .sign(secret);

        return token;
    }

    /**
     * Make authenticated request to Kling API
     */
    private async request<T>(endpoint: string, body: object): Promise<T> {
        const token = await this.generateToken();

        console.log('[Kling API] Request:', endpoint, JSON.stringify(body, null, 2));

        const response = await fetch(`${KLING_API_BASE}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[Kling API] Error:', errorText);
            throw new Error(`Kling API error: ${response.status} - ${errorText}`);
        }

        return response.json();
    }

    /**
     * Make authenticated GET request to Kling API
     */
    private async get<T>(endpoint: string): Promise<T> {
        const token = await this.generateToken();

        const response = await fetch(`${KLING_API_BASE}${endpoint}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Kling API error:', errorText);
            throw new Error(`Kling API error: ${response.status} - ${errorText}`);
        }

        return response.json();
    }

    /**
     * Generate video from image (Image to Video)
     * Uses Kling v1.5 model (v2.6 with native audio not available in API yet)
     */
    async imageToVideo(options: {
        imageUrl: string;
        prompt: string;
        negativePrompt?: string;
        mode?: 'std' | 'pro';
        duration?: '5' | '10';
        aspectRatio?: '16:9' | '9:16' | '1:1';
        cfgScale?: number;
    }): Promise<KlingTaskResponse> {
        const body: ImageToVideoRequest = {
            model_name: 'kling-v1-5',
            image: options.imageUrl,
            prompt: options.prompt,
            negative_prompt: options.negativePrompt || 'blurry, low quality, distorted, ugly',
            mode: options.mode || 'std',
            duration: options.duration || '5',
            aspect_ratio: options.aspectRatio || '16:9',
            cfg_scale: options.cfgScale || 0.85,
        };

        return this.request<KlingTaskResponse>('/v1/videos/image2video', body);
    }

    /**
     * Generate video from text (Text to Video)
     * Uses Kling v1.5 model (v2.6 with native audio not available in API yet)
     */
    async textToVideo(options: {
        prompt: string;
        negativePrompt?: string;
        mode?: 'std' | 'pro';
        duration?: '5' | '10';
        aspectRatio?: '16:9' | '9:16' | '1:1';
        cfgScale?: number;
    }): Promise<KlingTaskResponse> {
        const body: TextToVideoRequest = {
            model_name: 'kling-v1-5',
            prompt: options.prompt,
            negative_prompt: options.negativePrompt || 'blurry, low quality, distorted, ugly',
            mode: options.mode || 'std',
            duration: options.duration || '5',
            aspect_ratio: options.aspectRatio || '16:9',
            cfg_scale: options.cfgScale || 0.5,
        };

        return this.request<KlingTaskResponse>('/v1/videos/text2video', body);
    }

    /**
     * Get task status and result
     */
    async getTaskResult(taskId: string): Promise<KlingTaskResult> {
        return this.get<KlingTaskResult>(`/v1/videos/image2video/${taskId}`);
    }

    /**
     * Get text-to-video task result
     */
    async getTextToVideoResult(taskId: string): Promise<KlingTaskResult> {
        return this.get<KlingTaskResult>(`/v1/videos/text2video/${taskId}`);
    }

    /**
     * Extend an existing video (add more duration)
     */
    async extendVideo(options: {
        videoId: string;
        prompt: string;
        negativePrompt?: string;
        cfgScale?: number;
    }): Promise<KlingTaskResponse> {
        const body: VideoExtendRequest = {
            model_name: 'kling-v1-5',
            video_id: options.videoId,
            prompt: options.prompt,
            negative_prompt: options.negativePrompt || 'blurry, low quality, distorted, ugly',
            cfg_scale: options.cfgScale || 0.5,
        };

        return this.request<KlingTaskResponse>('/v1/videos/video-extend', body);
    }

    /**
     * Get video extend task result
     */
    async getExtendResult(taskId: string): Promise<KlingTaskResult> {
        return this.get<KlingTaskResult>(`/v1/videos/video-extend/${taskId}`);
    }

    /**
     * Add audio to an existing video using Video to Audio API
     * Video must be 3-20 seconds long
     */
    async videoToAudio(videoId: string): Promise<KlingTaskResponse> {
        const body: VideoToAudioRequest = {
            video_id: videoId,
        };

        console.log(`[Kling] Adding audio to video: ${videoId}`);
        return this.request<KlingTaskResponse>('/v1/videos/video2audio', body);
    }

    /**
     * Get video-to-audio task result
     */
    async getVideoToAudioResult(taskId: string): Promise<VideoToAudioResult> {
        return this.get<VideoToAudioResult>(`/v1/videos/video2audio/${taskId}`);
    }

    /**
     * Poll for task completion
     */
    async waitForCompletion(
        taskId: string,
        type: 'image2video' | 'text2video' | 'video-extend' | 'video2audio' = 'image2video',
        maxAttempts: number = 120,
        intervalMs: number = 5000
    ): Promise<KlingTaskResult> {
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            let result: KlingTaskResult | VideoToAudioResult;
            if (type === 'image2video') {
                result = await this.getTaskResult(taskId);
            } else if (type === 'text2video') {
                result = await this.getTextToVideoResult(taskId);
            } else if (type === 'video2audio') {
                result = await this.getVideoToAudioResult(taskId);
            } else {
                result = await this.getExtendResult(taskId);
            }

            console.log(`[Kling] Task ${taskId} status: ${result.data.task_status} (attempt ${attempt + 1})`);

            if (result.data.task_status === 'succeed') {
                return result as KlingTaskResult;
            }

            if (result.data.task_status === 'failed') {
                throw new Error(`${type} failed: ${result.data.task_status_msg || 'Unknown error'}`);
            }

            // Wait before next poll
            await new Promise(resolve => setTimeout(resolve, intervalMs));
        }

        throw new Error(`${type} timed out`);
    }
}

/**
 * Create Kling client instance
 */
export function createKlingClient(): KlingClient {
    const accessKey = process.env.KLING_AI_ACCESS_KEY;
    const secretKey = process.env.KLING_AI_SECRET_KEY;

    if (!accessKey || !secretKey) {
        throw new Error('Kling AI credentials not configured. Set KLING_AI_ACCESS_KEY and KLING_AI_SECRET_KEY in .env');
    }

    return new KlingClient({
        accessKey,
        secretKey,
    });
}

/**
 * Calculate token cost based on video duration and mode
 * Audio is charged separately via getAudioCost()
 */
export function getVideoCost(duration: '5' | '10', mode: 'std' | 'pro'): number {
    // Base costs in app tokens
    const baseCosts = {
        '5': { std: 100, pro: 120 },   // 5 second video
        '10': { std: 180, pro: 220 },  // 10 second video
    };

    return baseCosts[duration][mode];
}

/**
 * Calculate token cost for video extension
 * Extension adds 5 seconds
 */
export function getExtendCost(): number {
    return 80; // Fixed cost for extending video by 5 seconds
}

/**
 * Calculate token cost for adding audio to video
 * Uses Video2Audio API (separate from video generation)
 */
export function getAudioCost(): number {
    return 50; // Fixed cost for adding audio to video (3-20 seconds)
}
