
## Root Cause Analysis

### Issue 1: Duplicate courses in My Courses
**Three sources of duplicate enrollments exist:**

1. **`BuyCourse.tsx` line 65-68** — `handleFreeEnrollmentEarly()` uses plain `.insert()` NOT `.upsert()`. If a free course user visits the buy page multiple times, they get multiple rows.

2. **`Admin.tsx` line 411-418** — `handleApprovePayment()` uses `.maybeSingle()` to check then `.insert()`. BUT the check uses `select('*')` with NO `.eq('status', 'active')` filter — meaning if a student somehow has a cancelled enrollment, the check PASSES (finds the row), so it doesn't re-enroll. However the REAL problem is: `.maybeSingle()` returns only ONE row, but if multiple rows existed already, it won't insert again. **ACTUALLY** the real problem here is the UNIQUE constraint migration we added — it may not have run yet in the DB, OR the admin panel has no guard for re-approving the same payment multiple times.

3. **`verify-razorpay-payment` edge function line 116-125** — Uses `.insert()` directly (though it does check first). The service role bypasses RLS but the UNIQUE constraint should stop it.

**The core DB-level fix** — The migration `20260308103228_f2ca5586...` added `UNIQUE(user_id, course_id)` constraint. But the `BuyCourse.tsx` free enrollment path still uses raw `.insert()` which will **FAIL with an error** when constraint exists, but it's a silent error path — also, the constraint may not exist yet for older data.

### Issue 2: Dashboard dropdown showing 3 scattered course icons (same course 3x)
**`BatchContext.tsx` deduplication IS already in place** (lines 49-63 with `seen` Set). But the dropdown is showing 3 entries, meaning deduplication is NOT working. The reason: The select query fetches `enrollments` joining `courses`, and when there are 3 enrollment rows for the same course, the `courses` object returned for each row has the same `id`. The `seen.has(c.id)` should catch this — BUT **the `image_url` in the dropdown is rendering 3 small icons because the `SelectItem` has 3 entries + `selectedBatch?.image_url` shows INSIDE the trigger**. Looking at the screenshot more carefully: the dropdown trigger shows 3 small course images next to each other — this is because when `batches` has duplicates (dedup may have a race), or the dropdown SelectTrigger renders ALL `batches` images somehow.

Actually re-reading the screenshot: the dashboard header shows 3 course thumbnail images scattered in the batch selector dropdown area — this is the `SelectContent` list showing the same course 3 times. This means the BatchContext deduplication is NOT preventing duplicates because **the existing enrollments in the DB have 3 rows for the same course, and the current deployed code (before our fix) doesn't deduplicate**.

Wait — the BatchContext code DOES deduplicate currently (it was fixed). So the dropdown showing 3 means the component isn't picking up the deduplicated state. Let me re-check — actually in `BatchSelector`, `batches.map(...)` will render each item. If `batches` has only 1 item (after dedup), only 1 shows. The screenshot must mean the dedup isn't working perfectly, OR the existing DB already has 3 rows and the migration cleaning them up hasn't applied.

### The REAL root cause of all problems:

**The `UNIQUE` constraint migration exists in code but may NOT have been applied to the DB yet** (it's in a migration file), and even if it was, the `admin.approve` path at line 402-408 queries WITHOUT `.eq('status', 'active')` — but that's fine for preventing new duplicates.

**The `BuyCourse.tsx` free enrollment still uses `.insert()`** — this is the PRIMARY source of new duplicates. Every time a user visits a free course buy page, a new enrollment row is inserted.

Additionally, **the lesson `is_locked` toggle in admin** doesn't create enrollments — the user's confusion about "unlock karne per" likely refers to admin approving payment (toggling a lesson's lock status has nothing to do with enrollment). The enrollment duplicate happens during payment approval.

## What to fix

### Fix 1: `BuyCourse.tsx` — Change `.insert()` to `.upsert()` for free enrollment
Line 65-68: Change `supabase.from("enrollments").insert(...)` to `.upsert(..., { onConflict: 'user_id,course_id', ignoreDuplicates: true })`

### Fix 2: `Admin.tsx` payment approval — Use upsert instead of conditional insert
Lines 411-418: Replace the `if (!existingEnroll)` insert block with a single `.upsert()` with `ignoreDuplicates: true`. Also fix the check to include `.eq('status', 'active')`.

### Fix 3: `verify-razorpay-payment` edge function — Use upsert  
Lines 116-125: Change `.insert()` to `.upsert(..., { onConflict: 'user_id,course_id', ignoreDuplicates: true })` using service role.

### Fix 4: BatchContext — Ensure deduplication works even if DB returns duplicates
Already has dedup logic, but add a stronger guard using `.distinct` on the DB query by selecting with DISTINCT course_id grouping.

### Fix 5: Database — Clean up existing duplicate enrollments + ensure unique constraint exists
Run a migration to:
1. Delete duplicates keeping the earliest row per (user_id, course_id)  
2. Add UNIQUE constraint IF NOT EXISTS (idempotent)

The previous migration may have failed if duplicates existed and the constraint couldn't be added. We need to ensure the DELETE happens BEFORE the ADD CONSTRAINT.

## Files to change
1. `src/pages/BuyCourse.tsx` — free enrollment: `.insert()` → `.upsert(ignoreDuplicates: true)`
2. `src/pages/Admin.tsx` — payment approval: conditional insert → upsert
3. `supabase/functions/verify-razorpay-payment/index.ts` — insert → upsert
4. New migration `supabase/migrations/...cleanup_and_constrain_enrollments.sql` — cleanup + idempotent unique constraint
5. `src/contexts/BatchContext.tsx` — add `.order('course_id')` + keep dedup (already working, minor improvement)

No UI changes needed. All fixes are logic/data layer.
