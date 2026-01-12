# UI Design Prompt Reference Guide

> Comprehensive reference untuk menghasilkan UI berkualitas tinggi dengan AI tools seperti Claude, v0.dev, Aura.build, dan lainnya.

---

## 📋 Quick Reference Cheatsheet

```
PROMPT FORMULA:
Build [specific components and data].
Used by [user role],
in [usage moment],
to [desired outcome].

Constraints:
- platform/device
- visual tone
- layout expectations
```

### Prompt Quality Checklist
- [ ] Specific components disebutkan (bukan "dashboard", tapi "dashboard dengan 6 KPI cards")
- [ ] Target audience jelas (role, age, device preference)
- [ ] Visual style defined (minimalist, playful, corporate, etc.)
- [ ] Color palette specified (hex codes atau nama warna)
- [ ] Responsive behavior disebutkan
- [ ] Key interactions dijelaskan

---

## 🎨 Design Principles (UX Laws)

### 1. Aesthetic-Usability Effect
> Users perceive aesthetically pleasing designs as more usable.

**Implementation:**
```jsx
// ✅ Good - Clean, consistent spacing
<div className="space-y-4 p-6">
  <h2 className="text-xl font-semibold tracking-tight">Title</h2>
  <p className="text-muted-foreground leading-relaxed">Content</p>
</div>

// ❌ Bad - Inconsistent, cramped
<div className="p-2">
  <h2 className="text-lg font-bold">Title</h2>
  <p className="text-gray-500">Content</p>
</div>
```

**Tailwind Tips:**
- Use consistent spacing scale: `gap-2`, `gap-4`, `gap-6`
- Typography hierarchy: `text-sm` → `text-base` → `text-lg` → `text-xl`
- Subtle shadows: `shadow-sm`, `shadow-md` for depth
- Border separators: `border-b border-border` between sections

---

### 2. Hick's Law
> More choices = more decision time = worse UX.

**Implementation:**
```jsx
// ✅ Good - Progressive disclosure
<Collapsible>
  <CollapsibleTrigger>Advanced Options</CollapsibleTrigger>
  <CollapsibleContent>
    {/* Complex options hidden by default */}
  </CollapsibleContent>
</Collapsible>

// ❌ Bad - All options visible
<div>
  {allOptions.map(option => <Toggle key={option.id} />)}
</div>
```

**Tailwind Tips:**
- Hide secondary actions: `hidden group-hover:block`
- Collapsible sections with smooth transitions
- Primary action prominent, secondary actions subtle

---

### 3. Jakob's Law
> Users prefer interfaces that work like ones they already know.

**Implementation:**
- Table lists untuk data management
- Modals untuk confirmations dan forms
- Top bar untuk primary navigation
- "Add New" button di top-right
- Status badges dengan warna standar (green=success, red=error)

**Pattern Reference:**
```jsx
// Standard action placement
<div className="flex items-center justify-between mb-6">
  <h1 className="text-2xl font-bold">Items</h1>
  <Button>
    <Plus className="w-4 h-4 mr-2" />
    Add New
  </Button>
</div>
```

---

### 4. Fitts's Law
> Larger, closer targets are faster to click.

**Implementation:**
```jsx
// ✅ Good - Large, accessible targets
<Button size="lg" className="px-8 py-4">
  Primary Action
</Button>

// ✅ Good - Icon buttons with proper spacing
<div className="flex items-center gap-2">
  <Button variant="ghost" size="icon" className="h-10 w-10">
    <Edit className="h-5 w-5" />
  </Button>
  <Button variant="ghost" size="icon" className="h-10 w-10">
    <Trash className="h-5 w-5" />
  </Button>
</div>

// ❌ Bad - Tiny, cramped targets
<div className="flex gap-0.5">
  <button className="p-1"><Edit className="h-3 w-3" /></button>
  <button className="p-1"><Trash className="h-3 w-3" /></button>
</div>
```

**Minimum Touch Targets:**
- Mobile: 44x44px minimum
- Desktop: 32x32px minimum
- Spacing between targets: `gap-2` minimum

---

### 5. Law of Proximity
> Elements close together are perceived as related.

**Implementation:**
```jsx
// ✅ Good - Grouped related controls
<Card className="p-4 space-y-4">
  <div className="space-y-2">
    <Label>Email</Label>
    <Input type="email" />
  </div>
  <div className="space-y-2">
    <Label>Password</Label>
    <Input type="password" />
  </div>
</Card>

// Visual grouping with containers
<div className="grid grid-cols-2 gap-6">
  <Card className="p-4">
    {/* Related settings group 1 */}
  </Card>
  <Card className="p-4">
    {/* Related settings group 2 */}
  </Card>
</div>
```

---

### 6. Zeigarnik Effect
> Incomplete tasks are remembered better than completed ones.

