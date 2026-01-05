import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { z } from "zod";
import { processTokenCharge } from "@/lib/tokens-server";
import { createKlingClient, getVideoCost, getAudioCost } from "@/lib/kling";

const StartVideoSchema = z.object({
    imageUrl: z.string().url().optional(),
    prompt: z.string().min(1, "Prompt is required"),
    negativePrompt: z.string().optional(),
    mode: z.enum(["std", "pro"]).optional().default("std"),
    duration: z.enum(["5", "10"]).optional().default("5"),
    aspectRatio: z.enum(["16:9", "9:16", "1:1"]).optional().default("16:9"),
    type: z.enum(["image2video", "text2video"]).optional().default("image2video"),
    sound: z.boolean().optional().default(false),
});

/**
 * Start async video generation - returns taskId immediately
 * POST /api/video-start
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const validation = StartVideoSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: validation.error.issues[0].message },
                { status: 400 }
            );
        }

        const { imageUrl, prompt, negativePrompt, mode, duration, aspectRatio, type, sound } = validation.data;

        // Validate image URL for image2video
        if (type === "image2video" && !imageUrl) {
            return NextResponse.json(
                { error: "Image URL is required for image-to-video generation" },
                { status: 400 }
            );
        }

        // Calculate cost: video + optional audio
        const videoCost = getVideoCost(duration, mode);
        const audioCost = sound ? getAudioCost() : 0;
        const cost = videoCost + audioCost;

        // Auth Check
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Token Balance Pre-Check (reserve tokens)
        let commitCharge: () => Promise<void>;
        try {
            commitCharge = await processTokenCharge(user.id, cost);
        } catch (e: any) {
            return NextResponse.json({ error: e.message }, { status: 403 });
        }

        // Create Kling Client
        const kling = createKlingClient();

        // Enhance prompt
        const enhancedPrompt = enhanceMarketingPrompt(prompt, type);
        
        // Enhanced negative prompts to avoid common issues
        const baseNegative = type === "image2video"
            ? "different product, wrong product, changed product, morphing, deformation, blurry, low quality, distorted, ugly, shaky camera, amateur, poorly lit, unnatural colors"
            : "blurry, low quality, distorted, ugly, shaky camera, amateur, poorly lit";
        
        // Add action-specific negative prompts
        const actionNegatives = [
            "frozen pose",
            "static image",
            "no movement",
            "incomplete action",
            "action not performed",
            "missing motion",
            "person standing still",
            "hands not moving",
            "unrealistic movement",
            "jerky motion",
        ].join(", ");
        
        const enhancedNegative = negativePrompt || `${baseNegative}, ${actionNegatives}`;

        console.log(`[Video] Original prompt: ${prompt}`);
        console.log(`[Video] Enhanced prompt: ${enhancedPrompt}`);

        // Start Video Generation (async - don't wait for completion)
        // Note: Audio is added separately via Video2Audio API after video is ready
        let taskResponse;
        if (type === "image2video" && imageUrl) {
            taskResponse = await kling.imageToVideo({
                imageUrl,
                prompt: enhancedPrompt,
                negativePrompt: enhancedNegative,
                mode,
                duration,
                aspectRatio,
            });
        } else {
            taskResponse = await kling.textToVideo({
                prompt: enhancedPrompt,
                negativePrompt: enhancedNegative,
                mode,
                duration,
                aspectRatio,
            });
        }

        if (taskResponse.code !== 0) {
            throw new Error(`Kling API error: ${taskResponse.message}`);
        }

        const taskId = taskResponse.data.task_id;
        console.log(`[Video] Started async task: ${taskId}`);

        // Save pending generation record
        const adminClient = createAdminClient();
        const { data: generation, error: insertError } = await adminClient
            .from("generations")
            .insert({
                user_id: user.id,
                type: "video",
                prompt: prompt,
                file_url: null, // Will be filled when complete
                tokens_used: cost,
                status: "processing",
                metadata: {
                    taskId,
                    duration,
                    mode,
                    aspectRatio,
                    sourceType: type,
                    sourceImage: imageUrl || null,
                    hasAudio: sound,
                    videoCost,
                    audioCost,
                },
            })
            .select("id")
            .single();

        if (insertError) {
            console.error("Failed to create generation record:", insertError);
        }

        // Commit token charge
        await commitCharge();

        return NextResponse.json({
            success: true,
            taskId,
            generationId: generation?.id,
            type,
            message: "Video generation started. Check status with /api/video-status",
        });

    } catch (error: any) {
        console.error("Video start error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to start video generation" },
            { status: 500 }
        );
    }
}

/**
 * Enhance prompt for high-quality video generation
 * CRITICAL: Extract and emphasize the ACTION/MOTION from user's request
 * AI video models need explicit, detailed action descriptions
 */
