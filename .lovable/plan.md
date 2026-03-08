
## Analysis

### Part 1: Duplicate "Knowledge Hub" Card

Looking at the screenshot: the user sees "Knowledge Hub (Class All)" in the **BatchSelector dropdown** at the top, AND below it a "Knowledge Hub" course card. These are NOT truly duplicate cards — the BatchSelector is showing the selected batch's name, and the filtered course list shows the one matching course.

The visual confusion: when `selectedBatch` is set, `AllClasses.tsx` line 73-75 filters courses to `c.id === selectedBatch.id`. This correctly shows only ONE card. But the BatchSelector header ALSO shows "Knowledge Hub" with its thumbnail — making it look like two identical cards. Plus the batch selector is visually very similar to the course card.

**Root cause**: The `BatchSelector` component (a Select trigger) shows the selected batch name with an icon that looks identical to a course card. When a batch is selected, users see: 1) the batch selector showing "Knowledge Hub" and 2) the course card for "Knowledge Hub" — appearing as a duplicate.

**Fix**: When a batch is already selected on the AllClasses page, hide the BatchSelector OR replace it with a lighter "currently viewing" indicator that doesn't look like a card. A pill/badge showing "Batch: Knowledge Hub" with an X to clear it would be cleaner.

Alternatively: simply don't show the BatchSelector on the AllClasses subjects tab since the page header already says which class you're in. Instead, show a small badge under the header.

**Simplest fix**: Remove the `<BatchSelector />` from `AllClasses.tsx` entirely (lines 209-211) — the batch filtering already happens automatically. Instead, show a simple dismissible badge when a batch is active.

### Part 2: Quiz Engine

This is a major feature. Based on the user's schema + the existing app patterns:

**Database**: 3 new tables — `quizzes`, `questions`, `quiz_attempts`
- `course_id` references `courses.id` which is `bigint`, not `uuid` — need to adjust schema
- `lesson_id` references `lessons.id` which is `uuid` ✓
- `chapter_id` references `chapters.id` which is `uuid` ✓

**New pages/routes needed**:
- `/quiz/:quizId` — student attempt page (full-screen)
- `/quiz/:quizId/result/:attemptId` — result page
- `/admin/quiz` — admin quiz manager

**New components needed**:
- `QuizAttempt.tsx` — full-screen quiz interface with timer, nav palette
- `QuizResult.tsx` — results with score, review, explanations
- `AdminQuizManager.tsx` — create/edit quizzes and questions

**Integration points**:
- `LectureListing.tsx`: show "Take Quiz" button for lessons with `lecture_type === "DPP"` or `"TEST"` that have an attached quiz
- `AdminUpload.tsx`: add quiz attachment field
- `App.tsx`: add new routes

## Plan

### Files to Create
1. New page: `src/pages/QuizAttempt.tsx` — full quiz taking interface
2. New page: `src/pages/QuizResult.tsx` — results view
3. New page: `src/pages/AdminQuizManager.tsx` — admin quiz CRUD
4. New component: `src/components/quiz/QuizTimer.tsx` — countdown timer
5. New component: `src/components/quiz/QuestionPalette.tsx` — nav grid

### Files to Modify
1. `src/pages/AllClasses.tsx` — remove duplicate BatchSelector, show clean batch indicator
2. `src/App.tsx` — add new quiz routes
3. `src/pages/LectureListing.tsx` — add "Take Quiz" button for DPP/TEST lessons
4. `src/pages/AdminUpload.tsx` — integrate quiz creation in lesson upload form

### Database Migration

