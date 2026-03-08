
## Analysis

### Current State
- **Dashboard.tsx**: Student view renders `BatchSelector` → `LiveBadge` → `UpcomingLiveSessions` → course card → quick actions. The hero banner slot goes right at the top (after BatchSelector), before the live badge.
- **Admin.tsx**: 10-tab panel (`grid-cols-10`). A new "Banners" tab needs to be added → becomes `grid-cols-11`.
- **embla-carousel-react** is already installed (`^8.3.0`). No new dependencies needed.
- **dnd-kit** is already in use in `AdminUpload.tsx` and `AdminQuizManager.tsx` — same pattern for drag-to-reorder in the banner manager.
- `hero_banners` table does NOT exist in Supabase yet → needs a migration.

### Uploaded Images
- Two Sadguru (sage in orange robes) images — these are the "Sadguru" mascot/avatar.
- Four "Naveen Bharat" (NB fist logo) images — these will be used in sample banner content, not directly embedded as reference logos unless the user wants them. Since the user says "referencing last Ke Do Jo Hain Use format mein banana hai" (make them in the format of the last two that were uploaded — the pw.live screenshots), I'll use these Naveen Bharat logos as sample banner content for the default banners.
- pw.live screenshots — reference for the carousel format.

### Plan

---

## Database: `hero_banners` table

```sql
CREATE TABLE public.hero_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text,
  description text,
  image_url text,
  bg_color text DEFAULT '#1e40af',
  badge_text text,
  cta_text text DEFAULT 'Explore Now',
  cta_link text DEFAULT '/courses',
  position integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.hero_banners ENABLE ROW LEVEL SECURITY;

-- Public read (for students dashboard)
CREATE POLICY "Anyone can view active banners"
  ON public.hero_banners FOR SELECT
  USING (is_active = true);

-- Admin write
CREATE POLICY "Admins can manage banners"
  ON public.hero_banners FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));
```

Seed 3 default banners matching the "Sadguru Coaching Classes" brand.

---

## Files to Create

### `src/components/dashboard/HeroCarousel.tsx`
A fully self-contained component:
- Fetches active banners from `hero_banners` ordered by `position`
- Uses `useEmblaCarousel` with `loop: true` option (already installed)
- **Auto-slide**: `useEffect` with `setInterval` (6s), clears on unmount
- **Pause on hover**: `onMouseEnter` / `onMouseLeave` toggle a `isPaused` ref
- **Arrows**: Left/right buttons using Embla's `scrollPrev` / `scrollNext`
- **Dots**: Map over slides, click sets `api.scrollTo(i)`
- **Active slide tracking**: `api.on('select', ...)` updates `currentIndex`
- Each banner slide renders: badge text, headline (large bold), subtitle/description, CTA button that uses `useNavigate` (internal) or `window.open` (external)
- Background: gradient or image with overlay
- Falls back to 3 hardcoded sample banners if DB is empty

### `src/hooks/useHeroBanners.ts`
```typescript
// Fetches active banners ordered by position
const { data: banners, refetch } = useQuery(...)
```

---

## Files to Modify

### `src/pages/Dashboard.tsx`
Insert `<HeroCarousel />` right after `<BatchSelector />` and before `<LiveBadge />` in the student section.

### `src/pages/Admin.tsx`
1. Add `"banners"` tab to the `TabsList` → change `grid-cols-10` to `grid-cols-11`
2. Add `<TabsContent value="banners">` containing the `HeroBannerManager` component
3. Import the new manager component

### `src/components/admin/HeroBannerManager.tsx` (NEW)
Full CRUD + reorder UI:
- **State**: `banners[]`, form for add/edit (title, subtitle, description, image_url, bg_color, badge_text, cta_text, cta_link, is_active)
- **Add form**: card at top with all fields + "Add Banner" button
- **Image upload**: option to paste URL OR upload file to `content` Supabase bucket
- **List**: drag-and-drop using dnd-kit's `DndContext` + `SortableContext` (same pattern as AdminUpload.tsx)
  - Each item: drag handle, banner preview thumbnail (color swatch + title), toggle enable/disable switch, edit button (inline), delete button
- **Reorder persistence**: `onDragEnd` → update `position` values in DB for all items
- **Live preview panel**: small preview card showing how the banner looks

---

## Summary

```text
CREATE (DB migration):
  hero_banners table + RLS policies + 3 seed rows

CREATE (files):
  src/components/dashboard/HeroCarousel.tsx    Auto-sliding carousel on dashboard
  src/hooks/useHeroBanners.ts                  Supabase query hook
  src/components/admin/HeroBannerManager.tsx   Admin CRUD + drag-reorder UI

MODIFY:
  src/pages/Dashboard.tsx     Add <HeroCarousel /> after BatchSelector
  src/pages/Admin.tsx         Add "Banners" tab + import HeroBannerManager

NO CHANGES NEEDED:
  embla-carousel-react        Already installed, no new deps
  dnd-kit                     Already installed and used in same pattern
  Supabase RLS auth           Existing has_role() function used
```

### Visual Design for Banners
Following the pw.live reference (colorful gradient banners with bold offer text):
- Banner 1: Saffron/orange gradient — "40% OFF on All Batches | Enroll Now"
- Banner 2: Deep blue gradient — "NEET 2026 Target Batch | Starting Soon"  
- Banner 3: Green gradient — "Free Scholarship Test | Register Now"

Each banner: badge chip top-left, big bold headline, subtitle, CTA button right-aligned or bottom, optional mascot image on right side (the uploaded Sadguru/NB images can be set as `image_url` from the DB).
