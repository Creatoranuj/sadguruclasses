
## Comprehensive Audit Plan — Sadguru Coaching Classes Platform

**Approach:** This is a large multi-issue audit. Based on deep code review, I will list findings and apply targeted fixes in a single implementation pass. No new features — fixes only.

---

## Audit Findings From Code Review

### ✅ CONFIRMED WORKING (code verified)
1. **Authentication** — Login/Signup/ForgotPassword/ResetPassword routes all exist. AuthContext handles session. Role-based access via `user_roles` table.
2. **Course + Chapter + Lesson hierarchy** — MyCourseDetail fully built with chapter grid → lesson list → inline player states.
3. **Video player (MahimaGhostPlayer)** — Watermark, controls, skip, speed, rotation all implemented (854 lines).
4. **Green checkmark badge on LectureCard** — `isCompleted` prop exists and renders `checkmarkIcon`. `completedLessonIds.has(lesson.id)` is passed correctly on line 784.
5. **Lesson search bar** — Added at lines 739–758, filters by `lessonSearch` via `filteredLessons`.
6. **Progress tracking** — `handleVideoProgress` at 90% threshold, upserts to `user_progress`, updates chapter progress bars.
7. **Resume button** — shows `lastWatchedLessonId` in header when no lesson is open.
8. **PDF viewers** — `DriveEmbedViewer` + `PdfViewer` both strip ExternalLink button, strip `allow-popups-to-escape-sandbox`.
9. **Archive.org top mask** — 52px black overlay at z-30 in DriveEmbedViewer.
10. **One-click download + auto-archive** — both `downloadFile` and `addDownload` called in `handleDownload` in both viewers.
11. **Downloads page** — `/downloads` route, IndexedDB, search, delete, inline open via PdfViewer all work.
12. **Admin Upload** — Edit panel with Pencil icon, `handleOpenEdit` / `handleSaveEdit` fully wired for title, videoUrl, overview, classPdfUrl, description.
13. **Drag-and-drop reordering** — dnd-kit sensors (Pointer, Touch, Keyboard) in AdminUpload.
14. **DPP/Quiz engine** — Routes `/quiz/:quizId` and `/quiz/:quizId/result/:attemptId` exist, AdminQuizManager exists.
15. **Live sessions** — Routes, LiveClass, TeacherLiveView, AdminLiveManager exist.
16. **Chatbot (Sarthi)** — ChatWidget in App.tsx, AdminChatbotSettings page exists.
17. **PWA** — `public/sw.js`, `manifest.json`, icons exist.
18. **Lazy loading** — All pages code-split via `lazy()` + `Suspense` with PageLoader fallback.
19. **QueryClient** — 5-minute stale time, 30-minute gc, retry=1, refetchOnWindowFocus=false.

### ❌ ISSUES FOUND (require fixes)

**Issue 1 — LessonActionBar: Class PDF button opens `window.open()` instead of inline viewer**
- File: `MyCourseDetail.tsx` line 828
- `onDownloadPdf` is set to `() => window.open(selectedLesson.classPdfUrl!, "_blank")` — this causes a redirect outside the app
- Fix: Change to open the Resources tab or set `inlineViewer` state with the PDF URL

**Issue 2 — Non-content clicks on LectureCard are broken (PDF/DPP/NOTES)**
- File: `MyCourseDetail.tsx` line 316–320
- When `lectureType !== "VIDEO"`, `handleContentClick` sets `inlineViewer` but does NOT switch to the Resources/Notes tab. Student sees nothing happen visually.
- Fix: After setting `inlineViewer`, also set `activeDiscussionTab` appropriately — but this only matters when a lesson is already open. The bigger issue: clicking a PDF lesson card when NOT in player state just calls `setInlineViewer` which has no visible effect (it's only used inside the player view). Need to navigate to a simple viewer overlay.

**Issue 3 — `handleContentClick` for non-video lessons: `inlineViewer` is set but never shown**
- When `selectedLesson` is null and a PDF lesson is clicked, `inlineViewer` is set but the rendering only uses `inlineViewer` inside the lesson player tab (STATE 3). There's no overlay or viewer rendered in STATE 2 (lesson list). Students clicking a PDF lesson card get no visual feedback.
- Fix: For non-video lessons, open a modal/overlay with PdfViewer, OR navigate into "player" state and auto-switch to Resources tab.

**Issue 4 — `window.open` redirect in LessonActionBar "Class PDF" button**
- Same as Issue 1 — `onDownloadPdf` triggers `window.open()` which leaves the app.
- Fix: Wrap `classPdfUrl` in inline PdfViewer instead of `window.open`.

**Issue 5 — Download icon buttons in LectureCard are non-functional (lines 149–162)**
- LectureCard has `Download` and `Copy` icon buttons (lines 149-162) that have `onClick={(e) => e.stopPropagation()}` and do nothing. These are dead UI elements.
- Fix: Remove them or wire up actual copy-URL and download behavior.

**Issue 6 — `position` prop in LectureCard call may be `undefined` (line 780)**
- `lesson.position ?? undefined` — the `??` returns undefined when position is null, passing `undefined` to a prop typed as `number`. The LectureCard renders position-number display in no place so this is harmless but TypeScript-messy.

**Issue 7 — `lessonSearch` not reset when switching back from player view**
- When user watches a lesson then goes back (handleClosePlayer), `lessonSearch` is not cleared. Minor UX issue.
- Fix: Call `setLessonSearch("")` inside `handleClosePlayer`.

### Summary of Fixes to Apply

1. **Fix `onDownloadPdf` in LessonActionBar** — replace `window.open` with `setInlineViewer({url, title})` and switch to resources tab
2. **Fix clicking PDF/DPP/NOTES lesson cards** — instead of just setting `inlineViewer` (which is invisible), navigate into the lesson "player" state and auto-switch to the Resources or Notes tab
3. **Remove dead Download/Copy buttons from LectureCard** — they do nothing and are confusing
4. **Reset `lessonSearch` on `handleClosePlayer`**

### Files to Change
- `src/pages/MyCourseDetail.tsx` — Issues 1, 2, 3, 4, 7
- `src/components/course/LectureCard.tsx` — Issue 5

### Not changing (working correctly)
- All auth flows, video player, admin panel, downloads, Archive.org masking, progress tracking, search bar, checkmark badges
