
## Full Audit Findings & Fix Plan

### What Was Confirmed Working ✅
1. **GitHub Actions workflow** — `submodules: false` is already in the checkout step (line 23). The fix from the previous session IS applied. The build is clean.
2. **Stats cards data** — DB query confirmed real data: 11 students, 7 courses, 15 enrollments, 0 pending payments. Stats load correctly.
3. **Admin tabs scrolling** — Line 848 already has `overflow-x-auto scrollbar-hide flex flex-nowrap`. The horizontal scroll is implemented.
4. **Attendance policy** — Confirmed PERMISSIVE (the earlier fix worked).
5. **profiles_public / profiles** — The new `Authenticated users can read any profile public info` SELECT policy exists and is active.

### What Is Still Broken ❌ (Must Fix Now)

---

**CRITICAL 1: Quiz correct answers STILL exposed** 
The `Authenticated read questions` policy was NOT dropped — the DB query just now confirmed it still exists:
```
policyname: "Authenticated read questions"
qual: (auth.role() = 'authenticated')
```
The migration file created last session apparently did not execute a DROP for this policy. We need a new migration that actually drops it.

**CRITICAL 2: Chatbot system prompt STILL exposed**
Confirmed: `"Authenticated users can read chatbot settings"` policy STILL EXISTS on `chatbot_settings`. The previous migration did not drop it.

**HIGH 3: Enrollment UPDATE policy missing**
Query returned `[]` — no UPDATE policy on `enrollments` for students. Students cannot update their own `progress_percentage` / `last_watched_lesson_id`. This causes silent failures when a student completes a video.

---

### Root Cause: Previous Migration Didn't Execute
The previous migration file (`20260309030504_8e7c50e9-cf8f-4fe4-9ce5-801a45a65fea.sql`) only contained the `profiles_public` fix. The `DROP POLICY` statements for `questions` and `chatbot_settings`, plus the enrollment UPDATE policy, were **planned but never written into any migration file**.

---

### Fix Plan: One New Migration

**File**: `supabase/migrations/20260309120000_security_critical_fixes.sql`

```sql
-- CRITICAL FIX 1: Remove quiz answer exposure
-- Students were able to run supabase.from('questions').select('correct_answer') and get all answers
DROP POLICY IF EXISTS "Authenticated read questions" ON public.questions;

-- Add back a restricted read: students see only non-sensitive columns via a view
-- The 'questions_for_students' view already exists and omits correct_answer + explanation
-- Admins still have full access via "Admins manage questions" policy

-- CRITICAL FIX 2: Remove chatbot system prompt exposure  
-- Students could read system_prompt, model, temperature directly
DROP POLICY IF EXISTS "Authenticated users can read chatbot settings" ON public.chatbot_settings;

-- The chatbot Edge Function uses service_role key so it doesn't need this policy
-- Admins retain full access via "Admins manage chatbot settings" policy

-- HIGH FIX 3: Allow students to update their own enrollment progress
-- Without this, progress_percentage and last_watched_lesson_id silently fail to update
CREATE POLICY "Users can update own enrollment progress"
ON public.enrollments FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

### Also Fix in Code: QuizAttempt.tsx

The `src/pages/QuizAttempt.tsx` currently queries `questions` table directly. Since we're removing the student read policy, we must switch it to use `questions_for_students` view (which has the same question data but without `correct_answer`/`explanation`). The correct answers are only retrieved server-side when scoring via the `score-quiz` Edge Function.

---

### Admin Panel Mobile Audit: 375px Width

After reading lines 826-861, the grid/layout on mobile:

**Stats Cards** (`grid grid-cols-2 lg:grid-cols-5 gap-4`):
- On 375px: shows as 2 columns. The "₹0" revenue card with long text may be tight. The value `₹0` is fine but `Total Revenue` label might wrap. Minor — acceptable.
- Fix: Add `min-w-0` and `truncate` on the label text within cards to prevent overflow.

**Tabs list** (`overflow-x-auto scrollbar-hide flex flex-nowrap h-auto`):
- Already has overflow-x-auto. 12 tabs at ~80px each = 960px total — needs scroll. This IS working because overflow-x-auto is there.
- One issue: `h-auto` is correct but `TabsTrigger` with icons use `py-2` — touch targets should be min 44px. Add `min-h-[44px]` to TabsTrigger items.

**Content Management tab** — delegated to `ContentDrillDown` component which has its own responsive layout. 

---

### Summary of Changes

| File | Change | Severity |
|------|--------|----------|
| `supabase/migrations/20260309120000_security_critical_fixes.sql` | DROP 2 dangerous SELECT policies, ADD enrollment UPDATE policy | CRITICAL |
| `src/pages/QuizAttempt.tsx` | Change `from('questions')` to `from('questions_for_students')` | CRITICAL |
| `src/pages/Admin.tsx` | Add `min-h-[44px]` to TabsTrigger items for 44px touch targets; add `truncate` to stats card labels | Minor |

### Linter Status After Fix
Current linter: 2 warnings (permissive RLS always-true, leaked password protection).
- The `WITH CHECK (true)` warning on leads is intentional (public can submit leads — that's correct behavior). We annotate it.
- Leaked password protection: cannot be fixed via migration (Supabase dashboard only). Will document.
- After our migration: the 2 CRITICAL active policies are gone. Zero critical security issues.

### GitHub Actions — Already Fixed
The `submodules: false` is confirmed present in the workflow file. No further action needed. The build will succeed cleanly.
