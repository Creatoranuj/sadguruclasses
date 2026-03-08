
## Understanding the current state

**QuizResult.tsx currently has:**
- Simple score circle (% in a circle)
- 4 stat boxes: Correct, Wrong, Skipped, Time
- Reattempt + Back buttons
- Question-by-question answer review (expandable)

**QuizAttempt.tsx already:**
- Submits to `quiz_attempts` with: `score`, `percentage`, `passed`, `answers` (JSON), `time_taken_seconds`
- `answers` is `Record<string, string>` = `{ questionId: selectedOptionIndex }`
- Navigates to `/quiz/${quizId}/result/${finalAttemptId}`

**Questions table has:** `marks`, `negative_marks`, `correct_answer`, `options`, `question_type`, `order_index`
- NO `section` column → we'll use **quiz `type`** as the single section (e.g. "NEET DPP", "Physics Test") OR infer a "section" from question order groups. Since no section data exists, we'll make it smart: group questions into 3 equal sections labeled "Section A", "Section B", "Section C" (or by quiz type if total <= some threshold). This gives a realistic sectional breakdown from real data without needing a DB migration.

**Actually better approach:** Questions have `order_index`. We'll compute sections by dividing questions into groups (e.g., if 90 questions → 3 sections of 30 each, labeled Physics/Chemistry/Biology for NEET, or Section A/B/C for others). This requires NO DB change. The quiz `type` field (dpp/test) determines the section label strategy.

## What to build

The redesigned `QuizResult.tsx` (single file change, no DB migration needed):

### Layout (inspired by the screenshots' structure, not copied):

```
┌─────────────────────────────────────────┐
│ ← [Quiz Title]              Attempt Badge│
├─────────────────────────────────────────┤
│ 🔔 "Rank & Detailed Analysis            │
│    will be available after all          │
│    students attempt"                    │
├─────────────────────────────────────────┤
│         HERO SCORE CARD (purple/blue    │
│         gradient)                       │
│  Quiz Title · X Questions · Y Marks    │
│  ┌──────────┐  ┌──────────┐            │
│  │ Score    │  │ Percentile│           │
│  │ 72/180   │  │  --       │           │
│  └──────────┘  └──────────┘            │
│  Rank: Result Awaited                  │
│  [Reattempt] [View Solution ↓]         │
├─────────────────────────────────────────┤
│ [Result Summary] [Leaderboard]          │
│                                         │
│ Result Summary tab:                     │
│  ┌─────────────┬─────────────┐          │
│  │ ✓ 18 Correct│ Marks: +72  │          │
│  │ ████░░░░░░  │             │          │
│  ├─────────────┼─────────────┤          │
│  │ ✗ 12 Wrong  │ Lost: -24   │          │
│  │ ███░░░░░░░  │             │          │
│  ├─────────────┼─────────────┤          │
│  │ ○ 15 Skipped│ Skipped: 60 │          │
│  │ ███░░░░░░░  │             │          │
│  └─────────────┴─────────────┘          │
│                                         │
│  ⏱ Time: 42m 30s  📊 Accuracy: 60%     │
│                                         │
│  ── Sectional Performance ──            │
│  [Physics ▼]                            │
│   Score: 24/60 · Correct: 6 Wrong: 4   │
│   Accuracy: 60% · Time: ~14m           │
│  [Chemistry ▼]                          │
│  [Biology ▼]                            │
│                                         │
│  [↓ View Detailed Analysis]             │
│                                         │
│ Leaderboard tab:                        │
│  🏆 Results Awaited                     │
│     Leaderboard will be published       │
│     after analysis                      │
├─────────────────────────────────────────┤
│ id="answer-review"                      │
│ Answer Review (existing, kept as-is)    │
└─────────────────────────────────────────┘
```

### Key computed values (all from real data):
- `correctCount` = questions where `answers[q.id] === q.correct_answer`
- `incorrectCount` = answered but wrong
- `skippedCount` = unanswered
- `marksObtained` = sum of `q.marks` for correct
- `marksLost` = sum of `q.negative_marks` for incorrect
- `marksSkipped` = sum of `q.marks` for skipped questions
- `accuracy` = `correctCount / (correctCount + incorrectCount) * 100` (excludes skipped)
- **Sections**: Split questions into equal-sized groups. If quiz.type === 'dpp' or questions.length <= 20 → 1 section. If questions.length >= 45 → 3 sections (Physics / Chemistry / Biology for NEET-style, otherwise Section A/B/C). 21-44 questions → 2 sections. Time per section = proportional by question count.
- `attemptNumber` = count previous attempts by same user on same quiz + 1 (fetched alongside)

### Files to change:
1. **`src/pages/QuizResult.tsx`** — full redesign (one file, ~350 lines)
   - Add section breakdown logic (client-side, no DB)
   - Add tabs (Result Summary / Leaderboard)
   - Add progress bar rows for correct/incorrect/skipped
   - Add sectional performance accordion
   - Add "View Detailed Analysis" scroll button
   - Keep existing answer review section at bottom
   - Also fetch attempt count for "Attempt #N" badge

No DB migration needed. No new components needed (self-contained). No changes to QuizAttempt.tsx.
