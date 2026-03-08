
## Analysis

### Bug: "All Content" folder in ChapterCard doesn't work
Line 830–839: The chapter list renders **all chapters including `__all__`**:
```tsx
chapters.map((chapter) => (
  <ChapterCard ... onClick={() => setSelectedChapterId(chapter.id === "__all__" ? null : chapter.id)} />
))
```
When `__all__` is clicked, `setSelectedChapterId(null)` is called — but `null` means **no chapter selected**, which shows the **chapter grid view** (`!selectedChapterId` block at line 798). So clicking "All Content" folder goes BACK to the chapter grid instead of showing all lessons. This is the core bug.

**Fix**: Filter out `__all__` from the ChapterCard grid (line 830). The `__all__` entry should only live in the sidebar, not in the chapter grid. Students can use "All" tab in the lesson view, or just not filter by chapter.

**Alternative fix (better UX)**: Use a special sentinel value like `"__all__"` as the selectedChapterId (not `null`) to mean "show all lessons". Then update `filteredLessons` to treat `"__all__"` as "no chapter filter". This lets clicking "All Content" both in the ChapterCard grid and sidebar work correctly.

### 3 Tasks

**1. Fix "All Content" folder bug**
- Change `selectedChapterId` semantics: `null` = chapter grid, `"__all__"` = all lessons view
- Update `filteredLessons` (line 261–267): treat both `null` and `"__all__"` as "show all"
- Update `isPlayerOpen` breadcrumbs: treat `"__all__"` as no chapter
- Fix ChapterCard onClick: `chapter.id === "__all__"` → `setSelectedChapterId("__all__")` (not `null`)
- Fix sidebar button onClick (line 701): `chapter.id === "__all__" ? null : chapter.id` → always set `chapter.id`
- Fix ChevronLeft back button (line 760): `selectedChapterId ? setSelectedChapterId(null) : navigate(...)` — keep same (null = back to grid)
- Fix `tabCounts` (line 269–285): treat `"__all__"` same as `null`

**2. Auto-mark lesson complete at 90% watch**
The `UnifiedVideoPlayer` is used at line 369. Need to:
- Add `onProgress` callback to `UnifiedVideoPlayer` that fires when `played >= 0.9`
- Call a `markLessonComplete` function that upserts into `user_progress` (lesson_id, user_id, course_id, completed=true, watched_seconds)
- After marking, refresh chapter progress counts in the sidebar (re-fetch progress data or update state in-place)

Look at `UnifiedVideoPlayer` to check if it supports `onProgress`.

**3. Search + progress bars** — Already implemented per previous messages (lines 652–751). These already exist in current code. ✓

Let me also check UnifiedVideoPlayer for onProgress support.

## UnifiedVideoPlayer check needed

I need to see if UnifiedVideoPlayer accepts an onProgress prop. Let me check.

Actually I already have the file list. Let me read UnifiedVideoPlayer quickly.

Based on the code at line 369:
```tsx
<UnifiedVideoPlayer
  url={selectedLesson.videoUrl}
  title={selectedLesson.title}
  onReady={() => console.log('Video ready')}
/>
```

I need to add `onProgress` handling. Let me check the component.

## Plan

### Fix 1: "All Content" bug — Change null → "__all__" semantics

**Lines to change:**

Line 261–267 (filteredLessons):
```tsx
const filteredLessons = lessons.filter((lesson) => {
  const chapterMatch = !selectedChapterId || selectedChapterId === "__all__"
    ? true
    : lesson.chapterId === selectedChapterId;
```
→ Already correct! The filter handles `"__all__"` correctly.

The real problem: `selectedChapterId === null` shows the chapter grid (line 798 `!selectedChapterId`). When user clicks "All Content" ChapterCard, it calls `setSelectedChapterId(null)` → stays on chapter grid. 

**Fix**: Make "All Content" in the ChapterCard grid set `selectedChapterId("__all__")` instead of `null`:
- Line 837: `onClick={() => setSelectedChapterId(chapter.id === "__all__" ? null : chapter.id)}` 
  → Change to: `onClick={() => setSelectedChapterId(chapter.id)}`
  Wait, but then clicking any chapter including __all__ sets the ID. And lesson view shows when `selectedChapterId` is truthy. That works because `"__all__"` is truthy!

- Line 701 (sidebar): `setSelectedChapterId(chapter.id === "__all__" ? null : chapter.id)` → change to `setSelectedChapterId(chapter.id)` — same fix.

- Line 760 (back button): `selectedChapterId ? setSelectedChapterId(null) : navigate("/my-courses")` — keep as-is, null goes back to chapter grid.

- Lines 269–285 (tabCounts): `selectedChapterId && selectedChapterId !== "__all__"` — already handles "__all__" correctly!

- Line 693 (sidebar isActive): `(!selectedChapterId && chapter.id === "__all__")` → this means "all content" is active when no chapter selected. After our fix, it should be `selectedChapterId === "__all__"`. Change to: `selectedChapterId === chapter.id || (!selectedChapterId && chapter.id === "__all__")` → simplify to `selectedChapterId === chapter.id || (selectedChapterId === null && chapter.id === "__all__")`

