# 🎯 Hybrid Strategy Plan: Sumopod + Kling + fal.ai (Veo 3.1)

> Strategi optimal dengan 3 provider: Sumopod untuk Image, Kling untuk Video Standard, fal.ai (Veo 3.1) untuk Video Premium dengan Audio.

---

## 📊 Executive Summary

### Provider Matrix

| Content Type | Provider | Model | Audio | Use Case |
|--------------|----------|-------|-------|----------|
| **Image** | Sumopod | Existing | - | All image generation |
| **Video Standard** | Kling Direct | v1.5 Standard | ❌ | Budget videos |
| **Video Pro** | Kling Direct | v1.5 Pro | ❌ | Quality videos |
| **Video Premium** | fal.ai | Veo 3.1 | ✅ Native | Cinematic + audio |

### Kenapa Hybrid?

✅ **Cost Efficiency** - Sumopod & Kling sudah murah untuk basic needs  
✅ **Existing Integration** - Tidak perlu rewrite image & basic video  
✅ **Premium Differentiation** - Veo 3.1 untuk tier tertinggi dengan audio  
✅ **Best of Both Worlds** - Kling extend + Veo audio quality  

---

## 💵 Pricing Structure

### Image (Sumopod - Existing)

| Tier | Model | Cost | Sell | Tokens | Margin |
|------|-------|------|------|--------|--------|
| Standard | Existing | ~Rp 800 | Rp 2.000 | 10 | 60% |

*Keep existing pricing, sudah proven*

### Video Standard (Kling Direct - No Audio)

| Tier | Duration | Mode | Cost* | Sell | Tokens | Margin |
|------|----------|------|-------|------|--------|--------|
| **Basic** | 5s | Standard | ~Rp 5.000 | Rp 10.000 | 50 | 50% |
| **Pro** | 5s | Pro | ~Rp 8.000 | Rp 16.000 | 80 | 50% |
| **Basic** | 10s | Standard | ~Rp 9.000 | Rp 18.000 | 90 | 50% |
| **Pro** | 10s | Pro | ~Rp 14.000 | Rp 28.000 | 140 | 50% |
| **Extend** | +5s | - | ~Rp 5.000 | Rp 10.000 | 50 | 50% |
| **Audio** | - | - | ~Rp 1.600 | Rp 4.000 | 20 | 60% |

*Cost Kling: ~$0.062/unit, 1 USD = Rp 16.000

### Video Premium (fal.ai Veo 3.1 - With Audio)

| Tier | Duration | Cost* | Sell | Tokens | Margin |
|------|----------|-------|------|--------|--------|
| **Premium 5s** | 5s | ~Rp 8.800 ($0.55) | Rp 20.000 | 100 | 56% |
| **Premium 8s** | 8s | ~Rp 14.000 ($0.88) | Rp 32.000 | 160 | 56% |

*Cost Veo 3.1: ~$0.11/second (dengan audio enabled)

---

## 🎯 Product Tiers

### Simplified User Options

