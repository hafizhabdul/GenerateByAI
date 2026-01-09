# Performance & Security Audit Report

## Executive Summary
Image/video generator for Indonesian customers. Well-structured Next.js app with good security headers and token-based rate limiting. Found **9 issues** to address incrementally—mostly performance optimizations and security hardening.

---

## 🔴 CRITICAL ISSUES

### 1. **In-Memory Rate Limiting - Lost on Deployment**
**File:** `lib/rate-limit.ts`
**Severity:** HIGH
**Problem:** Rate limits use in-memory Map that resets on every deployment/pod restart. This breaks protection in production (Netlify functions are stateless).

**Impact:**
- Users can exceed limits by hammering API during deployment
- No persistent rate limiting across function restarts

**Fix:** Migrate to Supabase or Redis
```ts
// Move to database: store {user_id, endpoint, count, reset_time}
// Query before each request instead of Map
```

---

### 2. **CSP is Too Permissive**
**File:** `next.config.ts` (line 26-36)
**Severity:** MEDIUM
**Problem:** 
- `script-src 'unsafe-inline' 'unsafe-eval'` - allows inline scripts (XSS risk)
- `style-src 'unsafe-inline'` - allows style injection
- Wildcard patterns `https://ai.sumopod.com` and `https://*.supabase.co` are broad

**Recommended Fix:**
```ts
"script-src 'self' 'nonce-{random}'", // Use nonce for inline scripts
"style-src 'self' 'nonce-{random}'",  // Use nonce for inline styles
// More specific domains:
"img-src 'self' data: blob: https://supabase.co https://ai.sumopod.com https://oaidalleapiprodscus.blob.core.windows.net",
```

---

### 3. **Download Endpoint - SSRF Risk**
**File:** `app/api/download/route.ts` (line 22-49)
**Severity:** MEDIUM
**Problem:**
- Allowlist exists but includes broad domains: `"supabase.co"` (no subdomain boundary check)
- Could potentially be exploited: `https://evil-supabase.co.attacker.com`
- No `Content-Length` limit check before downloading (user could cause large memory use)

**Fix:**
```ts
// Stricter allowlist - no wildcards
const allowedDomains = [
  "files.supabase.co",      // NOT "supabase.co"
  "cdn.supabase.co",
  "cdn.fal.media",
  "cdn.kwai.net",
];

// Add max download size
const maxSize = 500 * 1024 * 1024; // 500MB
const contentLength = parseInt(response.headers.get("content-length") || "0");
if (contentLength > maxSize) {
  return NextResponse.json({ error: "File too large" }, { status: 413 });
}
```

---

## 🟡 HIGH PRIORITY ISSUES

### 4. **Token Processing Race Condition - Potential Issue**
**File:** `lib/tokens-server.ts`
**Severity:** MEDIUM
**Problem:**
- Uses Supabase RPC (`reserve_tokens`) for atomic locking (good!)
- BUT: If `commit()` fails after generation succeeds, tokens are lost
- No retry logic or compensation mechanism

**Current Flow:**
```
1. Reserve tokens (atomic) ✓
2. Generate image
3. Commit tokens → if fails, tokens vanish silently ✗
```

**Fix:**
```ts
// Add retry logic in commit()
commit: async () => {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const { error } = await adminClient.rpc('commit_token_charge', {
        p_reservation_id: reservationId
      });
      if (!error) return;
      console.warn(`Commit attempt ${attempt} failed, retrying...`);
      await new Promise(r => setTimeout(r, 1000 * attempt));
    } catch (e) {
      if (attempt === 3) {
        // Alert on failure - tokens may be orphaned
        console.error("[CRITICAL] Token commit failed - manual intervention needed");
      }
    }
  }
}
```

---

### 5. **Unbounded API Requests - No Timeout**
**File:** `lib/fal.ts`, `app/api/generate-image/route.ts`
**Severity:** MEDIUM
**Problem:**
- `fal.subscribe()` (lines 68, 181, 278, 379) has no timeout
- `persistExternalImage()` (lines 7-43) has no timeout on fetch
- Video generation can hang indefinitely, consuming Netlify function timeout

**Fix:**
```ts
import { timeout } from "@/lib/utils";

const imageResult = await timeout(
  fal.subscribe(endpoint, { ... }),
  300000 // 5 minutes max
);

// OR use fetch with AbortSignal
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 30000);
const response = await fetch(externalUrl, { signal: controller.signal });
clearTimeout(timeoutId);
```