function enhanceMarketingPrompt(prompt: string, type: string): string {
    const userPrompt = prompt.trim();
    
    // First, translate Indonesian keywords to English for better AI understanding
    let translatedPrompt = translateCommonTerms(userPrompt);
    
    // Extract the core action from the prompt
    const actionAnalysis = analyzeAction(translatedPrompt);
    
    // Don't over-enhance if prompt is already very detailed
    if (translatedPrompt.length > 300) {
        return translatedPrompt;
    }

    if (type === "image2video") {
        // Image-to-Video: CRITICAL - describe the exact motion/action to perform
        return buildImageToVideoPrompt(translatedPrompt, actionAnalysis);
    }
    
    // Text-to-Video: Create complete scene from scratch
    return buildTextToVideoPrompt(translatedPrompt, actionAnalysis);
}

/**
 * Translate common Indonesian terms to English for better AI understanding
 */
function translateCommonTerms(prompt: string): string {
    const translations: Record<string, string> = {
        // Actions
        'menyemprotkan': 'spraying',
        'menyemprot': 'sprays',
        'semprot': 'spray',
        'memegang': 'holding',
        'pegang': 'hold',
        'menggunakan': 'using',
        'pakai': 'use',
        'memakai': 'wearing',
        'menuangkan': 'pouring',
        'tuang': 'pour',
        'minum': 'drinking',
        'makan': 'eating',
        'berjalan': 'walking',
        'berlari': 'running',
        'duduk': 'sitting',
        'berdiri': 'standing',
        'tersenyum': 'smiling',
        'menari': 'dancing',
        'melompat': 'jumping',
        'membuka': 'opening',
        'menutup': 'closing',
        'mengambil': 'taking',
        'meletakkan': 'placing',
        'menunjukkan': 'showing',
        'memperlihatkan': 'displaying',
        'mengaplikasikan': 'applying',
        'mengoleskan': 'applying',
        'mencium': 'smelling',
        'mencicipi': 'tasting',
        
        // Body parts
        'badan': 'body',
        'tubuh': 'body',
        'wajah': 'face',
        'muka': 'face',
        'tangan': 'hand',
        'lengan': 'arm',
        'leher': 'neck',
        'kaki': 'leg',
        'rambut': 'hair',
        'kulit': 'skin',
        
        // People
        'wanita': 'woman',
        'perempuan': 'woman',
        'pria': 'man',
        'laki-laki': 'man',
        'gadis': 'young woman',
        'pemuda': 'young man',
        'model': 'model',
        'orang': 'person',
        
        // Products
        'parfum': 'perfume',
        'produk': 'product',
        'botol': 'bottle',
        'kemasan': 'packaging',
        'kosmetik': 'cosmetic',
        'skincare': 'skincare',
        'makeup': 'makeup',
        'lotion': 'lotion',
        'krim': 'cream',
        'serum': 'serum',
        
        // Descriptions
        'indonesia': 'Indonesian',
        'cantik': 'beautiful',
        'menarik': 'attractive',
        'elegan': 'elegant',
        'mewah': 'luxurious',
        'profesional': 'professional',
        'marketing': 'marketing',
        'iklan': 'advertisement',
        'promosi': 'promotional',
        
        // Common phrases
        'tolong buatkan': 'create',
        'buatkan': 'create',
        'buat': 'create',
        'untuk': 'for',
        'dengan': 'with',
        'yang': 'who',
        'sedang': 'is',
        'ke': 'to',
        'di': 'on',
        'dari': 'from',
        'ini': 'this',
        'itu': 'that',
    };

    let result = prompt.toLowerCase();
    
    // Sort by length (longest first) to avoid partial replacements
    const sortedKeys = Object.keys(translations).sort((a, b) => b.length - a.length);
    
    for (const indonesian of sortedKeys) {
        const english = translations[indonesian];
        const regex = new RegExp(`\\b${indonesian}\\b`, 'gi');
        result = result.replace(regex, english);
    }
    
    return result;
}