```
┌─────────────────────────────────────────────────────────────────┐
│                    VIDEO GENERATION OPTIONS                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ⚡ STANDARD (Kling) - No Audio                                 │
│  ├── 5s Basic:   50 tokens  (Rp 10.000)                        │
│  ├── 5s Pro:     75 tokens  (Rp 15.000)                        │
│  ├── 10s Basic:  90 tokens  (Rp 18.000)                        │
│  ├── 10s Pro:   140 tokens  (Rp 28.000)                        │
│  └── Extend +5s: 60 tokens  (Rp 12.000)                        │
│      ✅ Can extend video                                        │
│      ❌ No audio                                                │
│                                                                 │
│  🎬 PREMIUM (Veo 3.1) - With Native Audio                      │
│  ├── 5s:  100 tokens (Rp 20.000)                               │
│  ├── 8s:  160 tokens (Rp 32.000)                               │
│  └── 10s: 200 tokens (Rp 40.000)                               │
│      ✅ Native audio (voice, SFX, ambient)                     │
│      ✅ Cinematic quality                                       │
│      ✅ Best frame consistency                                  │
│      ❌ Cannot extend                                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Feature Comparison

| Feature | Standard (Kling) | Premium (Veo 3.1) |
|---------|------------------|-------------------|
| **Provider** | Kling Direct API | fal.ai |
| **Quality** | ⭐⭐⭐⭐ Good | ⭐⭐⭐⭐⭐ Cinematic |
| **Native Audio** | ❌ No | ✅ Yes |
| **Lip Sync** | ❌ No | ⚠️ Basic |
| **Frame Consistency** | ⭐⭐⭐⭐ | 🏆 Best |
| **Extend Video** | ✅ Yes | ❌ No |
| **Speed** | ⚡⚡ Fast | ⚡ Slower |
| **Price** | 💵 Budget | 💵💵 Premium |

---

## 💰 Token Packages (Updated)

```typescript
const TOKEN_PACKAGES = [
    {
        id: "starter",
        name: "Starter Pack",
        tokens: 100,
        price: 25000,  // Rp 250/token
        features: [
            "~10 gambar standard",
            "~2 video standard 5s",
            "~1 video premium 5s",
        ],
    },
    {
        id: "basic",
        name: "Basic Pack",
        tokens: 500,
        price: 99000,  // Rp 198/token
        features: [
            "~50 gambar standard",
            "~10 video standard 5s",
            "~5 video premium 5s",
        ],
    },
    {
        id: "pro",
        name: "Pro Pack",
        tokens: 1500,
        price: 249000,  // Rp 166/token
        features: [
            "~150 gambar standard",
            "~30 video standard 5s",
            "~15 video premium 5s",
        ],
    },
    {
        id: "business",
        name: "Business Pack",
        tokens: 5000,
        price: 699000,  // Rp 140/token
        features: [
            "~500 gambar standard",
            "~100 video standard 5s",
            "~50 video premium 5s",
        ],
    },
];
```

---

## 📈 Revenue Projection

### Monthly P&L (500 Users, After 6 Months)

```
┌─────────────────────────────────────────────────────────────────┐
│               HYBRID STRATEGY P&L PROJECTION                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  REVENUE                                                        │
│  ├── Image (Sumopod) - 50%                                     │
│  │   ├── Standard (60%): 3,000 × Rp 2,000  = Rp  6,000,000    │
│  │   ├── HD (30%):       1,500 × Rp 4,000  = Rp  6,000,000    │
│  │   └── Ultra (10%):      500 × Rp 8,000  = Rp  4,000,000    │
│  │   Subtotal Images:                        Rp 16,000,000     │
│  │                                                              │
│  ├── Video Standard (Kling) - 35%                              │
│  │   ├── 5s Basic (40%): 1,400 × Rp 10,000 = Rp 14,000,000    │
│  │   ├── 5s Pro (25%):     875 × Rp 15,000 = Rp 13,125,000    │
│  │   ├── 10s Basic (20%):  700 × Rp 18,000 = Rp 12,600,000    │
│  │   └── 10s Pro (15%):    525 × Rp 28,000 = Rp 14,700,000    │
│  │   Subtotal Kling:                         Rp 54,425,000     │
│  │                                                              │
│  ├── Video Premium (Veo 3.1) - 15%                             │
│  │   ├── 5s (50%):         525 × Rp 20,000 = Rp 10,500,000    │
│  │   ├── 8s (30%):         315 × Rp 32,000 = Rp 10,080,000    │
│  │   └── 10s (20%):        210 × Rp 40,000 = Rp  8,400,000    │
│  │   Subtotal Veo:                           Rp 28,980,000     │
│  │                                                              │
│  └── TOTAL REVENUE:                          Rp 99,405,000     │
│                                                                 │
│  COST                                                           │
│  ├── Sumopod (Images):                                         │
│  │   ├── Standard: 3,000 × Rp 800   = Rp  2,400,000           │
│  │   ├── HD:       1,500 × Rp 1,600 = Rp  2,400,000           │
│  │   └── Ultra:      500 × Rp 3,200 = Rp  1,600,000           │
│  │   Subtotal:                        Rp  6,400,000            │
│  │                                                              │
│  ├── Kling (Videos):                                           │
│  │   ├── 5s Basic: 1,400 × Rp 5,000  = Rp  7,000,000          │
│  │   ├── 5s Pro:     875 × Rp 8,000  = Rp  7,000,000          │
│  │   ├── 10s Basic:  700 × Rp 9,000  = Rp  6,300,000          │
│  │   └── 10s Pro:    525 × Rp 14,000 = Rp  7,350,000          │
│  │   Subtotal:                        Rp 27,650,000            │
│  │                                                              │
│  ├── fal.ai Veo 3.1 (Premium Videos):                          │
│  │   ├── 5s:  525 × Rp 8,800   = Rp  4,620,000                │
│  │   ├── 8s:  315 × Rp 14,000  = Rp  4,410,000                │
│  │   └── 10s: 210 × Rp 17,600  = Rp  3,696,000                │
│  │   Subtotal:                  Rp 12,726,000                  │
│  │                                                              │
│  ├── Infrastructure:            Rp  2,500,000                  │
│  ├── Payment Fees (3%):         Rp  2,982,150                  │
│  │                                                              │
│  └── TOTAL COST:                Rp 52,258,150                  │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  GROSS PROFIT:                  Rp 47,146,850                  │
│  MARGIN:                                47%                     │
└─────────────────────────────────────────────────────────────────┘
```

### Provider Cost Breakdown

| Provider | Revenue | Cost | Profit | Margin |
|----------|---------|------|--------|--------|
| **Sumopod (Image)** | Rp 16M | Rp 6.4M | Rp 9.6M | 60% |
| **Kling (Video Std)** | Rp 54.4M | Rp 27.6M | Rp 26.8M | 49% |
| **fal.ai Veo 3.1** | Rp 29M | Rp 12.7M | Rp 16.3M | 56% |
| **TOTAL** | Rp 99.4M | Rp 46.7M | Rp 47.1M | **47%** |

---

## ⚙️ Technical Implementation

### Provider Router

```typescript
// lib/provider-router.ts

