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
     * Supports Kling 2.6 with native audio generation
     */
    async imageToVideo(options: {
        imageUrl: string;
        prompt: string;
        negativePrompt?: string;
        mode?: 'std' | 'pro';
        duration?: '5' | '10';
        aspectRatio?: '16:9' | '9:16' | '1:1';
        cfgScale?: number;
        sound?: boolean; // Enable native audio generation (Kling 2.6)
    }): Promise<KlingTaskResponse> {
        const body: ImageToVideoRequest = {
            model_name: options.sound ? 'kling-v2-6' : 'kling-v1-5', // Use v2.6 for audio support
            image: options.imageUrl,
            prompt: options.prompt,
            negative_prompt: options.negativePrompt || 'blurry, low quality, distorted, ugly',
            mode: options.mode || 'std',
            duration: options.duration || '5',
            aspect_ratio: options.aspectRatio || '16:9',
            cfg_scale: options.cfgScale || 0.85,
        };

        // Only include sound parameter when enabled (v2.6 feature)
        if (options.sound) {
            body.sound = true;
        }

        return this.request<KlingTaskResponse>('/v1/videos/image2video', body);
    }

    /**
     * Generate video from text (Text to Video)
     * Supports Kling 2.6 with native audio generation
     */
    async textToVideo(options: {
        prompt: string;
        negativePrompt?: string;
        mode?: 'std' | 'pro';
        duration?: '5' | '10';
        aspectRatio?: '16:9' | '9:16' | '1:1';
        cfgScale?: number;
        sound?: boolean; // Enable native audio generation (Kling 2.6)
    }): Promise<KlingTaskResponse> {
        const body: TextToVideoRequest = {
            model_name: options.sound ? 'kling-v2-6' : 'kling-v1-5', // Use v2.6 for audio support
            prompt: options.prompt,
            negative_prompt: options.negativePrompt || 'blurry, low quality, distorted, ugly',
            mode: options.mode || 'std',
            duration: options.duration || '5',
            aspect_ratio: options.aspectRatio || '16:9',
            cfg_scale: options.cfgScale || 0.5,
        };

        // Only include sound parameter when enabled (v2.6 feature)
        if (options.sound) {
            body.sound = true;
        }

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
     * Poll for task completion
     */
    async waitForCompletion(
        taskId: string,
        type: 'image2video' | 'text2video' | 'video-extend' = 'image2video',
        maxAttempts: number = 120,
        intervalMs: number = 5000
    ): Promise<KlingTaskResult> {
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            let result: KlingTaskResult;
            if (type === 'image2video') {
                result = await this.getTaskResult(taskId);
            } else if (type === 'text2video') {
                result = await this.getTextToVideoResult(taskId);
            } else {
                result = await this.getExtendResult(taskId);
            }

            console.log(`[Kling] Task ${taskId} status: ${result.data.task_status} (attempt ${attempt + 1})`);

            if (result.data.task_status === 'succeed') {
                return result;
            }

            if (result.data.task_status === 'failed') {
                throw new Error(`Video generation failed: ${result.data.task_status_msg || 'Unknown error'}`);
            }

            // Wait before next poll
            await new Promise(resolve => setTimeout(resolve, intervalMs));
        }

        throw new Error('Video generation timed out');
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
 * Calculate token cost based on video duration, mode, and audio
 * Audio-enabled videos cost ~1.5x more (Kling 2.6 pricing)
 */
export function getVideoCost(duration: '5' | '10', mode: 'std' | 'pro', sound: boolean = false): number {
    // Base costs in app tokens
    const baseCosts = {
        '5': { std: 100, pro: 120 },   // 5 second video
        '10': { std: 180, pro: 220 },  // 10 second video
    };

    let cost = baseCosts[duration][mode];

    // Audio adds 50% more cost (Kling 2.6 native audio is more expensive)
    if (sound) {
        cost = Math.ceil(cost * 1.5);
    }

    return cost;
}

/**
 * Calculate token cost for video extension
 * Extension adds 5 seconds
 */
export function getExtendCost(): number {
    return 80; // Fixed cost for extending video by 5 seconds
}