/**
 * Analyze the prompt to extract key action information
 */
function analyzeAction(prompt: string): {
    hasAction: boolean;
    actionVerb: string | null;
    subject: string | null;
    object: string | null;
    targetArea: string | null;
    isProductDemo: boolean;
    isBeautyContent: boolean;
} {
    const lowerPrompt = prompt.toLowerCase();
    
    // Detect action verbs
    const actionVerbs = [
        'spray', 'spraying', 'sprays',
        'apply', 'applying', 'applies',
        'pour', 'pouring', 'pours',
        'hold', 'holding', 'holds',
        'use', 'using', 'uses',
        'drink', 'drinking', 'drinks',
        'eat', 'eating', 'eats',
        'open', 'opening', 'opens',
        'show', 'showing', 'shows',
        'display', 'displaying', 'displays',
        'rub', 'rubbing', 'rubs',
        'massage', 'massaging', 'massages',
        'smell', 'smelling', 'smells',
        'touch', 'touching', 'touches',
    ];
    
    let actionVerb = null;
    for (const verb of actionVerbs) {
        if (lowerPrompt.includes(verb)) {
            actionVerb = verb;
            break;
        }
    }
    
    // Detect subjects (who performs the action)
    const subjects = ['woman', 'man', 'girl', 'boy', 'model', 'person', 'people', 'hand', 'hands'];
    let subject = null;
    for (const s of subjects) {
        if (lowerPrompt.includes(s)) {
            subject = s;
            break;
        }
    }
    
    // Detect objects (what is being used)
    const objects = ['perfume', 'bottle', 'product', 'lotion', 'cream', 'serum', 'spray', 'cosmetic', 'makeup'];
    let object = null;
    for (const o of objects) {
        if (lowerPrompt.includes(o)) {
            object = o;
            break;
        }
    }
    
    // Detect target areas
    const targetAreas = ['body', 'face', 'skin', 'neck', 'arm', 'hand', 'leg', 'hair', 'wrist'];
    let targetArea = null;
    for (const area of targetAreas) {
        if (lowerPrompt.includes(area)) {
            targetArea = area;
            break;
        }
    }
    
    const isProductDemo = /product|marketing|advertisement|promotional|commercial|demo/i.test(lowerPrompt);
    const isBeautyContent = /beauty|cosmetic|skincare|makeup|perfume|lotion|cream|serum/i.test(lowerPrompt);
    
    return {
        hasAction: actionVerb !== null,
        actionVerb,
        subject,
        object,
        targetArea,
        isProductDemo,
        isBeautyContent,
    };
}

/**
 * Build detailed prompt for image-to-video
 * CRITICAL: Must describe exact motion step-by-step
 */
function buildImageToVideoPrompt(userPrompt: string, analysis: ReturnType<typeof analyzeAction>): string {
    const parts: string[] = [];
    
    // Start with user's intent but make it more explicit
    if (analysis.hasAction && analysis.actionVerb) {
        // Build explicit action sequence
        const actionSequence = buildActionSequence(analysis);
        parts.push(actionSequence);
    }
    
    // Add the user prompt
    parts.push(userPrompt);
    
    // Add motion-specific instructions
    parts.push("realistic natural human movement");
    parts.push("continuous smooth motion from start to finish");
    parts.push("physically accurate movement");
    
    // For product demonstrations
    if (analysis.isProductDemo || analysis.isBeautyContent) {
        parts.push("professional product demonstration");
        parts.push("clear view of the product during action");
        parts.push("deliberate purposeful movements");
    }
    
    // Quality essentials (minimal to not distract from action)
    parts.push("high quality");
    parts.push("natural lighting");
    
    return parts.filter(Boolean).join(", ");
}

