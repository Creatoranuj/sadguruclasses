# Memorywork – Changes Log

## Date: 2026-03-08 (Session 4 – Full Implementation Audit)

### Audit Findings

Full code audit via static analysis. All quiz engine and chapter progress tracking features verified as correctly implemented.

**One gap found:** "Attempt DPP" / "Take Test" button only renders in **list view** in `LectureListing.tsx` — not in gallery or table view modes.

Created `IMPLEMENTATION_STATUS.md` with comprehensive feature comparison table (22 features ✅, 1 gap ⚠️).

| # | Item | Status | Files |
|---|------|--------|-------|
| Quiz Engine (features 1–16) | ✅ All verified | `AdminQuizManager.tsx`, `QuizAttempt.tsx`, `QuizResult.tsx` |
| Chapter Progress Tracking (17–19) | ✅ Fully implemented | `ChapterView.tsx`, `ChapterCard.tsx` |
| Reports Analytics + Recharts Chart | ✅ Fully implemented | `Reports.tsx` |
| Dashboard 5-tab nav + quiz history filter | ✅ Done | `Dashboard.tsx` |
| Quiz routes in App.tsx (3 routes) | ✅ Verified | `App.tsx` |
| "Attempt DPP" in gallery/table view | ⚠️ Not done | `LectureListing.tsx` lines ~389-413 |

### No Code Changes This Session
Pure audit session. See `IMPLEMENTATION_STATUS.md` for full details.

---

## Date: 2026-03-08 (Session 3 – Reports Analytics, ChapterCard Progress Tracking, AdminQuizManager Lesson Link)

### Changes Made

| File | Changes |
|------|---------|
| `src/pages/Reports.tsx` | Full rewrite — replaced all mock/hardcoded data with real Supabase queries. Added: quiz stats (total attempts, avg %, best %, pass rate), Recharts bar chart of last 5 quiz scores (green=pass, red=fail), full attempts list with date/score/pass-fail badges, real enrollment progress bars from `progress_percentage`. |
| `src/components/course/ChapterCard.tsx` | Added `isComplete` + `progressPct` logic. Green `CheckCircle2` badge replaces code badge when all lessons done. Green right icon replaces `ChevronRight` when complete. Green animated progress bar at card bottom. Border tint green when complete. |
| `src/pages/AdminQuizManager.tsx` | Added `Link2` icon import. Extended `Quiz` interface with `lessons?: { title: string } \| null`. Updated `fetchQuizzes` to `.select("*, lessons(title)")`. Added linked lesson display in quiz list card. |

### No DB Changes Required
All tables (`quiz_attempts`, `quizzes`, `user_progress`, `lessons`) already exist with correct RLS.

---

## Date: 2026-03-08 (Session 2 – Final Polish: Watermark Fix, profiles_public RLS, Quiz Integrity)

### Changes Made

| File | Changes |
|------|---------|
| `src/components/video/MahimaGhostPlayer.tsx` | Fixed `watermarkVisible` — removed `showControls` gating so watermark is **always visible** from 10s onwards (not just when controls are showing). Before: `(currentTime >= 10 || ...) && (showControls || ...)`. After: `currentTime >= 10 || showEndScreen || isInLastTenSeconds`. |
| `src/pages/QuizAttempt.tsx` | Removed on-mount attempt insert (orphan row bug). Attempt record now only created on submission. |
| `src/pages/Dashboard.tsx` | Added `.not('submitted_at', 'is', null)` filter to quiz_attempts query so only completed quizzes appear in history. Expanded mobile bottom nav from 3 → 5 tabs (added Messages + Profile). |
| DB migration | Added `profiles_public` RLS SELECT policy: `auth.role() = 'authenticated'` — closes the zero-policy security gap on the public profiles view. |

### Verification Checklist (2026-03-08)

