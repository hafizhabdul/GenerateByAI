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
            console.error('Kling API error:', errorText);
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
            model_name: 'kling-v1-5', // Using stable V1.5 model
            image: options.imageUrl,
            prompt: options.prompt,
            negative_prompt: options.negativePrompt || 'blurry, low quality, distorted, ugly',
            mode: options.mode || 'std',
            duration: options.duration || '5',
            aspect_ratio: options.aspectRatio || '16:9',
            cfg_scale: options.cfgScale || 0.5,
        };

        return this.request<KlingTaskResponse>('/v1/videos/image2video', body);
    }

    /**
     * Generate video from text (Text to Video)
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
 * Calculate token cost based on video duration and mode
 */
export function getVideoCost(duration: '5' | '10', mode: 'std' | 'pro'): number {
    // Based on Kling pricing: 0.6 units/sec (std), 0.8 units/sec (pro)
    const durationSec = parseInt(duration);
    const ratePerSec = mode === 'pro' ? 0.8 : 0.6;
    const units = durationSec * ratePerSec;

    // Convert to app tokens (1 unit ≈ 10 app tokens for pricing alignment)
    return Math.ceil(units * 15);
}

/**
 * Calculate token cost for video extension
 * Extension adds 5 seconds, costs same as 5 second std video
 */
export function getExtendCost(): number {
    // Extension is fixed at ~3 units (5 seconds at std rate)
    return Math.ceil(3 * 15); // 45 tokens
}