type ContentType = 'image' | 'video';
type VideoTier = 'standard' | 'premium';

interface GenerationRequest {
    type: ContentType;
    videoTier?: VideoTier;
    duration?: 5 | 8 | 10;
    mode?: 'std' | 'pro';
}

interface ProviderConfig {
    provider: 'sumopod' | 'kling' | 'fal';
    model: string;
    endpoint: string;
}

export function selectProvider(req: GenerationRequest): ProviderConfig {
    // Images → Sumopod (existing)
    if (req.type === 'image') {
        return {
            provider: 'sumopod',
            model: 'existing',
            endpoint: '/api/generate-image', // existing endpoint
        };
    }
    
    // Videos
    if (req.type === 'video') {
        // Premium tier → fal.ai Veo 3.1
        if (req.videoTier === 'premium') {
            return {
                provider: 'fal',
                model: 'veo-3.1-generate-preview',
                endpoint: '/api/generate-video-premium',
            };
        }
        
        // Standard tier → Kling (existing)
        return {
            provider: 'kling',
            model: 'kling-v1-5',
            endpoint: '/api/generate-video', // existing endpoint
        };
    }
    
    throw new Error('Invalid request type');
}
```

### Token Calculator

```typescript
// lib/token-calculator.ts

interface TokenCost {
    tokens: number;
    provider: string;
    description: string;
}

export function calculateTokens(
    type: 'image' | 'video',
    options: {
        tier?: 'standard' | 'hd' | 'ultra' | 'premium';
        duration?: 5 | 8 | 10;
        mode?: 'std' | 'pro';
    }
): TokenCost {
    // Images (Sumopod)
    if (type === 'image') {
        switch (options.tier) {
            case 'standard': return { tokens: 10, provider: 'sumopod', description: 'Image Standard' };
            case 'hd': return { tokens: 20, provider: 'sumopod', description: 'Image HD' };
            case 'ultra': return { tokens: 40, provider: 'sumopod', description: 'Image Ultra' };
            default: return { tokens: 10, provider: 'sumopod', description: 'Image Standard' };
        }
    }
    
    // Videos
    if (type === 'video') {
        // Premium (Veo 3.1)
        if (options.tier === 'premium') {
            switch (options.duration) {
                case 5: return { tokens: 100, provider: 'fal-veo', description: 'Premium Video 5s + Audio' };
                case 8: return { tokens: 160, provider: 'fal-veo', description: 'Premium Video 8s + Audio' };
                case 10: return { tokens: 200, provider: 'fal-veo', description: 'Premium Video 10s + Audio' };
                default: return { tokens: 100, provider: 'fal-veo', description: 'Premium Video 5s + Audio' };
            }
        }
        
        // Standard (Kling)
        const isProMode = options.mode === 'pro';
        switch (options.duration) {
            case 5:
                return isProMode 
                    ? { tokens: 75, provider: 'kling', description: 'Video 5s Pro' }
                    : { tokens: 50, provider: 'kling', description: 'Video 5s Basic' };
            case 10:
                return isProMode
                    ? { tokens: 140, provider: 'kling', description: 'Video 10s Pro' }
                    : { tokens: 90, provider: 'kling', description: 'Video 10s Basic' };
            default:
                return { tokens: 50, provider: 'kling', description: 'Video 5s Basic' };
        }
    }
    
    return { tokens: 10, provider: 'unknown', description: 'Unknown' };
}