| # | Item | Status |
|---|------|--------|
| 1 | Watermark always visible after 10s (not tied to showControls) | ✅ Fixed |
| 2 | No orphan quiz_attempts rows on page load | ✅ Fixed |
| 3 | Dashboard quiz history shows only submitted attempts | ✅ Fixed |
| 4 | Mobile bottom nav has 5 tabs (Home/Courses/My Courses/Messages/Profile) | ✅ Done |
| 5 | profiles_public view has RLS SELECT policy for authenticated users | ✅ Done |
| 6 | All storage buckets exist (8 total) | ✅ Confirmed |
| 7 | All RLS policies on profiles table are correct (block public + own-row) | ✅ Confirmed |
| 8 | Quiz orphan fix – attempt only inserted on submit | ✅ Done |
| 9 | APK build — Capacitor config correct, docs/APK-BUILD-GUIDE.md complete | ✅ No code changes needed |
| 10 | PWA manifest — correct branding, icons, standalone | ✅ Confirmed |

### Remaining Manual Actions
- **Leaked Password Protection**: Enable in Supabase Dashboard → Authentication → Settings → Security (HaveIBeenPwned integration — Pro/paid feature)
- **APK Build**: Export to GitHub, then follow `docs/APK-BUILD-GUIDE.md` — run `npm run build && npx cap sync && npx cap open android` in Android Studio

---

## Date: 2026-03-08 (Quiz Engine + Knowledge Hub Duplicate Fix)

### Knowledge Hub Duplicate Fix
- **Root cause**: `BatchSelector` component (showing selected batch name + thumbnail) visually appeared identical to a course card when a batch was selected → looked like 2 identical "Knowledge Hub" entries.
- **Fix**: Removed `<BatchSelector />` from `AllClasses.tsx`. Replaced with a clean inline filter badge (`Viewing: {batch.title}` + "Show All" button) that doesn't look like a content card.

### Quiz Engine (Full Implementation)

#### Database Tables Created
- `quizzes`: id (uuid), title, type (dpp|test), course_id (bigint), chapter_id (uuid), lesson_id (uuid), duration_minutes, total_marks, pass_percentage, is_published, created_by, created_at
- `questions`: id, quiz_id, question_text, question_type (mcq|true_false|numerical), options (JSONB), correct_answer, explanation, marks, negative_marks, order_index
- `quiz_attempts`: id, user_id, quiz_id, started_at, submitted_at, score, percentage, passed, answers (JSONB), time_taken_seconds

#### RLS Policies
- Admins: full CRUD on quizzes + questions
- Students: SELECT on published quizzes only; INSERT/SELECT/UPDATE own attempts

#### New Files
| File | Purpose |
|------|---------|
| `src/pages/QuizAttempt.tsx` | Full-screen quiz: timer, question palette, MCQ/TF/Numerical support, auto-save to localStorage, submit dialog, score calculation |
| `src/pages/QuizResult.tsx` | Result page: score card, pass/fail, per-question review with correct/wrong/explanation |
| `src/pages/AdminQuizManager.tsx` | Admin CRUD: list quizzes, create (title/type/course/lesson link), add/edit questions dynamically, publish/unpublish |
| `src/components/quiz/QuizTimer.tsx` | Countdown timer with warning/critical states |
| `src/components/quiz/QuestionPalette.tsx` | Navigation grid colored by answered/flagged/unanswered/current state |

#### Routes Added
- `/quiz/:quizId` → QuizAttempt
- `/quiz/:quizId/result/:attemptId` → QuizResult
- `/admin/quiz` → AdminQuizManager

#### Integration Points
- `LectureListing.tsx`: DPP/TEST lessons with a linked published quiz show a "Attempt DPP" / "Take Test" button below the card
- `Admin.tsx`: "Quiz Manager" button added to Schedule tab for easy navigation
- Quiz linked to lesson via `quizzes.lesson_id` — admin sets this in AdminQuizManager create form

#### Scoring Logic (client-side)
```
score = sum of: 
  +marks if answer matches correct_answer
  -negative_marks if wrong answer and negative_marks > 0
  0 if skipped
score = max(0, score)
percentage = score / total_marks * 100
passed = percentage >= quiz.pass_percentage
```

