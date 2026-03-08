

## What we're building

Taking the existing platform from "functional" to "world-class" through focused, high-impact improvements. Based on my audit of the codebase, the foundation is already solid — lazy loading, ThemeProvider, Supabase with RLS, dark mode CSS variables. The gaps are in UI polish, one known feature gap (quiz buttons in gallery/table view), and documentation.

## What's already done (so we don't redo it)

- Lazy loading + React.lazy + Suspense: already in App.tsx
- Dark mode: ThemeContext + CSS variables fully working
- Theme toggle in Settings.tsx: already wired
- Progress tracking (X/Y chapters): ChapterCard.tsx fully correct
- Quiz engine end-to-end: all verified in prior sessions
- Reports page with Recharts: live data, working
- Bottom mobile nav (5-tab): Dashboard.tsx lines 328-364
- QueryClient with staleTime/gcTime: App.tsx lines 57-67

## Actual gaps found in code audit

1. **"Attempt DPP" button missing from gallery and table views** (`LectureListing.tsx` lines 389-413) — confirmed real gap
2. **LectureTableView doesn't accept `lessonQuizMap` prop** — confirmed, prop is never passed
3. **LectureGalleryCard doesn't show quiz button** — confirmed, no quiz support
4. **Multiple Google Font @imports in index.css** — 5 separate font imports (lines 2-6), one font duplicated (JetBrains Mono), body uses `Inter` but theme uses `Poppins`
5. **Bottom nav only renders on `/dashboard`** — the 5-tab nav is inside `Dashboard.tsx` itself; other pages (courses, profile, notices) have no bottom nav, causing jarring inconsistency
6. **`IMPLEMENTATION_STATUS.md`** needs creation as a true comparison table

## Plan

### 1. Fix the "Attempt DPP" button in all 3 view modes
- Pass `lessonQuizMap` from `LectureListing.tsx` into `LectureTableView` and show a quiz button column when a DPP/TEST row has a linked quiz
- Update `LectureGalleryCard` to accept optional `quizId` prop and render a small "Attempt DPP" badge at card bottom
- Update the gallery loop in `LectureListing.tsx` to pass `quizId` to `LectureGalleryCard`

### 2. Create a reusable BottomNav component
- Extract the 5-tab nav from `Dashboard.tsx` into `src/components/Layout/BottomNav.tsx`
- Add it to the main student pages: `Dashboard`, `Courses`, `MyCourses`, `Messages`, `Profile`
- Active state detection using `useLocation()`
- Only visible on mobile (`md:hidden`), not for admin/teacher role

### 3. Fix CSS font imports (minor but impactful)
- Deduplicate JetBrains Mono import (currently appears twice, lines 3 and 6)
- Align `body` font-family to use `Poppins` (the CSS variable `--font-sans` already sets Poppins, but `body` overrides to Inter on line 144)

### 4. Update IMPLEMENTATION_STATUS.md
- Write the comprehensive comparison table with all 25+ features, status, files, and notes including the gallery/table view gap as now "Fixed"

### 5. Update memorywork.md
- Append Session 6 summary

## Files to change

| File | Change |
|------|--------|
| `src/components/course/LectureGalleryCard.tsx` | Add optional `quizId` prop + quiz button overlay |
| `src/components/course/LectureTableView.tsx` | Add `lessonQuizMap` prop + quiz button in rows |
| `src/pages/LectureListing.tsx` | Pass `lessonQuizMap` and `quizId` to gallery + table views |
| `src/components/Layout/BottomNav.tsx` | **New file** — reusable bottom nav |
| `src/pages/Dashboard.tsx` | Replace inline bottom nav with `<BottomNav />` |
| `src/pages/Courses.tsx` | Add `<BottomNav />` |
| `src/pages/MyCourses.tsx` | Add `<BottomNav />` |
| `src/pages/Messages.tsx` | Add `<BottomNav />` |
| `src/pages/Profile.tsx` | Add `<BottomNav />` |
| `src/index.css` | Remove duplicate JetBrains Mono import; fix body font |
| `IMPLEMENTATION_STATUS.md` | Full comparison table (create/overwrite) |
| `memorywork.md` | Append Session 6 audit |

## Technical approach for gallery quiz button

```
LectureGalleryCard receives:
  quizId?: string  (optional)
  lectureType: "VIDEO" | "PDF" | "DPP" | "NOTES" | "TEST"

Inside card, below content div:
  {(lectureType === "DPP" || lectureType === "TEST") && quizId && (
    <button
      onClick={(e) => { e.stopPropagation(); navigate(`/quiz/${quizId}`); }}
      className="w-full text-center text-xs py-2 bg-blue-600 text-white font-semibold"
    >
      {lectureType === "TEST" ? "Take Test" : "Attempt DPP"}
    </button>
  )}
```

## Technical approach for table view

```
LectureTableView receives new prop:
  lessonQuizMap: Record<string, string>

In each row, after ChevronRight:
  {isDppOrTest && lessonQuizMap[lesson.id] && (
    <button onClick={(e) => { e.stopPropagation(); navigate(`/quiz/${lessonQuizMap[lesson.id]}`); }}>
      Attempt
    </button>
  )}
```

## BottomNav component structure

```
src/components/Layout/BottomNav.tsx

const tabs = [
  { icon: homeIcon, label: "Home", path: "/dashboard" },
  { icon: scienceIcon, label: "Courses", path: "/courses" },
  { icon: studentIcon, label: "My Courses", path: "/my-courses" },
  { icon: MessageCircle, label: "Messages", path: "/messages" },
  { icon: User, label: "Profile", path: "/profile" },
];

Props: none — reads location and navigation internally
Hidden for admin/teacher role (useAuth)
```

This is focused on real gaps: the gallery/table quiz button is the one confirmed missing feature, the BottomNav inconsistency is the biggest UX gap, and the font/CSS cleanup is a quick quality win.

