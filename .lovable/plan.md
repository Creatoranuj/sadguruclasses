
## Current State Assessment

After reading all relevant files:

### ✅ Already Working (no changes needed)
1. **Sidebar** — role filtering is correct (lines 48-51), active pill styling done, `startsWith` logic done ✓
2. **AdminQuizManager** — already filters lessons to DPP/TEST (line 106: `.in("lecture_type", ["DPP", "TEST"])`), already auto-calculates `total_marks` after saving questions (lines 164-165) ✓
3. **LectureListing** — already shows "Attempt DPP" / "Take Test" button for lessons with linked published quizzes (lines 372-382) ✓
4. **QuizAttempt** — fully built with timer, palette, flagging, auto-submit on time-up ✓
5. **QuizResult** — fully built with score, pass/fail, answer review ✓
6. **Dashboard** — "My Quiz Attempts" section with score/pass/fail/date already implemented (lines 241-296) ✓
7. **Admin.tsx** — inline role selector in Users tab already done ✓
8. **AllClasses.tsx** — duplicate BatchSelector already removed, filter badge in place ✓

### 🔴 Real Issues Found

**Issue 1: Quiz attempts created on page load (orphan rows)**
`QuizAttempt.tsx` lines 93-100 create an attempt record immediately on mount (before the student answers anything). If a student opens the quiz and exits without submitting, an unsubmitted empty row is created. The dashboard `quiz_attempts` query doesn't filter by `submitted_at IS NOT NULL`, so these empty rows would show up as "—" scores.

**Fix**: Remove the insert-on-mount (lines 93-100). Only insert on submit (the fallback path at lines 164-176 already handles creating a new row if `attemptId` is null). Dashboard query already works correctly since percentage would be null for unsubmitted.

Actually re-checking the dashboard query at line 80: it fetches ALL attempts including unsubmitted ones. The display uses `attempt.percentage != null ? ... : "—"` for percentage, but the row still shows up. Need to add `.not('submitted_at', 'is', null)` filter.

**Issue 2: Dashboard bottom nav only has 3 tabs (missing Messages and Profile)**
Dashboard lines 326-348 shows only Home, Courses, My Courses. User requested 5 tabs: Home, Courses, My Courses, Messages, Profile. Missing `bellIcon`/`messageCircle` icon imports for Messages and Profile.

Currently imports `homeIcon`, `studentIcon`, `scienceIcon` for bottom nav. Need `MessageCircle` from lucide-react and `User` icon for Profile (or use the 3D icons).

**Issue 3: No quiz attempt history link from result page back to chapter**
After completing a quiz, the result page has a back button (`navigate(-1)`) but no explicit "Back to Chapter" navigation. The quiz has a `lesson_id` that links to a lesson, which has `chapter_id` and `course_id`. The result page could show a "Back to Chapter" button.

Actually the QuizResult page already has `navigate(-1)` which works. This is minor/nice-to-have.

**Issue 4: `QuizAttempt.tsx` — orphan attempt on mount**
This is the main real bug. Lines 93-100 unconditionally insert a row on mount. If a user opens the quiz, then hits the back button, an empty unsubmitted attempt exists. Solution: remove the on-mount insert.

### Files to Change

| File | Change |
|------|--------|
| `src/pages/QuizAttempt.tsx` | Remove on-mount attempt insert (lines 93-100); ensure fallback insert-on-submit path handles the case where no pre-existing attemptId |
| `src/pages/Dashboard.tsx` | Add `.not('submitted_at', 'is', null)` to quiz_attempts query; expand bottom nav from 3 to 5 tabs (add Messages + Profile) |
| `memorywork.md` | Update with walkthrough summary |

### Specifically

**`QuizAttempt.tsx`** — delete lines 92-100 (the `if (user) { const { data: attempt } ... }` block). The `attemptId` state starts as `null`, and `handleSubmit` already has the fallback at lines 164-176 that creates a new row when `finalAttemptId` is null. So removing the pre-create is safe and correct.

**`Dashboard.tsx`** — two changes:
1. Line 82: add `.not('submitted_at', 'is', null)` to filter out unsubmitted attempts
2. Lines 326-348: expand bottom nav from 3 tabs to 5, adding Messages (using `doubtsIcon` or a new icon) and Profile (using `studentIcon` or `User` from lucide).

For the 5-tab bottom nav, use available 3D icons:
- Home → `homeIcon`
- Courses → `scienceIcon`  
- My Courses → `studentIcon`
- Messages → `doubtsIcon` (closest available 3D icon)
- Profile → `cubeIcon` is already used for all-classes... use `User` from lucide-react (already imported)

Actually `User` is already imported in lucide icons: line 13 imports `PlayCircle, Zap, ClipboardCheck, FileText, Users, Calendar, Trophy, CheckCircle2, XCircle`. No `User` or `MessageCircle`. Need to add them.

Better: reuse the 3D icon assets. `bellIcon` is already imported (line 22) — could use for Notices or Messages. But for simplicity, use `MessageCircle` and `User` from lucide for Messages and Profile tabs.

### Summary — 2 files to edit, 1 file to update

1. **`QuizAttempt.tsx`**: Remove 8 lines (the on-mount attempt insert block)
2. **`Dashboard.tsx`**: Add `.not()` filter + expand bottom nav to 5 tabs with Messages + Profile
3. **`memorywork.md`**: Document walkthrough findings
