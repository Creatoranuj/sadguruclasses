
## Understanding All 4 Issues

### Issue 1: Progress Bar — Not Logical on My Courses & Courses
Looking at `MyCourses.tsx` lines 187-219:
- Progress is calculated as: `completedLessons / totalLessons * 100`
- `totalLessons` = all lessons in the course
- `completedLessons` = lessons in `user_progress` where `completed = true` AND `course_id` matches

**The Bug**: In MyCourses.tsx the `progressRes` query fetches ALL user_progress for the user across ALL courses (no `course_id` filter on the parallel query at line 187-196). Then it filters by `p.course_id === course.id` in the map. This is correct logic BUT:
- The `completedLessons` count is filtered by `course_id` ✓
- The `totalLessons` count uses ALL lessons from the course ✓

Actually this looks fine. The real issue might be that `user_progress` is populated correctly but the `course_id` field on `user_progress` might be null in some records — the progress table inserts might not always store `course_id`.

Also in `MyCourseDetail.tsx` lines 242-243: the overall progress bar at the top uses `totalLessons` and `totalCompleted` which is correct.

But looking at the **Courses page** (`/courses`) — let me check if it has a separate progress calculation.

The main visual bug the user is pointing to from the screenshot (second image): the time display shows "5:36 / 5:36" which is the current time / duration showing identical values — this is actually in the VIDEO PLAYER, not the progress bar.

Wait, re-reading the user: "progress baar not logical working on my courses and corses" — these are two separate pages:
- `/my-courses` (MyCourses.tsx) — has Progress bar showing completed/total
- `/courses` (Courses.tsx) — might also show progress

The fix needed: In MyCourses.tsx, the `progressRes` query at line 187 fetches ALL progress (no `course_id` filter), then filters in JS. This is fine. But the `statusFilter === "in-progress"` check at line 282 excludes courses with `progressPercent === 0` from "in-progress" filter. So a course with 0 completed lessons doesn't show in "in-progress" — that's actually correct UX-wise.

The real logical issue: `MyCourses.tsx` line 189 - the progress query has NO `course_id` filter, fetching ALL progress for the user. This is fine for correctness but could show wrong numbers if there are bugs in the course_id field.

More importantly: the progress bar shows `{course.completedLessons}/{course.totalLessons}` — if a course has 0 total lessons (no lessons added yet), `progressPercent = 0` and shows `0/0`. That's a cosmetic issue.

### Issue 2: Video Player — Rotation section, make CW and CCW arrows away from play button

From the screenshot (second image), looking at the controls bar bottom — the rotate button is a SINGLE toggle button (lines 780-799). The user wants:
- **TWO separate arrows**: clockwise (CW) and anti-clockwise (CCW)  
- Both should be moved AWAY from the play button area (i.e., not in the center overlay, but in the bottom controls bar)
- Currently there's only 1 rotation icon button at the bottom right of controls

The user wants:
- One button for rotate left (CCW / -90°)
- One button for rotate right (CW / +90°)
- These should be in the bottom controls bar but placed appropriately (with spacing)

Currently rotation state is `0` or `90`. We need to expand to support -90, 0, 90, 180 degrees (or just CW and CCW from current rotation).

### Issue 3: Navigation Logic Not Applied in Video Player

From the second screenshot, you can see the video is at "5:36 / 5:36" — the video ended and the time shows 5:36/5:36. The user probably means the "next video" navigation (the SkipForward button for next lecture) isn't working.

Looking at the player:
- `onNextVideo` prop is passed to MahimaGhostPlayer
- The `handleNextVideo` callback just calls `onNextVideo?.()` and hides endscreen
- The SkipForward button at line 748-758 shows only when `onNextVideo` is provided

The issue: In `MyCourseDetail.tsx`, the `UnifiedVideoPlayer` is used (not `MahimaGhostPlayer` directly). Need to check how `onNextVideo` is wired. Let me look at how the video player is called in MyCourseDetail.

Actually from the first screenshot — this seems to be about the Archive.org PDF viewer showing the Archive.org logo/branding at the top (the circled IA logo). The user wants THEIR logo instead.

### Issue 4: Archive PDF Logo — Replace with Their Logo

From screenshot 1: The archive.org logo (the building/library icon) is showing in the PDF reader's header area. The user wants it replaced with their own logo.

Looking at `DriveEmbedViewer.tsx`:
- There's already a top-bar mask at line 179-185 that adds a `52px` background mask to cover archive.org branding
- The iframe header still shows the archive.org logo

