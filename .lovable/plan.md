
## What to build

The screenshot shows the `LessonView.tsx` style lesson view. The user wants `MyCourseDetail.tsx`'s inline lesson section (STATE 3, lines 728–974) to match that format exactly:

1. **`LessonActionBar`** — Like + Doubts pill buttons + Class PDF button row below lesson meta
2. **`CourseContent` component** — Progress bar + lesson playlist at bottom of Overview tab
3. Fix the "You will learn" box — should show admin-entered overview, not hardcoded text (already fixed but box still renders unconditionally)

### What's missing in MyCourseDetail inline view vs screenshot

| Feature | Screenshot | MyCourseDetail now |
|---|---|---|
| Like + Doubts pill buttons | ✅ (LessonActionBar) | ❌ missing |
| Class PDF button row | ✅ | ❌ missing |
| Course Content playlist in Overview | ✅ (CourseContent component) | ❌ has "More in chapter" list but not the card with progress bar |
| "You will learn" box | ✅ with actual text | Shows "Content coming soon" fallback only |

### Changes to `MyCourseDetail.tsx`

**1. Add imports** (line 1–22):
- `useLessonLikes` from `@/hooks/useLessonLikes`
- `LessonActionBar` from `@/components/video/LessonActionBar`
- `CourseContent` from `@/components/lecture/CourseContent`
- `ThumbsUp, HelpCircle` not needed — LessonActionBar handles them
- `Download` icon

**2. Add `useLessonLikes` hook** inside component (alongside existing state), keyed to `selectedLesson?.id`:
```ts
const { likeCount, hasLiked, toggleLike, loading: likesLoading } = useLessonLikes(selectedLesson?.id);
```

**3. After the lesson meta block** (after line 754, before the Tabs), insert `LessonActionBar`:
```tsx
<LessonActionBar
  likeCount={likeCount}
  hasLiked={hasLiked}
  onLike={toggleLike}
  onDoubts={() => { /* click Discussion tab */ }}
  onDownloadPdf={selectedLesson.classPdfUrl ? () => window.open(selectedLesson.classPdfUrl!, '_blank') : undefined}
  hasPdf={!!selectedLesson.classPdfUrl}
  likesLoading={likesLoading}
  lessonTitle={selectedLesson.title}
/>
```

**4. In the Overview tab** (lines 766–841), replace the "More in this chapter" list section with `<CourseContent>`:
```tsx
{/* Course Content playlist */}
<CourseContent
  lessons={filteredLessons.filter(l => l.lectureType === "VIDEO").map(l => ({
    id: l.id,
    title: l.title,
    duration: l.duration ?? 0,
    isCompleted: completedLessonIds.has(l.id),
    isCurrent: l.id === selectedLesson.id,
  }))}
  completedCount={filteredLessons.filter(l => l.lectureType === "VIDEO" && completedLessonIds.has(l.id)).length}
  onLessonClick={(lessonId) => {
    const lesson = lessons.find(l => l.id === lessonId);
    if (lesson) { setSelectedLesson(lesson); setSearchParams({ lesson: lessonId }); }
  }}
/>
```

**5. Track `completedLessonIds` as state** (currently only tracked in `chapters` state for progress bars). Add a `Set<string>` state that mirrors DB completions:
```ts
const [completedLessonIds, setCompletedLessonIds] = useState<Set<string>>(new Set());
```
- Populate it from `progressData` during the `fetchData` useEffect (already fetched, just needs to be stored in a Set state)
- Update it in `handleVideoProgress` when lesson is marked complete

### File to change
- `src/pages/MyCourseDetail.tsx` — add imports, add hook call, add LessonActionBar, swap "More in chapter" list for CourseContent, add completedLessonIds state

### No other files need changes
`LessonActionBar`, `CourseContent`, `useLessonLikes` all already exist and are reusable.
