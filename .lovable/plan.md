
## Problem Diagnosis

### Progress Bar Issues (3 bugs)

**Bug 1 — `handleVideoProgress` chapter counter is broken for `__all__`**
Lines 449–468: The `setChapters` updater creates `newCompleted` from `prev.reduce<string[]>((acc, _) => acc, [])` which is an empty array — it never reads `completedLessonIds`. So the `__all__` chapter's `completedLessons` count never correctly reflects the real completed set. It just does `+1` if `completedLessons < lessonCount`, which is fine for single completions, but after a page reload the DB data repopulates `completedLessonIds` while `chapters.completedLessons` is rebuilt from scratch in `fetchData`. These two can drift.

**Bug 2 — Both `handleVideoProgress` and `handleManualComplete` increment chapters by +1 using `prev` state** — they never cross-check against the real `completedLessonIds` Set. If the same lesson is somehow called twice (component remount, hot-reload), the count goes to `lessonCount+1`.

**Fix**: Derive chapter counts **directly from `completedLessonIds` + `lessons`** instead of blind `+1`. Create a helper `recomputeChapters(completedSet, allLessons, chaptersRaw)` that computes exact counts from source of truth. Call it in both `handleVideoProgress` and `handleManualComplete` after updating `completedLessonIds`.

**Bug 3 — `ChapterCard` displays "Lectures: X/Y"** but Y includes PDFs/DPPs/NOTES in the count (all lesson types share `lessonCount`). The label says "Lectures" but means all lesson types. This is misleading. Fix: change label to "Lessons:" or "Progress:".

### Video Player Issues (3 bugs)

**Bug 4 — `onClick={handleOverlayTap}` + `onTouchStart` both fire on mobile**
On touch devices, both events fire. `handleOverlayTap` checks `!('ontouchstart' in window)` to skip on touch — but this is fine. The real issue: when user taps play button inside the ghost overlay at `z-40`, the click propagates up to the ghost div's `onClick`, which calls `handleOverlayTap`, which on desktop toggles controls (fine). But the center Play button itself has `e.stopPropagation()` so this is already handled. ✓ Not a real bug.

**Bug 5 — Bottom controls bar is outside the inner `<div style={rotationStyle}>` but inside the outer container**
Looking at lines 952–1080: The `BOTTOM CONTROLS BAR` div is at line 953 inside the rotation div (line 602). Wait — checking structure: line 602 opens the rotation div, line 941 closes `</div>` for the ghost overlay, then line 943 is `{showEndScreen...}`, then line 952 is `{/* BOTTOM CONTROLS BAR */}`. Then line 1081 closes with `</div>` for controls, line 1082 has discussion, and line 1138 closes the rotation container.

Actually the controls ARE inside the rotation div — this is correct. ✓

**Real Bug 5 — Progress bar visual glitch**: The `progressPercentage` is derived from `currentTime/duration * 100`. The `currentTime` updates every 250ms via `setInterval` polling. But `setCurrentTime` inside `handleMessage` only fires when `!isSeeking`. This should be fine, but when `duration` is 0 (before `infoDelivery` fires), the `progressPercentage = 0` — fine.

**Real Bug 6 — The thumb `left: calc(${progressPercentage}% - 7px)` overflows** at 100% (goes 7px past the right edge). Should use `calc(${progressPercentage}% - ${progressPercentage * 0.14}px)` or just clamp with `max-w` and `min`. Better fix: use a proper thumb position that stays within bounds: `left: clamp(0px, calc(${progressPercentage}% - 7px), calc(100% - 14px))`.

**Real Bug 7 — Controls bar `pb-2 md:pb-3` with `pt-8`** — on mobile the `pt-8` (32px) top padding for the gradient is applied to the control bar, but the progress bar is inside this. The visible track has `top-1/2 -translate-y-1/2` which should center it in the `h-10` container. This looks fine visually.

**Real Bug 8 — The player center buttons** (skip back/forward and play/pause) are inside the ghost overlay `<div className="absolute inset-0 z-40">`. Their `onClick` has `e.stopPropagation()` which stops bubbling to the ghost div. On mobile, `onTouchStart` on the ghost div fires for these buttons too since they're children — the double-tap detection, long-press timer all trigger when tapping play. This is the core "play button works late" issue residual: the `playerReady` guard in `playVideo()` is fine, but the `longPressTimerRef` starts on every touch of play button and only cancels if finger moves >10px. Tapping play quickly won't move, so `longPressTimerRef` fires after 500ms and activates 2x speed! 

**Bug 8 Fix**: Check if the touch originated from a button/interactive child element and skip swipe/long-press logic in that case. Or: cancel long-press when any `onClick` fires on the center buttons.

## Plan