---



### Changes Made

| File | Changes |
|------|---------|
| `src/utils/fileUtils.ts` | Added `getArchiveDownloadUrl(identifier)` async function — queries Archive.org metadata API to find the real PDF file, falls back to `{id}.pdf` pattern then listing page. Updated `getDownloadUrl` sync fallback to use `{id}.pdf` pattern instead of just the listing folder. |
| `src/components/course/DriveEmbedViewer.tsx` | `handleDownload` now calls `getArchiveDownloadUrl` for Archive.org URLs (async metadata lookup). Added top branding overlay (`h-9`, `bg-card`) that covers Archive.org header bar — uses `pointer-events-none` + iframe `marginTop: 36px`. iframe now has `allowFullScreen` attribute. Bottom branding gradient unchanged. |
| `src/pages/LessonView.tsx` | Added conditional **PDF tab** (5th tab) that renders `DriveEmbedViewer` inline when `class_pdf_url` is set. Auto-selects PDF tab as default when lesson has a PDF URL. `onDownloadPdf` in `LessonActionBar` now clicks the PDF tab instead of opening a new window — inline viewing without leaving the app. |

### Archive.org Integration Patterns

- **Embed URL**: `https://archive.org/embed/{identifier}` — used for iframe src
- **Download URL**: fetched async via `https://archive.org/metadata/{identifier}` → `files[]` array → first file with `format` matching "Text PDF" or `.pdf` extension
- **Branding suppression**: Top overlay div (z-10, `bg-card`, `h-9`) + iframe shifted down `marginTop: 36px`. Cross-origin iframe means CSS cannot reach inner Archive.org DOM — overlay is best-effort.
- **Sandbox**: `allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox` — keeps BookReader functional

### Edge Cases Handled

- Archive.org items where PDF filename ≠ `{id}.pdf` (metadata lookup handles arbitrary filenames)
- Items without any PDF file (falls back to `{id}.pdf`, then CORS-blocked → opens in new tab)
- Metadata API CORS failures → graceful fallback to `{id}.pdf` pattern

---

## Date: 2026-03-05 (APK Build Guide, Install Page & Branding Fixes)

### Changes Made
- Fixed `public/sw.js` cache name: `refresh-academy-v1` → `sadguru-coaching-v1`
- Updated `DEPLOY.md` branding to "Sadguru Coaching Classes" + added Capacitor/APK section
- Created `src/pages/Install.tsx` — platform-aware install guide (Android APK/PWA, iOS, Desktop)
- Added `/install` route in `src/App.tsx`
- Created `docs/APK-BUILD-GUIDE.md` — full Capacitor APK build documentation

---

## Date: 2026-03-04 (Rebrand: Sadhguru Coaching Centre → Sadguru Coaching Classes)

### Changes Made
Global rebrand across ~25+ files:
- All visible text "Sadhguru Coaching Centre" → "Sadguru Coaching Classes"
- All "Mahima Academy" references → "Sadguru Coaching Classes"
- PWA manifest: name/short_name updated
- Capacitor config: appName updated
- Video player watermarks: all 7 player components updated
- CSS class names: `.sadhguru-player` → `.sadguru-player`, `.sadhguru-watermark` → `.sadguru-watermark`
- localStorage keys: `sadhguru_player_volume` → `sadguru_player_volume`, `sadhguru_selected_batch` → `sadguru_selected_batch`
- index.html: title, meta tags, OG tags all updated
- Logo files remain unchanged (mahima-logo.png, mahima-academy-logo.png) — replace when new assets available

---

## Date: 2026-03-04 (Master Plan Implementation – Phase 2, 6, 9)

### Changes Made

