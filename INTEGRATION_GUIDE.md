# Step-by-Step Integration Guide

## Phase 1: Update Image Generator Component

### File: `components/image-generator.tsx`

This component currently has a `loading` state but no fancy loading UI. Let's add the mascot loading states.

---

## Step 1: Add Import Statement

**Find (line ~186):**
```tsx
export function ImageGenerator() {
    const router = useRouter();
    const searchParams = useSearchParams();
```

**Add this import at the top of the file (after other imports):**
```tsx
import { GenerationLoading } from "./loading-states";
```

**Location:** Add after line 10 (with other component imports)

---

## Step 2: Add Error State

The component needs to track errors. 

**Find (line ~191):**
```tsx
const [loading, setLoading] = useState(false);
const [mode, setMode] = useState<"generate" | "transform">("generate");
```

**Add this state after `loading`:**
```tsx
const [error, setError] = useState<string | null>(null);
```

---

## Step 3: Update the handleGenerate Function

**Find the `handleGenerate` function (around line 450-550)**

**In the try/catch block, update like this:**

```tsx
const handleGenerate = async () => {
    try {
        setError(null);  // Clear previous errors
        setLoading(true);
        
        // ... rest of your generation code ...
        
    } catch (err: any) {
        const errorMessage = err.message || "Failed to generate image";
        setError(errorMessage);
        showToast(errorMessage, "error");
        setLoading(false);
    }
};
```

Key addition: `setError(null)` at start, and `setError(errorMessage)` in catch block.

---

## Step 4: Update the JSX Return - Add Loading UI

**Find the main JSX return (around line 650-900)**

Look for where the feed/results are displayed. Add this BEFORE the feed display:

```tsx
{/* Loading State with Mascot */}
{loading && (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-background/50 backdrop-blur-sm rounded-2xl">
        <GenerationLoading type={mode === "transform" ? "video" : "image"} />
    </div>
)}

{/* Error State with Mascot */}
{error && !loading && (
    <div className="p-6 rounded-2xl bg-destructive/10 border border-destructive/20">
        <div className="flex items-center gap-4">
            <Icon icon="mingcute:alert-circle-fill" className="w-6 h-6 text-destructive" />
            <div className="flex-1">
                <p className="font-semibold text-destructive mb-2">{error}</p>
                <button 
                    onClick={() => setError(null)}
                    className="text-sm text-destructive hover:underline"
                >
                    Dismiss
                </button>
            </div>
        </div>
    </div>
)}
```

---

## Step 5: Replace Generic Button Loading State

**Find the Generate Button (around line 957):**
```tsx
<Button
    onClick={handleGenerate}
    disabled={loading || !prompt.trim() || (mode === "transform" && !transformImage)}
    loading={loading}
    className="rounded-full px-5"
>
    <span>{mode === "transform" ? "Transform" : "Generate"}</span>
</Button>
```

**This is already good** - it already shows loading state. No change needed here.

---

## Step 6: Test It

Run the development server:
```bash
npm run dev
```

1. Go to `http://localhost:3000`
2. Log in or go to image generator
3. Try generating an image
4. You should see the mascot with "thinking" expression while loading

---

## Phase 2: Update Video Component (Same Pattern)

**File:** `components/video-generator.tsx`

Same steps as Phase 1:
1. Import `GenerationLoading`
2. Add `error` state
3. Update error handling in async functions
4. Add mascot loading UI
5. Test

---

## Phase 3: Add Mascot to Empty States

**Files to update:**
- `app/gallery/page.tsx`
- `app/videos/page.tsx`
- Any other pages with list/empty states

**Pattern:**
```tsx
import { Mascot } from "@/components/mascot";

{items.length === 0 && (
    <div className="flex flex-col items-center justify-center min-h-96 gap-6 p-8">
        <Mascot expression="confused" size="large" />
        <div className="text-center">
            <h3 className="text-lg font-bold">Belum ada kreasi</h3>
            <p className="text-muted-foreground">Mari buat sesuatu yang amazing!</p>
        </div>
    </div>
)}
```

---

## Quick Reference: What Each Component Does

### `<GenerationLoading />`
```tsx
<GenerationLoading type="image" />
// Shows: Mascot thinking + spinner + "Creating magic..." message
// Use when: Waiting for API response
```

### `<GenerationError />`
```tsx
<GenerationError 
    message="Kredit habis!" 
    submessage="Beli kredit untuk lanjutkan"
    onRetry={handleRetry}
/>
// Shows: Confused mascot + message + retry button
// Use when: Something goes wrong
```

### `<GenerationSuccess />`
```tsx
<GenerationSuccess 
    message="Berhasil!" 
    actionLabel="Download"
    action={handleDownload}
/>
// Shows: Celebrating mascot + message + action button
// Use when: Generation completed
```

### `<Mascot />`
```tsx
<Mascot expression="thinking" size="large" />
// Expressions: happy, thinking, confused, sleepy, celebrating
// Sizes: small, medium, large, hero
// Use when: You need just the mascot
```

---

## Testing Checklist

After each update:

- [ ] Build passes: `npm run dev` works
- [ ] No TypeScript errors
- [ ] Component renders without errors
- [ ] Loading state shows mascot
- [ ] Error state shows mascot
- [ ] Mobile view looks good
- [ ] Animations are smooth

---

## Common Issues & Fixes

### Issue: Import errors
**Solution:** Make sure you import from correct path:
```tsx
import { GenerationLoading } from "@/components/loading-states";
import { Mascot } from "@/components/mascot";
```

### Issue: Mascot not showing
**Solution:** Check:
1. `/public/mascot.png` exists
2. Import is correct
3. Component is rendering

### Issue: Loading state blocks input
**Solution:** Use `pointer-events-none` on overlay or make it `absolute` positioned

### Issue: Error state won't dismiss
**Solution:** Make sure error state button calls `setError(null)`

---

## Implementation Timeline

- **Today (30 mins):** Update image-generator.tsx
- **Tomorrow (30 mins):** Update video-generator.tsx  
- **This week (1 hour):** Add mascot to empty states
- **Polish (30 mins):** Test on mobile, fix any issues

---

## Files You'll Edit

1. ✏️ `components/image-generator.tsx` - Add loading/error states
2. ✏️ `components/video-generator.tsx` - Add loading/error states
3. ✏️ `app/gallery/page.tsx` - Add empty state mascot
4. ✏️ `app/videos/page.tsx` - Add empty state mascot

No new files needed - just use existing components!

---

## Next Steps

1. Start with **image-generator.tsx**
2. Follow the steps above exactly
3. Test by generating an image
4. Then do same for video component
5. Then add mascot to empty states
6. Commit everything

Good luck! 🐿️✨
