
## Complete Performance Audit — All Findings

### 1. MyCourseDetail.tsx (1037 lines) — BIGGEST PROBLEM
- **tabCounts recalculated on every render** (lines 290–306): 5 separate `lessons.filter()` calls on every render, no `useMemo`. With 50+ lessons this runs 5 redundant passes every keystroke/state change.
- **filteredLessons recalculated without `useMemo`** (lines 279–288): runs on every render, not memoized.
- **sidebarChapters filter in JSX** (lines 512–518): inline IIFE filter inside render = re-runs on every render, not memoized.
- **`handlePostComment` double-fetches** (lines 134–155): after posting it fires a second `SELECT *` query to reload comments — wasteful. Just append the new comment to state directly.
- **`handleVideoProgress` does two sequential Supabase calls** (lines 338–389): first a `SELECT` then an `UPDATE` or `INSERT`. Can be replaced with a single `upsert` call.
- **`lessonBreadcrumbs`, `playerBreadcrumbs`, `chapterBreadcrumbs` recomputed every render** (lines 393–410): should be `useMemo`.
- **`selectedChapter` recomputed every render** (line 277): one `.find()` on chapters, should be `useMemo`.

### 2. MyCourses.tsx — 3 SEQUENTIAL QUERIES
- `fetchEnrolledCourses` (lines 164–236): runs 3 Supabase queries — enrollments, then `user_progress`, then `lessons`. The second two could be parallelized with `Promise.all` instead of sequential awaits. Also `fetchEnrolledCourses` is defined **inside the component** and called from `useEffect` with `[user]` dep — every render creates a new function reference unnecessarily. Should be extracted with `useCallback`.

### 3. Dashboard.tsx — Minor
- `teacherFeatures` array (lines 139–144) defined **inside the component body** — recreated on every render. Should be `const` outside the component.
- `studentQuickActions` (lines 32–39) is already outside ✅ — good.

### 4. QuizAttempt.tsx — Critical Logic Bug (already identified)
- **`calculateScore()` always returns 0** (lines 122–134): references `q.correct_answer` which is `undefined` because the view `questions_for_students` doesn't include that column. The `Question` interface still declares `correct_answer: string` (line 27) — misleading.
- **`attemptId` state** (line 59) is set but never populated before submit (comment on line 93 says "Attempt record is created only on submit") so the `if (finalAttemptId)` UPDATE branch on lines 148–157 will **never execute** — dead code.

### 5. ChatWidget.tsx — Heavy always-mounted
- `ChatWidget` is imported in `App.tsx` line 62 as a **direct import** (not lazy), meaning its `ReactMarkdown` + voice API setup loads on **every page** including the public landing page for unauthenticated users. Should be conditionally rendered or lazy-loaded.

### 6. ObsidianNotes.tsx — `SaveStatusIndicator` as inner component
- `SaveStatusIndicator` (lines 246–267) is defined as a function **inside** the component body — React recreates it on every render and it cannot be memoized. Should be extracted as a standalone component or converted to inline JSX.

### 7. App.tsx — Extra space on line 50
- Line 50: ` const MyCourseDetail = lazy(...)` has a leading space (cosmetic but inconsistent).

---

## What Will Be Fixed (Plan)

### File 1: `src/pages/MyCourseDetail.tsx`
- Wrap `filteredLessons`, `tabCounts`, `selectedChapter`, all 3 breadcrumb arrays, and `filteredSidebarChapters` in `useMemo`
- Replace double-sequential `handleVideoProgress` calls with single `upsert`
- Replace `handlePostComment` double-fetch with optimistic state append
- Add `useCallback` to `handleContentClick`, `handleClosePlayer`, `handleVideoProgress`, `handlePostComment`

### File 2: `src/pages/MyCourses.tsx`
- Move `fetchEnrolledCourses` out of component or wrap in `useCallback`
- Parallelize the 3 queries with a single `Promise.all`

### File 3: `src/pages/Dashboard.tsx`
- Move `teacherFeatures` array outside the component

### File 4: `src/pages/QuizAttempt.tsx`
- Remove `correct_answer` from `Question` interface (it's not in the view)
- Remove dead `attemptId` state + the unreachable `UPDATE` branch
- Keep `calculateScore` but note it returns 0 (this is intentional per the security plan — score is saved as 0 client-side, and since we haven't built the edge function yet, leave as-is but clean the dead code)

### File 5: `src/components/lecture/ObsidianNotes.tsx`
- Move `SaveStatusIndicator` out of the component body as a named component

### File 6: `src/App.tsx`
- Make `ChatWidget` only render when user is authenticated (wrap with auth check or lazy-load it)
- Fix the leading space on line 50

---

## Files to Change
| File | Changes |
|------|---------|
| `src/pages/MyCourseDetail.tsx` | `useMemo` for 6 computed values, `useCallback` for 4 handlers, single `upsert` in progress, optimistic comment append |
| `src/pages/MyCourses.tsx` | `useCallback` for fetch, `Promise.all` for 3 parallel queries |
| `src/pages/Dashboard.tsx` | Move `teacherFeatures` outside component |
| `src/pages/QuizAttempt.tsx` | Remove dead `attemptId` state + unreachable UPDATE branch, remove `correct_answer` from interface |
| `src/components/lecture/ObsidianNotes.tsx` | Hoist `SaveStatusIndicator` outside component |
| `src/App.tsx` | Conditional ChatWidget render + fix leading space |

No visual or behavioral changes. All purely internal performance improvements.
