
## Current State Analysis

The sidebar (lines 638–686) has:
- Mobile: slide-in overlay controlled by `courseSidebarOpen` state ✅
- Desktop: always visible (`md:translate-x-0`) — **no collapse toggle**
- Each chapter item shows a lesson count badge (number only) — **no progress bar or "X/Y done" text**

## Plan

### 1. Add desktop collapse state
Add a new state `sidebarCollapsed` (default: `false`) — persisted only in memory (no localStorage needed).

### 2. Sidebar toggle button on desktop header
Add a `PanelLeftClose`/`PanelLeftOpen` toggle button in the **main content sticky header** (line 692–712), visible on desktop (`hidden md:flex`), that toggles `sidebarCollapsed`.

### 3. Sidebar collapse behavior on desktop
Change the `<aside>` className:
- When `sidebarCollapsed === true` on desktop: `md:w-0 md:overflow-hidden md:border-0` (fully hidden, no space taken)
- When `sidebarCollapsed === false`: `md:w-64` (normal)
- Smooth transition with `transition-all duration-300`

### 4. Progress indicator per chapter in sidebar
Replace the current lesson count badge with a richer indicator:

```
[CH01] Physics Basics          [✓]
       ████████░░  3/10 done
```

Each chapter item in the sidebar will show:
- Chapter code badge + title (existing)
- Below the title: a mini `"X/Y done"` text + a thin progress bar (the data is already available in `chapter.completedLessons` and `chapter.lessonCount`)

The `__all__` chapter shows total progress.

### Layout change (sidebar)

```text
BEFORE each chapter item:
[CH01] Chapter Title    [5]

AFTER each chapter item:
[CH01] Chapter Title
       ▓▓▓▓▓░░░░░  3/10 done
```

### Files to change

| File | Change |
|------|--------|
| `src/pages/MyCourseDetail.tsx` | 1. Add `sidebarCollapsed` state (line ~83). 2. Update `<aside>` className to include md collapse classes (line 638–641). 3. Add desktop toggle button in sticky header (line 704–710). 4. Enhance each chapter button in sidebar to show progress bar + "X/Y done" text (lines 650–684). |

### Exact changes

**Line 83** — add state after `courseSidebarOpen`:
```tsx
const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
```

**Line 638–641** — `<aside>` className update:
```tsx
<aside className={cn(
  "fixed md:sticky top-0 md:top-auto z-40 h-full md:h-auto flex-shrink-0 bg-card border-r flex flex-col transition-all duration-300",
  courseSidebarOpen ? "translate-x-0 w-64" : "-translate-x-full md:translate-x-0",
  sidebarCollapsed ? "md:w-0 md:overflow-hidden md:border-0" : "w-64 md:w-64"
)}>
```

**Line 12–13** — add `PanelLeftClose` to imports (it's in lucide-react).

**Lines 704–710** — Add desktop toggle in sticky header:
```tsx
{/* Desktop sidebar toggle */}
<button
  onClick={() => setSidebarCollapsed(prev => !prev)}
  className="hidden md:flex p-2 rounded-lg border bg-card text-muted-foreground hover:bg-muted transition-colors"
  title={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
>
  <PanelLeftOpen className={cn("h-4 w-4 transition-transform", !sidebarCollapsed && "rotate-180")} />
</button>
```

**Lines 650–684** — Enhance chapter buttons with progress bar:
```tsx
{chapters.map((chapter) => {
  const isActive = ...;
  const pct = chapter.lessonCount > 0 
    ? Math.round((chapter.completedLessons / chapter.lessonCount) * 100) 
    : 0;
  return (
    <button key={chapter.id} onClick={...} className={cn(...)}>
      <div className="flex items-center gap-2 w-full">
        <span className={cn("text-xs font-bold px-1.5 py-0.5 rounded shrink-0", ...)}>
          {chapter.code}
        </span>
        <span className="flex-1 truncate leading-snug text-xs">{chapter.title}</span>
      </div>
      {/* Progress row */}
      {chapter.lessonCount > 0 && (
        <div className="mt-1.5 space-y-1">
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div 
              className={cn("h-full rounded-full transition-all", pct === 100 ? "bg-green-500" : "bg-primary")}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground">
            {chapter.completedLessons}/{chapter.lessonCount} done
          </p>
        </div>
      )}
    </button>
  );
})}
```

The button needs `flex-col items-start` layout instead of the current `flex items-center` row layout to accommodate the progress bar below the title row.

This is a clean, self-contained change to `MyCourseDetail.tsx` only — no new files, no DB changes needed (progress data already fetched from `user_progress` at line 193–211).
