
## Analysis of the two screenshots

**Screenshot 1 (video player):** Layout is already correct — `[⏪10] [▶] [⏩10]` centered, `[⚙] [rotation]` in bottom-right. The `SkipForward` next-video arrow in the bottom bar is only shown when `onNextVideo` prop exists — but the user says there are "fatlu ke arrow" (useless arrows). This `SkipForward` button in the bottom controls row shows up alongside the custom skip-10 overlay buttons — that's redundant. Also, the `MessageCircle` discussion button appears in the bottom bar.

**Screenshot 2 (Notes tab):** Shows "Lecture Notes / No notes available for this lesson." — this is from `LessonView.tsx` Notes tab which currently has a plain textarea. The user wants the Notes tab to show the proper `ObsidianNotes` editor (same as `MyCourseDetail`).

**Lesson meta strip (MyCourseDetail line 812-823):**
```
<Clock /> — ★ 4.8 Rating
```
The `—` appears when `duration` is null/missing, and "4.8 Rating" is hardcoded fake data. Both are "fatlu" (useless/fake).

## What to change

### File 1: `src/pages/MyCourseDetail.tsx` — lesson meta strip (lines 812–823)
Remove the fake `4.8 Rating` star + `Clock —` when there's no duration. Instead: show duration if available, or nothing if null.

**Before (lines 812–823):**
```jsx
<div className="flex items-center gap-3 text-sm text-muted-foreground">
  <span className="flex items-center gap-1">
    <Clock className="h-3.5 w-3.5" />
    {selectedLesson.duration ? `${Math.floor(selectedLesson.duration / 60)}m` : "—"}
  </span>
  <span className="flex items-center gap-1">
    <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
    4.8 Rating
  </span>
</div>
```
**After:** Show duration only if it exists. Remove the hardcoded 4.8 Rating star entirely. Remove `Star` and `Clock` from imports if unused.

### File 2: `src/pages/LessonView.tsx` — Notes tab (lines 672–688)
Replace the plain textarea notes section with the proper `ObsidianNotes` component — just like `MyCourseDetail.tsx` already does at line 929-935.

**Before (lines 672–688):** Plain `<Textarea>` with "Your Notes" heading  
**After:** Use `<ObsidianNotes lessonId={currentLesson.id} userId={user?.id} lessonTitle={currentLesson.title} />`  
Add import for `ObsidianNotes` from `@/components/lecture/ObsidianNotes`.

### File 3: `src/components/video/MahimaGhostPlayer.tsx` — remove redundant SkipForward arrow from bottom bar (lines 796–807)
The `SkipForward` Lucide icon in the bottom bar (the "next video" button) is a standard Lucide arrow icon placed right beside the custom skip-10 overlay icons — this is the "fatlu arrow". 

Remove the `SkipForward` next-video button from the bottom controls. Move next-video functionality to only the end screen overlay (which already has a "Next Video" button). The `onNextVideo` callback and `nextVideoTitle` props stay — only the bottom bar button gets removed.

Also remove `SkipForward` from the Lucide import.

## Summary of changes

| File | Change |
|------|--------|
| `MyCourseDetail.tsx` | Remove fake "4.8 Rating" + remove `—` dash when no duration (show nothing instead) |
| `LessonView.tsx` | Replace plain textarea Notes tab with `ObsidianNotes` component |
| `MahimaGhostPlayer.tsx` | Remove the `SkipForward` next-lecture icon from bottom controls bar |