/**
 * Build explicit action sequence for AI to follow
 */
function buildActionSequence(analysis: ReturnType<typeof analyzeAction>): string {
    const { actionVerb, subject, object, targetArea } = analysis;
    
    if (!actionVerb) return "";
    
    // Map actions to detailed motion descriptions
    const actionDescriptions: Record<string, string> = {
        'spray': `${subject || 'hand'} raises ${object || 'bottle'}, presses nozzle, visible mist sprays onto ${targetArea || 'skin'}, ${subject || 'person'} reacts naturally`,
        'spraying': `${subject || 'hand'} holds ${object || 'bottle'} up, finger presses spray button, fine mist releases and lands on ${targetArea || 'body'}, natural reaction`,
        'sprays': `${subject || 'hand'} positions ${object || 'bottle'}, presses trigger, spray mist disperses onto ${targetArea || 'skin'}`,
        
        'apply': `${subject || 'hand'} takes ${object || 'product'}, brings to ${targetArea || 'skin'}, gently applies with smooth motion`,
        'applying': `${subject || 'fingers'} scoop ${object || 'product'}, spread evenly on ${targetArea || 'skin'} with circular motion`,
        'applies': `${subject || 'hand'} dispenses ${object || 'product'}, smoothly applies to ${targetArea || 'face'}`,
        
        'pour': `${subject || 'hand'} tilts ${object || 'bottle'}, liquid flows out smoothly`,
        'pouring': `${subject || 'hand'} tips ${object || 'bottle'}, controlled pour of liquid`,
        
        'hold': `${subject || 'hand'} grips ${object || 'product'} firmly, presents to camera`,
        'holding': `${subject || 'hand'} holds ${object || 'product'} steady, slight natural movement`,
        
        'use': `${subject || 'person'} picks up ${object || 'product'}, uses it naturally on ${targetArea || 'self'}`,
        'using': `${subject || 'person'} demonstrates ${object || 'product'} usage on ${targetArea || 'body'}`,
        
        'show': `${subject || 'hand'} holds up ${object || 'product'}, rotates slowly to display all angles`,
        'showing': `${subject || 'person'} presents ${object || 'product'}, turns it for camera view`,
        
        'rub': `${subject || 'fingers'} gently massage ${object || 'product'} into ${targetArea || 'skin'} with circular motion`,
        'rubbing': `${subject || 'hands'} work ${object || 'product'} into ${targetArea || 'skin'}, smooth blending motion`,
        
        'smell': `${subject || 'person'} brings ${object || 'product'} close to nose, inhales, shows pleased expression`,
        'smelling': `${subject || 'person'} lifts ${object || 'product'} to nose, breathes in, eyes close in appreciation`,
    };
    
    // Get base verb (remove -ing, -s suffixes for lookup)
    const baseVerb = actionVerb.replace(/ing$|s$/, '');
    const description = actionDescriptions[actionVerb] || actionDescriptions[baseVerb] || "";
    
    return description;
}

/**
 * Build detailed prompt for text-to-video
 */
function buildTextToVideoPrompt(userPrompt: string, analysis: ReturnType<typeof analyzeAction>): string {
    const parts: string[] = [];
    
    // If there's a specific action, make it explicit
    if (analysis.hasAction) {
        const actionSequence = buildActionSequence(analysis);
        if (actionSequence) {
            parts.push(actionSequence);
        }
    }
    
    // Add user prompt
    parts.push(userPrompt);
    
    // Scene type enhancements
    if (analysis.isProductDemo) {
        parts.push("professional commercial style");
        parts.push("clean studio background");
        parts.push("product clearly visible throughout");
    } else if (analysis.isBeautyContent) {
        parts.push("beauty advertisement style");
        parts.push("soft flattering lighting");
        parts.push("elegant presentation");
    }
    
    // Action quality
    if (analysis.hasAction) {
        parts.push("realistic human movement");
        parts.push("natural fluid motion");
        parts.push("complete action from beginning to end");
    }
    
    // Core quality
    parts.push("high definition");
    parts.push("professional quality");
    
    return parts.filter(Boolean).join(", ");
}