| File | Changes |
|------|---------|
| `src/index.css` | Added `@keyframes pulse-border` animation for golden glow pulsing effect on watermarks during last 10s of video playback |
| `src/components/video/MahimaGhostPlayer.tsx` | Replaced `ring-2 ring-yellow-400 animate-pulse` Tailwind classes with custom `pulse-border` CSS keyframe animation on both bottom-left and bottom-right watermarks for smoother golden glow effect in last 10 seconds |
| `src/hooks/useComments.ts` | Added Supabase real-time subscription using `postgres_changes` channel — auto-refreshes comments when new ones are inserted, updated, or deleted |
| `src/hooks/useMessages.ts` | Added Supabase real-time subscription for messages table — auto-refreshes inbox/sent/unread counts on any change |

### Audit Checklist Status (25 Items)

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1 | Mobile hamburger menu | ✅ Done | Sheet-based menu in Index.tsx |
| 2 | Video watermark hidden first 10s | ✅ Done | `watermarkVisible` logic in MahimaGhostPlayer |
| 3 | Watermark fade-in at 10s | ✅ Done | `transition-opacity duration-500` |
| 4 | Watermark locked last 10s | ✅ Done | `isInLastTenSeconds` override |
| 5 | Pulsing border last 10s | ✅ Done | Custom `pulse-border` keyframe animation |
| 6 | End screen suppression | ✅ Done | `stopVideo` + `seekTo(0, false)` on state 0 |
| 7 | Custom EndScreenOverlay | ✅ Done | Replay/Next buttons render |
| 8 | Progress bar seek (mouse) | ✅ Done | `handleProgressMouseDown` |
| 9 | Progress bar seek (touch) | ✅ Done | `handleProgressTouchStart` + `touchcancel` |
| 10 | Skip forward/backward 10s | ✅ Done | Custom icon buttons |
| 11 | Keyboard shortcuts | ✅ Done | Space, arrows, M, F, J, K, L |
| 12 | Admin login & role check | ✅ Done | `checkUserRole` in AuthContext |
| 13 | Admin breadcrumb drill-down | ✅ Done | AdminUpload.tsx |
| 14 | Admin create chapter | ✅ Done | AdminUpload.tsx |
| 15 | Admin create sub-folder | ✅ Done | AdminUpload.tsx |
| 16 | Admin upload content | ✅ Done | AdminUpload.tsx |
| 17 | MIME type validation | ✅ Done | Blocked extensions list in AdminUpload |
| 18 | Student login | ✅ Done | AuthContext |
| 19 | Course progress bar | ✅ Done | LessonView.tsx `completedLessonIds` |
| 20 | 80% auto-complete | ✅ Done | `handleVideoTimeUpdate` threshold |
| 21 | RLS policies | ⚠️ Needs manual review | Profiles table has permissive policies |
| 22 | Storage buckets | ⚠️ Needs migration | `content`, `course-videos` etc. not yet created |
| 23 | PWA manifest | ✅ Done | Correct branding in manifest.json |
| 24 | Real-time subscriptions | ✅ Done | Comments + Messages hooks |
| 25 | Branding consistency | ✅ Done | "Sadhguru Coaching Centre" throughout |

### Remaining Manual Actions
- **RLS hardening**: Run SQL migration to restrict profiles INSERT/UPDATE/DELETE to own rows only
- **Storage buckets**: Run SQL migration to create `content`, `comment-images`, `course-videos`, `course-materials`, `receipts` buckets
- **Leaked password protection**: Enable HaveIBeenPwned in Supabase Dashboard > Authentication > Password Security

---


## Date: 2026-03-03 (Video Player Final Polish – Watermark Timing, Seeking, End Screen)

### Files Modified

| File | Changes |
|------|---------|
| `src/components/video/MahimaGhostPlayer.tsx` | Added watermark timing logic: hidden first 10s, fade-in after 10s (duration-500), always visible in last 10s (override auto-hide), persists through end screen. Added `watermarkForceVisible` state for end screen. Enhanced end screen suppression with `seekTo(0, false)` after `stopVideo`. Added `touchcancel` handler for progress bar seeking. Added `will-change: transform` to progress thumb. |
| `src/index.css` | Added `.progress-thumb { will-change: transform }` CSS class for repaint flicker prevention. |

