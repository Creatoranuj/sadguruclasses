
## Understanding the Request

The user says: **"course mein sidebar do"** — add a sidebar to the course view showing the course content structure (chapters → lessons), similar to how PhysicsWallah/Unacademy shows a collapsible lesson list on the side. "Do not change lesson view" = keep the lesson player screen untouched.

The main page this applies to is **`MyCourseDetail`** (`/my-courses/:courseId`) — this is the primary course content page students use. Currently it shows either a chapter folder grid OR a lesson grid. The user wants a **left sidebar** (on desktop) / **bottom drawer** (on mobile) showing all chapters and lessons for quick navigation.

---

## Scope

**Only change**: `src/pages/MyCourseDetail.tsx` — add a collapsible course content sidebar to the main course view (the grid/chapter view), NOT the lesson player (which is the `isPlayerOpen && selectedLesson` block — leave that untouched).

The sidebar will:
- List all chapters on the left (desktop: fixed sidebar, mobile: slide-in panel)
- Show lesson count per chapter
- Allow clicking a chapter to expand/collapse and see its lessons
- Highlight the currently selected chapter
- Have a toggle button to open/close on mobile

---

## Layout Change

```text
BEFORE (MyCourseDetail main view):
┌─────────────────────────────┐
│ Header                       │
│ Breadcrumbs                  │
│ Back + Course Title          │
│ ─────────────────────────── │
│ Chapter grid / Lesson grid   │
└─────────────────────────────┘

AFTER (MyCourseDetail main view):
┌─────────────────────────────────────┐
│ Header                               │
│ Breadcrumbs                          │
│ Back + Course Title                  │
│ ───────────────────────────────────  │
│ [Sidebar]  │  [Main Content]         │
│  Chapter 1 │  Tab filters            │
│  Chapter 2 │  Lesson grid            │
│  Chapter 3 │                         │
└─────────────────────────────────────┘
```

**Desktop**: `flex` layout — left sidebar (w-64) + right main content (flex-1)
**Mobile**: Sidebar hidden by default, toggle button in header → slides in as overlay

---

## Implementation Plan

### What to add to `MyCourseDetail.tsx`:

1. **State**: `sidebarCollapsed` (boolean, default `false` on desktop, hidden on mobile)

2. **Sidebar component** (inline JSX, no new file needed):
   - Shows all chapters as a list
   - Each chapter is clickable → sets `selectedChapterId`
   - Active chapter gets highlighted (bg-primary/10, left border accent)
   - Chapter item shows: folder icon, chapter title, lesson count badge
   - A "All Content" entry at the top (sets selectedChapterId to null)
   - On mobile: absolute overlay with backdrop + X close button

3. **Sidebar toggle button**: 
   - Added to the Back button row (top of main area)
   - Shows `PanelLeftOpen`/`PanelLeftClose` icon (Lucide)
   - Only visible on mobile (hidden md:hidden), sidebar always visible on `md:flex`

4. **Layout wrapper**: Change the main content `<div>` to a `flex` layout:
   ```tsx
   <div className="flex-1 flex overflow-hidden">
     {/* Sidebar */}
     <aside className="hidden md:flex w-64 ...">...</aside>
     {/* Main content - unchanged */}
     <main className="flex-1 ...">...</main>
   </div>
   ```

### Files to change:
| File | Change |
|------|--------|
| `src/pages/MyCourseDetail.tsx` | Add sidebar state, sidebar JSX, wrap layout in flex |

### Lines to touch in MyCourseDetail.tsx:
- Line 80–81: Add `sidebarOpen` state for mobile toggle
- Line 650–750 (return JSX, main layout): Wrap in flex, add sidebar aside
- The `isPlayerOpen` block (lines 379–648) — **NOT touched**

### Sidebar content:
```tsx
// "All Content" item
<button onClick={() => setSelectedChapterId(null)} className={...active styles...}>
  <Grid3X3 /> All Content
  <span>{lessons.length}</span>
</button>

// Chapter items
{chapters.map(ch => (
  <button key={ch.id} onClick={() => setSelectedChapterId(ch.id)} className={...}>
    <FolderOpen /> {ch.title}
    <span>{chapterLessonCounts[ch.id]}</span>
  </button>
))}
```

The lesson view (player) is completely untouched — it renders at lines 379–648 as a `fixed inset-0` overlay before the main return, so it's entirely separate.