// Extend video (Kling only)
export function getExtendTokens(): TokenCost {
    return { tokens: 60, provider: 'kling', description: 'Extend +5s' };
}
```

### New fal.ai Veo 3.1 Endpoint

```typescript
// app/api/generate-video-premium/route.ts

import * as fal from "@fal-ai/serverless-client";
import { createClient } from "@/lib/supabase/server";
import { processTokenCharge } from "@/lib/tokens-server";

fal.config({
    credentials: process.env.FAL_KEY,
});

export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const body = await request.json();
    const { prompt, duration = 5, imageUrl } = body;
    
    // Calculate tokens based on duration
    const tokenMap = { 5: 100, 8: 160, 10: 200 };
    const tokens = tokenMap[duration as keyof typeof tokenMap] || 100;
    
    // Pre-charge tokens
    let commitCharge: (() => Promise<void>) | null = null;
    try {
        commitCharge = await processTokenCharge(user.id, tokens);
    } catch (error) {
        return Response.json({ 
            error: "Insufficient tokens",
            required: tokens,
        }, { status: 402 });
    }
    
    try {
        // Select endpoint based on input type
        const endpoint = imageUrl 
            ? 'fal-ai/veo/v3.1/image-to-video'
            : 'fal-ai/veo/v3.1/text-to-video';
        
        const input: Record<string, unknown> = {
            prompt,
            duration: `${duration}`,
            aspect_ratio: '16:9',
            audio: true,  // Enable native audio
        };
        
        if (imageUrl) {
            input.image_url = imageUrl;
        }
        
        // Generate video with fal.ai
        const result = await fal.subscribe(endpoint, { input });
        
        // Commit token charge
        if (commitCharge) {
            await commitCharge();
        }
        
        // Save to database
        const { data: generation, error: dbError } = await supabase
            .from('generations')
            .insert({
                user_id: user.id,
                type: 'video',
                prompt,
                file_url: result.video?.url || null,
                status: 'completed',
                tokens_used: tokens,
                metadata: {
                    provider: 'fal-veo-3.1',
                    duration,
                    hasAudio: true,
                    aspectRatio: '16:9',
                },
            })
            .select()
            .single();
        
        if (dbError) {
            console.error('DB error:', dbError);
        }
        
        return Response.json({
            success: true,
            videoUrl: result.video?.url,
            audioIncluded: true,
            duration,
            tokensUsed: tokens,
            generation,
        });
        
    } catch (error) {
        console.error('Veo 3.1 generation error:', error);
        return Response.json({ 
            error: "Video generation failed",
            details: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
    }
}
```

---

## 🎨 UI Updates

### Video Generator Component Update

```tsx
// components/video-generator.tsx (additions)

type VideoTier = 'standard' | 'premium';

const VIDEO_OPTIONS = {
    standard: {
        label: '⚡ Standard',
        description: 'Kling - No audio, can extend',
        provider: 'Kling',
        durations: [
            { value: 5, tokens: 50, label: '5 detik', pro: 75 },
            { value: 10, tokens: 90, label: '10 detik', pro: 140 },
        ],
        modes: ['std', 'pro'],
        canExtend: true,
        hasAudio: false,
    },
    premium: {
        label: '🎬 Premium',
        description: 'Veo 3.1 - With native audio',
        provider: 'Veo 3.1',
        durations: [
            { value: 5, tokens: 100, label: '5 detik' },
            { value: 8, tokens: 160, label: '8 detik' },
            { value: 10, tokens: 200, label: '10 detik' },
        ],
        modes: null, // No mode selection
        canExtend: false,
        hasAudio: true,
    },
};

// In component:
<div className="space-y-4">
    <Label>Video Type</Label>
    <div className="grid grid-cols-2 gap-4">
        <button
            onClick={() => setVideoTier('standard')}
            className={cn(
                "p-4 rounded-xl border-2 text-left",
                videoTier === 'standard' 
                    ? "border-primary bg-primary/10" 
                    : "border-border"
            )}
        >
            <div className="font-medium">⚡ Standard</div>
            <div className="text-sm text-muted-foreground">
                Kling - No audio, can extend
            </div>
            <div className="text-xs text-muted-foreground mt-1">
                50-140 tokens
            </div>
        </button>
        
        <button
            onClick={() => setVideoTier('premium')}
            className={cn(
                "p-4 rounded-xl border-2 text-left",
                videoTier === 'premium' 
                    ? "border-primary bg-primary/10" 
                    : "border-border"
            )}
        >
            <div className="font-medium">🎬 Premium</div>
            <div className="text-sm text-muted-foreground">
                Veo 3.1 - Native audio
            </div>
            <div className="text-xs text-muted-foreground mt-1">
                100-200 tokens
            </div>
            <div className="text-xs text-green-500 mt-1">
                🔊 Includes voice, SFX, ambient
            </div>
        </button>
    </div>
</div>
```

---

## 🔄 Migration Path

### Phase 1: Setup fal.ai (Week 1)
- [ ] Sign up fal.ai account
- [ ] Get API key, add to env
- [ ] Install `@fal-ai/serverless-client`
- [ ] Test Veo 3.1 endpoint manually

### Phase 2: Implement Premium Tier (Week 1-2)
- [ ] Create `/api/generate-video-premium` endpoint
- [ ] Update token calculator with premium pricing
- [ ] Add video tier selection to UI
- [ ] Test end-to-end flow

### Phase 3: Integration (Week 2)
- [ ] Update video generator component
- [ ] Add provider badge to gallery
- [ ] Update pricing page with new tiers
- [ ] A/B test with small user group

### Phase 4: Launch (Week 3)
- [ ] Full rollout to all users
- [ ] Monitor costs and usage
- [ ] Collect user feedback
- [ ] Optimize based on data

---

## 📊 Comparison: Current vs Hybrid

| Metric | Current (Kling Only) | Hybrid Strategy |
|--------|---------------------|-----------------|
| **Revenue Potential** | Rp 70M | **Rp 99M** (+41%) |
| **Average Margin** | 50% | **47%** |
| **Audio Capability** | ❌ V2A only | ✅ Native Veo |
| **Premium Tier** | ❌ | ✅ |
| **User Choice** | Limited | **Extensive** |
| **Differentiation** | Low | **High** |

### Value Proposition

```
┌─────────────────────────────────────────────────────────────────┐
│                    CUSTOMER VALUE LADDER                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  BUDGET USER                                                    │
│  └── Image: Sumopod (Rp 2K)                                    │
│  └── Video: Kling 5s Basic (Rp 10K)                            │
│                                                                 │
│  REGULAR USER                                                   │
│  └── Image: Sumopod HD (Rp 4K)                                 │
│  └── Video: Kling 10s Pro (Rp 28K)                             │
│  └── Extend: +5s (Rp 12K)                                      │
│                                                                 │
│  PREMIUM USER                                                   │
│  └── Image: Sumopod Ultra (Rp 8K)                              │
│  └── Video: Veo 3.1 10s + Audio (Rp 40K)                       │
│      🔊 Native audio: voice, SFX, ambient                      │
│      🎬 Cinematic quality                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## ✅ Summary

### Quick Reference

| Content | Provider | Endpoint | Tokens |
|---------|----------|----------|--------|
| Image | Sumopod | `/api/generate-image` | 10-40 |
| Video Standard | Kling | `/api/generate-video` | 50-140 |
| Video Premium | fal.ai Veo 3.1 | `/api/generate-video-premium` | 100-200 |
| Extend | Kling | `/api/extend-video` | 60 |

### Key Benefits

1. **No Breaking Changes** - Existing endpoints tetap jalan
2. **Progressive Enhancement** - Premium tier sebagai add-on
3. **Clear Differentiation** - Standard vs Premium dengan value jelas
4. **Higher Revenue** - +41% potential dengan premium tier
5. **Best Audio** - Veo 3.1 native audio quality terbaik

### Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| fal.ai downtime | Fallback ke Kling + V2A |
| Veo pricing change | Monitor, adjust tokens |
| User confusion | Clear UI, tooltips |
| Higher API cost | Premium pricing covers it |

---

## 📝 Environment Variables

```env
# Existing
SUMOPOD_API_KEY=...
KLING_ACCESS_KEY=...
KLING_SECRET_KEY=...

# New
FAL_KEY=...
```

---

*Document Version: 1.0*  
*Last Updated: January 2026*  
*Strategy: Hybrid (Sumopod + Kling + fal.ai Veo 3.1)*
