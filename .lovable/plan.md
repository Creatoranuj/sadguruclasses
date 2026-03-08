
## Summary of All 4 Changes

### What the user wants (translated from Hinglish):
1. **Chat window larger** — The Sadguru Sarthi chat (screenshot 1 shows a table response) should use a wider window on desktop so tables/formatted content display properly instead of being cramped
2. **Breadcrumb logic in My Courses** — Apply the same sticky `Breadcrumbs` component (used in Courses page) to the My Courses detail page (`/my-courses/:id`), including inside the video player view (currently no breadcrumb there)
3. **Course Content reference links** — In the video player's "Course Content" list (the circled area in screenshot 2 showing "Audio", "Mrstar", "Hindi Paper Analysis"), show related resource links (PDF/DPP/Notes for that lesson's chapter) as small chips BELOW each lesson title
4. **Notes tab — no redirect, show PDF inline** — The Notes tab currently opens PDF in a new tab. Instead render `PdfViewer` component inline (full height, no redirect)

---

## File Changes

### 1. `src/components/chat/ChatWidget.tsx`
**Problem**: Chat panel is `md:w-[440px]` — too narrow for table responses  
**Fix**: Change to `md:w-[560px] lg:w-[640px]` so tables/structured AI responses render fully without horizontal clipping

```
// Line 356 — before:
"md:left-auto md:w-[440px] md:shadow-2xl md:border-l"

// After:
"md:left-auto md:w-[560px] lg:w-[640px] md:shadow-2xl md:border-l md:border md:rounded-l-2xl"
```

---

### 2. `src/pages/MyCourseDetail.tsx` — Breadcrumbs using shared component

**Problem**: The existing `renderBreadcrumbs()` is custom inline nav. The `Breadcrumbs` component in `src/components/course/Breadcrumbs.tsx` has sticky `bg-background/95 backdrop-blur border-b` — exactly like the Courses page uses.

**Fix**:
- Import `Breadcrumbs` from `@/components/course/Breadcrumbs`
- Replace `renderBreadcrumbs()` call with `<Breadcrumbs>` component using `href` links (for Dashboard, My Courses) and `onClick`-based navigation for course/chapter — using `Link` compatible `href` props
- Also add breadcrumbs to the **player view** (lines 400-412 header area) — currently has no breadcrumb, just a plain back button + title

Breadcrumb segments:
- Main page: `Dashboard (href=/dashboard) > My Courses (href=/my-courses) > [Course Title] > [Chapter Title if selected]`
- Player view: `My Courses (href=/my-courses) > [Course Title] (href=/my-courses/:id) > [Lesson Title]`

Since `Breadcrumbs` uses `href` with `<Link>`, but chapter navigation needs `setSelectedChapterId(null)`, we keep the hybrid approach:
- Dashboard + My Courses → `href` prop
- Course title (when inside chapter) → no href, but add `onClick` via a wrapper
- Chapter title → current (bold, no link)

Actually `Breadcrumbs` only supports `href` for links. We'll pass `href` for navigable segments and leave last segment without href. For "course title when chapter selected" we'll use `href=/my-courses/${courseId}` which will reload the page to course root — acceptable.

---

### 3. `src/pages/MyCourseDetail.tsx` — Reference links in Course Content list

**Problem**: In the player view (lines 484-508), the Course Content list shows VIDEO lessons only. The circled area shows lesson names like "Audio", "Mrstar", "Hindi Paper Analysis" but no related resources beneath them.

**Fix**: Below each lesson button in the content list, show related NOTES/PDF/DPP as small colored link chips. The logic:
- For each VIDEO lesson shown, find lessons in `lessons` array that are NOT VIDEO but share the same `chapterId`
- Show them as small pills: `📄 PDF`, `📝 Notes`, `📚 DPP` that call `handleContentClick(relatedLesson)` or open the PDF inline
- This groups "PDF Notes for this chapter" under the chapter's video lessons

Actually, looking more carefully at the screenshots — "Audio", "Mrstar", "Hindi Paper Analysis" ARE the lesson titles for the current course. The user wants reference links (PDF/Notes/DPP type lessons) to appear as sub-items beneath each lesson in the sidebar list. 

**Revised approach**: Show all lessons (VIDEO + PDF + NOTES + DPP) in the course content list, but group them: VIDEO lessons as primary items, and PDF/NOTES/DPP as indented chips below each video (matched by `chapterId`). If no matching chapter, show them as standalone items at bottom.

---

### 4. `src/pages/MyCourseDetail.tsx` — Notes tab renders PdfViewer inline

**Problem**: Lines 539-563 — Notes tab renders `<a>` links that open in `_blank`. User wants PDF rendered inline.

**Fix**: Replace the `<a>` anchor list with `PdfViewer` component for each note. If multiple notes exist, show tabs/list to pick which one to view, then render `PdfViewer` for the selected note.

```tsx
// Import PdfViewer
import PdfViewer from "@/components/video/PdfViewer";

// In Notes TabsContent:
const [selectedNoteUrl, setSelectedNoteUrl] = useState<{url: string, title: string} | null>(null);
const notes = lessons.filter(l => l.lectureType === "NOTES");

// If single note → render PdfViewer directly
// If multiple → show pill selector, render PdfViewer for selected
```

---

## All changes in one file + chat widget

**Files to change:**
1. `src/components/chat/ChatWidget.tsx` — widen panel from 440px → 560px/640px
2. `src/pages/MyCourseDetail.tsx` — 
   - Import `Breadcrumbs` + `PdfViewer`
   - Replace `renderBreadcrumbs()` with `<Breadcrumbs>` using shared component
   - Add breadcrumbs inside player view header
   - Enhance Course Content list to show PDF/Notes/DPP chips below VIDEO lessons
   - Notes tab: show `PdfViewer` inline instead of redirect links

No DB changes. No new files needed. No other pages affected.
