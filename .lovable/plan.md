
## Full Website Audit — Bugs, Polish & Pending Items

After reading every major file in the project, here is a complete categorized audit.

---

### CATEGORY 1 — VIDEO PLAYER (MahimaGhostPlayer) — 3 remaining issues

**P1-A: `mahima-ghost-player` CSS class never applied to the container div**
In `MahimaGhostPlayer.tsx` line 591, the outer `<div ref={containerRef}>` has `className="relative rounded-xl overflow-hidden bg-black select-none group"` — but the CSS in `index.css` targets `.mahima-ghost-player` for pointer-events blocking on the iframe and YouTube UI removal. The class is never applied. Fix: add `mahima-ghost-player` to the outer container's `className`.

**P1-B: `mahima-fullscreen` class applied but CSS uses `:fullscreen` pseudo-selector**
`isFullscreen && "mahima-fullscreen"` is added as a class, but all CSS rules are written as `.mahima-ghost-player:fullscreen` and `.mahima-ghost-player:-webkit-full-screen`. The `.mahima-fullscreen` class is unused. This is fine — the `:fullscreen` pseudo-class already works for fullscreen. But the `mahima-ghost-player` class is still missing from the container (bug P1-A).

**P1-C: `sadhguru-loader-logo` / `sadhguru-loader-ring` in Dashboard.tsx vs `mahima-loader-logo` in index.css**
`Dashboard.tsx` line 153–154 uses class `sadhguru-loader-logo` and `sadhguru-loader-ring`. But `index.css` only defines `.mahima-loader-logo` and `.mahima-loader-ring`. So the dashboard page-load animation is broken — the logo doesn't pulse. Fix: add aliases `.sadhguru-loader-logo` and `.sadhguru-loader-ring` to `index.css` pointing to the same keyframes, or rename the classes in `Dashboard.tsx` to match.

---

### CATEGORY 2 — PROGRESS & COMPLETION — 2 issues

**P2-A: `MyCourses.tsx` progress percentage is out of sync with `MyCourseDetail.tsx`**
`MyCourses.tsx` calculates `progressPercent` from `user_progress` table in its own fetch, but `MyCourseDetail.tsx` computes live from `completedLessonIds`. After a student marks lessons as done in detail view and navigates back to MyCourses, the progress bar won't update until a full page refresh because `MyCourses` has no real-time subscription or re-fetch trigger.
Fix: Call `fetchEnrolledCourses()` on `window focus` event or when navigating back (using `useEffect` with `location` pathname change).

**P2-B: `Dashboard.tsx` `progressPercent` uses `e.progress_percentage` from `enrollments` table**
Line 125: `progressPercent: e.progress_percentage || 0`. The `enrollments` table's `progress_percentage` column is NOT updated by the `user_progress` upsert in `MyCourseDetail.tsx`. The progress bar on the dashboard course card will always show 0% unless a separate trigger updates `enrollments.progress_percentage`. Fix: compute progress the same way as `MyCourses.tsx` — fetch lesson counts from `user_progress` table joined with lessons.

---

### CATEGORY 3 — UI / LAYOUT — 4 issues

**P3-A: `BottomNav` active state broken for nested routes**
`isActive(path)` uses `location.pathname === path` (strict equality). So when the user is on `/my-courses/16`, the "My Courses" tab (`/my-courses`) shows as inactive. Fix: change to `location.pathname.startsWith(path)` for prefix matching (with a special case for `/dashboard` to avoid matching everything).

**P3-B: `LectureCard` `position` prop typed as `number` but passed `lesson.position ?? undefined`**
In `LectureCardProps`, `position: number` is required (no `?`). But in `MyCourseDetail.tsx` line 827 it's passed as `lesson.position ?? undefined`, which means if `position` is null it passes `undefined` to a required `number` prop — TypeScript may not catch this at runtime but it can cause rendering `undefined` in the position display if the card ever renders the position number. Fix: type the prop as `position?: number` in `LectureCard.tsx`.

