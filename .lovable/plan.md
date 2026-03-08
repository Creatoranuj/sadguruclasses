
## Changes to Hero.tsx and Subjects.tsx

### Hero.tsx — exact changes:

**Line 46 — Title (h1):**
- Remove gradient, change to: `text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-foreground`
- This gives it a large, clear non-gradient size as requested (text-4xl/5xl)

**Line 51 — Subheading "India's Most Affordable…":**
- Change to: `text-base md:text-lg text-gray-600 dark:text-gray-400 font-medium tracking-wide`
- Makes it light gray (text-gray-600) as requested

**Line 56 — Subtitle "Quality education…":**
- Change to: `text-lg text-muted-foreground max-w-lg mx-auto lg:mx-0`
- Already text-lg, just clean up to exactly text-lg (remove md:text-xl so it stays smaller)

**Line 62 — Button:**
- Change to: `w-full sm:w-auto h-12 min-w-[160px] rounded-lg bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-md hover:shadow-lg transition-all duration-200 font-semibold px-6 py-3`
- Blue background, white text, rounded-lg (~8px), hover darkens to blue-700, proper padding

**Line 39 — Text content wrapper:**
- Change `space-y-6` to `space-y-8` for proper section margins

---

### Subjects.tsx — exact changes:

The Subjects section already has circle backgrounds and Lucide icons from the previous implementation. The user wants:
- Circle background per icon ✅ already done
- Grid layout (3-4 columns) — currently `grid-cols-2 sm:grid-cols-3 md:grid-cols-5` → change to `grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5` (3 cols on tablet, 4-5 on desktop) — this makes 3 columns visible on mid-size, more request-aligned
- Icon text center aligned ✅ already done
- Make icons slightly bigger for better visual weight: w-16 h-16 with w-8 h-8 icon inside

Minor polish: increase card padding slightly, make icon circles slightly larger.

**Summary of file changes:**
| File | Lines touched |
|------|--------------|
| `src/components/Landing/Hero.tsx` | 39, 46, 51, 56, 62 |
| `src/components/Landing/Subjects.tsx` | 59, 65, 66 |