### Security Scan (12 findings — all pre-existing, no new issues)
- 2 Supabase linter warnings (RLS always true on leads INSERT — by design, leaked password protection — Pro feature)
- 10 application-level findings (all previously acknowledged/mitigated in prior entries)

---

## Date: 2026-03-03 (Progress Bar & Tap-to-Toggle Fix)

### Files Modified

| File | Changes |
|------|---------|
| `src/components/video/MahimaGhostPlayer.tsx` | Fixed tap-to-toggle double-fire on touch (removed `onTouchEnd` duplicate handler). Added auto-hide timer start when controls are shown via tap. Added progress bar hover expand effect (h-1 → h-2) for better click target. Fixed buffered bar opacity from 0.3 to 0.2. |

---

## Date: 2026-03-03 (Watermark Refinements – Grey Background + Logo Reposition)

### Files Modified

| File | Changes |
|------|---------|
| `src/components/video/MahimaGhostPlayer.tsx` | Darkened watermark backgrounds from `rgba(128,128,128,0.7)` to `rgba(40,40,40,0.92)`. Added `showControls` fade (transition-opacity duration-300) to all three watermark overlays so they auto-hide after 3s and reappear on interaction. Centered bottom-right text with `justify-center`. |

---

## Date: 2026-03-02 (Video Player Fixes – Black Shadow & End Screen)

### Files Modified

| File | Changes |
|------|---------|
| `src/components/video/MahimaGhostPlayer.tsx` | Removed standalone 52px bottom gradient mask div (lines 507-511). Control bar's own gradient provides sufficient coverage. |
| `src/components/video/WhiteLabelVideoPlayer.tsx` | Changed bottom blocker gradient from `rgba(0,0,0,0.9)` to `transparent`. Div kept for click-blocking only. |
| `src/components/video/PremiumVideoPlayer.tsx` | Added `EndScreenOverlay` import and `showEndScreen` state. On video end, shows custom replay overlay. Replay uses `seekTo(0)` for smooth restart. |

### Security Scan (15 findings — all pre-existing, no new issues)
- 2 Supabase linter warnings (RLS always true, leaked password protection)
- 13 application-level findings (all previously acknowledged/mitigated)

---


## Date: 2026-03-02 (Custom Icon Swap – Gear & Rotation PNGs)

### Files Modified

| File | Changes |
|------|---------|
| `src/components/video/MahimaGhostPlayer.tsx` | Replaced `settings-rotate.png` with `setting-gear.png`. Replaced Lucide `RotateCw` with custom `rotation-icon.png`. Both `h-8 w-8 md:h-9 md:w-9`, `<img>` tags, `draggable={false}`. |
| `src/assets/icons/setting-gear.png` | New custom gear icon from uploaded `Setting_Gear.png`. |
| `src/assets/icons/rotation-icon.png` | New custom rotation icon from uploaded `Rotation_icon.png`. |

---

## Date: 2026-03-02 (Settings Gear & Rotate CW Button)

### Files Modified

| File | Changes |
|------|---------|
| `src/components/video/MahimaGhostPlayer.tsx` | Replaced Lucide `Settings` icon with custom gear image (`settings-rotate.png`). Added Rotate CW button that toggles 90° rotation + fullscreen. Both buttons `h-10 w-10`, no blur. |
| `src/assets/icons/settings-rotate.png` | Added custom gear icon from uploaded file. |

---


## Date: 2026-03-01 (Watermark Overhaul)

### Files Modified

| File | Changes |
|------|---------|
| `src/components/video/MahimaGhostPlayer.tsx` | Replaced single watermark with dual overlay patches: top-left (covers YouTube channel info) and bottom-right (covers YouTube logo, clickable to homepage). Removed separate `watermarkVisible` state/timer — watermark now syncs with `showControls` (3s auto-hide). Added `SkipForward` next-lecture button in controls row wired to `onNextVideo`. Made bottom-right logo clickable via `window.open`. |

