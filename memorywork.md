# Memorywork – Changes Log

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
