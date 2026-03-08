
## What The User Wants

The screenshot shows: when a lesson is clicked, the **video player + Overview/Resources/Notes/Discussion tabs should appear inline within the course page**, NOT as a full-screen takeover overlay. The chapter sidebar must remain visible. The user can switch lessons from the sidebar/lesson list. No redirect to another page.

## Current Behavior (the problem)

Lines 406–658: When `isPlayerOpen && selectedLesson` is true, the entire page returns a `fixed inset-0 z-50` full-screen overlay — hiding the sidebar, hiding the main layout, replacing everything. This is the "redirect-like" experience the user dislikes.

## Target Behavior

```text
┌─────────────────────────────────────────────────────────┐
│  Header                                                 │
├──────────────┬──────────────────────────────────────────┤
│ Chapter      │  ← Back button + lesson title            │
│ Sidebar      │─────────────────────────────────────────-│
│              │  [VIDEO PLAYER]                          │
│  ALL  3/10   │                                          │
│  CH01 2/5    │  Overview │ Resources │ Notes │ Discussion│
│  CH02 1/5    │  ─────────────────────────────────────── │
│  ...         │  [Tab content]                           │
└──────────────┴──────────────────────────────────────────┘
```

## Plan

### Remove the full-screen overlay block (lines 406–658)

The `if (isPlayerOpen && selectedLesson) { return <fixed overlay> }` block will be removed. Instead, the player renders **inside `<main>`** in the existing layout.

### Restructure `<main>` content (lines 854–965)

Change the main content area to show **3 states**:
1. `!selectedChapterId` → chapter grid (existing ✅)
2. `selectedChapterId && !selectedLesson` → lesson list (existing ✅)  
3. `selectedLesson` → **inline lesson player + tabs** (new — replaces the overlay)

When a lesson is selected (`selectedLesson` is truthy), show inside `<main>`:

```
[← Back to lesson list]  Lesson title
[Video Player - full width]
─────────────────────────────────
Overview | Resources | Notes | Discussion
[tab content]
```

Back button calls `handleClosePlayer()` (sets `selectedLesson = null`, clears `?lesson=` param).

### Changes

**Remove**: Lines 405–658 (the `if (isPlayerOpen && selectedLesson)` full-screen block).

**Add inside `<main>` after `{selectedChapterId && (` block**: A new `{selectedLesson && (` block that shows the inline player + tabs. When this is active, hide the lesson list. The `selectedChapterId && !selectedLesson` state shows the lesson list.

**`handleContentClick`** (line 288): For VIDEO lessons, just `setSelectedLesson(lesson)` + `setSearchParams({ lesson: lesson.id })` — same as now. No routing change needed.

**URL**: Keep `?lesson=lessonId` in search params for deep-linking — same as today.

**`handleClosePlayer`**: Same logic — clears lesson, clears search param — but now returns to the lesson list instead of the full-screen overlay.

### Key layout detail for the inline player

The video player inside `<main>`:
- `<UnifiedVideoPlayer>` with `onProgress={handleVideoProgress}` — same as before
- Below it: `<Tabs>` with Overview, Resources, Notes, Discussion — same content as lines 448–653, now inside `<main>` scrollable area
- No `fixed inset-0` — it's just normal page flow

### Files to change
| File | Change |
|------|--------|
| `src/pages/MyCourseDetail.tsx` | Remove full-screen overlay block (lines 405–658). Add inline lesson player inside `<main>` within the existing layout. Sidebar stays visible. |

No other files need to change.
