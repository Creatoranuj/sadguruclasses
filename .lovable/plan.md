
## Current State

`MyCourseDetail.tsx` (838 lines) has:
- A chapter sidebar (`<aside>` lines 638–686) that:
  - On mobile: slides in/out via `courseSidebarOpen` state ✅
  - On desktop: always visible (`md:translate-x-0`) — **no collapse toggle yet**
  - Shows chapter code badge + title + lesson count badge — **no progress bar**
  - **No search box**
- Lesson player (lines 348–599) — completely untouched

## 3 Changes to Make in `MyCourseDetail.tsx`

### 1. Desktop Sidebar Collapse Toggle

**Add state** (line 84, after `courseSidebarOpen`):
```tsx
const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
```

**Update `<aside>` classNames** (line 638–641) to also handle desktop collapse:
```tsx
<aside className={cn(
  "fixed md:sticky top-0 md:top-auto z-40 h-full flex-shrink-0 bg-card border-r flex flex-col transition-all duration-300",
  courseSidebarOpen ? "translate-x-0 w-64" : "-translate-x-full md:translate-x-0",
  sidebarCollapsed ? "md:w-0 md:overflow-hidden md:border-r-0" : "w-64 md:w-64"
)}>
```

**Add desktop toggle button** in the sticky header (line 704–710, after mobile toggle button):
```tsx
{/* Desktop sidebar toggle */}
<button
  onClick={() => setSidebarCollapsed(prev => !prev)}
  className="hidden md:flex p-2 rounded-lg border bg-card text-muted-foreground hover:bg-muted transition-colors"
  title={sidebarCollapsed ? "Show chapters" : "Hide chapters"}
>
  <PanelLeftOpen className={cn("h-4 w-4 transition-transform duration-300", !sidebarCollapsed && "rotate-180")} />
</button>
```

### 2. Progress Bar per Chapter in Sidebar

**Replace** each chapter button in the sidebar (lines 652–681) from a single-row `flex items-center` layout to a `flex-col items-start` layout that includes a mini progress bar below the title row:

```tsx
{chapters.map((chapter) => {
  const isActive = ...;
  const pct = chapter.lessonCount > 0
    ? Math.round((chapter.completedLessons / chapter.lessonCount) * 100)
    : 0;
  return (
    <button key={chapter.id} onClick={...}
      className={cn("w-full flex flex-col px-3 py-2 rounded-lg text-sm text-left transition-colors", ...)}
    >
      {/* Top row: badge + title + count */}
      <div className="flex items-center gap-2 w-full">
        <span className={cn("text-xs font-bold px-1.5 py-0.5 rounded shrink-0", ...)}>{chapter.code}</span>
        <span className="flex-1 truncate leading-snug">{chapter.title}</span>
        {chapter.lessonCount > 0 && <span className={cn(...)}>{chapter.lessonCount}</span>}
      </div>
      {/* Progress row */}
      {chapter.lessonCount > 0 && (
        <div className="mt-1.5 w-full space-y-0.5 pl-[calc(1.5rem+8px)]">
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all", pct === 100 ? "bg-green-500" : "bg-primary")}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground">{chapter.completedLessons}/{chapter.lessonCount} done</p>
        </div>
      )}
    </button>
  );
})}
```

### 3. Search Box Inside Sidebar

**Add state** (line 84):
```tsx
const [sidebarSearch, setSidebarSearch] = useState("");
```

**Add search input** inside the `<aside>`, below the header (after line 647, before `<ScrollArea>`):
```tsx
<div className="px-3 py-2 border-b shrink-0">
  <div className="relative">
    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
    <input
      type="text"
      placeholder="Search chapters..."
      value={sidebarSearch}
      onChange={(e) => setSidebarSearch(e.target.value)}
      className="w-full pl-8 pr-3 py-2 text-xs bg-muted rounded-md border-0 outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
    />
    {sidebarSearch && (
      <button onClick={() => setSidebarSearch("")} className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground">
        <X className="h-3.5 w-3.5" />
      </button>
    )}
  </div>
</div>
```

**Filter chapters** in the render (before the `chapters.map()` call):
```tsx
const filteredSidebarChapters = sidebarSearch.trim()
  ? chapters.filter(ch =>
      ch.title.toLowerCase().includes(sidebarSearch.toLowerCase()) ||
      ch.code.toLowerCase().includes(sidebarSearch.toLowerCase())
    )
  : chapters;
```

Then use `filteredSidebarChapters.map(...)` instead of `chapters.map(...)`.

Also add `Search` to the lucide-react imports (line 10–14).

## Files Changed
| File | Changes |
|------|---------|
| `src/pages/MyCourseDetail.tsx` | Add `sidebarCollapsed` + `sidebarSearch` states; update `<aside>` classes; add desktop toggle button; add search input in sidebar; enhance chapter buttons with progress bars; filter sidebar chapters by search |

**Lesson player (lines 348–599) is NOT touched.**
