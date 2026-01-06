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
            mode: options.mode || 'pro',
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
            mode: options.mode || 'pro',
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
 * Pricing calculated for 50% margin minimum
 * 
 * Kling API cost: ~$0.062/unit (5s std=5units, 5s pro=8units, 10s std=9units, 10s pro=14units)
 * 1 token = Rp 200, 1 USD = Rp 16.000
 * 
 * 5s std: $0.31 = Rp 4.960, sell 50 token = Rp 10.000, margin 50%
 * 5s pro: $0.50 = Rp 8.000, sell 80 token = Rp 16.000, margin 50%
 * 10s std: $0.56 = Rp 8.960, sell 90 token = Rp 18.000, margin 50%
 * 10s pro: $0.87 = Rp 13.920, sell 140 token = Rp 28.000, margin 50%
 */
export function getVideoCost(duration: '5' | '10', mode: 'std' | 'pro'): number {
    const baseCosts = {
        '5': { std: 50, pro: 80 },    // 5 second video
        '10': { std: 90, pro: 140 },  // 10 second video
    };

    return baseCosts[duration][mode];
}

/**
 * Calculate token cost for video extension
 * Extension adds 5 seconds (~$0.31 = Rp 4.960)
 * Sell 50 token = Rp 10.000, margin 50%
 */
export function getExtendCost(): number {
    return 50;
}

/**
 * Calculate token cost for adding audio to video
 * Uses Video2Audio API (~$0.10 = Rp 1.600)
 * Sell 20 token = Rp 4.000, margin 60%
 */
export function getAudioCost(): number {
    return 20;
}

/**
 * Calculate token cost for Veo 3.1 Premium video generation
 * Always includes native audio
 * 
 * Veo API cost: ~$0.11/second with audio
 * 5s: $0.55 = Rp 8.800, sell 100 token = Rp 20.000, margin 56%
 * 8s: $0.88 = Rp 14.080, sell 160 token = Rp 32.000, margin 56%
 */
export function getVeoPremiumCost(duration: '5' | '8' | '10'): number {
    const costs: Record<string, number> = {
        '5': 100,   // Rp 8.800 cost, sell Rp 20.000
        '8': 160,   // Rp 14.080 cost, sell Rp 32.000
        '10': 200,  // Rp 17.600 cost, sell Rp 40.000
    };
    return costs[duration] || 100;
}