**Implementation:**
```jsx
// Progress indicators
<div className="flex items-center gap-2 mb-4">
  <span className="text-sm text-muted-foreground">Step 2 of 4</span>
  <Progress value={50} className="flex-1" />
</div>

// Unsaved changes banner
{hasUnsavedChanges && (
  <div className="fixed top-0 inset-x-0 bg-yellow-500/10 border-b border-yellow-500/30 px-4 py-2">
    <span className="text-sm text-yellow-600">Unsaved changes</span>
  </div>
)}

// Saving state feedback
<Button disabled={isSaving}>
  {isSaving ? (
    <>
      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      Saving...
    </>
  ) : (
    "Save Changes"
  )}
</Button>
```

---

### 7. Goal-Gradient Effect
> Motivation increases as users approach their goal.

**Implementation:**
```jsx
// Stepper with active state
<div className="flex items-center gap-2">
  {steps.map((step, i) => (
    <div
      key={i}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-full",
        i === currentStep
          ? "bg-primary text-primary-foreground"
          : i < currentStep
            ? "bg-primary/20 text-primary"
            : "bg-muted text-muted-foreground"
      )}
    >
      {i < currentStep ? <Check className="w-4 h-4" /> : <span>{i + 1}</span>}
      {step.label}
    </div>
  ))}
</div>

// Progress bar with percentage
<div className="space-y-2">
  <div className="flex justify-between text-sm">
    <span>Profile completion</span>
    <span className="text-primary font-medium">75%</span>
  </div>
  <Progress value={75} />
</div>
```

---

### 8. Law of Similarity
> Similar elements are perceived as related/grouped.

**Implementation:**
```jsx
// Consistent button styles
const buttonVariants = {
  primary: "bg-primary text-white hover:bg-primary/90",
  secondary: "bg-secondary text-secondary-foreground",
  destructive: "bg-destructive text-destructive-foreground",
  ghost: "hover:bg-accent",
};

// Consistent badge styles
const badgeVariants = {
  success: "bg-green-500/10 text-green-600 border-green-500/30",
  warning: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
  error: "bg-red-500/10 text-red-600 border-red-500/30",
  info: "bg-blue-500/10 text-blue-600 border-blue-500/30",
};

// Icon sizing consistency
// Small: w-4 h-4
// Medium: w-5 h-5
// Large: w-6 h-6
```

---

### 9. Miller's Law
> People can hold ~7 items in working memory.

**Implementation:**
```jsx
// Chunk into sections
<Tabs defaultValue="general">
  <TabsList>
    <TabsTrigger value="general">General</TabsTrigger>
    <TabsTrigger value="advanced">Advanced</TabsTrigger>
    <TabsTrigger value="notifications">Notifications</TabsTrigger>
  </TabsList>

  <TabsContent value="general">
    {/* 5-7 options max per tab */}
  </TabsContent>
</Tabs>

// Collapsed by default for advanced options
<Accordion type="single" collapsible>
  <AccordionItem value="advanced">
    <AccordionTrigger>Advanced Settings</AccordionTrigger>
    <AccordionContent>
      {/* Complex options */}
    </AccordionContent>
  </AccordionItem>
</Accordion>
```

---

### 10. Doherty Threshold
> System response < 400ms keeps users engaged.

**Implementation:**
```jsx
// Loading skeletons
<div className="space-y-4">
  <Skeleton className="h-12 w-full" />
  <Skeleton className="h-12 w-3/4" />
  <Skeleton className="h-12 w-1/2" />
</div>

// Optimistic UI
const handleLike = async () => {
  setLiked(true); // Optimistic update
  try {
    await api.like(id);
  } catch {
    setLiked(false); // Revert on error
  }
};

// Shimmer effect
<div className="animate-pulse bg-gradient-to-r from-muted via-muted/50 to-muted bg-[length:200%_100%]" />
```

---

## 📝 Prompt Templates

### Dashboard
```
Create a modern analytics dashboard with:
- 6 KPI cards showing: revenue, users, orders, conversion rate, avg order value, growth %
- Line chart for revenue trend (last 30 days)
- Bar chart for top products
- Recent activity feed (5 items)
- Date range picker in header

Used by: business owners checking metrics daily on desktop
Visual style: Clean, minimal, dark theme with purple accents
Colors: Background #0a0a0b, Cards #141416, Primary #8b5cf6
```

### Landing Page
```
Create a SaaS landing page with:
- Hero section: headline, subheadline, CTA button, product screenshot
- Features grid: 6 features with icons
- Testimonials carousel: 3 customer quotes with avatars
- Pricing section: 3 tiers (Basic, Pro, Enterprise)
- FAQ accordion: 5 questions
- CTA banner before footer

Target: Startup founders, 25-40, browsing on mobile/desktop
Visual style: Modern, trustworthy, gradient accents
Animations: Subtle fade-in on scroll
```