---

### 6. **Insufficient Error Details Leaking**
**File:** `app/api/generate-image/route.ts`, etc.
**Severity:** LOW-MEDIUM
**Problem:**
```ts
// Line 130-134 - errors might leak details
return NextResponse.json(
  { error: error.message || "Failed to generate image" },
  { status: 500 }
);
```

Stack traces or API keys could leak in `error.message`.

**Fix:**
```ts
return NextResponse.json(
  { error: "Generation failed. Please try again." },
  { status: 500 }
);
// Log full error server-side only
console.error("[Internal] Generation error:", error);
```

---

## 🟢 MEDIUM PRIORITY ISSUES (Performance)

### 7. **Large Blob Downloads in Memory**
**File:** `app/api/download/route.ts` (line 58-59)
**Severity:** MEDIUM (Performance)
**Problem:**
```ts
const blob = await response.blob(); // Entire file in memory!
const buffer = await blob.arrayBuffer();
```

For a 100MB video, this loads everything into RAM before streaming.

**Fix:** Stream directly to response
```ts
// Use streaming instead
return new NextResponse(response.body, {
  headers: {
    "Content-Type": contentType,
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Cache-Control": "public, max-age=86400",
  }
});
```

---

### 8. **Image Generation - No Caching or Deduplication**
**File:** `app/api/generate-image/route.ts`
**Severity:** MEDIUM (Performance)
**Problem:**
- If user sends identical prompt twice in 30s, both hit fal.ai API
- No request deduplication or caching

**Suggested Fix:**
```ts
// Check if exact same prompt generated in last 5 minutes
const { data: recentGen } = await supabase
  .from('generations')
  .select('*')
  .eq('user_id', user.id)
  .eq('prompt', prompt)
  .eq('type', 'image')
  .gte('created_at', new Date(Date.now() - 5 * 60000).toISOString())
  .single();

if (recentGen) {
  return NextResponse.json({
    url: recentGen.file_url,
    generationId: recentGen.id,
    cached: true
  });
}
```

---

### 9. **No Logging/Monitoring for Cost Tracking**
**File:** Multiple API routes
**Severity:** MEDIUM (Business)
**Problem:**
- No request logging for fal.ai/OpenAI API calls
- Can't track actual costs vs. what users paid
- No alerting if API costs spike

**Fix:** Add structured logging
```ts
console.log(JSON.stringify({
  timestamp: new Date().toISOString(),
  event: "image_generation_started",
  userId: user.id,
  quality,
  provider: "fal-gpt-image-1.5",
  estimatedCost: 0.45, // USD
}, null, 0));
```

---

## 📋 ADDITIONAL RECOMMENDATIONS

### Security
- ✅ Good: Supabase RLS + auth middleware
- ✅ Good: Token rate limiting per endpoint
- ⚠️ Add: Request signing for webhook verification (Pakasir)
- ⚠️ Add: Secrets rotation policy (API keys)

### Performance
- ✅ Good: Image optimization (AVIF/WebP)
- ✅ Good: React compiler enabled
- ⚠️ Add: Cache-Control headers on public assets
- ⚠️ Add: API response compression

### Reliability
- ⚠️ Add: Retry logic with exponential backoff for fal.ai calls
- ⚠️ Add: Dead letter queue for failed token commits
- ⚠️ Add: Health check endpoint monitoring

---

## 🔧 Quick Fix Priority

**Week 1 (Critical):**
1. Migrate rate limiting to Supabase
2. Tighten CSP headers
3. Fix SSRF in download endpoint

**Week 2 (Important):**
4. Add timeout to fal.ai calls
5. Stream large downloads instead of buffering
6. Add error logging without leaking details

**Week 3 (Nice-to-have):**
7. Request deduplication for image generation
8. Add monitoring/logging
9. Retry logic for token commits

---

## Testing Checklist

After fixes, verify:
- [ ] Rate limit persists across server restarts
- [ ] CSP reports no violations
- [ ] Download endpoint rejects invalid domains
- [ ] Long-running API calls timeout gracefully
- [ ] Memory usage stable under 500MB videos
- [ ] No secrets in error messages
- [ ] Webhook signatures validated