- Lines 309–320 (breadcrumbs): `lessonBreadcrumbs` uses `selectedChapter.id !== "__all__"` which is fine.

- Line 766–768 (header title): `selectedChapter && selectedChapter.id !== "__all__"` → fine.

- Line 851: `{selectedChapterId && (` → this correctly shows lesson view when any truthy ID including "__all__" is set.

**Summary of line changes:**
1. Line 701: remove `chapter.id === "__all__" ? null :` → just `setSelectedChapterId(chapter.id)`
2. Line 837: same fix
3. Line 693: isActive condition stays same (since null still means chapter grid, not "__all__")

Wait — after the fix, when will sidebar show "All Content" as active? It should be active when `selectedChapterId === "__all__"`. The current condition at line 693:
```tsx
const isActive = selectedChapterId === chapter.id || (!selectedChapterId && chapter.id === "__all__");
```
This makes "All Content" highlighted when `selectedChapterId === null` (chapter grid view). After fix, it'll be highlighted when `selectedChapterId === "__all__"`. The condition `selectedChapterId === chapter.id` handles this since `chapter.id === "__all__"` and `selectedChapterId === "__all__"` matches. The `(!selectedChapterId && chapter.id === "__all__")` part is now optional but harmless. Leave as-is.

### Fix 2: Auto-mark 90% watch → user_progress upsert + sidebar refresh

Need to check UnifiedVideoPlayer. Based on what we know it uses react-player or similar. I'll add an `onProgress` handler.

The plan:
1. Add `handleVideoProgress` function in the component
2. Track a ref `progressMarkedRef` to avoid repeated DB calls
3. Call `supabase.from("user_progress").upsert(...)` when `played >= 0.9`
4. After upsert: update local `chapters` state in-place to increment `completedLessons` for the matching chapter

```tsx
const progressMarkedRef = useRef<Set<string>>(new Set());

const handleVideoProgress = async (state: { played: number; playedSeconds: number }) => {
  if (!user || !selectedLesson || !courseId) return;
  if (state.played < 0.9) return;
  if (progressMarkedRef.current.has(selectedLesson.id)) return;
  progressMarkedRef.current.add(selectedLesson.id);
  
  try {
    await supabase.from("user_progress").upsert({
      user_id: user.id,
      lesson_id: selectedLesson.id,
      course_id: Number(courseId),
      completed: true,
      watched_seconds: Math.floor(state.playedSeconds),
      last_watched_at: new Date().toISOString(),
    }, { onConflict: "user_id,lesson_id" });
    
    // Update sidebar progress in-place
    setChapters(prev => prev.map(ch => {
      if (ch.id === selectedLesson.chapterId) {
        const already = ch.completedLessons >= ch.lessonCount;
        if (already) return ch;
        return { ...ch, completedLessons: ch.completedLessons + 1 };
      }
      // Also update __all__
      if (ch.id === "__all__") {
        return { ...ch, completedLessons: ch.completedLessons + 1 };
      }
      return ch;
    }));
  } catch (err) {
    console.error("Error marking lesson complete:", err);
  }
};
```

But we need to pass this to UnifiedVideoPlayer. Let me check if it accepts `onProgress`.

## Files to change
- `src/pages/MyCourseDetail.tsx` — all fixes in one file
- `src/components/video/UnifiedVideoPlayer.tsx` — add `onProgress` prop if not present

## Exact plan

### Changes to MyCourseDetail.tsx:

1. **Line 1**: Add `useRef` to React import
2. **Line ~90**: Add `progressMarkedRef = useRef<Set<string>>(new Set())`
3. **Lines 693**: sidebar isActive — no change needed  
4. **Line 701**: `setSelectedChapterId(chapter.id === "__all__" ? null : chapter.id)` → `setSelectedChapterId(chapter.id)`
5. **Line 837**: same fix as line 701
6. **Before line 350 (player view)**: Add `handleVideoProgress` async function + `useRef` for marked lessons
7. **Line 369**: add `onProgress={handleVideoProgress}` to `<UnifiedVideoPlayer>`

### Changes to UnifiedVideoPlayer.tsx:
- Check if `onProgress` prop exists; if not, add it

This is clean and focused. No DB schema changes needed — `user_progress` table already exists with all needed columns. Upsert uses `user_id,lesson_id` conflict key (these exist as columns).

Wait — I need to verify the unique constraint on user_progress exists for the upsert. Looking at the schema: `user_progress` has `user_id` and `lesson_id` columns. The upsert with `onConflict: "user_id,lesson_id"` requires a unique constraint. Let me check if it exists... The schema doesn't explicitly list constraints, but the table likely has a unique constraint since progress is tracked per user+lesson. If not, we may need a migration to add it.

Actually looking at the existing code at lines 193-203, it queries `user_progress` with `eq("user_id", user.id).eq("course_id", ...)`. The table doesn't show an explicit unique constraint in the schema listed. I should use a SELECT + INSERT/UPDATE pattern instead of upsert to be safe, or add a unique constraint.

To be safe: check if record exists first, then insert or update. This avoids needing a DB constraint.