### Form
```
Create a multi-step onboarding form with:
Step 1: Personal info (name, email, avatar upload)
Step 2: Company details (name, size, industry dropdown)
Step 3: Preferences (checkboxes for features, timezone)
Step 4: Review & submit

Include: Progress indicator, back/next buttons, validation messages
Visual style: Clean, friendly, encouraging
Mobile: Full-width steps, sticky navigation
```

### Settings Page
```
Create a settings page with sidebar navigation:
- Profile section: avatar, name, email, bio
- Account section: password change, 2FA toggle
- Notifications: email preferences toggles
- Billing: current plan, upgrade button, payment method
- Danger zone: delete account (red border, confirmation modal)

Layout: Sidebar left (240px), content area right
Mobile: Collapsible sidebar, full-width content
```

---

## 🎨 Color Palettes

### Dark Theme (Recommended)
```css
--background: #0a0a0b;
--surface-1: #141416;
--surface-2: #1c1c1f;
--surface-3: #242428;
--border: rgba(255, 255, 255, 0.08);
--text-primary: #fafafa;
--text-secondary: #a1a1aa;
--text-muted: #71717a;
--primary: #8b5cf6;      /* Violet */
--primary-hover: #7c3aed;
--success: #22c55e;
--warning: #f59e0b;
--error: #ef4444;
--info: #3b82f6;
```

### Semantic Color Usage
```jsx
// Status badges
const statusColors = {
  active: "bg-green-500/10 text-green-500 border-green-500/30",
  pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30",
  inactive: "bg-gray-500/10 text-gray-500 border-gray-500/30",
  error: "bg-red-500/10 text-red-500 border-red-500/30",
};

// Interactive states
const interactiveStates = `
  hover:bg-white/5
  active:bg-white/10
  focus:ring-2 focus:ring-primary/50
  transition-colors
`;
```

---

## 🔤 Typography System

### Font Pairing Recommendations
```css
/* Display/Headings */
font-family: 'Sora', 'Inter', system-ui;

/* Body Text */
font-family: 'Inter', -apple-system, system-ui;

/* Monospace/Code */
font-family: 'JetBrains Mono', 'Fira Code', monospace;
```

### Scale
```jsx
// Tailwind classes
text-xs   // 12px - Labels, captions
text-sm   // 14px - Secondary text
text-base // 16px - Body text
text-lg   // 18px - Emphasized body
text-xl   // 20px - H4
text-2xl  // 24px - H3
text-3xl  // 30px - H2
text-4xl  // 36px - H1
text-5xl  // 48px - Display

// Weight pairing
font-normal  // Body text
font-medium  // Labels, buttons
font-semibold // Subheadings
font-bold    // Headings
```

---

## ⚠️ Common Mistakes to Avoid

### 1. Frankenstein Layouts
❌ Vague prompt: "Make a dashboard"
✅ Specific prompt: "Create a dashboard with 4 KPI cards, a line chart, and a data table"

### 2. Missing Visual Hierarchy
❌ All text same size and weight
✅ Clear hierarchy: Large bold headings, medium labels, small muted descriptions

### 3. Poor Spacing
❌ Inconsistent gaps: `gap-1`, `gap-5`, `gap-3`
✅ Consistent scale: `gap-2`, `gap-4`, `gap-6`, `gap-8`

### 4. Overloaded Screens
❌ 15+ options visible at once
✅ Chunked into tabs/sections, 5-7 items per view

### 5. Tiny Touch Targets
❌ Icon buttons 24px
✅ Icon buttons 40px+ with `p-2` padding

### 6. No Loading States
❌ Empty screen while loading
✅ Skeleton loaders, spinners, progress indicators

### 7. Ignoring Mobile
❌ Desktop-only design
✅ "Mobile: [specific behavior]" in every prompt

---

## 🔄 Iteration Workflow

### Phase 1: Structure
```
Focus on: Layout, components, data structure
Prompt: "Create [component] with [specific sections/data]"
```

### Phase 2: Visual Polish
```
Focus on: Colors, typography, spacing
Prompt: "Update styling: [specific changes]"
Or use: Design Mode for quick visual adjustments
```

### Phase 3: Interactions
```
Focus on: Hover states, animations, transitions
Prompt: "Add hover effects to cards, smooth transitions"
```

### Phase 4: Responsive
```
Focus on: Mobile/tablet layouts
Prompt: "Make responsive: [specific mobile behavior]"
```

### Phase 5: Edge Cases
```
Focus on: Empty states, loading, errors
Prompt: "Add empty state, loading skeleton, error message"
```

---

## 📚 Resources

- [Vercel v0.dev Prompting Guide](https://vercel.com/blog/how-to-prompt-v0)
- [Aura.build Learning Center](https://www.aura.build/learn)
- [NN/g - Design Principles](https://www.nngroup.com/articles/)
- [Laws of UX](https://lawsofux.com/)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)

---

*Last updated: January 2025*