**P3-C: `handleContentClick` for non-VIDEO lessons without a `videoUrl` does nothing silently**
In `MyCourseDetail.tsx` line 370–377: if `lesson.lectureType !== "VIDEO"` and `lesson.videoUrl` is falsy, the function does nothing and returns silently. The student taps a PDF card, nothing happens — no toast, no feedback. Fix: add a toast message `"No content URL available for this lesson"` when `!lesson.videoUrl` for non-video types.

**P3-D: Bottom navigation tab "My Courses" active-state vs "Courses"**
`/courses` path starts with `/course` so both "Courses" and "Course" detail pages would match. The `startsWith` fix from P3-A needs to handle this carefully — `/courses` should match `/courses` and `/my-courses` should match `/my-courses/...` without overlap.

---

### CATEGORY 4 — ADMIN PANEL — 2 issues

**P4-A: `AdminUpload.tsx` uses `useNavigate` but no auth guard for non-admin users**
The page manually checks `user` state from Supabase `auth.getUser()` (line 72–73), but the `AdminRoute` wrapper in `App.tsx` already guards `/admin/upload`. However `AdminUpload.tsx` re-implements its own auth check separately (lines 72–120), creating duplication. Not a security bug (route guard runs first), but the internal auth logic inside AdminUpload creates an extra loading state and could be simplified. Low priority.

**P4-B: Admin tab state is not persisted in URL — navigating away loses the active tab**
`Admin.tsx` line 44: `const [activeTab, setActiveTab] = useState("payments")`. If an admin is on the "Users" tab and refreshes, they're back to "Payments". Fix: use `useSearchParams` to persist `?tab=users` in the URL.

---

### CATEGORY 5 — PERFORMANCE / FONTS — 1 issue

**P5-A: 15 Google Font imports in `index.css` lines 2–15 (blocking)**
Every page load requests 15 separate Google Fonts URLs. Most are never used (Lora, Space Mono, EB Garamond, Fira Code, Cormorant Garamond, IBM Plex Mono, Lato). The body font is `Poppins`. The CSS variable `--font-sans` is set to `DM Sans`. Only `Poppins` and `JetBrains Mono` are clearly used. All unused font imports should be removed — each blocks page rendering. This explains slow initial loads.

---

## Implementation Plan

### Files to change

| File | Changes |
|------|---------|
| `src/index.css` | Add `.sadhguru-loader-logo` + `.sadhguru-loader-ring` keyframe aliases; remove 10+ unused Google Font imports |
| `src/components/video/MahimaGhostPlayer.tsx` | Add `mahima-ghost-player` class to the outer container div |
| `src/components/Layout/BottomNav.tsx` | Fix `isActive` to use `startsWith` with careful `/dashboard` exact match |
| `src/components/course/LectureCard.tsx` | Change `position: number` → `position?: number` |
| `src/pages/MyCourseDetail.tsx` | Add fallback toast when non-video lesson has no URL |
| `src/pages/MyCourses.tsx` | Refetch courses on window focus / navigation return |
| `src/pages/Dashboard.tsx` | Fix progress percentage to use `user_progress` instead of `enrollments.progress_percentage` |
| `src/pages/Admin.tsx` | Persist active tab in URL via `useSearchParams` |

### Priority order
1. `index.css` — font cleanup (perf win, instant) + loader animation fix (visual)
2. `MahimaGhostPlayer.tsx` — add `mahima-ghost-player` class (piracy protection working correctly)
3. `BottomNav.tsx` — active state fix (UX correctness)
4. `MyCourseDetail.tsx` — empty-URL toast feedback
5. `LectureCard.tsx` — prop type fix
6. `MyCourses.tsx` — refetch on focus
7. `Dashboard.tsx` — correct progress from user_progress
8. `Admin.tsx` — tab URL persistence
