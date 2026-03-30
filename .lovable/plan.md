## Plan: Performance Optimization, Dead Code Cleanup & Logical Breadcrumb Restructure

### Summary

Three work areas: (1) Remove dead/lazy code and optimize thumbnail/icon loading for faster performance, (2) Build a consistent, logical breadcrumb hierarchy across all student pages, (3) Align admin upload structure with the breadcrumb navigation path.

---

### 1. Performance: Fast Thumbnail & Icon Loading

**Problem**: Course thumbnails and Supabase-served images load slowly because there's no eager loading or image optimization strategy.

**Fixes**:

- **YouTube thumbnail preloading**: In `LectureGalleryCard.tsx` and `LectureCard.tsx`, add `loading="eager"` for above-the-fold thumbnails (first 4 items), keep `loading="lazy"` for the rest
- **Image placeholder with blur-up**: Add a tiny inline placeholder (CSS background gradient) while real thumbnails load, preventing layout shift
- **Prefetch course thumbnails**: In `Courses.tsx` and `MyCourses.tsx`, after fetching course data, inject `<link rel="preload">` for the first 6 course image URLs
- **Remove duplicate `formatDuration**`: `Courses.tsx` line 73 defines its own `formatDuration` AND imports one from `MahimaVideoPlayer` (line 12) — remove the local duplicate
- **Remove unused imports**: Clean `formatDuration` import from `MahimaVideoPlayer` in `Courses.tsx` since local one is used (or keep one, remove other)

### 2. Dead/Lazy Code Removal


| File                                            | Dead Code                                                                                                                                                  | Action                                        |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `Courses.tsx` line 12                           | `import { formatDuration } from "../components/video/MahimaVideoPlayer"` — unused, shadowed by local definition on line 73                                 | Remove import                                 |
| `LessonView.tsx` line 13                        | Same unused `formatDuration` import — never called in the file                                                                                             | Remove import                                 |
| `MyCourses.tsx` line 31                         | `import { Link } from "react-router-dom"` — never used in component                                                                                        | Remove import                                 |
| `AllClasses.tsx`                                | Uses `@radix-ui/react-slot` Breadcrumb components but inconsistently — mixes `Breadcrumb` UI primitives with custom `Breadcrumbs` component used elsewhere | Standardize to custom `Breadcrumbs` component |
| `src/components/course/Breadcrumbs.tsx` line 49 | `bg-primary/8` — invalid Tailwind opacity value (should be `bg-primary/[0.08]` or `bg-primary/10`)                                                         | Fix to `bg-primary/10`                        |


### 3. Logical Breadcrumb Structure

**Target hierarchy** (consistent across all pages):

```text
Dashboard → Courses → [Course Name] → [Chapter/Subject] → [Lecture Title]
Dashboard → My Courses → [Course Name] → [Chapter/Subject] → [Lecture Title]
```

**Current problems**:

- `Courses.tsx` shows: `Dashboard > Subjects > All Courses` — "Subjects" is wrong here; should just be "Courses"
- `AllClasses.tsx` uses the `@radix-ui` `Breadcrumb` component instead of the custom `Breadcrumbs` — inconsistent
- `MyCourseDetail.tsx` has no breadcrumbs at all
- `ChapterView.tsx` shows: `[root] > [Course]` — missing "Subjects" level
- `LessonView.tsx` breadcrumbs are correct but inconsistent with the rest
- `LectureListing.tsx` breadcrumbs are correct

**Fixes per page**:


| Page                 | Current Breadcrumb                  | New Breadcrumb                                                                                                                                                                                     |
| -------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Courses.tsx`        | Dashboard → Subjects → All Courses  | Dashboard → Courses                                                                                                                                                                                |
| `MyCourses.tsx`      | Dashboard → My Courses              | Dashboard → My Courses ✓ (already correct)                                                                                                                                                         |
| `MyCourseDetail.tsx` | (none)                              | Dashboard → My Courses → [Course Name]                                                                                                                                                             |
| `AllClasses.tsx`     | Uses different Breadcrumb component | Dashboard → All Classes (use custom `Breadcrumbs`)                                                                                                                                                 |
| `ChapterView.tsx`    | [root] → [Course]                   | [root] → [Course] → Subjects                                                                                                                                                                       |
| `LectureListing.tsx` | [root] → [Course] → [Chapter]       | ✓ Already correct&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;For example Subject → Physics →Motion in plan →All lecture (L1 , L2 etc) in card view then → click on that All, Lecture Pdf Notes etc. |