```sql
-- 1. Quizzes table
CREATE TABLE public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  type TEXT CHECK (type IN ('dpp', 'test')),
  course_id BIGINT REFERENCES public.courses(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES public.chapters(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
  duration_minutes INTEGER DEFAULT 0,
  total_marks INTEGER DEFAULT 0,
  pass_percentage INTEGER DEFAULT 40,
  is_published BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Questions table
CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
  question_text TEXT NOT NULL,
  question_type TEXT DEFAULT 'mcq' CHECK (question_type IN ('mcq', 'true_false', 'numerical')),
  options JSONB,
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  marks INTEGER DEFAULT 4,
  negative_marks INTEGER DEFAULT 0,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Quiz attempts table
CREATE TABLE public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  score INTEGER,
  percentage DECIMAL(5,2),
  passed BOOLEAN,
  answers JSONB DEFAULT '{}'::jsonb,
  time_taken_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

-- Quizzes: admin full access, students read published only
CREATE POLICY "Admins manage quizzes" ON public.quizzes FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Students view published quizzes" ON public.quizzes FOR SELECT USING (is_published = true AND auth.role() = 'authenticated');

-- Questions: admin full access, authenticated users can read
CREATE POLICY "Admins manage questions" ON public.questions FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated read questions" ON public.questions FOR SELECT USING (auth.role() = 'authenticated');

-- Attempts: users manage own, admins see all
CREATE POLICY "Admins view all attempts" ON public.quiz_attempts FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users insert own attempts" ON public.quiz_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users view own attempts" ON public.quiz_attempts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own attempts" ON public.quiz_attempts FOR UPDATE USING (auth.uid() = user_id);
```

### QuizAttempt page logic
```
- Fetch quiz + questions on mount
- State: { answers: Record<questionId, string>, flagged: Set<string>, currentIndex: number, timeLeft: number }
- Timer: useEffect countdown, auto-submit when timeLeft = 0
- Question palette: grid of numbered buttons, colored by: answered (green), flagged (yellow), unanswered (grey), current (blue)
- Submit: calculate score server-side (insert quiz_attempt with answers JSONB), navigate to result page
- Auto-save to localStorage every answer change
```

### QuizResult page logic
```
- Fetch attempt + quiz + questions
- Show: score card (X/Y marks, Z%), pass/fail badge
- Question review: for each question show user's answer vs correct answer, explanation
- "Retake" button
```

### Fix AllClasses duplicate visual

Remove `<BatchSelector />` from `AllClasses.tsx`. Replace with a simple inline badge when filtered:
```tsx
{selectedBatch && (
  <div className="flex items-center justify-between px-5 mb-2">
    <span className="text-sm text-muted-foreground">
      Showing: <strong>{selectedBatch.title}</strong>
    </span>
    <button onClick={() => setSelectedBatch(null)} className="text-xs text-primary">
      Show All
    </button>
  </div>
)}
```
This eliminates the visual where BatchSelector looks like a duplicate card.

### Admin Quiz Manager features
- List all quizzes with edit/delete/publish toggle
- Create quiz form: title, type, duration, marks, link to course/chapter/lesson
- Add questions dynamically: question text, 4 options (A/B/C/D), correct answer select, explanation, marks/negative marks
- Save/reorder questions
- Preview button

### Integration in LectureListing
For lessons with `lecture_type === "DPP"` or `"TEST"`, show a "Take Quiz" button that checks if a quiz is linked to this lesson, and navigates to `/quiz/:quizId` if found.

## File Summary

| File | Action | Change |
|------|--------|--------|
| DB migration | Create | 3 new tables with RLS |
| `AllClasses.tsx` | Edit | Remove BatchSelector, add simple filter badge |
| `App.tsx` | Edit | Add `/quiz/:quizId`, `/quiz/:quizId/result/:attemptId`, `/admin/quiz` routes |
| `src/pages/QuizAttempt.tsx` | Create | Full-screen quiz with timer, palette, auto-submit |
| `src/pages/QuizResult.tsx` | Create | Score display, answer review, explanations |
| `src/pages/AdminQuizManager.tsx` | Create | CRUD for quizzes and questions |
| `src/components/quiz/QuizTimer.tsx` | Create | Countdown display component |
| `src/components/quiz/QuestionPalette.tsx` | Create | Navigation grid |
| `LectureListing.tsx` | Edit | DPP/TEST lesson cards show "Take Quiz" link |
| `AdminUpload.tsx` | Edit | Add quiz_id field to link quiz to lesson |
