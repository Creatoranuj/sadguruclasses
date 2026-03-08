
## Comprehensive assessment of what's already done vs. what needs work

### Already implemented (no changes needed):
1. **RLS on profiles** — "Block public access" + user-own-row policies all confirmed in schema ✓
2. **Storage buckets** — All 8 buckets exist: `content`, `comment-images`, `course-videos`, `course-materials`, `receipts`, `chat-attachments`, `notices`, `book-covers` ✓
3. **Video player watermark timing** — hidden first 10s, fade-in, pulsing border last 10s (`pulse-border` keyframe in index.css + `isInLastTenSeconds` logic) ✓
4. **Tap-to-toggle controls** — `handleOverlayTap` toggles `showControls`, auto-hide 3s timer ✓
5. **End screen suppression** — `stopVideo` + custom `EndScreenOverlay` on state=0 ✓
6. **Progress bar** — mouse+touch seeking, hover preview time, buffered indicator ✓
7. **Arrow spacing** — `gap-16 md:gap-20` already in center controls row ✓
8. **MIME type validation** — `BLOCKED_EXTS` + `ALLOWED_MIME_TYPES` in AdminUpload ✓
9. **Real progress tracking** — `completedLessonIds` fetched from `user_progress`, 80% auto-complete threshold ✓
10. **Real-time subscriptions** — both `useComments` and `useMessages` have Supabase realtime channels ✓
11. **PWA manifest** — correct branding, icons, standalone display ✓
12. **My Quiz Attempts dashboard section** — implemented ✓
13. **Admin inline role management** — Users tab has Select dropdown ✓
14. **Quiz orphan fix** — removed on-mount attempt insert, now only on submit ✓
15. **Mobile bottom nav** — 5 tabs (Home, Courses, My Courses, Messages, Profile) ✓
16. **AllClasses duplicate fix** — BatchSelector removed, filter badge in place ✓

### What genuinely needs to be done:

**Issue 1: `profiles_public` view has NO RLS policies**
The `profiles_public` table/view currently has zero policies. Other tables reference it for displaying comment author names. Authenticated users need SELECT access. This is a security gap.

**Issue 2: Watermark visibility condition is too restrictive**
Line 216: `watermarkVisible = (currentTime >= 10 || showEndScreen || isInLastTenSeconds) && (showControls || isInLastTenSeconds || showEndScreen || watermarkForceVisible)`

The second half ties watermark to `showControls` — when controls hide after 3s, the watermark also hides during playback (between 10s and last-10s). This is wrong. The watermark should remain **always visible** once past 10 seconds, not just when controls are shown. Fix: remove the `showControls` dependency from the watermark condition.

**Issue 3: `memorywork.md` needs updating** with the recent changes (quiz orphan fix, 5-tab mobile nav, role management, dashboard quiz history).

### File changes needed:

| File | Change |
|------|--------|
| `src/components/video/MahimaGhostPlayer.tsx` | Fix watermark visibility: always visible after 10s, not gated on `showControls` |
| `memorywork.md` | Append session summary (quiz fixes, mobile nav, role management) |

**DB migration needed:**
Add RLS policy to `profiles_public` to allow authenticated users to SELECT:
```sql
CREATE POLICY "Authenticated users can view public profiles"
ON public.profiles_public
FOR SELECT
USING (auth.role() = 'authenticated');
```

### Watermark fix — exact line change

**Current (line 216):**
```typescript
const watermarkVisible = (currentTime >= 10 || showEndScreen || isInLastTenSeconds) && (showControls || isInLastTenSeconds || showEndScreen || watermarkForceVisible);
```

**Fixed:**
```typescript
const watermarkVisible = currentTime >= 10 || showEndScreen || isInLastTenSeconds;
```

This makes the watermark:
- Hidden for first 10 seconds (clean intro)
- Always visible from 10s onwards (no hide/show with controls)
- Always visible on end screen and last 10 seconds

### APK / GitHub Release note

Lovable cannot run shell commands (`npx cap sync`, Android Studio builds). The `docs/APK-BUILD-GUIDE.md` already has step-by-step instructions. `capacitor.config.ts` already has the correct config. There is nothing to change in code for the APK — the user exports to GitHub and follows the build guide.

### Summary — 3 actual changes:

1. **`src/components/video/MahimaGhostPlayer.tsx`** — 1-line watermark visibility fix (remove `showControls` gating)
2. **DB migration** — Add RLS SELECT policy on `profiles_public` for authenticated users
3. **`memorywork.md`** — Append 2026-03-08 session summary
