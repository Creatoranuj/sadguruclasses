
## Two Features to Add

### Feature 1 — Compact List-View Toggle on Lesson List
**Where**: The lesson list area (STATE 2 in `MyCourseDetail.tsx`, lines 757–845), specifically in the tab bar row and the lessons render loop.

**What to build**:
- Add a `viewMode` state: `"card" | "list"`, defaulting to `"card"`, persisted in `localStorage` with key `sadguru_lesson_view`.
- Add a toggle button (LayoutList / LayoutGrid icons from lucide-react) in the top-right of the tab bar area.
- In the lessons render section, when `viewMode === "list"`, render a compact `LectureListRow` inline component instead of `LectureCard`.

**LectureListRow design** (single line, ~44px tall):
```
[TYPE BADGE] [title, truncated, flex-1] [duration or date] [✓ dot or Mark Done]
```
- Type badge: colored pill — VIDEO = blue, PDF = purple, DPP = orange, NOTES = green
- Title: `text-sm font-medium line-clamp-1 flex-1`
- Duration: `text-xs text-muted-foreground` (right side)
- Completion dot: green filled circle if completed, gray outline if not; for non-video also shows a tiny "Mark Done" tap target

**Changes to `LectureCard.tsx`**: 
- Add a `compact` boolean prop (optional, default false).
- When `compact=true`, render the slim row instead of the card.
- This keeps all logic in one component.

### Feature 2 — Course Completion Banner at Top of Lesson List

**Where**: In STATE 2 (lesson list view), just above the tab bar (before line 760), only shown when `selectedChapterId` is set.

**What to show**:
```
[Progress ring or bar]  X of Y lessons completed  (Z%)
```
**Data source**: Already available:
- `completedLessonIds` Set — updated in real-time
- `chapterLessons` = the filtered lessons array for current chapter (or all lessons if `__all__`)

**Design**: A slim card/banner:
- Left: a small circular progress ring (SVG, ~36px) showing Z% with primary color stroke
- Middle: `X of Y lessons · Z% complete`
- Right: green checkmark badge if 100%

**Computing values**: 
- `totalInChapter` = `chapterLessons.length` where `chapterLessons` = lessons filtered by `selectedChapterId` (already used as `filteredLessons` base before tab filter — but needs to use ALL lessons in chapter, not tab-filtered)
- `completedInChapter` = count of `completedLessonIds` intersecting `chapterLessons`

**Implementation note**: The banner should show progress for the current chapter (all types, not tab-filtered), so I'll compute it from `lessons.filter(l => l.chapterId === selectedChapterId || selectedChapterId === "__all__")` and intersect with `completedLessonIds`.

---

## Files to Change

| File | Lines | Change |
|------|--------|--------|
| `src/components/course/LectureCard.tsx` | Full file | Add `compact?: boolean` prop + compact row render |
| `src/pages/MyCourseDetail.tsx` | ~104 | Add `viewMode` state with localStorage init |
| `src/pages/MyCourseDetail.tsx` | ~760 | Add view toggle button next to tab bar |
| `src/pages/MyCourseDetail.tsx` | ~757 | Add completion banner above tab bar |
| `src/pages/MyCourseDetail.tsx` | ~822 | Pass `compact={viewMode === "list"}` to `LectureCard` |

## Compact Row Design (in LectureCard)

```
+------------------------------------------------------------------+
|  [VIDEO]  Chapter 3 - Newton's Laws of Motion     12:34    ✓    |
+------------------------------------------------------------------+
```
- Height: `py-3 px-4` → ~48px
- Type badge: `text-[10px] font-bold uppercase px-2 py-0.5 rounded-full`
  - VIDEO → `bg-blue-100 text-blue-700`
  - PDF → `bg-purple-100 text-purple-700`
  - DPP → `bg-orange-100 text-orange-700`
  - NOTES → `bg-green-100 text-green-700`
- Completion indicator right side:
  - Completed: green filled `CheckCircle2` (16px)
  - Not completed + markable: small "✓" button tap target (no full "Mark Done" text — just an icon)
  - Not completed + video: gray clock or nothing

## Completion Banner Design

```
┌─────────────────────────────────────────────────────┐
│  ◐ [ring]   8 of 24 lessons · 33% complete    →     │
└─────────────────────────────────────────────────────┘
```
- Background: `bg-primary/5 border border-primary/10 rounded-xl`
- Ring: inline SVG circle, `r=14`, circumference=88, `strokeDashoffset = 88 - (pct/100 * 88)`
- Shows "All done! 🎉" with green bg when 100%
- Thin — `px-4 py-2.5`, sits between breadcrumbs and tab bar

## View Toggle Button
- Placed at the right end of the tab bar row (same `flex` row)
- `LayoutList` icon for list mode, `LayoutGrid` for card mode
- `p-1.5 rounded-lg border bg-card` style matching existing sidebar toggle
