
## Full Security Audit: 8 Issues Found

The security scanner + manual code review identified exactly 8 security issues. Here is the full analysis and fix plan.

---

### CRITICAL ISSUES (Must Fix)

**CRITICAL 1: Quiz Correct Answers Exposed to All Students**
- `questions` table has a direct RLS policy: `Authenticated read questions` → `USING (auth.role() = 'authenticated')` — this gives every logged-in student READ access to `correct_answer` and `explanation` columns directly
- The `questions_for_students` view was created to hide these fields, but the direct table is still accessible
- Any student can open browser console and run: `supabase.from('questions').select('correct_answer')` and get all answers
- **Fix**: DROP the `Authenticated read questions` RLS policy from `questions` table. Keep only `Admins manage questions`. Students will use `questions_for_students` view instead (which already omits those columns)
- Also update `src/pages/QuizAttempt.tsx` to query `questions_for_students` view instead of `questions` table

**CRITICAL 2: Chatbot System Prompt Exposed**
- `chatbot_settings` has policy: `Authenticated users can read chatbot settings` → any student can read the full `system_prompt`, `model`, `provider`, `temperature` fields
- This enables prompt injection attacks — a student reads the system prompt, crafts adversarial inputs to make the bot ignore its restrictions
- **Fix**: Remove the `Authenticated users can read chatbot settings` policy. Create a minimal view `chatbot_settings_public` that exposes ONLY `enable_mock_help` (boolean). The chatbot Edge Function uses service role anyway so it doesn't need frontend access to the full settings

---

### HIGH ISSUES (Fix Before Release)

**HIGH 3: Notices Readable by Unauthenticated Users**
- The `notices` SELECT policy: `(target_role IS NULL) OR (target_role = get_user_role(auth.uid())) OR has_role(auth.uid(), 'admin')` — when `auth.uid()` is NULL (unauthenticated), `target_role IS NULL` is TRUE for public notices
- This means anyone without an account can query all notices including PDF attachments
- **Fix**: Add `AND auth.uid() IS NOT NULL` to the SELECT expression

**HIGH 4: Enrollment Progress Cannot Be Updated by Students (Client-Side)**
- `enrollments` table has no UPDATE policy for students — so `progress_percentage` and `last_watched_lesson_id` can't be updated by students
- Currently the code tries to update these fields; they silently fail
- **Fix**: Add a restrictive UPDATE policy for students:  `USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)` — but restrict updateable columns to `progress_percentage` and `last_watched_lesson_id` only (not `status`, `course_id`, `purchased_at`)

**HIGH 5: `profiles_public` Table Has No RLS Policies**
- The scanner found this table has no RLS policies at all. If RLS is enabled but no permissive policy exists → nobody can read it. If RLS is disabled → fully public
- **Fix**: Add `SELECT` policy: `USING (true)` (public read, since this is the stripped-down public view with no PII beyond name/avatar) or `USING (auth.uid() IS NOT NULL)` for authenticated-only

---

### MEDIUM ISSUES

**MEDIUM 6: Leaked Password Protection Disabled**
- Supabase leaked password protection checks passwords against breach databases (HaveIBeenPwned)
- **Fix**: This is a Supabase Auth config change. Enable it via SQL migration: `ALTER TABLE auth.users ...` — actually this is enabled via the Supabase dashboard under Auth → Security. We add a note to the audit report, but cannot change this via code. We will document it.

**MEDIUM 7: Attendance Table — RESTRICTIVE Policy Blocks All Access**
- The attendance table has only one policy typed as `RESTRICTIVE ALL` for admins/teachers — but RESTRICTIVE policies work as AND conditions, not OR. Since there is no PERMISSIVE policy, nobody can see any records
- **Fix**: Change the policy from RESTRICTIVE to PERMISSIVE, or add an explicit PERMISSIVE SELECT policy alongside it

**MEDIUM 8: RLS Policy Always True Warning**
- Some INSERT/UPDATE policies use `WITH CHECK (true)` without row-ownership binding — this is a Supabase linter warning but in context the affected tables (like `leads`) are intentionally public-insert. We will review and annotate appropriately.

---

## Files & Migrations to Change

### Migration 1: Fix Critical Quiz Answers Exposure
```sql
-- Remove the permissive policy that allows students to read correct_answer
DROP POLICY IF EXISTS "Authenticated read questions" ON public.questions;

-- Add a policy that only allows reading via view (no direct table access for students)
-- Admins already have full access via "Admins manage questions"
```

### Migration 2: Fix Chatbot Settings Exposure
```sql
-- Remove policy that allows all authenticated users to read chatbot settings
DROP POLICY IF EXISTS "Authenticated users can read chatbot settings" ON public.chatbot_settings;

-- Only admins can read chatbot settings directly
-- The chatbot edge function uses service_role, so it never needs this policy
```

### Migration 3: Fix Notices Unauthenticated Access
```sql
DROP POLICY IF EXISTS "Everyone can view notices" ON public.notices;

CREATE POLICY "Authenticated users can view notices"
ON public.notices FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    (target_role IS NULL)
    OR (target_role = get_user_role(auth.uid()))
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);
```

### Migration 4: Fix Enrollment Update Policy
```sql
CREATE POLICY "Users can update own enrollment progress"
ON public.enrollments FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

### Migration 5: Fix Attendance RESTRICTIVE Policy
```sql
-- Drop the RESTRICTIVE policy
DROP POLICY IF EXISTS "Admins and teachers can manage attendance" ON public.attendance;

-- Re-create as PERMISSIVE (default)
CREATE POLICY "Admins and teachers can manage attendance"
ON public.attendance FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'teacher'::app_role)
);
```

### Migration 6: Fix profiles_public RLS
```sql
-- Ensure authenticated users can read public profiles (used by chat, comments)
CREATE POLICY "Authenticated users can read public profiles"
ON public.profiles_public FOR SELECT
USING (auth.uid() IS NOT NULL);
```

### Code Change: QuizAttempt.tsx
- Change `supabase.from('questions')` query to `supabase.from('questions_for_students')` so the frontend never even requests columns that don't exist there

### Document in memorywork.md
- Update with full audit report, issues found, fixes applied, status of each

---

## Summary of Changes

| # | Severity | Issue | Fix Type |
|---|----------|-------|----------|
| 1 | CRITICAL | Quiz answers readable | DROP policy on `questions` |
| 2 | CRITICAL | Chatbot prompt readable | DROP policy on `chatbot_settings` |
| 3 | HIGH | Notices public to all | UPDATE policy with auth.uid() IS NOT NULL |
| 4 | HIGH | Enrollment progress not updatable | ADD UPDATE policy |
| 5 | HIGH | profiles_public no RLS | ADD SELECT policy |
| 6 | MEDIUM | Attendance RESTRICTIVE blocks all | Re-create as PERMISSIVE |
| 7 | MEDIUM | Leaked password protection | Dashboard config (documented) |
| 8 | LOW | RLS always-true warnings | Review and annotate |

**Payment Layer is SECURE**: Razorpay HMAC-SHA256 signature verification runs server-side in Edge Function. Service role key never in frontend. Enrollment only created after verified signature. Duplicate enrollment prevented by upsert + unique constraint. ✅