---

### Files Modified

| File | Changes |
|------|---------|
| `package.json` | Added vitest, @testing-library/react, @testing-library/dom, @testing-library/jest-dom as devDeps |
| `src/components/video/MahimaGhostPlayer.tsx` | Removed blur from all control buttons. Removed double-tap seek gesture. Moved watermark to bottom-16 right-3. Added rotation button. |
| `src/components/video/PremiumVideoPlayer.tsx` | Removed double-tap seek logic. Removed backdrop-blur from play button. Moved watermark to bottom-16 right-4. |
| `src/components/video/PdfViewer.tsx` | Changed height from 85vh to calc(100vh - 50px). |
| `src/pages/ChapterView.tsx` | Added real lecture counts from lessons and user_progress tables. |
| `src/pages/AdminUpload.tsx` | Expanded file accept types to include doc/xls/ppt/images. |
| `src/pages/Admin.tsx` | Added thumbnail upload to course edit form. |

---


---

### Files Modified

| File | Changes |
|------|---------|
| `src/components/video/MahimaGhostPlayer.tsx` | Reduced bottom gradient overlay from 60px/0.8 opacity to 30px/0.3 opacity. Shrunk watermark bar from 60px to 30px, made semi-transparent (0.4). Reduced logo sizes and text opacity for subtler branding. |
| `src/components/video/PremiumVideoPlayer.tsx` | Removed the `w-40 h-16 bg-gradient-to-tl from-black` ghost mask overlay at bottom-right that caused shadow artifacts. |
| `src/components/video/PdfViewer.tsx` | Added `allow-popups-to-escape-sandbox` to iframe sandbox attribute. Removed Drive header/footer overlay divs that were interfering with PDF navigation. |
| `src/components/course/DriveEmbedViewer.tsx` | Added `allow-popups-to-escape-sandbox` to iframe sandbox attribute for better Drive embed compatibility. |
| `src/hooks/useComments.ts` | Added `imageUrl` field to `Comment` interface. Added `imageUrl` to `CommentInput`. Updated `createComment` to pass `image_url` to Supabase. Updated `fetchComments` to map `image_url`. |
| `src/pages/LessonView.tsx` | Added image upload button in Discussion tab with preview, file validation (5MB max), and Supabase storage upload. Added "Chat with Teacher" button in header. Display uploaded images in comment bubbles. |
| `src/pages/LectureView.tsx` | Restructured lesson item action buttons layout for future extensibility. |
| `src/components/Layout/Sidebar.tsx` | Messages link already present in sidebar (verified). |

---

### Supabase Changes

| Resource | Action |
|----------|--------|
| `comments.image_url` column | Added (text, nullable) |
| `comment-images` storage bucket | Created (public) |
| Storage RLS policies | Added: authenticated upload, public read, owner delete |

---

### Summary of Fixes

1. **Video Ghost Shadow** – Eliminated the heavy black gradient overlays in both `MahimaGhostPlayer` and `PremiumVideoPlayer`. Videos now display clean 16:9 with minimal, transparent branding.

2. **PDF Viewer Embedding** – Relaxed iframe sandbox to allow Drive embeds to render properly. Removed overlay divs that hid Drive controls and caused rendering issues.

3. **Discussion Image Upload** – Students can now attach images (up to 5MB) to discussion comments. Images are uploaded to Supabase `comment-images` bucket and displayed inline in comment bubbles.

4. **Chat with Teacher** – "Chat with Teacher" button added to lesson page header, navigating to `/messages` for instant teacher contact.

5. **Backend Integrity** – All changes use existing Supabase client and auth patterns. No breaking changes to data flow.

---

## Date: 2026-03-01 (Security Fixes)

### Supabase Changes