The user wants the top mask to show THEIR logo (Sadguru Coaching branding) instead of just a blank background overlay.

Also looking at `ArchiveBookReader.tsx` line 179 — the `CardHeader` shows a `BookOpen` icon with the archive title. The user wants their own logo shown there instead of the archive.org building icon.

## Files to Change

### Fix 1: Progress bar — MyCourses.tsx
The logical issue: `progressPercent` for a course is `0` when user has no progress, but the "Continue" vs "Enroll Now" logic uses `progressPercent > 0`. The real fix is to also check if a user has ANY `user_progress` record (even if `completed = false`) to determine if they've "started" the course. 

Actually the simpler fix: the query at line 187 should also fetch `completed = false` records to count started-but-not-completed lessons. Currently only `completed = true` rows matter for the progress bar — this is correct. The display is fine.

Wait — the user says "progress bar not logical" — looking at MyCourses the progress is `completedLessons/totalLessons`. If `totalLessons = 0` (course has no lessons), the bar shows 0%. That's a display bug — should show "No content yet" instead.

More importantly, there may be a race condition: the progress is fetched without `course_id` filter but then filtered in JS. If the progress data has no `course_id` field set (just `lesson_id`), the filter `p.course_id === course.id` would fail and show 0% always.

**Real fix**: Add `.eq('course_id', ...)` to each course's progress calculation or ensure the course_id field is being set when progress is recorded.

Actually let me reconsider — looking at the code, the `progressRes` at line 187-191 does NOT have a course_id filter. It fetches all user progress. Then at line 213: `const completedLessons = progressData.filter((p: any) => p.course_id === course.id && p.completed)`. If `course_id` column is NULL in `user_progress` table, this would return 0 for every course.

**Fix**: Also filter by lesson_id being in the course's lessons as a fallback:
```
const completedLessons = progressData.filter(
  (p: any) => (p.course_id === course.id || courseLessons.some(l => l.id === p.lesson_id)) && p.completed
);
```

### Fix 2: Rotation — Add separate CW + CCW buttons, move away from play button

**Current state**: Single `rotationIcon` image button toggles 0°↔90°.

**Fix**:
- Add 2 separate buttons: RotateCcw (Lucide) and RotateCw (Lucide) icons
- Each click adds/subtracts 90° from current rotation
- Support: -90°, 0°, 90°, 180° (or just 0°, 90°, 180°, 270° as a cycle)
- Place them in the bottom controls bar (right side), with gap between them and the play button

Actually simpler: Keep the existing single rotation icon but add a second CCW button. Or replace with proper Lucide `RotateCw` and `RotateCcw` buttons.

### Fix 3: Navigation — Wire onNextVideo properly in MyCourseDetail

Need to check UnifiedVideoPlayer and MyCourseDetail to see if onNextVideo is actually passed down. The "navigation logic not applied" likely means the next/prev lesson navigation in the controls bar isn't working.

### Fix 4: Archive PDF top — show Sadguru logo in mask

In `DriveEmbedViewer.tsx` line 179-185:
- Change the top mask from a plain background div to show the Sadguru logo/brand name
- Replace the blank `hsl(var(--background))` fill with a branded mini header

## Plan Summary

### 4 Changes:

**1. `MyCourses.tsx` — Fix progress calculation**
- Change `completedLessons` filter to use lesson_id fallback (in case `course_id` is null in user_progress)
- Show "No lessons yet" indicator when totalLessons === 0

**2. `MahimaGhostPlayer.tsx` — Rotation: two separate CW + CCW buttons**
- Replace single rotation toggle with two Lucide `RotateCw` + `RotateCcw` buttons
- Rotation state supports 0, 90, 180, 270 degrees (step ±90)
- Fullscreen triggers only at 90°/270° (landscape), exits at 0°/180°
- Both buttons placed in bottom right controls bar with proper spacing

**3. `MyCourseDetail.tsx` + `UnifiedVideoPlayer.tsx` — Wire next-lesson navigation**
- Check if `onNextVideo` / `onNextLesson` callback is being passed to the video player
- If not wired, add the next lesson resolution logic and pass it down

**4. `DriveEmbedViewer.tsx` — Archive top mask: show Sadguru branding**
- Replace the blank background top mask with a branded bar showing the Sadguru logo + "Sadguru Coaching" text

Let me check UnifiedVideoPlayer and MyCourseDetail's video player call to understand fix 3.