### File 1: `src/pages/MyCourseDetail.tsx`

**Change 1 — Add `recomputeChapters` helper** after the `tabs` constant (line ~80):
```ts
const recomputeChapterCounts = (
  completedSet: Set<string>,
  allLessons: Lesson[],
  prevChapters: Chapter[]
): Chapter[] => {
  return prevChapters.map(ch => {
    if (ch.id === "__all__") {
      return { ...ch, completedLessons: allLessons.filter(l => completedSet.has(l.id)).length };
    }
    const chLessons = allLessons.filter(l => l.chapterId === ch.id);
    return { ...ch, completedLessons: chLessons.filter(l => completedSet.has(l.id)).length };
  });
};
```

**Change 2 — Fix `handleVideoProgress`** (lines 449–468): Replace the broken chapter updater with `recomputeChapterCounts`. Use the functional `setCompletedLessonIds` + `setChapters` pattern:
```ts
setCompletedLessonIds(prev => {
  if (prev.has(lessonId)) return prev;
  const next = new Set([...prev, lessonId]);
  setChapters(chs => recomputeChapterCounts(next, lessons, chs));
  return next;
});
```

**Change 3 — Fix `handleManualComplete`** (lines 380–392): Same pattern:
```ts
setCompletedLessonIds(prev => {
  if (prev.has(lessonId)) return prev;
  const next = new Set([...prev, lessonId]);
  setChapters(chs => recomputeChapterCounts(next, lessons, chs));
  return next;
});
```
And in the rollback, similarly recompute by removing `lessonId` from prev:
```ts
setCompletedLessonIds(prev => {
  const next = new Set(prev);
  next.delete(lessonId);
  setChapters(chs => recomputeChapterCounts(next, lessons, chs));
  return next;
});
```

**Change 4 — Fix `ChapterCard` label** in `MyCourseDetail.tsx` — the `ChapterCard` receives `lectureCount={chapter.lessonCount}` and `completedLectures={chapter.completedLessons}`. The `ChapterCard` itself shows "Lectures: X/Y". Update `ChapterCard.tsx` label from `Lectures :` to `Progress :` and update the completion text from "All N lectures completed" to "All N lessons completed".

### File 2: `src/components/video/MahimaGhostPlayer.tsx`

**Change 5 — Fix long-press activating on play/skip button taps**: In `onTouchStart` on the ghost overlay, add a check: if the touch target is a `button` element or has a `button` ancestor inside the ghost div, skip the long-press timer and double-tap logic:
```ts
onTouchStart={(e) => {
  // If touch is on an interactive child button, skip gesture logic
  const target = e.target as HTMLElement;
  if (target.closest('button') && target.closest('button') !== e.currentTarget) {
    handleOverlayTouchStart(e);
    return;
  }
  // ... rest of gesture logic
```

**Change 6 — Progress bar thumb clamping**: Change line 980 from:
```
style={{ left: `calc(${progressPercentage}% - 7px)` }}
```
to:
```
style={{ left: `clamp(0px, calc(${progressPercentage}% - 7px), calc(100% - 14px))` }}
```

**Change 7 — Player visual polish**:
- Remove the `aspect-video` inner container class issue: when not fullscreen the inner div uses `aspect-video`, which is correct. No change needed here.
- Add `will-change: width` to the progress fill divs for GPU-accelerated animation.
- The `showControls` fade has `duration-200` for show and `duration-500` for hide — already done in previous version. ✓
- Ensure the buffered and played track inner divs also use `transition-none` for the played track so it doesn't lag behind real-time updates: change `transition-all` on the blue played bar to `transition-none` (it should update instantly, not animate, since it's live data).

### File 3: `src/components/course/ChapterCard.tsx`

**Change 8 — Label fix**: Update "Lectures :" → "Progress :" and "All N lectures completed" → "All N lessons done".

## Summary of Changes

| File | Lines | Change |
|---|---|---|
| `MyCourseDetail.tsx` | ~80 | Add `recomputeChapterCounts` helper function |
| `MyCourseDetail.tsx` | 380–392 | `handleManualComplete` — use `recomputeChapterCounts` for accuracy |
| `MyCourseDetail.tsx` | 441–468 | `handleVideoProgress` — use `recomputeChapterCounts` for accuracy |
| `MahimaGhostPlayer.tsx` | 690–742 | Skip gesture logic when touch is on a child button |
| `MahimaGhostPlayer.tsx` | 975–976 | Remove `transition-all` from live progress bar fill; add `will-change` |
| `MahimaGhostPlayer.tsx` | 980 | Clamp thumb position to prevent overflow at 100% |
| `ChapterCard.tsx` | 52–56 | Fix "Lectures" label to "Lessons" for correctness |