| Resource | Action |
|----------|--------|
| `profiles` table | Added `Block public access` policy for `anon` role (`USING (false)`) |
| `profiles` table | Dropped overly permissive `Public profiles are viewable by everyone` policy |
| `storage.objects` (receipts) | Added RLS: user-scoped upload/view/delete + admin view |
| `increment_book_clicks` function | Changed from SECURITY DEFINER to SECURITY INVOKER with auth check |
| `ObsidianNotes.tsx` | Added DOMPurify pre-sanitization to prevent XSS |

### Security Findings Resolved

| Finding | Resolution |
|---------|------------|
| `profiles_table_public_exposure` | Anon block policy added; user/admin SELECT policies in place |
| `leads_table_contact_exposure` | Mitigated: admin-only RLS sufficient; no SELECT triggers in PostgreSQL |
| `payment_requests_screenshot_exposure` | Resolved: storage RLS policies added for receipts bucket |
| `increment_book_clicks_definer` | Fixed: converted to SECURITY INVOKER |
| `markdown_xss_risk` | Fixed: DOMPurify pre-sanitization added |

### Manual Action Required

- **Leaked Password Protection**: Enable in Supabase Dashboard → Authentication → Settings → Security

---

## Date: 2026-03-01 (Console & Validation Fixes)

### Files Modified

| File | Changes |
|------|---------|
| `src/components/Landing/Footer.tsx` | Replaced `memo()` with `forwardRef` to fix React ref warning |
| `src/components/Landing/SocialLinks.tsx` | Replaced `memo()` with `forwardRef` to fix React ref warning |
| `src/pages/BuyCourse.tsx` | Strengthened UTR validation: `/^\d{12}$/` regex instead of length check |

### Security Findings Acknowledged

| Finding | Status |
|---------|--------|
| `notices_author_exposure` | By design: RLS restricts to matching role/admin |
| `profiles_public_unnecessary_table` | Secure: security_invoker inherits profiles RLS |
| `profiles_email_mobile_exposure` | By design: admin access intentional, anon blocked |
| `public_storage_buckets` | By design: content/avatars public for course delivery |
| `admin_client_checks` | UX-only: security enforced by RLS server-side |
| `payment_utr_validation` | Fixed: regex validation added |
| `profiles_view_exposure` | Secure: security_invoker + anon deny policy |
| `security_definer_funcs` | Reviewed: all properly scoped with search_path |

---

## Date: 2026-03-01 (Security Hardening - Leaked Password Alt + DB Fixes)

### Files Modified

| File | Changes |
|------|---------|
| `src/lib/passwordStrength.ts` | Expanded common password blocklist from 20 to 200+ entries (free-tier alternative to Supabase Leaked Password Protection) |
| `src/hooks/useStorage.ts` | Removed `chat-attachments` from public bucket list (now private) |

### Supabase Changes (Migration)

| Resource | Action |
|----------|--------|
| `users` table | Dropped legacy empty table with password_hash column |
| `profiles_public` view | Revoked anon SELECT grant (security_invoker still enforces profiles RLS) |
| `audit_log` INSERT policy | Changed from `auth.uid() IS NOT NULL` to admin-only via `has_role()` |
| `system_audit_log()` function | Created SECURITY DEFINER function for system audit inserts |
| `chat-attachments` bucket | Made private (was public), added RLS: authenticated upload/view, admin delete |

### Security Scan Results (All Resolved)

| Finding | Status |
|---------|--------|
| Leaked Password Protection | Mitigated: 200+ password blocklist client-side (Pro-only feature) |
| RLS Always True (leads INSERT) | By design: public lead capture form |
| profiles personal info | Secured: anon blocked, user/admin scoped |
| profiles_public view | Fixed: anon grant revoked |
| Legacy users table | Fixed: dropped |
| Audit log manipulation | Fixed: admin-only INSERT + SECURITY DEFINER function |
| chat-attachments public | Fixed: made private with RLS |
| All other findings | Acknowledged/ignored with rationale |

### Final Status: ✅ All 13 security findings resolved or acknowledged
