
## Complete Verification & Fix

### What I Found

**Critical Bug in `score-quiz` edge function:**
The function uses `userClient.auth.getClaims(token)` on line 36 — this method **does not exist** in `@supabase/supabase-js@2`. Every other edge function in this project correctly uses `auth.getUser()` or `auth.getUser(token)`. This means **every real quiz submission will return 401 Unauthorized** even for properly authenticated users.

**Database state:**
- 0 quizzes, 0 questions, 0 quiz_attempts in the database
- The quiz feature cannot be tested end-to-end until an admin creates a published quiz with questions

**`supabase.functions.invoke()` auth behavior:**
When called from the frontend, `supabase.functions.invoke()` automatically passes the user's auth token in the `Authorization` header. The edge function then tries `getClaims(token)` which fails/returns null → 401.

### The Fix

**File: `supabase/functions/score-quiz/index.ts`**

Replace the `getClaims` block (lines 29-43) with the correct `auth.getUser(token)` pattern used by all other edge functions in this project:

```
// REMOVE: getClaims approach (doesn't exist in supabase-js v2)
const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
if (claimsError || !claimsData?.claims) { ... }
const userId = claimsData.claims.sub as string;

// REPLACE WITH: getUser(token) — same pattern as create-zoom-meeting
const { data: { user }, error: authError } = await userClient.auth.getUser(token);
if (authError || !user) { return 401 }
const userId = user.id;
```

Then redeploy the function.

### What the Admin Must Do First (No Code Change)

Because the database has 0 quizzes and 0 questions, the end-to-end test requires:
1. Admin logs in → goes to `/admin/quiz`
2. Creates a quiz (e.g. "Test Quiz"), sets total_marks, pass_percentage, publishes it
3. Adds at least 3-4 MCQ questions with correct_answer set and marks/negative_marks
4. Publishes the quiz

Only then can a student navigate to the quiz and test the full submit → score flow.

### Files to Change

| File | Change |
|------|--------|
| `supabase/functions/score-quiz/index.ts` | Fix `getClaims` → `getUser(token)` on lines 29-43 |

One-line fix, then redeploy. The rest of the system (QuizAttempt.tsx, QuizResult.tsx, RLS policies) is all correct.
