
## Reading Summary

**QuizAttempt.tsx current state (lines 122-156):**
- `handleSubmit()` hardcodes `score = 0`, `percentage = 0`, `passed = false`
- Directly inserts into `quiz_attempts` with these wrong values
- There's a TODO comment acknowledging the score-quiz edge function is pending
- Questions are fetched correctly from `questions_for_students` (no correct_answer)

**QuizResult.tsx current state:**
- Correctly fetches from `questions` table (full, with correct_answer) after submission ✅
- Calculates `marksObtained`, `correctCount`, `incorrectCount` all client-side using `attempt.answers` vs `q.correct_answer` ✅
- BUT since the stored `score` and `passed` fields are always 0/false, the hero score card shows wrong values

**The fix needed:**
1. Create `supabase/functions/score-quiz/index.ts` — receives `{ quiz_id, answers, time_taken_seconds }`, uses service role to fetch full `questions` with `correct_answer`, calculates score + negative marking server-side, inserts `quiz_attempts` row, returns `{ attempt_id, score, percentage, passed }`
2. Update `QuizAttempt.tsx` `handleSubmit()` — call `supabase.functions.invoke('score-quiz', ...)` instead of direct insert
3. Add `score-quiz` entry to `supabase/config.toml` with `verify_jwt = false`

**Score calculation logic (same as QuizResult.tsx):**
- For each question: if `user_answer === correct_answer` → add `marks`; elif answered and wrong → subtract `negative_marks`; else skipped → 0
- `percentage = (score / total_marks) * 100`
- `passed = percentage >= pass_percentage`

**Auth pattern** (matching get-lesson-url pattern):
- Accept `Authorization` header
- Create user client + service client
- `supabase.auth.getUser()` to validate JWT
- Use service client to fetch questions with correct_answer

**`config.toml`** — currently only has `project_id = "wegamscqtvqhxowlskfm"`, needs function config section added.

---

## Plan

### File 1: `supabase/config.toml`
Add the function section:
```toml
[functions.score-quiz]
verify_jwt = false
```

### File 2: `supabase/functions/score-quiz/index.ts` (NEW)
```
POST body: { quiz_id: string, answers: Record<string, string>, time_taken_seconds: number }
Auth: Bearer token in Authorization header

1. Validate Authorization header → 401 if missing
2. Create user client (anon key + auth header) + service client (service role key)
3. getUser() → 401 if invalid
4. Fetch quiz from quizzes table via service client (for total_marks, pass_percentage)
5. Fetch full questions (id, correct_answer, marks, negative_marks) from questions table via service client where quiz_id = $quiz_id
6. Calculate score:
   - For each question: if answers[q.id] === q.correct_answer → score += q.marks; else if answers[q.id] exists → score -= q.negative_marks
7. total_marks = quiz.total_marks || sum of question marks
8. percentage = (score / total_marks) * 100, clamped to 0 minimum
9. passed = percentage >= quiz.pass_percentage
10. INSERT into quiz_attempts via service client (with user_id = user.id)
11. Return { attempt_id, score, percentage, passed }
```

### File 3: `src/pages/QuizAttempt.tsx`
Replace `handleSubmit()` (lines 124-156):
- Remove the direct supabase insert
- Call `supabase.functions.invoke('score-quiz', { body: { quiz_id: quizId, answers, time_taken_seconds: timeTaken } })`
- Get `attempt_id` from response data
- Navigate to result page
- Show proper error if edge function fails

**No changes to QuizResult.tsx** — it correctly recalculates everything from `attempt.answers` vs `questions.correct_answer` after submission.

---

## Summary Table

| File | Action |
|------|--------|
| `supabase/config.toml` | Add `[functions.score-quiz]` with `verify_jwt = false` |
| `supabase/functions/score-quiz/index.ts` | NEW — server-side scoring edge function |
| `src/pages/QuizAttempt.tsx` | Replace hardcoded `score=0` submit with edge function call |

Zero UI changes. Quiz display, timer, navigation all stay identical. Only the submit action changes to call the edge function.
